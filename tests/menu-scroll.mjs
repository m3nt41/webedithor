// Prueba: abrir/cerrar el menú hamburguesa NO debe mover la posición de scroll. Firefox real.
//  Mide scrollY (export en iframe de 390px y Vista previa) y el scrollTop del panel del preview (editor móvil)
//  antes y después de 5 ciclos abrir/cerrar, con navbar sticky solo móvil, sticky en ambos, sin sticky y estilo "Con botón".
// Ejecutar: npm run build && node tests/menu-scroll.mjs   (MEDIR=1 imprime todas las lecturas)
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { exportHTML } from '../src/export/exporter.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ver = (ok, msg, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'OK   ' : 'FALLA'} ${msg}${extra ? '  → ' + extra : ''}`); };
mkdirSync('tests/out', { recursive: true });

const pag = (...hijos) => { const p = n('page', { name: 'Página' }); p.children.push(...hijos); return p; };
// varias secciones altas: hay recorrido de scroll de sobra
const altas = () => [createBlock('hero'), createBlock('services'), createBlock('pricing'), createBlock('contact'), createBlock('services', 'tarjetas'), createBlock('footer')]
  .filter(Boolean);
const casos = {
  'sticky solo móvil': (nav) => Object.assign(nav.styles.mobile, { position: 'sticky', top: '0', zIndex: '50' }),
  'sticky en ambos': (nav) => Object.assign(nav.styles.base, { position: 'sticky', top: '0', zIndex: '50' }),
  'sin sticky': () => {},
};
const variantes = [['oscuro', 'oscuro'], ['boton', 'Con botón']];
const armar = (variante, caso) => { const nav = createBlock('navbar', variante); casos[caso](nav); return pag(nav, ...altas()); };

writeFileSync('tests/out/scroll-host.html', `<!doctype html><body style="margin:0"><iframe id="f" style="border:0;display:block" width="390" height="700"></iframe>
<script>document.getElementById('f').src=new URLSearchParams(location.search).get('src')</script></body>`);

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
const fu = (nombre) => pathToFileURL(resolve(`tests/out/${nombre}.html`)).href;
const js = (s, ...a) => d.executeScript(s, ...a);
// sin sticky la barra solo es alcanzable cerca de arriba (a mitad de página no se ve ni se puede pulsar); con sticky, a mitad
const posDe = (caso, tope) => (caso === 'sin sticky' ? 25 : Math.round(tope / 2));
const MEDIR = !!process.env.MEDIR;

// Clic REAL de puntero (Actions): .click() de Selenium hace scrollIntoView y taparía justo lo que se mide.
const clic = async (sel) => d.actions().move({ origin: await d.findElement(By.css(sel)) }).click().perform();
// ciclos de abrir/cerrar con el botón; devuelve las lecturas de scroll tras cada ciclo
async function ciclos(btnSel, leer, ciclosN = 5) {
  const lect = [];
  for (let i = 0; i < ciclosN; i++) {
    await clic(btnSel); await esperar(350);
    await clic(btnSel); await esperar(350);
    lect.push(await leer());
  }
  return lect;
}
const sinDeriva = (y0, lect) => lect.every((y) => Math.abs(y - y0) <= 1);

try {
  // ===== A. EXPORT (iframe 390) y C. VISTA PREVIA se miden con el mismo HTML =====
  for (const [vari, etiqueta] of variantes) {
    for (const caso of Object.keys(casos)) {
      const nombre = `scroll-${vari}-${caso.replace(/\s|ó/g, '_')}`;
      writeFileSync(`tests/out/${nombre}.html`, exportHTML(armar(vari, caso)));
      await d.manage().window().setRect({ width: 900, height: 900 });
      await d.get(`${fu('scroll-host')}?src=${encodeURIComponent(nombre + '.html')}`); await esperar(500);
      await d.switchTo().frame(await d.findElement(By.css('#f')));
      const tope = await js(`return document.documentElement.scrollHeight - innerHeight`);
      await js(`scrollTo(0, ${posDe(caso, tope)})`); await esperar(250);
      const y0 = await js(`return scrollY`);
      const lect = await ciclos('.mm-btn', () => js(`return scrollY`));
      if (MEDIR) console.log(`  [export ${etiqueta} / ${caso}] y0=${y0} ciclos=${lect.join(',')} (recorrido ${tope})`);
      ver(y0 > 20 && sinDeriva(y0, lect), `A. export (${etiqueta}, ${caso}): scrollY idéntico tras 5 ciclos`, `${y0} → ${lect.join(',')}`);
      await d.switchTo().defaultContent();
    }
  }

  // ===== B/C. EDITOR: vista móvil y Vista previa =====
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  const urlEd = pathToFileURL(resolve('dist/editor.html')).href;
  const LS = 'editor-landings:pagina';
  const cargar = async (p) => { await d.get(urlEd); await js(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(p)); await d.get(urlEd); await esperar(800); };
  const guardada = async () => JSON.parse(await js(`return localStorage.getItem('${LS}')`));
  for (const [vari, etiqueta] of variantes) {
    for (const caso of Object.keys(casos)) {
      const p = armar(vari, caso);
      await cargar(p);
      await d.findElement(By.css('#vista-mobile')).click(); await esperar(400);
      // el contenedor con scroll del preview: el ancestro desplazable de .stage
      const SC = `const st=document.querySelector('#preview .stage'); let e=st; while(e && !(e.scrollHeight>e.clientHeight+5 && /auto|scroll/.test(getComputedStyle(e).overflowY))) e=e.parentElement;`;
      const tope = await js(`${SC} return e? e.scrollHeight-e.clientHeight : 0`);
      await js(`${SC} e.scrollTop=${posDe(caso, tope)}`); await esperar(250);
      const y0 = await js(`${SC} return e.scrollTop`);
      const leer = () => js(`${SC} return e.scrollTop`);
      const lect = await ciclos('#preview .mm-btn', leer);
      if (MEDIR) console.log(`  [editor hamburguesa ${etiqueta} / ${caso}] y0=${y0} ciclos=${lect.join(',')} (recorrido ${tope})`);
      ver(y0 > 20 && sinDeriva(y0, lect), `B. editor móvil, hamburguesa (${etiqueta}, ${caso}): scrollTop idéntico tras 5 ciclos`, `${y0} → ${lect.join(',')}`);

      // seleccionar un hijo del panel desde Capas (abre) y volver a seleccionar el hero (cierra)
      const g = await guardada();
      const nav = g.children[0];
      const idEnlace = nav.children[1].children[1].id;
      const idHero = g.children[1].id;
      const lectC = [];
      for (let i = 0; i < 5; i++) {
        await js(`document.querySelector('#arbol li[data-id="${idEnlace}"]').click()`); await esperar(300);
        await js(`document.querySelector('#arbol li[data-id="${idHero}"]').click()`); await esperar(300);
        lectC.push(await leer());
      }
      if (MEDIR) console.log(`  [editor capas ${etiqueta} / ${caso}] y0=${y0} ciclos=${lectC.join(',')}`);
      // Capas puede mover el scroll legítimamente una vez (si el elemento queda fuera de vista); se exige que NO derive entre ciclos
      ver(lectC.every((y) => Math.abs(y - lectC[0]) <= 1), `B. editor móvil, Capas (${etiqueta}, ${caso}): sin deriva entre ciclos`, lectC.join(','));

      // Vista previa (iframe)
      await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(700);
      await d.findElement(By.css('#vp-mobile')).click(); await esperar(400);
      await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
      const tv = await js(`return document.documentElement.scrollHeight - innerHeight`);
      await js(`scrollTo(0, ${posDe(caso, tv)})`); await esperar(250);
      const v0 = await js(`return scrollY`);
      const lv = await ciclos('.mm-btn', () => js(`return scrollY`));
      if (MEDIR) console.log(`  [vista previa ${etiqueta} / ${caso}] y0=${v0} ciclos=${lv.join(',')}`);
      ver(v0 > 20 && sinDeriva(v0, lv), `C. Vista previa móvil (${etiqueta}, ${caso}): scrollY idéntico tras 5 ciclos`, `${v0} → ${lv.join(',')}`);
      await d.switchTo().defaultContent();
      await d.findElement(By.css('#vp-ojo')).click(); await esperar(300);
    }
  }
} finally {
  await d.quit();
}
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo en verde');
process.exit(fallas ? 1 : 0);

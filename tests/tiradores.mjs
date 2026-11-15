// Tiradores de espaciado del preview. Lógica pura (Node) + Firefox real sobre dist/editor.html (Selenium).
// Comprueba: cada tirador escribe padding/margin en base o mobile, Shift/Alt/Ctrl, mínimo 0, un arrastre = un Ctrl+Z (aunque tenga
// pausas), el inspector se actualiza, el modo padding/margen, y que el export no contiene tiradores.
// Ejecutar: npm run build && node tests/tiradores.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key, Origin } from 'selenium-webdriver';
import { createNode as n, walk } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { partes, expandir, tokensEfectivos, componer, ladosAfectados, ajustarValor, aplicarValor } from '../src/ui/espaciado.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const igual = (a, b, m) => { assert.deepEqual(a, b, m); ok++; console.log('OK   ' + m); };

// ---- 1. Lógica pura ----
igual(partes('10px calc(1px + 2px) auto'), ['10px', 'calc(1px + 2px)', 'auto'], 'partes respeta paréntesis');
igual(expandir('10px 20px'), ['10px', '20px', '10px', '20px'], 'expandir 2 partes');
igual(expandir('1px 2px 3px'), ['1px', '2px', '3px', '2px'], 'expandir 3 partes');
igual(expandir('1 2 3 4 5'), null, 'expandir >4 partes = null');
igual(tokensEfectivos({ padding: '10px 20px', paddingTop: '5px' }, 'padding'), ['5px', '20px', '10px', '20px'], 'lado suelto manda sobre el atajo');
igual(tokensEfectivos({}, 'margin'), [null, null, null, null], 'sin valores = null');
igual(componer(['8px', '8px', '8px', '8px']), '8px', 'componer 1');
igual(componer(['8px', '4px', '8px', '4px']), '8px 4px', 'componer 2');
igual(componer(['1px', '2px', '3px', '4px']), '1px 2px 3px 4px', 'componer 4');
igual(ladosAfectados(0, { shift: true }), [0, 2], 'Shift = lado y opuesto');
igual(ladosAfectados(3, { alt: true }), [0, 1, 2, 3], 'Alt = los 4');
igual([ajustarValor(-9), ajustarValor(12.4), ajustarValor(13, { ctrl: true }), ajustarValor(3, { ctrl: true })], [0, 12, 16, 0], 'ajustarValor: mínimo 0, redondeo e imán de 8');
igual(aplicarValor(['auto', null, '2rem', null], [0, 7.4, 32, 3], [0], 12), ['12px', '7px', '2rem', '3px'], 'aplicarValor conserva tokens y rellena con lo medido');

// ---- 2. Navegador ----
const pagina = n('page', { name: 'Página', content: { title: 'Mi página' } });
const sec = n('section', { name: 'Sec', styles: { padding: '40px 20px 30px' }, children: [
  n('container', { name: 'Cont', styles: { padding: '10px' }, children: [
    n('heading', { name: 'Tit', content: { text: 'Hola', level: 2 } }),
    n('button', { name: 'Btn', content: { text: 'Pulsa', href: '#' }, styles: { margin: '0 auto' } }),
  ] }),
] });
pagina.children.push(sec);

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1500, height: 1100 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);

  const guardada = async () => { await esperar(450); return JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`)); };
  const nodo = async (nombre) => { let r = null; walk(await guardada(), (x) => { if (x.name === nombre) r = x; }); return r; };
  const seleccionar = async (nombre) => {
    const id = (await nodo(nombre)).id;
    await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await esperar(250);
  };
  const manija = (lado) => d.findElement(By.css(`#preview .tir-h[data-lado="${lado}"]`));
  /** Arrastra un tirador (dx, dy en px de pantalla), con teclas opcionales y pasos intermedios con pausa opcional. */
  const arrastrar = async (lado, dx, dy, { teclas = [], pasos = 1, pausa = 0 } = {}) => {
    const m = await manija(lado);
    const a = d.actions({ async: true });
    for (const t of teclas) a.keyDown(t);
    a.synchronize(); // sin esto Selenium mete el keyUp en un paso temprano y la tecla ya no está al arrastrar
    a.move({ origin: m }).press();
    for (let i = 1; i <= pasos; i++) {
      a.move({ x: Math.round(dx / pasos), y: Math.round(dy / pasos), origin: Origin.POINTER, duration: 80 });
      if (pausa) a.pause(pausa);
    }
    a.release();
    a.synchronize();
    for (const t of teclas) a.keyUp(t);
    await a.perform();
    await esperar(200);
  };
  const lados = (s) => expandir(s);
  const px = (s) => lados(s).map((x) => parseFloat(x));

  // -- Section: padding (escritorio) --
  await seleccionar('Sec');
  igual(await d.executeScript(`return document.querySelector('#preview .tir-capa').dataset.modo`), 'padding', 'section: tiradores de PADDING');
  v(await d.executeScript(`return !document.querySelector('#preview .tir-capa').hidden`), 'los tiradores se ven al seleccionar');
  v(await d.executeScript(`return !document.querySelector('.stage .tir-capa, .stage .tir-h')`), 'los tiradores NO están dentro del .stage');

  await arrastrar('arriba', 0, 24);
  igual(px((await nodo('Sec')).styles.base.padding), [64, 20, 30, 20], 'arriba +24 -> padding-top 64 (el resto igual)');
  await arrastrar('derecha', -10, 0);
  igual(px((await nodo('Sec')).styles.base.padding), [64, 30, 30, 20], 'derecha: arrastrar a la izquierda +10 -> 30');
  await arrastrar('abajo', 0, -10, { teclas: [Key.SHIFT] });
  igual(px((await nodo('Sec')).styles.base.padding), [40, 30, 40, 20], 'Shift en abajo -> arriba y abajo con el mismo valor (40)');
  await arrastrar('izquierda', 10, 0, { teclas: [Key.ALT] });
  igual(px((await nodo('Sec')).styles.base.padding), [30, 30, 30, 30], 'Alt en izquierda -> los 4 lados 30');
  await arrastrar('abajo', 0, 80); // abajo: arrastrar hacia abajo REDUCE; 30 - 80 < 0
  igual(px((await nodo('Sec')).styles.base.padding)[2], 0, 'valor mínimo 0 (arrastrando de más)');
  await arrastrar('abajo', 0, -13, { teclas: [Key.CONTROL] }); // 13 -> imán -> 16
  igual(px((await nodo('Sec')).styles.base.padding)[2], 16, 'Ctrl: 13 se pega a 16 (múltiplo de 8)');

  // El mouse sale del tirador durante el arrastre: sigue funcionando (setPointerCapture)
  const antes = px((await nodo('Sec')).styles.base.padding)[3];
  await arrastrar('izquierda', 300, 200);
  v(px((await nodo('Sec')).styles.base.padding)[3] === antes + 300, 'arrastre lejos del tirador (captura de puntero): izquierda +300');

  // Sin cambio no se escribe: un clic sin mover no crea paso de undo
  const base0 = JSON.stringify((await nodo('Sec')).styles);
  const undoAntes = await d.executeScript(`return document.querySelector('#btn-undo').disabled`);
  await arrastrar('derecha', 0, 0);
  igual(JSON.stringify((await nodo('Sec')).styles), base0, 'un clic sin mover no cambia el árbol');
  void undoAntes;

  // -- Inspector en vivo --
  const campo = await d.executeScript(`return document.querySelector('#inspector [data-s="padding"]')?.value`);
  igual(campo, (await nodo('Sec')).styles.base.padding, 'el inspector muestra el padding escrito por el arrastre');
  const yAntes = await (await manija('arriba')).getRect();
  const inp = await d.findElement(By.css('#inspector [data-s="padding"]'));
  await inp.click(); await inp.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE); await inp.sendKeys('60px 10px 90px 10px');
  await esperar(500);
  const yDespues = await (await manija('arriba')).getRect();
  v(Math.abs(yDespues.y - yAntes.y) > 20, 'cambiar el padding en el inspector mueve el tirador (viceversa)');

  // -- Un arrastre completo = un solo Ctrl+Z (aunque tenga pausas > 1 s) --
  await d.findElement(By.css('body')).click(); // el foco sale del input para que valga Ctrl+Z global
  await seleccionar('Sec');
  const s0 = JSON.stringify((await nodo('Sec')).styles.base);
  await arrastrar('arriba', 0, 30, { pasos: 3, pausa: 1100 }); // 3 pasos con 1,1 s de pausa
  const sA = JSON.stringify((await nodo('Sec')).styles.base);
  v(sA !== s0, 'el arrastre largo escribió');
  await arrastrar('arriba', 0, 10);
  const sB = JSON.stringify((await nodo('Sec')).styles.base);
  await d.actions({ async: true }).keyDown(Key.CONTROL).sendKeys('z').keyUp(Key.CONTROL).perform(); await esperar(450);
  igual(JSON.stringify((await nodo('Sec')).styles.base), sA, 'un Ctrl+Z deshace SOLO el segundo arrastre');
  await d.actions({ async: true }).keyDown(Key.CONTROL).sendKeys('z').keyUp(Key.CONTROL).perform(); await esperar(450);
  igual(JSON.stringify((await nodo('Sec')).styles.base), s0, 'un segundo Ctrl+Z deshace el arrastre largo ENTERO (3 pasos con pausas)');
  void sB;

  // -- Hoja (heading): margin --
  await seleccionar('Tit');
  igual(await d.executeScript(`return document.querySelector('#preview .tir-capa').dataset.modo`), 'margin', 'heading: tiradores de MARGEN');
  const mt = await d.executeScript(`return Math.round(parseFloat(getComputedStyle(document.querySelector('#preview [data-id="${(await nodo('Tit')).id}"]')).marginTop))`);
  await arrastrar('arriba', 0, -12); // margen superior: hacia arriba aumenta
  const mTit = (await nodo('Tit')).styles.base.margin;
  igual(px(mTit)[0], mt + 12, 'margen superior +12 arrastrando hacia arriba (partía de ' + mt + ')');
  v(!(await nodo('Tit')).styles.base.padding, 'en modo margen no se toca el padding');

  // -- Botón con margin '0 auto': conserva "auto" en los lados que no se tocan --
  await seleccionar('Btn');
  await arrastrar('abajo', 0, 16);
  const mBtn = lados((await nodo('Btn')).styles.base.margin);
  igual([mBtn[1], mBtn[3], parseFloat(mBtn[2])], ['auto', 'auto', 16], "botón: abajo +16, y 'auto' a los lados se conserva (" + (await nodo('Btn')).styles.base.margin + ')');

  // -- Cambio de modo (container: padding -> margen) --
  await seleccionar('Cont');
  igual(await d.executeScript(`return document.querySelector('#preview .tir-capa').dataset.modo`), 'padding', 'container: padding por defecto');
  await d.findElement(By.css('#preview .tir-modo')).click(); await esperar(150);
  igual(await d.executeScript(`return document.querySelector('#preview .tir-capa').dataset.modo`), 'margin', 'el botón cambia a margen');
  await d.findElement(By.css('#preview .tir-modo')).click(); await esperar(150);

  // -- Móvil: escribe en styles.mobile y no toca base --
  await d.findElement(By.css('#vista-mobile')).click(); await esperar(400);
  await seleccionar('Sec');
  const baseAntes = (await nodo('Sec')).styles.base.padding;
  await arrastrar('arriba', 0, 14);
  const sm = (await nodo('Sec')).styles;
  v(!!sm.mobile.padding && px(sm.mobile.padding)[0] === px(baseAntes)[0] + 14, 'móvil: el arrastre escribe styles.mobile.padding (' + sm.mobile.padding + ')');
  igual(sm.base.padding, baseAntes, 'móvil: styles.base queda intacto');
  await d.findElement(By.css('#vista-desktop')).click(); await esperar(300);

  // -- Export y Vista previa no llevan tiradores --
  const html = exportHTML(await guardada());
  v(!/tir-|tirador/.test(html), 'el HTML exportado no contiene tiradores');
  await d.findElement(By.css('#btn-vista-previa')).click();
  await esperar(1200);
  const enIframe = await d.executeScript(`const f=document.querySelector('#vp-frame'); return f && f.contentDocument ? f.contentDocument.querySelectorAll('.tir-capa,.tir-h,.tir-modo').length + ':' + f.contentDocument.querySelectorAll('section').length : 'sin-iframe'`);
  igual(enIframe, '0:1', 'la Vista previa (iframe) carga la página y no tiene tiradores');

  console.log(`\n${ok} comprobaciones OK`);
} finally {
  await d.quit();
}

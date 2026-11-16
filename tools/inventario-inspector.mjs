// INVENTARIO de los campos del inspector, por tipo de nodo (y por estado: flex/grid/sticky/marquesina/escena…).
// Sirve para comprobar que una reorganización del panel no pierde ni duplica ningún control.
//   - crearPaginaInventario(): página de prueba con un nodo de cada tipo y variantes que activan los campos condicionales.
//   - inventariar(d, url): abre el editor (Firefox/Selenium), selecciona cada caso y devuelve { caso: { idControl: cuántos } }.
//     idControl = atributo data-* que identifica al control (+ su valor); las etiquetas NO cuentan (se pueden renombrar).
//   - contenedoresDe(d): para un caso, en qué acordeón vive cada control (informativo).
// CLI:  node tools/inventario-inspector.mjs [salida.json]   (necesita dist/editor.html: npm run build)
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { GRUPOS_ANIM } from '../src/animations/index.js';
import { opcionesFirefox } from './lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
export const LS = 'editor-landings:pagina';
const LSN = 'editor-landings:niveles';

/** Animación "todo encendido" para un tipo: cada grupo con su valor principal = la primera opción real (y un estado). */
function animacionCompleta(tipo, padreEsEscena) {
  const a = {};
  for (const g of GRUPOS_ANIM) {
    if (!g.tipos.includes(tipo)) continue;
    if (g.soloEnEscena && !padreEsEscena) continue;
    if (g.propio) { a[g.id] = [{ id: 'e1', name: 'Estado 1', trigger: 'hover', props: { color: '#ff0000' } }]; continue; }
    const f = g.campos.find((c) => c.key === g.principal);
    const op = (f?.options ?? []).find(([v]) => v !== '');
    a[g.id] = { ...g.defaults, [g.principal]: op ? op[0] : g.defaults[g.principal] };
  }
  return a;
}

/** Página con un nodo de cada tipo; los "Casos" de [nombre, nodo] se seleccionan uno a uno. */
export function crearPaginaInventario() {
  const casos = [];
  const pagina = n('page', { name: 'Pagina', content: { title: 'Mi página' } });
  casos.push(['page', pagina]);
  const mk = (caso, tipo, props, { anim = false, padreEscena = false } = {}) => {
    const nodo = n(tipo, { ...props });
    if (anim) nodo.animation = animacionCompleta(tipo, padreEscena);
    casos.push([caso, nodo]);
    return nodo;
  };
  const hijosBasicos = (anim) => [
    mk('heading' + anim, 'heading', { name: 'Tit' + anim, content: { text: 'Hola', level: 2 } }, { anim: !!anim }),
    mk('text' + anim, 'text', { name: 'Txt' + anim, content: { text: 'Texto' } }, { anim: !!anim }),
    mk('button' + anim, 'button', { name: 'Btn' + anim, content: { text: 'Pulsa', href: '#' } }, { anim: !!anim }),
    mk('image' + anim, 'image', { name: 'Img' + anim, content: { src: 'https://x/y.png', alt: 'a' } }, { anim: !!anim }),
    mk('icon' + anim, 'icon', { name: 'Ico' + anim, content: { name: 'star' } }, { anim: !!anim }),
  ];
  // sección normal (sin display), con y sin animaciones
  const secPlana = mk('section', 'section', { name: 'SecPlana' });
  const secPlanaA = mk('section+anim', 'section', { name: 'SecPlanaA' }, { anim: true });
  // navbar: sección con "nav" en el nombre, flex + sticky + recorte + imagen de fondo
  const nav = mk('section-nav-flex', 'section', { name: 'Navegacion', styles: { display: 'flex', position: 'sticky', top: '0', zIndex: '50', overflow: 'hidden', fondoImagen: 'https://x/f.png' } });
  // contenedores: flex, grid con imagen de fondo, marquesina
  const contFlex = mk('container-flex', 'container', { name: 'ContFlex', styles: { display: 'flex' } });
  const contGrid = mk('container-grid+anim', 'container', { name: 'ContGrid', styles: { display: 'grid', fondoImagen: 'https://x/f.png', overflow: 'hidden' } }, { anim: true });
  const contMarq = mk('container-marquesina', 'container', { name: 'ContMarq', content: { marquesina: { mov: true, vel: 20, dir: 'izq', pausa: true, gap: 24, copias: 3 } } });
  // escena por scroll con un hijo (su "Paso de escena")
  const escena = mk('section-escena', 'section', { name: 'Escena' }, { anim: false });
  escena.animation = { scene: { steps: '3', length: 4, transition: 40 } };
  const paso = mk('container-paso-escena', 'container', { name: 'PasoEsc' }, { anim: true, padreEscena: true });
  escena.children.push(paso);
  // un nodo de cada tipo suelto, sin y con animaciones
  const contBase = n('container', { name: 'ContBase', children: [...hijosBasicos(''), ...hijosBasicos('+anim')] });
  // los contenedores no cuelgan de la página: van dentro de una sección
  const envoltorio = n('section', { name: 'Envoltorio', children: [contBase, contFlex, contGrid, contMarq] });
  pagina.children.push(secPlana, secPlanaA, nav, escena, envoltorio);
  return { pagina, casos };
}

/** Atributos data-* que identifican un control del panel. */
const ATRIBUTOS = ['data-s', 'data-c', 'data-a', 'data-pick', 'data-anchor', 'data-name', 'data-ctl', 'data-ctl-otro', 'data-ctl-min', 'data-est', 'data-tam',
  'data-mq', 'data-mq-num', 'data-icono', 'data-isz', 'data-isz-num', 'data-isz-otro', 'data-fondo-url', 'data-fondo-file', 'data-capa', 'data-file',
  'data-efectos', 'data-ia', 'data-act', 'data-vact', 'data-v', 'data-vp', 'data-vpick'];

/** En el navegador: { idControl: cuántos elementos } del panel actual (cabecera incluida; el JSON del nodo no cuenta). */
const SCRIPT_LEER = `
  const attrs = arguments[0], salida = {};
  const raiz = document.querySelector('#inspector');
  for (const el of raiz.querySelectorAll('*')) {
    if (el.closest('details.json')) continue;
    for (const a of attrs) {
      if (!el.hasAttribute(a)) continue;
      let id = a + '=' + el.getAttribute(a);
      if (a === 'data-ctl' || a === 'data-mq' || a === 'data-vact') id += '|' + (el.getAttribute('data-val') ?? '');
      if (a === 'data-est' || a === 'data-tam' || a === 'data-isz') id += '';
      salida[id] = (salida[id] || 0) + 1;
    }
  }
  return salida;`;

export const leerPanel = (d) => d.executeScript(SCRIPT_LEER, ATRIBUTOS);

/** En qué acordeón (data-nivel) vive cada control del panel actual ('plano'/'cabecera' si no está en uno). */
export const contenedoresDe = (d) => d.executeScript(`
  const attrs = arguments[0], salida = {};
  for (const el of document.querySelectorAll('#inspector *')) {
    if (el.closest('details.json')) continue;
    for (const a of attrs) if (el.hasAttribute(a)) {
      const det = el.closest('details.nivel');
      salida[a + '=' + el.getAttribute(a)] = det ? det.dataset.nivel : el.closest('.nivel-plano') ? 'plano' : el.closest('.insp-cab') ? 'cabecera' : 'fuera';
    }
  }
  return salida;`, ATRIBUTOS);

export async function abrirEditor(d, pagina, url = pathToFileURL(resolve('dist/editor.html')).href) {
  await d.manage().window().setRect({ width: 1400, height: 1100 });
  await d.get(url);
  await d.executeScript(`localStorage.removeItem('${LSN}'); localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(900);
}

export async function seleccionarNodo(d, pagina, nodo) {
  if (nodo.id === pagina.id) await d.findElement(By.css('#btn-pagina')).click();
  else await d.executeScript(`const e=document.querySelector('#preview [data-id="'+arguments[0]+'"]'); if(!e) throw new Error('nodo no está en el preview: '+arguments[0]+' '+arguments[1]); e.dispatchEvent(new MouseEvent('click',{bubbles:true}))`, nodo.id, nodo.name);
  await esperar(180);
}

/** Inventario completo: { caso: { idControl: cuántos } } */
export async function inventariar(d, { pagina, casos }) {
  const out = {};
  for (const [caso, nodo] of casos) {
    await seleccionarNodo(d, pagina, nodo);
    out[caso] = await leerPanel(d);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const salida = process.argv[2] || 'tmp-logs/inventario-inspector.json';
  const fx = crearPaginaInventario();
  const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
  try {
    await abrirEditor(d, fx.pagina);
    const inv = await inventariar(d, fx);
    writeFileSync(salida, JSON.stringify(inv, null, 1));
    const total = Object.values(inv).reduce((s, c) => s + Object.keys(c).length, 0);
    console.log(`inventario: ${Object.keys(inv).length} casos, ${total} controles (únicos por caso) → ${salida}`);
    for (const [c, v] of Object.entries(inv)) console.log(' ', c.padEnd(24), Object.keys(v).length);
  } finally { await d.quit(); }
}

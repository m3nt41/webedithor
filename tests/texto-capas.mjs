// "Por letras" / "Por palabras" al aparecer, sin redibujado al terminar (punto A de la tarea del banco de comparación).
//  - Subir/Bajar (técnica V10): la subida la hace UN contenedor <span class="tw"> y cada pieza solo anima la opacidad en cascada.
//    Medido por píxeles en Firefox: el último milisegundo de la animación = el estado final (0 px distintos), en "Galería" y "Lo que hacemos",
//    a 1x y 1,25x, y el texto terminado es idéntico a un título normal.
//  - Efectos que mueven cada pieza con translate/scale/rotate/transform (técnica V11): `will-change` SOLO con las propiedades que se animan
//    (+ opacity); más de TOPE_CAPAS piezas -> fundido sin capas. Fade, blur y "por línea" quedan como estaban (sin .tw ni will-change).
//  - Export = Vista previa (mismo código) y el editor no cambia: el lienzo no parte el texto, la selección, la edición de texto y el undo siguen igual.
// Falla antes del cambio (551/1039 px distintos y sin .tw) y pasa después. Ejecutar: npm run build && node tests/texto-capas.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder, By, Key } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';
import { PAG, medir } from '../tools/medir-final-letras.mjs';
import * as TEXTO from '../src/animations/text.js';
const TOPE_CAPAS = TEXTO.TOPE_CAPAS ?? 200; // (sin el cambio no existe: el test falla por las comprobaciones, no por el import)

let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('tmp-logs', { recursive: true });

// ---------- 1) Estructura del export (sin navegador) ----------
const TD = { trigger: 'scroll', duration: 0.7, delay: 0.2, stagger: 0.06, ease: 'suave', distance: 30, angle: -90 };
const exporta = (mode, effect, texto = 'Lo que hacemos', extra = {}) => {
  const p = n('page', { name: 'P', content: { title: 'T' } }); const s = n('section', { name: 'S' });
  const h = n('heading', { name: 'h', content: { text: texto, level: 2, anchor: 'h' } });
  h.animation = { text: { ...TD, mode, effect, ...extra } }; s.children.push(h); p.children.push(s);
  return exportHTML(p);
};
const reglas = (html, sel) => (html.match(new RegExp(`\\.n\\d+ ${sel.replace('.', '\\.')}\\{[^}]*\\}`, 'g')) || []);
for (const [mode, effect] of [['chars', 'up'], ['chars', 'down'], ['words', 'up'], ['words', 'down']]) {
  const h = exporta(mode, effect); const t = `${mode}/${effect}`;
  v(/<span class="tw">(<span class="ww">)?<span class="w" /.test(h), `${t}: el texto va dentro de UN <span class="tw">`);
  v((h.match(/class="tw"/g) || []).length === 1, `${t}: un solo contenedor`);
  const tw = reglas(h, '.tw')[0] || ''; const w = reglas(h, '.w')[0] || '';
  v(new RegExp(`animation:a-${effect === 'up' ? 'subir' : 'bajar'} 0\\.7s [^ ]+ 0\\.2s backwards paused`).test(tw), `${t}: el contenedor anima solo la subida/bajada (con el retardo propio, pausado hasta .in)`);
  v(/animation:a-fade /.test(w) && !/translate|a-up|a-down/.test(w), `${t}: cada pieza solo hace fundido`);
  v(!/will-change/.test(h), `${t}: sin will-change`);
  v(/\.in \.tw,\.n\d+\.in \.w\{animation-play-state:running\}/.test(h), `${t}: .in arranca contenedor y piezas`);
  v(/@keyframes a-subir\{from\{translate/.test(h) && /@keyframes a-bajar/.test(h), `${t}: los keyframes del contenedor viajan en el export`);
  v(/\[data-rv\] \.tw/.test(h) && /<noscript>[^]*\.tw/.test(h), `${t}: 'reducir movimiento' y sin JS también quitan la animación del contenedor`);
}
{ const h = exporta('chars', 'up', 'Hola', { trigger: 'load' });
  v(/animation:a-subir [^;}]*backwards\}/.test(reglas(h, '.tw')[0]) && !/paused/.test(h.match(/\.n\d+ \.tw\{[^}]*\}/)[0]), 'al cargar: el contenedor corre solo (sin paused)'); }
for (const [mode, effect] of [['chars', 'fade'], ['chars', 'blur'], ['words', 'fade'], ['words', 'blur'], ['lines', 'up'], ['linesm', 'up']]) {
  const h = exporta(mode, effect, 'Lo que hacemos\ny más'); const t = `${mode}/${effect}`;
  v(!/class="tw"/.test(h) && !/will-change/.test(h) && !/a-subir/.test(reglas(h, '.w').join('')), `${t}: queda como estaba (sin .tw ni will-change)`);
}
const PROP = { left: 'translate', right: 'translate', zoom: 'scale', flip: 'transform', rotate: 'rotate' };
for (const [effect, prop] of Object.entries(PROP)) for (const mode of ['chars', 'words']) {
  const h = exporta(mode, effect); const w = reglas(h, '.w')[0]; const t = `${mode}/${effect}`;
  v(w.includes(`will-change:${prop},opacity`) && !/class="tw"/.test(h), `${t}: will-change con lo que se anima (${prop}, opacity), sin contenedor`);
  v(new RegExp(`animation:a-${effect} `).test(w), `${t}: el efecto sigue siendo el elegido`);
}
for (const mode of ['lines', 'linesm']) v(!/will-change/.test(exporta(mode, 'zoom', 'a b\nc d')), `${mode}/zoom: "por línea" no lleva will-change`);
{ const justo = 'x'.repeat(TOPE_CAPAS); const pasa = 'x'.repeat(TOPE_CAPAS + 1);
  v(/will-change/.test(exporta('chars', 'zoom', justo)), `${TOPE_CAPAS} piezas (el tope): conserva el efecto con will-change`);
  const h = exporta('chars', 'zoom', pasa); const w = reglas(h, '.w')[0];
  v(!/will-change/.test(h) && /animation:a-fade /.test(w) && !/scale|a-zoom/.test(w), `${TOPE_CAPAS + 1} piezas: se sustituye por fundido, sin will-change`);
  const hp = exporta('words', 'rotate', 'palabra '.repeat(TOPE_CAPAS + 1));
  v(!/will-change/.test(hp), `palabras: el tope cuenta palabras (${TOPE_CAPAS + 1} palabras -> fundido)`);
  v(/will-change/.test(exporta('words', 'rotate', 'palabra '.repeat(TOPE_CAPAS))), `palabras: ${TOPE_CAPAS} palabras conserva el efecto`);
  v(!/will-change/.test(exporta('chars', 'up', pasa)), 'Subir con muchas letras no usa will-change (no hay capas por pieza)'); }
{ const p = n('page', { name: 'P', content: { title: 'T' } }); const s = n('section', { name: 'S' });
  const h = n('heading', { name: 'h', content: { text: 'Sin animar', level: 2 } }); s.children.push(h); p.children.push(s);
  v(!/class="tw"|will-change/.test(exportHTML(p)), 'un título sin animación de texto no cambia'); }

// ---------- 2) Píxeles en Firefox: último ms vs estado final ----------
const casos = [['chars', 'up'], ['chars', 'down'], ['words', 'up']];
for (const dpr of ['1', '1.25']) {
  const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox().setPreference('layout.css.devPixelsPerPx', dpr)).build();
  try {
    await d.manage().window().setRect({ width: 1300, height: 900 });
    for (const [mode, effect] of casos) {
      const f = resolve(`tmp-logs/texto-capas-${mode}-${effect}.html`); writeFileSync(f, PAG({}, { mode, effect }));
      await d.get(pathToFileURL(f).href); await esperar(700);
      const R = await medir(d);
      for (const [id, r] of Object.entries(R)) {
        const t = `${id} ${mode}/${effect} a ${dpr}x`;
        v(r.A_vs_B.px === 0, `${t}: el último ms y el estado final son idénticos por píxeles (${r.A_vs_B.px} px distintos)`);
        v(r.B_vs_normal.px === 0, `${t}: el texto terminado es idéntico a un título normal (${r.B_vs_normal.px} px)`);
        v(r.mutacionesDeNodos === 0 && r.hijosAntes === r.hijosDespues, `${t}: el DOM no se toca al terminar (${r.hijosAntes} nodos)`);
        v(r.difLetraRectMax < 0.02, `${t}: ninguna letra cambia de posición ni de ancho (${r.difLetraRectMax} px)`);
      }
    }
    // estilos calculados + temporización (una sola vez, a 1x)
    if (dpr === '1') {
      const f = resolve('tmp-logs/texto-capas-estilos.html');
      const p = n('page', { name: 'P', content: { title: 'T' } }); const s = n('section', { name: 'S' });
      for (const [id, mode, effect] of [['up', 'chars', 'up'], ['zoom', 'chars', 'zoom'], ['fade', 'chars', 'fade']]) {
        const h = n('heading', { name: id, content: { text: 'Lo que hacemos', level: 2, anchor: id } }); h.animation = { text: { ...TD, trigger: 'load', mode, effect } }; s.children.push(h);
      }
      p.children.push(s); writeFileSync(f, exportHTML(p));
      await d.get(pathToFileURL(f).href); await esperar(300);
      const E = await d.executeScript(`const o={};for(const id of ['up','zoom','fade']){const h=document.getElementById(id),w=h.querySelector('.w'),tw=h.querySelector('.tw');
        o[id]={tw:!!tw,twAnim:tw?getComputedStyle(tw).animationName:null,twDisplay:tw?getComputedStyle(tw).display:null,twDelay:tw?getComputedStyle(tw).animationDelay:null,wAnim:getComputedStyle(w).animationName,wWill:getComputedStyle(w).willChange,
        n:h.getAnimations({subtree:true}).length,letras:h.querySelectorAll('.w').length}}return o`);
      v(E.up.tw && E.up.twAnim === 'a-subir' && E.up.twDisplay === 'block' && E.up.twDelay === '0.2s', 'Firefox: el contenedor de Subir es block, anima a-subir con el retardo propio (0,2 s)');
      v(E.up.wAnim === 'a-fade' && E.up.wWill === 'auto' && E.up.n === E.up.letras + 1, `Firefox: las ${E.up.letras} letras solo hacen fundido y sin will-change (${E.up.n} animaciones = letras + contenedor)`);
      v(!E.zoom.tw && E.zoom.wAnim === 'a-zoom' && E.zoom.wWill === 'scale, opacity' && E.zoom.n === E.zoom.letras, `Firefox: Zoom no lleva contenedor y cada letra declara will-change: ${E.zoom.wWill}`);
      v(!E.fade.tw && E.fade.wWill === 'auto' && E.fade.wAnim === 'a-fade', 'Firefox: Fade sin contenedor ni will-change (como antes)');
    }
  } finally { await d.quit(); }
}

// ---------- 3) El editor no cambia: lienzo, selección, edición de texto y undo ----------
{
  const pagina = n('page', { name: 'Página', content: { title: 'T' } }); const sec = n('section', { name: 'Sec' });
  const h = n('heading', { name: 'Titulo', content: { text: 'Lo que hacemos', level: 2 } });
  h.styles.base = { fontSize: '40px', margin: '40px' }; h.animation = { text: { ...TD, mode: 'chars', effect: 'up' } };
  sec.children.push(h); pagina.children.push(sec);
  const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
  try {
    await d.manage().window().setRect({ width: 1400, height: 1000 });
    const url = pathToFileURL(resolve('dist/editor.html')).href;
    await d.get(url);
    await d.executeScript(`localStorage.setItem('editor-landings:pagina', arguments[0])`, JSON.stringify(pagina));
    await d.get(url); await esperar(800);
    const guardada = async () => JSON.parse(await d.executeScript(`return localStorage.getItem('editor-landings:pagina')`));
    const hid = (await guardada()).children[0].children[0].id;
    const sel = `#preview [data-id="${hid}"]`;
    v(await d.executeScript(`return !document.querySelector('${sel} .tw, ${sel} .w')`), 'editor: el lienzo muestra el título como texto normal (sin .tw ni .w)');
    await d.findElement(By.css(sel)).click(); await esperar(200);
    v(await d.executeScript(`return !!document.querySelector('${sel}.sel, ${sel}[data-sel], #inspector [data-s="fontSize"]')`), 'editor: al hacer clic se selecciona y el inspector muestra sus campos');
    await d.actions({ async: true }).doubleClick(await d.findElement(By.css(sel))).perform(); await esperar(300);
    v(await d.executeScript(`return document.querySelector('${sel}').isContentEditable`), 'editor: doble clic abre la edición del texto');
    await d.actions({ async: true }).sendKeys(' hoy').perform(); await esperar(200);
    await d.actions({ async: true }).sendKeys(Key.ENTER).perform(); await esperar(900);
    v((await guardada()).children[0].children[0].content.text === 'Lo que hacemos hoy', 'editor: el texto editado se guarda ("Lo que hacemos hoy")');
    v((await guardada()).children[0].children[0].animation.text.mode === 'chars', 'editor: la animación de texto sigue en el nodo');
    await d.findElement(By.css('body')).click().catch(() => {});
    await d.actions({ async: true }).keyDown(Key.CONTROL).sendKeys('z').keyUp(Key.CONTROL).perform(); await esperar(900);
    const tras = (await guardada()).children[0].children[0].content.text;
    v(tras !== 'Lo que hacemos hoy', `editor: Ctrl+Z deshace la edición (queda "${tras}")`);
    const exp = await d.executeScript(`return document.querySelector('#btn-vista-previa') ? 1 : 0`);
    if (exp) {
      await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(900);
      const sd = await d.executeScript(`return document.querySelector('#vp-frame').getAttribute('srcdoc')`);
      v(/<span class="tw">/.test(sd) && /a-subir/.test(sd), 'Vista previa: el iframe lleva el mismo contenedor .tw que el export');
      const igual = exportHTML(await guardada()).replace(/<script>[\s\S]*<\/script>/, '');
      v(sd.replace(/\r\n/g, '\n').replace(/<script>[\s\S]*?<\/script>/g, '').includes(igual.replace(/\r\n/g, '\n').split('<body>')[1].slice(0, 300)), 'Vista previa: el <body> del iframe coincide con el export');
    }
  } finally { await d.quit(); }
}
console.log(`\n${ok} comprobaciones OK`);

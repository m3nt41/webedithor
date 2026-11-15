// Prueba: Marquesina en Firefox real.
//  A) HTML exportado en un iframe de 390px y en uno de 1300px: la animación corre (izq/der), pausa con el ratón, bucle exacto,
//     sin desborde horizontal (contorno, cinta, logos), estática sin animación.
//  B) Con "reducir movimiento" (perfil de prueba): queda quieta, sin copias y sin desborde.
//  C) Editor compilado (dist/editor.html): se ve QUIETA y editable, el inspector cambia los campos (Undo), Elem. la añade, Vista previa la anima.
// Ejecutar: npm run build && node tests/marquesina-ui.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n, walk } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { exportHTML } from '../src/export/exporter.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ver = (ok, msg, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'OK   ' : 'FALLA'} ${msg}${extra ? '  → ' + extra : ''}`); };

mkdirSync('tests/out', { recursive: true });
const pag = (...hijos) => { const p = n('page', { name: 'Página' }); p.children.push(...hijos); return p; };
const guardar = (nombre, html) => writeFileSync(`tests/out/${nombre}.html`, html);
guardar('mq-host', `<!doctype html><body style="margin:0"><iframe id="f" style="border:0;display:block" height="800"></iframe>
<script>const q=new URLSearchParams(location.search);const f=document.getElementById('f');f.width=q.get('w');f.src=q.get('src')</script></body>`);
const fu = (nombre) => pathToFileURL(resolve(`tests/out/${nombre}.html`)).href;

/** Página con los 3 estilos (animada, la de la derecha a la inversa) + una estática. */
const conf = (nodo, cfg) => { walk(nodo, (x) => { if (x.content?.marquesina) Object.assign(x.content.marquesina, cfg); }); return nodo; };
const principal = () => pag(
  conf(createBlock('marquesina', 'contornoClaro'), { vel: 20 }),
  conf(createBlock('marquesina', 'cintaOscuro'), { dir: 'der', vel: 20 }),
  conf(createBlock('marquesina', 'logosClaro'), { vel: 20 }),
  conf(createBlock('marquesina', 'cintaClaro'), { mov: false }),
);
guardar('mq-base', exportHTML(principal()));

const nuevo = async (reducido = false) => {
  const o = new firefox.Options().addArguments('-headless').setBinary(FIREFOX);
  if (reducido) o.setPreference('ui.prefersReducedMotion', 1);
  const dr = await new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
  await dr.manage().window().setRect({ width: 1400, height: 1000 });
  return dr;
};
let d = await nuevo();
const js = (s, ...a) => d.executeScript(s, ...a);
const abrir = async (w, nombre = 'mq-base') => { await d.get(`${fu('mq-host')}?src=${encodeURIComponent(`${nombre}.html`)}&w=${w}`); await esperar(500); await d.switchTo().frame(await d.findElement(By.css('#f'))); };
const salir = () => d.switchTo().defaultContent();
const tx = (sel) => js(`const p=document.querySelectorAll('.mq-p')[${sel}]; return parseFloat(getComputedStyle(p).translate.split(' ')[0])||0`);

try {
  // ===================== A. EXPORT =====================
  for (const w of [390, 1300]) {
    await abrir(w);
    const info = await js(`return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, pistas: document.querySelectorAll('.mq-p').length, anim: [...document.querySelectorAll('.mq-p')].map(p=>p.getAnimations().map(a=>a.playState)) }`);
    ver(info.sw <= info.cw && info.sw <= w, `A${w}. sin desborde horizontal (contorno, cinta, logos y estática)`, `scrollWidth ${info.sw} / ${info.cw}`);
    ver(info.pistas === 3 && info.anim.every((a) => a.length === 1 && a[0] === 'running'), `A${w}b. 3 pistas con la animación corriendo`, JSON.stringify(info.anim));
    const frames = await js(`return [...document.querySelectorAll('.mq-p')].map(p=>{const m=p.parentElement.getBoundingClientRect(); return {w:Math.round(m.width), cw:document.documentElement.clientWidth}})`);
    ver(frames.every((f) => f.w <= f.cw), `A${w}c. cada marco cabe en la pantalla`, JSON.stringify(frames));

    // dirección: izq (0 y 2) el translate baja; der (1) sube
    const a0 = [await tx(0), await tx(1), await tx(2)]; await esperar(500); const a1 = [await tx(0), await tx(1), await tx(2)];
    ver(a1[0] < a0[0] && a1[2] < a0[2], `A${w}d. izquierda: la tira se mueve hacia la izquierda`, `${a0[0].toFixed(1)} → ${a1[0].toFixed(1)}`);
    ver(a1[1] > a0[1], `A${w}e. derecha: la tira se mueve hacia la derecha`, `${a0[1].toFixed(1)} → ${a1[1].toFixed(1)}`);

    // bucle exacto: pista = K grupos idénticos y al final de la vuelta el desplazamiento es justo un grupo
    const loop = await js(`return [...document.querySelectorAll('.mq-p')].map(p=>{ const gs=[...p.children]; const W=gs[0].getBoundingClientRect().width; const a=p.getAnimations()[0]; const dur=a.effect.getTiming().duration; a.pause(); a.currentTime=dur-1; const fin=parseFloat(getComputedStyle(p).translate); a.currentTime=1; const ini=parseFloat(getComputedStyle(p).translate); const rev=a.effect.getComputedTiming().direction==='reverse'; a.play(); const fw=p.parentElement.getBoundingClientRect().width; return {rev, K:gs.length, W, pista:p.getBoundingClientRect().width, iguales: gs.every(g=>Math.abs(g.getBoundingClientRect().width-W)<0.6), fin, ini, cubre:(gs.length-1)*W>=fw}})`);
    ver(loop.every((l) => l.K === 4 && l.iguales && Math.abs(l.pista - l.K * l.W) < 1), `A${w}f. K grupos idénticos que suman la pista`, JSON.stringify(loop.map((l) => [l.K, Math.round(l.W), Math.round(l.pista)])));
    // el translate computado es un % de la pista: un grupo = -100/K % (= -25 % con 4 copias). Con 'reverse' empieza en -25 % y termina en 0.
    ver(loop.every((l) => { const [a, b] = l.rev ? [l.ini, l.fin] : [l.fin, l.ini]; return Math.abs(a + 100 / l.K) < 0.05 && Math.abs(b) < 0.05; }), `A${w}g. el bucle cierra exacto (la vuelta recorre justo un grupo: -100/K %)`, JSON.stringify(loop.map((l) => [l.rev, l.ini, l.fin])));
    ver(loop.every((l) => l.cubre), `A${w}h. nunca queda hueco (copias × ancho ≥ pantalla)`);

    // copias: aria-hidden + inert, y no se leen/enfocan
    const cop = await js(`const p=document.querySelector('.mq-p'); return {ocultas:[...p.children].filter(g=>g.getAttribute('aria-hidden')==='true'&&g.inert).length, vis: p.children[0].hasAttribute('aria-hidden')}`);
    ver(cop.ocultas === 3 && !cop.vis, `A${w}i. 3 copias aria-hidden + inert, la primera normal`);

    // estática: sin animación, items todos visibles dentro del ancho
    const est = await js(`const s=document.querySelectorAll('section')[3]; const g=s.querySelector('.mq-g'); const r=g.getBoundingClientRect(); return {anim:g.getAnimations().length+s.getAnimations({subtree:true}).length, pistas:s.querySelectorAll('.mq-p').length, w:Math.round(r.width), cw:document.documentElement.clientWidth, n:g.children.length}`);
    ver(est.anim === 0 && est.pistas === 0 && est.w <= est.cw, `A${w}j. variante estática: sin animación, sin pista, cabe`, JSON.stringify(est));
    await salir();
  }

  // pausa con el ratón (escritorio)
  await abrir(1300);
  await js('window.scrollTo(0,0)');
  await salir();
  await d.actions().move({ origin: 'viewport', x: 400, y: 100 }).perform(); // dentro del iframe, sobre el primer marco
  await esperar(300);
  await d.switchTo().frame(await d.findElement(By.css('#f')));
  const sobre = await js(`const p=document.querySelector('.mq-p'); return {hov:p.parentElement.matches(':hover'), st:p.getAnimations()[0].playState}`);
  if (sobre.hov) {
    const p1 = await tx(0); await esperar(400); const p2 = await tx(0);
    ver(sobre.st === 'paused' && Math.abs(p1 - p2) < 0.01, 'A10. al pasar el ratón la marquesina se pausa y no avanza', `${sobre.st} ${p1} → ${p2}`);
  } else ver(false, 'A10. el ratón no quedó sobre la marquesina (prueba mal posicionada)', JSON.stringify(sobre));
  await salir();
  await d.actions().move({ origin: 'viewport', x: 400, y: 900 }).perform(); await esperar(300);
  await d.switchTo().frame(await d.findElement(By.css('#f')));
  ver((await js(`return document.querySelector('.mq-p').getAnimations()[0].playState`)) === 'running', 'A11. al quitar el ratón sigue corriendo');
  await salir();

  // pausa apagada → no se pausa
  const sinPausa = pag(conf(createBlock('marquesina', 'cintaClaro'), { pausa: false }));
  guardar('mq-sinpausa', exportHTML(sinPausa));
  await abrir(1300, 'mq-sinpausa'); await salir();
  await d.actions().move({ origin: 'viewport', x: 400, y: 30 }).perform(); await esperar(300);
  await d.switchTo().frame(await d.findElement(By.css('#f')));
  ver((await js(`const p=document.querySelector('.mq-p'); return p.parentElement.matches(':hover') && p.getAnimations()[0].playState`)) === 'running', 'A12. con "Pausa" apagada no se detiene al pasar el ratón');
  await salir();
  await d.quit();

  // ===================== B. REDUCED MOTION =====================
  d = await nuevo(true);
  for (const w of [390, 1300]) {
    await abrir(w);
    ver(await js(`return matchMedia('(prefers-reduced-motion:reduce)').matches`), `B${w}. el perfil emula reducir movimiento`);
    const r = await js(`const ps=[...document.querySelectorAll('.mq-p')]; return { anim: ps.reduce((a,p)=>a+p.getAnimations().length,0), copias: [...document.querySelectorAll('.mq-g[aria-hidden]')].filter(g=>getComputedStyle(g).display!=='none').length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, tr: ps.map(p=>getComputedStyle(p).translate), ancho: ps.map(p=>Math.round(p.getBoundingClientRect().width)), marco: ps.map(p=>Math.round(p.parentElement.getBoundingClientRect().width)) }`);
    ver(r.anim === 0 && r.copias === 0 && r.sw <= r.cw, `B${w}b. quieta: sin animación, sin copias visibles, sin desborde`, JSON.stringify(r));
    ver(r.ancho.every((a, i) => a <= r.marco[i] + 1), `B${w}c. la tira cabe en su marco (con wrap)`, JSON.stringify([r.ancho, r.marco]));
    await salir();
  }
  await d.quit();

  // ===================== C. EDITOR =====================
  d = await nuevo();
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  const urlEd = pathToFileURL(resolve('dist/editor.html')).href;
  const LS = 'editor-landings:pagina';
  const guardada = async () => JSON.parse(await js(`return localStorage.getItem('${LS}')`));
  const buscar = (p, f) => { let r = null; walk(p, (x) => { if (!r && f(x)) r = x; }); return r; };
  const marq = async () => buscar(await guardada(), (x) => x.content?.marquesina)?.content.marquesina;
  const p0 = pag(createBlock('marquesina', 'cintaClaro'), createBlock('marquesina', 'contornoOscuro'));
  await d.get(urlEd); await js(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(p0)); await d.get(urlEd); await esperar(700);
  const idMq = (await guardada()).children[0].children[0].id;

  const ed = await js(`const pv=document.querySelector('#preview'); const fr=pv.querySelector('[data-id="${idMq}"]'); const cs=getComputedStyle(fr); const hijos=[...fr.children]; return { pistas: pv.querySelectorAll('.mq-p,.mq-g').length, anim: pv.getAnimations({subtree:true}).length, wrap: cs.flexWrap, n: hijos.length, visibles: hijos.filter(h=>h.getBoundingClientRect().width>0 && h.getBoundingClientRect().right<=innerWidth).length, edit: hijos.every(h=>h.dataset.id) }`);
  ver(ed.pistas === 0 && ed.anim === 0, 'C1. editor: la marquesina se ve QUIETA (sin pista ni animaciones)', JSON.stringify(ed));
  ver(ed.wrap === 'wrap' && ed.visibles === ed.n && ed.edit, 'C2. todos los items a la vista y seleccionables (data-id)', JSON.stringify(ed));

  // móvil del editor: sin desborde y el texto con contorno sigue quieto
  await d.findElement(By.css('#vista-mobile')).click(); await esperar(300);
  const mov = await js(`const pv=document.querySelector('#preview'); const pg=pv.querySelector('[data-type="page"]'); return { sw: pg.scrollWidth, cw: pg.clientWidth, anim: pv.getAnimations({subtree:true}).length }`);
  ver(mov.cw === 390 && mov.sw <= mov.cw && mov.anim === 0, 'C3. vista móvil del editor: sin desborde horizontal ni animación', JSON.stringify(mov));
  await d.findElement(By.css('#vista-desktop')).click(); await esperar(300);

  // inspector
  await js(`document.querySelector('#preview [data-id="${idMq}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(300);
  const panel = () => js(`return document.querySelector('#inspector, .inspector, aside:last-of-type')?.innerText || document.body.innerText`);
  const pulsa = async (campo, val) => { await js(`document.querySelector('[data-mq="${campo}"][data-val="${val}"]').click()`); await esperar(550); };
  ver(/Segundos por vuelta/.test(await panel()), 'C4. el inspector muestra el grupo Marquesina con "Segundos por vuelta"');
  const rep = await js(`const det=document.querySelector('details.avanzado[data-g="Marquesina"]'); return {hay:!!det, abierto:det?.open, dentro: !!det?.querySelector('[data-mq="copias"]'), fuera: !!document.querySelector('[data-mq="copias"]:not(details *)')}`);
  ver(rep.hay && !rep.abierto && rep.dentro && !rep.fuera, 'C5. "Repetición" está dentro de Avanzado (cerrado)', JSON.stringify(rep));
  const antes = await marq();
  await pulsa('dir', 'der'); ver((await marq()).dir === 'der' && (await marq()).vel === antes.vel, 'C6. Dirección → derecha (no toca lo demás)');
  await pulsa('vel', 12); ver((await marq()).vel === 12, 'C7. Velocidad Rápida = 12 s');
  await pulsa('gap', 96); ver((await marq()).gap === 96, 'C8. Separación 96');
  const gapEd = await js(`return getComputedStyle(document.querySelector('#preview [data-id="${idMq}"]')).columnGap`);
  ver(gapEd === '96px', 'C8b. el editor aplica la separación', gapEd);
  await pulsa('pausa', 0); ver((await marq()).pausa === false, 'C9. Pausa → No');
  await js(`document.querySelector('details.avanzado[data-g="Marquesina"]').open=true`); await esperar(150);
  await pulsa('copias', 6); ver((await marq()).copias === 6, 'C10. Repetición 6 (Avanzado)');
  const inp = await d.findElement(By.css('[data-mq-num="vel"]'));
  await inp.clear(); await inp.sendKeys('7'); await esperar(550);
  ver((await marq()).vel === 7, 'C11. "Segundos por vuelta" libre (7)');
  await inp.clear(); await inp.sendKeys('1'); await esperar(550);
  ver((await marq()).vel === 7, 'C11b. un valor fuera de 5–120 no se guarda');
  await pulsa('mov', 0);
  ver((await marq()).mov === false && !/Segundos por vuelta/.test(await panel()), 'C12. Sin movimiento: se guarda y se ocultan velocidad/dirección/pausa');
  await js(`document.querySelector('#btn-undo').click()`); await esperar(550);
  ver((await marq()).mov === true, 'C13. Undo deshace el último cambio');

  ver((await js(`return [...document.querySelectorAll('.bloque-titulo')].some(b=>b.textContent.trim()==='Marquesina')`)), 'C13b. el panel Bloques lista "Marquesina"');

  // Vista previa: el export real SÍ se anima
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(900);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const vp = await js(`const ps=[...document.querySelectorAll('.mq-p')]; return { n: ps.length, run: ps.every(p=>p.getAnimations()[0]?.playState==='running'), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }`);
  ver(vp.n === 2 && vp.run && vp.sw <= vp.cw, 'C14. Vista previa: 2 marquesinas animadas y sin desborde', JSON.stringify(vp));
  await salir(); await d.findElement(By.css('#vp-ojo')).click(); await esperar(300);

  // Elem.: añadir una marquesina suelta dentro de una sección
  await js(`document.querySelector('#preview [data-type="section"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(200);
  await js(`document.querySelector('#tab-elementos').click()`); await esperar(200);
  const nAntes = (await guardada()).children.length;
  await js(`[...document.querySelectorAll('#botones-elementos button')].find(b=>b.textContent.trim()==='+ Marquesina').click()`); await esperar(300);
  const tras = await guardada();
  let cuenta = 0; walk(tras, (x) => { if (x.content?.marquesina) cuenta++; });
  ver(cuenta === 3 && tras.children.length === nAntes, 'C15. Elem. → Marquesina añade un contenedor con content.marquesina', `marquesinas: ${cuenta}`);
} catch (e) {
  fallas++; console.log('FALLA excepción:', e.message);
} finally {
  try { await d.quit(); } catch {}
}
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo OK');
process.exit(fallas ? 1 : 0);

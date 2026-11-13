// Prueba: el preview del editor SOLO entra en modo reproducir con el botón ▶ (bug "las escenas se activan solas").
// Escenario exacto, a 1200px en Firefox real, con el editor compilado (dist/editor.html, file://):
//   navbar sticky + sección de planes + dos escenas abajo. Se añade "crecer hasta su tamaño" (ligado al scroll)
//   a los planes DESDE EL INSPECTOR. Las escenas deben seguir apiladas (modo edición) hasta pulsar ▶.
// Ejecutar: npm run build && node tests/preview-play.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Página del escenario: navbar sticky (viene así por defecto), planes y dos escenas
const pagina = n('page', { name: 'Página' });
const planes = createBlock('pricing');
pagina.children.push(createBlock('navbar', 'oscuro'), planes, createBlock('scene', 'textos'), createBlock('scene', 'imagenes'));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
try {
  await d.manage().window().setRect({ width: 1200, height: 1000 });
  for (let i = 0; i < 3; i++) { // área visible exactamente de 1200px de ancho
    const iw = await d.executeScript('return innerWidth');
    if (iw === 1200) break;
    const r = await d.manage().window().getRect();
    await d.manage().window().setRect({ width: r.width + (1200 - iw), height: r.height });
  }
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript('localStorage.setItem("editor-landings:pagina", arguments[0])', JSON.stringify(pagina));
  await d.get(url); // recarga: el editor arranca con esa página
  await esperar(800);
  await d.executeScript(`window.__err=[];addEventListener('error',e=>__err.push(e.message));addEventListener('unhandledrejection',e=>__err.push(String(e.reason)));`);

  const estado = () => d.executeScript(`const st=document.querySelector('.stage'),bp=document.querySelector('#btn-play');
    const escenas=[...st.querySelectorAll('section')].filter((s)=>/Primero|Mira cómo/.test(s.textContent)&&!s.querySelector('section')).map((s)=>getComputedStyle(s).position);
    return {innerWidth, ew:st.querySelectorAll('[data-ew]').length, sc:st.querySelectorAll('[data-sc]').length, escenas, stageSc:st.classList.contains('sc'),
      botonActivo:bp.classList.contains('activo'), botonTexto:bp.textContent, etiqueta:!document.querySelector('#etiqueta-play').hidden,
      marco:document.querySelector('#preview').classList.contains('reproduciendo')}`);
  const editando = (s, donde) => {
    assert.equal(s.innerWidth, 1200, 'la ventana no mide 1200px');
    assert.equal(s.ew, 0, `${donde}: hay escenas activas (data-ew)`);
    assert.deepEqual(s.escenas, ['static', 'static'], `${donde}: las escenas no están apiladas`);
    assert.equal(s.stageSc, false, `${donde}: el stage tiene .sc`);
    assert.equal(s.botonActivo, false, `${donde}: botón ▶ resaltado`);
    assert.equal(s.etiqueta, false, `${donde}: etiqueta Reproduciendo visible`);
    assert.equal(s.marco, false, `${donde}: marco de reproducir encendido`);
  };
  const reproduciendo = (s, donde) => {
    assert.equal(s.ew, 2, `${donde}: las escenas no se activaron`);
    assert.deepEqual(s.escenas, ['sticky', 'sticky']);
    assert.equal(s.stageSc, true);
    assert.equal(s.botonActivo, true, `${donde}: botón ▶ sin resaltar`);
    assert.ok(s.etiqueta, `${donde}: falta la etiqueta Reproduciendo`);
    assert.ok(s.marco, `${donde}: falta el marco`);
  };
  const clicPlay = async () => { await d.findElement(By.css('#btn-play')).click(); await esperar(500); };
  const fijarEfecto = async (valor) => {
    await d.executeScript(`const s=document.querySelector('select[data-a="scrolllink.effect"]');s.value=arguments[0];s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}))`, valor);
    await esperar(500);
  };

  editando(await estado(), 'al abrir');

  // 1. Selecciona la sección de planes (en el árbol de capas) y añade "Crecer hasta su tamaño" desde el inspector
  await d.findElement(By.css(`#arbol li[data-id="${planes.id}"]`)).click();
  await esperar(400);
  assert.ok((await d.findElements(By.css('select[data-a="scrolllink.effect"]'))).length, 'el inspector no muestra "Ligado al scroll"');
  await fijarEfecto('zoom-in');
  const guardado = await d.executeScript(`return localStorage.getItem('editor-landings:pagina')`);
  await esperar(500);
  assert.ok(JSON.parse(await d.executeScript(`return localStorage.getItem('editor-landings:pagina')`) ?? guardado).children[1].animation?.scrolllink?.effect === 'zoom-in', 'el efecto no quedó en la página');
  editando(await estado(), 'tras añadir el efecto'); // el bug: aquí las escenas se activaban solas

  // 2. Añadir otros grupos de animación tampoco activa el modo reproducir (hover = cualquier grupo)
  await fijarEfecto('fade-in');
  editando(await estado(), 'tras cambiar el efecto');

  // 3. ▶ entra; ▶ otra vez sale
  await clicPlay();
  reproduciendo(await estado(), 'tras ▶');
  assert.equal((await estado()).sc, 1, 'los planes con ligado al scroll deberían tener data-sc');
  await clicPlay();
  editando(await estado(), 'tras ▶ de nuevo');

  // 4. ▶ y Esc sale
  await clicPlay();
  reproduciendo(await estado(), 'segundo ▶');
  await d.findElement(By.css('body')).sendKeys(Key.ESCAPE);
  await esperar(400);
  editando(await estado(), 'tras Esc');

  // 5. Estando en modo reproducir, cambiar un ajuste vuelve a edición (no se queda reproduciendo)
  await clicPlay();
  reproduciendo(await estado(), 'tercer ▶');
  await fijarEfecto('');
  editando(await estado(), 'tras quitar el efecto en modo reproducir');

  const errs = await d.executeScript('return __err');
  assert.deepEqual(errs, [], 'errores en la página: ' + errs.join(' | '));
  console.log('OK 1200px: añadir/cambiar/quitar el efecto no activa las escenas; solo ▶ (sale con ▶, Esc o al editar); indicador correcto; sin errores');
} finally { await d.quit(); }

// Prueba: la demo web arranca con la landing de muestra sin pisar nunca lo guardado. Firefox real, builds compilados (file://).
// Compila el build de la demo en tmp-logs/demo-build (no toca dist/). El build normal es dist/editor.html.
// Ejecutar: npm run build && node tests/demo-inicial.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const r = spawnSync('npx vite build --mode demo --outDir tmp-logs/demo-build --emptyOutDir', { shell: true, stdio: 'pipe', encoding: 'utf8' });
assert.equal(r.status, 0, 'falló el build de la demo: ' + r.stderr);
const DEMO = resolve('tmp-logs/demo-build/index.html');
const NORMAL = resolve('dist/editor.html');
const TITULO = JSON.parse(readFileSync('docs/demo-estrella.json', 'utf8')).page.content.title;
assert.ok(readFileSync(DEMO, 'utf8').includes(TITULO), 'el build de la demo no lleva la landing');
assert.ok(!readFileSync(NORMAL, 'utf8').includes(TITULO), 'el build normal NO debe llevar la landing');

const CLAVE = 'editor-landings:pagina';
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
let ok = 0;
const comprueba = (cond, msg) => { assert.ok(cond, msg); ok++; console.log('ok -', msg); };
try {
  await d.manage().window().setRect({ width: 1400, height: 950 });
  const guardado = () => d.executeScript(`return localStorage.getItem('${CLAVE}')`);
  const secciones = () => d.executeScript(`return document.querySelectorAll('#preview section').length`);
  const texto = () => d.executeScript(`return document.querySelector('#preview').textContent`);
  const hayDemo = async () => (await texto()).includes('¿La hacemos girar?');
  // arranca la página `ruta` con el localStorage en el estado pedido (null = vacío)
  const arrancar = async (ruta, valor = null) => {
    await d.get(pathToFileURL(ruta).href);
    // se pone en una página en blanco del mismo origen para que el editor abierto no vuelva a guardar al salir
    await d.executeScript(`localStorage.clear(); if (arguments[0] !== null) localStorage.setItem('${CLAVE}', arguments[0])`, valor);
    await d.navigate().refresh();
    await esperar(900);
  };
  const confirmar = async (si) => { const a = await d.switchTo().alert(); if (si) await a.accept(); else await a.dismiss(); await esperar(700); };

  // 1. Primera visita
  await arrancar(DEMO);
  comprueba(await hayDemo(), 'sin nada guardado sale la landing de muestra');
  comprueba(await secciones() === 12, 'salen sus 12 secciones');
  comprueba((await d.findElement(By.css('#toast-ia')).getText()).includes('Vista previa') || (await d.findElement(By.css('#toast-ia')).getText()).includes('ojo'), 'el aviso explica cómo ver las animaciones');
  comprueba(await guardado() === null, 'solo mirar no guarda nada');
  comprueba(await d.findElement(By.css('#btn-undo')).getAttribute('disabled') !== null, 'la demo no cuenta como un cambio que deshacer');

  // 2. Nuevo = página vacía guardada; la demo no se vuelve a meter
  await d.findElement(By.css('#btn-nuevo')).click(); await confirmar(true);
  comprueba(await secciones() === 0 && (await guardado()) !== null, 'Nuevo deja la página vacía y la guarda');
  await d.navigate().refresh(); await esperar(900);
  comprueba(await secciones() === 0 && !(await hayDemo()), 'al recargar, la página vacía se respeta');
  const vacia = await guardado();

  // 3. Ver demo: cancelar, aceptar y deshacer
  await d.findElement(By.css('#btn-demo')).click(); await confirmar(false);
  comprueba(await secciones() === 0 && await guardado() === vacia, 'Ver demo cancelado no cambia nada');
  await d.findElement(By.css('#btn-demo')).click(); await confirmar(true);
  comprueba(await hayDemo(), 'Ver demo aceptado carga la landing');
  await d.findElement(By.css('#btn-undo')).click(); await esperar(700);
  comprueba(await secciones() === 0, 'Deshacer devuelve la página anterior');

  // 4. Guardado dañado: no se carga la demo, se aparta copia y se avisa
  await arrancar(DEMO, '{"esto no es json');
  comprueba(!(await hayDemo()), 'con un guardado dañado NO se carga la demo');
  comprueba(await d.executeScript(`return localStorage.getItem('${CLAVE}-danada')`) === '{"esto no es json', 'se aparta una copia exacta de lo dañado');
  comprueba((await d.findElements(By.css('#aviso-danado #danado-bajar'))).length === 1, 'sale el aviso con el botón de descargar');
  await d.findElement(By.css('#danado-cerrar')).click();
  comprueba((await d.findElements(By.css('#aviso-danado'))).length === 0, 'el aviso se puede cerrar');

  // 5. Build normal: ni demo ni botón
  await arrancar(NORMAL);
  comprueba(await secciones() === 0 && (await d.findElements(By.css('#btn-demo'))).length === 0, 'el editor normal arranca vacío y sin "Ver demo"');
} finally {
  await d.quit();
}
console.log(`demo-inicial: ${ok} comprobaciones ok`);

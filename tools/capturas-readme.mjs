// Genera las capturas del README en docs/assets/ con Firefox real (Selenium, perfil temporal), a partir del editor
// compilado y de la landing de muestra docs/demo-estilo.json.
//   npm run build && node tools/capturas-readme.mjs
// Escribe: editor.png (escritorio, un título seleccionado con su inspector), vista-previa.png (el export en el iframe 👁)
// y movil.png (vista móvil del editor). No toca src/. Sin procesos abiertos al terminar (el Firefox tiene perfil temporal).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { opcionesFirefox } from './lib-tests.mjs';

const ASSETS = resolve('docs/assets');
mkdirSync(ASSETS, { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const guardar = (nombre, base64) => { writeFileSync(resolve(ASSETS, nombre), Buffer.from(base64, 'base64')); console.log('escrito docs/assets/' + nombre); };

const datos = JSON.parse(readFileSync(resolve('docs/demo-estilo.json'), 'utf8'));
const pagina = JSON.stringify(datos.page ?? datos);

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1480, height: 1000 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  // inspector con todo abierto y la landing de muestra cargada (mismas claves que usan los tests)
  await d.executeScript(`localStorage.setItem('editor-landings:pagina', arguments[0])`, pagina);
  await d.get(url);
  await esperar(900);

  // 1) escritorio, con el título del hero seleccionado
  await d.findElement(By.css('#preview h1')).click();
  await esperar(500);
  guardar('editor.png', await d.takeScreenshot());

  // 2) Vista previa (iframe con el HTML exportado)
  await d.findElement(By.css('#btn-vista-previa')).click();
  await esperar(900);
  guardar('vista-previa.png', await d.takeScreenshot());
  await d.actions().sendKeys('').perform(); // Esc cierra la vista previa
  await esperar(400);

  // 3) vista móvil del editor
  await d.findElement(By.css('#vista-mobile')).click();
  await esperar(700);
  guardar('movil.png', await d.takeScreenshot());
} finally {
  await d.quit();
}

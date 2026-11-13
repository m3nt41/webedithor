// MEDICIÓN (no es un test): scrollY por frame en la cola del scroll suave. Uso: node tests/medir-suave.mjs [firefox|chrome]
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { Builder } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import chrome from 'selenium-webdriver/chrome.js';
import './generar.mjs';
const out = join(dirname(fileURLToPath(import.meta.url)), 'out');
const nav = process.argv[2] || 'firefox';
const b = new Builder();
if (nav === 'firefox') b.forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(process.env.FIREFOX_BIN || 'C:\Program Files\Mozilla Firefox\firefox.exe'));
else b.forBrowser('chrome').setChromeOptions(new chrome.Options().addArguments('--headless=new', '--window-size=900,700'));
const d = await b.build();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await d.get(pathToFileURL(join(out, 'suave.html')).href); await esperar(500);
  await d.executeScript(`
    window.__f=[]; window.__w=[]; window.__rec=false;
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=(cb)=>raf((t)=>{ if(window.__rec) window.__f.push({t, now:performance.now(), y:null}); cb(t); if(window.__rec) window.__f.at(-1).y=scrollY; });
    addEventListener('wheel',()=>{window.__w.push(performance.now()); window.__rec=true;});`);
  await d.actions({ async: true }).scroll(450, 400, 0, 300).perform();
  await esperar(2500);
  const f = await d.executeScript('return [window.__f, window.__w]');
  const [frames, w] = f;
  const ys = frames.map((x) => x.y);
  console.log(`== ${nav}: ${frames.length} frames. wheel en now=${w[0]?.toFixed(1)}`);
  console.log('primer frame: t - wheelNow =', (frames[0].t - w[0]).toFixed(2), 'ms (negativo => dt negativo)');
  console.log('scrollY por frame:', ys.map((y) => +y.toFixed(2)).join(' '));
  const cola = ys.slice(-25);
  let rep = 0, saltos1 = 0;
  for (let i = 1; i < cola.length; i++) { const dd = cola[i] - cola[i - 1]; if (dd === 0) rep++; if (Math.abs(dd) === 1) saltos1++; }
  console.log('cola (últimos 25): repetidos', rep, '· pasos de exactamente 1px', saltos1);
} finally { await d.quit(); }

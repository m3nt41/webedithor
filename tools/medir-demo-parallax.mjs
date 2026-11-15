// Mide en Firefox (Selenium) cuánto se mueve el círculo rojo de docs/demo-parallax.html respecto al borde de su marco.
// Scroll en pasos de 150 px, captura en cada paso (tmp-tests/demo-parallax/), y el círculo se localiza por PÍXELES
// (rojo puro en la captura, leída con un canvas dentro de la propia página). Ejecutar: node tools/medir-demo-parallax.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Builder } from 'selenium-webdriver';
import { opcionesFirefox, DESCARGAS } from './lib-tests.mjs';

const dir = join(DESCARGAS, 'demo-parallax'); mkdirSync(dir, { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await driver.manage().window().setRect({ width: 1100, height: 900 });
  await driver.get(pathToFileURL(join(process.cwd(), 'docs', 'demo-parallax.html')).href); await esperar(600);
  const info = await driver.executeScript("return {vh:innerHeight,vw:innerWidth,dpr:devicePixelRatio,max:document.documentElement.scrollHeight-innerHeight,sup:CSS.supports('animation-timeline','view()'),n:document.getAnimations().length}");
  console.log('Firefox', (await driver.getCapabilities()).get('browserVersion'), JSON.stringify(info));
  const marcoRect = "const m=[...document.querySelectorAll('div')].filter(d=>d.querySelector(':scope > img'));return m.map(d=>{const r=d.getBoundingClientRect(),i=d.querySelector(':scope > img').getBoundingClientRect();return {top:r.top,bottom:r.bottom,imgTop:i.top}})";
  const filas = [];
  for (let y = 0, k = 0; y <= info.max; y += 150, k++) {
    await driver.executeScript('window.scrollTo(0,arguments[0])', y); await esperar(350);
    const png = await driver.takeScreenshot();
    writeFileSync(join(dir, `paso-${String(k).padStart(2, '0')}-y${y}.png`), png, 'base64');
    const marcos = await driver.executeScript(marcoRect);
    // círculo rojo (r>230,g<40,b<40) en la captura: centro Y y X medios de los píxeles rojos dentro de cada marco visible
    const rojos = await driver.executeAsyncScript(`const A=arguments,cb=A[A.length-1];const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;const k=im.width/innerWidth;const res=[];for(const m of A[0]){let s=0,n=0,t=1e9,b=-1;const y0=Math.max(0,Math.ceil(m.top*k)),y1=Math.min(c.height,Math.floor(m.bottom*k));for(let yy=y0;yy<y1;yy++)for(let xx=0;xx<c.width;xx++){const i=(yy*c.width+xx)*4;if(d[i]>230&&d[i+1]<40&&d[i+2]<40){s+=yy;n++;if(yy<t)t=yy;if(yy>b)b=yy}}res.push(n>200?{cy:s/n/k,top:t/k,bot:b/k}:null)}cb(res)};im.src='data:image/png;base64,'+A[1]`, marcos, png);
    filas.push({ y, marcos, rojos });
  }
  // tabla: por cada marco, distancia (px) del centro del círculo al borde superior del marco, en cada paso
  for (let m = 0; m < 3; m++) {
    console.log(`\nMarco ${m + 1}: scrollY | círculo−borde superior del marco (px, por píxeles) | imagen−borde (px, DOM)`);
    const vals = [];
    for (const f of filas) {
      const r = f.rojos?.[m], mr = f.marcos[m];
      if (!r || mr.bottom < 0 || mr.top > 900) continue;
      const d = r.cy - mr.top, di = mr.imgTop - mr.top;
      vals.push(d);
      console.log(`  ${String(f.y).padStart(5)} | ${d.toFixed(1).padStart(7)} | ${di.toFixed(1).padStart(7)}`);
    }
    if (vals.length) console.log(`  → desplazamiento total del círculo: ${(Math.max(...vals) - Math.min(...vals)).toFixed(1)} px (de ${Math.min(...vals).toFixed(1)} a ${Math.max(...vals).toFixed(1)}) en ${vals.length} pasos visibles`);
  }
  console.log('\nCapturas en', dir);
} finally { await driver.quit(); }

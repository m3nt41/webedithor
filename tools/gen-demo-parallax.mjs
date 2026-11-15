// Genera docs/demo-parallax.json (para "Abrir JSON" en el editor) y docs/demo-parallax.html (el export real, para abrir
// con doble clic). Pensada para que el parallax se VEA: cada imagen vive en un marco de 420 px con bordes redondeados
// (overflow hidden), es más alta que el marco (700 px) y lleva dentro una cuadrícula con números de distancia y un círculo
// rojo; encima del marco hay un título fijo que NO se mueve, para comparar. Recorrido del parallax: 120 px.
// Ejecutar: node tools/gen-demo-parallax.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { createNode as n, createPage } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';

const W = 1600, H = 700, MARCO = 420, RECORRIDO = 120;

// Imagen: SVG en data URL (sin internet ni archivos aparte). Degradado sin rojo, cuadrícula cada 50 px (fina) y cada
// 100 px (gruesa, con número de distancia desde arriba y desde la izquierda) y un círculo rojo opaco en el centro.
const foto = (a, b) => {
  let g = '';
  for (let y = 0; y <= H; y += 50) {
    const grueso = y % 100 === 0;
    g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#fff" stroke-opacity="${grueso ? .75 : .3}" stroke-width="${grueso ? 4 : 2}"/>`;
    if (grueso) for (let x = 40; x < W; x += 400) g += `<text x="${x}" y="${y - 8}" font-family="Arial" font-weight="bold" font-size="30" fill="#fff">${y}</text>`;
  }
  for (let x = 0; x <= W; x += 100) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#fff" stroke-opacity="${x % 200 === 0 ? .6 : .25}" stroke-width="${x % 200 === 0 ? 4 : 2}"/>`;
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${g}<circle cx="${W / 2}" cy="${H / 2}" r="60" fill="#ff0000"/></svg>`);
};

const page = createPage();
page.content.title = 'Demo parallax nativo';

page.children.push(n('section', { name: 'Intro', styles: { padding: '120px 24px', background: '#111', color: '#fff', textAlign: 'center' }, children: [
  n('heading', { name: 'Título', content: { text: 'Parallax con CSS nativo', level: 1 }, styles: { margin: '0 0 12px', fontSize: '44px' } }),
  n('text', { name: 'Texto', content: { text: `Baja: dentro de cada marco la imagen (cuadrícula y círculo rojo) se desliza ${RECORRIDO} px a cada lado; el título grande y el marco no se mueven.` }, styles: { margin: '0', opacity: '.7' } }),
] }));

[['#1e3a8a', '#0f172a', 'Primera imagen'], ['#0f766e', '#042f2e', 'Segunda imagen'], ['#6d28d9', '#1e1b4b', 'Tercera imagen']].forEach(([a, b, t]) => {
  const img = n('image', { name: 'Foto ' + t, content: { src: foto(a, b), alt: t }, styles: { gridArea: '1 / 1', alignSelf: 'center', width: '100%', height: H + 'px', objectFit: 'cover' } });
  img.animation = { parallax: { effect: 'y', amount: RECORRIDO } };
  const h = n('heading', { name: 'Título fijo ' + t, content: { text: t, level: 2 }, styles: { gridArea: '1 / 1', zIndex: '1', alignSelf: 'start', justifySelf: 'center', margin: '28px 0 0', color: '#fff', fontSize: '72px', fontWeight: '800', textAlign: 'center', textShadow: '0 4px 24px rgba(0,0,0,.8)' } });
  const marco = n('container', { name: 'Marco ' + t, styles: { display: 'grid', gridTemplateRows: 'minmax(0,1fr)', height: MARCO + 'px', width: '92%', maxWidth: '1000px', margin: '0 auto', overflow: 'clip', borderRadius: '28px', border: '4px solid #fff' }, children: [img, h] });
  page.children.push(n('section', { name: t, styles: { padding: '90px 0', background: '#111' }, children: [marco] }));
});
page.children.push(n('section', { name: 'Fin', styles: { padding: '160px 24px', background: '#111', color: '#fff', textAlign: 'center' }, children: [
  n('text', { name: 'Fin', content: { text: 'Fin de la demo.' }, styles: { margin: '0' } }),
] }));

mkdirSync('docs', { recursive: true });
writeFileSync('docs/demo-parallax.json', JSON.stringify({ app: 'editor-landings', version: 1, page }, null, 2));
writeFileSync('docs/demo-parallax.html', exportHTML(page));
console.log('docs/demo-parallax.json y docs/demo-parallax.html');

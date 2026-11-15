// Genera docs/demo-parallax.json (para "Abrir JSON" en el editor) y docs/demo-parallax.html (el export real, para abrir
// con doble clic): 3 imágenes con parallax de 200 px y un texto encima de cada una. Ejecutar: node tools/gen-demo-parallax.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { createNode as n, createPage } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';

// Imágenes: SVG con degradado en data URL (sin internet ni archivos aparte)
const foto = (a, b, c) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="920" viewBox="0 0 1600 920"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><rect width="1600" height="920" fill="url(#g)"/><g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"><circle cx="400" cy="260" r="150"/><circle cx="1180" cy="620" r="230"/><path d="M0 760 Q400 560 800 700 T1600 600"/></g></svg>`);

const page = createPage();
page.content.title = 'Demo parallax nativo';

const portada = n('section', { name: 'Intro', styles: { padding: '120px 24px', background: '#111', color: '#fff', textAlign: 'center' }, children: [
  n('heading', { name: 'Título', content: { text: 'Parallax con CSS nativo', level: 1 }, styles: { margin: '0 0 12px', fontSize: '44px' } }),
  n('text', { name: 'Texto', content: { text: 'Baja: cada imagen se mueve 200 px a cada lado mientras cruza la pantalla.' }, styles: { margin: '0', opacity: '.7' } }),
] });
page.children.push(portada);

[['#ff7a59', '#7c5cff', '#18181b', 'Primera imagen'], ['#22d3ee', '#3b82f6', '#0f172a', 'Segunda imagen'], ['#fbbf24', '#ef4444', '#4c0519', 'Tercera imagen']].forEach(([a, b, c, t]) => {
  const img = n('image', { name: 'Foto ' + t, content: { src: foto(a, b, c), alt: t }, styles: { gridArea: '1 / 1', alignSelf: 'center', width: '100%', height: '920px', objectFit: 'cover' } });
  img.animation = { parallax: { effect: 'y', amount: 200 } };
  const h = n('heading', { name: 'Texto ' + t, content: { text: t, level: 2 }, styles: { gridArea: '1 / 1', alignSelf: 'center', justifySelf: 'center', margin: '0', color: '#fff', fontSize: '56px', textAlign: 'center' } });
  const marco = n('container', { name: 'Marco ' + t, styles: { display: 'grid', gridTemplateRows: 'minmax(0,1fr)', height: '520px', overflow: 'hidden' }, children: [img, h] });
  page.children.push(n('section', { name: t, styles: { padding: '90px 0', background: '#111' }, children: [marco] }));
});
page.children.push(n('section', { name: 'Fin', styles: { padding: '160px 24px', background: '#111', color: '#fff', textAlign: 'center' }, children: [
  n('text', { name: 'Fin', content: { text: 'Fin de la demo.' }, styles: { margin: '0' } }),
] }));

mkdirSync('docs', { recursive: true });
writeFileSync('docs/demo-parallax.json', JSON.stringify({ app: 'editor-landings', version: 1, page }, null, 2));
writeFileSync('docs/demo-parallax.html', exportHTML(page));
console.log('docs/demo-parallax.json y docs/demo-parallax.html');

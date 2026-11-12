// EXPORTADOR: árbol JSON -> un solo archivo .html (HTML + CSS en <style>).
// Cada nodo recibe una clase (n0, n1...) y sus estilos van al <style>.
// Lo que cambia en móvil sale en un @media (max-width: 768px).
// Etapa 4+: aquí se añadirá el <script type="module"> mínimo de Motion para las
// animaciones que no se puedan hacer en CSS puro.

import { tagFor, TIPOS_TEXTO } from '../render/renderer.js';

export const BREAKPOINT_MOVIL = 768;

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');
const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const declaraciones = (obj) => Object.entries(obj).map(([k, v]) => `${kebab(k)}:${v}`).join(';');

/** Devuelve el documento HTML completo como string. */
export function exportHTML(page) {
  const css = [];
  const cssMovil = [];
  let contador = 0;

  function nodoAHtml(node, nivel) {
    const clase = `n${contador++}`;
    if (Object.keys(node.styles.base).length) css.push(`.${clase}{${declaraciones(node.styles.base)}}`);
    if (Object.keys(node.styles.mobile).length) cssMovil.push(`.${clase}{${declaraciones(node.styles.mobile)}}`);

    const tag = tagFor(node);
    const sangria = '  '.repeat(nivel);
    const c = node.content;

    if (node.type === 'image') {
      return `${sangria}<img class="${clase}" src="${escAttr(c.src)}" alt="${escAttr(c.alt)}">`;
    }
    const attrs = node.type === 'button' ? ` href="${escAttr(c.href ?? '#')}"` : '';
    const abre = `<${tag} class="${clase}"${attrs}>`;
    if (TIPOS_TEXTO.includes(node.type)) {
      return `${sangria}${abre}${escHtml(c.text).replace(/\n/g, '<br>')}</${tag}>`;
    }
    const hijos = node.children.map((h) => nodoAHtml(h, nivel + 1)).join('\n');
    return `${sangria}${abre}\n${hijos}\n${sangria}</${tag}>`;
  }

  const cuerpo = nodoAHtml(page, 2);

  const reset = '*{box-sizing:border-box}body{margin:0}img{max-width:100%;display:block}';
  const media = cssMovil.length ? `@media (max-width:${BREAKPOINT_MOVIL}px){\n${cssMovil.join('\n')}\n}` : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(page.content.title || 'Landing')}</title>
<style>
${reset}
${css.join('\n')}
${media}
</style>
</head>
<body>
${cuerpo}
</body>
</html>
`;
}

/** Descarga un texto como archivo desde el navegador. */
export function descargar(nombre, texto, tipo = 'text/html') {
  const url = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

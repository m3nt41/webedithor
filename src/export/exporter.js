// EXPORTADOR: árbol JSON -> un solo archivo .html (HTML + CSS en <style>).
// Cada nodo recibe una clase (n0, n1...) y sus estilos van al <style>.
// Lo que cambia en móvil sale en un @media (max-width: 768px).
// Animaciones (Etapa 4): todo en CSS puro; solo si hay animaciones de scroll/texto
// se añade un <script> de ~3 líneas que pone la clase .in al entrar en pantalla.
// (Motion se reserva para lo que el CSS no pueda: scroll-linked, drag... Etapa 5.)

import { tagFor, TIPOS_TEXTO } from '../render/renderer.js';
import { cssNodo, usaScroll, paginaUsaScroll, splitText, KEYFRAMES, SCRIPT_SCROLL } from '../animations/index.js';

export const BREAKPOINT_MOVIL = 768;

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');
const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const declaraciones = (obj) => Object.entries(obj).map(([k, v]) => `${kebab(k)}:${v}`).join(';');

/** Texto con animación -> HTML con <span class="w" style="--i:N"> por palabra/letra. */
function textoPartidoHtml(texto, modo) {
  return splitText(texto, modo).map((p) => {
    if (p.t === 'br') return '<br>';
    if (p.t === 'sp') return ' ';
    const spans = p.units.map((u) => `<span class="w" style="--i:${u.i}">${escHtml(u.s)}</span>`).join('');
    return p.chars ? `<span class="ww">${spans}</span>` : spans;
  }).join('');
}

/** Devuelve el documento HTML completo como string. */
export function exportHTML(page) {
  const css = [];
  const cssMovil = [];
  const cssAnim = [];
  let contador = 0;

  function nodoAHtml(node, nivel) {
    const clase = `n${contador++}`;
    if (Object.keys(node.styles.base).length) css.push(`.${clase}{${declaraciones(node.styles.base)}}`);
    if (Object.keys(node.styles.mobile).length) cssMovil.push(`.${clase}{${declaraciones(node.styles.mobile)}}`);

    const anim = cssNodo(node, `.${clase}`);
    if (anim) cssAnim.push(anim);
    const rv = usaScroll(node) ? ' data-rv' : ''; // el script de scroll le pone .in

    const tag = tagFor(node);
    const sangria = '  '.repeat(nivel);
    const c = node.content;

    if (node.type === 'image') {
      return `${sangria}<img class="${clase}"${rv} src="${escAttr(c.src)}" alt="${escAttr(c.alt)}">`;
    }
    const attrs = (node.type === 'button' ? ` href="${escAttr(c.href ?? '#')}"` : '') + rv;
    const abre = `<${tag} class="${clase}"${attrs}>`;
    if (TIPOS_TEXTO.includes(node.type)) {
      const modo = node.animation?.text?.mode;
      const interior = modo ? textoPartidoHtml(c.text, modo) : escHtml(c.text).replace(/\n/g, '<br>');
      return `${sangria}${abre}${interior}</${tag}>`;
    }
    const hijos = node.children.map((h) => nodoAHtml(h, nivel + 1)).join('\n');
    return `${sangria}${abre}\n${hijos}\n${sangria}</${tag}>`;
  }

  const cuerpo = nodoAHtml(page, 2);

  const reset = '*{box-sizing:border-box}body{margin:0}img{max-width:100%;display:block}';
  const media = cssMovil.length ? `@media (max-width:${BREAKPOINT_MOVIL}px){\n${cssMovil.join('\n')}\n}` : '';

  // Animaciones: keyframes + reglas por nodo. Si hay de scroll/texto, el script mínimo
  // (IntersectionObserver) y dos salvaguardas: sin JS y con "reducir movimiento" se ve todo quieto.
  const usaRv = paginaUsaScroll(page);
  const animaciones = [
    usaRv ? KEYFRAMES : '',
    ...cssAnim,
    usaRv ? '@media (prefers-reduced-motion:reduce){[data-rv],[data-rv] .w{animation:none!important}}' : '',
  ].filter(Boolean).join('\n');
  const noscript = usaRv ? '<noscript><style>[data-rv],[data-rv] .w{animation:none!important}</style></noscript>\n' : '';
  const script = usaRv ? `<script>\n${SCRIPT_SCROLL}\n</script>\n` : '';

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
${animaciones}
</style>
${noscript}</head>
<body>
${cuerpo}
${script}</body>
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

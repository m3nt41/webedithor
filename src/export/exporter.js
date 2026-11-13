// EXPORTADOR: árbol JSON -> un solo archivo .html (HTML + CSS en <style>).
// Cada nodo recibe una clase (n0, n1...) y sus estilos van al <style>.
// Lo que cambia en móvil sale en un @media (max-width: 768px).
// Animaciones (Etapa 4): todo en CSS puro; solo si hay animaciones de scroll/texto
// se añade un <script> de ~3 líneas que pone la clase .in al entrar en pantalla.
// (Motion se reserva para lo que el CSS no pueda: scroll-linked, drag... Etapa 5.)

import { anchorValido, walk } from '../core/tree.js';
import { tagFor, TIPOS_TEXTO } from '../render/renderer.js';
import { usaEscena, varsEscena, esNavPegado, paginaUsaEscena, CSS_ESCENA, usaScrollLink, paginaUsaScrollLink, SCRIPT_SCROLLMOTOR, SCRIPT_SCROLLSUAVE, paginaUsaScrollSuave, cssNodo, usaScroll, usaCarga, usaClic, paginaUsaScroll, paginaUsaEntrada, paginaUsaMedida, paginaUsaClic, esMedida, splitText, KEYFRAMES, SCRIPT_SCROLL, SCRIPT_LINEAS, SCRIPT_CLIC } from '../animations/index.js';

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
    if (p.t === 'ln') return p.i < 0 ? '<span class="ln">&#8203;</span>' : `<span class="w ln" style="--i:${p.i}">${escHtml(p.s)}</span>`;
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

  function nodoAHtml(node, nivel, padre = null) {
    const clase = `n${contador++}`;
    if (Object.keys(node.styles.base).length) css.push(`.${clase}{${declaraciones(node.styles.base)}}`);
    if (Object.keys(node.styles.mobile).length) cssMovil.push(`.${clase}{${declaraciones(node.styles.mobile)}}`);

    const anim = cssNodo(node, `.${clase}`, { padre });
    if (anim) cssAnim.push(anim);
    // data-rv: el script de scroll le pone .in · data-ld: corre sola al cargar (solo para reduced-motion)
    const idAttr = anchorValido(node.content?.anchor) ? ` id="${node.content.anchor}"` : '';
    const esc = usaEscena(node);
    const rv = (esc ? ' data-es' : '') + (usaEscena0 && esNavPegado(node) ? ' data-nav' : '') + (usaScroll(node) ? ' data-rv' : '') + (usaCarga(node) ? ' data-ld' : '') + (esMedida(node.animation?.text?.mode) ? ' data-lm' : '') + (usaClic(node) ? ' data-vc' : '') + (usaScrollLink(node) ? ' data-sc' : '');

    const tag = tagFor(node);
    const sangria = '  '.repeat(nivel);
    const c = node.content;

    if (node.type === 'image') {
      return `${sangria}<img class="${clase}"${idAttr}${rv} src="${escAttr(c.src)}" alt="${escAttr(c.alt)}">`;
    }
    const attrs = (node.type === 'button' ? ` href="${escAttr(c.href ?? '#')}"` : '') + idAttr + rv;
    const abre = `<${tag} class="${clase}"${attrs}>`;
    if (TIPOS_TEXTO.includes(node.type)) {
      const modo = node.animation?.text?.mode;
      const interior = modo ? textoPartidoHtml(c.text, modo) : escHtml(c.text).replace(/\n/g, '<br>');
      return `${sangria}${abre}${interior}</${tag}>`;
    }
    const hijos = node.children.map((h) => nodoAHtml(h, nivel + 1, node)).join('\n');
    const html = `${sangria}${abre}\n${hijos}\n${sangria}</${tag}>`;
    if (!esc) return html;
    // escena: contenedor alto (da el recorrido de scroll) + la sección como capa pegada
    const v = varsEscena(node);
    return `${sangria}<div data-ew${v.auto ? ' data-auto' : ''} style="${v.style}">\n${html}\n${sangria}</div>`;
  }

  const usaEscena0 = paginaUsaEscena(page);
  const cuerpo = nodoAHtml(page, 2);

  // Si hay una SECCIÓN pegada arriba (navbar, position:sticky + top), las anclas dejan un margen para no quedar tapadas
  // El margen solo vale en la vista donde de verdad hay un navbar pegado: si en móvil es "Normal" (static), no se pone ahí.
  let fijoEscr = false, fijoMovil = false;
  const MARGEN = '[id]{scroll-margin-top:90px}';
  walk(page, (n) => {
    if (n.type !== 'section') return;
    const m = { ...n.styles.base, ...n.styles.mobile };
    if (n.styles.base.position === 'sticky' && n.styles.base.top) fijoEscr = true;
    if (m.position === 'sticky' && m.top) fijoMovil = true;
  });
  const margenGlobal = fijoEscr && fijoMovil;
  const reset = '*{box-sizing:border-box}body{margin:0}img{max-width:100%;display:block}' + (margenGlobal ? MARGEN : '');
  const reglasMedia = [...cssMovil];
  if (fijoMovil && !fijoEscr) reglasMedia.push(MARGEN); // solo móvil
  const media = reglasMedia.length ? `@media (max-width:${BREAKPOINT_MOVIL}px){\n${reglasMedia.join('\n')}\n}` : '';
  const margenEscr = fijoEscr && !fijoMovil ? `@media (min-width:${BREAKPOINT_MOVIL + 1}px){${MARGEN}}\n` : ''; // solo escritorio

  // Animaciones: keyframes + reglas por nodo. Si hay de scroll/texto, el script mínimo
  // (IntersectionObserver) y dos salvaguardas: sin JS y con "reducir movimiento" se ve todo quieto.
  const usaRv = paginaUsaScroll(page);
  const usaEntrada = paginaUsaEntrada(page); // scroll o carga: hacen falta los keyframes
  const animaciones = [
    usaEntrada ? KEYFRAMES : '',
    usaEscena0 ? CSS_ESCENA : '',
    ...cssAnim,
    // "Reducir movimiento": sin animaciones de entrada y sin transiciones (hover/press/focus/estados cambian de golpe)
    usaEntrada ? '@media (prefers-reduced-motion:reduce){[data-rv],[data-ld],[data-rv] .w,[data-ld] .w,[data-rv]>*,[data-ld]>*{animation:none!important}}' : '',
    cssAnim.length ? '@media (prefers-reduced-motion:reduce){*{transition:none!important}}' : '',
  ].filter(Boolean).join('\n');
  const noscript = usaRv ? '<noscript><style>[data-rv],[data-rv] .w,[data-rv]>*{animation:none!important}</style></noscript>\n' : '';
  // El script de medición solo viaja si algún texto usa "Por línea (medida)"
  // (y el de clic solo si algún estado "al hacer clic" lo necesita)
  const scripts = [paginaUsaMedida(page) ? SCRIPT_LINEAS : '', usaRv ? SCRIPT_SCROLL : '', paginaUsaClic(page) ? SCRIPT_CLIC : '', paginaUsaScrollLink(page) ? SCRIPT_SCROLLMOTOR : '', paginaUsaScrollSuave(page) ? SCRIPT_SCROLLSUAVE : ''].filter(Boolean).join('\n');
  const script = scripts ? `<script>\n${scripts}\n</script>\n` : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(page.content.title || 'Landing')}</title>
<style>
${reset}
${margenEscr}${css.join('\n')}
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

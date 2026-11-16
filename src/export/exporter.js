// EXPORTADOR: árbol JSON -> un solo archivo .html (HTML + CSS en <style>).
// Cada nodo recibe una clase (n0, n1...) y sus estilos van al <style>.
// Lo que cambia en móvil sale en un @media (max-width: 768px).
// Animaciones (Etapa 4): todo en CSS puro; solo si hay animaciones de scroll/texto
// se añade un <script> de ~3 líneas que pone la clase .in al entrar en pantalla.
// (Motion se reserva para lo que el CSS no pueda: scroll-linked, drag... Etapa 5.)

import { anchorValido, walk, aspectoValido, CLAVES_PROPIAS, fondoDeclaraciones, tocaFondo } from '../core/tree.js';
import { tagFor, TIPOS_TEXTO } from '../render/renderer.js';
import { iconoSvg, estilosIcono } from '../core/icono.js';
import { propiedadPermitida, valorCss, valorSombraOk, hrefSeguro, srcSeguro } from '../core/seguridad.js';
import { usaMenuMovil, paginaUsaMenuMovil, cssMenuMovil, varsMenu, necesitaAncla, SCRIPT_MENU } from '../core/menumovil.js';
import { usaMarquesina, cssMarquesina, htmlMarquesina, keyframesMarquesina } from '../core/marquesina.js';
import { declaracionesSombra } from '../animations/base.js';
import { tieneParallaxNativoDentro } from '../animations/parallax.js';
import { usaEscena, varsEscena, esNavPegado, paginaUsaEscena, CSS_ESCENA, atributosScroll, paginaUsaScrollLink, SCRIPT_SCROLLMOTOR, SCRIPT_SCROLLSUAVE, paginaUsaScrollSuave, cssNodo, usaScroll, usaCarga, usaClic, paginaUsaScroll, paginaUsaEntrada, paginaUsaMedida, paginaUsaClic, esMedida, splitText, saltosCascada, usaContenedor, KEYFRAMES, SCRIPT_SCROLL, SCRIPT_LINEAS, SCRIPT_CLIC } from '../animations/index.js';

export const BREAKPOINT_MOVIL = 768;

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
// Estilos del USUARIO: defensa en la salida (aunque la entrada ya esté saneada): solo propiedades permitidas y valores seguros.
const declaraciones = (obj) => Object.entries(obj).filter(([k, v]) => !CLAVES_PROPIAS.includes(k) && propiedadPermitida(k) && valorCss(v) !== null && valorSombraOk(k, v)).map(([k, v]) => `${kebab(k)}:${v}`).join(';');
// Declaraciones GENERADAS por el editor (fondo con url("…") escapada con urlCss: lleva barras invertidas legítimas): sin filtro de valor.
const declaracionesGeneradas = (obj) => Object.entries(obj).map(([k, v]) => `${kebab(k)}:${v}`).join(';');

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
  const cssMenuReducido = []; // reglas del menú hamburguesa para prefers-reduced-motion
  const cssMqReducido = []; // reglas de la marquesina para prefers-reduced-motion
  const kfMarquesina = new Set(); // @keyframes de marquesina usados (uno por número de copias)
  let contador = 0;

  function nodoAHtml(node, nivel, padre = null) {
    const clase = `n${contador++}`;
    // Imagen de fondo: va al final de la regla (gana a un `background` de color, que queda de respaldo debajo).
    // En móvil se re-emite entera (con los valores efectivos) si el override toca el fondo.
    const fondo = (d) => Object.keys(d).length ? declaracionesGeneradas(d) : '';
    const unir = (...p) => p.filter(Boolean).join(';');
    const dBase = unir(declaraciones(node.type === 'icon' ? estilosIcono(node.styles.base) : node.styles.base), fondo(fondoDeclaraciones(node.styles.base)), fondo(declaracionesSombra(node, node.styles.base)));
    const dMovil = unir(declaraciones(node.styles.mobile), tocaFondo(node.styles.mobile) ? fondo(fondoDeclaraciones({ ...node.styles.base, ...node.styles.mobile })) : '', 'sombra' in node.styles.mobile ? fondo(declaracionesSombra(node, node.styles.mobile)) : '');
    if (dBase) css.push(`.${clase}{${dBase}}`);
    if (dMovil) cssMovil.push(`.${clase}{${dMovil}}`);
    // Parallax nativo dentro: un ancestro con overflow:hidden es un scroller y view() deja de moverse. Con overflow:clip recorta
    // igual (sin ser scroller). hidden queda como respaldo: la regla clip solo existe si el navegador la soporta.
    // (overflow-clip-margin no hace falta: su valor por defecto ya recorta en el borde del padding, como hidden.)
    if (tieneParallaxNativoDentro(node)) {
      const clip = `@supports (overflow:clip){.${clase}{overflow:clip}}`;
      if (String(node.styles.base.overflow ?? '').trim() === 'hidden') css.push(clip);
      if (String(node.styles.mobile.overflow ?? '').trim() === 'hidden') cssMovil.push(clip);
    }
    // "Proporción de los hijos" (contenedor grid): CSS puro para las imágenes hijas directas. :where() deja la
    // especificidad en 0, así que la foto que tenga su propia proporción o ajuste (clase .nN) siempre gana.
    const asp = (st) => (node.type !== 'image' && aspectoValido(st.hijosAspectRatio) ? `:where(.${clase}>img){aspect-ratio:${st.hijosAspectRatio.trim()};object-fit:cover}` : '');
    if (asp(node.styles.base) && node.styles.base.display === 'grid') css.push(asp(node.styles.base));
    if (asp(node.styles.mobile) && { ...node.styles.base, ...node.styles.mobile }.display === 'grid') cssMovil.push(asp(node.styles.mobile));

    const anim = cssNodo(node, `.${clase}`, { padre });
    if (anim) cssAnim.push(anim);
    // data-rv: el script de scroll le pone .in · data-ld: corre sola al cargar (solo para reduced-motion)
    const idAttr = anchorValido(node.content?.anchor) ? ` id="${node.content.anchor}"` : '';
    const esc = usaEscena(node);
    const rv = (esc ? ' data-es' : '') + (usaEscena0 && esNavPegado(node) ? ' data-nav' : '') + (usaScroll(node) ? ' data-rv' : '') + (usaCarga(node) ? ' data-ld' : '') + (esMedida(node.animation?.text?.mode) ? ' data-lm' : '') + (usaClic(node) ? ' data-vc' : '') + atributosScroll(node, padre);

    const tag = tagFor(node);
    const sangria = '  '.repeat(nivel);
    const c = node.content;

    if (node.type === 'image') {
      return `${sangria}<img class="${clase}"${idAttr}${rv} src="${escAttr(srcSeguro(c.src))}" alt="${escAttr(c.alt)}">`;
    }
    if (node.type === 'icon') { // mismo SVG inline que el editor (iconoSvg), sin JS
      return `${sangria}<span class="${clase}"${idAttr}${rv}>${iconoSvg(c.name)}</span>`;
    }
    const attrs = (node.type === 'button' ? ` href="${escAttr(hrefSeguro(c.href ?? '#'))}"` : '') + idAttr + rv;
    const abre = `<${tag} class="${clase}"${attrs}>`;
    if (TIPOS_TEXTO.includes(node.type)) {
      const modo = node.animation?.text?.mode;
      // Subir/Bajar por letras o palabras: UN contenedor .tw hace la subida y las piezas solo se funden (animations/text.js, usaContenedor)
      const partido = modo ? textoPartidoHtml(c.text, modo) : '';
      const interior = modo ? (usaContenedor(node.animation.text) ? `<span class="tw">${partido}</span>` : partido) : escHtml(c.text).replace(/\n/g, '<br>');
      // --g = nº de saltos de la cascada: el CSS de texto lo usa para topar la cascada total (animations/text.js)
      const abreTexto = modo && modo !== 'linesm' ? abre.replace(/>$/, ` style="--g:${saltosCascada(c.text, modo)}">`) : abre;
      return `${sangria}${abreTexto}${interior}</${tag}>`;
    }
    const partes = node.children.map((h) => nodoAHtml(h, nivel + 1, node));
    if (usaMenuMovil(node)) {
      // Menú hamburguesa: checkbox + label como hermanos justo después del logo (primer hijo) y un <div class="mm-pn">
      // GENERADO (no es un nodo) que envuelve el resto de hijos. Escritorio: display:contents; móvil: panel superpuesto.
      const idChk = `${clase}-mm`;
      const est = { ...node.styles.base, ...node.styles.mobile };
      const vars = Object.entries(varsMenu(est)).map(([k, v]) => `${k}:${v}`).join(';');
      const m = cssMenuMovil(`.${clase}`, vars, { ancla: necesitaAncla(est) });
      css.push(...m.base);
      cssMovil.push(...m.movil);
      cssMenuReducido.push(...m.reducido);
      const s2 = '  '.repeat(nivel + 1);
      const resto = partes.splice(1);
      partes.push(
        `${s2}<input type="checkbox" class="mm-chk" id="${idChk}" aria-label="Abrir menú" aria-expanded="false">`,
        `${s2}<label class="mm-btn" for="${idChk}" aria-hidden="true"></label>`,
        `${s2}<div class="mm-pn">`,
        ...resto,
        `${s2}</div>`);
    }
    const mq = usaMarquesina(node);
    if (mq) { // Marquesina: pista y grupos GENERADOS (no son nodos); ver core/marquesina.js
      const m = cssMarquesina(`.${clase}`, mq);
      css.push(...m.base);
      cssMqReducido.push(...m.reducido);
      if (mq.mov) kfMarquesina.add(mq.copias);
    }
    const hijos = mq ? htmlMarquesina(partes, nivel, mq) : partes.join('\n');
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
    usaEntrada ? '@media (prefers-reduced-motion:reduce){[data-rv],[data-ld],[data-rv] .w,[data-ld] .w,[data-rv] .tw,[data-ld] .tw,[data-rv]>*,[data-ld]>*{animation:none!important}}' : '',
    cssAnim.length ? '@media (prefers-reduced-motion:reduce){*{transition:none!important}}' : '',
    cssMenuReducido.length ? `@media (prefers-reduced-motion:reduce){${cssMenuReducido.join('')}}` : '',
    ...[...kfMarquesina].sort().map(keyframesMarquesina),
    cssMqReducido.length ? `@media (prefers-reduced-motion:reduce){${cssMqReducido.join('')}}` : '',
  ].filter(Boolean).join('\n');
  const noscript = usaRv ? '<noscript><style>[data-rv],[data-rv] .w,[data-rv] .tw,[data-rv]>*{animation:none!important}</style></noscript>\n' : '';
  // El script de medición solo viaja si algún texto usa "Por línea (medida)"
  // (y el de clic solo si algún estado "al hacer clic" lo necesita)
  const scripts = [paginaUsaMedida(page) ? SCRIPT_LINEAS : '', usaRv ? SCRIPT_SCROLL : '', paginaUsaClic(page) ? SCRIPT_CLIC : '', paginaUsaScrollLink(page) ? SCRIPT_SCROLLMOTOR : '', paginaUsaScrollSuave(page) ? SCRIPT_SCROLLSUAVE : '', paginaUsaMenuMovil(page) ? SCRIPT_MENU : ''].filter(Boolean).join('\n');
  const script = scripts ? `<script>\n${scripts}\n</script>\n` : '';

  // Último filtro del CSS: un "<" jamás puede estar en el CSS de la página (no hay ninguno legítimo fuera de comillas; urlCss ya lo
  // escribe como \3c). Escapado así no puede cerrar el <style>, venga de donde venga.
  const aCss = (t) => t.replace(/</g, '\\3c ');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(page.content.title || 'Landing')}</title>
<style>
${aCss(`${reset}
${margenEscr}${css.join('\n')}
${media}
${animaciones}`)}
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

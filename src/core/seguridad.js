// SEGURIDAD: lo que se acepta de un .json ajeno (o de localStorage) y de cualquier valor que acabe en el HTML exportado.
// Lógica pura (sin DOM), la usan tree.js (entrada), exporter.js y renderer.js (salida).
//
// Fuentes: OWASP XSS Prevention Cheat Sheet (no meter datos no confiables en el CSS ni en <style>; lista permitida por
// propiedad; validar URLs con lista permitida de esquemas; atributos siempre entre comillas y escapados) y MDN
// (atributo sandbox del iframe, ver ui/vistaprevia.js).
//
import { sombraValida } from './sombra.js';

// Regla de oro: lo que no pasa se DESCARTA (ese valor, no la página) y se CUENTA (quitar() → "se quitaron N valores").

// ---- Contador de valores descartados (normalizePage lo lee antes y después de normalizar) ----
let quitados = 0;
export const quitar = (n = 1) => { quitados += n; };
export const leerQuitados = () => quitados;

/** Mensaje corto para el usuario ('' si no se quitó nada). */
export const avisoQuitados = (n) => (n > 0
  ? `Se quitaron ${n} valor${n === 1 ? '' : 'es'} peligroso${n === 1 ? '' : 's'} del archivo (código o enlaces que no son seguros). El resto de la página se conservó.`
  : '');

// ---- 1) Propiedades CSS (camelCase) permitidas en styles.base / styles.mobile ----
// Las que usan los bloques, el inspector y los tiradores, más hermanas obvias (lados de borde, gaps...).
// NO están: transform, transition, animation, filter (el drop-shadow de la sombra en reposo NO se guarda: lo genera sombra.js desde la clave propia `sombra`), cursor, content, pointerEvents… (las animaciones tienen su propio módulo).
export const PROPIEDADES_CSS = new Set([
  // caja y layout
  'display', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'zIndex', 'overflow', 'overflowX', 'overflowY', 'boxSizing',
  'flex', 'flexDirection', 'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis', 'order',
  'alignItems', 'alignContent', 'alignSelf', 'justifyContent', 'justifyItems', 'justifySelf', 'placeItems', 'placeContent',
  'gap', 'rowGap', 'columnGap', 'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'gridArea', 'gridAutoFlow', 'gridAutoColumns', 'gridAutoRows',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'aspectRatio', 'objectFit', 'objectPosition',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  // tipografía y color
  'color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration', 'textTransform',
  'textShadow', 'whiteSpace', 'wordBreak', 'textOverflow', 'WebkitTextFillColor', 'WebkitTextStroke',
  // fondo, borde, sombra
  'background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
  'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'borderColor', 'borderWidth', 'borderStyle',
  'boxShadow', 'opacity',
  // claves propias del editor (no son CSS directo; las valida tree.js y el exportador las convierte en reglas)
  'hijosAspectRatio', 'fondoImagen', 'fondoAjuste', 'fondoPosicion', 'fondoCapa', 'sombra',
]);
export const propiedadPermitida = (k) => typeof k === 'string' && PROPIEDADES_CSS.has(k);

// ---- 2) Valores CSS ----
// Se rechaza todo lo que pueda salirse del valor: < > { } (cierran <style> o abren reglas), barra invertida (escapes que
// esconden cosas), comentarios, @ (@import), ";" suelto (fuera de comillas y de paréntesis), comillas o paréntesis sin cerrar,
// caracteres de control, expression( / javascript: / vbscript: / -moz-binding / image-set(, y url(...) que no sea https: o data:image/.
const PELIGROSO = /[<>{}\\@\u0000-\u001f\u007f]|\/\*|\*\/|expression\s*\(|javascript:|vbscript:|-moz-binding|behavior\s*:|image-set\s*\(/i;
const URL_CSS = /^url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]*))\s*\)/i;

/** Propiedades cuyo valor es una sombra: además de valorCss pasan por el formato estricto de sombra.js
 *  (números con unidad + colores válidos, máx. 4 capas; sin url(), var(), comentarios ni nada raro). */
const ES_SOMBRA = { boxShadow: { texto: false }, textShadow: { texto: true }, sombra: { texto: false } };
export const valorSombraOk = (k, v) => !(k in ES_SOMBRA) || (typeof v === 'string' && sombraValida(v, ES_SOMBRA[k]));

/** Interruptor "Texto fijo" del hover (Agrandar/Encoger/Inclinar): solo 'si' o 'no'. Cualquier otro valor (texto raro, número,
 *  objeto) se descarta y el hover se queda con su comportamiento de siempre (la lista de opciones de normalizar.js ya lo filtra
 *  al importar; esto es la defensa en la salida, la usa hover.js). */
export const textoFijoValido = (v) => v === 'si' || v === 'no';

/** Devuelve el valor tal cual (string o número) si es seguro; null si hay que descartarlo. */
export function valorCss(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  if (v === '') return v;
  if (PELIGROSO.test(v)) return null;
  let comilla = '', prof = 0;
  for (const ch of v) {
    if (comilla) { if (ch === comilla) comilla = ''; continue; }
    if (ch === '"' || ch === "'") comilla = ch;
    else if (ch === '(') prof++;
    else if (ch === ')') { if (--prof < 0) return null; }
    else if (ch === ';' && prof === 0) return null;
  }
  if (comilla || prof !== 0) return null;
  for (let i = v.search(/url\s*\(/i); i !== -1;) { // cada url(...) debe ser https: o data:image/
    const m = URL_CSS.exec(v.slice(i));
    if (!m) return null;
    const dir = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (!/^(https:\/\/|data:image\/)/i.test(dir)) return null;
    const sig = v.slice(i + m[0].length).search(/url\s*\(/i);
    i = sig === -1 ? -1 : i + m[0].length + sig;
  }
  return v;
}

// ---- 3) Enlaces y fuentes (href / src) ----
/** ¿Es una URL aceptable? http, https, mailto, tel, #ancla y rutas relativas; con {imagen:true} también data:image/.
 *  Bloquea javascript:, vbscript: y data: (en href). Los navegadores ignoran espacios, tabs y saltos de línea dentro
 *  del esquema ("java\tscript:"), así que se comprueba sin ellos. */
export function urlPermitida(v, { imagen = false } = {}) {
  if (typeof v !== 'string') return false;
  const c = v.replace(/[\u0000-\u0020\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, '');
  if (c === '') return true;
  const m = /^([a-z][a-z0-9+.\-]*):/i.exec(c);
  if (!m) return true; // relativa: "#ancla", "/ruta", "foto.png", "//host"…
  if (['http', 'https', 'mailto', 'tel'].includes(m[1].toLowerCase())) return true;
  return imagen && /^data:image\//i.test(c);
}

/** href seguro para escribir en el HTML ("#" si no pasa). */
export const hrefSeguro = (v) => (urlPermitida(v) ? String(v ?? '') : '#');
/** src de imagen seguro para escribir en el HTML ("" si no pasa). */
export const srcSeguro = (v) => (urlPermitida(v, { imagen: true }) ? String(v ?? '') : '');

// ---- 4) Estilos de un nodo ----
/** Copia de un objeto de estilos solo con propiedades permitidas y valores seguros. Cuenta lo descartado. */
export function sanearEstilos(st) {
  const out = {};
  for (const [k, v] of Object.entries(st)) {
    if (!propiedadPermitida(k)) { quitar(); continue; }
    if (k === 'fondoImagen') { if (urlPermitida(v, { imagen: true }) && typeof v === 'string') out[k] = v; else quitar(); continue; }
    const s = valorCss(v);
    if (s === null || !valorSombraOk(k, v)) { quitar(); continue; }
    out[k] = v;
  }
  return out;
}

/** Id seguro: letras, números, guion y guion bajo (entra en selectores CSS del editor y en atributos). */
export const idSeguro = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);

/** Nivel de título válido: entero 1–6. */
export const nivelValido = (n) => Number.isInteger(n) && n >= 1 && n <= 6;

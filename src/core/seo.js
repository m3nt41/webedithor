// SEO Y COMPARTIR de la página: idioma (<html lang>), meta description y Open Graph.
// Lógica pura (sin DOM). La usan tree.js (validar lo que entra de un .json) y exporter.js (escribirlo en el <head>).
//
// Campos (todos en page.content, todos opcionales):
//   lang         código de idioma BCP 47 simple: "es", "en", "pt-BR"... (sin él: "es", como siempre)
//   description  texto de la meta description (se recomienda 50–160 caracteres; aquí se acepta hasta 500)
//   ogImage      imagen para compartir en redes: URL ABSOLUTA http(s) (los rastreadores de redes no resuelven rutas relativas)
//
// Regla de oro del editor: sin estos campos el HTML exportado es idéntico, byte a byte, al de antes.

export const LANG_DEFECTO = 'es';
export const DESCRIPCION_MAX = 500;
export const OG_IMAGEN_MAX = 2000;

/** Código de idioma válido: 2 o 3 letras y hasta 3 subetiquetas de 2 a 8 caracteres (es, en-US, zh-Hant-TW). */
export const langValido = (v) => typeof v === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/.test(v);

/** Idioma que va al <html lang>: el de la página si es válido; si no, el de siempre. */
export const langDePagina = (c) => (langValido(c?.lang) ? c.lang : LANG_DEFECTO);

/** Texto limpio para la description (una sola línea, sin caracteres de control, recortado) o '' si no hay. */
export function limpiarDescripcion(v) {
  if (typeof v !== 'string') return '';
  const CONTROL = /[\u0000-\u001f\u007f-\u009f]+/g; // controles y saltos de línea
  const SEPARADORES = new RegExp('[' + String.fromCharCode(0x2028, 0x2029) + ']+', 'g'); // separadores de línea de Unicode
  return v.replace(CONTROL, ' ').replace(SEPARADORES, ' ').replace(/\s+/g, ' ').trim().slice(0, DESCRIPCION_MAX);
}

/** ¿Es una imagen para compartir aceptable? Solo http(s) absolutas, sin espacios ni caracteres de control. */
export const ogImagenValida = (v) => typeof v === 'string' && v.length <= OG_IMAGEN_MAX && /^https?:\/\/[^\s\u0000-\u001f\u007f-\u009f"'<>]+$/i.test(v.trim());

/** Etiquetas <meta> del <head> (cada una termina en salto de línea; '' si la página no usa nada de esto).
 *  `esc` es el escapador de atributos del exportador. Orden: description, Open Graph, tarjeta de Twitter/X. */
export function metaSeoHtml(c, titulo, esc) {
  const desc = limpiarDescripcion(c?.description);
  const img = ogImagenValida(c?.ogImage) ? c.ogImage.trim() : '';
  if (!desc && !img) return '';
  const l = [];
  if (desc) l.push(`<meta name="description" content="${esc(desc)}">`);
  l.push('<meta property="og:type" content="website">');
  l.push(`<meta property="og:title" content="${esc(titulo)}">`);
  if (desc) l.push(`<meta property="og:description" content="${esc(desc)}">`);
  if (img) l.push(`<meta property="og:image" content="${esc(img)}">`, '<meta name="twitter:card" content="summary_large_image">');
  return l.join('\n') + '\n';
}

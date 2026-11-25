// Comprobaciones de `audit`. Trabajan sobre el ÁRBOL de la página (la fuente de verdad, no hace falta un parser de HTML)
// y sobre el HTML exportado para lo que solo existe ahí (título, tamaño total).
// Cada comprobación devuelve hallazgos { level: 'error'|'warn'|'info', area, rule, message }.
import { Buffer } from 'node:buffer';

const KB = 1024;
export const LIMITES = {
  imagenAvisoBytes: 150 * KB, // una imagen incrustada (data URL) mayor que esto: aviso
  imagenErrorBytes: 500 * KB, // y mayor que esto: error
  htmlAvisoBytes: 1024 * KB,
  htmlErrorBytes: 3 * 1024 * KB,
  tituloMin: 10,
  tituloMax: 60,
  descripcionMin: 50,
  descripcionMax: 160,
};

const kbTxt = (b) => `${Math.round(b / KB)} KB`;
const nombre = (n) => `"${n.name ?? n.type}"`;

/** Recorre el árbol dando a cada nodo la lista de sus ancestros (el más cercano al final). */
export function recorrer(raiz, fn, ancestros = []) {
  fn(raiz, ancestros);
  for (const h of raiz.children ?? []) recorrer(h, fn, [...ancestros, raiz]);
}

// ---------- color y contraste (aproximado: solo colores hex / rgb(), y herencia simple) ----------
export function parseColor(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return [0, 1, 2].map((i) => parseInt(m[1][i] + m[1][i], 16));
  m = /^#([0-9a-f]{6})$/.exec(s);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = /^rgb\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*\)$/.exec(s);
  if (m) return m.slice(1).map(Number);
  return null;
}
const luminancia = ([r, g, b]) => {
  const f = (c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Color de texto efectivo: el propio o el del ancestro más cercano que lo defina. */
function colorTexto(n, ancestros) {
  for (const x of [n, ...[...ancestros].reverse()]) if (x.styles?.base?.color) return parseColor(x.styles.base.color);
  return null;
}
/** Fondo efectivo: el del nodo o ancestro más cercano que tenga. null = desconocido (degradado, imagen...): no se juzga. */
function colorFondo(n, ancestros) {
  for (const x of [n, ...[...ancestros].reverse()]) {
    const b = x.styles?.base ?? {};
    if (Object.keys(b).some((k) => /^fondo/i.test(k) && b[k])) return null; // imagen de fondo del editor
    const v = b.backgroundColor ?? b.background;
    if (v) return parseColor(v); // si no es un color simple (degradado, url...) da null y no se juzga
  }
  return [255, 255, 255]; // la página sin fondo se ve blanca
}
function tamanoPx(n, ancestros) {
  for (const x of [n, ...[...ancestros].reverse()]) {
    const m = /^([\d.]+)px$/.exec(String(x.styles?.base?.fontSize ?? '').trim());
    if (m) return Number(m[1]);
  }
  return 16;
}

// ---------- accesibilidad ----------
export function checkAccesibilidad(page) {
  const out = [];
  const add = (level, rule, message) => out.push({ level, area: 'a11y', rule, message });
  let h1 = 0;
  let ultimoNivel = 0;

  recorrer(page, (n, anc) => {
    if (n.type === 'image') {
      if (!(n.content?.alt ?? '').trim()) add('warn', 'img-alt', `Image ${nombre(n)} has no alt text (fine only if it is purely decorative)`);
    }
    if (n.type === 'button' && !(n.content?.text ?? '').trim()) add('error', 'button-name', `Button ${nombre(n)} has no text, so it has no accessible name`);
    if (n.type === 'heading') {
      const nivel = Number(n.content?.level ?? 2);
      if (nivel === 1) h1++;
      if (ultimoNivel && nivel > ultimoNivel + 1) add('warn', 'heading-order', `Heading ${nombre(n)} jumps from h${ultimoNivel} to h${nivel}`);
      ultimoNivel = nivel;
    }
    if (['heading', 'text', 'button'].includes(n.type) && (n.content?.text ?? '').trim()) {
      const fg = colorTexto(n, anc);
      const bg = colorFondo(n, anc);
      if (fg && bg) {
        const minimo = tamanoPx(n, anc) >= 24 ? 3 : 4.5;
        const ratio = contraste(fg, bg);
        if (ratio < minimo) add('warn', 'contrast', `Low contrast on ${nombre(n)}: ${ratio.toFixed(1)}:1 (needs ${minimo}:1). Approximate: only simple colors are checked`);
      }
    }
  });

  if (h1 === 0) add('warn', 'h1-missing', 'The page has no h1 heading');
  if (h1 > 1) add('warn', 'h1-multiple', `The page has ${h1} h1 headings (one is the usual recommendation)`);
  return out;
}

// ---------- enlaces ----------
/** Devuelve { hallazgos, externos: [{ url, donde }] }. Los externos solo se comprueban con --check-external. */
export function checkEnlaces(page) {
  const out = [];
  const externos = [];
  const add = (level, rule, message) => out.push({ level, area: 'links', rule, message });

  const anclas = new Map();
  recorrer(page, (n) => {
    const a = n.content?.anchor;
    if (a) anclas.set(a, (anclas.get(a) ?? 0) + 1);
  });
  for (const [a, veces] of anclas) if (veces > 1) add('error', 'anchor-duplicate', `Anchor "#${a}" is used by ${veces} elements`);

  recorrer(page, (n) => {
    const href = n.content?.href;
    if (typeof href !== 'string') return;
    const h = href.trim();
    if (h === '' || h === '#') add('warn', 'link-placeholder', `${nombre(n)} has a placeholder link ("${h}")`);
    else if (h.startsWith('#')) { if (!anclas.has(h.slice(1))) add('error', 'anchor-broken', `${nombre(n)} links to ${h}, but no element has that anchor`); }
    else if (/^https?:\/\//i.test(h)) externos.push({ url: h, donde: nombre(n) });
    else if (!/^(mailto:|tel:)/i.test(h)) add('info', 'link-relative', `${nombre(n)} links to "${h}", a relative path that cannot be verified from the page alone`);
  });
  return { hallazgos: out, externos };
}

// ---------- recursos pesados ----------
/** Devuelve { hallazgos, imagenesExternas: [{ url, donde }] }. */
export function checkRecursos(page, html) {
  const out = [];
  const imagenesExternas = [];
  const add = (level, rule, message) => out.push({ level, area: 'assets', rule, message });

  recorrer(page, (n) => {
    if (n.type !== 'image') return;
    const src = n.content?.src ?? '';
    if (src.startsWith('data:')) {
      const bytes = Buffer.byteLength(src);
      if (bytes >= LIMITES.imagenErrorBytes) add('error', 'image-heavy', `Embedded image ${nombre(n)} is ${kbTxt(bytes)}: it inflates the HTML and the JSON. Host it and use a URL`);
      else if (bytes >= LIMITES.imagenAvisoBytes) add('warn', 'image-heavy', `Embedded image ${nombre(n)} is ${kbTxt(bytes)}. Consider compressing it or using a URL`);
    } else if (/^https?:\/\//i.test(src)) imagenesExternas.push({ url: src, donde: nombre(n) });
  });

  const total = Buffer.byteLength(html);
  if (total >= LIMITES.htmlErrorBytes) add('error', 'html-size', `The exported HTML is ${kbTxt(total)}`);
  else if (total >= LIMITES.htmlAvisoBytes) add('warn', 'html-size', `The exported HTML is ${kbTxt(total)}`);
  return { hallazgos: out, imagenesExternas };
}

// ---------- SEO básico ----------
export function checkSeo(html, page) {
  const out = [];
  const add = (level, rule, message) => out.push({ level, area: 'seo', rule, message });

  const titulo = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? '';
  if (!titulo || /^(mi landing|landing|p[aá]gina)$/i.test(titulo)) add('warn', 'title-default', 'The page title is empty or still the default. Set it in the page settings of the editor');
  else if (titulo.length < LIMITES.tituloMin) add('warn', 'title-short', `The title "${titulo}" is very short (${titulo.length} characters)`);
  else if (titulo.length > LIMITES.tituloMax) add('warn', 'title-long', `The title is ${titulo.length} characters; search engines usually cut it around ${LIMITES.tituloMax}`);

  // Meta description: el texto que muestran los buscadores. Se mide ya sin escapes HTML (&quot; etc. cuentan como 1 carácter).
  const desc = /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1];
  if (desc === undefined) add('warn', 'meta-description', 'No meta description. Add one in the editor: page settings (select the page) -> "Buscadores y redes" -> Descripción');
  else {
    const largo = desc.replace(/&(quot|amp|lt|gt|#39);/g, '_').length;
    if (largo < LIMITES.descripcionMin) add('warn', 'description-short', `The meta description is only ${largo} characters; around ${LIMITES.descripcionMin}-${LIMITES.descripcionMax} works best`);
    else if (largo > LIMITES.descripcionMax) add('warn', 'description-long', `The meta description is ${largo} characters; search engines usually cut it around ${LIMITES.descripcionMax}`);
  }
  // Open Graph (cómo se ve el enlace al compartirlo en redes). Sin imagen no hay vista previa grande: es solo una nota.
  if (!/<meta[^>]+property=["']og:/i.test(html)) add('info', 'open-graph', 'No Open Graph tags (link previews on social networks). Set a description and a share image in the page settings');
  else if (!/<meta[^>]+property=["']og:image["']/i.test(html)) add('info', 'og-image', 'No share image (og:image): links shared on social networks will show no picture. Add one in the page settings');
  // Idioma: sin el campo, el editor escribe lang="es" por defecto.
  const lang = /<html[^>]*\slang=["']([^"']+)["']/i.exec(html)?.[1];
  if (!lang) add('warn', 'html-lang', 'The <html> element has no lang attribute');
  else if (!page?.content?.lang) add('info', 'html-lang', `No language set in the page settings, so the page declares lang="${lang}". If your content is in another language, set it (page settings -> Idioma)`);
  return out;
}

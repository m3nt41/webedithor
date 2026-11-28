// ÁRBOL JSON DE LA PÁGINA
// Todo nodo tiene la misma forma:
//   { id, type, name, styles:{base,mobile}, content, animation, children }
//
// - type: 'page' | 'section' | 'container' | 'heading' | 'text' | 'button' | 'image' | 'icon'
//   ('icon' = SVG de la biblioteca de blocks/iconos-data.js: content:{ name }, tamaño = width/height, color = color)
// - styles.base: estilos CSS (camelCase) para escritorio (y como base de todo)
// - styles.mobile: SOLO lo que cambia en móvil (se superpone a base)
// - content: datos propios del tipo ({ text }, { src, alt }, { href }...)
// - animation: null o { appear?, hover?, press?, focus?, text?, stagger?, variants? } (ver src/animations/;
//   al abrir un .json se valida con animations/normalizar.js)
// - children: nodos hijos (layout flex/grid, NUNCA posiciones absolutas)

import { t } from '../i18n/index.js';
import { normalizarAnimacion } from '../animations/normalizar.js';
import { normalizarMarquesina } from './marquesina.js';
import { sanearEstilos, urlPermitida, idSeguro, nivelValido, quitar, leerQuitados } from './seguridad.js';
import { langValido, limpiarDescripcion, ogImagenValida } from './seo.js';

let contador = 0;

/** Id corto y único. Si el navegador no tiene randomUUID usa un contador. */
export function newId() {
  const base = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? `n${Date.now().toString(36)}`;
  return `${base}${(contador++).toString(36)}`;
}

/** Crea un nodo con valores por defecto. */
export function createNode(type, { name, content = {}, styles = {}, mobile = {}, children = [] } = {}) {
  return {
    id: newId(),
    type,
    name: name ?? type,
    styles: { base: styles, mobile },
    content,
    animation: null,
    children,
  };
}

/** Busca un nodo por id (recursivo). Devuelve null si no existe. */
export function findNode(root, id) {
  if (root.id === id) return root;
  for (const hijo of root.children) {
    const r = findNode(hijo, id);
    if (r) return r;
  }
  return null;
}

/** Devuelve el padre de un nodo, o null. */
export function findParent(root, id) {
  for (const hijo of root.children) {
    if (hijo.id === id) return root;
    const r = findParent(hijo, id);
    if (r) return r;
  }
  return null;
}

/** Recorre todos los nodos (útil para el exportador y para contar). */
export function walk(root, fn) {
  fn(root);
  root.children.forEach((h) => walk(h, fn));
}

/** Ancla válida: empieza con letra; solo letras (sin ñ ni tildes), números y guiones. */
export const anchorValido = (a) => /^[A-Za-z][A-Za-z0-9-]*$/.test(a ?? '');

/** Cuántos nodos de la página usan esta ancla (para avisar de repetidas). */
export function contarAncla(root, anchor, exceptoId = null) {
  let total = 0;
  walk(root, (n) => { if (n.id !== exceptoId && n.content?.anchor === anchor) total++; });
  return total;
}

/** Qué puede contener cada tipo: la página solo secciones; sección y contenedor,
 *  cualquier elemento menos secciones; los elementos hoja (título, texto...) nada. */
export function canContain(parentType, childType) {
  if (parentType === 'page') return childType === 'section';
  if (parentType === 'section' || parentType === 'container') return childType !== 'section' && childType !== 'page';
  return false;
}

/** Copia profunda de un nodo dándole ids nuevos a todo el subárbol (para duplicar). */
export function cloneWithNewIds(node) {
  const copia = structuredClone(node);
  walk(copia, (n) => { n.id = newId(); });
  return copia;
}

/** Proporción válida para aspect-ratio: "auto", "4 / 3", "1/1", "1.5" o "auto 4 / 3". Todo lo demás se descarta (nada se cuela como CSS). */
export const aspectoValido = (v) => typeof v === 'string' && /^(auto|(auto\s+)?\d{1,3}(\.\d{1,3})?(\s*\/\s*\d{1,3}(\.\d{1,3})?)?)$/.test(v.trim());

/** Claves de estilo que NO son CSS directo del elemento (el exportador las convierte en una regla para los hijos). */
export const CLAVES_PROPIAS = ['hijosAspectRatio', 'fondoImagen', 'fondoAjuste', 'fondoPosicion', 'fondoCapa', 'sombra'];

// ---- Imagen de fondo (secciones y contenedores) ----
export const FONDO_AJUSTES = ['cover', 'contain'];
export const FONDO_POSICIONES = ['center', 'top', 'bottom', 'left', 'right'];
export const FONDO_CAPA_MAX = 80;
const esFondoKey = (k) => k.startsWith('fondo');

/** Capa oscura válida: número 0–80 (acepta "45" o 45). Devuelve el número o null. */
export function capaValida(v) {
  if (v === '' || v == null || typeof v === 'boolean') return null;
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 && x <= FONDO_CAPA_MAX ? x : null;
}

/** Valor seguro para url("..."): escapa \ " saltos de línea y < (que no pueda cerrar un <style>). */
export function urlCss(src) {
  return `url("${String(src).replace(/[\\"\n\r<]/g, (c) => (c === '\\' ? '\\\\' : c === '"' ? '\\"' : '\\' + c.charCodeAt(0).toString(16) + ' '))}")`;
}

/** Declaraciones CSS de la imagen de fondo para estilos EFECTIVOS (base + móvil ya mezclados).
 *  Devuelve {} si no hay imagen. Es la única fuente de verdad: la usan el editor y el export. */
export function fondoDeclaraciones(est) {
  const src = typeof est.fondoImagen === 'string' ? est.fondoImagen.trim() : '';
  if (!src || !urlPermitida(src, { imagen: true })) return {}; // defensa en la salida: nunca url(javascript:…)
  const capa = capaValida(est.fondoCapa) ?? 0;
  const a = capa / 100;
  const ajuste = FONDO_AJUSTES.includes(est.fondoAjuste) ? est.fondoAjuste : 'cover';
  const pos = FONDO_POSICIONES.includes(est.fondoPosicion) ? est.fondoPosicion : 'center';
  const img = urlCss(src);
  return {
    backgroundImage: capa > 0 ? `linear-gradient(rgba(0,0,0,${a}),rgba(0,0,0,${a})),${img}` : img,
    backgroundSize: capa > 0 ? `auto,${ajuste}` : ajuste,
    backgroundPosition: capa > 0 ? `center,${pos}` : pos,
    backgroundRepeat: 'no-repeat',
  };
}

/** ¿Este objeto de estilos toca algo del fondo? (en móvil decide si hay que re-emitir el fondo, porque un
 *  `background` propio del override lo pisaría) */
export const tocaFondo = (st) => Object.keys(st).some((k) => esFondoKey(k) || k === 'background' || k === 'backgroundImage');

/** Quita de un objeto de estilos lo inválido: proporciones y campos de fondo. */
function limpiarProporciones(st) {
  const r = { ...st };
  for (const k of ['aspectRatio', 'hijosAspectRatio']) if (k in r && !aspectoValido(r[k])) delete r[k];
  if ('fondoImagen' in r && (typeof r.fondoImagen !== 'string' || !r.fondoImagen.trim())) delete r.fondoImagen;
  if ('fondoAjuste' in r && !FONDO_AJUSTES.includes(r.fondoAjuste)) delete r.fondoAjuste;
  if ('fondoPosicion' in r && !FONDO_POSICIONES.includes(r.fondoPosicion)) delete r.fondoPosicion;
  if ('fondoCapa' in r) { const c = capaValida(r.fondoCapa); if (c == null) delete r.fondoCapa; else r.fondoCapa = c; }
  return r;
}

/** Objeto plano o {} (evita que un string/array/null en el JSON rompa lo que lo lea). */
const objeto = (v) => (v !== null && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** content del nodo; en la página, smoothScroll solo vale si es exactamente true (lo demás se descarta). */
function limpiarContenido(n) {
  const c = { ...objeto(n.content) };
  if (n.type === 'page' && c.smoothScroll !== true) delete c.smoothScroll;
  if (n.type === 'page') limpiarSeoPagina(c); // idioma, meta description e imagen para compartir (core/seo.js)
  if (c.menuMovil !== true || n.type !== 'section') delete c.menuMovil; // menú hamburguesa del Navbar: solo vale exactamente true y en secciones
  if ('marquesina' in c) { // marquesina: solo en contenedores y con sus campos validados (ver core/marquesina.js)
    const m = n.type === 'container' ? normalizarMarquesina(c.marquesina) : undefined;
    if (m) c.marquesina = m; else delete c.marquesina;
  }
  // SEGURIDAD (ver core/seguridad.js): enlaces y fuentes solo con esquemas permitidos; el nivel del título entra en el nombre de la etiqueta
  if ('href' in c && !(typeof c.href === 'string' && urlPermitida(c.href))) { delete c.href; quitar(); }
  if ('src' in c && !(typeof c.src === 'string' && urlPermitida(c.src, { imagen: true }))) { delete c.src; quitar(); }
  if ('level' in c && !nivelValido(c.level)) { delete c.level; quitar(); }
  if (n.type === 'icon' && typeof c.name !== 'string') c.name = 'star'; // un name que no exista en la biblioteca se deja: se dibuja el icono neutro
  return c;
}

/** Campos de SEO de la página: lo vacío se quita sin avisar (es "no hay"); lo que no es válido se descarta y se cuenta. */
function limpiarSeoPagina(c) {
  if ('description' in c) {
    const d = typeof c.description === 'string' ? limpiarDescripcion(c.description) : null;
    if (d === null) quitar();
    if (d) c.description = d; else delete c.description;
  }
  for (const [clave, valido] of [['ogImage', ogImagenValida], ['lang', langValido]]) {
    if (!(clave in c)) continue;
    if (c[clave] === '') delete c[clave];
    else if (valido(c[clave])) c[clave] = c[clave].trim();
    else { delete c[clave]; quitar(); }
  }
}

/** Valida y completa un objeto leído de un .json. Lanza Error si no es una página válida.
 *  La animación de cada nodo se limpia con normalizarAnimacion (nunca lanza: lo inválido se descarta).
 *  SEGURIDAD: es el ÚNICO punto de entrada de una página (Abrir JSON, localStorage, pestañas, pegar página): estilos con lista
 *  permitida de propiedades y valores sin nada peligroso, href/src con esquemas permitidos, ids seguros (core/seguridad.js).
 *  `informe` (opcional) recibe { quitados }: cuántos valores se descartaron. */
export function normalizePage(obj, informe = null) {
  const antes = leerQuitados();
  const pagina = normalizarNodos(obj);
  if (informe) informe.quitados = leerQuitados() - antes;
  return pagina;
}

function normalizarNodos(obj) {
  const TIPOS = ['page', 'section', 'container', 'heading', 'text', 'button', 'image', 'icon'];
  function norm(n, esRaiz, padre) {
    if (!n || typeof n !== 'object') throw new Error(t('arbol.nodoInvalido'));
    if (!TIPOS.includes(n.type)) throw new Error(t('arbol.tipoDesconocido', { tipo: n.type }));
    if (esRaiz && n.type !== 'page') throw new Error(t('arbol.raiz'));
    if (padre && !canContain(padre.type, n.type)) {
      throw new Error(t('arbol.anidado', { hijo: n.name ?? n.type, tipoHijo: n.type, padre: padre.name ?? padre.type, tipoPadre: padre.type }));
    }
    if (n.children != null && !Array.isArray(n.children)) throw new Error(t('arbol.children', { nombre: n.name ?? n.type }));
    if (typeof n.id === 'string' && !idSeguro(n.id)) quitar(); // un id raro se cambia por uno nuevo (no puede colarse en selectores ni atributos)
    return {
      id: idSeguro(n.id) ? n.id : newId(),
      type: n.type,
      name: typeof n.name === 'string' ? n.name : n.type,
      styles: { base: sanearEstilos(limpiarProporciones(objeto(n.styles?.base))), mobile: sanearEstilos(limpiarProporciones(objeto(n.styles?.mobile))) },
      content: limpiarContenido(n),
      animation: normalizarAnimacion(n.animation, n.type), // validada: ver animations/normalizar.js
      children: (n.children ?? []).map((h) => norm(h, false, n)),
    };
  }
  return norm(obj, true, null);
}

/** Página vacía: un nodo raíz sin secciones. */
export function createPage() {
  return createNode('page', {
    name: 'Página',
    content: { title: 'Mi landing' },
    styles: { fontFamily: 'system-ui, sans-serif', color: '#111', background: '#fff' },
  });
}

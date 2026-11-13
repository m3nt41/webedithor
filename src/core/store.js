// ESTADO ÚNICO DEL EDITOR
// Toda la app lee de aquí y se entera de los cambios con subscribe().
// Para cambiar el árbol SIEMPRE se usa mutate(fn): clona la página, aplica fn,
// guarda la versión anterior en el historial (undo/redo) y notifica.
// El árbol se autoguarda en localStorage.

import { createPage, findNode, findParent, cloneWithNewIds, normalizePage } from './tree.js';
import { DEFAULTS, PRINCIPAL } from '../animations/index.js';

const CLAVE_LS = 'editor-landings:pagina';
const MAX_HISTORIAL = 100;
const VENTANA_AGRUPAR_MS = 1000; // cambios seguidos al mismo campo = un solo paso de undo

// ---- Estado ----
function cargarGuardado() {
  try {
    const txt = localStorage.getItem(CLAVE_LS);
    return txt ? normalizePage(JSON.parse(txt)) : null;
  } catch {
    return null; // localStorage bloqueado o JSON dañado: empezamos de cero
  }
}

const state = {
  page: cargarGuardado() ?? createPage(),
  selectedId: null, // id del nodo seleccionado
  viewMode: 'desktop', // 'desktop' | 'mobile'
};

const pasado = []; // versiones anteriores de la página (undo)
const futuro = []; // versiones deshechas (redo)
let ultimaClave = null;
let ultimoCambio = 0;

const listeners = new Set();

/** Suscribe un callback(state, cambio). cambio = 'page' | 'text' | 'selection' | 'view' | 'play'. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(cambio) {
  listeners.forEach((fn) => fn(state, cambio));
}

export function getState() {
  return state;
}

export const puedeDeshacer = () => pasado.length > 0;
export const puedeRehacer = () => futuro.length > 0;

// ---- Autoguardado ----
let temporizador = null;
function programarGuardado() {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    try {
      localStorage.setItem(CLAVE_LS, JSON.stringify(state.page));
    } catch {
      /* sin espacio o bloqueado: se ignora, el usuario aún puede exportar el JSON */
    }
  }, 300);
}

// ---- Selección y vista ----
/** Cambia la selección (null = deseleccionar). */
export function select(id) {
  if (state.selectedId === id) return;
  state.selectedId = id;
  emit('selection');
}

/** 'desktop' o 'mobile'. En móvil, los cambios de estilo se guardan en styles.mobile. */
export function setViewMode(modo) {
  if (state.viewMode === modo) return;
  state.viewMode = modo;
  emit('view');
}

// ---- Mutaciones ----
/** Modifica el árbol. fn recibe una COPIA de la página y puede mutarla.
 *  tipo  = 'page' (el preview se redibuja) o 'text' (silencioso: no redibuja,
 *          se usa mientras se escribe en el propio preview).
 *  clave = identifica "el mismo campo"; cambios seguidos con la misma clave se
 *          agrupan en un solo paso de undo. null = paso propio siempre. */
export function mutate(fn, tipo = 'page', clave = null) {
  const copia = structuredClone(state.page);
  fn(copia);

  const ahora = Date.now();
  const agrupar = clave && clave === ultimaClave && ahora - ultimoCambio < VENTANA_AGRUPAR_MS;
  if (!agrupar) {
    pasado.push(state.page); // el árbol anterior no se muta nunca, así que no hace falta copiarlo
    if (pasado.length > MAX_HISTORIAL) pasado.shift();
  }
  futuro.length = 0;
  ultimaClave = clave;
  ultimoCambio = ahora;

  state.page = copia;
  if (state.selectedId && !findNode(copia, state.selectedId)) state.selectedId = null;
  programarGuardado();
  emit(tipo);
}

/** Redibuja sin cambiar datos (p. ej. al terminar de editar texto). */
export function refresh() {
  emit('page');
}

function irA(pagina) {
  state.page = pagina;
  ultimaClave = null;
  if (state.selectedId && !findNode(pagina, state.selectedId)) state.selectedId = null;
  programarGuardado();
  emit('page');
}

export function undo() {
  if (!pasado.length) return;
  futuro.push(state.page);
  irA(pasado.pop());
}

export function redo() {
  if (!futuro.length) return;
  pasado.push(state.page);
  irA(futuro.pop());
}

// ---- Acciones concretas (las usa la UI) ----

export function addSection(node) {
  mutate((page) => page.children.push(node));
  select(node.id);
}

/** Cambia una propiedad CSS. En vista móvil escribe en styles.mobile, si no en base.
 *  value vacío = borra la propiedad. */
export function setStyle(id, key, value) {
  const modo = state.viewMode;
  mutate((page) => {
    const n = findNode(page, id);
    if (!n) return;
    const destino = modo === 'mobile' ? n.styles.mobile : n.styles.base;
    if (value === '' || value == null) delete destino[key];
    else destino[key] = value;
  }, 'page', `s:${id}:${key}:${modo}`);
}

/** Cambia un dato de content (text, href, src, level...). */
export function setContent(id, key, value, tipo = 'page') {
  mutate((page) => {
    const n = findNode(page, id);
    if (n) n.content[key] = value;
  }, tipo, `c:${id}:${key}`);
}

/** Cambia un dato de una animación (grupo = 'appear' | 'hover' | 'text').
 *  Poner el campo principal en '' apaga el grupo; ponerlo con valor lo crea con
 *  los valores por defecto. Emite 'play': el preview reproduce las animaciones. */
export function setAnimation(id, grupo, key, value) {
  mutate((page) => {
    const n = findNode(page, id);
    if (!n) return;
    const anim = n.animation ?? (n.animation = {});
    if (key === PRINCIPAL[grupo] && !value) {
      delete anim[grupo];
    } else {
      const g = anim[grupo] ?? (anim[grupo] = { ...DEFAULTS[grupo] });
      if (value === '' || value == null) delete g[key];
      else g[key] = value;
    }
    if (!Object.keys(anim).length) n.animation = null;
  }, 'play', `a:${id}:${grupo}:${key}`);
}

/** Pide al preview que reproduzca las animaciones de la página. */
export function play() {
  emit('play');
}

/** Cambia el nombre del nodo (solo se ve en el editor). */
export function setName(id, name) {
  mutate((page) => {
    const n = findNode(page, id);
    if (n) n.name = name;
  }, 'text', `n:${id}`);
}

export function removeNode(id) {
  mutate((page) => {
    const padre = findParent(page, id);
    if (padre) padre.children = padre.children.filter((n) => n.id !== id);
  });
}

/** Duplica un nodo justo después del original y lo selecciona. */
export function duplicateNode(id) {
  let nuevoId = null;
  mutate((page) => {
    const padre = findParent(page, id);
    if (!padre) return;
    const i = padre.children.findIndex((n) => n.id === id);
    const copia = cloneWithNewIds(padre.children[i]);
    copia.name += ' (copia)';
    padre.children.splice(i + 1, 0, copia);
    nuevoId = copia.id;
  });
  if (nuevoId) select(nuevoId);
}

/** Mueve una sección de la posición `desde` a la posición `hasta` (índices de page.children). */
export function moveSection(desde, hasta) {
  if (desde === hasta) return;
  mutate((page) => {
    const [sec] = page.children.splice(desde, 1);
    page.children.splice(hasta, 0, sec);
  });
}

// ---- Abrir / nueva ----

/** Reemplaza toda la página (abrir .json o "Nuevo"). Se puede deshacer. */
export function replacePage(obj) {
  const nueva = normalizePage(obj); // lanza Error si el JSON no sirve
  mutate((page) => {
    page.id = nueva.id; page.name = nueva.name; page.styles = nueva.styles;
    page.content = nueva.content; page.animation = nueva.animation; page.children = nueva.children;
  });
  select(null);
}

export const newPage = () => replacePage(createPage());

// ESTADO ÚNICO DEL EDITOR
// Toda la app lee de aquí y se entera de los cambios con subscribe().
// Para cambiar el árbol SIEMPRE se usa mutate(fn): clona la página, aplica fn
// y notifica. Así en la Etapa 3 el undo/redo será guardar snapshots aquí mismo.

import { createPage, findNode, findParent } from './tree.js';

const state = {
  page: createPage(),
  selectedId: null, // id del nodo seleccionado
  viewMode: 'desktop', // 'desktop' | 'mobile' (se usa desde la Etapa 3)
};

const listeners = new Set();

/** Suscribe un callback(state, cambio). cambio = 'page' | 'selection' | 'view'. */
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

/** Cambia la selección (null = deseleccionar). */
export function select(id) {
  if (state.selectedId === id) return;
  state.selectedId = id;
  emit('selection');
}

/** Modifica el árbol. fn recibe una COPIA de la página y puede mutarla.
 *  tipo = 'page' (el preview se redibuja entero) o 'text' (cambio silencioso:
 *  el preview NO se redibuja; se usa mientras se escribe en el propio preview). */
export function mutate(fn, tipo = 'page') {
  const copia = structuredClone(state.page);
  fn(copia);
  state.page = copia;
  // Si el nodo seleccionado ya no existe (se borró), deselecciona.
  if (state.selectedId && !findNode(copia, state.selectedId)) state.selectedId = null;
  emit(tipo);
}

// ---- Acciones concretas (las usa la UI) ----

export function addSection(node) {
  mutate((page) => page.children.push(node));
  select(node.id);
}

/** Cambia una propiedad CSS. En vista móvil escribe en styles.mobile, si no en base.
 *  value vacío = borra la propiedad. */
export function setStyle(id, key, value) {
  mutate((page) => {
    const n = findNode(page, id);
    if (!n) return;
    const destino = state.viewMode === 'mobile' ? n.styles.mobile : n.styles.base;
    if (value === '' || value == null) delete destino[key];
    else destino[key] = value;
  });
}

/** Cambia un dato de content (text, href, src, level...). */
export function setContent(id, key, value, tipo = 'page') {
  mutate((page) => {
    const n = findNode(page, id);
    if (n) n.content[key] = value;
  }, tipo);
}

/** Cambia el nombre del nodo (solo se ve en el editor). */
export function setName(id, name) {
  mutate((page) => {
    const n = findNode(page, id);
    if (n) n.name = name;
  }, 'text');
}

export function removeNode(id) {
  mutate((page) => {
    const padre = findParent(page, id);
    if (padre) padre.children = padre.children.filter((n) => n.id !== id);
  });
}

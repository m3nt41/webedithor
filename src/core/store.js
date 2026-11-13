// ESTADO ÚNICO DEL EDITOR
// Toda la app lee de aquí y se entera de los cambios con subscribe().
// Para cambiar el árbol SIEMPRE se usa mutate(fn): clona la página, aplica fn,
// guarda la versión anterior en el historial (undo/redo) y notifica.
// El árbol se autoguarda en localStorage.

import { createPage, createNode, findNode, findParent, cloneWithNewIds, normalizePage, canContain } from './tree.js';
import { DEFAULTS, PRINCIPAL } from '../animations/index.js';
import { crearEstado } from '../animations/variants.js';

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
  verEstado: null, // { id (nodo), estado (id del variant) }: "Ver este estado" en el preview; no se guarda
  reproduciendo: false, // el preview está en modo reproducir (solo con el botón ▶; cualquier redibujado de edición lo apaga); no se guarda
};

const pasado = []; // versiones anteriores de la página (undo)
const futuro = []; // versiones deshechas (redo)
let ultimaClave = null;
let ultimoCambio = 0;

const listeners = new Set();

/** Suscribe un callback(state, cambio). cambio = 'page' | 'text' | 'selection' | 'view' | 'play' | 'verestado'. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(cambio) {
  // Modo reproducir: lo enciende solo 'play' (botón ▶). Todo lo que redibuja el preview en modo edición lo apaga.
  if (cambio === 'play') state.reproduciendo = true;
  else if (cambio === 'page' || cambio === 'view' || cambio === 'verestado') state.reproduciendo = false;
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
  const habiaVer = state.verEstado;
  state.verEstado = null; // al cambiar de elemento se deja de "ver" el estado
  state.selectedId = id;
  emit('selection');
  if (habiaVer) emit('verestado');
}

/** Fuerza en el preview el estado `estadoId` del nodo `nodeId` (null = volver a lo normal). Solo editor. */
export function verEstado(nodeId, estadoId) {
  state.verEstado = estadoId ? { id: nodeId, estado: estadoId } : null;
  emit('verestado');
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
 *  los valores por defecto. Emite 'page' (NO 'play'): el preview sigue en modo edición hasta pulsar ▶. */
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
  }, 'page', `a:${id}:${grupo}:${key}`);
}

// ---- Variants (estados con nombre) ----
// Se guardan en node.animation.variants (lista; el orden importa: el de más abajo gana).

/** Cambia node.animation.variants con fn(lista); deja la animación en null si queda vacía. */
function editarVariants(id, fn, clave = null) {
  mutate((page) => {
    const n = findNode(page, id);
    if (!n) return;
    const anim = n.animation ?? (n.animation = {});
    const lista = anim.variants ?? (anim.variants = []);
    fn(lista);
    if (!lista.length) delete anim.variants;
    if (!Object.keys(anim).length) n.animation = null;
  }, 'page', clave);
}

/** Añade un estado nuevo (hover, con escala 1.05 de ejemplo) y devuelve su id. */
export function addVariant(id) {
  let nuevo = null;
  editarVariants(id, (lista) => { nuevo = crearEstado(lista); lista.push(nuevo); });
  return nuevo?.id;
}

export function removeVariant(id, estadoId) {
  editarVariants(id, (lista) => { const i = lista.findIndex((s) => s.id === estadoId); if (i >= 0) lista.splice(i, 1); });
  if (state.verEstado?.estado === estadoId) verEstado(null, null);
}

/** Sube (-1) o baja (+1) un estado en la lista (el de más abajo gana si coinciden). */
export function moveVariant(id, estadoId, delta) {
  editarVariants(id, (lista) => {
    const i = lista.findIndex((s) => s.id === estadoId), j = i + delta;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
  });
}

/** Cambia un dato del estado (name, trigger, duration, delay, ease, curva...). '' = borra (vuelve al valor por defecto). */
export function setVariant(id, estadoId, key, value) {
  editarVariants(id, (lista) => {
    const s = lista.find((x) => x.id === estadoId);
    if (!s) return;
    if ((value === '' || value == null) && key !== 'name') delete s[key];
    else s[key] = value;
  }, `v:${id}:${estadoId}:${key}`);
}

/** Cambia una propiedad que el estado modifica (opacity, x, scale, color...). '' = ya no la cambia. */
export function setVariantProp(id, estadoId, prop, value) {
  editarVariants(id, (lista) => {
    const s = lista.find((x) => x.id === estadoId);
    if (!s) return;
    s.props = s.props ?? {};
    if (value === '' || value == null) delete s.props[prop];
    else s.props[prop] = value;
  }, `vp:${id}:${estadoId}:${prop}`);
}

/** Botón ▶: entra al modo reproducir del preview; pulsarlo de nuevo (o salirReproducir) vuelve al modo edición.
 *  Es la ÚNICA forma de entrar: ningún cambio del panel de animaciones lo activa. */
export function play() {
  if (state.reproduciendo) salirReproducir();
  else emit('play');
}

/** Vuelve el preview al modo edición (escenas apiladas, sin motor de scroll). */
export function salirReproducir() {
  if (state.reproduciendo) emit('page');
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

// ---- Elementos: añadir / mover (Etapa 5) ----

/** ¿Se puede mover `id` dentro de `parentId`? (tipos compatibles y no meterlo en sí mismo) */
export function puedeMover(page, id, parentId) {
  const nodo = findNode(page, id);
  const destino = findNode(page, parentId);
  if (!nodo || !destino || nodo.type === 'page') return false;
  if (findNode(nodo, parentId)) return false; // el destino es el propio nodo o un descendiente
  return canContain(destino.type, nodo.type);
}

/** Inserta un nodo nuevo dentro de parentId en la posición index (por defecto al final) y lo selecciona. */
export function addNode(node, parentId, index) {
  const destino = findNode(state.page, parentId);
  if (!destino || !canContain(destino.type, node.type)) return false;
  mutate((page) => {
    const d = findNode(page, parentId);
    const i = index == null ? d.children.length : Math.max(0, Math.min(index, d.children.length));
    d.children.splice(i, 0, node);
  });
  select(node.id);
  return true;
}

/** Añade un elemento nuevo según lo seleccionado:
 *  - contenedor/sección seleccionado → dentro, al final;
 *  - elemento hoja seleccionado → justo después de él;
 *  - nada (o la página) → en la última sección (se crea una si no hay). */
export function addElement(node) {
  const page = state.page;
  const sel = state.selectedId ? findNode(page, state.selectedId) : null;

  if (node.type === 'section') { // las secciones solo viven en la página
    let idx = page.children.length;
    if (node.content?.alInicio) { delete node.content.alInicio; return addNode(node, page.id, 0); } // navbar: arriba de todo
    if (sel && sel.type !== 'page') {
      let raiz = sel;
      while (findParent(page, raiz.id)?.type !== 'page') raiz = findParent(page, raiz.id);
      idx = page.children.indexOf(raiz) + 1;
    }
    return addNode(node, page.id, idx);
  }

  if (sel && canContain(sel.type, node.type)) return addNode(node, sel.id);
  if (sel && sel.type !== 'page') {
    // buscar el ancestro más cercano que pueda contenerlo, colocándolo tras la rama actual
    let hijo = sel;
    let padre = findParent(page, hijo.id);
    while (padre && !canContain(padre.type, node.type)) { hijo = padre; padre = findParent(page, hijo.id); }
    if (padre) return addNode(node, padre.id, padre.children.indexOf(hijo) + 1);
  }
  let ultima = page.children[page.children.length - 1];
  if (!ultima) {
    ultima = createNode('section', {
      name: 'Sección',
      styles: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '64px 32px' },
      mobile: { padding: '40px 20px' },
    });
    mutate((p) => p.children.push(ultima));
  }
  return addNode(node, ultima.id);
}

/** Mueve un nodo a parentId en la posición index (índice contando con el nodo aún en su sitio). */
export function moveNode(id, parentId, index) {
  if (!puedeMover(state.page, id, parentId)) return;
  const padre = findParent(state.page, id);
  const destino = findNode(state.page, parentId);
  const actual = padre.children.findIndex((n) => n.id === id);
  let nuevo = Math.max(0, Math.min(index, destino.children.length));
  if (padre.id === destino.id && actual < nuevo) nuevo--; // al sacarlo, los de después suben 1
  if (padre.id === destino.id && actual === nuevo) return; // no cambia nada
  mutate((page) => {
    const nodo = findNode(page, id);
    const origen = findParent(page, id);
    origen.children.splice(origen.children.indexOf(nodo), 1);
    findNode(page, parentId).children.splice(nuevo, 0, nodo);
  });
}

/** Sube (-1) o baja (+1) un nodo dentro de su mismo padre. */
export function moveBy(id, delta) {
  const padre = findParent(state.page, id);
  if (!padre) return;
  const i = padre.children.findIndex((n) => n.id === id);
  const j = i + delta;
  if (j < 0 || j >= padre.children.length) return;
  mutate((page) => {
    const p = findParent(page, id);
    [p.children[i], p.children[j]] = [p.children[j], p.children[i]];
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

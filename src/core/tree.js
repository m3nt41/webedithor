// ÁRBOL JSON DE LA PÁGINA
// Todo nodo tiene la misma forma:
//   { id, type, name, styles:{base,mobile}, content, animation, children }
//
// - type: 'page' | 'section' | 'container' | 'heading' | 'text' | 'button' | 'image'
// - styles.base: estilos CSS (camelCase) para escritorio (y como base de todo)
// - styles.mobile: SOLO lo que cambia en móvil (se superpone a base)
// - content: datos propios del tipo ({ text }, { src, alt }, { href }...)
// - animation: null o { appear?, hover?, text? } (ver src/animations/)
// - children: nodos hijos (layout flex/grid, NUNCA posiciones absolutas)

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

/** Valida y completa un objeto leído de un .json. Lanza Error si no es una página válida. */
export function normalizePage(obj) {
  const TIPOS = ['page', 'section', 'container', 'heading', 'text', 'button', 'image'];
  function norm(n, esRaiz, padre) {
    if (!n || typeof n !== 'object') throw new Error('Nodo inválido');
    if (!TIPOS.includes(n.type)) throw new Error(`Tipo desconocido: ${n.type}`);
    if (esRaiz && n.type !== 'page') throw new Error('La raíz debe ser de tipo page');
    if (padre && !canContain(padre.type, n.type)) {
      throw new Error(`Anidado inválido: "${n.name ?? n.type}" (${n.type}) no puede estar dentro de "${padre.name ?? padre.type}" (${padre.type})`);
    }
    if (n.children != null && !Array.isArray(n.children)) throw new Error(`"children" de "${n.name ?? n.type}" debe ser una lista`);
    return {
      id: typeof n.id === 'string' ? n.id : newId(),
      type: n.type,
      name: n.name ?? n.type,
      styles: { base: n.styles?.base ?? {}, mobile: n.styles?.mobile ?? {} },
      content: n.content ?? {},
      animation: n.animation ?? null,
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

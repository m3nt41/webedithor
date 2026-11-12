// ÁRBOL JSON DE LA PÁGINA
// Todo nodo tiene la misma forma:
//   { id, type, name, styles:{base,mobile}, content, animation, children }
//
// - type: 'page' | 'section' | 'container' | 'heading' | 'text' | 'button' | 'image'
// - styles.base: estilos CSS (camelCase) para escritorio (y como base de todo)
// - styles.mobile: SOLO lo que cambia en móvil (se superpone a base)
// - content: datos propios del tipo ({ text }, { src, alt }, { href }...)
// - animation: null por ahora (Etapa 4). Aquí irá { appear:{...}, hover:{...} }
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

/** Página vacía: un nodo raíz sin secciones. */
export function createPage() {
  return createNode('page', {
    name: 'Página',
    styles: { fontFamily: 'system-ui, sans-serif', color: '#111', background: '#fff' },
  });
}

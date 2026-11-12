// INSPECTOR (derecha). Etapa 1: solo MUESTRA el nodo seleccionado (solo lectura).
// Etapa 2: aquí irán los controles de propiedades; Etapa 4: el panel de animación.

import { getState, subscribe } from '../core/store.js';
import { findNode } from '../core/tree.js';

export function initInspector(host) {
  function dibujar() {
    const { page, selectedId } = getState();
    const nodo = selectedId ? findNode(page, selectedId) : null;
    if (!nodo) {
      host.innerHTML = '<h2>Propiedades</h2><p class="vacio">Haz clic en un elemento del preview.</p>';
      return;
    }
    // Mostramos el nodo sin los hijos para que el JSON sea corto
    const { children, ...resto } = nodo;
    host.innerHTML = `
      <h2>Propiedades</h2>
      <p><strong>${nodo.name}</strong> <small>(${nodo.type})</small></p>
      <p><small>hijos: ${children.length}</small></p>
      <pre>${JSON.stringify(resto, null, 2).replace(/</g, '&lt;')}</pre>
    `;
  }
  subscribe(dibujar);
  dibujar();
}

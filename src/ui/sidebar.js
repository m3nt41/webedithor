// SIDEBAR (izquierda): lista de secciones + botones para añadir bloques.
// Etapa 1: seleccionar, borrar y añadir. Reordenar/duplicar llega en la Etapa 3.

import { getState, subscribe, select, addSection, removeNode } from '../core/store.js';
import { BLOCKS, createBlock } from '../blocks/index.js';

export function initSidebar(host) {
  host.innerHTML = `
    <h2>Secciones</h2>
    <button id="btn-pagina" class="pagina">⚙ Ajustes de la página</button>
    <ul class="lista" id="lista-secciones"></ul>
    <h2>Añadir bloque</h2>
    <div class="bloques" id="botones-bloques"></div>
  `;
  const lista = host.querySelector('#lista-secciones');
  const botones = host.querySelector('#botones-bloques');

  // Selecciona el nodo raíz (fondo, fuente y título de toda la página)
  host.querySelector('#btn-pagina').addEventListener('click', () => select(getState().page.id));

  // Un botón por bloque registrado en src/blocks/index.js
  BLOCKS.forEach((b) => {
    const btn = document.createElement('button');
    btn.textContent = `+ ${b.label}`;
    btn.addEventListener('click', () => addSection(createBlock(b.id)));
    botones.appendChild(btn);
  });

  function dibujar() {
    const { page, selectedId } = getState();
    lista.replaceChildren();
    if (!page.children.length) {
      lista.innerHTML = '<li class="vacio">Aún no hay secciones. Añade un bloque.</li>';
      return;
    }
    page.children.forEach((sec) => {
      const li = document.createElement('li');
      li.className = sec.id === selectedId ? 'activa' : '';
      const nombre = document.createElement('span');
      nombre.textContent = sec.name;
      nombre.addEventListener('click', () => select(sec.id));
      const borrar = document.createElement('button');
      borrar.textContent = '✕';
      borrar.title = 'Borrar sección';
      borrar.addEventListener('click', () => removeNode(sec.id));
      li.append(nombre, borrar);
      lista.appendChild(li);
    });
  }

  subscribe(dibujar);
  dibujar();
}

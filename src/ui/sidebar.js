// SIDEBAR (izquierda): lista de secciones + botones para añadir bloques.
// Cada fila: clic = seleccionar, arrastrar = reordenar, ⧉ = duplicar, ✕ = borrar.
// (Si te equivocas al borrar: Ctrl+Z.)

import { getState, subscribe, select, addSection, removeNode, duplicateNode, moveSection } from '../core/store.js';
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

  let origen = null; // índice de la fila que se está arrastrando

  function limpiarMarcas() {
    lista.querySelectorAll('.drop-antes, .drop-despues, .arrastrando').forEach((li) => li.classList.remove('drop-antes', 'drop-despues', 'arrastrando'));
  }

  function filaSeccion(sec, i, selectedId) {
    const li = document.createElement('li');
    li.className = sec.id === selectedId ? 'activa' : '';
    li.draggable = true;

    const nombre = document.createElement('span');
    nombre.textContent = sec.name;
    nombre.addEventListener('click', () => select(sec.id));

    const dup = document.createElement('button');
    dup.textContent = '⧉';
    dup.title = 'Duplicar sección';
    dup.addEventListener('click', () => duplicateNode(sec.id));

    const borrar = document.createElement('button');
    borrar.textContent = '✕';
    borrar.title = 'Borrar sección';
    borrar.className = 'borrar';
    borrar.addEventListener('click', () => removeNode(sec.id));

    li.append(nombre, dup, borrar);

    // ---- Arrastrar y soltar ----
    li.addEventListener('dragstart', (e) => {
      origen = i;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(i)); // Firefox exige setData
      li.classList.add('arrastrando');
    });
    li.addEventListener('dragover', (e) => {
      if (origen === null) return;
      e.preventDefault();
      const r = li.getBoundingClientRect();
      const despues = e.clientY > r.top + r.height / 2;
      limpiarMarcas();
      li.classList.add(despues ? 'drop-despues' : 'drop-antes');
    });
    li.addEventListener('drop', (e) => {
      if (origen === null) return;
      e.preventDefault();
      const r = li.getBoundingClientRect();
      let destino = e.clientY > r.top + r.height / 2 ? i + 1 : i;
      if (origen < destino) destino--; // al quitar el origen, los índices de después bajan 1
      const desde = origen;
      origen = null;
      limpiarMarcas();
      moveSection(desde, destino);
    });
    li.addEventListener('dragend', () => { origen = null; limpiarMarcas(); });
    return li;
  }

  function dibujar() {
    const { page, selectedId } = getState();
    lista.replaceChildren();
    if (!page.children.length) {
      lista.innerHTML = '<li class="vacio">Aún no hay secciones. Añade un bloque.</li>';
      return;
    }
    page.children.forEach((sec, i) => lista.appendChild(filaSeccion(sec, i, selectedId)));
  }

  subscribe(dibujar);
  dibujar();
}

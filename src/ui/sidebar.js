// SIDEBAR (izquierda): árbol de capas + paletas para añadir bloques y elementos.
// Árbol: clic = seleccionar, ▸/▾ = plegar, ⧉ = duplicar, ✕ = borrar (Ctrl+Z lo recupera).
// Arrastrar una fila: suéltala en el borde de arriba/abajo de otra (= antes/después)
// o en el centro de un contenedor/sección (= dentro). Funciona entre contenedores.

import { getState, subscribe, select, addNode, addElement, removeNode, duplicateNode, moveNode, puedeMover } from '../core/store.js';
import { findNode, findParent } from '../core/tree.js';
import { BLOCKS, createBlock } from '../blocks/index.js';
import { ELEMENTS } from '../blocks/elements.js';

const ICONOS = { section: '▭', container: '▢', heading: 'H', text: '¶', button: '⬭', image: '▣' };

export function initSidebar(host) {
  host.innerHTML = `
    <h2>Capas</h2>
    <button id="btn-pagina" class="pagina">⚙ Ajustes de la página</button>
    <ul class="lista arbol" id="arbol"></ul>
    <h2>Añadir elemento</h2>
    <p class="ayuda">Va dentro de lo seleccionado (o tras él).</p>
    <div class="bloques dos" id="botones-elementos"></div>
    <h2>Añadir bloque</h2>
    <div id="botones-bloques"></div>
  `;
  const arbol = host.querySelector('#arbol');
  const botonesEl = host.querySelector('#botones-elementos');
  const botonesBl = host.querySelector('#botones-bloques');

  host.querySelector('#btn-pagina').addEventListener('click', () => select(getState().page.id));

  // ---- Elementos sueltos ----
  ELEMENTS.forEach((e) => {
    const btn = document.createElement('button');
    btn.textContent = `+ ${e.label}`;
    btn.addEventListener('click', () => addElement(e.crear()));
    botonesEl.appendChild(btn);
  });

  // ---- Bloques: un <details> por bloque con un botón por variante ----
  BLOCKS.forEach((b) => {
    const det = document.createElement('details');
    det.className = 'bloque';
    const sum = document.createElement('summary');
    sum.textContent = b.label;
    const vars = document.createElement('div');
    vars.className = 'variantes';
    Object.entries(b.variants).forEach(([clave, v]) => {
      const btn = document.createElement('button');
      btn.textContent = `+ ${v.label}`;
      // los bloques son secciones: se añaden tras la sección seleccionada (o al final)
      btn.addEventListener('click', () => addElement(createBlock(b.id, clave)));
      vars.appendChild(btn);
    });
    det.append(sum, vars);
    botonesBl.appendChild(det);
  });

  // ---- Árbol de capas ----
  const plegados = new Set(); // ids de nodos plegados (solo vista, no se guarda)
  let arrastrado = null; // id del nodo que se arrastra

  function limpiarMarcas() {
    arbol.querySelectorAll('.drop-antes, .drop-despues, .drop-dentro, .arrastrando').forEach((li) => li.classList.remove('drop-antes', 'drop-despues', 'drop-dentro', 'arrastrando'));
  }

  /** Según dónde cae el ratón sobre la fila, decide el destino válido (o null). */
  function destinoDe(page, fila, e) {
    const nodo = findNode(page, fila.dataset.id);
    const r = fila.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const zona = y < 0.3 ? 'antes' : y > 0.7 ? 'despues' : 'dentro';
    const padre = findParent(page, nodo.id);
    const i = padre.children.indexOf(nodo);
    const opciones = {
      antes: { parentId: padre.id, index: i, marca: 'drop-antes' },
      despues: { parentId: padre.id, index: i + 1, marca: 'drop-despues' },
      dentro: { parentId: nodo.id, index: nodo.children.length, marca: 'drop-dentro' },
    };
    // Si la zona preferida no es válida, se prueba "dentro" (p. ej. soltar un título sobre una sección)
    for (const z of [zona, 'dentro']) {
      const o = opciones[z];
      if (puedeMover(page, arrastrado, o.parentId)) return o;
    }
    return null;
  }

  function fila(nodo, nivel, selectedId) {
    const li = document.createElement('li');
    li.className = nodo.id === selectedId ? 'activa' : '';
    li.dataset.id = nodo.id;
    li.draggable = true;
    li.style.paddingLeft = `${6 + nivel * 14}px`;

    const plegar = document.createElement('button');
    plegar.className = 'plegar';
    plegar.textContent = nodo.children.length ? (plegados.has(nodo.id) ? '▸' : '▾') : '';
    plegar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (plegados.has(nodo.id)) plegados.delete(nodo.id); else plegados.add(nodo.id);
      dibujar();
    });

    const icono = document.createElement('i');
    icono.textContent = ICONOS[nodo.type] ?? '·';
    const nombre = document.createElement('span');
    nombre.textContent = nodo.name;
    nombre.title = nodo.name;

    const dup = document.createElement('button');
    dup.textContent = '⧉';
    dup.title = 'Duplicar';
    dup.addEventListener('click', (e) => { e.stopPropagation(); duplicateNode(nodo.id); });

    const borrar = document.createElement('button');
    borrar.textContent = '✕';
    borrar.title = 'Borrar';
    borrar.className = 'borrar';
    borrar.addEventListener('click', (e) => { e.stopPropagation(); removeNode(nodo.id); });

    li.append(plegar, icono, nombre, dup, borrar);
    li.addEventListener('click', () => select(nodo.id));

    // ---- Arrastrar y soltar ----
    li.addEventListener('dragstart', (e) => {
      arrastrado = nodo.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', nodo.id); // Firefox exige setData
      li.classList.add('arrastrando');
    });
    li.addEventListener('dragover', (e) => {
      if (!arrastrado) return;
      const d = destinoDe(getState().page, li, e);
      limpiarMarcas();
      if (!d) return; // sin preventDefault: el cursor muestra "no permitido"
      e.preventDefault();
      li.classList.add(d.marca);
    });
    li.addEventListener('drop', (e) => {
      if (!arrastrado) return;
      const d = destinoDe(getState().page, li, e);
      const id = arrastrado;
      arrastrado = null;
      limpiarMarcas();
      if (!d) return;
      e.preventDefault();
      plegados.delete(d.parentId); // que se vea lo recién soltado
      moveNode(id, d.parentId, d.index);
    });
    li.addEventListener('dragend', () => { arrastrado = null; limpiarMarcas(); });
    return li;
  }

  function dibujar() {
    const { page, selectedId } = getState();
    // el nodo seleccionado siempre debe verse: se despliegan sus ancestros
    if (selectedId) for (let p = findParent(page, selectedId); p; p = findParent(page, p.id)) plegados.delete(p.id);

    arbol.replaceChildren();
    if (!page.children.length) {
      arbol.innerHTML = '<li class="vacio">Aún no hay secciones. Añade un bloque.</li>';
      return;
    }
    const recorrer = (nodos, nivel) => nodos.forEach((n) => {
      arbol.appendChild(fila(n, nivel, selectedId));
      if (n.children.length && !plegados.has(n.id)) recorrer(n.children, nivel + 1);
    });
    recorrer(page.children, 0);
  }

  subscribe(dibujar);
  dibujar();
}

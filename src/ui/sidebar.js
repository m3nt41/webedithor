// SIDEBAR (izquierda): árbol de capas + paletas para añadir bloques y elementos.
// Árbol: clic = seleccionar, ▸/▾ = plegar, ⧉ = duplicar, ✕ = borrar (Ctrl+Z lo recupera).
// Arrastrar una fila: suéltala en el borde de arriba/abajo de otra (= antes/después)
// o en el centro de un contenedor/sección (= dentro). Funciona entre contenedores.

import { getState, subscribe, select, addNode, addElement, removeNode, duplicateNode, moveNode, puedeMover } from '../core/store.js';
import { findNode, findParent, canContain } from '../core/tree.js';
import { BLOCKS, createBlock } from '../blocks/index.js';
import { ELEMENTS } from '../blocks/elements.js';

const ICONOS = { section: '▭', container: '▢', heading: 'H', text: '¶', button: '⬭', image: '▣' };

// Estado de la vista (solo mientras la página esté abierta; no va a localStorage con la landing)
let pestanaActiva = 'capas';
let plegado = false;

const svg = (d) => `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const SVG_CAPAS = svg('<path d="M8 2 14 5.2 8 8.4 2 5.2Z"/><path d="m2 8 6 3.2L14 8"/><path d="m2 10.8 6 3.2 6-3.2"/>');
const SVG_ELEM = svg('<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><path d="M11.5 9.5v4M9.5 11.5h4"/>');
const SVG_BLOQ = svg('<rect x="2" y="2.5" width="12" height="4" rx="1"/><rect x="2" y="9.5" width="12" height="4" rx="1"/>');
const SVG_AJUSTES = svg('<circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/>');
const PESTANAS = [
  { id: 'capas', texto: 'Capas', icono: SVG_CAPAS },
  { id: 'elementos', texto: 'Elem.', icono: SVG_ELEM },
  { id: 'bloques', texto: 'Bloques', icono: SVG_BLOQ },
];

export function initSidebar(host) {
  host.innerHTML = `
    <div class="sb-contenido">
      <div class="sb-barra">
        <div class="sb-tabs" role="tablist" aria-label="Paneles"></div>
        <button type="button" id="btn-pagina" class="sb-icono" title="Ajustes de la página" aria-label="Ajustes de la página">${SVG_AJUSTES}</button>
        <button type="button" id="btn-plegar" class="sb-icono" title="Plegar panel" aria-label="Plegar panel">${svg('<path d="m10 3-5 5 5 5"/>')}</button>
      </div>
      <div class="sb-panel" role="tabpanel" id="panel-capas" aria-labelledby="tab-capas">
        <ul class="lista arbol" id="arbol"></ul>
      </div>
      <div class="sb-panel" role="tabpanel" id="panel-elementos" aria-labelledby="tab-elementos">
        <p class="sb-hint" id="hint-elemento"></p>
        <div class="bloques dos" id="botones-elementos"></div>
      </div>
      <div class="sb-panel" role="tabpanel" id="panel-bloques" aria-labelledby="tab-bloques">
        <div id="botones-bloques"></div>
      </div>
    </div>
    <button type="button" id="btn-desplegar" class="sb-tira" title="Mostrar panel" aria-label="Mostrar panel">${svg('<path d="m6 3 5 5-5 5"/>')}</button>
  `;
  const arbol = host.querySelector('#arbol');
  const botonesEl = host.querySelector('#botones-elementos');
  const botonesBl = host.querySelector('#botones-bloques');
  const hint = host.querySelector('#hint-elemento');
  const app = host.parentElement;

  host.querySelector('#btn-pagina').addEventListener('click', () => select(getState().page.id));

  // ---- Pestañas ----
  const listaTabs = host.querySelector('.sb-tabs');
  const tabs = PESTANAS.map((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sb-tab';
    b.id = `tab-${p.id}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', `panel-${p.id}`);
    b.innerHTML = `${p.icono}<span>${p.texto}</span>`;
    b.addEventListener('click', () => activar(p.id));
    b.addEventListener('keydown', (e) => {
      const i = PESTANAS.findIndex((x) => x.id === pestanaActiva);
      const j = e.key === 'ArrowRight' ? (i + 1) % PESTANAS.length
        : e.key === 'ArrowLeft' ? (i + PESTANAS.length - 1) % PESTANAS.length
        : e.key === 'Home' ? 0 : e.key === 'End' ? PESTANAS.length - 1 : -1;
      if (j < 0) return;
      e.preventDefault();
      activar(PESTANAS[j].id);
      tabs[j].focus();
    });
    listaTabs.appendChild(b);
    return b;
  });
  function activar(id) {
    pestanaActiva = id;
    PESTANAS.forEach((p, i) => {
      const on = p.id === id;
      tabs[i].setAttribute('aria-selected', String(on));
      tabs[i].tabIndex = on ? 0 : -1;
      host.querySelector(`#panel-${p.id}`).hidden = !on;
    });
  }
  activar(pestanaActiva);

  // ---- Plegar / desplegar todo el panel ----
  function aplicarPlegado() {
    app.classList.toggle('sb-plegado', plegado);
    host.querySelector('.sb-contenido').inert = plegado;
  }
  host.querySelector('#btn-plegar').addEventListener('click', () => { plegado = true; aplicarPlegado(); host.querySelector('#btn-desplegar').focus(); });
  host.querySelector('#btn-desplegar').addEventListener('click', () => { plegado = false; aplicarPlegado(); host.querySelector('#btn-plegar').focus(); });
  aplicarPlegado();

  // ---- Elementos sueltos ----
  ELEMENTS.forEach((e) => {
    const btn = document.createElement('button');
    btn.textContent = `+ ${e.label}`;
    btn.addEventListener('click', () => addElement(e.crear()));
    botonesEl.appendChild(btn);
  });

  // Línea "Se añadirá dentro de: …" (según la selección; se actualiza con subscribe)
  function actualizarHint() {
    const { page, selectedId } = getState();
    let n = selectedId ? findNode(page, selectedId) : null;
    while (n && n.type !== 'page' && !canContain(n.type, 'text')) n = findParent(page, n.id);
    const destino = n && n.type !== 'page' ? n : null;
    hint.textContent = destino ? `Se añadirá dentro de: ${destino.name}` : 'Se añadirá al final de la página';
  }

  // ---- Bloques: acordeón de UN solo bloque abierto a la vez ----
  const detalles = [];
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
    det.addEventListener('toggle', () => { if (det.open) detalles.forEach((o) => { if (o !== det) o.open = false; }); });
    det.append(sum, vars);
    detalles.push(det);
    botonesBl.appendChild(det);
  });

  // ---- Árbol de capas ----
  const plegados = new Set(); // ids de nodos plegados (solo vista, no se guarda)
  let arrastrado = null; // id del nodo que se arrastra
  let reveladoId = null; // última selección cuyos ancestros se desplegaron

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
    // Al CAMBIAR la selección se despliegan sus ancestros para que se vea.
    // Si la selección es la misma (p. ej. al plegar a mano), se respeta lo plegado.
    if (selectedId && selectedId !== reveladoId) {
      for (let p = findParent(page, selectedId); p; p = findParent(page, p.id)) plegados.delete(p.id);
    }
    reveladoId = selectedId;

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

  subscribe(() => { dibujar(); actualizarHint(); });
  dibujar();
  actualizarHint();
}

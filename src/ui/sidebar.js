// SIDEBAR (izquierda): árbol de capas + paletas para añadir bloques y elementos.
// Árbol: clic = seleccionar, ▸/▾ = plegar, ⧉ = duplicar, ✕ = borrar (Ctrl+Z lo recupera).
// Arrastrar una fila: suéltala en el borde de arriba/abajo de otra (= antes/después)
// o en el centro de un contenedor/sección (= dentro). Funciona entre contenedores.

import { t as tr } from '../i18n/index.js';
import { getState, subscribe, select, addNode, addElement, removeNode, duplicateNode, moveNode, puedeMover } from '../core/store.js';
import { findNode, findParent, canContain } from '../core/tree.js';
import { BLOCKS, createBlock } from '../blocks/index.js';
import { ELEMENTS } from '../blocks/elements.js';
import { iconoSvg } from '../core/icono.js';

const ICONOS = { section: '▭', container: '▢', heading: 'H', text: '¶', button: '⬭', image: '▣' };

// Estado de la vista (solo mientras la página esté abierta; no va a localStorage con la landing)
let pestanaActiva = 'capas';

const svg = (d) => `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const SVG_CAPAS = svg('<path d="M8 2 14 5.2 8 8.4 2 5.2Z"/><path d="m2 8 6 3.2L14 8"/><path d="m2 10.8 6 3.2 6-3.2"/>');
const SVG_ELEM = svg('<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><path d="M11.5 9.5v4M9.5 11.5h4"/>');
const SVG_BLOQ = svg('<rect x="2" y="2.5" width="12" height="4" rx="1"/><rect x="2" y="9.5" width="12" height="4" rx="1"/>');
// Hoja con la esquina doblada y tres líneas de texto = "ajustes de esta página"
const SVG_AJUSTES = svg('<path d="M3.5 1.8h6l3 3v9.4h-9Z"/><path d="M9.5 1.8v3h3"/><path d="M5.5 8h5M5.5 10.2h5M5.5 12.2h3"/>');
const PESTANAS = [
  { id: 'bloques', texto: tr('lateral.bloques'), icono: SVG_BLOQ },
  { id: 'capas', texto: tr('lateral.capas'), icono: SVG_CAPAS },
  { id: 'elementos', texto: tr('lateral.elementos'), icono: SVG_ELEM },
];

export function initSidebar(host) {
  host.innerHTML = `
    <div class="sb-contenido">
      <div class="sb-barra">
        <div class="sb-tabs" role="tablist" aria-label="${tr('lateral.paneles')}"></div>
        <button type="button" id="btn-pagina" class="sb-icono" title="${tr('lateral.ajustesPagina')}" aria-label="${tr('lateral.ajustesPagina')}">${SVG_AJUSTES}</button>
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
  `;
  const arbol = host.querySelector('#arbol');
  const botonesEl = host.querySelector('#botones-elementos');
  const botonesBl = host.querySelector('#botones-bloques');
  const hint = host.querySelector('#hint-elemento');
  const btnPagina = host.querySelector('#btn-pagina');
  btnPagina.addEventListener('click', () => select(getState().page.id));
  // Marcado (activo) cuando lo seleccionado es la página
  function marcarPagina() {
    const { page, selectedId } = getState();
    const on = selectedId === page.id;
    btnPagina.classList.toggle('activo', on);
    btnPagina.setAttribute('aria-pressed', String(on));
  }

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
    hint.textContent = destino ? tr('lateral.dentroDe', { nombre: destino.name }) : tr('lateral.alFinal');
  }

  // ---- Bloques: acordeón de UN solo bloque abierto a la vez ----
  // Antes era <details>: su evento "toggle" llega un fotograma tarde, así que al abrir B el A seguía
  // abierto un instante (el panel crecía) y luego se cerraba de golpe = salto. Ahora cada bloque es un
  // botón + un cuerpo que se anima con grid-template-rows 0fr -> 1fr (CSS); abrir B y cerrar A es un
  // solo cambio síncrono, y se anima a la vez.
  const bloques = [];
  const panelBl = host.querySelector('#panel-bloques'); // el que hace scroll
  const sinAnim = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let anclaRaf = 0;

  function fijar(bl, abierto) {
    bl.el.classList.toggle('abierto', abierto);
    bl.btn.setAttribute('aria-expanded', String(abierto));
    bl.cuerpo.inert = !abierto; // cerrado: no se puede tabular dentro (inert también oculta a lectores)
    bl.cuerpo.setAttribute('aria-hidden', String(!abierto));
  }

  function alternar(bl) {
    const abrir = !bl.el.classList.contains('abierto');
    const top0 = bl.btn.getBoundingClientRect().top;
    bloques.forEach((o) => fijar(o, o === bl && abrir));
    // Mantener el título pulsado donde estaba mientras el otro se cierra/abre
    cancelAnimationFrame(anclaRaf);
    const ancla = () => { panelBl.scrollTop += bl.btn.getBoundingClientRect().top - top0; };
    if (sinAnim()) { ancla(); if (abrir) bl.el.scrollIntoView({ block: 'nearest' }); return; }
    const t0 = performance.now();
    const paso = (t) => {
      ancla();
      if (t - t0 < 220) anclaRaf = requestAnimationFrame(paso);
      else if (abrir) bl.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); // si quedó cortado abajo
    };
    anclaRaf = requestAnimationFrame(paso);
  }

  BLOCKS.forEach((b) => {
    const el = document.createElement('div');
    el.className = 'bloque';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bloque-titulo';
    btn.textContent = b.label;
    const cuerpo = document.createElement('div');
    cuerpo.className = 'bloque-cuerpo';
    const vars = document.createElement('div');
    vars.className = 'variantes';
    Object.entries(b.variants).forEach(([clave, v]) => {
      const vb = document.createElement('button');
      vb.textContent = `+ ${v.label}`;
      // los bloques son secciones: se añaden tras la sección seleccionada (o al final)
      vb.addEventListener('click', () => addElement(createBlock(b.id, clave)));
      vars.appendChild(vb);
    });
    cuerpo.appendChild(vars);
    el.append(btn, cuerpo);
    const bl = { el, btn, cuerpo };
    btn.addEventListener('click', () => alternar(bl));
    fijar(bl, false);
    bloques.push(bl);
    botonesBl.appendChild(el);
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
    if (nodo.type === 'icon') icono.innerHTML = iconoSvg(nodo.content.name, 14); // en capas se ve el icono elegido
    else icono.textContent = ICONOS[nodo.type] ?? '·';
    const nombre = document.createElement('span');
    nombre.textContent = nodo.name;
    nombre.title = nodo.name;

    const dup = document.createElement('button');
    dup.textContent = '⧉';
    dup.title = tr('comun.duplicar');
    dup.addEventListener('click', (e) => { e.stopPropagation(); duplicateNode(nodo.id); });

    const borrar = document.createElement('button');
    borrar.textContent = '✕';
    borrar.title = tr('comun.borrar');
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
      arbol.innerHTML = `<li class="vacio">${tr('lateral.sinSecciones')}</li>`;
      return;
    }
    const recorrer = (nodos, nivel) => nodos.forEach((n) => {
      arbol.appendChild(fila(n, nivel, selectedId));
      if (n.children.length && !plegados.has(n.id)) recorrer(n.children, nivel + 1);
    });
    recorrer(page.children, 0);
  }

  subscribe(() => { dibujar(); actualizarHint(); marcarPagina(); });
  dibujar();
  actualizarHint();
  marcarPagina();
}

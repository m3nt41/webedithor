// TIRADORES DE ESPACIADO: capa del EDITOR sobre el preview (hermana del .stage, nunca dentro del árbol renderizado).
// Con un nodo seleccionado muestra 4 tiradores (arriba, derecha, abajo, izquierda):
//   - section / container -> cambian el PADDING.   - heading / text / button / image / icon -> cambian el MARGIN.
//   - Un botoncito ("Padding" / "Margen") junto al nodo cambia de modo para ese nodo.
// Arrastrar escribe el atajo `padding`/`margin` con setEstilosGesto (base en escritorio, mobile en móvil), todo el arrastre = 1 undo.
// Shift = mismo valor en el lado opuesto · Alt = los 4 lados · Ctrl = imán a múltiplos de 8 · mínimo 0.
// Pointer Events + setPointerCapture (MDN): el arrastre sigue aunque el mouse salga del tirador.
// Como esta capa no está en el árbol, no entra al export ni a la Vista previa (iframe) ni recibe los efectos hover/parallax.

import { getState, subscribe, setEstilosGesto } from '../core/store.js';
import { effectiveStyles } from '../render/renderer.js';
import { findNode } from '../core/tree.js';
import { LADOS, tokensEfectivos, componer, largas, ladosAfectados, ajustarValor, aplicarValor, nombreLado } from './espaciado.js';

const CONTENEDORES = ['section', 'container'];
const modoPorDefecto = (tipo) => (CONTENEDORES.includes(tipo) ? 'padding' : 'margin');

export function initTiradores(host, stage) {
  const capa = document.createElement('div');
  capa.className = 'tir-capa';
  capa.hidden = true;
  host.appendChild(capa);

  const sombras = [0, 1, 2, 3].map((i) => crear('div', 'tir-sombra', { 'data-lado': nombreLado(i) }));
  const manijas = [0, 1, 2, 3].map((i) => crear('div', 'tir-h', { 'data-lado': nombreLado(i), title: 'Arrastra · Shift = lado opuesto · Alt = 4 lados · Ctrl = múltiplos de 8' }));
  const etiquetas = [0, 1, 2, 3].map((i) => crear('div', 'tir-et', { 'data-lado': nombreLado(i) }));
  const boton = crear('button', 'tir-modo', { type: 'button' });
  capa.append(...sombras, ...manijas, ...etiquetas, boton);
  sombras.forEach((s) => (s.hidden = true));
  etiquetas.forEach((e) => (e.hidden = true));

  const modos = new Map(); // id -> 'padding' | 'margin' elegido a mano (solo en memoria)
  let arrastre = null;      // estado del arrastre en curso
  let pendiente = 0;

  function crear(tag, clase, attrs = {}) {
    const el = document.createElement(tag);
    el.className = clase;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  const nodoActual = () => {
    const { page, selectedId } = getState();
    const n = selectedId && selectedId !== page.id ? findNode(page, selectedId) : null;
    return n;
  };
  const modoDe = (n) => modos.get(n.id) ?? modoPorDefecto(n.type);
  const elDe = (id) => stage.querySelector(`[data-id="${id}"]`);
  const px = (v) => parseFloat(v) || 0;
  const editandoTexto = () => !!document.activeElement?.isContentEditable;

  // Medidas del elemento en coordenadas de la capa (que scrollea con el preview).
  function medir(el, prop) {
    const hr = host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const ox = hr.left - host.scrollLeft + host.clientLeft;
    const oy = hr.top - host.scrollTop + host.clientTop;
    const vals = LADOS.map((l) => px(cs[prop + l]));
    const borde = LADOS.map((l) => px(cs['border' + l + 'Width']));
    return { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, vals, borde };
  }

  /** Coloca sombras y tiradores. `valores` (opcional) = valores en vivo del arrastre; si no, los medidos. */
  function colocar() {
    pendiente = 0;
    const n = nodoActual();
    const el = n && elDe(n.id);
    if (!n || !el || editandoTexto()) { capa.hidden = true; return; }
    const prop = modoDe(n);
    const m = medir(el, prop);
    if (!m.w && !m.h) { capa.hidden = true; return; }
    capa.hidden = false;
    capa.dataset.modo = prop;
    const [t, r, b, l] = m.vals;
    const [bt, br, bb, bl] = m.borde;
    const dentro = prop === 'padding';

    // Zona de cada lado: padding = banda por dentro del borde; margin = banda por fuera.
    const X = m.x, Y = m.y, W = m.w, H = m.h;
    const zonas = dentro
      ? [
          { x: X + bl, y: Y + bt, w: W - bl - br, h: t },
          { x: X + W - br - r, y: Y + bt + t, w: r, h: H - bt - bb - t - b },
          { x: X + bl, y: Y + H - bb - b, w: W - bl - br, h: b },
          { x: X + bl, y: Y + bt + t, w: l, h: H - bt - bb - t - b },
        ]
      : [
          { x: X, y: Y - t, w: W, h: t },
          { x: X + W, y: Y, w: r, h: H },
          { x: X, y: Y + H, w: W, h: b },
          { x: X - l, y: Y, w: l, h: H },
        ];
    zonas.forEach((z, i) => {
      const s = sombras[i];
      s.style.cssText = `left:${z.x}px;top:${z.y}px;width:${Math.max(0, z.w)}px;height:${Math.max(0, z.h)}px`;
    });

    // Tirador: en el borde interior de la banda (padding) o en el borde exterior (margin), centrado en el lado.
    const cx = X + W / 2, cy = Y + H / 2;
    const largo = (len) => Math.max(14, Math.min(40, len * 0.5));
    const pos = [
      { x: cx, y: dentro ? Y + bt + t : Y - t, h: true, len: largo(W) },
      { x: dentro ? X + W - br - r : X + W + r, y: cy, h: false, len: largo(H) },
      { x: cx, y: dentro ? Y + H - bb - b : Y + H + b, h: true, len: largo(W) },
      { x: dentro ? X + bl + l : X - l, y: cy, h: false, len: largo(H) },
    ];
    pos.forEach((p, i) => {
      const mz = manijas[i];
      mz.classList.toggle('horiz', p.h);
      mz.classList.toggle('vert', !p.h);
      const ancho = p.h ? p.len : 8, alto = p.h ? 8 : p.len;
      mz.style.cssText = `left:${p.x - ancho / 2}px;top:${p.y - alto / 2}px;width:${ancho}px;height:${alto}px`;
      const et = etiquetas[i];
      // la etiqueta va hacia afuera del tirador (arriba/abajo/izquierda/derecha según el lado)
      const dx = i === 1 ? 10 : i === 3 ? -10 : 0, dy = i === 0 ? -10 : i === 2 ? 10 : 0;
      et.style.left = `${p.x + dx}px`; et.style.top = `${p.y + dy}px`;
    });

    // Botón de modo, arriba a la izquierda del nodo (por encima de su margen superior)
    boton.textContent = prop === 'padding' ? 'Padding' : 'Margen';
    boton.title = 'Cambiar entre padding y margen · vista ' + (getState().viewMode === 'mobile' ? 'móvil' : 'escritorio');
    boton.style.left = `${Math.max(0, X)}px`;
    boton.style.top = `${Math.max(0, Y - (dentro ? 0 : t) - 24)}px`;
  }

  function programar() { if (!pendiente) pendiente = requestAnimationFrame(colocar); }

  // ---- Arrastre ----
  manijas.forEach((mz, lado) => {
    mz.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || arrastre) return;
      const n = nodoActual(); const el = n && elDe(n.id);
      if (!n || !el) return;
      e.preventDefault(); e.stopPropagation();
      const prop = modoDe(n);
      const cs = getComputedStyle(el);
      const inicioPx = LADOS.map((l) => px(cs[prop + l]));
      const tokens = tokensEfectivos(effectiveStyles(n, getState().viewMode), prop);
      arrastre = { id: n.id, prop, lado, tokens, inicioPx, x0: e.clientX, y0: e.clientY, clave: `gesto:tirador:${n.id}:${Date.now()}`, afectados: [lado], valor: inicioPx[lado], cx: e.clientX, cy: e.clientY, mods: { shift: e.shiftKey || teclas.shift, alt: e.altKey || teclas.alt, ctrl: e.ctrlKey || teclas.ctrl } };
      mz.setPointerCapture(e.pointerId);
      mz.classList.add('activo');
      programar();
    });

    mz.addEventListener('pointermove', (e) => {
      if (!arrastre || arrastre.lado !== lado) return;
      arrastre.cx = e.clientX; arrastre.cy = e.clientY;
      arrastre.mods = { shift: e.shiftKey || teclas.shift, alt: e.altKey || teclas.alt, ctrl: e.ctrlKey || teclas.ctrl };
      aplicarArrastre();
    });

    const fin = () => {
      if (!arrastre || arrastre.lado !== lado) return;
      arrastre = null;
      mz.classList.remove('activo');
      sombras.forEach((s) => (s.hidden = true));
      etiquetas.forEach((x) => (x.hidden = true));
      programar();
    };
    mz.addEventListener('pointerup', fin);
    mz.addEventListener('pointercancel', fin);
    mz.addEventListener('lostpointercapture', fin);
  });

  // Modificadores: se leen del evento Y de keydown/keyup del documento, así Shift/Alt/Ctrl también cuentan si se pulsan
  // a mitad del arrastre sin mover el mouse (y no dependen de que el navegador los copie a cada pointermove).
  const teclas = { shift: false, alt: false, ctrl: false };
  function aplicarArrastre() {
    const a = arrastre;
    if (!a) return;
    // Cuánto se movió el mouse en el eje del tirador. Padding: hacia adentro del nodo suma; margin: hacia afuera suma.
    const eje = a.lado % 2 === 0 ? a.cy - a.y0 : a.cx - a.x0;
    const sentido = (a.lado === 0 || a.lado === 3 ? 1 : -1) * (a.prop === 'padding' ? 1 : -1);
    const valor = ajustarValor(a.inicioPx[a.lado] + sentido * eje, { ctrl: a.mods.ctrl });
    const afectados = ladosAfectados(a.lado, { shift: a.mods.shift, alt: a.mods.alt });
    a.valor = valor; a.afectados = afectados;
    mostrarVivo();
    // Nada se escribe mientras no haya un cambio real (un clic sin mover no toca el árbol ni crea paso de undo)
    if (!a.escrito && afectados.every((i) => valor === Math.round(a.inicioPx[i]))) return;
    a.escrito = true;
    const nuevos = aplicarValor(a.tokens, a.inicioPx, afectados, valor);
    setEstilosGesto(a.id, { [a.prop]: componer(nuevos) }, largas(a.prop), a.clave);
  }
  const alTecla = (e) => {
    const abajo = e.type === 'keydown';
    if (e.key === 'Shift') teclas.shift = abajo;
    else if (e.key === 'Alt') { teclas.alt = abajo; if (arrastre) e.preventDefault(); } // Alt suelto no debe enfocar el menú del navegador
    else if (e.key === 'Control') teclas.ctrl = abajo;
    else return;
    if (arrastre) { arrastre.mods = { shift: teclas.shift, alt: teclas.alt, ctrl: teclas.ctrl }; aplicarArrastre(); }
  };
  document.addEventListener('keydown', alTecla);
  document.addEventListener('keyup', alTecla);
  addEventListener('blur', () => { teclas.shift = teclas.alt = teclas.ctrl = false; });

  /** Durante el arrastre: sombrea la zona que cambia y escribe el valor en px junto a cada tirador afectado. */
  function mostrarVivo() {
    if (!arrastre) return;
    sombras.forEach((s, i) => (s.hidden = !arrastre.afectados.includes(i)));
    etiquetas.forEach((x, i) => {
      x.hidden = !arrastre.afectados.includes(i);
      x.textContent = `${arrastre.valor}px`;
    });
  }

  // Modo padding <-> margen del nodo seleccionado
  boton.addEventListener('click', () => {
    const n = nodoActual();
    if (!n) return;
    modos.set(n.id, modoDe(n) === 'padding' ? 'margin' : 'padding');
    colocar();
  });
  // Que un clic en la capa no llegue al preview ni cambie la selección (la capa está fuera del .stage, pero por si acaso)
  capa.addEventListener('click', (e) => e.stopPropagation());

  // ---- Cuándo recolocar ----
  subscribe((_, cambio) => {
    if (cambio === 'text') return;
    if (cambio === 'page' || cambio === 'selection' || cambio === 'view' || cambio === 'verestado') { colocar(); mostrarVivo(); }
  });
  host.addEventListener('focusin', programar);   // editar texto directo oculta los tiradores
  host.addEventListener('focusout', () => setTimeout(programar, 0));
  new ResizeObserver(programar).observe(host);
  new ResizeObserver(programar).observe(stage);
  addEventListener('resize', programar);
  document.fonts?.ready.then(programar);
  colocar();
}

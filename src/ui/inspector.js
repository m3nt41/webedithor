// INSPECTOR (derecha): edita el nodo seleccionado.
// - Contenido (texto, enlace, imagen) + grupos de estilos definidos en fields.js.
// - Cada cambio llama a setStyle/setContent del store; el preview se redibuja.
// - Para no perder el foco al escribir, NO se reconstruye el panel en cambios de
//   página mientras el foco está dentro (salvo que cambie la selección o un
//   select altere qué campos se muestran: ahí se fuerza).

import { getState, subscribe, setStyle, setContent, setName } from '../core/store.js';
import { findNode } from '../core/tree.js';
import { effectiveStyles, TIPOS_TEXTO } from '../render/renderer.js';
import { GRUPOS } from './fields.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** '#abc' -> '#aabbcc'; si no es hex devuelve null (el picker no admite rgba/gradientes). */
function aHex(v) {
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
  return null;
}

export function initInspector(host) {
  let idDibujado = null; // id del nodo para el que está construido el panel
  let forzar = false; // un select pidió reconstruir el panel

  function dibujar() {
    const { page, selectedId, viewMode } = getState();
    const nodo = selectedId ? findNode(page, selectedId) : null;
    idDibujado = nodo?.id ?? null;
    if (!nodo) {
      host.innerHTML = '<h2>Propiedades</h2><p class="vacio">Haz clic en un elemento del preview.<br><br>Doble clic en un texto para escribir directamente.</p>';
      return;
    }
    const estilos = effectiveStyles(nodo, viewMode);

    let html = `<h2>Propiedades</h2>
      <div class="campo"><label>Nombre</label><input data-name value="${esc(nodo.name)}"></div>
      <p class="modo">${nodo.type} · editando <strong>${viewMode === 'mobile' ? 'móvil' : 'escritorio'}</strong></p>`;

    // ---- Contenido ----
    const c = nodo.content;
    let cont = '';
    if (nodo.type === 'page') cont += `<div class="campo"><label>Título</label><input data-c="title" value="${esc(c.title)}"></div>`;
    if (TIPOS_TEXTO.includes(nodo.type)) cont += `<div class="campo"><label>Texto</label><textarea data-c="text" rows="3">${esc(c.text)}</textarea></div>`;
    if (nodo.type === 'heading') {
      cont += `<div class="campo"><label>Nivel</label><select data-c="level" data-num>${[1, 2, 3, 4].map((n) => `<option value="${n}" ${+c.level === n ? 'selected' : ''}>H${n}</option>`).join('')}</select></div>`;
    }
    if (nodo.type === 'button') cont += `<div class="campo"><label>Enlace</label><input data-c="href" value="${esc(c.href)}" placeholder="https://wa.me/506..."></div>`;
    if (nodo.type === 'image') {
      cont += `<div class="campo"><label>URL</label><input data-c="src" value="${esc(c.src?.startsWith('data:') ? '' : c.src)}" placeholder="https://..."></div>
        <div class="campo"><label>Archivo</label><input type="file" accept="image/*" data-file></div>
        <div class="campo"><label>Alt</label><input data-c="alt" value="${esc(c.alt)}"></div>`;
    }
    if (cont) html += `<h3>Contenido</h3>${cont}`;

    // ---- Estilos ----
    for (const g of GRUPOS) {
      if (!g.tipos.includes(nodo.type)) continue;
      const visibles = g.campos.filter((f) => !f.cuando || f.cuando(estilos));
      html += `<h3>${g.titulo}</h3>`;
      for (const f of visibles) {
        const v = estilos[f.key] ?? '';
        if (f.kind === 'select') {
          const opts = f.options.map(([val, txt]) => `<option value="${esc(val)}" ${val === String(v) ? 'selected' : ''}>${txt}</option>`).join('');
          html += `<div class="campo"><label>${f.label}</label><select data-s="${f.key}">${opts}</select></div>`;
        } else if (f.kind === 'color') {
          html += `<div class="campo"><label>${f.label}</label><span class="color"><input type="color" data-pick="${f.key}" value="${aHex(v) ?? '#000000'}"><input data-s="${f.key}" value="${esc(v)}" placeholder="#ffffff"></span></div>`;
        } else {
          html += `<div class="campo"><label>${f.label}</label><input data-s="${f.key}" value="${esc(v)}" placeholder="${esc(f.placeholder)}"></div>`;
        }
      }
    }

    // JSON del nodo, plegado (útil para depurar)
    const { children, ...resto } = nodo;
    html += `<details><summary>JSON del nodo</summary><pre>${esc(JSON.stringify(resto, null, 2))}</pre></details>`;
    host.innerHTML = html;
  }

  // ---- Eventos (delegados: un solo listener para todo el panel) ----
  host.addEventListener('input', (e) => {
    const t = e.target;
    const id = idDibujado;
    if (!id) return;
    if (t.dataset.name !== undefined) setName(id, t.value);
    else if (t.dataset.c) setContent(id, t.dataset.c, t.dataset.num !== undefined ? +t.value : t.value);
    else if (t.dataset.pick) {
      // el selector de color rellena la caja de texto vecina
      t.nextElementSibling.value = t.value;
      setStyle(id, t.dataset.pick, t.value);
    } else if (t.dataset.s) {
      const pick = t.previousElementSibling;
      if (pick?.dataset.pick && aHex(t.value)) pick.value = aHex(t.value);
      setStyle(id, t.dataset.s, t.value.trim());
    }
  });

  host.addEventListener('change', (e) => {
    const t = e.target;
    if (t.tagName === 'SELECT' && t.dataset.c) return; // ya manejado en 'input'
    if (t.tagName === 'SELECT' && t.dataset.s) forzar = true; // puede mostrar/ocultar campos
    if (t.dataset.file !== undefined && t.files[0]) {
      const lector = new FileReader();
      lector.onload = () => { forzar = true; setContent(idDibujado, 'src', lector.result); };
      lector.readAsDataURL(t.files[0]);
    }
  });

  subscribe((state, cambio) => {
    if (cambio === 'selection') return dibujar();
    if (cambio === 'text') return; // se escribe en el preview: no tocar el panel
    // Cambio de página: reconstruir solo si cambió el nodo, o se forzó, o el foco no está aquí
    const enfocado = host.contains(document.activeElement) && document.activeElement !== host;
    if (forzar || state.selectedId !== idDibujado || !enfocado) {
      forzar = false;
      dibujar();
    }
  });

  // Cuando se escribe en el preview, refresca la caja de "Texto" del panel
  subscribe((state, cambio) => {
    if (cambio !== 'text') return;
    const nodo = state.selectedId && findNode(state.page, state.selectedId);
    const area = host.querySelector('textarea[data-c="text"]');
    if (nodo && area && document.activeElement !== area) area.value = nodo.content.text ?? '';
  });

  dibujar();
}

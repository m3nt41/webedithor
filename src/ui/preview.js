// PREVIEW (centro): dibuja la página, selecciona con clic y edita texto con doble clic.
// - Cambia la página  -> se re-renderiza todo (simple y suficiente por ahora).
// - Cambia selección  -> solo se marca/desmarca la clase .sel (no re-renderiza).
// - Mientras se escribe (cambio 'text') NO se re-renderiza, para no perder el cursor.

import { getState, subscribe, select, setContent, refresh } from '../core/store.js';
import { renderNode, TIPOS_TEXTO } from '../render/renderer.js';

export function initPreview(host) {
  // 'stage' es la "pantalla"; en la Etapa 3 cambiará de ancho (móvil/escritorio)
  const stage = document.createElement('div');
  stage.className = 'stage';
  host.appendChild(stage);

  function dibujar() {
    const { page, viewMode } = getState();
    stage.classList.toggle('movil', viewMode === 'mobile'); // ancho 390px en vista móvil
    stage.replaceChildren(renderNode(page, viewMode));
    marcarSeleccion();
  }

  function marcarSeleccion() {
    stage.querySelectorAll('.sel').forEach((el) => el.classList.remove('sel'));
    const { selectedId } = getState();
    if (selectedId) stage.querySelector(`[data-id="${selectedId}"]`)?.classList.add('sel');
  }

  // ---- Edición directa de texto ----
  function editar(el) {
    if (el.isContentEditable) return;
    // 'plaintext-only' evita pegar HTML ajeno; si el navegador no lo soporta, cae a 'true'
    el.contentEditable = 'plaintext-only';
    if (!el.isContentEditable) el.contentEditable = 'true';
    el.focus();
    // cursor al final
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);

    const id = el.dataset.id;
    const alEscribir = () => setContent(id, 'text', el.textContent, 'text');
    const alTerminar = () => {
      el.removeEventListener('input', alEscribir);
      el.removeEventListener('blur', alTerminar);
      el.removeEventListener('keydown', alTecla);
      el.removeAttribute('contenteditable');
      refresh(); // redibuja limpio con el texto ya guardado
    };
    const alTecla = (e) => {
      // Enter termina la edición en títulos y botones; en párrafos hace salto de línea
      if (e.key === 'Escape' || (e.key === 'Enter' && el.dataset.type !== 'text')) {
        e.preventDefault();
        el.blur();
      }
    };
    el.addEventListener('input', alEscribir);
    el.addEventListener('blur', alTerminar);
    el.addEventListener('keydown', alTecla);
  }

  // Clic: selecciona el elemento más profundo bajo el cursor.
  stage.addEventListener('click', (e) => {
    e.preventDefault(); // evita seguir enlaces de los botones
    if (e.target.isContentEditable) return; // clic dentro del texto que se edita
    const el = e.target.closest('[data-id]');
    const id = el?.dataset.id;
    // Clic en la raíz o en el vacío = deseleccionar
    select(id && el.dataset.type !== 'page' ? id : null);
  });

  stage.addEventListener('dblclick', (e) => {
    const el = e.target.closest('[data-id]');
    if (el && TIPOS_TEXTO.includes(el.dataset.type)) {
      select(el.dataset.id);
      editar(el);
    }
  });

  // Hover: resalta lo que se va a seleccionar
  stage.addEventListener('mouseover', (e) => {
    stage.querySelector('.hov')?.classList.remove('hov');
    const el = e.target.closest('[data-id]');
    if (el && el.dataset.type !== 'page') el.classList.add('hov');
  });
  stage.addEventListener('mouseleave', () => stage.querySelector('.hov')?.classList.remove('hov'));

  subscribe((_, cambio) => {
    if (cambio === 'selection') marcarSeleccion();
    else if (cambio === 'page' || cambio === 'view') dibujar();
    // 'text': no hacer nada
  });
  dibujar();
}

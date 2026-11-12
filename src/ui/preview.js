// PREVIEW (centro): dibuja la página y gestiona la selección con clic.
// - Cambia la página  -> se re-renderiza todo (simple y suficiente por ahora).
// - Cambia selección  -> solo se marca/desmarca la clase .sel (no re-renderiza).

import { getState, subscribe, select } from '../core/store.js';
import { renderNode } from '../render/renderer.js';

export function initPreview(host) {
  // 'stage' es la "pantalla"; en la Etapa 3 cambiará de ancho (móvil/escritorio)
  const stage = document.createElement('div');
  stage.className = 'stage';
  host.appendChild(stage);

  function dibujar() {
    const { page, viewMode } = getState();
    stage.replaceChildren(renderNode(page, viewMode));
    marcarSeleccion();
  }

  function marcarSeleccion() {
    stage.querySelectorAll('.sel').forEach((el) => el.classList.remove('sel'));
    const { selectedId } = getState();
    if (selectedId) stage.querySelector(`[data-id="${selectedId}"]`)?.classList.add('sel');
  }

  // Clic: selecciona el elemento más profundo bajo el cursor.
  stage.addEventListener('click', (e) => {
    e.preventDefault(); // evita seguir enlaces de los botones
    const el = e.target.closest('[data-id]');
    const id = el?.dataset.id;
    // Clic en la raíz o en el vacío = deseleccionar
    select(id && el.dataset.type !== 'page' ? id : null);
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
    else dibujar();
  });
  dibujar();
}

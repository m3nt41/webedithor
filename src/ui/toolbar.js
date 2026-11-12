// BARRA SUPERIOR. Etapa 2: solo "Exportar HTML".
// Etapa 3 añadirá aquí: escritorio/móvil, undo/redo, guardar/abrir JSON.

import { getState } from '../core/store.js';
import { exportHTML, descargar } from '../export/exporter.js';

export function initToolbar(host) {
  host.innerHTML = `
    <strong class="marca">Editor de landings</strong>
    <span class="espacio"></span>
    <button id="btn-exportar" class="primario">Exportar HTML</button>
  `;
  host.querySelector('#btn-exportar').addEventListener('click', () => {
    descargar('landing.html', exportHTML(getState().page));
  });
}

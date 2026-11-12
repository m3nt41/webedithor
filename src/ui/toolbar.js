// BARRA SUPERIOR: deshacer/rehacer, escritorio/móvil, nuevo/abrir/guardar JSON, exportar HTML.
// También registra los atajos Ctrl+Z / Ctrl+Y (o Ctrl+Shift+Z).

import { getState, subscribe, undo, redo, puedeDeshacer, puedeRehacer, setViewMode, replacePage, newPage } from '../core/store.js';
import { exportHTML, descargar } from '../export/exporter.js';

export function initToolbar(host) {
  host.innerHTML = `
    <strong class="marca">Editor de landings</strong>
    <button id="btn-undo" title="Deshacer (Ctrl+Z)">↶</button>
    <button id="btn-redo" title="Rehacer (Ctrl+Y)">↷</button>
    <span class="grupo">
      <button id="vista-desktop" title="Vista escritorio">🖥 Escritorio</button>
      <button id="vista-mobile" title="Vista móvil (los cambios se guardan solo para móvil)">📱 Móvil</button>
    </span>
    <span class="espacio"></span>
    <button id="btn-nuevo">Nuevo</button>
    <button id="btn-abrir">Abrir JSON</button>
    <button id="btn-guardar">Guardar JSON</button>
    <button id="btn-exportar" class="primario">Exportar HTML</button>
    <input type="file" id="archivo-json" accept=".json,application/json" hidden>
  `;
  const $ = (s) => host.querySelector(s);

  $('#btn-undo').addEventListener('click', undo);
  $('#btn-redo').addEventListener('click', redo);
  $('#vista-desktop').addEventListener('click', () => setViewMode('desktop'));
  $('#vista-mobile').addEventListener('click', () => setViewMode('mobile'));

  $('#btn-nuevo').addEventListener('click', () => {
    if (confirm('¿Empezar una página nueva? (Puedes deshacerlo con Ctrl+Z)')) newPage();
  });

  $('#btn-guardar').addEventListener('click', () => {
    const { page } = getState();
    const nombre = (page.content.title || 'landing').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'landing';
    const datos = { app: 'editor-landings', version: 1, page };
    descargar(`${nombre}.json`, JSON.stringify(datos, null, 2), 'application/json');
  });

  $('#btn-abrir').addEventListener('click', () => $('#archivo-json').click());
  $('#archivo-json').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    e.target.value = ''; // permite volver a abrir el mismo archivo
    if (!archivo) return;
    try {
      const datos = JSON.parse(await archivo.text());
      replacePage(datos.page ?? datos); // acepta el formato con envoltorio o la página sola
    } catch (err) {
      alert(`No se pudo abrir el archivo: ${err.message}`);
    }
  });

  $('#btn-exportar').addEventListener('click', () => {
    descargar('landing.html', exportHTML(getState().page));
  });

  // Atajos de teclado. Dentro de un campo de texto se deja el undo nativo del navegador.
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
  });

  // Estado de los botones (deshabilitados si no hay nada que deshacer, vista activa)
  function actualizar() {
    $('#btn-undo').disabled = !puedeDeshacer();
    $('#btn-redo').disabled = !puedeRehacer();
    const movil = getState().viewMode === 'mobile';
    $('#vista-desktop').classList.toggle('activo', !movil);
    $('#vista-mobile').classList.toggle('activo', movil);
  }
  subscribe(actualizar);
  actualizar();
}

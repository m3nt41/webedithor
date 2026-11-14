// BARRA SUPERIOR: deshacer/rehacer, escritorio/móvil, nuevo/abrir/guardar JSON, exportar HTML.
// También registra los atajos Ctrl+Z / Ctrl+Y (o Ctrl+Shift+Z).

import { getState, subscribe, undo, redo, puedeDeshacer, puedeRehacer, setViewMode, replacePage, newPage } from '../core/store.js';
import { exportHTML, descargar } from '../export/exporter.js';
import { abrirVistaPrevia } from './vistaprevia.js';

// Iconos de línea fina (mismo estilo que las pestañas del panel izquierdo), 18px.
const ico = (d) => `<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const SVG_ESCRITORIO = ico('<rect x="2" y="2.5" width="14" height="9.5" rx="1.2"/><path d="M9 12v3M5.8 15.5h6.4"/>');
const SVG_MOVIL = ico('<rect x="5" y="1.8" width="8" height="14.4" rx="2"/><path d="M8 13.7h2"/>');
const SVG_OJO = ico('<path d="M1.5 9S4.3 4 9 4s7.5 5 7.5 5-2.8 5-7.5 5S1.5 9 1.5 9Z"/><circle cx="9" cy="9" r="2.2"/>');

export function initToolbar(host) {
  host.innerHTML = `
    <strong class="marca">Editor de landings</strong>
    <button id="btn-undo" title="Deshacer (Ctrl+Z)">↶</button>
    <button id="btn-redo" title="Rehacer (Ctrl+Y)">↷</button>
    <span class="grupo" role="group" aria-label="Modo de edición">
      <button id="vista-desktop" class="ico-btn" title="Escritorio" aria-label="Escritorio" aria-pressed="true">${SVG_ESCRITORIO}</button>
      <button id="vista-mobile" class="ico-btn" title="Móvil" aria-label="Móvil" aria-pressed="false">${SVG_MOVIL}</button>
    </span>
    <span class="divisor" aria-hidden="true"></span>
    <button id="btn-vista-previa" class="ico-btn" title="Vista previa (Esc para cerrar)" aria-label="Vista previa">${SVG_OJO}</button>
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
  $('#btn-vista-previa').addEventListener('click', abrirVistaPrevia);
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
    $('#vista-desktop').setAttribute('aria-pressed', String(!movil));
    $('#vista-mobile').setAttribute('aria-pressed', String(movil));
  }
  subscribe(actualizar);
  actualizar();
}

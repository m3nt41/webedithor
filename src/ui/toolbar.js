// BARRA SUPERIOR: deshacer/rehacer, escritorio/móvil, nuevo/abrir/guardar JSON, exportar HTML.
// También registra los atajos Ctrl+Z / Ctrl+Y (o Ctrl+Shift+Z).

import { getState, subscribe, undo, redo, puedeDeshacer, puedeRehacer, setViewMode, replacePage, newPage } from '../core/store.js';
import { exportHTML, descargar } from '../export/exporter.js';
import { abrirVistaPrevia } from './vistaprevia.js';
import { toast } from './plania.js';
import { avisoQuitados } from '../core/seguridad.js';

import { tiradoresEncendidos, alternarTiradores, alCambiarTiradores } from './tiradores-pref.js';
import { SVG_TIRADORES, SVG_ESCRITORIO, SVG_MOVIL, SVG_OJO, SVG_DESHACER, SVG_REHACER } from './iconos.js'; // iconos compartidos con la Vista previa

export function initToolbar(host) {
  host.innerHTML = `
    <strong class="marca">Editor de landings</strong>
    <button id="btn-undo" class="ico-btn" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">${SVG_DESHACER}</button>
    <button id="btn-redo" class="ico-btn" title="Rehacer (Ctrl+Y)" aria-label="Rehacer">${SVG_REHACER}</button>
    <span class="grupo" role="group" aria-label="Modo de edición">
      <button id="vista-desktop" class="ico-btn" title="Escritorio" aria-label="Escritorio" aria-pressed="true">${SVG_ESCRITORIO}</button>
      <button id="vista-mobile" class="ico-btn" title="Móvil" aria-label="Móvil" aria-pressed="false">${SVG_MOVIL}</button>
    </span>
    <span class="divisor" aria-hidden="true"></span>
    <button id="btn-vista-previa" class="ico-btn" title="Vista previa (Esc para cerrar)" aria-label="Vista previa">${SVG_OJO}</button>
    <button id="btn-tiradores" class="ico-btn" aria-pressed="true">${SVG_TIRADORES}</button>
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
  $('#btn-tiradores').addEventListener('click', alternarTiradores);
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
      const quitados = replacePage(datos.page ?? datos); // acepta el formato con envoltorio o la página sola
      if (quitados > 0) toast(avisoQuitados(quitados), true, 9000); // largo: es un aviso de seguridad
    } catch (err) {
      alert(`No se pudo abrir el archivo: ${err.message}`);
    }
  });

  $('#btn-exportar').addEventListener('click', () => {
    descargar('landing.html', exportHTML(getState().page));
  });

  // Estado visible del interruptor de tiradores (botón morado = encendido; apagado = botón normal con la rayita)
  function pintarTiradores() {
    const on = tiradoresEncendidos();
    const b = $('#btn-tiradores');
    b.classList.toggle('activo', on);
    b.setAttribute('aria-pressed', String(on));
    const t = 'Tiradores de espaciado: ' + (on ? 'encendidos' : 'apagados') + ' (T)';
    b.title = t; b.setAttribute('aria-label', t);
  }
  alCambiarTiradores(pintarTiradores);
  pintarTiradores();

  // Atajo T (sin modificadores) = encender/apagar tiradores. Libre: no choca con Supr, Ctrl+Z/Y/D, Alt+flechas ni Ctrl+Alt+C/V,
  // y sin Ctrl/Alt/Meta no es atajo del navegador (Ctrl+T sería "pestaña nueva"; la T sola no hace nada en Firefox ni Chrome).
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 't' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
    const t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault();
    alternarTiradores();
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

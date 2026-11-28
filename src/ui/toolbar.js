// BARRA SUPERIOR: deshacer/rehacer, escritorio/móvil, nuevo/abrir/guardar JSON, exportar HTML.
// También registra los atajos Ctrl+Z / Ctrl+Y (o Ctrl+Shift+Z).

import { t as tr, idioma, IDIOMAS, NOMBRES, guardarIdioma } from '../i18n/index.js';
import { getState, subscribe, undo, redo, puedeDeshacer, puedeRehacer, setViewMode, replacePage, newPage } from '../core/store.js';
import { exportHTML, descargar } from '../export/exporter.js';
import { abrirVistaPrevia } from './vistaprevia.js';
import { toast } from './plania.js';
import { avisoQuitados } from '../core/seguridad.js';
import { PAGINA_DEMO } from '../core/demo.js';

import { tiradoresEncendidos, alternarTiradores, alCambiarTiradores } from './tiradores-pref.js';
import { SVG_TIRADORES, SVG_OJO, SVG_DESHACER, SVG_REHACER } from './iconos.js'; // iconos compartidos con la Vista previa

// La T del nombre en forma de rayo: se dibuja ENCIMA de la letra "T", que queda transparente (el texto sigue diciendo WebEdiThor).
// Polígono = la silueta; path = el borde claro de la barra de arriba. Tamaño y posición: .rayo-t en app.css.
const SVG_RAYO_T = '<svg viewBox="0 0 126.4 175.6" aria-hidden="true"><polygon points="16,0 126.4,0 111,28 83.6,28 62.8,71.6 93,71.6 24.6,175.6 44.6,99.2 15.2,99.2 49,28 0,28"/><path d="M0 28 16 0H126.4L111 28"/></svg>';

export function initToolbar(host) {
  host.innerHTML = `
    <strong class="marca">WebEdi<span class="rayo-t">T${SVG_RAYO_T}</span>hor</strong>
    <button id="btn-undo" class="ico-btn" title="${tr('barra.deshacerTitulo')}" aria-label="${tr('barra.deshacer')}">${SVG_DESHACER}</button>
    <button id="btn-redo" class="ico-btn" title="${tr('barra.rehacerTitulo')}" aria-label="${tr('barra.rehacer')}">${SVG_REHACER}</button>
    <span class="grupo" role="group" aria-label="${tr('barra.modoEdicion')}">
      <button id="vista-desktop" class="vista" title="${tr('comun.escritorio')}" aria-label="${tr('comun.escritorio')}" aria-pressed="true">${tr('comun.escritorio')}</button>
      <button id="vista-mobile" class="vista" title="${tr('comun.movil')}" aria-label="${tr('comun.movil')}" aria-pressed="false">${tr('comun.movil')}</button>
    </span>
    <span class="divisor" aria-hidden="true"></span>
    <button id="btn-vista-previa" class="ico-btn" title="${tr('barra.vistaPreviaTitulo')}" aria-label="${tr('comun.vistaPrevia')}">${SVG_OJO}</button>
    <button id="btn-tiradores" class="ico-btn" aria-pressed="true">${SVG_TIRADORES}</button>
    <span class="espacio"></span>
    <select id="sel-idioma" aria-label="Idioma / Language" title="Idioma / Language">
      ${Object.keys(IDIOMAS).map((c) => `<option value="${c}" ${c === idioma ? 'selected' : ''}>${NOMBRES[c]}</option>`).join('')}
    </select>
    ${PAGINA_DEMO ? `<button id="btn-demo">${tr('barra.verDemo')}</button>` : ''}
    <button id="btn-nuevo">${tr('barra.nuevo')}</button>
    <button id="btn-abrir">${tr('barra.abrir')}</button>
    <button id="btn-guardar">${tr('barra.guardar')}</button>
    <button id="btn-exportar" class="primario">${tr('barra.exportar')}</button>
    <input type="file" id="archivo-json" accept=".json,application/json" hidden>
  `;
  const $ = (s) => host.querySelector(s);

  // Idioma del editor: se guarda y se recarga la página (lo editado ya está autoguardado; el historial de deshacer empieza de cero)
  $('#sel-idioma').addEventListener('change', (e) => { if (guardarIdioma(e.target.value)) location.reload(); });
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-redo').addEventListener('click', redo);
  $('#btn-tiradores').addEventListener('click', alternarTiradores);
  $('#btn-vista-previa').addEventListener('click', abrirVistaPrevia);
  $('#vista-desktop').addEventListener('click', () => setViewMode('desktop'));
  $('#vista-mobile').addEventListener('click', () => setViewMode('mobile'));

  $('#btn-nuevo').addEventListener('click', () => {
    if (confirm(tr('barra.confirmaNueva'))) newPage();
  });

  // Solo en la demo web: recupera la landing de muestra (reemplaza la página, se deshace con Ctrl+Z)
  $('#btn-demo')?.addEventListener('click', () => {
    if (confirm(tr('barra.confirmaDemo'))) replacePage(structuredClone(PAGINA_DEMO));
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
      alert(tr('barra.errorAbrir', { error: err.message }));
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
    const titulo = tr(on ? 'barra.tiradoresOn' : 'barra.tiradoresOff');
    b.title = titulo; b.setAttribute('aria-label', titulo);
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
  // Un slider (input range) NO es un campo de texto: no tiene undo nativo, así que Ctrl+Z / Ctrl+Y llegan al editor.
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const t = e.target;
    if (t.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'range')) return;
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

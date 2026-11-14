// VISTA PREVIA: capa a pantalla completa con un iframe que muestra EXACTAMENTE el HTML exportado.
// - Se regenera cada vez que se abre (exportHTML(getState().page) -> srcdoc).
// - No toca el estado del editor.
// - ↻ Reiniciar: regenera el srcdoc (recarga el iframe desde el inicio, scroll arriba) para ver de nuevo las animaciones; conserva Escritorio/Móvil.
// - Móvil: el iframe mide 390px de ancho (así los @media y 100svh responden de verdad).
// - El ojo (activo) sustituye a la X: cae EXACTAMENTE sobre el ojo de la barra del editor (se mide con getBoundingClientRect) para abrir y cerrar sin mover el ratón.
// - Esc cierra, también cuando el foco está dentro del iframe (se escucha su teclado).

import { getState } from '../core/store.js';
import { exportHTML } from '../export/exporter.js';
import { SVG_ESCRITORIO, SVG_MOVIL, SVG_REINICIAR, SVG_OJO } from './iconos.js';

let capa = null;

export function vistaPreviaAbierta() { return !!capa; }

export function abrirVistaPrevia() {
  if (capa) return;
  capa = document.createElement('div');
  capa.id = 'vista-previa';
  capa.innerHTML = `
    <div class="vp-barra" role="toolbar" aria-label="Vista previa">
      <span class="vp-izq">
        <span class="grupo" role="group" aria-label="Modo de la vista previa">
          <button type="button" id="vp-desktop" class="ico-btn activo" title="Escritorio" aria-label="Escritorio" aria-pressed="true">${SVG_ESCRITORIO}</button>
          <button type="button" id="vp-mobile" class="ico-btn" title="Móvil" aria-label="Móvil" aria-pressed="false">${SVG_MOVIL}</button>
        </span>
        <span class="divisor" aria-hidden="true"></span>
      </span>
      <button type="button" id="vp-ojo" class="ico-btn activo" title="Salir de la vista previa (Esc)" aria-label="Salir de la vista previa (Esc)" aria-pressed="true">${SVG_OJO}</button>
      <span class="vp-der">
        <span class="divisor" aria-hidden="true"></span>
        <button type="button" id="vp-reiniciar" class="ico-btn" title="Reiniciar" aria-label="Reiniciar">${SVG_REINICIAR}</button>
      </span>
    </div>
    <div class="vp-escenario"><iframe id="vp-frame" title="Vista previa de la página"></iframe></div>
  `;
  document.body.appendChild(capa);
  const frame = capa.querySelector('#vp-frame');

  // Si el foco está dentro del iframe, sus teclas no llegan al documento: se escucha Esc dentro.
  frame.addEventListener('load', () => {
    mostrar(); // ya cargó: se hace visible (tras el siguiente frame, para que haya pintado)
    try {
      const doc = frame.contentDocument;
      doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarVistaPrevia(); });
      // Enlaces # (anclas del navbar): en un iframe con srcdoc el navegador los resuelve contra la URL del editor y
      // cargaría el editor dentro del iframe. Se atienden aquí: se desplaza al elemento (respeta scroll-margin-top) y nada más.
      // El HTML exportado no cambia: esto solo existe en la vista previa.
      doc.addEventListener('click', (e) => {
        const a = e.target.closest?.('a[href^="#"]');
        if (!a) return;
        e.preventDefault();
        const id = decodeURIComponent(a.getAttribute('href').slice(1));
        const destino = id ? doc.getElementById(id) : null;
        if (destino) destino.scrollIntoView(); else if (!id) frame.contentWindow.scrollTo(0, 0);
      });
    } catch { /* sin acceso: nada */ }
  });
  // Regenerar el srcdoc recarga el iframe entero (scroll en 0, animaciones de entrada y de scroll desde cero).
  // Mientras carga, el iframe queda con opacity 0 (sin fondo blanco a la vista); se muestra en 'load' o, si no llega, a los 1.5 s.
  let temporizador = 0;
  const mostrar = () => {
    clearTimeout(temporizador);
    requestAnimationFrame(() => frame.classList.add('listo'));
    temporizador = setTimeout(() => frame.classList.add('listo'), 60); // por si rAF no corre (pestaña oculta)
  };
  const cargar = () => {
    clearTimeout(temporizador);
    frame.classList.remove('listo');
    frame.srcdoc = exportHTML(getState().page);
    temporizador = setTimeout(() => frame.classList.add('listo'), 1500); // tope de seguridad si 'load' nunca llega
  };
  cargar();

  const modo = (movil) => {
    capa.classList.toggle('movil', movil);
    for (const [id, on] of [['#vp-desktop', !movil], ['#vp-mobile', movil]]) {
      const b = capa.querySelector(id);
      b.classList.toggle('activo', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };
  capa.querySelector('#vp-desktop').addEventListener('click', () => modo(false));
  capa.querySelector('#vp-mobile').addEventListener('click', () => modo(true));
  capa.querySelector('#vp-reiniciar').addEventListener('click', cargar); // el modo (clase .movil de la capa) no se toca
  capa.querySelector('#vp-ojo').addEventListener('click', cerrarVistaPrevia);

  // El ojo del overlay se coloca sobre el del editor (mismas coordenadas y tamaño); se re-mide al redimensionar.
  colocar();
  window.addEventListener('resize', colocar);
  capa.querySelector('#vp-ojo').focus();
}

function colocar() {
  const ojoEditor = document.querySelector('#btn-vista-previa');
  if (!capa || !ojoEditor) return;
  const r = ojoEditor.getBoundingClientRect();
  const barra = ojoEditor.closest('#toolbar')?.getBoundingClientRect();
  const st = capa.style;
  st.setProperty('--ojo-x', r.left + 'px');
  st.setProperty('--ojo-y', r.top + 'px');
  st.setProperty('--ojo-w', r.width + 'px');
  st.setProperty('--ojo-h', r.height + 'px');
  st.setProperty('--barra-h', (barra ? barra.bottom : r.bottom + 8) + 'px'); // misma altura que la barra del editor
}

export function cerrarVistaPrevia() {
  if (!capa) return;
  window.removeEventListener('resize', colocar);
  capa.remove();
  capa = null;
  document.querySelector('#btn-vista-previa')?.focus(); // el foco vuelve al ojo del editor
}

// Esc en el documento del editor (captura: 
// y mientras la capa está abierta se bloquean los atajos del editor (Ctrl+Z/Y) para no deshacer por debajo.
document.addEventListener('keydown', (e) => {
  if (!capa) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarVistaPrevia(); }
  else if (e.ctrlKey || e.metaKey) e.stopPropagation();
}, true);

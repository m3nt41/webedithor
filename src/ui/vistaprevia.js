// VISTA PREVIA: capa a pantalla completa con un iframe que muestra EXACTAMENTE el HTML exportado.
// - Se regenera cada vez que se abre (exportHTML(getState().page) -> srcdoc).
// - No toca el estado del editor.
// - ↻ Reiniciar: regenera el srcdoc (recarga el iframe desde el inicio, scroll arriba) para ver de nuevo las animaciones; conserva Escritorio/Móvil.
// - Móvil: el iframe mide 390px de ancho (así los @media y 100svh responden de verdad).
// - Esc cierra, también cuando el foco está dentro del iframe (se escucha su teclado).

import { getState } from '../core/store.js';
import { exportHTML } from '../export/exporter.js';

let capa = null;

export function vistaPreviaAbierta() { return !!capa; }

export function abrirVistaPrevia() {
  if (capa) return;
  capa = document.createElement('div');
  capa.id = 'vista-previa';
  capa.innerHTML = `
    <div class="vp-barra">
      <strong>Vista previa</strong>
      <span class="grupo">
        <button type="button" id="vp-desktop" class="activo">🖥 Escritorio</button>
        <button type="button" id="vp-mobile">📱 Móvil</button>
      </span>
      <button type="button" id="vp-reiniciar" title="Volver a cargar la página desde el inicio">↻ Reiniciar</button>
      <span class="espacio"></span>
      <span class="vp-ayuda">Esc para salir</span>
      <button type="button" id="vp-cerrar" class="primario">Cerrar</button>
    </div>
    <div class="vp-escenario"><iframe id="vp-frame" title="Vista previa de la página"></iframe></div>
  `;
  document.body.appendChild(capa);
  const frame = capa.querySelector('#vp-frame');

  // Si el foco está dentro del iframe, sus teclas no llegan al documento: se escucha Esc dentro.
  frame.addEventListener('load', () => {
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
  const cargar = () => { frame.srcdoc = exportHTML(getState().page); };
  cargar();

  const modo = (movil) => {
    capa.classList.toggle('movil', movil);
    capa.querySelector('#vp-desktop').classList.toggle('activo', !movil);
    capa.querySelector('#vp-mobile').classList.toggle('activo', movil);
  };
  capa.querySelector('#vp-desktop').addEventListener('click', () => modo(false));
  capa.querySelector('#vp-mobile').addEventListener('click', () => modo(true));
  capa.querySelector('#vp-reiniciar').addEventListener('click', cargar); // el modo (clase .movil de la capa) no se toca
  capa.querySelector('#vp-cerrar').addEventListener('click', cerrarVistaPrevia);
  capa.querySelector('#vp-cerrar').focus();
}

export function cerrarVistaPrevia() {
  capa?.remove();
  capa = null;
}

// Esc en el documento del editor (captura: 
// y mientras la capa está abierta se bloquean los atajos del editor (Ctrl+Z/Y) para no deshacer por debajo.
document.addEventListener('keydown', (e) => {
  if (!capa) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarVistaPrevia(); }
  else if (e.ctrlKey || e.metaKey) e.stopPropagation();
}, true);

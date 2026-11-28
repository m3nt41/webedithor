// PUNTO DE ENTRADA: conecta los tres paneles con el store.

import { t as tr, idioma } from './i18n/index.js';
import './styles/app.css';
import { initSidebar } from './ui/sidebar.js';
import { initPreview } from './ui/preview.js';
import { initInspector } from './ui/inspector.js';
import { initToolbar } from './ui/toolbar.js';
import { SVG_AVISO } from './ui/iconos.js';
import { accionCopiarEfectos, accionPegarEfectos } from './ui/efectos.js';
import { getState, subscribe, recargarGuardado, seguirConEsta, removeNode, duplicateNode, moveBy, valoresQuitadosAlCargar, nadaGuardado, guardadoDanado, iniciarCon } from './core/store.js';
import { PAGINA_DEMO } from './core/demo.js';
import { descargar } from './export/exporter.js';
import { toast } from './ui/plania.js';
import { avisoQuitados } from './core/seguridad.js';

// Atajos del elemento seleccionado: Supr borra, Ctrl+D duplica, Alt+↑/↓ mueve, Ctrl+Alt+C/V copia/pega efectos.
// No actúan mientras se escribe en un campo o en un texto editable (ahí manda el navegador).
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
  const { selectedId, page } = getState();
  if (!selectedId || selectedId === page.id) return;
  // Ctrl+Alt+C / Ctrl+Alt+V: copiar / pegar efectos (e.code porque con Alt/AltGr la tecla puede cambiar de carácter)
  if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && (e.code === 'KeyC' || e.code === 'KeyV')) {
    e.preventDefault();
    if (e.code === 'KeyC') accionCopiarEfectos(selectedId); else accionPegarEfectos([selectedId]);
    return;
  }
  if (e.key === 'Delete') { e.preventDefault(); removeNode(selectedId); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateNode(selectedId); }
  else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); moveBy(selectedId, -1); }
  else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); moveBy(selectedId, 1); }
});

// Aviso de varias pestañas: otra pestaña guardó algo distinto.
const aviso = document.createElement('div');
aviso.id = 'aviso-pestanas';
aviso.setAttribute('role', 'alert');
aviso.hidden = true;
aviso.innerHTML = `<span>${tr('aviso.otraPestana')}</span>`
  + `<button type="button" id="aviso-recargar">${tr('aviso.recargar')}</button>`
  + `<button type="button" id="aviso-seguir">${tr('aviso.seguir')}</button>`;
document.body.append(aviso);
aviso.querySelector('#aviso-recargar').addEventListener('click', recargarGuardado);
aviso.querySelector('#aviso-seguir').addEventListener('click', seguirConEsta);
subscribe((s, cambio) => { if (cambio === 'conflicto') aviso.hidden = s.conflicto == null; });

// Aviso si el autoguardado falla (típico: imágenes pesadas llenan el localStorage). No falla en silencio.
const avisoGuardado = document.createElement('div');
avisoGuardado.id = 'aviso-guardado';
avisoGuardado.setAttribute('role', 'alert');
avisoGuardado.hidden = true;
avisoGuardado.innerHTML = `${SVG_AVISO} ${tr('aviso.sinEspacio')}`;
document.body.append(avisoGuardado);
subscribe((s, cambio) => { if (cambio === 'guardado') avisoGuardado.hidden = !s.errorGuardado; });

if (valoresQuitadosAlCargar() > 0) toast(avisoQuitados(valoresQuitadosAlCargar()), true, 9000); // lo guardado traía valores peligrosos

// Si lo guardado no se pudo leer: se dice y se puede bajar la copia (la demo NO se carga encima).
const danado = guardadoDanado();
if (danado) {
  const av = document.createElement('div');
  av.id = 'aviso-danado';
  av.setAttribute('role', 'alert');
  av.innerHTML = `<span>${tr('aviso.danado')}${danado.copiado ? ` ${tr('aviso.danadoCopia')}` : ''} ${tr('aviso.danadoBajar')}</span>`
    + `<button type="button" id="danado-bajar">${tr('aviso.descargarCopia')}</button><button type="button" id="danado-cerrar">${tr('comun.cerrar')}</button>`;
  document.body.append(av);
  av.querySelector('#danado-bajar').addEventListener('click', () => descargar('pagina-danada.json', danado.texto, 'application/json'));
  av.querySelector('#danado-cerrar').addEventListener('click', () => av.remove());
}

// Demo web: quien entra sin NADA guardado ve la landing de muestra (una página vacía guardada se respeta).
if (PAGINA_DEMO && nadaGuardado()) {
  iniciarCon(PAGINA_DEMO);
  toast(tr('aviso.demo'), false, 12000);
}

// Lo único de index.html que depende del idioma
document.documentElement.lang = idioma;
document.getElementById('sidebar').setAttribute('aria-label', tr('html.secciones'));
document.getElementById('preview').setAttribute('aria-label', tr('html.vistaPrevia'));
document.getElementById('inspector').setAttribute('aria-label', tr('html.propiedades'));

initToolbar(document.getElementById('toolbar'));
initSidebar(document.getElementById('sidebar'));
initPreview(document.getElementById('preview'));
initInspector(document.getElementById('inspector'));

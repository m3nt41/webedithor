// PUNTO DE ENTRADA: conecta los tres paneles con el store.

import './styles/app.css';
import { initSidebar } from './ui/sidebar.js';
import { initPreview } from './ui/preview.js';
import { initInspector } from './ui/inspector.js';
import { initToolbar } from './ui/toolbar.js';
import { getState, subscribe, recargarGuardado, seguirConEsta, removeNode, duplicateNode, moveBy } from './core/store.js';

// Atajos del elemento seleccionado: Supr borra, Ctrl+D duplica, Alt+↑/↓ mueve.
// No actúan mientras se escribe en un campo o en un texto editable (ahí manda el navegador).
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
  const { selectedId, page } = getState();
  if (!selectedId || selectedId === page.id) return;
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
aviso.innerHTML = '<span>Otra pestaña guardó cambios distintos en este editor.</span>'
  + '<button type="button" id="aviso-recargar">Recargar con lo guardado</button>'
  + '<button type="button" id="aviso-seguir">Seguir con esta versión</button>';
document.body.append(aviso);
aviso.querySelector('#aviso-recargar').addEventListener('click', recargarGuardado);
aviso.querySelector('#aviso-seguir').addEventListener('click', seguirConEsta);
subscribe((s, cambio) => { if (cambio === 'conflicto') aviso.hidden = s.conflicto == null; });

initToolbar(document.getElementById('toolbar'));
initSidebar(document.getElementById('sidebar'));
initPreview(document.getElementById('preview'));
initInspector(document.getElementById('inspector'));

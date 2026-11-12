// PUNTO DE ENTRADA: conecta los tres paneles con el store.

import './styles/app.css';
import { initSidebar } from './ui/sidebar.js';
import { initPreview } from './ui/preview.js';
import { initInspector } from './ui/inspector.js';
import { initToolbar } from './ui/toolbar.js';

initToolbar(document.getElementById('toolbar'));
initSidebar(document.getElementById('sidebar'));
initPreview(document.getElementById('preview'));
initInspector(document.getElementById('inspector'));

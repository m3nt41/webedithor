// Iconos de línea fina compartidos (barra del editor y barra de la Vista previa), 18px, stroke="currentColor".
export const ico = (d) => `<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const SVG_ESCRITORIO = ico('<rect x="2" y="2.5" width="14" height="9.5" rx="1.2"/><path d="M9 12v3M5.8 15.5h6.4"/>');
export const SVG_MOVIL = ico('<rect x="5" y="1.8" width="8" height="14.4" rx="2"/><path d="M8 13.7h2"/>');
export const SVG_OJO = ico('<path d="M1.5 9S4.3 4 9 4s7.5 5 7.5 5-2.8 5-7.5 5S1.5 9 1.5 9Z"/><circle cx="9" cy="9" r="2.2"/>');
export const SVG_REINICIAR = ico('<path d="M15 9a6 6 0 1 1-2-4.5"/><path d="M15 2.5v3h-3"/>');
export const SVG_DESHACER = ico('<path d="M3.5 7h7.2a3.8 3.8 0 0 1 0 7.6H7"/><path d="M6.5 3.8 3.3 7l3.2 3.2"/>');
export const SVG_REHACER = ico('<path d="M14.5 7H7.3a3.8 3.8 0 0 0 0 7.6H11"/><path d="M11.5 3.8 14.7 7l-3.2 3.2"/>');
export const SVG_COPIAR = ico('<rect x="6" y="6" width="9" height="9.5" rx="1.3"/><path d="M12 6V4.3A1.3 1.3 0 0 0 10.7 3H4.3A1.3 1.3 0 0 0 3 4.3v6.4A1.3 1.3 0 0 0 4.3 12H6"/>');
export const SVG_PEGAR = ico('<rect x="3" y="3.5" width="12" height="12" rx="1.3"/><path d="M6.500 3.500V2.500h5v1"/><path d="M6 9h6M6 12h4"/>');
// Triángulo de aviso (reemplaza el emoji de advertencia): se pinta en 14px y hereda el color del texto
export const SVG_AVISO = '<svg class="ico-aviso" viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2.5 16.3 15H1.7Z"/><path d="M9 7.2v3.5M9 12.9v.1"/></svg>';

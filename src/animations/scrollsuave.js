// SCROLL SUAVE (Etapa 7, bloque 4): módulo AISLADO basado en Lenis (https://lenis.darkroom.engineering, MIT).
// Antes era un script propio; en Firefox real se veía escalonado al final, así que se cambió a Lenis.
// El resto del editor solo sabe "la página tiene smoothScroll activado" (page.content.smoothScroll).
//
// Lenis sigue usando el scroll NATIVO (window.scrollTo cada frame), así que sticky, parallax, ligado
// (scrollmotor.js lee scrollY) y escenas no se enteran. Táctil queda nativo (syncTouch apagado).
// NO corre con prefers-reduced-motion ni en dispositivos sin mouse (hover:hover + pointer:fine).
// Anclas (#...): las resuelve el navegador (respeta scroll-margin-top) y Lenis se sincroniza solo.
//
// ===== DÓNDE SE CAMBIAN LOS VALORES =====
// Solo en el objeto SUAVE de aquí abajo. El exportador lo copia tal cual al .html.
import { LENIS_MIN, LENIS_VERSION } from './lenis-min.js';
export { LENIS_VERSION };

export const SUAVE = {
  lerp: 0.1,            // 0.03 (muy flotante) … 0.3 (casi inmediato): fracción de la distancia que recorre cada cuadro
  wheelMultiplier: 1,   // cuánto avanza cada golpe de rueda (1 = normal, 1.5 = más rápido)
};

// Esta función se copia (toString) al .html exportado: NO puede usar nada de fuera. cfg = SUAVE.
// Necesita que `Lenis` (global) esté definido antes: el export pega LENIS_MIN justo antes.
export function scrollSuave(cfg) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return; // solo escritorio con mouse
  if (typeof Lenis === 'undefined') return;
  // CSS mínimo de lenis.css (altura automática y scroll interno aislado)
  const st = document.createElement('style');
  st.textContent = 'html.lenis,html.lenis body{height:auto}.lenis [data-lenis-prevent]{overscroll-behavior:contain}';
  document.head.appendChild(st);
  const lenis = new Lenis({
    lerp: cfg.lerp,
    wheelMultiplier: cfg.wheelMultiplier,
    smoothWheel: true,
    syncTouch: false,        // táctil: nativo
    anchors: false,          // anclas nativas (respetan scroll-margin-top)
    allowNestedScroll: true, // elementos con scroll propio siguen nativos
  });
  // Teclado, barra de scroll (mousedown) y anclas: manda el navegador. Lenis se pausa para no tirar de vuelta
  // hacia su destino viejo, y se reanuda (re-leyendo el scroll real) en la siguiente rueda.
  const ceder = () => { if (!lenis.isStopped) lenis.stop(); };
  addEventListener('keydown', ceder, true);
  addEventListener('mousedown', ceder, true);
  addEventListener('hashchange', ceder);
  addEventListener('click', (e) => { if (e.target.closest && e.target.closest('a[href^="#"]')) ceder(); }, true);
  addEventListener('wheel', () => { if (lenis.isStopped) lenis.start(); }, { capture: true, passive: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

/** Texto del <script> del export (solo viaja si la página tiene "Scroll suave" activado). */
export const SCRIPT_SCROLLSUAVE = `${LENIS_MIN}\nconst scrollSuave=${scrollSuave.toString()};scrollSuave(${JSON.stringify(SUAVE)});`;

/** ¿La página pidió scroll suave? (interruptor en "Ajustes de la página"; apagado por defecto) */
export const paginaUsaScrollSuave = (page) => page?.content?.smoothScroll === true;

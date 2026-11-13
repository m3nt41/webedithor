// SCROLL SUAVE (Etapa 7, bloque 4): módulo AISLADO, script propio mínimo (sin dependencias).
// Si algún día se prefiere Lenis, basta con cambiar SCRIPT_SCROLLSUAVE por el de Lenis: el resto del
// editor solo sabe "la página tiene smoothScroll activado" (page.content.smoothScroll) y pega ese texto.
//
// QUÉ HACE: suaviza SOLO la rueda de un mouse en escritorio. Acumula un destino y se desliza hacia él
// con inercia (cada cuadro recorre una fracción de lo que falta) usando scrollTo.
// QUÉ NO TOCA (queda nativo): táctil, teclado, barra de scroll, anclas (#...), trackpad (en lo posible),
// zoom con Ctrl, scroll horizontal y elementos con su propio scroll interno.
// SE CANCELA si el usuario usa teclado, barra de scroll, un ancla o cualquier otro scroll que no sea el nuestro.
// NO corre con prefers-reduced-motion ni en dispositivos sin mouse (hover:hover + pointer:fine).
// Como el scroll sigue siendo el nativo (scrollTo), sticky, parallax, ligado y escenas no se enteran.
//
// ===== DÓNDE SE CAMBIAN LOS VALORES =====
// Solo en el objeto SUAVE de aquí abajo (un único sitio). El exportador lo copia tal cual al .html.
export const SUAVE = {
  inercia: 0.1,       // 0.03 (muy lento y flotante) … 0.3 (casi inmediato). Fracción de la distancia que recorre cada cuadro (a 60 fps).
  paso: 1,            // multiplicador de lo que avanza cada golpe de rueda (1 = lo normal del navegador, 1.5 = más rápido)
  pxPorLinea: 40,     // para navegadores que reportan la rueda en "líneas" (Firefox): píxeles por línea (3 líneas ≈ 120 px)
  minRueda: 50,       // golpes en píxeles MENORES que esto se consideran trackpad y no se interceptan
  pausaTrackpad: 600, // ms que el trackpad "manda" tras detectar un golpe pequeño
};

// Esta función se copia (toString) al .html exportado: NO puede usar nada de fuera. cfg = SUAVE.
export function scrollSuave(cfg) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return; // solo escritorio con mouse
  let obj = null;      // destino (px) mientras dura el deslizamiento; null = quieto
  let ultimo = 0;      // dónde dejamos el scroll la última vez (para notar si otro lo movió)
  let t0 = 0;
  let raf = 0;
  let trackpadHasta = 0;
  const max = () => document.documentElement.scrollHeight - innerHeight;
  const parar = () => { obj = null; cancelAnimationFrame(raf); raf = 0; };
  const ir = (y) => scrollTo({ top: y, left: scrollX, behavior: 'instant' });

  const cuadro = (t) => {
    raf = 0;
    if (obj === null) return;
    if (Math.abs(scrollY - ultimo) > 2) return parar(); // alguien más movió el scroll (teclado, barra, ancla): nos apartamos
    obj = Math.round(Math.max(0, Math.min(obj, max()))); // destino en píxel entero
    const d = obj - scrollY;
    if (Math.abs(d) < 1.5) { ir(obj); return parar(); } // cola subpíxel: saltamos al destino y paramos
    const dt = t0 ? Math.max(0, Math.min(t - t0, 50)) : 16.7; t0 = t; // nunca negativo (el primer frame no tiene t0)
    let paso = d * (1 - Math.pow(1 - cfg.inercia, dt / 16.7)); // independiente de los fps
    if (Math.abs(paso) < 1) paso = Math.sign(d);               // avance mínimo: 1px entero por frame (el scroll puede redondear)
    ir(scrollY + (Math.abs(paso) > Math.abs(d) ? d : paso));
    ultimo = scrollY;
    raf = requestAnimationFrame(cuadro);
  };

  // ¿hay un elemento con scroll propio bajo el cursor que aún pueda moverse en esa dirección?
  const interno = (el, dy) => {
    for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (/^(TEXTAREA|SELECT)$/.test(el.tagName)) return true;
      if (/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
      }
    }
    return false;
  };

  addEventListener('wheel', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl = zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return;     // horizontal: nativo
    let dy = e.deltaY;
    if (e.deltaMode === 0 && Math.abs(dy) < cfg.minRueda) trackpadHasta = performance.now() + cfg.pausaTrackpad; // golpe chico = trackpad
    if (performance.now() < trackpadHasta) { parar(); return; }            // trackpad: nativo, y no peleamos con él
    if (e.deltaMode === 1) dy *= cfg.pxPorLinea; else if (e.deltaMode === 2) dy *= innerHeight;
    if (interno(e.target, dy)) return;                                    // scroll interno: nativo
    const base = obj === null ? scrollY : obj;
    const sig = Math.max(0, Math.min(base + dy * cfg.paso, max()));
    if (sig === base && obj === null) return;                             // ya está en el tope: que el navegador decida
    e.preventDefault();
    obj = sig;
    if (!raf) { ultimo = scrollY; t0 = 0; raf = requestAnimationFrame(cuadro); }
  }, { passive: false });

  // Teclado, barra de scroll (mousedown), toque y enlaces de ancla: se cancela el deslizamiento y manda el navegador.
  addEventListener('keydown', parar, true);
  addEventListener('mousedown', parar, true);
  addEventListener('touchstart', parar, { capture: true, passive: true });
  addEventListener('click', (e) => { if (e.target.closest && e.target.closest('a[href^="#"]')) parar(); }, true);
  addEventListener('hashchange', parar);
}

/** Texto del <script> del export (solo viaja si la página tiene "Scroll suave" activado). */
export const SCRIPT_SCROLLSUAVE = `const scrollSuave=${scrollSuave.toString()};scrollSuave(${JSON.stringify(SUAVE)});`;

/** ¿La página pidió scroll suave? (interruptor en "Ajustes de la página"; apagado por defecto) */
export const paginaUsaScrollSuave = (page) => page?.content?.smoothScroll === true;

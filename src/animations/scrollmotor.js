// MOTOR DE SCROLL (parallax y "ligado al scroll"): el único script que necesitan.
// Qué hace: para cada elemento marcado con data-sc que esté (casi) en pantalla, calcula su progreso
// 0..1 al cruzar la ventana (0 = asoma por abajo, 1 = sale por arriba) y lo escribe en la variable
// CSS --sp. TODO el movimiento lo hace el CSS (translate / scale / rotate / opacity), así que no se
// toca el layout y no se lee nada pesado:
//   - IntersectionObserver: solo se actualizan los elementos visibles (margen del 50%).
//   - Listener de scroll PASIVO, y como mucho un cálculo por cuadro (requestAnimationFrame).
//   - La posición se mide con offsetTop (ignora transform), así el propio parallax no se "persigue".
//   - Con prefers-reduced-motion NO corre: tampoco pone la clase .sc, y el CSS solo vale con .sc.
// Esta función se usa tal cual en el preview del editor y se copia (toString) al .html exportado;
// por eso NO puede usar nada de fuera. vista = window o el elemento que hace scroll.

export function motorScroll(vista, raiz, marca) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return () => {};
  const ventana = vista === window;
  // data-sc = lo mueve siempre el motor; data-sp = parallax: si el navegador tiene animation-timeline lo hace el CSS
  // (nativo) y el motor ni lo mira (ni escribe --sp ni lo mete en el listener); si no, es el respaldo.
  const nativo = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()'));
  const els = [...raiz.querySelectorAll('[data-sc],[data-ew]' + (nativo ? '' : ',[data-sp]'))]; // data-ew = contenedor alto de una escena
  const esc = (el) => el.hasAttribute('data-ew');
  const prop = (el) => (esc(el) ? '--ep' : '--sp'); // escena: progreso de la escena; el resto: progreso al cruzar la ventana
  if (!els.length) return () => {};
  const vis = new Set();
  let raf = 0;
  let yAntes = 0;
  const abs = (n) => { let t = 0; while (n) { t += n.offsetTop; n = n.offsetParent; } return t; };
  const calcular = () => {
    raf = 0;
    const alto = ventana ? innerHeight : vista.clientHeight;
    const y = ventana ? scrollY : vista.scrollTop;
    const base = ventana ? 0 : abs(vista);
    const res = [];
    vis.forEach((el) => { // primero se lee todo...
      if (esc(el)) { // escena: cuánto se ha corrido la capa pegada dentro del contenedor alto (0..1)
        const capa = el.firstElementChild;
        const rango = el.offsetHeight - capa.offsetHeight;
        res.push([el, rango > 0 ? Math.min(1, Math.max(0, (capa.getBoundingClientRect().top - el.getBoundingClientRect().top) / rango)) : 0]);
      } else res.push([el, Math.min(1, Math.max(0, (alto - (abs(el) - base - y)) / (alto + el.offsetHeight)))]);
    });
    // Salto grande (enlace de ancla, volver arriba): los de fuera pudieron cruzar la pantalla sin
    // avisar; se recolocan en su extremo (0 = quedó debajo, 1 = quedó arriba). Con scroll normal no se tocan.
    if (Math.abs(y - yAntes) > alto) {
      els.forEach((el) => { if (!vis.has(el)) res.push([el, abs(el) - base - y > alto / 2 ? 0 : 1]); });
    }
    yAntes = y;
    res.forEach(([el, p]) => el.style.setProperty(prop(el), p.toFixed(4))); // ...y luego se escribe
  };
  // Escenas: la capa pegada deja libre arriba el alto de un navbar pegado (los que tengan data-nav), medido aquí.
  const navs = [...raiz.querySelectorAll('[data-nav]')];
  const medirNav = () => {
    // solo cuenta un navbar que de verdad esté pegado ahora (en móvil puede ser "Normal" = static)
    const h = Math.max(0, ...navs.filter((n) => getComputedStyle(n).position === 'sticky').map((n) => n.offsetHeight + (parseFloat(getComputedStyle(n).top) || 0)));
    els.forEach((el) => { if (esc(el) && el.hasAttribute('data-auto')) el.style.setProperty('--arr', h + 'px'); });
  };
  const tick = () => { if (!raf) raf = requestAnimationFrame(calcular); };
  const alCambiar = () => { medirNav(); tick(); };
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) vis.add(e.target);
      else { // se fue: lo deja en su extremo (0 si quedó debajo, 1 si quedó arriba)
        vis.delete(e.target);
        // (se compara con el centro de la zona observada, que no depende del margen ni de iframes)
        if (e.rootBounds) e.target.style.setProperty(prop(e.target), e.boundingClientRect.top > (e.rootBounds.top + e.rootBounds.bottom) / 2 ? 0 : 1);
      }
    });
    tick();
  }, { root: ventana ? null : vista, rootMargin: '50% 0px' });
  els.forEach((el) => io.observe(el));
  vista.addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', alCambiar, { passive: true });
  addEventListener('load', alCambiar);
  marca.classList.add('sc');
  medirNav();
  tick();
  return () => {
    io.disconnect();
    cancelAnimationFrame(raf);
    vista.removeEventListener('scroll', tick);
    removeEventListener('resize', alCambiar);
    removeEventListener('load', alCambiar);
    marca.classList.remove('sc');
  };
}

/** Texto del <script> del export (solo viaja si algún elemento usa parallax o scroll-linked). */
export const SCRIPT_SCROLLMOTOR = `const motorScroll=${motorScroll.toString()};motorScroll(window,document,document.documentElement);`;

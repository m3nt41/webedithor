// Genera, con el exportador REAL del editor, las páginas .html que usan los tests (tests/out/).
// No toca el código del editor: solo lo importa. Se llama sola desde playwright.config.js (globalSetup).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { createBlock } from '../src/blocks/index.js';

const out = join(dirname(fileURLToPath(import.meta.url)), 'out');

const pagina = (...secciones) => { const p = n('page', { name: 'Página' }); p.children.push(...secciones); return p; };
const sec = (name, styles = {}, children = []) => n('section', { name, styles: { padding: '0', ...styles }, children });
const caja = (name, h, extra = {}, children = []) => n('container', { name, styles: { height: `${h}px`, ...extra }, children });
const tit = (t, styles = {}, anim = null) => { const x = n('heading', { name: t, content: { text: t, level: 2 }, styles: { margin: '0', ...styles } }); x.animation = anim; return x; };
const txt = (t, styles = {}, anim = null) => { const x = n('text', { name: t, content: { text: t }, styles: { margin: '0', ...styles } }); x.animation = anim; return x; };
const btn = (t, anim = null) => { const x = n('button', { name: t, content: { text: t, href: '#' }, styles: { display: 'inline-block', padding: '16px 32px', background: '#7c5cff', color: '#fff', textDecoration: 'none' } }); x.animation = anim; return x; };
const guardar = (nombre, p) => writeFileSync(join(out, nombre + '.html'), exportHTML(p));

mkdirSync(out, { recursive: true });

// 1. Sticky arriba y abajo (dentro de un contenedor alto)
guardar('sticky', pagina(
  sec('Alta', {}, [
    caja('Contenedor', 3000, { display: 'block' }, [
      tit('PEGADO-ARRIBA', { position: 'sticky', top: '20px', height: '60px', background: '#fde68a' }),
      caja('Hueco', 1400),
      txt('PEGADO-ABAJO', { position: 'sticky', bottom: '20px', height: '60px', background: '#a7f3d0' }),
    ]),
  ]),
  sec('Final', { height: '1200px' }),
));

// 2. Parallax (y) + 3. scroll-linked (fade-in y zoom) con scroll real
guardar('scroll', pagina(
  sec('Arriba', { height: '1400px' }),
  sec('Zona', { height: '600px' }, [
    tit('PARALLAX', { height: '80px', background: '#fecaca' }, { parallax: { effect: 'y', amount: 100 } }),
    tit('LIGADO', { height: '80px', background: '#bfdbfe' }, { scrolllink: { effect: 'fade-in', amount: 20, start: 0, end: 50 } }),
    tit('LIGADO-ZOOM', { height: '80px', background: '#ddd6fe' }, { scrolllink: { effect: 'zoom-in', amount: 40, start: 0, end: 50 } }),
  ]),
  sec('Abajo', { height: '1800px' }),
));

// 4. Press y focus con Tab, 5. estado por clic
guardar('estados', pagina(
  sec('Botones', { padding: '40px', display: 'flex', gap: '40px' }, [
    btn('BTN-PRESS', { press: { effect: 'grow', duration: 0.12, ease: 'suave' } }),
    btn('BTN-FOCUS', { focus: { effect: 'ring', duration: 0.2, ease: 'suave', color: '#ff0000' } }),
    btn('BTN-CLIC', { variants: [{ id: 'v1', name: 'Activo', trigger: 'click', duration: 0.2, delay: 0, ease: 'suave', props: { scale: 1.3, bg: '#00aa00' } }] }),
  ]),
));

// 6. Texto por línea (medida)
guardar('lineas', pagina(
  sec('Texto', { padding: '20px' }, [
    txt('Esta es una frase bastante larga que debería partirse en varias líneas cuando la ventana se hace más angosta, y cada línea visual debe recibir su propio número para la cascada.',
      { fontSize: '24px' }, { text: { mode: 'linesm', effect: 'up', trigger: 'scroll', duration: 0.7, delay: 0, stagger: 0.06, ease: 'suave', distance: 30, angle: -90 } }),
  ]),
));

// 8. Combinación: parallax + estado hover en el MISMO elemento (la transición no debe suavizar el scroll)
guardar('combo', pagina(sec('Arriba', { height: '1400px' }), sec('Zona', { height: '600px' }, [
  tit('PARALLAX-HOVER', { height: '80px', background: '#fecaca' }, { parallax: { effect: 'y', amount: 100 }, variants: [{ id: 'h', name: 'Hover', trigger: 'hover', duration: 0.5, delay: 0, ease: 'suave', props: { scale: 1.2 } }] }),
]), sec('Abajo', { height: '1800px' })));

// 7. Escena por scroll (con navbar pegado)
guardar('escena', pagina(createBlock('navbar', 'oscuro'), createBlock('scene', 'textos'), createBlock('hero', 'oscuro')));
// 9. Scroll suave (Etapa 7, bloque 4): navbar pegado, scroll interno, ancla, parallax; y la misma página SIN el interruptor
const paginaSuave = (activo) => {
  const nav = sec('Nav', { position: 'sticky', top: '0', height: '60px', background: '#222', zIndex: '50' });
  const interno = caja('INTERNO', 200, { overflow: 'auto', background: '#eee' }, [caja('Alto', 1000, { background: 'linear-gradient(#fff,#999)' })]);
  const fin = sec('Fin', { height: '1500px' }, [tit('FIN')]); fin.content.anchor = 'fin';
  const boton = btn('IR-FIN'); boton.content.href = '#fin';
  const p = pagina(nav, sec('Intro', { height: '700px' }, [boton, interno]),
    sec('Zona', { height: '1000px' }, [tit('PARALLAX-SUAVE', { height: '80px', background: '#fecaca' }, { parallax: { effect: 'y', amount: 100 } })]), fin);
  if (activo) p.content.smoothScroll = true;
  return p;
};
guardar('suave', paginaSuave(true));
guardar('suave-off', paginaSuave(false));
// 10. Escena por scroll con scroll suave activado (convivencia)
const esc = pagina(createBlock('navbar', 'oscuro'), createBlock('scene', 'textos'), createBlock('hero', 'oscuro')); esc.content.smoothScroll = true;
guardar('escena-suave', esc);
console.log('Páginas generadas en tests/out');

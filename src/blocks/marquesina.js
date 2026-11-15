// BLOQUE MARQUESINA (ticker): una sección con un contenedor-marquesina dentro (content.marquesina, ver core/marquesina.js).
// 3 estilos × clara/oscura. Todo sale del tema (colores, serif, líneas de 1px, recto, sin sombras ni degradados).
// También exporta las tiras sueltas (contornoTira, cintaTira, logosTira) para el elemento "Marquesina" de la pestaña Elem.
// excluidoIA: la guía y el plan de la IA no lo ofrecen por ahora (ver PROGRESS.md, Pendientes).

import { n, texto, icono, fondoModo } from './util.js';
import { MODOS, FUENTE, BORDE } from './tema.js';
import { MQ_DEFECTO } from '../core/marquesina.js';

const tira = (name, m, cfg, styles, hijos, mobile = {}) =>
  n('container', { name, content: { marquesina: { ...MQ_DEFECTO, ...cfg } }, styles: { color: m.fg, ...styles }, mobile, children: hijos });

/** 1. Texto grande con contorno (letras huecas, serif del tema). */
export const contornoTira = (m = MODOS.claro) => tira('Marquesina contorno', m, { vel: 40, gap: 64 }, {},
  ['Diseño', 'Estrategia', 'Marca', 'Contenido', 'Web'].map((t) => texto(t, {
    fontFamily: FUENTE.titulo, fontWeight: '500', fontSize: '96px', lineHeight: '1.35', letterSpacing: '-0.02em', whiteSpace: 'nowrap',
    WebkitTextFillColor: 'transparent', WebkitTextStroke: `1px ${m.fg}`,
  }, { fontSize: '56px' }, 'Palabra')));

/** Separador de la Cinta: ✦ (U+2726), el más parecido a las chispas del icono anterior. Se cambia como cualquier texto. */
const SEPARADOR = '✦';

/** 2. Cinta con separadores (texto + carácter separador entre items, línea fina arriba y abajo). */
export const cintaTira = (m = MODOS.claro) => tira('Marquesina cinta', m, { vel: 30, gap: 40 },
  { padding: '20px 0', borderTop: `${BORDE} ${m.linea}`, borderBottom: `${BORDE} ${m.linea}` },
  ['Diseño a medida', 'Entrega rápida', 'Soporte cercano', 'Resultados reales', 'Sin letra chica'].flatMap((t) => [
    texto(t, { fontSize: '14px', lineHeight: '1.4', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: '500', whiteSpace: 'nowrap' }, {}, 'Texto'),
    // separador = CARÁCTER DE TEXTO (no SVG): en Firefox un SVG avanza con subpíxel y el texto pegado al píxel, y el separador "tiembla" respecto a las letras
    texto(SEPARADOR, { fontFamily: FUENTE.cuerpo, fontSize: '16px', lineHeight: '1', letterSpacing: '0', color: m.acento, whiteSpace: 'nowrap' }, {}, 'Separador'),
  ]));

/** 3. Tira de logos (iconos en gris, todos del mismo tamaño). */
export const logosTira = (m = MODOS.claro) => tira('Marquesina logos', m, { vel: 35, gap: 80 }, {},
  ['rocket', 'gem', 'globe', 'award', 'camera', 'shield', 'zap', 'music'].map((k) => icono(k, { width: '40px', height: '40px', color: m.sec }, 'Logo')),
  {});

const seccion = (m, nombre, hijo, pad) => n('section', {
  name: nombre,
  styles: { padding: `${pad}px 0`, ...fondoModo(m) },
  mobile: { padding: `${Math.round(pad * 0.6)}px 0` },
  children: [hijo],
});

export default {
  id: 'marquesina',
  label: 'Marquesina',
  excluidoIA: true,
  variants: {
    contornoClaro:  { label: 'Contorno · claro',  crear: () => seccion(MODOS.claro, 'Marquesina', contornoTira(MODOS.claro), 56) },
    contornoOscuro: { label: 'Contorno · oscuro', crear: () => seccion(MODOS.oscuro, 'Marquesina', contornoTira(MODOS.oscuro), 56) },
    cintaClaro:     { label: 'Cinta · clara',     crear: () => seccion(MODOS.claro2, 'Marquesina', cintaTira(MODOS.claro2), 0) },
    cintaOscuro:    { label: 'Cinta · oscura',    crear: () => seccion(MODOS.oscuro, 'Marquesina', cintaTira(MODOS.oscuro), 0) },
    logosClaro:     { label: 'Logos · claro',     crear: () => seccion(MODOS.claro, 'Marquesina', logosTira(MODOS.claro), 56) },
    logosOscuro:    { label: 'Logos · oscuro',    crear: () => seccion(MODOS.oscuro2, 'Marquesina', logosTira(MODOS.oscuro2), 56) },
  },
};

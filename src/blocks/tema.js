// TEMA: el único sitio donde viven colores, fuentes, tamaños y espaciado de los bloques.
// Dirección: "editorial minimalista" + "moderno oscuro". Secciones claras (papel y tinta, serif,
// líneas finas) que alternan con secciones oscuras (negro y grises). Todo recto, sin sombras.
// Ningún bloque debe escribir un color o una fuente suelta: importa de aquí (lo vigila tests/tema.mjs).

// ---- Colores ----
export const C = {
  papel: '#f7f5f0',       // blanco roto cálido (fondo claro)
  papel2: '#efece4',      // un poco más oscuro, para alternar secciones claras
  tinta: '#111111',       // texto sobre claro
  gris: '#5f5c55',        // texto secundario sobre claro
  linea: '#d9d6cf',       // borde fino sobre claro
  oscuro: '#0c0c0e',      // negro suave (fondo oscuro)
  oscuro2: '#17171a',     // gris muy oscuro (tarjetas / alternar oscuras)
  textoClaro: '#f2efe8',  // texto sobre oscuro
  grisClaro: '#a3a09a',   // texto secundario sobre oscuro
  lineaOscura: '#2c2c30', // borde fino sobre oscuro
  // UN solo acento: arena/dorado apagado. Elegante y cálido, combina con el papel y se lee sobre el negro;
  // es poco saturado, así que nunca "grita". Se usa en líneas, iconos y en el botón primario sobre oscuro.
  acento: '#a68a56',
  // Placeholders de imagen: grises cálidos neutros (el texto lleva el mismo gris más oscuro)
  ph: ['#dedad1', '#d5d1c7', '#e4e0d8', '#cfcbc0', '#dad6cc', '#e0dcd3'],
  phOscuro: '#c8c3b8',
  phTexto: '#8a867c',
};

// ---- Modos de color: lo que cambia entre una sección clara y una oscura ----
// bg fondo · fg texto · sec texto secundario · linea borde fino · tarjeta relleno de tarjetas
// btnBg/btnFg botón primario (tinta en claro, acento en oscuro) · acento color de iconos/detalles
// etiqueta color de los eyebrows (gris sobre claro por contraste; acento sobre oscuro)
export const MODOS = {
  claro:   { bg: C.papel,   fg: C.tinta,      sec: C.gris,      linea: C.linea,       tarjeta: C.papel2,  btnBg: C.tinta,  btnFg: C.papel,  acento: C.acento, etiqueta: C.gris },
  claro2:  { bg: C.papel2,  fg: C.tinta,      sec: C.gris,      linea: C.linea,       tarjeta: C.papel,   btnBg: C.tinta,  btnFg: C.papel,  acento: C.acento, etiqueta: C.gris },
  oscuro:  { bg: C.oscuro,  fg: C.textoClaro, sec: C.grisClaro, linea: C.lineaOscura, tarjeta: C.oscuro2, btnBg: C.acento, btnFg: C.oscuro, acento: C.acento, etiqueta: C.acento },
  oscuro2: { bg: C.oscuro2, fg: C.textoClaro, sec: C.grisClaro, linea: C.lineaOscura, tarjeta: C.oscuro,  btnBg: C.acento, btnFg: C.oscuro, acento: C.acento, etiqueta: C.acento },
};

// ---- Tipografía (solo fuentes del sistema: el export no depende de internet) ----
export const FUENTE = {
  titulo: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  cuerpo: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

// Escala: { d: escritorio, m: móvil }. Títulos serif con peso 500 (nunca 800), tracking algo negativo
// en los grandes e interlineado cómodo. La etiqueta (eyebrow) es la única que va en mayúsculas.
const serif = { fontFamily: FUENTE.titulo, fontWeight: '500' };
export const H1 = { d: { ...serif, fontSize: '64px', lineHeight: '1.08', letterSpacing: '-0.02em' }, m: { fontSize: '40px' } };
export const H2 = { d: { ...serif, fontSize: '44px', lineHeight: '1.15', letterSpacing: '-0.015em' }, m: { fontSize: '32px' } };
export const H3 = { d: { ...serif, fontSize: '24px', lineHeight: '1.25', letterSpacing: '-0.005em' }, m: { fontSize: '21px' } };
export const CITA = { d: { ...serif, fontSize: '36px', lineHeight: '1.3', letterSpacing: '-0.01em' }, m: { fontSize: '26px' } };
export const PRECIO = { d: { ...serif, fontSize: '48px', lineHeight: '1.1', letterSpacing: '-0.02em' }, m: { fontSize: '40px' } };
export const LEAD = { d: { fontSize: '20px', lineHeight: '1.6' }, m: { fontSize: '17px' } };
export const CUERPO = { d: { fontSize: '16px', lineHeight: '1.65' }, m: {} };
export const PEQUENO = { d: { fontSize: '14px', lineHeight: '1.5' }, m: {} };
export const ETIQUETA = { d: { fontSize: '12px', lineHeight: '1.4', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: '500' }, m: {} };

// ---- Espaciado ----
export const ANCHO = 1120;   // ancho máximo del contenido
export const ANCHO_TEXTO = 760; // secciones de lectura (listas)
export const AIRE = { d: '112px', m: '64px' };  // padding vertical de las secciones
/** Padding lateral que centra el contenido a un ancho máximo SIN añadir contenedores:
 *  el fondo de la sección ocupa todo el ancho y el contenido queda a `ancho` px como máximo. */
export const lado = (ancho = ANCHO, minimo = 32) => `max(${minimo}px, calc((100% - ${ancho}px) / 2))`;
export const padSeccion = (ancho = ANCHO) => `${AIRE.d} ${lado(ancho)}`;

// ---- Forma y botones ----
export const RECTO = '0';
export const BORDE = '1px solid'; // se completa con el color de la línea

// Presets EXACTOS del inspector (src/ui/controles.js, TAMANOS_BOTON): así el botón marca su tamaño activo
export const TAM = {
  m: { padding: '12px 24px', fontSize: '16px' }, // Mediano
  l: { padding: '16px 32px', fontSize: '18px' }, // Grande
};

/** Estilos de botón. variante: 'primario' (relleno) | 'secundario' (contorno de 1px). */
export const botonTema = (modo = MODOS.claro, tam = 'm', variante = 'primario') => ({
  display: 'inline-block',
  ...TAM[tam],
  borderRadius: RECTO,
  textDecoration: 'none',
  fontWeight: '500',
  letterSpacing: '0.02em',
  background: variante === 'primario' ? modo.btnBg : 'transparent',
  color: variante === 'primario' ? modo.btnFg : modo.fg,
  border: `${BORDE} ${variante === 'primario' ? modo.btnBg : modo.fg}`,
});

/** Tarjeta: recta, borde de 1px, sin sombra. */
export const tarjetaTema = (m = MODOS.claro, extra = {}) => ({
  padding: '32px', borderRadius: RECTO, background: m.tarjeta, border: `${BORDE} ${m.linea}`, ...extra,
});

/** Placeholder de imagen: gris cálido neutro. */
export const colorPh = (i = 0) => C.ph[i % C.ph.length];

/** Todos los colores permitidos (los usa el test que vigila que los bloques no inventen colores). */
export const COLORES_TEMA = new Set([
  ...Object.values(C).flat(),
].filter((v) => typeof v === 'string' && v.startsWith('#')).map((v) => v.toLowerCase()));

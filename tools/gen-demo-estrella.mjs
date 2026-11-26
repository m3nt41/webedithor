// Genera docs/demo-estrella.json: la LANDING ESTRELLA de muestra (estudio ficticio "Órbita").
// Luce lo que el editor ya sabe hacer: texto animado, cascada, parallax, escena por scroll,
// marquesinas, ligado al scroll y hovers. El arte es SVG generado aquí (sin fotos ni descargas).
// Se abre en el editor con "Abrir JSON". Ejecutar: node tools/gen-demo-estrella.mjs
//   node tools/gen-demo-estrella.mjs --html RUTA   → además escribe el .html exportado en RUTA
import { writeFileSync } from 'node:fs';
import { createPage } from '../src/core/tree.js';
import { n, texto, boton, imagen, icono, columna, tit, lead, cuerpo, etiqueta, pequeno, fondoModo } from '../src/blocks/util.js';
import { C, MODOS, FUENTE, ANCHO, AIRE, lado, botonTema, tarjetaTema } from '../src/blocks/tema.js';
import { cintaTira, contornoTira } from '../src/blocks/marquesina.js';

const O = MODOS.oscuro;
const O2 = MODOS.oscuro2;
const P = MODOS.claro;

// ------------------------------------------------------------------ Arte SVG
// Composiciones abstractas con una sola familia de colores (arena sobre negro o sobre papel).
const dataSvg = (w, h, cuerpoSvg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${cuerpoSvg}</svg>`);

const halo = (id, color, fuerza) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${fuerza}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
const circulo = (cx, cy, r, extra) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${extra}/>`;
const anillos = (cx, cy, radios, color, op = 0.35) =>
  radios.map((r, i) => circulo(cx, cy, r, `fill="none" stroke="${color}" stroke-opacity="${Math.max(0.08, op - i * 0.04)}"`)).join('');

/** Fondo del hero: órbitas y un "planeta" que asoma por abajo a la derecha. */
const artePortada = () => {
  let estrellas = '';
  for (let i = 0; i < 90; i++) { // posiciones fijas (sin azar: el JSON sale igual cada vez)
    const x = (i * 397) % 1600, y = (i * 233) % 1000;
    estrellas += circulo(x, y, 0.8 + (i % 3) * 0.5, `fill="#f2efe8" fill-opacity="${0.15 + (i % 5) * 0.08}"`);
  }
  return dataSvg(1600, 1000,
    `<defs>${halo('a', '#a68a56', 0.55)}${halo('b', '#6d5a8f', 0.3)}
    <linearGradient id="p" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#e6d2a6"/><stop offset="0.45" stop-color="#8a7044"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient></defs>
    <rect width="1600" height="1000" fill="#0c0c0e"/>
    ${circulo(1250, 760, 620, 'fill="url(#a)"')}${circulo(260, 180, 520, 'fill="url(#b)"')}${estrellas}
    <g transform="rotate(-18 1250 820)">${[430, 580, 740, 920].map((rx, i) => `<ellipse cx="1250" cy="820" rx="${rx}" ry="${rx * 0.36}" fill="none" stroke="#a68a56" stroke-opacity="${0.55 - i * 0.11}" stroke-width="1.5"/>`).join('')}</g>
    ${circulo(1250, 820, 270, 'fill="url(#p)"')}
    ${circulo(852, 700, 11, 'fill="#e6d2a6"')}${circulo(1490, 500, 6, 'fill="#f2efe8"')}`);
};

/** Piezas del "portafolio": cuatro composiciones distintas. */
const arteEclipse = (w = 900, h = 1100) => dataSvg(w, h,
  `<defs>${halo('g', '#e6d2a6', 0.9)}</defs><rect width="${w}" height="${h}" fill="#17171a"/>
  ${circulo(w / 2, h * 0.42, w * 0.46, 'fill="url(#g)"')}${circulo(w / 2 + w * 0.05, h * 0.40, w * 0.24, 'fill="#0c0c0e"')}
  ${anillos(w / 2, h * 0.42, [w * 0.33, w * 0.39, w * 0.46, w * 0.54], '#e6d2a6', 0.4)}
  <line x1="80" y1="${h * 0.8}" x2="${w - 80}" y2="${h * 0.8}" stroke="#a68a56" stroke-opacity="0.6"/>
  <text x="80" y="${h * 0.87}" fill="#f2efe8" font-family="Georgia,serif" font-size="64">Eclipse</text>
  <text x="80" y="${h * 0.915}" fill="#a3a09a" font-family="sans-serif" font-size="24" letter-spacing="6">IDENTIDAD</text>`);

const arteDunas = (w = 900, h = 700) => {
  const capas = ['#d8c7a0', '#bfa675', '#a68a56', '#7d6840', '#4f432b', '#26211a'];
  return dataSvg(w, h, `<rect width="${w}" height="${h}" fill="#efece4"/>${circulo(w * 0.72, h * 0.24, 78, 'fill="#111111"')}` +
    capas.map((c, i) => { const y = h * 0.4 + i * h * 0.095;
      return `<path d="M0 ${y} C ${w * 0.25} ${y - 90 + i * 14}, ${w * 0.5} ${y + 80 - i * 10}, ${w * 0.75} ${y - 10} S ${w} ${y - 40}, ${w} ${y - 20} L ${w} ${h} L 0 ${h} Z" fill="${c}"/>`; }).join('') +
    `<text x="48" y="86" fill="#111111" font-family="Georgia,serif" font-size="52">Dunas</text>`);
};

const arteReticula = (w = 900, h = 700) => {
  let s = `<rect width="${w}" height="${h}" fill="#0c0c0e"/>`;
  for (let f = 0; f < 6; f++) for (let c = 0; c < 8; c++) {
    const x = 90 + c * 103, y = 90 + f * 90, r = 8 + 30 * Math.abs(Math.sin((c + f * 1.4) * 0.55));
    s += circulo(x, y, r.toFixed(1), (c + f) % 5 === 0 ? 'fill="#a68a56"' : 'fill="none" stroke="#f2efe8" stroke-opacity="0.45"');
  }
  return dataSvg(w, h, s + `<text x="60" y="${h - 42}" fill="#f2efe8" font-family="Georgia,serif" font-size="52">Retícula</text>`);
};

const arteArcos = (w = 900, h = 1100) => dataSvg(w, h,
  `<rect width="${w}" height="${h}" fill="#e4e0d8"/>` +
  [['#111111', 360], ['#a68a56', 290], ['#f7f5f0', 220], ['#5f5c55', 150], ['#e6d2a6', 80]]
    .map(([c, r]) => `<path d="M ${w / 2 - r} 880 L ${w / 2 - r} ${520} A ${r} ${r} 0 0 1 ${w / 2 + r} ${520} L ${w / 2 + r} 880 Z" fill="${c}"/>`).join('') +
  `<text x="80" y="990" fill="#111111" font-family="Georgia,serif" font-size="64">Arcos</text>
  <text x="80" y="1040" fill="#5f5c55" font-family="sans-serif" font-size="24" letter-spacing="6">SITIO WEB</text>`);

/** Los tres cuadros de la escena: boceto → forma → página viva. */
const arteBoceto = () => dataSvg(960, 540,
  `<rect width="960" height="540" fill="#17171a"/><g fill="none" stroke="#c9b88f" stroke-width="2.5" stroke-dasharray="9 9">
  <rect x="80" y="60" width="800" height="420"/><rect x="130" y="130" width="340" height="52"/><rect x="130" y="205" width="270" height="22"/>
  <rect x="130" y="290" width="150" height="48"/><circle cx="660" cy="270" r="130"/><line x1="660" y1="90" x2="660" y2="450"/><line x1="490" y1="270" x2="830" y2="270"/></g>`);
const arteForma = () => dataSvg(960, 540,
  `<rect width="960" height="540" fill="#17171a"/><rect x="80" y="60" width="800" height="420" fill="#f7f5f0"/>
  <rect x="130" y="130" width="340" height="52" fill="#111111"/><rect x="130" y="205" width="270" height="22" fill="#d9d6cf"/>
  <rect x="130" y="290" width="150" height="48" fill="#111111"/><circle cx="660" cy="270" r="130" fill="#a68a56"/>
  <circle cx="710" cy="220" r="46" fill="#f7f5f0"/>`);
const arteViva = () => dataSvg(960, 540,
  `<defs>${halo('v', '#a68a56', 0.7)}</defs><rect width="960" height="540" fill="#17171a"/><rect x="80" y="60" width="800" height="420" fill="#0c0c0e"/>
  <circle cx="660" cy="270" r="210" fill="url(#v)"/><rect x="130" y="130" width="340" height="52" fill="#f2efe8"/><rect x="130" y="205" width="270" height="22" fill="#5f5c55"/>
  <rect x="130" y="290" width="150" height="48" fill="#a68a56"/><circle cx="660" cy="270" r="96" fill="#e6d2a6"/>
  ${anillos(660, 270, [132, 164, 196], '#e6d2a6', 0.7)}<circle cx="792" cy="270" r="11" fill="#f2efe8"/>`);

// ------------------------------------------------------------------ Ayudas
const anim = (nodo, a) => { nodo.animation = { ...nodo.animation, ...a }; return nodo; };
const SUAVE = { ease: 'suave' };
const entra = (nodo, effect = 'up', delay = 0, extra = {}) => anim(nodo, { appear: { effect, trigger: 'scroll', duration: 0.9, delay, distance: 50, ...SUAVE, ...extra } });
const titular = (nodo, mode = 'words', extra = {}) => anim(nodo, { text: { mode, effect: 'up', trigger: 'scroll', duration: 0.8, delay: 0, stagger: 0.07, distance: 40, ...SUAVE, ...extra } });
const cascada = (nodo, effect = 'up', step = 0.14) => anim(nodo, { stagger: { effect, trigger: 'scroll', duration: 0.8, delay: 0, step, distance: 56, ...SUAVE } });
const hover = (nodo, effect, extra = {}) => anim(nodo, { hover: { effect, duration: 0.3, ...SUAVE, ...extra } });
const parallax = (nodo, amount) => anim(nodo, { parallax: { effect: 'y', amount } });
const fila = (name, styles, hijos, mobile = {}) => n('container', { name, styles: { display: 'flex', gap: '14px', flexWrap: 'wrap', ...styles }, mobile, children: hijos });
const seccion = (name, ancla, styles, hijos, mobile = {}) => {
  const s = n('section', { name, styles: { display: 'flex', flexDirection: 'column', padding: `${AIRE.d} ${lado(ANCHO)}`, ...styles }, mobile: { padding: `${AIRE.m} 20px`, ...mobile }, children: hijos });
  if (ancla) s.content.anchor = ancla;
  return s;
};
const tira = (name, nodoTira, m, pad = 0) => n('section', { name, styles: { padding: `${pad}px 0`, ...fondoModo(m) }, children: [nodoTira] });

// ------------------------------------------------------------------ 1. Navbar pegado
const enlace = (t, href) => hover(n('button', { name: 'Enlace', content: { text: t, href }, styles: { color: 'inherit', textDecoration: 'none', display: 'inline-block', fontSize: '15px', letterSpacing: '0.02em' } }), 'underline', { direccion: 'izq', grosor: 1, separacion: 4 });
const navbar = n('section', {
  name: 'Navbar', content: { menuMovil: true },
  styles: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: `18px ${lado(ANCHO)}`, position: 'sticky', top: '0', zIndex: '20', ...fondoModo(O), borderBottom: `1px solid ${O.linea}` },
  mobile: { padding: '10px 20px', gap: '10px 16px' },
  children: [
    texto('Órbita', { fontFamily: FUENTE.titulo, fontWeight: '500', fontSize: '24px' }, {}, 'Logo'),
    fila('Enlaces', { gap: '32px', alignItems: 'center' }, [enlace('Proceso', '#proceso'), enlace('Trabajo', '#trabajo'), enlace('Planes', '#precios')], { order: '3', width: '100%', justifyContent: 'center' }),
    hover(boton('Hablemos', '#contacto', botonTema(O, 'm'), 'Botón de acción'), 'bgrow', { color: '#c4a76f' }),
  ],
});

// ------------------------------------------------------------------ 2. Portada
const carga = { trigger: 'load' };
const portada = seccion('Portada', 'inicio', {
  alignItems: 'flex-start', justifyContent: 'center', gap: '28px', minHeight: '92vh', ...fondoModo(O),
  fondoImagen: artePortada(), fondoAjuste: 'cover', fondoPosicion: 'center', fondoCapa: 18,
}, [
  entra(etiqueta('Estudio de diseño web · desde 2019', O), 'fade', 0.1, carga),
  titular(tit(1, 'Páginas que se mueven contigo', { fontSize: '104px', lineHeight: '1.02', maxWidth: '11ch' }, { fontSize: '52px' }), 'words', { ...carga, delay: 0.25, stagger: 0.1, duration: 1, distance: 60 }),
  entra(lead('Diseñamos landings con movimiento que cuenta algo. Baja y míralo en acción.', O, { maxWidth: '42ch', color: '#d6d2c9' }), 'up', 0.9, carga),
  anim(fila('Botones', { marginTop: '8px' }, [
    hover(boton('Empezar un proyecto', '#contacto', botonTema(O, 'l')), 'bgrow', { color: '#c4a76f' }),
    hover(boton('Ver el proceso', '#proceso', botonTema(O, 'l', 'secundario')), 'fill', { modo: 'barrido', dirRelleno: 'izq', color: '#f2efe8', textoCambia: 'si', textoColor: '#0c0c0e' }),
  ]), { stagger: { effect: 'up', trigger: 'load', duration: 0.8, delay: 1.15, step: 0.14, distance: 30, ...SUAVE } }),
], { minHeight: '80vh' });

// ------------------------------------------------------------------ 3. Cinta
const cinta = tira('Cinta', cintaTira(O2), O2);

// ------------------------------------------------------------------ 4. Manifiesto (ligado al scroll)
const manifiesto = seccion('Manifiesto', null, { gap: '32px', alignItems: 'center', textAlign: 'center', padding: `168px ${lado(900)}`, ...fondoModo(P) }, [
  entra(etiqueta('Lo que creemos', P), 'fade'),
  titular(tit(2, 'Una buena página no se lee de golpe: se va descubriendo mientras bajas.', { fontSize: '58px', lineHeight: '1.18' }, { fontSize: '32px' }), 'words', { stagger: 0.09, effect: 'blur', duration: 0.9 }),
  anim(n('container', { name: 'Línea', styles: { width: '160px', height: '2px', background: C.acento } }), { scrolllink: { effect: 'zoom-in', amount: 90, start: 20, end: 55 } }),
], { padding: '88px 24px' });

// ------------------------------------------------------------------ 5. Proceso (escena por scroll)
const paso = (nombre, num, titulo, bajada, arte, effect, step, extra = []) => anim(
  columna(nombre, { alignItems: 'center', gap: '18px', maxWidth: '760px', width: '100%' }, [
    etiqueta(`Paso ${num} de 3`, O),
    tit(2, titulo, { fontSize: '52px' }, { fontSize: '32px' }),
    lead(bajada, O, { maxWidth: '44ch' }),
    imagen(arte, titulo, { maxWidth: '640px', marginTop: '8px' }, 'Lámina'),
    ...extra,
  ]), { scenestep: { effect, step, move: 'up', distance: 70 } });

const proceso = n('section', {
  name: 'Proceso',
  styles: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px', ...fondoModo(O) },
  mobile: { padding: '24px 20px' },
  children: [
    paso('Paso 1', 1, 'Primero, el boceto', 'Ordenamos la historia antes de pintar nada.', arteBoceto(), 'out', 2),
    paso('Paso 2', 2, 'Luego, la forma', 'Tipografía, color y aire hasta que se sienta tuya.', arteForma(), 'inout', 2),
    paso('Paso 3', 3, 'Y cobra vida', 'Movimiento con intención, en un solo archivo.', arteViva(), 'in', 3),
  ],
});
proceso.content.anchor = 'proceso';
proceso.animation = { scene: { steps: '3', length: 4, transition: 22 } }; // corta a propósito: durante el cambio se ven dos pasos montados

// ------------------------------------------------------------------ 6. Trabajo (parallax en columnas)
const pieza = (arte, alt) => hover(imagen(arte, alt, {}, alt), 'lift', { duration: 0.35 });
const trabajo = seccion('Trabajo', 'trabajo', { gap: '72px', ...fondoModo(P) }, [
  columna('Cabecera', { gap: '14px' }, [
    entra(etiqueta('Trabajo reciente', P), 'fade'),
    titular(tit(2, 'Cada marca con su propio ritmo', { fontSize: '56px', maxWidth: '14ch' }, { fontSize: '34px' })),
  ]),
  n('container', { name: 'Mosaico', styles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }, mobile: { gridTemplateColumns: '1fr', gap: '20px' }, children: [
    parallax(columna('Columna izquierda', { gap: '40px' }, [pieza(arteEclipse(), 'Eclipse'), pieza(arteReticula(), 'Retícula')], { gap: '20px' }), 40),
    parallax(columna('Columna derecha', { gap: '40px', paddingTop: '140px' }, [pieza(arteDunas(), 'Dunas'), pieza(arteArcos(), 'Arcos')], { gap: '20px', paddingTop: '0' }), -70),
  ] }),
], { gap: '40px' });

// ------------------------------------------------------------------ 7. Palabras gigantes
const contorno = contornoTira(O);
contorno.content.marquesina = { ...contorno.content.marquesina, dir: 'der' };
const gigante = tira('Palabras gigantes', contorno, O, 56);

// ------------------------------------------------------------------ 8. Servicios (cascada + hover)
const tarjeta = (ic, t, txt) => columna('Tarjeta', tarjetaTema(O2, { gap: '16px', padding: '40px 32px', color: O2.fg }), [
  icono(ic, { width: '36px', height: '36px', color: C.acento }),
  tit(3, t),
  cuerpo(txt, O2),
]);
const servicios = seccion('Servicios', 'servicios', { gap: '56px', ...fondoModo(O) }, [
  titular(tit(2, 'Lo que hacemos', { textAlign: 'center' })),
  cascada(n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }, children: [
    tarjeta('palette', 'Identidad', 'Un sistema visual que se reconoce en medio segundo.'),
    tarjeta('zap', 'Movimiento', 'Animaciones que guían la vista sin estorbar.'),
    tarjeta('smartphone', 'En cualquier pantalla', 'Pensado para el teléfono tanto como para el escritorio.'),
  ] })),
]);

// ------------------------------------------------------------------ 9. Cifras
const cifra = (valor, t) => columna('Cifra', { alignItems: 'center', gap: '8px', textAlign: 'center' }, [
  texto(valor, { fontFamily: FUENTE.titulo, fontSize: '96px', lineHeight: '1', fontWeight: '500' }, { fontSize: '64px' }, 'Número'),
  etiqueta(t, P),
]);
const cifras = seccion('Cifras', null, { ...fondoModo(P) }, [
  cascada(n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }, mobile: { gridTemplateColumns: '1fr', gap: '40px' }, children: [
    cifra('48', 'Proyectos publicados'), cifra('7', 'Días de entrega media'), cifra('1', 'Solo archivo HTML'),
  ] }), 'zoom', 0.18),
]);

// ------------------------------------------------------------------ 10. Planes
const plan = (m, nombre, precio, ventajas, destacado) => columna('Plan', tarjetaTema(m, { gap: '18px', padding: '40px 32px', color: m.fg }), [
  etiqueta(nombre, m),
  texto(precio, { fontFamily: FUENTE.titulo, fontSize: '52px', lineHeight: '1.1', fontWeight: '500' }, { fontSize: '42px' }, 'Precio'),
  columna('Ventajas', { gap: '10px', flex: '1' }, ventajas.map((v) => fila('Ventaja', { gap: '10px', alignItems: 'center', flexWrap: 'nowrap' }, [
    icono('check', { width: '18px', height: '18px', color: C.acento }),
    texto(v, { fontSize: '15px', color: m.sec }),
  ]))),
  hover(boton('Elegir', '#contacto', { ...botonTema(m, 'm', destacado ? 'primario' : 'secundario'), textAlign: 'center' }), 'bright'),
]);
const precios = seccion('Precios', 'precios', { gap: '56px', ...fondoModo(MODOS.claro2) }, [
  titular(tit(2, 'Planes sin letra pequeña', { textAlign: 'center' })),
  cascada(n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }, children: [
    plan(P, 'Esencial', '$190', ['Una página', 'Diseño a medida', 'Lista en 5 días'], false),
    plan(O, 'Estrella', '$390', ['Escenas por scroll', 'Animaciones completas', 'Lista en 7 días'], true),
    plan(P, 'A medida', '$690', ['Varias páginas', 'Identidad incluida', 'Soporte 30 días'], false),
  ] })),
]);

// ------------------------------------------------------------------ 11. Cierre
const cierre = seccion('Contacto', 'contacto', { gap: '32px', alignItems: 'center', textAlign: 'center', padding: '176px 24px', ...fondoModo(O),
  fondoImagen: artePortada(), fondoAjuste: 'cover', fondoPosicion: 'bottom', fondoCapa: 55 }, [
  titular(tit(2, '¿La hacemos girar?', { fontSize: '88px', lineHeight: '1.05' }, { fontSize: '44px' }), 'chars', { stagger: 0.04 }),
  entra(lead('Cuéntanos tu idea y te respondemos hoy mismo.', O, { maxWidth: '40ch', color: '#d6d2c9' }), 'up', 0.2),
  entra(hover(boton('Escríbenos por WhatsApp', 'https://wa.me/50600000000', botonTema(O, 'l')), 'bgrow', { color: '#c4a76f' }), 'zoom', 0.35),
], { padding: '96px 20px' });

// ------------------------------------------------------------------ 12. Footer
const footer = n('section', {
  name: 'Footer',
  styles: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: `40px ${lado(ANCHO)}`, ...fondoModo(O2) },
  mobile: { flexDirection: 'column', textAlign: 'center', padding: '32px 20px' },
  children: [
    texto('Órbita', { fontFamily: FUENTE.titulo, fontWeight: '500', fontSize: '22px' }, {}, 'Marca'),
    pequeno('Estudio ficticio de muestra · hecho con WebEdiThor', O2, {}, 'Copyright'),
  ],
});

// ------------------------------------------------------------------ Salida
const page = createPage();
page.content.title = 'Órbita — landing de muestra';
page.content.lang = 'es';
page.styles.base = { ...page.styles.base, background: C.oscuro };
page.children.push(navbar, portada, cinta, manifiesto, proceso, trabajo, gigante, servicios, cifras, precios, cierre, footer);

writeFileSync('docs/demo-estrella.json', JSON.stringify({ app: 'editor-landings', version: 1, page }, null, 2));
console.log('docs/demo-estrella.json con', page.children.length, 'secciones');

const iHtml = process.argv.indexOf('--html');
if (iHtml !== -1) {
  const { exportHTML } = await import('../src/export/exporter.js');
  const { normalizePage } = await import('../src/core/tree.js');
  const informe = {};
  const limpia = normalizePage(structuredClone(page), informe);
  writeFileSync(process.argv[iHtml + 1], exportHTML(limpia));
  console.log('HTML en', process.argv[iHtml + 1], '· valores quitados al validar:', informe.quitados ?? 0);
}

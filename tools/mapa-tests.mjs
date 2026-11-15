// MAPA "archivo cambiado -> tests que le corresponden" para `npm run test:cambios` (tools/test-cambios.mjs).
// Los nombres de test son los de SUITE en tools/lib-tests.mjs (selenium, ronda7, controles, inspector, vistaprevia,
// persistencia, fondo, sidebar, iconos, tema, plan-ia, plan-ia-ui, menu-movil, menu-scroll, marquesina, marquesina-ui, editor-file, firefox).
//
// CÓMO AÑADIR UNA ENTRADA: una línea en MAPA con la ruta (con barras `/`, desde la raíz del proyecto) y la lista de tests.
//   - 'src/ui/fields.js': [...]   -> ese archivo exacto.
//   - 'src/blocks/': [...]        -> una carpeta entera (la ruta termina en `/`).
//   - Gana la coincidencia MÁS ESPECÍFICA (archivo > carpeta; carpeta más larga > carpeta más corta).
//   - TODOS = "esto es compartido, corre la suite completa". NINGUNO = no hace falta correr nada.
// Un archivo de src/ que no esté aquí hace correr la suite completa (y el script lo dice). Mejor añadirlo.
export const TODOS = 'TODOS';
export const NINGUNO = [];

export const MAPA = {
  // ---- Compartido: casi todo depende de esto -> suite completa ----
  'src/core/tree.js': TODOS,
  'src/core/store.js': TODOS,
  'src/render/renderer.js': TODOS,
  'src/export/exporter.js': TODOS,
  'src/main.js': TODOS,
  'src/styles/app.css': TODOS,
  'src/ui/preview.js': TODOS,

  // ---- Menú hamburguesa del navbar ----
  'src/core/menumovil.js': ['menu-movil', 'menu-scroll'],
  'src/blocks/navbar.js': ['menu-movil', 'menu-scroll', 'tema', 'plan-ia', 'plan-ia-ui'],

  // ---- Marquesina (ticker) ----
  'src/core/marquesina.js': ['marquesina', 'marquesina-ui'],
  'src/blocks/marquesina.js': ['marquesina', 'marquesina-ui', 'tema', 'plan-ia', 'plan-ia-ui'],

  // ---- Inspector y controles visuales ----
  'src/ui/controles.js': ['controles', 'inspector'],
  'src/ui/fields.js': ['controles', 'inspector', 'inspector-niveles'],
  'src/ui/inspector.js': ['controles', 'inspector', 'inspector-niveles', 'marquesina-ui', 'rebote-inspector', 'copiar-efectos'],
  'src/ui/tiradores.js': ['tiradores', 'rebote-inspector'],
  'src/ui/efectos.js': ['copiar-efectos'],
  'src/animations/copiar.js': ['copiar-efectos'],
  'src/ui/espaciado.js': ['tiradores'],
  'src/ui/imagen.js': ['fondo'],
  'src/ui/iconos.js': ['inspector', 'vistaprevia', 'sidebar', 'iconos'],
  'src/ui/toolbar.js': ['vistaprevia', 'persistencia', 'editor-file'],
  'src/ui/sidebar.js': ['sidebar', 'editor-file', 'fuga-estilos'],
  'src/ui/vistaprevia.js': ['vistaprevia'],

  // ---- IA: guía y plan ----
  'src/core/plan.js': ['plan-ia', 'plan-ia-ui'],
  'src/core/guiaia.js': ['plan-ia', 'plan-ia-ui'],
  'src/core/guiaia-ejemplos.js': ['plan-ia', 'plan-ia-ui'],
  'src/ui/plania.js': ['plan-ia-ui'],

  // ---- Iconos ----
  'src/core/icono.js': ['iconos', 'ronda7'],
  'src/blocks/iconos-data.js': ['iconos', 'tema'],
  'src/blocks/elements.js': ['iconos', 'tema', 'plan-ia'],

  // ---- Bloques y tema ----
  // tema.js lo usan todos los bloques: además de `tema` se rozan los tests que miran valores de bloques (inspector, fondo).
  'src/blocks/tema.js': ['tema', 'controles', 'inspector', 'fondo'],
  'src/blocks/': ['tema', 'plan-ia', 'plan-ia-ui', 'ronda7'], // cualquier otro bloque (hero, services, gallery, index.js, util.js...)

  // ---- Animaciones (CSS exportado, validación y su panel) ----
  'src/animations/hover.js': ['hover', 'hover-texto', 'hover-borde', 'hover-nuevos', 'selenium', 'ronda7'],
  'src/animations/focus.js': ['hover', 'hover-texto', 'hover-borde', 'hover-nuevos', 'selenium', 'ronda7'],
  'src/animations/parallax.js': ['parallax-nativo', 'parallax-recorte', 'selenium', 'ronda7'],
  'src/animations/scrollmotor.js': ['parallax-nativo', 'selenium', 'ronda7'],
  'src/animations/index.js': ['parallax-nativo', 'hover', 'selenium', 'ronda7', 'fuga-estilos'],
  'src/animations/base.js': ['hover', 'hover-texto', 'hover-borde', 'hover-nuevos', 'selenium', 'ronda7', 'inspector', 'vistaprevia'],
  'src/animations/': ['selenium', 'ronda7', 'inspector', 'vistaprevia'],

  // ---- Tests (cada archivo de tests/ corre su propio test; ver también `testDeArchivo` en test-cambios.mjs) ----
  'tests/generar.mjs': ['selenium', 'firefox'],
  'tests/setup.js': ['selenium', 'firefox'],
  'tests/playwright.config.js': ['firefox'],
  'tests/golden/': ['ronda7', 'selenium'],

  // ---- Herramientas ----
  'tools/lib-tests.mjs': TODOS,       // el runner compartido: si se rompe, se rompe todo
  'tools/test-todo.mjs': TODOS,
  'tools/test-firefox.mjs': ['firefox'],
  'tools/gen-guia-ia.mjs': ['plan-ia'],
  'tools/gen-demo-parallax.mjs': NINGUNO,
  'tools/gen-demo-estilo.mjs': ['tema'],
  'tools/gen-lenis.mjs': ['selenium'],
  'tools/renombrar-build.mjs': ['editor-file'],
  'tools/test-cambios.mjs': NINGUNO,  // este runner y su mapa no tienen test propio: se prueban a mano con --archivos
  'tools/mapa-tests.mjs': NINGUNO,

  // ---- Datos generados que algún test lee ----
  'docs/guia-ia.md': ['plan-ia', 'plan-ia-ui'],
  'docs/plan-ejemplo.json': ['plan-ia', 'plan-ia-ui'],
};

// Solo documentación: no corre nada. (Cualquier .md, la carpeta docs/ salvo lo de MAPA, y los .md dentro de src/.)
export const esSoloDocs = (ruta) => /\.md$/i.test(ruta) || ruta.startsWith('docs/');

// Archivos de config/raíz que afectan a todo (package.json, vite.config.js, index.html, lockfile...): suite completa.
// (No hace falta listarlos: lo que no es src/, tests/, tools/ ni docs se trata como compartido.)

// ÚNICO sitio donde la CLI toca el código del editor. Reutiliza el mismo exportador, el mismo validador de páginas
// y los mismos bloques que el editor del navegador, así lo que exporta la CLI es idéntico a lo que exporta el botón
// "Exportar HTML". Ninguno de estos módulos necesita DOM al importarse (se comprobó para exporter, tree y blocks).
//
// Las rutas suben tres niveles (cli/src/lib -> raíz del repo). Mientras la CLI viva dentro del repo funciona así;
// para publicarla en npm hará falta empaquetar estos módulos (ver cli/README.md, "Pendiente").
export { exportHTML } from '../../../src/export/exporter.js';
export { normalizePage, createPage } from '../../../src/core/tree.js';
export { createBlock } from '../../../src/blocks/index.js';

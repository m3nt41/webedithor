// npm run test:todo — toda la suite en secuencia, salida compacta (una línea por test) y un resumen.
// Construye UNA sola vez (los tests de Firefox leen dist/editor.html) y llama a los scripts directamente,
// sin el `npm run build &&` que llevan algunos scripts de package.json. Sin reintentos automáticos.
// test:firefox va al final; si Playwright no puede lanzar Firefox cuenta como "omitido" (código 3), no como fallo.
// La lista de tests y el runner viven en tools/lib-tests.mjs (los comparte con test-cambios.mjs).
import { SUITE, correr } from './lib-tests.mjs';

correr(SUITE);

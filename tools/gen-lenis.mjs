// Genera src/animations/lenis-min.js a partir de node_modules/lenis (build minificado, ~18 KB).
// Se corre con `npm run gen:lenis` si se actualiza la versión de lenis. El resultado se sube a git
// para que el exportador (y los tests en Node) puedan importarlo sin depender de Vite.
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../node_modules/lenis/', import.meta.url);
const ver = JSON.parse(readFileSync(new URL('package.json', dir), 'utf8')).version;
let js = readFileSync(new URL('dist/lenis.min.js', dir), 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '').trim();
if (js.includes('</script')) throw new Error('el build de lenis contiene </script: no se puede incrustar en un <script>');
writeFileSync(new URL('../src/animations/lenis-min.js', import.meta.url),
  `// GENERADO por tools/gen-lenis.mjs (lenis ${ver}, MIT). No se edita a mano.\nexport const LENIS_VERSION = ${JSON.stringify(ver)};\nexport const LENIS_MIN = ${JSON.stringify(js)};\n`);
console.log('lenis', ver, js.length, 'bytes');

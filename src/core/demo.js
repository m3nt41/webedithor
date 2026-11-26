// LANDING DE MUESTRA DE LA DEMO WEB.
// Solo existe en el build de la demo (`npm run build:demo`, o `npm run dev -- --mode demo` para probarla).
// En el build normal (dist/editor.html y la CLI) PAGINA_DEMO es null y el JSON no viaja en el archivo.
// La landing se genera con: node tools/gen-demo-estrella.mjs
import estrella from '../../docs/demo-estrella.json';

export const PAGINA_DEMO = import.meta.env.MODE === 'demo' ? estrella.page : null;

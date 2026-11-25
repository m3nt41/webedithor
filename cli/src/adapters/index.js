// ADAPTADORES DE PUBLICACIÓN. `publish` solo PREPARA una carpeta lista para subir: no hace ninguna llamada de red
// ni usa tokens. Para añadir un destino nuevo (vercel, netlify, ...) basta con añadir un objeto aquí con esta forma:
//
//   {
//     summary: 'una línea',
//     prepare({ html, outDir }) -> { files: ['ruta', ...], next: ['paso manual 1', ...] }
//   }
//
// `html` es el documento ya exportado; `outDir` es una carpeta ya creada. El adaptador escribe sus archivos ahí y
// devuelve qué escribió y qué debe hacer la persona a continuación.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const escribir = (outDir, nombre, contenido) => { writeFileSync(join(outDir, nombre), contenido); return nombre; };

export const ADAPTERS = {
  static: {
    summary: 'A folder with index.html, ready for any static host (Netlify drop, Cloudflare Pages, S3, your own server...)',
    prepare({ html, outDir }) {
      return {
        files: [escribir(outDir, 'index.html', html)],
        next: ['Upload the contents of the folder to your static host.'],
      };
    },
  },
  'github-pages': {
    summary: 'Like "static", plus .nojekyll so GitHub Pages serves the file as is',
    prepare({ html, outDir }) {
      return {
        files: [escribir(outDir, 'index.html', html), escribir(outDir, '.nojekyll', '')],
        next: [
          'Commit the contents of the folder to the branch GitHub Pages serves (for example gh-pages), or to /docs on main.',
          'Enable Pages in the repository Settings -> Pages.',
        ],
      };
    },
  },
};

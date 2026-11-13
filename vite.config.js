// Config de Vite. El build genera UN solo archivo (dist/editor.html) con todo
// el JS y CSS adentro, para abrirlo con doble clic (file://) sin servidor.
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './', // rutas relativas (con '/' el HTML buscaría /assets en la raíz del disco)
  plugins: [viteSingleFile()],
  server: { port: 5173, open: false },
});

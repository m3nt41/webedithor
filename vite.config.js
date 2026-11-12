// Config mínima de Vite. Sin plugins: todo es JS vanilla.
import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, open: false },
});

// Después del build: dist/index.html -> dist/editor.html (nombre más claro).
import { renameSync, existsSync } from 'node:fs';
if (existsSync('dist/index.html')) renameSync('dist/index.html', 'dist/editor.html');
console.log('dist/editor.html listo');

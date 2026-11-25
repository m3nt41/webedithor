// Pruebas de la CLI. Sin dependencias: node:test. Ejecutan la CLI de verdad (proceso aparte) en carpetas temporales.
// Correr:  cd cli && npm test      (o, desde la raíz del repo:  node --test cli/test/cli.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/webedithor.js', import.meta.url));
const run = (args, opts = {}) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', ...opts });
const carpeta = () => mkdtempSync(join(tmpdir(), 'webedithor-cli-'));
const limpiar = (d) => rmSync(d, { recursive: true, force: true });

// Una página a mano (con el envoltorio del editor) llena de problemas conocidos.
const nodo = (type, extra = {}) => ({ id: 'x' + Math.random().toString(36).slice(2, 8), type, name: extra.name ?? type, styles: { base: {}, mobile: {}, ...(extra.styles ?? {}) }, content: extra.content ?? {}, animation: null, children: extra.children ?? [] });
function paginaMala() {
  const grande = 'data:image/png;base64,' + 'A'.repeat(600 * 1024); // ~600 KB incrustados
  return {
    app: 'editor-landings', version: 1,
    page: nodo('page', { content: { title: 'Mi landing' }, children: [
      nodo('section', { name: 'Hero', content: { anchor: 'inicio' }, children: [
        nodo('heading', { name: 'Uno', content: { text: 'Uno', level: 1 } }),
        nodo('heading', { name: 'Dos', content: { text: 'Dos', level: 1 } }),
        nodo('heading', { name: 'Salto', content: { text: 'Salto', level: 4 } }),
        nodo('image', { name: 'Foto', content: { src: grande, alt: '' } }),
        nodo('button', { name: 'Roto', content: { text: 'Ir', href: '#no-existe' } }),
        nodo('button', { name: 'Vacío', content: { text: '', href: '#' } }),
        nodo('text', { name: 'Gris', content: { text: 'Texto casi invisible' }, styles: { base: { color: '#cccccc', background: '#ffffff' } } }),
      ] }),
    ] }),
  };
}

test('help, version y comandos desconocidos', () => {
  assert.equal(run(['--version']).status, 0);
  const ayuda = run(['--help']);
  assert.equal(ayuda.status, 0);
  for (const c of ['create', 'dev', 'audit', 'export', 'publish']) assert.match(ayuda.stdout, new RegExp(c));
  assert.equal(run(['audit', '--help']).status, 0);
  const mal = run(['no-existe']);
  assert.equal(mal.status, 2);
  assert.match(mal.stderr, /unknown command/);
});

test('create: crea el proyecto, el JSON es una página válida y no pisa carpetas con contenido', () => {
  const d = carpeta();
  try {
    const r = run(['create', join(d, 'mi-sitio'), '--template', 'minimal']);
    assert.equal(r.status, 0, r.stderr);
    for (const f of ['page.json', 'README.md', '.gitignore']) assert.ok(existsSync(join(d, 'mi-sitio', f)), f);
    const datos = JSON.parse(readFileSync(join(d, 'mi-sitio', 'page.json'), 'utf8'));
    assert.equal(datos.page.type, 'page');
    assert.equal(datos.page.content.title, 'Mi sitio');
    assert.equal(datos.page.children.length, 3);
    // segunda vez: la carpeta ya tiene contenido -> falla sin escribir
    const otra = run(['create', join(d, 'mi-sitio')]);
    assert.equal(otra.status, 1);
    assert.match(otra.stderr, /not empty/);
    // plantilla inexistente = mal uso
    assert.equal(run(['create', join(d, 'x'), '--template', 'saas']).status, 2);
  } finally { limpiar(d); }
});

test('export: produce un HTML completo igual al del exportador del editor', async () => {
  const d = carpeta();
  try {
    run(['create', join(d, 'p'), '--template', 'landing']);
    const out = join(d, 'p', 'dist', 'index.html');
    const r = run(['export', join(d, 'p', 'page.json'), '-o', out]);
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(out, 'utf8');
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<title>P<\/title>/);
    // misma salida que llamar al exportador directamente
    const { exportHTML, normalizePage } = await import('../src/lib/editor.js');
    const datos = JSON.parse(readFileSync(join(d, 'p', 'page.json'), 'utf8'));
    assert.equal(html, exportHTML(normalizePage(datos.page)));
    assert.equal(run(['export']).status, 2); // falta el archivo
    assert.equal(run(['export', join(d, 'nope.json')]).status, 1);
  } finally { limpiar(d); }
});

test('audit: una plantilla recién creada no tiene errores', () => {
  const d = carpeta();
  try {
    run(['create', join(d, 'p'), '--template', 'landing']);
    const r = run(['audit', join(d, 'p', 'page.json'), '--json']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(JSON.parse(r.stdout).summary.errors, 0);
  } finally { limpiar(d); }
});

test('audit: detecta los problemas conocidos de una página mala', () => {
  const d = carpeta();
  try {
    const f = join(d, 'mala.json');
    writeFileSync(f, JSON.stringify(paginaMala()));
    const r = run(['audit', f, '--json']);
    assert.equal(r.status, 1, 'con errores sale 1');
    const { findings, summary } = JSON.parse(r.stdout);
    const reglas = new Set(findings.map((x) => x.rule));
    for (const regla of ['h1-multiple', 'heading-order', 'img-alt', 'image-heavy', 'anchor-broken', 'link-placeholder', 'button-name', 'contrast', 'title-default']) {
      assert.ok(reglas.has(regla), `falta la regla ${regla}; salieron: ${[...reglas].join(', ')}`);
    }
    assert.ok(summary.errors >= 3);
    // el modo legible también corre y respeta el código de salida
    assert.equal(run(['audit', f]).status, 1);
  } finally { limpiar(d); }
});

test('audit --strict: las advertencias también fallan', () => {
  const d = carpeta();
  try {
    run(['create', join(d, 'p'), '--template', 'minimal']); // título "P": una advertencia de título corto
    const f = join(d, 'p', 'page.json');
    assert.equal(run(['audit', f]).status, 0);
    assert.equal(run(['audit', f, '--strict']).status, 1);
  } finally { limpiar(d); }
});

test('publish: prepara la carpeta según el destino y rechaza destinos desconocidos', () => {
  const d = carpeta();
  try {
    run(['create', join(d, 'p'), '--template', 'minimal']);
    const f = join(d, 'p', 'page.json');
    assert.equal(run(['publish', f, '--out', join(d, 's1')]).status, 0);
    assert.ok(existsSync(join(d, 's1', 'index.html')));
    assert.equal(run(['publish', f, '--to', 'github-pages', '--out', join(d, 's2')]).status, 0);
    assert.ok(existsSync(join(d, 's2', '.nojekyll')));
    const mal = run(['publish', f, '--to', 'ftp']);
    assert.equal(mal.status, 2);
    assert.match(mal.stderr, /unknown target/);
  } finally { limpiar(d); }
});

test('dev: sirve el editor en 127.0.0.1 y nada más', async () => {
  const d = carpeta();
  const editor = join(d, 'editor.html');
  writeFileSync(editor, '<!doctype html><title>fake editor</title>');
  const puerto = 20000 + Math.floor(Math.random() * 20000);
  const hijo = spawn(process.execPath, [BIN, 'dev', '--port', String(puerto)], { env: { ...process.env, WEBEDITHOR_EDITOR: editor } });
  try {
    await new Promise((ok, mal) => {
      const t = setTimeout(() => mal(new Error('dev no arrancó')), 8000);
      hijo.stdout.on('data', (b) => { if (String(b).includes('Editor running')) { clearTimeout(t); ok(); } });
      hijo.on('exit', (c) => { clearTimeout(t); mal(new Error('dev terminó con código ' + c)); });
    });
    const ok = await fetch(`http://127.0.0.1:${puerto}/`);
    assert.equal(ok.status, 200);
    assert.match(await ok.text(), /fake editor/);
    assert.equal((await fetch(`http://127.0.0.1:${puerto}/package.json`)).status, 404);
  } finally { hijo.kill(); limpiar(d); }
});

test('dev: si falta el editor compilado, lo explica', () => {
  const r = run(['dev'], { env: { ...process.env, WEBEDITHOR_EDITOR: join(tmpdir(), 'no-existe-editor.html') } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /npm run build/);
});

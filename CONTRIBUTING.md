# Contributing to WebEdiThor

Thanks for looking! This is a small project with a clear shape, so a few minutes with this page will save us both time.

Issues and PRs can be written in **English or Spanish**.

## Ways to help

- 🐞 **Report a bug**: use the bug template. Say which browser you saw it in (Firefox and Chrome behave differently here) and, if you can, attach the page JSON (**Save JSON**).
- 💡 **Suggest a feature**: open an issue first. The animation list in [`FEATURES.md`](FEATURES.md) is the official scope and is curated by the maintainer, so changes to it are discussed before any code.
- 🧱 **Add a block variant**: the easiest contribution. See [Adding things](#adding-things).
- 🎬 **Add or improve an animation**: one module per animation in `src/animations/`.
- 📝 **Docs, translations and tests** are always welcome.

## Setup

Requires Node.js 20.19+ (or 22.12+).

```bash
git clone https://github.com/m3nt41/webedithor.git
cd webedithor
npm install
npm run dev          # http://localhost:5173
```

`npm run build` produces `dist/editor.html`, a standalone editor. Several tests use that build.

## Project rules (the short version)

- **Page = JSON tree.** `page > section > elements`. Node: `{ id, type, name, styles: { base, mobile }, content, animation, children }`.
- **All state changes go through `mutate(fn)`** in `src/core/store.js`. Never edit the tree directly: undo/redo depends on it.
- **Layout is flex or grid only.** No free absolute positioning.
- **CSS first.** If an effect can be plain CSS in the export, it should be. JavaScript ships in an export only when a page uses a feature that needs it, and new scripts need maintainer approval.
- **One generator per shared thing.** Icons, marquee, mobile menu and backgrounds are generated in one place that both `renderer.js` and `exporter.js` call. Don't duplicate them.
- **Reading never writes.** Opening a node in the inspector must not change it; only user input does.
- **New dependencies** need a good reason in the PR (what it solves, size, whether it ships in exports).
- Keep code simple and commented; people edit this by hand.

## Adding things

**A block variant.** Blocks live in `src/blocks/` (one file each, registered in `blocks/index.js`). A variant is a function that returns a new tree. All visuals come from `blocks/tema.js`. After changing blocks or variants, regenerate the AI guide:

```bash
npm run gen:guia-ia   # rewrites docs/guia-ia.md and docs/plan-ejemplo.json
```

The guide has a length cap that `tests/plan-ia.mjs` enforces.

**An animation.** Create a module in `src/animations/`, register it in `animations/index.js`, and make sure `normalizar.js` validates its data. Export it as CSS when possible.

## Tests

The tests drive a real browser (mostly Firefox through Selenium), so you need Firefox installed.

```bash
npm run test:cambios   # runs only the tests related to what you changed (use this while developing)
npm run test:todo      # the full suite; run it once before opening a PR that touches shared code
```

Run the full suite if you touched `tree.js`, `store.js`, `renderer.js`, `exporter.js`, `app.css`, `package.json` or `tools/lib-tests.mjs`. Docs-only changes need no tests.

If you add a test, register it in `SUITE` (`tools/lib-tests.mjs`) and in the relevant lines of `MAPA` (`tools/mapa-tests.mjs`). A new file under `src/` needs its own line in `MAPA`; the map is manual.

`npm run test:firefox` (Playwright) may report **skipped** on some Windows machines when Firefox can't be launched. That is an environment issue, not a failure.

The CLI in [`cli/`](cli/README.md) has its own tests (no browser needed): `cd cli && npm test`. It imports the editor's exporter, so run them too if you change `exporter.js`, `tree.js` or the blocks.

There is no linter or TypeScript setup; please match the style of the surrounding code and don't reformat files you aren't changing.

## Pull requests

1. Branch from `main`; one focused change per PR.
2. Describe *what* changed and *why*, and how you checked it (which tests, which browser).
3. Include a screenshot or GIF for anything visual.
4. Update `FEATURES.md`/`PROGRESS.md` only if the maintainer asked, otherwise mention it in the PR and we'll sort it out.
5. Be patient: this is maintained by one person.

## About the AI context files

`CLAUDE.md`, `PROGRESS.md` and `docs/historial.md` are the maintainer's working notes (in Spanish). You don't need to read them to contribute, but `PROGRESS.md` has the up-to-date list of known bugs and limitations.

By contributing you agree that your work is released under the [MIT license](LICENSE) and that you'll follow the [Code of Conduct](CODE_OF_CONDUCT.md).

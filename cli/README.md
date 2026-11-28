# webedithor CLI

A small companion for the [WebEdiThor](../README.md) visual editor. It **complements** the editor, it does not replace it: you design in the editor and use the CLI to check, export and prepare the result.

> **Status: early (v0.1.0), published on npm as [`webedithor`](https://www.npmjs.com/package/webedithor).** Expect rough edges; see [Pending](#pending).

No runtime dependencies: just Node.js 20.19+. The package bundles the editor's own exporter, validator and blocks (and the compiled editor, for `dev`), so what the CLI exports is identical to the editor's **Export HTML** button.

## Try it

```bash
npx webedithor create my-site --template landing
cd my-site
npx webedithor dev                        # opens the visual editor
npx webedithor audit page.json
npx webedithor export page.json -o dist/index.html
npx webedithor publish page.json --to static
```

Or install it once with `npm install -g webedithor` and drop the `npx`.

**Working from a clone of this repo?** It runs straight from source, no build needed (except `npm run build` at the root for `dev`):

```bash
node cli/bin/webedithor.js create my-site --template landing
```

`cd cli && npm link` puts a `webedithor` command on your PATH.

## Commands

| Command | What it does |
|---|---|
| `create <folder> [--template minimal\|landing]` | Creates a project folder with a `page.json` built from the editor's own blocks, a short README and a `.gitignore`. Refuses to touch a folder that already has files. `--list` shows the templates. |
| `dev [--port 5180] [--open]` | Serves the compiled editor (bundled in the package) at `http://127.0.0.1:<port>`. Serves that one file and nothing else. |
| `audit <page.json> [--json] [--strict] [--check-external]` | Accessibility, links, heavy assets and basic SEO. Exit code 1 on errors (or on warnings with `--strict`), so it works in CI. |
| `export <page.json> [-o out.html]` | Writes the single static `.html`. Same bytes as the editor's export button. |
| `publish <page.json> [--to static\|github-pages] [--out site]` | Prepares a folder ready to upload. **It does not upload anything**: no network, no tokens. `--list` shows the targets. |

Every command supports `--help`.

### What `audit` checks

| Area | Checks |
|---|---|
| **a11y** | Images without alt text · buttons without text · missing or multiple `h1` · skipped heading levels · low text contrast (approximate: plain hex / `rgb()` colors only) |
| **links** | Placeholder links (`#`) · `#anchors` that no element has · duplicated anchors · external links that return errors (only with `--check-external`) |
| **assets** | Embedded images over 150 KB (warning) or 500 KB (error) · total HTML over 1 MB / 3 MB · external images over 500 KB (with `--check-external`) |
| **seo** | Missing, default, too short or too long title · missing, short (< 50) or long (> 160) meta description · Open Graph tags and share image · `<html lang>` (a note when the page doesn't set a language). The editor writes all of these from the page settings. |

It audits the page JSON (the source of truth) plus the HTML the editor would export, so it needs no HTML parser. `--check-external` is the only thing in the CLI that touches the network, and it only requests the URLs already in your page.

## The honest part: how projects work today

The editor keeps your page in the browser (`localStorage`) and cannot write to your project folder. So the workflow is:

1. `webedithor dev` → open the editor.
2. **Open JSON** → pick `page.json`, edit visually.
3. **Save JSON** → save it back over `page.json`.
4. `audit`, `export`, `publish` work on that file.

Making `dev` save straight into the folder needs a design decision (a tiny local save endpoint, or the File System Access API, which is Chromium-only). It is listed in the [roadmap](../ROADMAP.md).

## Templates

`minimal` and `landing` are combinations of the editor's blocks with the editor's example text. Links in the navbar or footer that point to sections a template doesn't include are left as `#`, and `audit` flags them as pending. Templates with real content (SaaS, portfolio...) are planned, not done.

## Adding a publish target

Targets are adapters in [`src/adapters/index.js`](src/adapters/index.js): an object with a `summary` and a `prepare({ html, outDir })` that writes files and returns what to do next. Adding Vercel or Netlify config files is a few lines. Anything that talks to a network or needs a token should be an explicit opt-in and discussed first.

## Tests

```bash
cd cli
npm test
```

They run the real CLI in temporary folders (9 tests, no dependencies, no browser needed).

## Releasing (maintainers)

`npm publish` inside `cli/` runs `prepack`, which builds the editor, bundles the CLI into `dist/cli.js` and copies the compiled editor next to it. Your npm account needs 2FA enabled. Check what will ship with `npm pack --dry-run`, and try the tarball in an empty folder before publishing.

## Pending

- Saving from the editor straight into the project folder.
- Real templates, and more audit rules (focus order, tap-target size, image dimensions).
- Hosting adapters beyond "prepare a folder" (Vercel, Netlify, Cloudflare Pages), as opt-in.

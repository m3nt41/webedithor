# Roadmap

An honest, living list. Nothing here is a promise or a date: it is the direction. Ideas are welcome through issues.

The animation scope itself is tracked in [`FEATURES.md`](FEATURES.md), and known bugs and limitations in [`PROGRESS.md`](PROGRESS.md).

## ✅ Shipped

- Tree, canvas, inspector, text editing and single-file HTML export
- Sections, mobile view, JSON save/load, undo/redo
- Animations: appear, text, stagger, hover / press / focus, named states, spring and bezier transitions
- Elements and 10 blocks (41 variants), icons, marquee, mobile hamburger menu
- Scroll: native parallax, scroll-linked, sticky, scroll scenes, optional smooth scroll
- Exact preview (iframe with the real export)
- Optional AI workflow without a server: copy the guide, paste the plan

## 🔜 Next: advanced motion

- Layout animations (elements that move smoothly when they change place or size)
- Drag with limits and bounce
- Inertia
- 3D transforms (perspective, X/Y rotation)

These are the cases where plain CSS isn't enough, so a small script (own code or [Motion](https://motion.dev)) will be used, and only shipped in an export when the page uses it.

## 🧭 Then

- **Extras:** custom cursor, page transitions.
- **Scenes:** more expressive scenes (text reveals, image zoom, changing background, step counter) and add/remove step buttons.
- **Inspector:** sliders for spacing, font size, radius and opacity; hover applied to all children at once; a "hide on mobile" option.
- **Editor tutorial** built into the app.
- **Hover parity:** make a few hovers look identical in the editor and in the export.

## 🛠️ Companion CLI (designed, not built)

A small command-line tool that **complements** the visual editor instead of replacing it. The idea, in order of how likely it is to come first:

| Command | Purpose |
|---|---|
| `audit` | Check an exported page: basic accessibility, broken links, heavy assets, basic SEO. |
| `export` | Produce the static HTML from a saved page JSON, without opening the editor. |
| `create` | Start a project from a template. Needs real project templates first. |
| `dev` | Serve the editor locally. Saving to a project folder needs a design decision (see below). |
| `publish` | A pluggable deploy interface (static hosts). No provider is implemented by default. |

Open design question: the editor currently keeps your page in the browser (`localStorage` + JSON files) and cannot write to a project folder. Making `create` / `dev` feel natural means either a small local save endpoint or the File System Access API (Chromium only). Opinions welcome.

## 🌍 Polish and reach

- Translate the editor interface (it is Spanish-only today) and add English.
- Public demo / playground.
- Real project templates (landing, SaaS, portfolio...).
- Logo, README GIFs and screenshots.
- Optional AI inside the editor: bring your own API key.

## 🚫 Not planned (for now)

- **A backend, accounts or hosting.** No-lock-in and nothing-to-host are core values.
- **React / framework export.** The output is deliberately a plain, readable static file.
- **Free absolute positioning.** Layout stays flex/grid so pages remain responsive.

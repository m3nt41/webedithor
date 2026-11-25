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
- SEO basics in the page settings: language, meta description, Open Graph / Twitter share image
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

## 🛠️ Companion CLI (early version exists)

A small command-line tool that **complements** the visual editor instead of replacing it. A first version (v0.1.0) lives in [`cli/`](cli/README.md) and is on npm: `npx webedithor`. It has `create`, `dev`, `audit`, `export` and `publish`, with no dependencies.

What is still open:

- **Save into the project folder.** The editor keeps your page in the browser (`localStorage` + JSON files) and cannot write to disk, so today `dev` + `create` rely on **Abrir JSON / Guardar JSON**. Fixing it means either a small local save endpoint or the File System Access API (Chromium only). Opinions welcome.
- **Real templates** (SaaS, portfolio...). Today `create` offers `minimal` and `landing`, built from the editor's blocks with example text.
- **More audit rules** and **more `publish` targets** (Vercel, Netlify, Cloudflare Pages), as explicit opt-ins. `publish` only prepares a folder today and never uploads.

## 🌍 Polish and reach

- Translate the editor interface (it is Spanish-only today) and add English.
- Public demo / playground.
- Logo, README GIFs and screenshots.
- Optional AI inside the editor: bring your own API key.

## 🚫 Not planned (for now)

- **A backend, accounts or hosting.** No-lock-in and nothing-to-host are core values.
- **React / framework export.** The output is deliberately a plain, readable static file.
- **Free absolute positioning.** Layout stays flex/grid so pages remain responsive.

# Editor visual de landings — contexto del proyecto

Lee este archivo y `PROGRESS.md` al empezar cualquier sesión. Este proyecto es independiente de `C:\Proyectos\CLAUDE.md` (el de m3nt41.com).

## Qué es
Editor visual de landings que corre 100% en el navegador (sin backend, hosting ni CMS). Uso personal: armar landings muy animadas para una página de ejemplos. El usuario final no toca código.

## Stack
- Vite + JS vanilla (módulos ES). Sin frameworks.
- `motion` (npm) como motor de animación (springs, scroll-linked, layout) — desde la Etapa 4.
- Guardado: JSON en localStorage + exportar/importar `.json` (Etapa 3).
- Exporta un solo `.html` (HTML + CSS + script mínimo de Motion). Si una animación se puede en CSS puro, se exporta en CSS.

## Arquitectura
- La página es un árbol JSON: `page > section > elementos`. Nodo: `{ id, type, name, styles:{base,mobile}, content, animation, children }`.
- Tipos: `page, section, container, heading, text, button, image`.
- `styles.base` = CSS camelCase; `styles.mobile` = solo lo que cambia en móvil (se superpone).
- Layout SOLO con flex/grid, nunca posiciones absolutas libres.
- `src/core/store.js` es el único estado. Se cambia SIEMPRE con `mutate(fn)` (clona la página; base para undo/redo). La UI se entera con `subscribe`.
- Bloques: un archivo por bloque en `src/blocks/`, registrados en `blocks/index.js`; cada bloque tiene variantes (funciones que devuelven un árbol nuevo).
- Cada animación = un módulo en `src/animations/`, editable sin romper los demás.
- Preview: `render/renderer.js` convierte el árbol en DOM (estilos inline, `data-id` para seleccionar).

## Estructura de carpetas
```
index.html, vite.config.js, package.json
src/
  main.js              arranque
  styles/app.css       estilos del editor
  core/tree.js         crear/buscar nodos
  core/store.js        estado + mutate + subscribe + acciones
  blocks/              hero, services, footer + index.js (registro)
  render/renderer.js   árbol -> DOM
  ui/                  sidebar.js, preview.js (selección + edición de texto), inspector.js, fields.js (campos del panel), toolbar.js
  animations/          un módulo por animación (Etapa 4+)
  export/exporter.js   árbol -> .html (una clase por nodo, @media para móvil)
```

## Reglas de trabajo
- Entregar archivos completos, no fragmentos. Explicar qué cambia y dónde.
- Código simple y comentado; el usuario lo modificará a mano.
- El usuario es m3nt41: español informal, Windows + VS Code, prefiere CSS puro antes que JS, guía paso a paso en terminal.
- Probar siempre en local con `npm run dev` antes de cualquier deploy.
- Una etapa a la vez. Al terminar: revisar bugs corriendo el proyecto, actualizar `PROGRESS.md` (hecho / pendiente / decisiones / bugs), commit de git con el nombre de la etapa, avisar y DETENERSE. No empezar la siguiente sin que lo pida.

## Etapas
1. Estructura, árbol JSON, render del preview, selección.
2. Panel de propiedades + edición directa de texto + exportar HTML.
3. Reordenar secciones, vista móvil/escritorio, guardar/abrir JSON, undo/redo.
4. Motor de animaciones (appear, hover, transiciones, texto).
5. Scroll (parallax, scroll-linked, sticky, escenas), 3D, drag, marquee, cursor.
6. Más bloques y variantes (hero, servicios, galería, testimonios, precios, contacto WhatsApp, footer; 3-4 variantes cada uno).

## Comandos
`npm install` · `npm run dev` (http://localhost:5173) · `npm run build`

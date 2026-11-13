# Editor visual de landings — contexto del proyecto

Lee este archivo, `FEATURES.md` y `PROGRESS.md` al empezar cualquier sesión. Este proyecto es independiente de `C:\Proyectos\CLAUDE.md` (el de m3nt41.com).

**FEATURES.md es la lista oficial de animaciones. Nunca recortes ni cambies esa lista sin preguntarme. Lee FEATURES.md al empezar cada sesión.**

## Qué es
Editor visual de landings que corre 100% en el navegador (sin backend, hosting ni CMS). Uso personal: armar landings muy animadas para una página de ejemplos. El usuario final no toca código.

## Stack
- Vite + JS vanilla (módulos ES). Sin frameworks.
- `motion` (npm) está instalado pero **sin usar** todavía. Decisión de m3nt41: opción (a), CSS puro donde se pueda y Motion solo en lo que obliga (drag con rebote, inercia, layout animations, scroll suave, scroll-linked en Firefox); se carga en el `.html` exportado solo si la página lo usa.
- Guardado: JSON en localStorage + exportar/importar `.json` (Etapa 3).
- Exporta un solo `.html`. Si una animación se puede en CSS puro, se exporta en CSS; solo se añade JS (script mínimo, Motion o propio) cuando el CSS no alcance y m3nt41 lo apruebe.

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
  core/tree.js         crear/buscar nodos, canContain (reglas de anidado), normalizePage (valida .json, incluido el anidado)
  core/store.js        estado + mutate(fn,tipo,clave) + historial undo/redo + autoguardado localStorage + acciones (select, setViewMode, setStyle, setContent, setAnimation, setName, addSection, addNode, addElement, removeNode, duplicateNode, moveNode, moveBy, puedeMover, moveSection, replacePage, newPage, undo/redo, play, refresh)
  blocks/              hero, services, gallery, testimonials, pricing, contact, footer (4 variantes c/u) + elements.js (elementos sueltos) + util.js (atajos) + index.js (registro)
  render/renderer.js   árbol -> DOM
  ui/                  sidebar.js, preview.js (selección + edición de texto), inspector.js, fields.js (campos del panel), toolbar.js (undo/redo, escritorio/móvil, nuevo/abrir/guardar JSON, exportar)
  animations/          un módulo por animación: appear, hover, text + base (efectos/curvas/keyframes) + index (registro GRUPOS_ANIM)
  export/exporter.js   árbol -> .html (una clase por nodo, @media para móvil)
```

## Reglas de trabajo
- Entregar archivos completos, no fragmentos. Explicar qué cambia y dónde.
- Código simple y comentado; el usuario lo modificará a mano.
- El usuario es m3nt41: español informal, Windows + VS Code, prefiere CSS puro antes que JS, guía paso a paso en terminal.
- Probar siempre en local con `npm run dev` antes de cualquier deploy.
- Pruebas en navegador: si la extensión Claude in Chrome está conectada (/chrome), úsala al final de cada bloque o etapa para probar lo visual e interactivo: arrastre con mouse real, scroll, sticky, animaciones, ancho móvil real y errores de consola. No la uses para cada cambio pequeño, solo una pasada por bloque.
- Si Chrome no está disponible, dilo y dime qué falta probar a mano.
- Chrome no reemplaza a Firefox, que es el navegador de m3nt41: lo que dependa de Firefox (scroll-linked, sticky, drag, animaciones) lo anotas en PROGRESS.md como "pendiente de probar en Firefox".
- Antes de probar, dime si hace falta tener `npm run dev` corriendo.
- Una etapa a la vez. Al terminar: revisar bugs corriendo el proyecto, actualizar `PROGRESS.md` (hecho / pendiente / decisiones / bugs), commit de git con el nombre de la etapa, avisar y DETENERSE. No empezar la siguiente sin que lo pida.

## Etapas
Cada función de `FEATURES.md` tiene una etapa asignada (se indica allí con `→ Etapa N`). Si cambia el reparto, se actualizan ambos archivos y se avisa a m3nt41.

**Hechas**
1. Estructura, árbol JSON, render del preview, selección. ✅
2. Panel de propiedades + edición directa de texto + exportar HTML. ✅
3. Reordenar secciones, vista móvil/escritorio, guardar/abrir JSON, undo/redo. ✅
4. Motor de animaciones base (CSS puro): appear (fade, slide, zoom, blur, voltear, al entrar en pantalla), hover, revelado de texto por letra y palabra, delay, stagger de texto. ✅
5. Elementos y bloques: árbol de capas con arrastrar entre contenedores, añadir/borrar/duplicar/mover elementos, atajos, 7 bloques × 4 variantes. ✅

**Pendientes**
6. **Transiciones y estados.** Rotación en appear; "al cargar" como disparador; press y focus con transición; variants (estados con nombre + animación entre ellos); spring real (rigidez, amortiguación, masa); tween con cubic-bezier editable; stagger entre hijos; texto por línea.
7. **Scroll.** Parallax, scroll-linked, sticky, escenas por scroll, scroll suave.
8. **Movimiento avanzado.** Layout animations, drag con límites y rebote, inercia, 3D transforms (perspectiva, rotación X/Y).
9. **Extras.** Marquee/ticker, cursor personalizado, page transitions.

## Comandos
`npm install` · `npm run dev` (http://localhost:5173) · `npm run build`

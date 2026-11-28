# Editor visual de landings — contexto del proyecto

Al empezar cualquier sesión lee este archivo, `FEATURES.md` (no se toca) y `PROGRESS.md` (estado actual, próxima etapa, pendientes, decisiones vigentes, tests y lo pendiente de Firefox). **`docs/historial.md` (detalle de las etapas 1 a 7 y de las mini-etapas del 13 y 14 de noviembre) solo se lee si hace falta** saber cómo o por qué se hizo algo. Al cerrar una etapa: mueve su detalle a `docs/historial.md` y deja en `PROGRESS.md` solo el estado al día. Aquí manda este archivo; además se carga `C:\Proyectos\CLAUDE.md`, que trae las reglas comunes de trabajo y el mapa de proyectos (si chocan, gana el de esta carpeta).

**FEATURES.md es la lista oficial de animaciones. Nunca recortes ni cambies esa lista sin preguntarme. Lee FEATURES.md al empezar cada sesión.**

## Qué es
Editor visual de landings que corre 100% en el navegador (sin backend, hosting ni CMS). Uso personal: armar landings muy animadas para una página de ejemplos. El usuario final no toca código.

## Stack
- Vite + JS vanilla (módulos ES). Sin frameworks.
- **Dependencias (decisión de m3nt41):** no ser estricto con CSS puro ni con "sin dependencias" cuando una librería resuelve mejor el problema; lo importante es que quede bien. Se puede añadir una librería si es la mejor solución; solo viaja en el HTML exportado si la página la usa; sigue avisando qué se añade y por qué. Ya añadida: `lenis` (scroll suave, inline en el export).
- `motion` (npm) está instalado pero **sin usar** todavía. Decisión de m3nt41: opción (a), CSS puro donde se pueda y Motion solo en lo que obliga (drag con rebote, inercia, layout animations, scroll suave, scroll-linked en Firefox); se carga en el `.html` exportado solo si la página lo usa.
- Guardado: JSON en localStorage + exportar/importar `.json`.
- Exporta un solo `.html`. Si una animación se puede en CSS puro, se exporta en CSS; solo se añade JS (script mínimo, Motion o propio) cuando el CSS no alcance y m3nt41 lo apruebe.

## Arquitectura
- La página es un árbol JSON: `page > section > elementos`. Nodo: `{ id, type, name, styles:{base,mobile}, content, animation, children }`.
- Tipos: `page, section, container, heading, text, button, image, icon` (`icon` = SVG de `blocks/iconos-data.js`, sin hijos; el SVG lo genera UNA función, `core/icono.js`, para editor y export). La marquesina es un `container` con `content.marquesina`.
- `styles.base` = CSS camelCase; `styles.mobile` = solo lo que cambia en móvil (se superpone).
- Layout SOLO con flex/grid, nunca posiciones absolutas libres.
- `src/core/store.js` es el único estado. Se cambia SIEMPRE con `mutate(fn)` (clona la página; base para undo/redo). La UI se entera con `subscribe`.
- Bloques: un archivo por bloque en `src/blocks/`, registrados en `blocks/index.js`; cada bloque tiene variantes (funciones que devuelven un árbol nuevo). Hoy son 10 bloques y 41 variantes (navbar, hero, services, gallery, testimonials, pricing, scene, marquesina, contact, footer). Todo el estilo visual sale de `blocks/tema.js`.
- Cada animación = un módulo en `src/animations/`, editable sin romper los demás.
- Un solo punto de generación por cosa compartida entre editor y export (icono, marquesina, menú móvil, fondo): `renderer.js` y `exporter.js` lo llaman, no lo duplican.
- Preview del editor: `render/renderer.js` convierte el árbol en DOM (estilos inline, `data-id` para seleccionar). La Vista previa (👁) es un iframe con el HTML exportado real.

## Estructura de carpetas
```
index.html, vite.config.js, package.json, abrir-editor.bat
src/
  main.js              arranque
  styles/app.css       estilos del editor
  core/                tree.js (nodos, canContain, normalizePage), store.js (estado, mutate, undo/redo, autoguardado, acciones),
                       icono.js, marquesina.js, menumovil.js (generadores compartidos), plan.js + guiaia.js + guiaia-ejemplos.js (IA camino 1)
  blocks/              un archivo por bloque + index.js (registro), tema.js (estilo único), util.js (atajos), elements.js (elementos sueltos), iconos-data.js
  i18n/                traducción de la interfaz: index.js (t(), idioma) + es.js (base y respaldo) + en.js
  render/renderer.js   árbol -> DOM del preview
  ui/                  sidebar, preview, inspector, fields, controles (lógica pura de los controles visuales), toolbar, vistaprevia, plania, imagen, iconos
  animations/          un módulo por animación (appear, hover, press, focus, text, stagger, variants, parallax, scrolllink, scene, scenestep),
                       base (efectos/curvas), index (registro GRUPOS_ANIM), normalizar (valida node.animation), scrollmotor, scrollsuave (+ lenis-min.js GENERADO)
  export/exporter.js   árbol -> .html (una clase por nodo, @media para móvil)
cli/                   CLI de WebEdiThor (paquete propio, sin dependencias; importa el exportador del editor). Pruebas: `cd cli && npm test`
tools/                 test-todo, test-cambios, mapa-tests, lib-tests, test-firefox, gen-guia-ia, gen-demo-estilo, gen-lenis, renombrar-build
tests/                 un .mjs por área (Selenium/Node), firefox.spec.js (Playwright), golden/
docs/                  historial.md, guia-ia.md y plan-ejemplo.json (GENERADOS), demo-estilo.json (generado)
dist/editor.html       editor compilado en un solo archivo (doble clic)
```

## Reglas de trabajo
- Entregar archivos completos, no fragmentos. Explicar qué cambia y dónde. Código simple y comentado; el usuario lo modificará a mano.
- El usuario es m3nt41: español informal, Windows + VS Code, prefiere CSS puro antes que JS, guía paso a paso en terminal.
- **Textos de la interfaz:** siempre con `t('clave')`, y la clave en `src/i18n/es.js` Y `en.js` (lo vigila `tests/i18n.mjs`).
- **Inspector: leer nunca escribe.** Abrir un nodo con un valor raro lo marca "Otro" y no lo toca; solo se escribe cuando m3nt41 pulsa o teclea algo.
- **Guía de IA**: se genera sola del código. Al cambiar bloques o variantes, correr `npm run gen:guia-ia` (regenera `docs/guia-ia.md` y `docs/plan-ejemplo.json`). La guía tiene tope de longitud (≤17 900 caracteres, lo vigila `tests/plan-ia.mjs`). Un bloque con `excluidoIA: true` (hoy la marquesina) no entra en la guía y el plan lo rechaza.
- **Después de los cambios, `npm run build`** para que `dist/editor.html` (el de doble clic) quede al día.
- Probar en local con `npm run dev` antes de cualquier deploy; avisa si hace falta tenerlo corriendo.
- **Pruebas en navegador: Selenium en Firefox** (es el navegador de m3nt41) es lo normal; Chrome (extensión Claude in Chrome, /chrome) es opcional, solo si ayuda y está conectado. Una pasada por bloque o etapa, no por cada cambio pequeño. Lo que no se pueda ver sin ojos (aspecto, animación) se anota en `PROGRESS.md`, "Pendiente de probar a ojo en Firefox".
- **Git: commit siempre al terminar cada tarea o etapa** (mensaje claro con el nombre de la etapa o la tarea; `git add` de archivos concretos, no `-A`). **Push solo cuando m3nt41 lo pida.**
- Una etapa a la vez. Al terminar: revisar bugs corriendo el proyecto, actualizar `PROGRESS.md` (hecho / pendiente / decisiones / bugs), commit, avisar y DETENERSE. No empezar la siguiente sin que lo pida.

## Etapas
Cada función de `FEATURES.md` tiene una etapa asignada (se indica allí con `→ Etapa N`). Si cambia el reparto, se actualizan ambos archivos y se avisa a m3nt41.

**Hechas:** 1 estructura, árbol y preview · 2 inspector, edición de texto y export · 3 secciones, móvil, JSON y undo/redo · 4 animaciones base · 5 elementos y bloques · 6 transiciones y estados · 7 scroll (parallax, ligado, sticky, escenas, scroll suave). También hechas como mini-etapas (ver `PROGRESS.md`): marquesina, menú móvil, IA camino 1, tema visual.

**Pendientes**
8. **Movimiento avanzado.** Layout animations, drag con límites y rebote, inercia, 3D transforms (perspectiva, rotación X/Y).
9. **Extras.** Cursor personalizado, page transitions (el marquee ya está hecho).

## Tests
- Detalle y cómo añadir al mapa: `PROGRESS.md`, sección "Tests". Suite completa: `npm run test:todo` (UNA vez, lee solo el resumen).
- **En mini-etapas usa `npm run test:cambios`** (corre solo lo que le toca a lo que cambió; solo documentación → no corre nada). Si añades un test o un archivo de `src/` nuevo, añade su línea al mapa (`tools/mapa-tests.mjs`, `tools/lib-tests.mjs`).
- La suite completa solo al cerrar una etapa grande o si tocaste algo compartido (`tree.js`, `store.js`, `renderer.js`, `exporter.js`, `app.css`, `package.json`, `tools/lib-tests.mjs`).
- `test:firefox` (Playwright) va al final y, si no puede lanzar Firefox (`spawn UNKNOWN`), sale como "omitido" (código 3), no como fallo. Nunca reintentes ni depures ese fallo de entorno.
- Máximo 1 reintento de un test que falle, y solo si hay motivo para pensar que fue intermitente.
- No abras ni cierres servidores o navegadores de más; al terminar no dejes procesos abiertos de prueba (`npm run dev`, geckodriver, Firefox de prueba). Los Firefox sin perfil temporal son de m3nt41: no se tocan.

## Comandos
`npm install` · `npm run dev` (http://localhost:5173) · `npm run build` · `npm run gen:guia-ia`

# PROGRESS

Estado al día. El detalle de las etapas 1 a 7 (qué se hizo, cómo se verificó, bugs arreglados, límites) está en `docs/historial.md`: **solo se lee si hace falta**. Reparto de etapas en `CLAUDE.md`; lista oficial de funciones en `FEATURES.md` (no se toca).

## Estado actual
- **Hechas las etapas 1 a 7**: estructura/árbol/preview, inspector y export, secciones/móvil/JSON/undo, animaciones base, elementos y bloques, navbar y anclas (5.5), transiciones y estados (6), y scroll (7: sticky, parallax, scroll-linked, escenas por scroll y scroll suave opcional).
- **Tests**: `npm run test:selenium` (17 pruebas en tu Firefox real, perfil temporal, sobre el HTML exportado; ruta cambiable con `FIREFOX_BIN`) y `node tests/ronda7.mjs` (validación de datos y export, en Node). `npm run build` compila. Playwright (`npm run test:firefox`) está configurado pero su Firefox propio no arranca en este PC; aquí sirve Selenium.
- Último commit: scroll suave (`1c44f26`) más esta reorganización de docs.

## Próxima etapa
**Etapa 8 — Movimiento avanzado**: layout animations, drag con límites y rebote, inercia, 3D transforms (perspectiva, rotación X/Y). Después, **Etapa 9 — Extras**: marquee/ticker, cursor personalizado, page transitions. Asignación en `FEATURES.md`. Una etapa a la vez; al terminar: revisar bugs, actualizar este archivo, commit y detenerse.
- Pendiente de m3nt41 antes de cerrar scroll suave: **una ronda de afinación** de los valores `SUAVE` (`src/animations/scrollsuave.js`: `inercia` 0.1, `paso` 1, `pxPorLinea` 40, `minRueda` 50, `pausaTrackpad` 600) con una página exportada; si no convence, decidir entre dejarlo o pasar a Lenis.

## Pendientes y bugs conocidos
**Decisiones abiertas**
- `!important` en los estados (variants): aplicar o no la alternativa (a) (estados cargar/entrar como transición con clase en vez de `@keyframes … forwards`; arreglaría el "entra de golpe" y quitaría el `!important`, pero cambia el export). Análisis en `docs/historial.md`, Etapa 6.
**Limitaciones conocidas (no son bugs de la lista)**
- Imágenes subidas son data URL: pueden inflar el `.html` y el JSON.
- Arrastrar capas solo se probó con eventos sintéticos en Chromium; no se puede arrastrar desde el preview ni desde la paleta; el árbol de capas no tiene "plegar todo".
- Variants: hover/press/focus sobre una propiedad que mantiene un estado "al cargar/entrar" entra de golpe; un estado interactivo siempre gana a uno de cargar/entrar; hover/press/focus viejos + un estado que cambia lo mismo → gana el estado; estado por clic en algo que no es botón no se activa con teclado; "Color de fondo" usa `background-color` (no se ve sobre degradado/imagen); el `!important` hace que "Ver" y los overrides móviles pierdan contra el estado activo.
- Parallax/ligado: no combinar con "Al aparecer" sobre la misma propiedad; el preview no tiene `overflow:hidden` (una imagen con parallax se sale de su marco); un elemento sticky mide su sitio normal para el progreso.
- Escenas: los hijos invisibles siguen recibiendo clics; la opacidad propia de un hijo de escena se ignora; en móvil la traducción de alineación usa estilos de escritorio y las reglas de dirección/separación/columnas no valen; no combinar parallax/ligado en la sección de una escena ni estados cargar/entrar con escenas.
- Texto por línea (medida) con "al cargar": el re-medido puede dar un salto pequeño si las fuentes cargan tarde. Spring: no se interrumpe con continuidad de velocidad (haría falta Motion). Se pide navegador de 2023+ (`translate`/`scale` individuales, `linear()`); `contenteditable="plaintext-only"` pide Firefox 136+ (hay fallback).
- Scroll suave: la detección de trackpad es una heurística (un mouse de precisión con deltas < 50 px quedaría nativo); posible doble suavizado si el navegador ya suaviza; la rueda sobre un iframe no se intercepta; el test del ancla no distingue la cancelación por `click` de la de `mousedown`.
- Las mediciones en el panel de pruebas dan 0 si la ventana está oculta (no es un bug del editor). `npm run dev` usa el puerto 5173 (si está ocupado, Vite elige otro).
- Páginas guardadas antes de la Etapa 5.5 no tienen anclas (se ponen a mano).

## Decisiones vigentes
- **Motion vs CSS puro (m3nt41): opción (a)**: CSS puro donde se pueda; script propio mínimo o Motion solo en lo que obliga (drag con rebote, inercia, layout animations). `motion` está instalado pero sin usar. Un script solo viaja en el export si la página lo usa y m3nt41 lo aprobó.
- **Scroll suave**: opción (b), script propio aislado (`animations/scrollsuave.js`), opcional por página y apagado por defecto; solo rueda de mouse en escritorio; sin Lenis salvo que la ronda de afinación no convenza.
- Valores CSS del panel como texto libre; fuentes solo del sistema (el export no depende de internet); preview en `div` (no iframe); breakpoint móvil del export 768 px y preview móvil de 390 px.
- En vista móvil todo cambio del panel se guarda solo en `styles.mobile`; vacío = vuelve al valor de escritorio.
- El historial de undo, la selección y la vista no se guardan (la página sí: localStorage `editor-landings:pagina` + `.json`).
- Anclas: válidas = empiezan con letra y solo letras sin tildes/ñ, números y guiones; el export añade `[id]{scroll-margin-top:90px}` solo si hay una sección pegada arriba con `top`.
- Navbar sticky nace con `position:sticky; top:0; z-index:50`; "Posición" sirve para quitarlo.
- `prefers-reduced-motion`: apaga animaciones de entrada y transiciones; parallax/ligado/escenas quedan en reposo y visibles; sticky (CSS puro) no se apaga; scroll suave no corre. Sin JS (`<noscript>`) todo se ve quieto.
- "Al aparecer" por defecto es por scroll; "al cargar" va sin script. Estados interactivos con `!important` (ver decisión abierta).
- Todo lo marcado `[x]` en `FEATURES.md` es cierto; no se recorta ni cambia esa lista sin preguntar.

## Pendiente de probar en Firefox
Ya confirmado en Firefox 160 sobre el **HTML exportado** (Selenium): sticky arriba/abajo, parallax, ligado, press, focus con Tab, estado por clic, texto por línea (medida) al achicar la ventana, escena completa con navbar, parallax + hover sin arrastre de transición, y scroll suave (inercia, trackpad y scroll interno nativos, teclado, ancla, convivencia con parallax/sticky/escenas, `reduced-motion` real).
**Sigue pendiente (a mano):**
- **Preview del editor** en Firefox (el editor en sí): arrastre de capas con mouse real, sticky del navbar en el preview, saltos de ancla con `scroll-margin-top`, vista móvil del editor (navbar en dos filas, sin scroll horizontal).
- `prefers-reduced-motion` desde los ajustes del sistema (solo se probó con la preferencia de un perfil temporal) y ancho de teléfono real con `100svh` y barra de direcciones móvil.
- Estado por clic por teclado; fluidez a ojo de parallax, ligado, escenas y cascada; otras versiones de Firefox.
- Cascada de hijos con scroll real y animación a ojo; preview del editor con ▶ Reproducir en los 3 modos de texto nuevos; "Por línea (medida)" tras `document.fonts.ready` con una fuente web real (hoy el export solo usa fuentes del sistema).
- **Scroll suave: la sensación con una rueda física y un trackpad reales** (y en Chrome/Edge/Safari).
- `:active` y `:focus-visible` con mouse/teclado reales en el preview del editor (en el export ya se probaron).

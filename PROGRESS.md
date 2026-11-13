# PROGRESS

Estado al día. El detalle de las etapas 1 a 7 (qué se hizo, cómo se verificó, bugs arreglados, límites) está en `docs/historial.md`: **solo se lee si hace falta**. Reparto de etapas en `CLAUDE.md`; lista oficial de funciones en `FEATURES.md` (no se toca).

## Estado actual
- **Hechas las etapas 1 a 7**: estructura/árbol/preview, inspector y export, secciones/móvil/JSON/undo, animaciones base, elementos y bloques, navbar y anclas (5.5), transiciones y estados (6), y scroll (7: sticky, parallax, scroll-linked, escenas por scroll y scroll suave opcional).
- **Tests**: `npm run test:selenium` (19 pruebas en tu Firefox real, perfil temporal, sobre el HTML exportado; ruta cambiable con `FIREFOX_BIN`), `node tests/ronda7.mjs` (validación de datos y export, en Node) y `npm run test:preview` (`tests/preview-play.mjs`: el preview del editor a 1200px, hace falta `npm run build` antes). `npm run build` compila. Playwright (`npm run test:firefox`) está configurado pero su Firefox propio no arranca en este PC; aquí sirve Selenium.
- **Editor sin servidor**: `npm run build` genera `dist/editor.html` (un solo archivo, ~106 KB, JS y CSS inline; `vite-plugin-singlefile` + `base: './'`). Se abre con doble clic (o `abrir-editor.bat`) en Firefox/Chrome, sin `npm run dev`. Probado en Firefox real desde `file://` con `node tests/editor-file.mjs` (abre, agrega bloque, localStorage, exportar HTML, sin errores).
- **Limitación de localStorage**: se guarda por dirección. El editor abierto como `file://…/editor.html` y el de `http://localhost:5173` tienen almacenamientos separados (y cada ruta de archivo distinta también), así que NO ven la misma página guardada. Para pasar trabajo de uno a otro: **Guardar JSON** en uno y **Abrir JSON** en el otro.
- **Preview: modo reproducir solo con ▶** (bug de las escenas que "se activaban solas"): antes cualquier cambio del panel de animaciones (`setAnimation`, estados/variants) reproducía el preview, y eso encendía las escenas por scroll; cambiar la Posición del navbar a Normal redibujaba en modo edición y parecía que las apagaba (el navbar no tenía que ver; el HTML exportado nunca tuvo el problema). Ahora esos cambios emiten `'page'`; solo el botón ▶ entra al modo reproducir (`state.reproduciendo` en el store). Se sale con ▶ otra vez (el botón pasa a "■ Salir de reproducir"), con Esc o con cualquier cambio de la página/vista. Indicador: botón resaltado, etiqueta "● Reproduciendo" y marco violeta en el preview. Test: `tests/preview-play.mjs` (navbar sticky + planes con "crecer hasta su tamaño" + 2 escenas, 1200px). Consecuencia a propósito: añadir un efecto ya no lo reproduce solo; hay que pulsar ▶ para verlo.
- Últimos cambios: ver `git log`.
- **Scroll suave ahora usa Lenis 1.3.27** (reemplaza el script propio, que se veía escalonado al final en Firefox real). `animations/scrollsuave.js` envuelve Lenis; `animations/lenis-min.js` es GENERADO (`npm run gen:lenis`, build minificado de 18.8 KB). El export sigue siendo un solo `.html`: con el interruptor activo Lenis va inline (+~19 KB, el export de prueba pasa de poco a ~+19 KB) y apagado no viaja nada. Se mantiene: apagado por defecto, nada en `prefers-reduced-motion` ni en táctil/sin mouse. Teclado, barra de scroll y anclas `#` quedan nativos: el script pausa Lenis (`stop`) y lo reanuda en la siguiente rueda (sin esto Lenis tiraba de vuelta al destino viejo). Valores en `SUAVE` (`lerp` 0.1, `wheelMultiplier` 1). Tests: 19/19 en Selenium y ronda7 ok; el test de la cola se reemplazó por uno que verifica final estable sin retroceso; se quitó `tests/medir-suave.mjs` y el test de trackpad (Lenis suaviza también el trackpad). Probado a ojo por m3nt41: se siente raro, ver Pendientes de baja prioridad.

## Próxima etapa
**Etapa 8 — Movimiento avanzado**: layout animations, drag con límites y rebote, inercia, 3D transforms (perspectiva, rotación X/Y). Después, **Etapa 9 — Extras**: marquee/ticker, cursor personalizado, page transitions. Asignación en `FEATURES.md`. Una etapa a la vez; al terminar: revisar bugs, actualizar este archivo, commit y detenerse.

## Pendientes y bugs conocidos
**Decisiones abiertas**
- `!important` en los estados (variants): aplicar o no la alternativa (a) (estados cargar/entrar como transición con clase en vez de `@keyframes … forwards`; arreglaría el "entra de golpe" y quitaría el `!important`, pero cambia el export). Análisis en `docs/historial.md`, Etapa 6.
**Bugs abiertos**
- Ninguno conocido.
**Pendientes de baja prioridad**
- Scroll suave (Lenis 1.3.27, SUAVE: lerp 0.1, wheelMultiplier 1) se siente raro en Firefox y Chrome de m3nt41, y en el demo oficial de Lenis también; apagado por defecto y no viaja en el export si está apagado; revisar más adelante (probar duration en vez de lerp, o dejarlo apagado).
**Limitaciones conocidas (no son bugs de la lista)**
- Imágenes subidas son data URL: pueden inflar el `.html` y el JSON.
- Arrastrar capas solo se probó con eventos sintéticos en Chromium; no se puede arrastrar desde el preview ni desde la paleta; el árbol de capas no tiene "plegar todo".
- Variants: hover/press/focus sobre una propiedad que mantiene un estado "al cargar/entrar" entra de golpe; un estado interactivo siempre gana a uno de cargar/entrar; hover/press/focus viejos + un estado que cambia lo mismo → gana el estado; estado por clic en algo que no es botón no se activa con teclado; "Color de fondo" usa `background-color` (no se ve sobre degradado/imagen); el `!important` hace que "Ver" y los overrides móviles pierdan contra el estado activo.
- Parallax/ligado: no combinar con "Al aparecer" sobre la misma propiedad; el preview no tiene `overflow:hidden` (una imagen con parallax se sale de su marco); un elemento sticky mide su sitio normal para el progreso.
- Escenas: los hijos invisibles siguen recibiendo clics; la opacidad propia de un hijo de escena se ignora; en móvil la traducción de alineación usa estilos de escritorio y las reglas de dirección/separación/columnas no valen; no combinar parallax/ligado en la sección de una escena ni estados cargar/entrar con escenas.
- Texto por línea (medida) con "al cargar": el re-medido puede dar un salto pequeño si las fuentes cargan tarde. Spring: no se interrumpe con continuidad de velocidad (haría falta Motion). Se pide navegador de 2023+ (`translate`/`scale` individuales, `linear()`); `contenteditable="plaintext-only"` pide Firefox 136+ (hay fallback).
- Scroll suave: la rueda sobre un iframe no se intercepta; Lenis también suaviza el trackpad.
- Las mediciones en el panel de pruebas dan 0 si la ventana está oculta (no es un bug del editor). `npm run dev` usa el puerto 5173 (si está ocupado, Vite elige otro).
- Páginas guardadas antes de la Etapa 5.5 no tienen anclas (se ponen a mano).

## Decisiones vigentes
- **Motion vs CSS puro (m3nt41): opción (a)**: CSS puro donde se pueda; script propio mínimo o Motion solo en lo que obliga (drag con rebote, inercia, layout animations). `motion` está instalado pero sin usar. Un script solo viaja en el export si la página lo usa y m3nt41 lo aprobó.
- **Scroll suave**: Lenis (dependencia aprobada), aislado en `animations/scrollsuave.js`, opcional por página y apagado por defecto; solo escritorio con mouse.
- **Dependencias (m3nt41)**: no ser estricto con CSS puro ni con "sin dependencias" si una librería resuelve mejor el problema; lo importante es que quede bien. Se puede añadir una librería si es la mejor solución, solo viaja en el `.html` exportado si la página la usa, y se avisa qué se añade y por qué.
- Valores CSS del panel como texto libre; fuentes solo del sistema (el export no depende de internet); preview en `div` (no iframe); breakpoint móvil del export 768 px y preview móvil de 390 px.
- En vista móvil todo cambio del panel se guarda solo en `styles.mobile`; vacío = borra el override y vuelve al valor de escritorio (para volver a un valor "normal" en móvil hay que elegir el valor explícito, ver abajo).
- El historial de undo, la selección y la vista no se guardan (la página sí: localStorage `editor-landings:pagina` + `.json`).
- Anclas: válidas = empiezan con letra y solo letras sin tildes/ñ, números y guiones; el export añade `[id]{scroll-margin-top:90px}` solo si hay una sección pegada arriba con `top`.
- Navbar sticky nace con `position:sticky; top:0; z-index:50`; "Posición" → "Normal" lo quita en escritorio. En móvil hay dos opciones: "Igual que escritorio" (sin override) y "Normal" (`position:static` explícito en `styles.mobile`), así se puede tener sticky en escritorio y normal en móvil.
- **Selects con opción vacía en móvil**: solo los que tienen `vacioMovil` en `fields.js` (Posición→static, Tipo/display→block, Recortar→visible, Fuente→inherit, Ajuste de imagen→fill) muestran "Igual que escritorio" + el valor explícito. Los demás (grosor, alineación, dirección, envolver, justificar, alinear) ya tienen todos sus valores como opciones reales, así que no lo necesitan.
- Anclas: el export pone `[id]{scroll-margin-top:90px}` solo en las vistas donde de verdad hay un navbar pegado (global si lo está en ambas; dentro de `@media (min-width:769px)` si solo en escritorio; dentro del `@media` móvil si solo en móvil). El offset de escenas (`scrollmotor.js`) solo cuenta navbars cuyo `position` calculado sea `sticky` en ese momento.
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
- `:active` y `:focus-visible` con mouse/teclado reales en el preview del editor (en el export ya se probaron).

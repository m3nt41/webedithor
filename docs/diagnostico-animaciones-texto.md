# Diagnóstico: animaciones de texto y hovers de texto (2026-11-16)

Solo diagnóstico: **no se cambió código de producción**. Herramientas nuevas (solo miden): `tools/medir-texto-lib.mjs` (página de medición + librería que corre dentro de la página), `tools/medir-texto.mjs` (Firefox, por píxeles) y `tools/medir-texto-extra.mjs` (comprobaciones extra). Los datos crudos están en `tmp-logs/` (no se versiona; se regeneran con `node tools/medir-texto.mjs`).

## Cómo se midió
- **Firefox 160, Selenium, headless**, ventana 1300x900, dpr 1. Página de medición = `exportHTML()` real (un título de 56 px por caso).
- **Final de la animación (por píxeles):** todas las animaciones se congelan a 1 ms de su final (captura A) y se terminan con `finish()` (captura B); se comparan A y B (píxeles que cambian más de 24 niveles, cambio máximo, píxeles con tinta, nitidez) y se miden las posiciones de cada letra (`getBoundingClientRect`). Es la misma caja y el mismo contenido: cualquier diferencia es de **dibujado**, no de layout.
- **Corrida real (sin congelar):** por fotograma (`requestAnimationFrame`) la posición de hasta 12 letras → mayor salto de posición entre dos fotogramas seguidos, antes del final y en el final; intervalos entre fotogramas.
- **Hover:** el ratón real (Selenium) entra y sale; captura de ventana recortada en reposo / hover / tras salir; intervalos de fotogramas durante la transición; estilos calculados.
- **Chrome 157 (Claude in Chrome, tu Chrome real, dpr 1,25):** pestaña nueva con `http://localhost:5173`; desde ahí se cargó la misma página de medición (`fetch` + `document.write`) y se corrió la misma librería (posiciones y fotogramas). **No hay diferencia por píxeles en Chrome** (la extensión solo da capturas para mirar, no datos de píxeles): solo se compararon a ojo dos capturas ampliadas.

## 1. Inventario (todo lo de texto)

| Módulo | Qué hace con el texto | Técnica |
|---|---|---|
| `text.js` modo `words` / `chars` | Cada palabra (o letra) en `<span class="w">` (`display:inline-block`) con `animation: a-<efecto> … backwards paused` y retraso `calc(delay + var(--i)*stagger)`; `.in` pone `running` | CSS puro (`@keyframes`); JS solo pone `.in` (IntersectionObserver). Letras dentro de `.ww` (`white-space:nowrap`) |
| `text.js` modo `lines` | Una pieza por línea escrita (`.w.ln`, `display:block`) | CSS puro |
| `text.js` modo `linesm` | Como `words`, pero un script reasigna `--i` por línea visual | CSS + JS (rAF puntual al cargar/redimensionar/fuentes) |
| Efectos de entrada (`base.js`): fade, up, down, left, right, zoom, blur, flip, rotate | `translate`, `scale`, `rotate`, `opacity`, `filter:blur`, `transform:perspective rotateX` | `@keyframes` con solo el estado inicial (`from`) |
| `appear.js` | Mismos efectos sobre el elemento entero (no parte el texto) | CSS puro |
| `stagger.js` | Hijos entran uno tras otro (`:nth-child(k)`) | CSS puro |
| `variants.js` | Estados con nombre (hover/clic/cargar/entrar) | CSS (`transition` / `@keyframes … forwards`) |
| `hover.js` sobre un título/botón de texto | lift (`transform`+`text-shadow`), grow/shrink/tilt (`transform`), glow (`text-shadow`), bright (`filter`), color (`color`), underline y soft (`::before`), fill (fundido/barrido) | CSS puro (`transition` + `:hover`) |

Notas: **no existe ningún hover que mueva letras sueltas** (todos actúan sobre el bloque entero); solo la animación de entrada parte el texto. **El lienzo del editor no parte el texto** (`renderer.js` no genera `.w`): las animaciones de texto solo se ven en la Vista previa y en el export.

## 2. Resultados

### Final de la animación (por píxeles, Firefox)

| Caso | Animaciones activas | Píxeles que cambian A→B | Cambio máx. | Posición (rect) |
|---|---|---|---|---|
| words: up, zoom, rotate | 3 | 1030 | 129 | 0 |
| words: flip | 3 | 3407 | 238 | 0 |
| words: fade, blur | 3 | **0** | 0 | 0 |
| chars: up, left, zoom, flip, rotate | 21 | 1364 | 129 | 0 |
| chars: fade, blur | 21 | **0** | 0 | 0 |
| lines (mis saltos) up | 1 | **0** | 0 | 0 |
| lines (medida) up | 3 | 3407 | 238 | 0 |
| Al aparecer `up` (título entero) | 1 | **0** | 0 | 0 |
| Al aparecer `blur` (título entero) | 1 | 2603 | 134 | 0 (inconcluso, ver abajo) |

- Los píxeles que cambian son bordes de letras (≈14 % de los 9 600 píxeles con tinta de un título de 21 letras; la tinta pasa de 9 543 a 9 593 píxeles): el texto se **vuelve a dibujar con otro antialiasing** (escala de grises en ambos; sin color) al terminar. No hay salto de posición: el mayor salto de una letra entre fotogramas *en el final* es 0,017 px (vs. ≈3 px por fotograma durante el movimiento).
- Pasa con **cualquier efecto que use `translate`/`scale`/`rotate`/`transform`** sobre los `.w`, y **no** con los que solo usan `opacity` o `filter:blur`, ni con "Al aparecer" sobre el título entero. La diferencia depende de animar **spans `inline-block` sueltos**.
- **En Chrome (dpr 1,25):** mayor salto de posición en el final 0,003–0,049 px; fotogramas a 16,7 ms (máx. 17,6) en todos los casos; las capturas ampliadas de c-up congelado vs terminado se ven iguales a ojo. **No se pudo medir por píxeles** (no hay lectura de píxeles de pantalla en la extensión).

### Motor vs animación (mismo efecto, distinto método; chars + subir 30 px, Firefox)
| Método | Píxeles A→B | Fotogramas (máx.) |
|---|---|---|
| CSS `@keyframes` con `translate` (el actual) | 1364 | 16,7 ms |
| CSS `@keyframes` con `transform` | 1364 | — |
| Web Animations API (JS) | 1364 | 17,8 ms |
| `requestAnimationFrame` poniendo `style.translate` (JS) | 1364 | 16,7 ms |
| CSS + `will-change:transform,opacity` | **0** (A = B, ver H2) | — |

→ El cambio al terminar **es del motor (Firefox cambia el dibujado del texto al quitar la transformación animada)**, no de CSS vs JS: los tres métodos dan lo mismo. (Una primera medición de `v-css` dio 3504 en vez de 1364; no se reprodujo y quedó como ruido sin explicar.)

### Hovers (Firefox headless; Chrome solo lift)
- Tras salir el ratón, el texto vuelve **idéntico** al reposo (0 píxeles de residuo) en los 11 casos (lift, grow, shrink, tilt, glow, bright, underline, color, soft; lift y grow sobre un título con letras partidas).
- Intervalos de fotograma durante la transición: **16,7 ms, máx. 16,7** en Firefox (los 11) y mediana 16,7 / máx. 17,2 en Chrome (lift). **El "lag" no se reprodujo en ningún navegador.**
- Cambio de nitidez al terminar el hover (esperado, el texto se redibuja a otra escala): grow +6 %, shrink −2 %, tilt −1 %, lift −2 %.

### Coste por número de letras (corrida real)
| Letras | Animaciones | Duración total | Firefox máx. fotograma | Chrome máx. fotograma |
|---|---|---|---|---|
| 21 | 21 | 1,9 s | 16,7 ms | 17,4 ms |
| 40 | 40 | 3,0 s | 16,7 ms | 17,2 ms |
| 118 | 118 | 7,7 s | 16,7 ms | 17,3 ms |
| 354 | 354 | **21,9 s** | 33,3 ms (1 fotograma) | 17,3 ms |

## 3. Hipótesis

| Hipótesis | Veredicto | Evidencia |
|---|---|---|
| H1. Al terminar hay cambio de capa/rasterizado (transform, subpíxeles) | **Confirmada en Firefox (dibujado), no en posición** | A→B: 1030–3407 px de bordes cambian, rects idénticos (≤0,02 px) |
| H2. `will-change` lo arregla | **Parcial / no recomendada** | Con `will-change` A = B (0 px): no hay cambio, pero el texto queda **para siempre** en el dibujado "de capa" (9 543 px de tinta, no 9 593) y con palabras deja de ser idéntico al texto normal (1030 px de diferencia vs. 0 sin `will-change`). Además crea una capa por letra |
| H3. El modo `chars` cambia el texto (cambio de posición) | **Confirmada** (constante, no es un salto al final) | `inline-block` por letra pierde el kerning: ancho 644,03 vs 640,95 px (Firefox) y 644,08 vs 640,91 (Chrome), +3,1 px (0,5 %); 7545 px de diferencia con el texto normal. `words`, `lines`: 0 px de diferencia |
| H4. Retardo por letra y tamaño de cada letra en los hovers | **Descartada para hovers** (no hay hover por letra); **confirmada para la entrada** | El retardo = letras × cascada (0,06 s): 354 letras = 21,9 s. Los hovers actúan sobre el bloque |
| H5. Coste de cada método (CSS/WAAPI/rAF) | **Sin diferencia medible** en estas máquinas | Los tres: máx. 16,7–17,8 ms; 354 animaciones simultáneas: 1 fotograma de 33 ms en Firefox, ninguno en Chrome |
| H6. Los hovers con `text-shadow` (lift, glow) repintan en el hilo principal cada fotograma | **No demostrada**: es cierto en teoría (`text-shadow` no se anima en el compositor) pero no se midió coste ni lag | Fotogramas 16,7 ms; sin lag en headless/Chrome |

## 4. Tabla pedida

| Animación | Técnica | Firefox | Chrome | Síntoma | Causa probable | Evidencia | Arreglo propuesto | Riesgo para la fluidez |
|---|---|---|---|---|---|---|---|---|
| text words/chars up, left, right, down | CSS `translate` sobre `.w` inline-block | Falla (final) | Sin diferencia medible (a ojo igual) | Al terminar cambia el antialiasing de los bordes (≈14 %) | Firefox deja de dibujar el span como superficie transformada al acabar `translate` | A→B 1030/1364 px; rects iguales; igual con `transform`, WAAPI y rAF | Probar: animar el `.ww`/línea en vez de cada letra donde se pueda; o aceptar (Etapa de pulido). Ver H2 | Bajo (solo cambia qué se anima) |
| text zoom, rotate | `scale` / `rotate` | Falla (final) | Igual que arriba | Igual | Igual | 1030/1364 px | Igual | Bajo |
| text flip | `transform: perspective rotateX` | Falla (final), el peor (3407 px, máx. 238) | Sin diferencia medible | Cambio más visible al acabar | Igual + perspectiva | 3407 px, 238 | Sustituir por rotación sin perspectiva o animar el bloque | Medio |
| text fade, blur | `opacity` / `filter` | **Bien** | Bien | — | — | 0 px | Ninguno | — |
| text lines | `.w.ln` block | **Bien** (0 px) | Bien | — | — | 0 px | Ninguno | — |
| text lines (medida) | words + script | Falla (final), 3407 px | — | Igual que flip | Sub-spans transformados | 3407 px | Igual | Bajo |
| Al aparecer (título entero) | CSS | Bien (up); `blur` 2603 px inconcluso | Bien (rects) | — | — | 0 px / ver límites | Ninguno | — |
| text chars (cualquier efecto) | `inline-block` por letra | Texto 3,1 px más ancho que el normal (constante) | Igual (+3,2 px) | Letras algo distintas del texto real; sin kerning | Un span por letra rompe el kerning | 644,03 vs 640,95 px | Documentar; o compensar kerning con script (riesgo medio) | Bajo |
| text (cualquier modo), muchas letras | 1 animación por letra, retraso `i × cascada` | Máx. 33 ms 1 vez en 354 letras | Sin tirones | Entrada interminable (354 letras = 21,9 s), parece irregular | La cascada crece sin límite con el nº de letras | Tabla de costes | Tope para la cascada total (p. ej. cascada = mín(cascada, 1,5 s / nº de letras)) | Ninguno (mejora) |
| Hover lift | `transform` + `text-shadow` | Sin lag medible; vuelve idéntico | Sin lag (máx. 17,2 ms) | "Laggeado" (a ojo, **no reproducido**) | Posible: `text-shadow` con desenfoque 10 px se repinta en el hilo principal por fotograma | Teórico (H6); fotogramas normales | Medir en tu equipo con DevTools Rendimiento; si es eso, quitar la sombra animada y dejar solo `transform` | Medio |
| Hover grow / shrink / tilt | `transform` | Bien; el texto se redibuja a otra escala (nitidez +6 % / −2 % / −1 %) | — | Cambio de nitidez al terminar (esperado) | Re-rasterizado a la escala final | nitidez | Aceptar | — |
| Hover glow | `text-shadow` | Sin lag medible | — | — | Igual que lift (H6) | — | Igual | Medio |
| Hover bright / color / underline / soft | `filter` / `color` / `::before` | Sin lag medible | — | — | — | — | Ninguno | — |
| Hover sobre título con letras partidas | `transform` del bloque con N spans dentro | Sin lag medible | — | — | — | Mismos fotogramas que sin partir | Ninguno | — |

## 5. Qué NO se pudo verificar
- **El "lag" de los hovers no se reprodujo.** Firefox headless (sin GPU real, fotogramas siempre a 16,7 ms) y un Chrome de pantalla real con un solo hover medido (lift) no lo muestran. Hace falta medir en tu Firefox con tu pantalla (125 %) y DevTools > Rendimiento, mirando el tiempo de pintado por fotograma.
- **Chrome por píxeles:** no se pudo (la extensión da capturas para mirar, no datos de píxeles). Solo posiciones, fotogramas y dos capturas ampliadas comparadas a ojo.
- **Si el cambio de antialiasing se ve como "borrosidad"/"salto" en tu pantalla:** se mide que cambia ≈14 % de los píxeles de borde; si eso es lo que ves a ojo no se puede confirmar desde aquí. Firefox con dpr 1 y ventana headless; tu pantalla es a 125 %.
- `Al aparecer blur` dio 2603 px de diferencia (nitidez menor a 1 ms del final): no se aclaró por qué `blur` por letra da 0 y el del título entero no; podría ser un resto de desenfoque o un efecto de escala del filtro.
- Una medición suelta de `v-css` (3504 px) no se repitió (ruido sin explicar). Las repeticiones sobre un mismo elemento no valen (las animaciones canceladas no vuelven a correr): cada caso se midió una vez con página recién cargada.
- Hovers con animación de entrada todavía corriendo a la vez (hover durante la cascada) y el editor (el lienzo no parte el texto): no probado.

## 6. Seguimiento (2026-11-16, tarea posterior): qué quedó resuelto y qué no

| Punto | Estado | Qué se hizo / vio |
|---|---|---|
| A. Cascada sin tope (354 letras = 21,9 s) | **Resuelto** | La cascada total (primera a última pieza) ya no pasa de **2 s** (`TOPE_CASCADA` en `animations/text.js`; el exportador escribe `--g` = nº de saltos en el elemento y el CSS usa `min(cascada, 2s / --g)`). Elegido porque 33 saltos x 0,06 s = 1,98 s: un título de hasta ~34 letras queda **idéntico** que antes. Medido en Firefox (Selenium) y Chrome (retardo de la última letra): 354 letras 21,18 s → 2,00 s (la entrada completa termina a 2,7 s), 118 letras 7,02 → 2,00, 200 palabras 11,94 → 2,00; 21 y 34 letras, 3 palabras y 5 palabras con cascada 0,3 s no cambian. Con retardo propio se suma (0,5 + 2). Si alguien pone una cascada grande a propósito y el total pasa de 2 s (p. ej. 8 palabras a 0,5 s), se reparte para que quepa. Modo 'Por línea (medida)' sin tope (sus piezas son líneas, pocas). Test nuevo `tests/cascada-tope.mjs` (30 comprobaciones; falló antes, pasa después). |
| B. Kerning del modo Letras (+3,1 px) | **No se puede con CSS; no se forzó** | Probado en Firefox y Chrome: `font-kerning:normal`, `text-rendering:optimizeLegibility` / `geometricPrecision`, `font-feature-settings:"kern"` e `inline-flex` NO cambian nada (mismo ancho). Solo `display:inline` o `contents` en las letras conservan el kerning, pero entonces `translate/scale/rotate` ya no funcionan (un `inline` no se transforma), o sea, se pierde la animación. Con JS sí se puede (medir el avance real de cada letra con un `Range` sobre una copia en texto normal y poner `margin-right`: ancho idéntico al normal en Firefox, 37 ms para 12 frases), pero añade un script al export, depende de que la fuente ya esté cargada y mete márgenes por letra: **no aplicado**, queda como opción (riesgo medio). `tools/medir-kerning.mjs`. |
| A'. Temblor al final de "Por letras" con varias palabras | **Hipótesis del kerning descartada; temblor no reproducido como tal** | "Galería" y "Lo que hacemos" (Firefox y Chrome, dpr 1 y 1,25, 4 familias de fuente): el ancho del texto partido en letras es **idéntico** al normal (el kerning solo existe en pares como "Wa"/"AV"; estos textos no los tienen); el DOM no se sustituye (0 cambios de nodos); ninguna letra ni palabra cambia de x ni de ancho al terminar (0 px); el espacio entre palabras es el mismo; sin salto de línea; y el texto terminado es **idéntico por píxeles** a un título normal. Aunque hubiera kerning, sería una diferencia constante desde el primer fotograma, no un cambio al final. Lo único que cambia al terminar es lo ya diagnosticado (sección 2): cada letra se redibuja con otro antialiasing **cuando termina su propia animación** (centro de tinta 0,05 a 0,14 px, ≈80 px de borde por letra; las demás letras no se tocan), igual con una o varias palabras; con "Al aparecer" añadido al mismo título tampoco hay efecto extra. Un redibujado colectivo "de todo a la vez" **no se reprodujo** (Firefox headless sin GPU); si ocurre en tu Firefox con GPU a 125 %, no se pudo ver. Test de guardia `tests/texto-final-letras.mjs` (42 comprobaciones): **pasa antes y después** (no hay cambio de código que arreglar), vigila que ninguna de esas cosas empiece a fallar. |
| C. Botón "Ver más" con hover que escala | **Sin diferencia medible; no se cambió nada** | Comparadas 8 técnicas (scale actual, `scale` individual, will-change solo en hover, geometricPrecision, translateZ, font-size+padding, `zoom`, will-change permanente) con transición lenta lineal (20 s) y capturas en vivo contra un "gemelo estático": ≈0 px de diferencia en todas (ruido esporádico de 30 a 126 px por captura, no sistemático), 0 px entre "casi final" y final, posición de letras idéntica (≤0,017 px). **Pero** las capturas de Selenium/Firefox no pasan por el compositor (y una animación pausada se dibuja como estática), así que **no pueden ver** un borroso de rasterizado en vuelo; en Chrome (capturas de pantalla) a la resolución disponible no se distinguió nada. Opciones y riesgos: (1) dejar `transform:scale` (actual): fluido, sin layout; posible borroso en vuelo según GPU. (2) `will-change` solo en hover: no se pudo demostrar mejora, y crea capa en cada botón al pasar el ratón. (3) `font-size`+`padding`: texto siempre nítido, pero cambia el layout cada fotograma (empuja a los vecinos, caja 127,0 → 130,7 px) y es menos fluido. (4) `zoom`: igual que (3), no estándar en animaciones. Recomendación: no tocar hasta poder medirlo en tu Firefox real (DevTools > Rendimiento, o una grabación) y, si se confirma, probar (2) con test. `tools/medir-boton-hover.mjs`. |

**Chrome 157 (Claude in Chrome, dpr 1,25):** misma cascada topada (retardo de la última letra 2 s en 354 letras), mismos anchos de kerning (+4,5 y +34,7 px en "Waveform"/"AVATAR" solo con letras `inline-block`; 0 con `inline`/`contents`), mismo A' (0 px de cambio de posición, DOM intacto, ancho partido = normal ±0,05 px). **Sin verificar en Chrome:** todo lo que sea por píxeles (la extensión no los lee) y el aspecto del botón en vuelo.

**Sigue sin resolverse (otra tarea, a petición):** el cambio de antialiasing al terminar las animaciones con movimiento y el posible lag de los hovers con `text-shadow` (Elevar y Resplandor).

## 7. Llevar al editor lo que ganó en el banco (2026-11-16): qué quedó resuelto y qué no

Veredicto de m3nt41 a ojo (Firefox y Chrome, zoom por encima de 120 %) en `tools/banco-texto.html` (el banco NO se borra todavía). Hipótesis de partida (sin confirmar): el redibujado sale cuando la letra deja su capa animada al terminar; sin transform por letra no pasa.

### A. "Por letras" y "Por palabras" al aparecer

**Inventario de animaciones por pieza** (qué usa translate/scale/rotate/transform):

| Dónde | Pieza | Propiedad que anima | Qué se hizo |
|---|---|---|---|
| Por letras / palabras, Subir y Bajar | letra / palabra (`.w`) | `translate` + opacity | **V10**: la subida la hace UN contenedor `<span class="tw">`; cada pieza solo anima opacidad en cascada |
| Por letras / palabras, Izquierda y Derecha | `.w` | `translate` + opacity | **V11**: `will-change: translate, opacity` en cada pieza |
| Por letras / palabras, Zoom | `.w` | `scale` + opacity | **V11**: `will-change: scale, opacity` |
| Por letras / palabras, Voltear | `.w` | `transform` + opacity | **V11**: `will-change: transform, opacity` |
| Por letras / palabras, Rotar | `.w` | `rotate` + opacity | **V11**: `will-change: rotate, opacity` |
| Por letras / palabras, Fade y Desenfoque | `.w` | opacity / `filter` + opacity | sin cambios (ya iban bien) |
| Por línea (mis saltos) | `.w.ln` | translate + opacity | sin cambios (pedido); ya medía 0 px |
| Por línea (medida) | `.w` (palabras medidas) | translate + opacity | sin cambios (pedido). **Sigue con el redibujado** (3407 px en la medición del apartado 2) |
| Cascada de hijos (`stagger.js`) | cada hijo (caja entera, no texto) | los mismos efectos | no se toca: son cajas, no letras, y un `will-change` en cajas grandes cuesta mucha más memoria |
| Al aparecer (`appear.js`) sobre el elemento | el elemento | los mismos efectos | sin cambios (0 px) |

**Cómo queda (código):** `animations/text.js` (`usaContenedor`, `MUEVEN`, `TOPE_CAPAS`), `base.js` (keyframes `a-subir` y `a-bajar`) y `export/exporter.js` (envuelve el texto en `.tw` solo en Subir/Bajar por letras o palabras). El lienzo del editor no parte el texto, así que no cambia; la Vista previa es el export. `.tw` es `display:block` (equivale al título entero), lleva el retardo propio y arranca con `.in` igual que las piezas; "reducir movimiento" y la salvaguarda sin JS también lo apagan.

**Medición (Firefox 160, Selenium, headless, píxeles distintos entre el último ms de la animación y el estado final; `node tools/medir-capas.mjs antes|despues`):**

| Caso | Galería 1x | Lo que hacemos 1x | Galería 1,25x | Lo que hacemos 1,25x |
|---|---|---|---|---|
| Letras, Subir/Bajar — antes | 551 | 1039 | 478 | 1241 |
| Letras, Subir/Bajar — **después (V10)** | **0** | **0** | **0** | **0** |
| Palabras, Subir — antes | 0 | 1291 | 0 | 1442 |
| Palabras, Subir — **después (V10)** | **0** | **0** | **0** | **0** |
| Letras, Izq./Der./Zoom/Voltear/Rotar — antes | 551 | 1039 | 478 | 1241 |
| Letras, mismos efectos — **después (V11)** | **0** | **0** | **0** | **0** |
| Fade y Desenfoque (control) antes y después | 0 | 0 | 0 | 0 |

En Subir/Bajar el texto terminado además queda **idéntico por píxeles** a un título normal (0 px). Con V11 el último ms ya no cambia, pero el texto terminado queda en el otro dibujado que un título normal (551 y 1039 px a 1x): es lo ya conocido del apartado 2, ítem 2 ("`will-change` quita el cambio pero deja el texto permanentemente en el otro dibujado"). Es el precio que decidió m3nt41 al elegir V11; a ojo es lo que valida.

**Coste de V11 con texto largo (`node tools/medir-coste-capas.mjs`, Zoom, 28 px, memoria = reportes de memoria de Firefox de todos los procesos, CON menos SIN `will-change`):**

| Letras | Estructuras de capas/pantalla extra | Fotogramas durante la animación (p95, largos >20 ms) | Fotogramas al hacer scroll después |
|---|---|---|---|
| 100 | ≈ 0 (menos de 16 KB) | 16,7 ms, 0 (igual que SIN) | 16,7 ms, 0 |
| 354 | ≈ 0,38 MB (webrender +197 KB, display list +181 KB) | 16,7 ms, 0 (SIN: 1 largo) | 16,7 ms, 0 |
| 1000 | ≈ 1,5 MB (webrender +763 KB con texturas +213 KB, display list +390 KB, propiedades de marco +103 KB) | **33,3 ms, 20 largos** (SIN: 16,7 ms, 5) | 16,7 ms, 0 |

El coste crece en línea (≈ 1,2–1,5 KB por letra en el motor) y a 1000 letras ya hay fotogramas largos. **Tope propuesto y aplicado: `TOPE_CAPAS = 200` piezas** (letras o palabras, según el modo): por encima de 200 el efecto se sustituye por un **fundido simple** (`a-fade`, sin `will-change`), es decir, sin movimiento y sin capas. Se eligió 200 porque con 354 letras no hubo coste de fotogramas y deja margen para lo que aquí no se midió (GPU). Subir/Bajar no lleva `will-change` por pieza (las piezas solo hacen opacidad), así que con ellas no hay tope.

**Test:** `tests/texto-capas.mjs` (127 comprobaciones; falla sin el cambio: sin `.tw` y 551/1039 px; pasa con él): estructura del export en cada modo y efecto, fade/blur/por línea intactos, `will-change` con las propiedades justas, tope en 200 y 201 piezas, píxeles en los dos textos a 1x y 1,25x, estilos calculados en Firefox, y el editor (lienzo sin `.tw`, selección, edición de texto, Ctrl+Z, Vista previa con el mismo `.tw`). `tests/cascada-tope.mjs` ya no cuenta el contenedor como una pieza de la cascada y `tools/medir-final-letras.mjs` mide el ancho por la unión de las letras (un `Range` sobre el contenedor de bloque medía toda la línea) y escala las capturas por el DPR.

**Sin verificar (A):** la memoria de GPU y el pintado real en pantalla (headless pinta por software y no tiene compositor); que V10 y V11 se vean bien a ojo en tu Firefox y Chrome a más de 120 % (el criterio de aceptación es tu ojo; en headless V10 da 0 px, pero el banco ya advertía que V10 en software podía salir peor, y no salió).

### B. Hover de botón: "Fondo que crece" (nuevo) y aviso de "Agrandar"

Veredicto a ojo (banco, botón): bien V8 (Elevar), V9 (color/brillo), V4 (font-size + padding, aceptable) y V6 (un pseudo-elemento que crece y el texto queda quieto). Las demás, mal.

- **Qué se hizo:** efecto nuevo **"Fondo que crece"** (`bgrow`) con la técnica V6, en `animations/hover.js`: un `::before` con el color elegido (`z-index:-1` + `isolation:isolate` en el nodo: queda sobre el fondo del botón y bajo el texto), que en reposo está transparente y a `scale(.85)` y en hover pasa a opaco y `scale(1.06)`. **Solo se escala el pseudo-elemento**: el texto y la caja no llevan `transform`, `scale`, `filter` ni `will-change` y no cambian de tamaño. Sin `overflow:clip` (tiene que sobresalir). Duración por defecto 0,25 s, color de relleno y "Color del texto al pasar" opcionales (mismos campos que Relleno). Las imágenes se saltan (no admiten `::before`) y Copiar/pegar efectos lo omite en ellas con aviso. Sale en la lista de hover de todos los nodos con texto, con o sin caja. **Elevar, Aclarar y Color no se tocaron; "Agrandar" tampoco** (mismo `scale(1.03)`).
- **Aviso de Agrandar:** el inspector muestra, solo con Agrandar elegido, una línea con el triángulo de aviso: «En Firefox el texto puede verse raro al agrandarse. «Fondo que crece» deja el texto quieto.» (los campos de animación admiten ahora `kind:'nota'`).
- **Test `tests/hover-crece.mjs` (35 comprobaciones; falla sin el cambio):** CSS del export; en Firefox, con ratón real, en el export **y** en el lienzo del editor: reposo (transparente, `.85`), hover (opaco, `1.06`), la caja y el texto miden lo mismo (±0,01 px), el texto sin transform/filter/will-change, por píxeles el color sobresale por fuera del borde solo con hover y cubre el interior, vuelve a reposo al salir, y control negativo: con "Agrandar" sí cambian caja y texto (así la comparación distingue). Inspector: la opción existe (con y sin caja), campos de color, aviso solo en Agrandar, se guarda con 0,25 s y Ctrl+Z lo deshace; el JSON conserva el efecto al importar y Copiar/pegar lo copia.
- **Límites:** un nodo de ancho completo (un título en bloque) con este hover sobresale por los lados un 6 % y puede dar scroll horizontal si está pegado al borde de la página (en botones y texto en línea no pasa); en un nodo con `overflow:hidden` el fondo se recorta; el fondo tapa el fondo propio del botón (queda de ese color al pasar). **Sin verificar:** a ojo en tu Firefox y Chrome (solo medido en Firefox headless).

### C. Export = Vista previa

`tests/export-igual-vista.mjs` (11 comprobaciones, Firefox): la Vista previa lleva exactamente el HTML del export (salvo el script puente); en los tres casos (Letras Subir con `.tw`, Palabras Zoom con `will-change: scale, opacity`, hover Fondo que crece) coinciden HTML, CSS calculado, nombres/retardos/duraciones de animación y medidas de caja y texto en reposo y hover (ratón real). El lienzo del editor también se probó (hover-crece, texto-capas).

### D. Medición en Chrome (Claude in Chrome, pestaña nueva en localhost, cerrada; servidor propio apagado)

Chrome 157, dpr 1,25: en "Galería" y "Lo que hacemos" (Letras Subir) hay `.tw` con `a-subir` y las letras con `a-fade`, sin `will-change`; **0 px** de cambio de posición/ancho de letra entre el último ms y el final; DOM sin cambios (9→9 y 16→16 nodos); ancho partido = normal (184,52 vs 184,50 y 423,86 vs 423,81); una sola línea. Fondo que crece con el ratón real: reposo opacidad 0 y `scale(.85)`; hover opacidad 1 y `scale(1.06)`; caja (124,09×54,4) y texto (58,49×20) idénticos; el texto sin transform ni will-change. Palabras Zoom: `will-change: scale, opacity`. Sin errores de consola (la lectura empezó tras la primera carga de la segunda página).
**Sin verificar en Chrome:** píxeles (la extensión no los lee), antialiasing y el redibujado en sí; tampoco el ojo en Firefox/Chrome a más de 120 %, ni la GPU.

### Qué quedó resuelto y qué no (resumen)
- **Resuelto (medido):** redibujado al terminar en Letras/Palabras con Subir/Bajar (V10) y en Izq./Der./Zoom/Voltear/Rotar (último ms = final: 0 px); hover Fondo que crece; aviso de Agrandar; export = Vista previa.
- **No resuelto / pendiente a ojo:** con V11 el texto terminado queda en otro dibujado que un título normal; "Por línea (medida)" conserva el redibujado; Agrandar sigue igual; antialiasing de efectos sin estas técnicas, y posible lag de `text-shadow` en Elevar y Resplandor (fuera de esta tarea).

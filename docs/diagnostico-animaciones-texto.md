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

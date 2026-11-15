# Auditoría de rendimiento del HTML exportado (Firefox)

**Fecha:** 15-nov-2026 · **Tipo:** solo análisis (no se tocó código ni tests).
**Qué se leyó:** `src/animations/*` (base, appear, hover, press, focus, text, stagger, variants, parallax, scrolllink, scene, scenestep, scrollmotor, scrollsuave, index), `src/export/exporter.js`, `src/core/marquesina.js`, `src/core/menumovil.js`, `src/animations/lenis-min.js` (Lenis 1.3.27) y, como referencia fluida, `C:\Proyectos\Clientes\masajes-version2\index.html` (solo lectura).
**No se midió nada en un navegador.** Todo lo de abajo sale de leer código. Cada punto va marcado:

- **[HECHO]** = está escrito en el código y lo verifiqué leyéndolo.
- **[HIPÓTESIS]** = razonamiento sobre cómo se comporta Firefox; hay que medirlo con el banco de pruebas (sección 5).

---

## 0. Resumen corto

1. Nuestro export **no tiene un solo patrón "caro" evidente en las animaciones simples**: no usa `transition: all`, no usa `backdrop-filter`, no usa `mix-blend-mode`, y casi todo se mueve con `translate/scale/rotate/opacity`. Por eso el lag **probablemente no viene de hover/appear sueltos**.
2. Lo que sí es distinto a la referencia y huele a culpable: **JS que escribe variables CSS en cada cuadro de scroll** (parallax, ligado al scroll, escenas) y, si está activado, **Lenis** (scroll suave) corriendo un `requestAnimationFrame` permanente que llama a `scrollTo` cada cuadro. La referencia no tiene nada de eso.
3. Firefox hace el scroll **en otro hilo** (scroll asíncrono / APZ). Todo efecto que dependa de leer el scroll desde JS va **un cuadro por detrás** del contenido que ya se movió. Eso se ve exactamente como "escalonado/pegado". Es la hipótesis más fuerte, y se confirma o se descarta en 5 minutos con el banco de pruebas.

---

## 1. Tabla de efectos: qué anima cada uno y si es barato

Leyenda: 🟢 barato (transform, translate, scale, rotate, opacity) · 🟡 medio · 🔴 caro (obliga a repintar o a recalcular layout).

| Efecto | Qué anima/transiciona en el export | Mecanismo | Costo |
|---|---|---|---|
| **appear** (fade/up/down/left/right/zoom/rotate) | `opacity`, `translate`, `scale`, `rotate` | `@keyframes` solo con `from` + `fill-mode: backwards` + `paused`; el script pone `.in` y pasa a `running` | 🟢 |
| **appear → blur** | `opacity` + **`filter: blur(12px)`** | igual | 🔴 `filter` no es de los que el compositor mueve solo; repinta cada cuadro |
| **appear → flip** | `opacity` + `transform: perspective(600px) rotateX()` | igual | 🟢/🟡 (3D, puede crear capa propia) |
| **hover** lift | `transform` + **`box-shadow`** (con caja) o **`filter: drop-shadow`** (sin caja) | `transition` + `:hover` | 🟡 box-shadow repinta; 🔴 drop-shadow en elementos grandes |
| hover grow/shrink/tilt | `transform` | `transition` | 🟢 |
| hover glow | **`box-shadow`** o **`filter: drop-shadow`** | `transition` | 🟡 / 🔴 |
| hover bright | **`filter: brightness()`** | `transition` | 🔴 en elementos grandes (imágenes) |
| **press** | `transform` o `filter: brightness()` | `transition` + `:active` | 🟢 / 🔴 (dim/bright) |
| **focus** | `outline-color`, **`outline-offset`**, `box-shadow`, `filter`, `transform` | `transition` + `:focus-visible` | 🟡 (solo teclado; poco frecuente) |
| **variants** (estados) | lista fija: `opacity, translate, scale, rotate, filter, color, background-color, border-color, border-radius, box-shadow, transform, outline-color, outline-offset` | `transition-property` explícito (sin `all`) | 🟢 si solo tocas x/y/scale/opacity; 🔴 si tocas blur, brightness, shadow, radius |
| variants load/scroll | los que pongas, en `@keyframes … to{}` con `forwards` | `animation` | igual que arriba |
| **texto** (palabras/letras/líneas) | `opacity`, `translate`, `scale`, `rotate` (o blur si eliges blur) por **cada `<span class="w">`** | `animation` por span, retraso `calc(delay + var(--i) * stagger)` | 🟢 por propiedad, pero **muchos elementos** (ver §3) |
| **stagger** | igual que appear, una regla `:nth-child(k)` por hijo | `animation` por hijo | 🟢 |
| **parallax** | `translate` (vía `calc((var(--sp) - .5) * px)`) + **`will-change: translate`** | JS escribe `--sp` en cada cuadro de scroll | 🟢 la propiedad; 🟡 el mecanismo (JS por cuadro) |
| **scroll-linked** | `opacity`, `scale`, `rotate` desde `--sp` (con `clamp`) | JS escribe `--sp` | 🟢 la propiedad; 🟡 el mecanismo |
| **sticky (navbar)** | `position: sticky` (el motor solo mide su alto) | CSS nativo | 🟢 si el navbar es liviano |
| **escena (scene)** | capa `position:sticky` de `100svh` con `overflow:hidden` + hijos apilados en grid; cada hijo: `opacity`, `translate`/`scale` desde `--ep` (`--qi`, `--qo`) | JS escribe `--ep` en el contenedor alto | 🟡 pantalla completa que cambia de opacidad cada cuadro |
| **marquesina** | `translate` con `@keyframes` infinito; N copias del grupo (2–6, defecto 4) | CSS puro | 🟢 la propiedad; 🟡 por el ancho (N × contenido) |
| **menú móvil** | `transform` del icono (`.18s`), `@keyframes mm-in` (opacity+transform) al abrir | CSS + script mínimo de clics | 🟢 |
| **scroll suave** | no anima CSS: **`window.scrollTo` cada cuadro** (Lenis, lerp .1) | JS, `rAF` permanente | 🔴 (cambia cómo se mueve TODA la página) |

**[HECHO]** Revisé con búsqueda en `src/`: no hay `transition: all`, ni `backdrop-filter`, ni `mix-blend-mode`, ni `background-attachment: fixed` en nuestros módulos. El único `will-change` es el de parallax (`parallax.js:483`).

---

## 2. Todo lo que corre en JS durante el scroll

### 2.1 `scrollmotor.js` (parallax + ligado al scroll + escenas)

Solo viaja si la página usa parallax, scroll-linked o escenas.

| Aspecto | Qué hace | |
|---|---|---|
| Escucha | `scroll` sobre `window` con `{passive:true}`; `resize` pasivo; `load`; un `IntersectionObserver` (`rootMargin: 50% 0px`) | [HECHO] pasivo ✔ |
| Frecuencia | El evento solo pide un `requestAnimationFrame`; como máximo **un cálculo por cuadro** (`if(!raf)`) | [HECHO] ✔ bien hecho |
| Qué recorre | Solo los elementos que el IO marca visibles (+50 % de margen arriba y abajo, o sea, 2 pantallas de alto) | [HECHO] ✔ |
| Lecturas de layout | Por elemento visible: cadena de `offsetTop` subiendo por `offsetParent` (función `abs`), `offsetHeight`; por escena: `offsetHeight` x2 y **2× `getBoundingClientRect()`** | [HECHO] |
| Orden lectura/escritura | **Bien separado**: primero junta todo en `res`, luego escribe con `setProperty` | [HECHO] ✔ (no hay layout thrashing dentro del motor) |
| Qué escribe | `--sp` (parallax/ligado) en **el propio elemento**; `--ep` en el **contenedor alto de la escena** (`[data-ew]`) | [HECHO] |
| `medirNav` | `getComputedStyle()` x2 por navbar pegado, solo en `resize`/`load`, no en scroll | [HECHO] ✔ |
| Salto grande | Si el scroll saltó más de una pantalla, recorre **todos** los `els` (visibles o no) | [HECHO] caso raro |

**Cuántos nodos recalculan por cada escritura de variable** (esto es lo que más importa):

- Las variables CSS personalizadas **se heredan**. Escribir `--sp` en un elemento invalida el estilo de **ese elemento y de todos sus descendientes**. Escribir `--ep` en `[data-ew]` invalida **toda la escena** (la capa pegada, todos los hijos y todo lo que tengan dentro: textos, imágenes, iconos).
- Con parallax sobre una `<img>`: 1 nodo. Con parallax sobre un `container` grande: todo el subárbol.
- En escenas: cada hijo directo lleva reglas con `clamp(calc(var(--ep) * var(--n) - …))` → se recalculan `--qi`, `--qo`, `opacity`, `translate`/`scale` de **cada hijo en cada cuadro**, aunque su paso no esté activo.
- **[HECHO]** el mecanismo es ese. **[HIPÓTESIS]** cuánto cuesta en milisegundos en tu Firefox: depende del número de descendientes de la escena.

**El problema de fondo [HIPÓTESIS fuerte, mecanismo conocido de Firefox]:** todo esto es "efecto ligado al scroll hecho en el hilo principal". Firefox desplaza la página con un hilo aparte (scroll asíncrono) y el JS se entera **después**. Resultado: el contenido ya se movió y el parallax/escena se pone al día uno o dos cuadros más tarde → se ve "escalonado" o como si algo se pegara. Firefox incluso lo avisa en la consola con *"This site appears to use a scroll-linked positioning effect"* (se usa en el banco de pruebas, paso 0).

### 2.2 `scrollsuave.js` (Lenis 1.3.27) — solo si el interruptor "Scroll suave" está activo (apagado por defecto)

| Aspecto | Qué hace | |
|---|---|---|
| Loop | `requestAnimationFrame(raf)` que **se re-agenda siempre**, incluso con la página quieta; llama a `lenis.raf(t)` cada cuadro | [HECHO] |
| Movimiento | Lenis calcula la posición y llama a `window.scrollTo` cada cuadro | [HECHO] (documentado en el propio archivo) |
| Rueda | Listener de `wheel` **no pasivo** (`passive:!1` en `lenis-min.js`) → Lenis hace `preventDefault` y mueve él el scroll | [HECHO] |
| Otros listeners | `keydown`, `mousedown`, `click` en captura; `hashchange`; `wheel` extra pasivo | [HECHO] |
| Solo mouse | No corre en táctil ni con `prefers-reduced-motion` | [HECHO] |

**[HIPÓTESIS fuerte]** Con Lenis, Firefox deja de poder hacer scroll en su hilo rápido: el desplazamiento pasa a depender del hilo principal. Cualquier cuadro lento (JS, estilos de escena, repintado) = tirón visible. Además, si en Firefox tienes activo el scroll suave nativo (`general.smoothScroll`), hay **doble suavizado** (el de Firefox + el de Lenis), que se siente "pegajoso". La nota del propio código dice que en Firefox el script anterior ya se veía "escalonado al final"; Lenis lo mejoró, pero sigue siendo JS por cuadro.

Si tu página de prueba tiene **scroll suave + parallax/escenas a la vez**, se suman los dos problemas: Lenis hace `scrollTo` en su `rAF` → el evento `scroll` llega en el cuadro siguiente → el motor pide su propio `rAF` → las variables se escriben otro cuadro después. Es decir, **hasta 2 cuadros de retraso** entre el contenido y los efectos. [HIPÓTESIS por el orden del ciclo de eventos; en Chrome pasa igual en teoría, pero Firefox es más sensible.]

### 2.3 Los otros scripts (no corren por cuadro de scroll)

| Script | Cuándo corre | Notas |
|---|---|---|
| `SCRIPT_SCROLL` (appear) | `IntersectionObserver` threshold .15; **`unobserve` tras disparar** | [HECHO] ✔ igual que la referencia (threshold .12). Cero costo durante el scroll una vez revelado todo. |
| `SCRIPT_LINEAS` (texto "por línea (medida)") | al cargar, `resize` (con rAF), `fonts.ready` | [HECHO] ⚠ en `medirLineas` **lee `offsetTop` y escribe `--i` dentro del mismo bucle** → cada escritura obliga a recalcular layout antes de la siguiente lectura (layout thrashing). Solo pasa si el valor cambia; en la primera pasada cambia para casi todas las palabras. Es costo de **carga/resize**, no de scroll. |
| `SCRIPT_MENU` | clics y teclado | [HECHO] lee `offsetHeight` una vez al abrir. Despreciable. |
| `SCRIPT_CLIC` | clic en elementos con estado "clic" | despreciable |

---

## 3. will-change, `all`, filter, infinitas, sticky

| Tema | Hallazgo | Tipo |
|---|---|---|
| **will-change** | Solo `parallax.js`: `will-change: translate`, **permanente** (aunque el elemento esté lejos). Cada elemento con parallax se promueve a capa propia. Si el parallax va sobre fotos grandes de ancho completo, son capas grandes. | [HECHO] el uso. [HIPÓTESIS] Firefox tiene un presupuesto de memoria para `will-change` y, si te pasas, lo ignora. |
| **transition: all** | No existe en nuestros módulos: siempre lista explícita de propiedades. (La referencia **sí** usa `transition: 0.3s` = `all` en varios sitios y va fluida, así que `all` no es nuestra diferencia.) | [HECHO] |
| **filter en elementos grandes** | `hover` bright/glow-sin-caja, `press` dim/bright y `focus` glow-sin-caja usan `filter`. Solo se paga **mientras haces hover/clic**, no en reposo. Con `blur` en appear: 12px de blur animado en cada elemento que entra. | [HECHO] el uso. [HIPÓTESIS] el costo real depende del tamaño del elemento; imágenes de 1200px+ con `brightness`/`blur` animado repintan lento en Firefox sin aceleración de GPU. |
| **Animaciones infinitas** | Solo la marquesina (`translate`, `linear`, `infinite`). Pausa en hover. Con `prefers-reduced-motion` se apaga. No hay más infinitas (la referencia tiene 3: marquesina, `ping`, `girar`). | [HECHO] |
| **Marquesina: copias** | Por defecto **4 copias** del grupo (2–6 configurable); la referencia usa 2. Cada copia es DOM + imágenes extra; la pista mide N × ancho. | [HECHO] el número. [HIPÓTESIS] con imágenes o texto grande, la capa en movimiento es 2× más ancha que la de la referencia. |
| **Marquesina: `translate` vs `transform`** | Nosotros animamos la propiedad individual `translate`; la referencia anima `transform: translateX(-50%)`. | [HECHO] la diferencia. [HIPÓTESIS] que Firefox la anime peor (ver §4). Ya existe un pendiente de "temblor de letras de la marquesina en Firefox a 125 %" en `PROGRESS.md`: es compatible con esta hipótesis (posiciones fraccionarias al trasladar texto). |
| **Sticky con muchos hijos** | (a) Navbar sticky: normal, barato salvo que lleve `backdrop-filter` (no lo trae). (b) **Escena**: la sección pegada ocupa 100svh, tiene `overflow:hidden` y **todos** los hijos apilados en la misma celda, todos pintados con `opacity` variable, **todos recalculados** por cada cuadro de `--ep` (ver §2.1). | [HECHO] |
| **Muchos elementos con animación pausada** | `appear`, `text` y `stagger` crean una animación (pausada, fill `backwards`) **por elemento desde que carga la página**. Una frase en modo "letras" = 1 `<span>` + 1 animación por letra. Un párrafo largo en "letras" = cientos. La referencia no crea ninguna animación hasta que el IO añade `.in` (usa `transition` sobre clase). | [HECHO] el mecanismo. [HIPÓTESIS] que con cientos de animaciones pausadas Firefox gaste memoria/tiempo en estilos al cargar y al revelar. |
| **Capas apiladas pantalla completa** | `scene` pone una capa 100svh con contenido cambiando opacidad por cuadro: repintado a pantalla completa. Si Firefox está en **WebRender por software** (sin GPU), esto cuesta CPU. | [HIPÓTESIS]. Se verifica en `about:support` → "Compositing". |

---

## 4. Qué podría pesar más en Firefox que en Chrome

| # | Motivo | Tipo | Cómo se confirma |
|---|---|---|---|
| 1 | **Scroll asíncrono + efectos por JS**: Firefox desplaza en otro hilo; parallax, ligado y escenas se actualizan tarde y se ve el salto. | HIPÓTESIS (mecanismo documentado por Mozilla; magnitud sin medir) | Banco de pruebas: sección parallax vs sección "nada". Aviso *"scroll-linked positioning effect"* en consola. |
| 2 | **Lenis**: listener de rueda no pasivo + `scrollTo` por cuadro. Firefox pierde su scroll rápido. | HIPÓTESIS fuerte | Mismo banco con scroll suave encendido/apagado. |
| 3 | **Propiedades individuales (`translate`, `scale`, `rotate`)**: Firefox las soporta desde hace años, pero no sé con certeza si las anima en el compositor igual que `transform`. Casi todo nuestro export usa estas propiedades; la referencia usa `transform`. | HIPÓTESIS (no verificada) | Banco: marquesina con `translate` vs marquesina con `transform`. |
| 4 | **Variables CSS heredadas escritas por JS** (`--sp`, `--ep`): invalidan todo el subárbol. | HECHO (el mecanismo) / HIPÓTESIS (que sea lo bastante caro) | Perfilador: tiempo en "Estilos" (Styles/Restyle). |
| 5 | **`filter` animado/transicionado** (blur, brightness, drop-shadow): Firefox repinta más que Chrome si no usa GPU. | HIPÓTESIS | Banco: hover con filter vs hover con transform. |
| 6 | **WebRender sin GPU** (en algunas PCs con Windows): todo repintado se hace por CPU. | HIPÓTESIS (depende de TU equipo) | `about:support` → Compositing. |
| 7 | **Texto con `translate` fraccionario** (marquesina, letras que entran): en Firefox se ve borroso/temblando a cierto zoom. | HIPÓTESIS, ya anotada en PROGRESS | Ver marquesina a 100 % y 125 %. |

**Descartado por lectura [HECHO]:** `transition: all`, `backdrop-filter`, `mix-blend-mode`, `background-attachment: fixed`, listeners no pasivos de scroll (el de `scroll` es pasivo; el único no pasivo es el `wheel` de Lenis), lecturas de layout mezcladas con escrituras dentro de `scrollmotor` (están bien separadas).

### Diferencias con la referencia `masajes-version2` (fluida en tu Firefox)

| Cosa | Referencia | Nuestro export | Tipo |
|---|---|---|---|
| Reveals | `transition` de `opacity`+`transform` sobre clase `.reveal`/`.in`, IO con `unobserve`, threshold .12 | `@keyframes` + `animation` pausada en cada elemento desde la carga, IO igual (threshold .15, `unobserve`) | [HECHO]. Parecidos en costo una vez revelados; difiere en **cuántas animaciones existen desde el inicio**. |
| Listeners de scroll | **Uno**, pasivo: `scroll` → `classList.toggle('scrolled', scrollY>30)` (OJO: no es "cero", hay 1; es mínimo, sin lecturas de layout y sin escribir variables) | `scroll` pasivo + rAF + lecturas de offset/rect + `setProperty` de variables heredadas, **si la página usa parallax/ligado/escena**; y Lenis si está activo | [HECHO] |
| Scroll suave | `scroll-behavior: smooth` (nativo, solo para anclas) y `auto` con reduced-motion | Lenis (JS por cuadro) si el interruptor está activo | [HECHO] |
| Marquesina | `transform: translateX(-50%)`, 30 s, 2 grupos (el JS clona uno) | `translate` por `calc(-100%/N)`, N=4 por defecto | [HECHO] la diferencia / [HIPÓTESIS] el impacto |
| Hovers | `box-shadow` + `transform` con `transition` (incl. `transition: 0.3s` = all) | lista explícita; puede incluir `filter` | [HECHO] la diferencia / HIPÓTESIS que `filter` pese |
| Parallax / escenas / `will-change` | **ninguno** | sí, si la página los usa | [HECHO] |
| Elementos `position:fixed` | header con `backdrop-filter: blur(8px)`, grano de película fijo a pantalla completa (`mix-blend-mode: multiply`, SVG feTurbulence), botones flotantes | no hay | [HECHO]. La referencia es **más pesada** en estos puntos y aun así va fluida → esos no son tu problema, y confirma que pintar cosas fijas/filtros "estáticos" no lagea en tu Firefox. Lo que la referencia **no tiene es nada ligado al scroll**. |
| Cantidad de animaciones infinitas | 3 (marquesina, `ping`, `girar`) | 1 (marquesina) | [HECHO] |
| Imágenes | (no auditado en detalle) | `<img>` sin `loading="lazy"` ni `decoding="async"` (no los emite el exportador) | [HECHO] el export no los pone. Efecto en lag de scroll: HIPÓTESIS, secundario. |

**Lectura honesta de la comparación:** la referencia demuestra que en tu Firefox van bien las transiciones de opacity/transform, el `box-shadow`, la marquesina con `transform`, los `filter`/`backdrop-filter` estáticos y los IO. Lo único que ella **no** hace y nosotros **sí** es mover cosas **en función del scroll desde JS** (y Lenis). Por eso esa es la sospecha número 1. Si tus páginas lageadas **no** usan parallax/ligado/escena/scroll suave, entonces la sospecha pasa a: cantidad de animaciones pausadas, `translate` vs `transform`, o copias de la marquesina.

---

## 5. Banco de pruebas

### 5.1 La página de prueba (propuesta)

Un solo `.html` con **una sección por efecto**, cada una de 2–3 pantallas de alto, separadas por un bloque neutro de 1 pantalla (texto simple, sin nada animado) que sirve de **control**. Para generarla basta una página del editor con estas secciones (o escribirla a mano en un `.html`).

| # | Sección | Qué lleva (UN efecto, nada más) | Qué prueba |
|---|---|---|---|
| 0 | **Control** | Texto y 3 imágenes. Sin animaciones, sin scroll suave. | Cómo va tu Firefox "en blanco". Si aquí ya lagea, el problema no es el export. |
| 1 | **Appear (up)** | 12 tarjetas con `appear: up`, 0.8 s | Revelado con `@keyframes` pausadas |
| 2 | **Appear (blur)** | 12 tarjetas con `appear: blur` | `filter` animado |
| 3 | **Texto por letras** | Un párrafo de ~300 letras con `texto: letras, up` | Muchas animaciones pausadas |
| 4 | **Hover transform** | 12 tarjetas con hover `grow` | Hover barato |
| 5 | **Hover sombra** | 12 tarjetas con hover `lift` (box-shadow) | Hover medio |
| 6 | **Hover filter** | 12 imágenes grandes con hover `bright` | Hover caro |
| 7 | **Marquesina** | Una marquesina de texto, vel. 25, 4 copias; **otra igual con 2 copias** | `translate` y número de copias |
| 8 | **Parallax** | 3 imágenes grandes con parallax vertical 60 | Motor de scroll solo |
| 9 | **Ligado al scroll** | 3 bloques con `fade-in` ligado | Motor de scroll solo |
| 10 | **Escena** | 1 escena de 3 pasos, longitud 4 | Sticky + `--ep` |
| 11 | **Sticky simple** | Un navbar `sticky` con 6 enlaces | Sticky sin JS |
| 12 | **(variante) Scroll suave** | La misma página con el interruptor "Scroll suave" activo (copia del archivo) | Lenis |

Importante: **hacer dos copias del archivo** (una sin scroll suave y otra con), porque el scroll suave cambia todo.

Los efectos 8, 9 y 10 comparten el motor: si 8 lagea y 9 también, es el motor. Si solo 10, es la escena.

### 5.2 Cómo medir en Firefox (paso a paso, lenguaje simple)

**Preparación (una vez):**
1. Cierra todas las pestañas que no necesites y las extensiones pesadas (o abre una **ventana privada**, que normalmente no las carga).
2. Escribe `about:support` en la barra y busca la sección **"Gráficos"** → **"Compositing"**. Anota qué dice: `WebRender` (bien, usa tu tarjeta gráfica) o `WebRender (Software)` (usa solo CPU: esperamos más lag en todo lo que repinta). Anota también la versión de Firefox (arriba del todo).
3. Abre la página de prueba **desde el disco** (doble clic) o con el servidor local.

**Paso 0 — Aviso de Firefox (30 segundos):**
1. Pulsa **F12** → pestaña **Consola**.
2. Recarga y haz scroll por toda la página.
3. Si sale un mensaje que dice *"This site appears to use a scroll-linked positioning effect"*, Firefox mismo te está diciendo que el parallax/sticky hecho por JS no va bien con su scroll asíncrono. Apunta en qué sección te salió.

**Medir con el Perfilador (para cada sección):**
1. Pulsa **F12** → pestaña **Rendimiento** (si no la ves, en los `»` de las pestañas).
2. Pulsa **"Iniciar grabación"** (o "Start recording").
3. Haz scroll **solo por esa sección**, a velocidad normal (rueda del mouse), de arriba a abajo, unos 5–10 segundos. Para hover: pasa el mouse varias veces por encima de las tarjetas.
4. Pulsa **"Detener"** (Stop). Se abre el gráfico.
5. Mira esto, en orden:
   - **Gráfico de FPS / "Frame rate" (cuadros por segundo):** lo ideal es una línea cerca de **60** (o de lo que sea tu monitor). Si baja a 20–30 o hace "dientes de sierra" en esa sección = esa sección lagea. Anota el valor mínimo y el típico.
   - **Pestaña "Call Tree" / "Árbol de llamadas"** (con "Invert call stack" / invertir pila marcado): arriba salen las cosas que más tiempo consumen. Busca en la lista, sobre todo: **`Styles`/`Restyle`** (recalcular estilos → variables CSS), **`Layout`/`Reflow`** (layout), **`Paint`/`Rasterize`** (repintar), **`requestAnimationFrame`** (tu JS), **`scrollmotor`** o `calcular`. La que tenga el mayor porcentaje es el cuello de botella.
   - Si hay barras rojas/amarillas largas en la línea de tiempo = cuadros que tardaron más de 16 ms (tirones).
6. Apunta el resultado en una tabla así (copia-pega):

| Sección | FPS típico | FPS mínimo | Qué domina (Styles / Layout / Paint / JS) | ¿Lo notas a ojo? (sí/no) |
|---|---|---|---|---|
| 0 Control | | | | |
| 1 Appear up | | | | |
| … | | | | |

**Prueba rápida sin perfilador (si el perfilador te abruma):**
- Mira en **cada sección** si lo notas a ojo, y marca "fluido / se traba / escalonado". Esa columna sola ya acota mucho.
- Compara las **parejas**: marquesina con 4 copias vs 2 copias; con `translate` (original) vs si cambias a mano `translate` por `transform` en el CSS exportado; scroll suave apagado vs encendido.

**Para comparar contra Chrome (opcional):** F12 → **Rendimiento** → "Grabar" → mismo recorrido → mira los FPS del panel. No hace falta que sea idéntico, solo si "ahí también se traba".

**Cómo interpretar:**
- Lagea la sección 0 (control) → no es el export: es el equipo, un perfil de Firefox, una extensión, o aceleración por hardware desactivada.
- Lagea solo en 8, 9 o 10 → es el motor de scroll (hipótesis 1 y 4).
- Lagea solo en la copia con scroll suave → es Lenis (hipótesis 2).
- Lagea solo en 3 → son las animaciones pausadas por letra.
- Lagea solo en 6 (o mucho más que 4) → `filter` animado.
- Lagea solo en 7 y mejora cambiando `translate` por `transform` → hipótesis 3.

---

## 6. Lista priorizada de arreglos posibles

Ordenada por **(impacto esperado) ÷ (riesgo)**. Ningún arreglo está implementado. Los marcados con (*) conviene medir antes de tocar.

| # | Arreglo | Impacto esperado | Riesgo | Notas |
|---|---|---|---|---|
| 1 | **Motor de scroll: pasar a `animation-timeline: scroll()/view()` (CSS) cuando el navegador lo tenga, y dejar el JS solo como respaldo.** Según [MDN (notas de Firefox 159)](https://developer.mozilla.org/en-US/Firefox/Releases/159) y [web.dev (octubre 2026)](https://web.dev/blog/web-platform-10-2026), Firefox 159 activa scroll-driven animations por defecto; antes solo estaba en Nightly o con el flag `layout.css.scroll-driven-animations.enabled`. Con `@supports (animation-timeline: view())` se usa CSS puro (corre en el compositor, sin JS, sin variables heredadas, sin retraso) y el script solo se carga si NO hay soporte. | **Muy alto** para parallax y scroll-linked (elimina el problema 1, 4 y buena parte del 2) | Medio: hay que reescribir `parallax.js` y `scrolllink.js` para generar `@keyframes` + `animation-timeline`; el rango `start/end` se traduce a `animation-range`. Las escenas (`--ep` con sticky) son más difíciles: usar `timeline` sobre el contenedor alto. Hay que mantener el respaldo. Verificar versión de tu Firefox primero. | Cumple tu preferencia "CSS puro antes que JS". |
| 2 | **Marquesina: animar `transform: translateX()` en vez de `translate`, y bajar copias por defecto (2–3).** Igualar a la referencia. | Medio-alto si la hipótesis 3 es cierta; si no, cero (y es gratis probarlo) | **Muy bajo**: cambio de dos líneas en `marquesina.js` y regenerar tests de marquesina | El temblor de letras ya anotado quizá mejore o cambie; revisar a 100 % y 125 %. |
| 3 | **Escritura de variables más barata**: en lugar de escribir `--ep` en el contenedor y que cada hijo recalcule con `calc/clamp`, escribir **directamente** `opacity`/`translate` ya calculados en cada hijo desde JS, o aislar el subárbol con `contain: style` / `content-visibility` en la capa pegada para que el recálculo no baje por todo el árbol. | Medio (escenas con muchos descendientes) | Medio: toca `scene.js`/`scenestep.js` y los tests dorados; `contain` puede cambiar cómo se ve `overflow`/`sticky` | Pero si va a venir el #1, esto se vuelve innecesario para escenas en navegadores nuevos. |
| 4 | **Lenis: no promoverlo por defecto y avisar en el inspector** ("puede sentirse pesado en Firefox junto con parallax/escenas"); parar su `rAF` cuando no hay movimiento (hoy corre siempre); y no activarlo si la página ya usa escena/parallax. | Alto si Lenis resulta el culpable (hipótesis 2) | Bajo-medio: es opt-in hoy; solo se añade lógica de pausa. | Es lo primero que se debe probar apagando el interruptor, sin tocar código. |
| 5 | **`will-change` solo mientras el elemento esté en pantalla** (que el motor lo ponga/quite con el mismo IO que ya tiene), no permanente. | Bajo-medio (memoria) | Bajo | Útil si hay muchos parallax grandes. |
| 6 | **Animaciones de entrada con `transition` por clase (como la referencia) en vez de `@keyframes` pausados**, para que no existan N animaciones desde la carga; especialmente el texto por letras/palabras. | Medio en textos largos por letras; poco en el resto | Medio-alto: cambia el mecanismo de appear/text/stagger/variants y rompe tests dorados; se pierde el truco `backwards` que evita pelear con el hover | Solo vale si el banco prueba que la sección 3 es la lenta. Alternativa más barata: limitar "letras" a textos cortos (aviso en el inspector). |
| 7 | **Hover `bright`/`dim`/`drop-shadow` → alternativas baratas** (p. ej. overlay con `opacity`, o `box-shadow` en pseudo-elemento y animar su `opacity`). | Medio en elementos grandes | Medio: cambia el aspecto exacto del hover | Solo si el banco marca la sección 6. |
| 8 | **`appear: blur`**: avisar en el inspector o sustituir por fade + escala. | Bajo-medio | Bajo (decisión de diseño; **FEATURES.md no se toca sin tu permiso**, así que mejor solo un aviso) | |
| 9 | **`medirLineas`: separar lectura y escritura** (primero leer todos los `offsetTop`, luego escribir). | Bajo (solo carga/resize) | Muy bajo | Mejora un layout thrashing real, aunque no de scroll. |
| 10 | **Exportar `loading="lazy"` y `decoding="async"` en imágenes fuera de pantalla** (no el hero). | Bajo-medio en páginas con muchas fotos | Bajo | No afecta animaciones, pero reduce trabajo en carga y decodificado durante el scroll. |
| 11 | **Corregir el umbral del IO de appear** (`threshold: .15`): un elemento más alto que ~6,7 pantallas nunca llega al 15 % visible y se queda invisible para siempre. | Cero rendimiento; es un bug latente | Muy bajo (`rootMargin` en lugar de `threshold`, o threshold más bajo) | Hallazgo lateral, anotado por si acaso. |

---

## 7. Orden sugerido de trabajo (cuando decidas implementar)

1. Generar la página del banco y **medir** (§5). Sin números, no se toca nada.
2. Con scroll suave **apagado**, probar parallax/escena. Si lagean → arreglo #1 (CSS `animation-timeline`) y respaldo JS.
3. Si solo lagea con scroll suave → arreglo #4.
4. Probar #2 (marquesina `transform`) por ser trivial.
5. El resto, solo si el banco los señala.

---

## Anexo: fuentes consultadas

- Código del proyecto (rutas arriba) y `C:\Proyectos\Clientes\masajes-version2\index.html` (solo lectura).
- Soporte de scroll-driven animations en Firefox 159: [MDN – Firefox 159 release notes](https://developer.mozilla.org/en-US/Firefox/Releases/159), [web.dev – New to the web platform in October](https://web.dev/blog/web-platform-10-2026), [MDN – Experimental features in Firefox](https://developer.mozilla.org/Firefox/Experimental_features). (Datos tomados de una búsqueda; verifica tu versión en `about:support`.)
- Aviso de "scroll-linked positioning effect" y scroll asíncrono: documentación de Mozilla sobre scroll-linked effects (conocimiento general, no abierta en esta sesión).

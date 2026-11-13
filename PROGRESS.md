# PROGRESS

Etapas hechas: 1, 2, 3, 4, 5, 5.5 (navbar y anclas) y 6 (transiciones y estados). Próxima: 7 (scroll). El reparto completo está en `CLAUDE.md` y la lista de funciones en `FEATURES.md`.

## Etapa 1 — Estructura, árbol JSON, preview y selección  ✅
- Proyecto Vite + vanilla JS, `motion` instalado (sin usar todavía).
- Árbol JSON (`core/tree.js`), store con `mutate`/`subscribe` (`core/store.js`).
- Bloques base Hero / Servicios / Footer con 1 variante (`blocks/`).
- Renderer árbol -> DOM con `data-id` (`render/renderer.js`), soporta `styles.mobile`.

## Etapa 2 — Propiedades, edición de texto y exportar HTML  ✅

### Hecho
- **Panel de propiedades** (`ui/inspector.js`) con los campos declarados en `ui/fields.js` (para añadir un control, añade una línea ahí): contenido (texto, nivel H1–H4, enlace, imagen por URL o archivo, alt), tipografía, fondo/borde, tamaño/espaciado, layout flex/grid (los campos de flex/grid aparecen según el tipo elegido), nombre del nodo y JSON plegado.
- **Ajustes de la página** (botón en el sidebar): título del documento, fondo, fuente y color globales.
- **Edición directa**: doble clic en título/texto/botón del preview. Enter o Esc terminan (en párrafos Enter hace salto de línea). Se pega solo texto plano.
- **Exportador** (`export/exporter.js`): un solo `.html` con `<style>` y una clase por nodo; lo móvil sale en `@media (max-width:768px)`. Botón "Exportar HTML" en la barra superior (`ui/toolbar.js`) descarga `landing.html`.
- Store: `setStyle`, `setContent`, `setName`; `mutate(fn, 'text')` = cambio silencioso (no redibuja el preview mientras se escribe).
- Verificado en `npm run dev`: edición desde panel y desde preview, foco no se pierde al escribir, selects de layout muestran/ocultan campos, y el HTML exportado cargado en un iframe tiene los mismos estilos computados que el preview en los 20 nodos.

### Bugs arreglados en esta etapa
- La regla CSS `h2` del editor se filtraba a los H2 de la landing (preview distinto del export). Ahora está acotada a `#sidebar`/`#inspector`.

### Decisiones
- Todos los valores CSS del panel son texto libre (ej. `24px`, `1fr 2fr`), salvo selects y colores. Más flexible y simple que sliders; se pueden añadir sliders luego.
- Fuentes: solo las del sistema (sin Google Fonts) para que el export no dependa de internet. Añadir fuentes web se puede hacer en `fields.js` + exportador.
- Preview en `div` (no iframe). El `@media` del export usa el ancho de la ventana; el preview móvil se simula aplicando los overrides `mobile`.
- Imágenes subidas se guardan como data URL dentro del JSON/HTML (cómodo, pero pesa).

### Bugs conocidos
- Imágenes grandes subidas como data URL pueden inflar el `.html` y el JSON.
- No probado en Firefox real (m3nt41); `contenteditable="plaintext-only"` pide Firefox 136+ (hay fallback a `true`).
- Aviso: `npm run dev` usa el puerto 5173; si está ocupado, Vite elige el siguiente.

## Etapa 3 — Secciones, vista móvil, JSON y undo/redo  ✅

### Hecho
- **Undo/redo** (`core/store.js`): historial de hasta 100 versiones del árbol. Botones ↶ ↷ y Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z). Cambios seguidos al mismo campo dentro de 1 s se agrupan en un solo paso (`clave` en `mutate`). Dentro de inputs/textarea/texto editable se deja el undo nativo del navegador.
- **Sidebar**: reordenar secciones arrastrando (línea morada indica dónde cae), duplicar (⧉) con ids nuevos, borrar (✕, se recupera con Ctrl+Z).
- **Vista escritorio / móvil** (barra superior): el preview móvil mide 390 px y aplica `styles.mobile`. En vista móvil, todo cambio del panel se guarda SOLO en `styles.mobile`; dejar un campo vacío en móvil borra el override y vuelve al valor de escritorio. El panel indica "editando móvil/escritorio".
- **Guardar / Abrir JSON / Nuevo**: el archivo es `{ app, version:1, page }`; al abrir se valida y completa con `normalizePage` (acepta también la página sola). Abrir y Nuevo se pueden deshacer.
- **Autoguardado** en localStorage (clave `editor-landings:pagina`, 300 ms de debounce); se restaura al recargar.
- Verificado en `npm run dev`: undo/redo de añadir, duplicar, mover y estilos (agrupados), arrastrar y soltar (eventos DragEvent sintéticos), vista móvil (390 px, grid a 1 columna), JSON inválido rechazado, persistencia tras recargar. Sin errores de consola.

### Decisiones
- El historial NO se guarda en localStorage ni en el JSON (al recargar, undo empieza vacío); la página sí.
- La selección y la vista (escritorio/móvil) tampoco se guardan.
- El breakpoint móvil del export es 768 px y el preview móvil mide 390 px.

### Bugs conocidos
- Arrastrar y soltar solo se probó con eventos sintéticos en Chromium; probar con mouse real (sobre todo en Firefox).
- Las mediciones en el panel de pruebas dan 0 si la ventana está oculta; no es un bug del editor.

## Etapa 4 — Motor de animaciones base (CSS puro)  ✅  (commit e3e1469)

### Hecho
- **Un módulo por animación** en `src/animations/`: `appear.js` (al aparecer con scroll), `hover.js` (al pasar el mouse), `text.js` (texto por palabras/letras en cascada), `base.js` (efectos, curvas y `@keyframes` compartidos) e `index.js` (registro `GRUPOS_ANIM`; añadir una animación = nuevo módulo + una línea ahí, el inspector/preview/exportador la recogen solos).
- Datos en `node.animation = { appear?, hover?, text? }`. Efectos de entrada: fade, subir, bajar, izquierda, derecha, zoom, desenfoque, voltear. Hover: elevar, agrandar, encoger, inclinar, resplandor (con color), aclarar. Curvas: suave, rebote (spring aproximado con `linear()`), rápido, lineal.
- **Inspector**: secciones "Al aparecer", "Al pasar el mouse" y "Animación de texto" (esta solo en heading/text/button). El primer select enciende/apaga el grupo; al encenderlo salen duración, retraso, curva y distancia con valores por defecto.
- **Preview**: el hover funciona siempre. Las animaciones de scroll/texto solo se ven con **▶ Reproducir** (barra superior) o al cambiar un ajuste de animación; en el resto el preview queda quieto para poder editar. Doble clic en un texto animado lo edita como texto plano.
- **Exportador**: todo en CSS puro (keyframes + `transition`/`:hover`). Solo si hay animaciones de scroll/texto añade un `<script>` de 2 líneas (IntersectionObserver que pone `.in`). Salvaguardas: `prefers-reduced-motion` y `<noscript>` dejan todo visible y quieto.
- Store: `setAnimation(id, grupo, key, value)` (agrupa undo por campo) y `play()`; nuevo tipo de cambio `'play'`.
- Fix: los selects del inspector que muestran/ocultan campos pedían reconstruir el panel un cambio tarde; ahora se fuerza en el evento `input`.

### Verificado
- Build OK, sin errores de consola. En el preview: spans por palabra, `data-rv`, keyframes y regla hover presentes; al poner `.in` las 7 animaciones corren. El HTML exportado cargado en un iframe trae las mismas clases/spans/script y la regla hover.

### Pendiente / no verificado
- No se vio la animación en vivo ni con scroll real (el panel de pruebas congela `requestAnimationFrame` y el IntersectionObserver): probar en el navegador con Exportar HTML, sobre todo en Firefox.
- `translate`/`scale` individuales y `linear()` piden navegadores de 2023 en adelante.
- Del alcance original de la Etapa 4 quedaron para la Etapa 6 (ver `FEATURES.md`): rotación en appear, "al cargar", press/focus, variants, spring real, cubic-bezier editable, stagger entre hijos y texto por línea.

### Decisiones
- Motion (npm) no se usó a propósito: todo lo hecho salió en CSS. Ver "Decisión tomada (m3nt41)" al final de este archivo.

## Etapa 5.5 — Navbar y anclas  ✅

### Hecho
- **Anclas**: campo "Ancla (id)" en el inspector para secciones y contenedores (`content.anchor`). Renderer y exportador emiten `id="..."`. Válida = empieza con letra y solo letras (sin ñ/tildes), números y guiones (`anchorValido` en `core/tree.js`). Si es inválida el aviso sale en rojo y NO se guarda; si se repite en la página sale aviso (`contarAncla`) pero se guarda.
- **Bloque Navbar** (`blocks/navbar.js`, 4 variantes: Claro, Oscuro, Centrado, Con botón): logo de texto + enlaces + botón. Flex con `flex-wrap`; en móvil los enlaces pasan a una segunda fila (`order:3; width:100%`). Sin hamburguesa ni JS. Nace con `position:sticky; top:0; z-index:50`.
- **Quitar el navbar pegado**: seleccionar el navbar → inspector → grupo "Posición" → "Normal". (Nuevo grupo en `fields.js`, solo para secciones; con "Pegado arriba" salen también "Distancia arriba" y "z-index".)
- **Insertar navbar** va siempre arriba de todo (marca `alInicio` del bloque → `addElement`).
- **Anclas por defecto** en bloques: Hero `inicio`, Servicios `servicios`, Precios `precios`, Contacto `contacto` (campo `ancla` en el bloque; `createBlock` lo aplica). Los botones `#contacto`/`#servicios` ya apuntan a algo; los enlaces del footer (Inicio/Servicios/Precios/Contacto) también.
- El exportador añade `[id]{scroll-margin-top:90px}` solo si hay algún nodo `position:sticky`, para que el navbar no tape la sección a la que se salta.

### Verificado
- Build OK. En el editor (UI real): insertar Navbar con otras 5 secciones lo deja en la posición 0; los `id` salen en el preview; aviso de repetida e inválida funcionan, la inválida no se guarda.
- Exportado: los 4 `href="#..."` distintos resuelven a un `id` existente (0 rotos). El salto en sí es navegación nativa del navegador.

### Pendiente / no verificado
- No se midió el salto con scroll real ni el aspecto visual del navbar en móvil (el panel de pruebas es diminuto/oculto y da 0 en mediciones): revisarlo en el navegador con Exportar HTML.
- Páginas ya guardadas antes de esto no tienen anclas: se ponen a mano en el inspector.

## Pendiente de probar en Firefox
Chrome no reemplaza a Firefox (el navegador de m3nt41). Lo de la lista funciona en Chrome o solo se probó con eventos sintéticos; falta confirmarlo en Firefox:
- [ ] Sticky del navbar (`position: sticky; top: 0`) en el preview y en el HTML exportado.
- [ ] Saltos de ancla con `scroll-margin-top` (que la sección quede debajo del navbar y no tapada).
- [ ] Drag y drop de capas (sidebar) con mouse real.
- [ ] Vista móvil real (ancho de teléfono): navbar en dos filas, sin scroll horizontal.

## Etapa 6 — Transiciones y estados  ✅ (todas las funciones de FEATURES.md de la etapa hechas)

### Bloque 1: rotación, al cargar, press, focus  ✅
**Hecho**
- Efecto **Rotar** en `base.js` (`@keyframes a-rotate`, usa la propiedad `rotate` y `--ar`); campo "Ángulo (°)" (editable, negativo o positivo) en Al aparecer y en Animación de texto.
- Selector **"Se dispara"** (`trigger`: `scroll` | `load`) en Al aparecer y Texto. `load` = la animación corre sola al abrir la página (sin `paused`, sin `.in`, sin script). Las páginas guardadas sin `trigger` se tratan como `scroll`.
- Grupos nuevos **Al presionar** (`press.js`, `:active`: encoger, hundir, agrandar, oscurecer, aclarar) y **Al enfocar** (`focus.js`, `:focus-visible`: anillo, resplandor, agrandar, aclarar; solo botones). Grupos de estado marcados con `estado: true` (se ven siempre en el preview, como hover).
- `transition` unificada: `cssNodo` emite una base (para soltar) con la duración/curva del primer estado activo; cada estado lleva la suya para entrar. Press se registra después de hover para ganar mientras se mantiene el clic.
- Exportador: atributo `data-ld` para lo que corre al cargar, keyframes si hay entrada (scroll o carga), y `prefers-reduced-motion` también lo apaga.

**Verificado** (`npm run dev` + build): CSS exportado correcto; en un iframe el h2 con rotación+carga corre `a-rotate` sin pausa con `--ar:-45deg`; el inspector muestra los grupos y campos nuevos (Ángulo, Se dispara) al elegir "Rotar"; sin errores nuevos.

**No verificado**: no se vio la animación en vivo ni `:active`/`:focus-visible` reales (el panel de pruebas está en segundo plano; solo se comprobó que las reglas existen y parsean). Probar en Firefox con el HTML exportado y Tab. En el preview del editor el foco no se puede ver (los botones no reciben foco de teclado ahí).
- En la sesión se vio un ruido de 500 de Vite de pruebas anteriores (bloques); el build pasa.

### Bloque 2: tween con cubic-bezier y spring real  ✅
**Hecho**
- `base.js`: nuevas curvas "Cubic-bezier (editable)" (`bx1,by1,bx2,by2`; x se limita a 0–1, y libre) y "Spring (rigidez/amortiguación/masa)" (`stiffness,damping,mass`). El spring se resuelve con la fórmula exacta del oscilador amortiguado (sub, crítico y sobreamortiguado), se muestrea (20–120 puntos) y se exporta como `linear()`. Su duración es el tiempo de asentado (≤5 s) y el campo "Duración" se oculta con esa curva. La curva fija "Rebote" sigue (renombrada "Rebote (fijo)") para no romper páginas guardadas.
- Funciones nuevas: `curva(g)`, `duracion(g, def)`, `resorte(g)`, `camposCurva`, `DEF_CURVA`. Usadas por appear, text, hover, press y focus (todas tienen las curvas nuevas). Páginas viejas sin los parámetros usan los defaults.
**Verificado**: build OK; `resorte` da curvas que terminan en 1 (con rebote si amortiguación baja, sin rebote si es alta); en el editor los campos aparecen/desaparecen al cambiar la curva y el CSS del preview lleva el `linear()` generado.
**No verificado**: no se vio la animación en vivo (panel en segundo plano). Probar en Firefox. Limitación: el spring no se interrumpe con continuidad de velocidad (para eso haría falta Motion).

### Bloque 3: stagger entre hijos y texto por línea  ✅
**Stagger entre hijos**
- Nuevo módulo `animations/stagger.js`, grupo **"Cascada de hijos"** (solo section y container): efecto, "Se dispara" (scroll/carga), cascada entre hijos (s), duración, retraso, curva (incluye bezier y spring), distancia, ángulo. CSS puro: una regla `sel > :nth-child(k)` por hijo con retraso = retraso + k×cascada; en scroll, `sel.in > :nth-child(k)` la despausa. Los hijos con su propia animación (Al aparecer / texto) quedan fuera: la suya manda.
- `index.js`: `usaScroll`/`usaCarga`/`paginaUsaEntrada` cuentan el stagger (solo con hijos); `cssNodo` pasa el nodo a `css(g, sel, node)`. Exportador: reduced-motion y `<noscript>` también apagan `[data-rv]>*`/`[data-ld]>*`.
- Verificado en Chrome (HTML exportado en iframe): al cargar, retrasos 0/0.5/1/1.5 s corriendo; por scroll, hijos `paused` hasta que el padre recibe `.in` y luego `running`.

**Texto por línea** (select "Partir por" de Animación de texto; decisión de m3nt41: opción C)
- **"Por línea (mis saltos)"** (`mode: 'lines'`): CSS puro, sin script. Cada línea escrita con Enter (campo Texto del inspector) es una pieza `<span class="w ln">` en bloque; las líneas vacías no se animan. No sigue el ajuste automático de línea.
- **"Por línea (medida)"** (`mode: 'linesm'`): el HTML lleva palabras `.w` (con `--i` = nº de palabra como respaldo sin JS) y `data-lm`; el script `SCRIPT_LINEAS` (función `medirLineas` de `text.js`, la misma que usa el preview) agrupa las palabras por `offsetTop` y pone `--i` = nº de línea visual. **Solo se incluye en el exportado si algún texto usa este modo** (`paginaUsaMedida`). Mide al cargar, al redimensionar (con rAF) y cuando `document.fonts.ready` resuelve. El preview la llama al dibujar y en resize/fonts.
- Verificado en Chrome (exportado en iframe): modo A → spans `ln` en bloque con `--i` 0/1 y línea vacía sin animar, sin `<script>`; modo B → 16 palabras: a 500 px 2 líneas (14+2), tras reducir a 160 px y resize 5 líneas; el script va una sola vez y no aparece con words/lines.
- Con "al cargar" el re-medido cambia `--i` con la animación ya corriendo (puede haber un salto pequeño en el primer cuadro si las fuentes cargan tarde); con scroll no se nota.

**Pendiente de probar en Firefox / a mano**
- [ ] "Por línea (medida)": que la cascada siga las líneas reales en Firefox, y el re-medido al redimensionar con la ventana real (en Chrome de pruebas el `requestAnimationFrame` no corre con la pestaña en segundo plano; se probó forzándolo).
- [ ] Re-medido tras `document.fonts.ready` con una fuente web real (el export usa solo fuentes del sistema, así que apenas aplica hoy).
- [ ] Cascada de hijos con scroll real y animación a ojo (Chrome y Firefox); preview del editor con ▶ Reproducir en los 3 modos nuevos.

### Bloque 4: variants (estados con nombre)  ✅
**Hecho**
- Módulo `animations/variants.js` + sección **"Estados (variants)"** en el inspector (botones, texto, títulos, imágenes, contenedores y secciones). Datos: `node.animation.variants = [{ id, name, trigger, duration, delay, ease (+bezier/spring), props }]`. `reposo` no se guarda (es el aspecto normal). Cada estado cambia solo lo que se rellene: opacidad, mover X/Y, escala, rotación, desenfoque, brillo, color de texto, fondo y borde, radio y sombra. Orden de la lista = prioridad (gana el de más abajo); botones ↑ ↓ ✕ y **"Ver"** (fija el estado en el preview; no se guarda ni se exporta).
- **Disparos**: pasar el mouse (`:hover`), presionar (`:active`), enfocar (`:focus-visible`, solo botones), clic (alterna `.on`), al cargar y al entrar en pantalla (reusa el `.in` del script de scroll existente).
- **Script nuevo (aprobado por m3nt41)**: `SCRIPT_CLIC` (3 líneas, alterna `.on`; hace `preventDefault` si el `href` es vacío o `#`). Solo viaja en el export si algún estado usa clic (`data-vc`).
- **Riesgo resuelto: "al cargar" que se queda fijo vs hover/press.** Una animación con `forwards` le gana a un `:hover` normal. Solución: los estados interactivos (hover, presionar, enfocar, clic) se emiten con `!important` (un `!important` de autor sí le gana a una animación), y los de cargar/scroll son `@keyframes` con solo el `to` y `forwards`. Así al salir del hover vuelve al valor del estado "al cargar". El `!important` también les da prioridad sobre el hover/press/focus viejos y sobre los estilos inline del preview ("el variant gana").
- Si el elemento tiene "Al aparecer" y un estado de cargar/scroll, ambas animaciones van en la misma lista `animation:` (es una sola propiedad CSS).
- Store: `addVariant`, `removeVariant`, `moveVariant`, `setVariant`, `setVariantProp`, `verEstado`. Preview: con **▶ Reproducir** los estados por clic se alternan al hacer clic.

**Verificado en Chrome real** (HTML exportado en un servidor local, mouse real):
- Elemento con estado "cargar" (fondo azul, +40px) + hover (rojo, escala 1,2): al cargar queda azul y la animación termina `finished`; al pasar el mouse pasa a rojo y escala 1,2 (el hover gana); al salir vuelve a azul.
- Clic: alterna `.on` (verde y 45°) y el segundo clic vuelve a reposo.
- Al entrar en pantalla: antes del scroll la animación está `paused` en reposo; tras hacer scroll real pasa a naranja y +60px; el hover sobre esa caja pasa a magenta y al salir vuelve a naranja.
- En el editor (`npm run dev`): "+ Añadir estado" crea el estado, el hover del preview escala 1,05, "Ver" lo fija y "Dejar de ver" lo quita, cambiar el disparo a clic + ▶ Reproducir + clic real alterna `.on`/rotación 30°. Sin errores de consola. `npm run build` OK.

**Limitaciones / no verificado**
- **Hover/press sobre una propiedad que un estado "al cargar" o "al entrar" mantiene fija: entra de golpe, sin transición** (Chrome no anima una propiedad retenida por una animación `forwards`; sí anima las demás, p. ej. la escala). Si interesa que sea suave, habría que cambiar cargar/scroll a transición con clase (al cargar pediría un script o `@starting-style`). No se hizo.
- **Presionar (`:active`) y enfocar (`:focus-visible`) no se probaron con mouse/teclado real** (las herramientas no mantienen el clic ni usan Tab); solo se comprobó que las reglas se generan. Probar a mano, también en Firefox.
- Con `prefers-reduced-motion` o sin JS, los estados de cargar/scroll no se aplican (queda el reposo, igual que el resto de entradas). Un elemento con "Al aparecer" + estado de cargar/scroll y reduced-motion también queda en reposo.
- El estado por clic en un elemento que no es botón no se activa con teclado. Varios estados por clic en el mismo elemento se activan juntos (gana el de más abajo).
- "Color de fondo" usa `background-color`: no se ve sobre un fondo con degradado/imagen.
- Sin probar en Firefox (transiciones de `translate/scale/rotate` y `!important` vs animaciones).

## Etapa 5 — Elementos y bloques  ✅

### Hecho
- **Panel "Capas"** (`ui/sidebar.js`): árbol completo de la página (no solo secciones). Clic = seleccionar, ▸/▾ = plegar, ⧉ duplicar, ✕ borrar. Arrastrar una fila: borde de arriba/abajo = antes/después, centro = dentro de un contenedor/sección. Funciona entre contenedores y secciones; el destino inválido se rechaza (cursor "no permitido").
- **Reglas de anidado** (`canContain` en `core/tree.js`): la página solo admite secciones; sección y contenedor admiten todo menos secciones; título/texto/botón/imagen no admiten hijos. No se puede meter un nodo dentro de sí mismo ni de un descendiente.
- **Añadir elemento** (`blocks/elements.js`): sección vacía, contenedor, título, texto, botón, imagen (con imagen de relleno SVG). Va dentro de lo seleccionado si es contenedor/sección, justo después si es una hoja, y en la última sección si no hay selección (se crea una si no existe).
- **Acciones del store** (`core/store.js`): `addNode`, `addElement`, `moveNode(id, parentId, index)`, `moveBy(id, ±1)`, `puedeMover`. Todo pasa por `mutate`, así que undo/redo funciona.
- **Inspector**: fila ↑ ↓ ⧉ ✕ del elemento seleccionado. **Atajos**: Supr borra, Ctrl+D duplica, Alt+↑/↓ mueve (no actúan mientras se escribe en un campo).
- **Bloques con variantes** (formato `variants: { clave: { label, crear } }`; helpers en `blocks/util.js`): Hero (4), Servicios (4), Galería (4), Testimonios (4), Precios (4), Contacto WhatsApp (4), Footer (4). El sidebar los muestra como un desplegable por bloque con un botón por variante. Un bloque nuevo se inserta tras la sección seleccionada.

### Verificado en `npm run dev`
- Las 28 variantes se añaden y se dibujan; exportan a HTML y cargan en un iframe. Añadir dentro/tras selección, Ctrl+D, Supr, mover con arrastre (antes, dentro, entre contenedores), rechazo de sección dentro de contenedor, mover secciones, undo. Sin errores de consola.

### Pendiente / no verificado
- Arrastrar solo se probó con eventos DragEvent sintéticos; probar con mouse real (sobre todo Firefox).
- No se puede arrastrar desde el preview ni desde la paleta (solo desde el árbol de capas).
- Las imágenes de relleno son data URL (SVG pequeñas); el número de WhatsApp de ejemplo (`50600000000`) se cambia en el campo "Enlace" del botón.
- Con muchas secciones el árbol es largo: se puede plegar cada nodo, pero no hay "plegar todo".

### Ronda de bugs de la Etapa 5
**Arreglado**
- Capas: no se podía plegar una capa que contenía el elemento seleccionado (`dibujar()` la desplegaba en cada redibujo). Ahora los ancestros solo se despliegan cuando CAMBIA la selección (`reveladoId` en `sidebar.js`); plegar a mano se respeta.
- `normalizePage` valida el anidado con `canContain` al abrir un `.json` (y al restaurar de localStorage, donde un fallo = empezar de cero). Rechaza con mensaje claro, p. ej. `Anidado inválido: "X" (section) no puede estar dentro de "Y" (section)`; también exige que `children` sea una lista. El mensaje sale en el `alert` de Abrir.
- Documentación: comentario de `animation` en `tree.js`, lista de acciones del store y de `tree.js` en `CLAUDE.md`, referencia a "sección final" en `FEATURES.md` y "sección siguiente" en la Etapa 4.

**Probado en `npm run dev`** (con 58 secciones / ~590 filas): los 6 elementos y las 28 variantes de bloque se añaden, deshacen y rehacen dejando el JSON idéntico y pasan `normalizePage`; mover entre contenedores + undo/redo; sección dentro de contenedor rechazada; arrastre con DragEvent sintéticos (marca "dentro"); vista móvil aplica `.stage.movil`; el HTML exportado cargado en un iframe suelto tiene 58 secciones, sin scripts (no hay animaciones) y 0 imágenes rotas; sin errores de consola. JSONs con anidado inválido rechazados.

**Rendimiento del árbol de capas**: el árbol se reconstruye entero en cada cambio (incluida cada selección). Medido: ~6 ms por redibujo con ~590 filas, o sea ~1 ms con 15 secciones: no se nota. Si algún día pesara (cientos de secciones o texto escribiéndose en vivo), mejoras posibles: (1) no redibujar el árbol en cambios `text`/`view`/`play` y solo actualizar la clase `activa` en `selection`; (2) actualizar solo el nombre de la fila al renombrar; (3) añadir "plegar todo". No se tocó.

**Pendiente**
- Arrastrar con ratón real (sobre todo Firefox) y exportar abierto en Firefox real: solo probado con eventos sintéticos/Chromium.
- Medidas del preview móvil no fiables en el panel de pruebas (ancho 0 con ventana oculta/estrecha); solo se comprobó que se aplica la clase.

### Decisiones
- Motion vs CSS puro: m3nt41 eligió la opción (a): CSS puro donde se pueda y Motion solo en lo que obliga (drag con rebote, inercia, layout animations, scroll suave, scroll-linked en Firefox). No se tocó ninguna animación en esta etapa.

## Próximas etapas (reparto en CLAUDE.md)
6. Transiciones y estados. 7. Scroll. 8. Movimiento avanzado. 9. Extras.
Asignación función por función: `FEATURES.md`.

## Decisión tomada (m3nt41): opción (a) — CSS puro donde se pueda, Motion solo en lo que obliga
Análisis por función de `FEATURES.md` (referencia).

| Función | CSS puro | Exige Motion / JS |
|---|---|---|
| Rotación en appear, al cargar, press, focus, stagger entre hijos | Sí (`rotate`, `animation` al cargar, `:active`, `:focus-visible`, `--i`) | No |
| Variants (estados con nombre) | Sí para los disparados por hover/focus/press; para clic/scroll hace falta un script mínimo que cambie una clase/atributo | Opcional |
| Tween con cubic-bezier editable | Sí (`cubic-bezier()`) | No |
| Spring real (rigidez, amortiguación, masa) | Parcial: se puede calcular la curva en el editor y exportarla como `linear()` (aproxima bien, pero no se interrumpe como un spring de verdad) | Motion da el spring real e interrumpible; no es obligatorio |
| Texto por línea | No del todo: hay que medir en qué línea cae cada palabra al renderizar (se podría partir por saltos de línea del editor, pero no por ajuste automático) | Script de medición (propio o Motion) |
| Parallax, scroll-linked | Sí con `animation-timeline: scroll()/view()`, pero **Firefox (tu navegador) no lo soporta de forma fiable** | Motion `scroll()` (o script propio) para que funcione en Firefox |
| Sticky | Sí (`position: sticky`) | No |
| Escenas por scroll | Sticky + scroll-linked: en Chrome/Safari CSS, en Firefox necesita JS | Motion/JS para Firefox |
| Scroll suave | Solo anclas (`scroll-behavior`); el suavizado con inercia de verdad no es CSS | Librería aparte tipo Lenis (Motion no lo trae) |
| Layout animations | Muy limitado (View Transitions o FLIP hecho a mano con JS) | Motion (`layout`) es lo robusto |
| Drag con límites y rebote | No | Sí: Motion (`drag`, `dragConstraints`, `dragElastic`) o script propio |
| Inercia | No | Sí: Motion o script propio |
| 3D (perspectiva, rotación X/Y) | Sí (`perspective`, `rotateX/Y`); inclinar siguiendo el mouse pide JS | Solo para seguir al mouse |
| Marquee / ticker | Sí (`@keyframes` con `translateX`) | No |
| Cursor personalizado | Casi: `cursor: url()` para uno estático; uno que siga al mouse con suavizado pide JS | Script mínimo (Motion opcional) |
| Page transitions | `@view-transition` (cross-document) funciona en Chromium/Safari; Firefox no de forma fiable. Además hay que definir qué significa en una landing de un solo `.html` | JS o decidir el alcance |

**Resumen:** en CSS puro cabe casi todo lo de las etapas 6 y 9 (salvo spring real interrumpible y texto por línea). **Obligan a JS** (Motion o propio): drag con rebote, inercia, layout animations y scroll suave. **Scroll-linked/parallax/escenas** se pueden en CSS pero no en Firefox. Opciones para decidir: (a) CSS puro donde se pueda y Motion solo en lo que obliga; (b) Motion para todo lo de movimiento avanzado y scroll; (c) CSS puro + script propio mínimo, sin Motion. Recomendación de Claude: (a), cargando Motion en el `.html` exportado solo si la página usa esas funciones. La decisión es tuya.

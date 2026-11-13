# PROGRESS

## Etapa 4 — Motor de animaciones  ✅

### Hecho
- **Un módulo por animación** en `src/animations/`: `appear.js` (al aparecer con scroll), `hover.js` (al pasar el mouse), `text.js` (texto por palabras/letras en cascada), `base.js` (efectos, curvas y `@keyframes` compartidos) e `index.js` (registro `GRUPOS_ANIM`; añadir una animación = nuevo módulo + una línea ahí, el inspector/preview/exportador la recogen solos).
- Datos en `node.animation = { appear?, hover?, text? }`. Efectos de entrada: fade, subir, bajar, izquierda, derecha, zoom, desenfoque, voltear. Hover: elevar, agrandar, encoger, inclinar, resplandor (con color), aclarar. Curvas: suave, rebote (spring con `linear()`), rápido, lineal.
- **Inspector**: secciones "Al aparecer", "Al pasar el mouse" y "Animación de texto" (esta solo en heading/text/button). El primer select enciende/apaga el grupo; al encenderlo salen duración, retraso, curva y distancia con valores por defecto.
- **Preview**: el hover funciona siempre. Las animaciones de scroll/texto solo se ven con **▶ Reproducir** (barra superior) o al cambiar un ajuste de animación; en el resto el preview queda quieto para poder editar. Doble clic en un texto animado lo edita como texto plano.
- **Exportador**: todo en CSS puro (keyframes + `transition`/`:hover`). Solo si hay animaciones de scroll/texto añade un `<script>` de 2 líneas (IntersectionObserver que pone `.in`). Salvaguardas: `prefers-reduced-motion` y `<noscript>` dejan todo visible y quieto.
- Store: `setAnimation(id, grupo, key, value)` (agrupa undo por campo) y `play()`; nuevo tipo de cambio `'play'`.
- Fix: los selects del inspector que muestran/ocultan campos pedían reconstruir el panel un cambio tarde; ahora se fuerza en el evento `input`.

### Verificado
- Build OK, sin errores de consola. En el preview: spans por palabra, `data-rv`, keyframes y regla hover presentes; al poner `.in` las 7 animaciones corren. El HTML exportado cargado en un iframe trae las mismas clases/spans/script y la regla hover.

### Pendiente / no verificado
- No se vio la animación en vivo ni con scroll real (el panel de pruebas congela `requestAnimationFrame` y el IntersectionObserver): probar en tu navegador con Exportar HTML, sobre todo en Firefox.
- Motion (npm) sigue sin usarse a propósito: todo salió en CSS. Entra en la Etapa 5 (scroll-linked, drag).
- `translate`/`scale` individuales y `linear()` piden navegadores de 2023 en adelante.
- Etapa 5: parallax, scroll-linked, sticky, escenas, 3D, drag, marquee, cursor. Etapa 6: más bloques y variantes.

## Etapa 1 — Estructura, árbol JSON, preview y selección  ✅
- Proyecto Vite + vanilla JS, `motion` instalado (sin usar hasta la Etapa 4).
- Árbol JSON (`core/tree.js`), store con `mutate`/`subscribe` (`core/store.js`).
- Bloques base Hero / Servicios / Footer con 1 variante (`blocks/`).
- Renderer árbol -> DOM con `data-id` (`render/renderer.js`), soporta `styles.mobile`.

## Etapa 3 — Secciones, vista móvil, JSON y undo/redo  ✅

### Hecho
- **Undo/redo** (`core/store.js`): historial de hasta 100 versiones del árbol. Botones ↶ ↷ y Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z). Cambios seguidos al mismo campo dentro de 1 s se agrupan en un solo paso (`clave` en `mutate`). Dentro de inputs/textarea/texto editable se deja el undo nativo del navegador.
- **Sidebar**: reordenar secciones arrastrando (línea morada indica dónde cae), duplicar (⧉) con ids nuevos, borrar (✕, se recupera con Ctrl+Z).
- **Vista escritorio / móvil** (barra superior): el preview móvil mide 390 px y aplica `styles.mobile`. En vista móvil, todo cambio del panel se guarda SOLO en `styles.mobile`; dejar un campo vacío en móvil borra el override y vuelve al valor de escritorio. El panel indica "editando móvil/escritorio".
- **Guardar / Abrir JSON / Nuevo**: el archivo es `{ app, version:1, page }`; al abrir se valida y completa con `normalizePage` (acepta también la página sola). Abrir y Nuevo se pueden deshacer.
- **Autoguardado** en localStorage (clave `editor-landings:pagina`, 300 ms de debounce); se restaura al recargar.
- Verificado en `npm run dev`: undo/redo de añadir, duplicar, mover y estilos (agrupados), arrastrar y soltar (eventos DragEvent sintéticos), vista móvil (390 px, grid a 1 columna), JSON inválido rechazado, persistencia tras recargar. Sin errores de consola.

### Pendiente
- Etapa 4: motor de animaciones (appear, hover, transiciones, texto). Etapa 5: scroll, 3D, drag, marquee, cursor. Etapa 6: más bloques y variantes.
- No hay reordenar elementos dentro de una sección (solo secciones), ni añadir/borrar elementos sueltos; si lo quieres, entra en una etapa posterior.

### Decisiones
- El historial NO se guarda en localStorage ni en el JSON (al recargar, undo empieza vacío); la página sí.
- La selección y la vista (escritorio/móvil) tampoco se guardan.
- El breakpoint móvil del export es 768 px y el preview móvil mide 390 px.

### Bugs conocidos
- Ver Etapa 2 (imágenes data URL pesadas, Firefox sin probar). El problema de "un estado por tecla" quedó resuelto con el agrupado.
- Arrastrar y soltar solo se probó con eventos sintéticos en Chromium; probar con mouse real (sobre todo en Firefox).
- Las mediciones en el panel de pruebas dan 0 si la ventana está oculta; no es un bug del editor.

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

### Pendiente
- Etapa 3: reordenar/duplicar secciones, botón escritorio/móvil (el store ya tiene `viewMode` y `setStyle` ya escribe en `mobile` cuando es móvil; falta el botón y el ancho del stage), guardar/abrir JSON y localStorage, undo/redo.
- Etapas 4–6: animaciones, scroll/3D/drag, más bloques/variantes.

### Decisiones
- Todos los valores CSS del panel son texto libre (ej. `24px`, `1fr 2fr`), salvo selects y colores. Más flexible y simple que sliders; se pueden añadir sliders luego.
- Fuentes: solo las del sistema (sin Google Fonts) para que el export no dependa de internet. Añadir fuentes web se puede hacer en `fields.js` + exportador.
- Preview en `div` (no iframe). El `@media` del export usa el ancho de la ventana; el preview móvil se simula aplicando los overrides `mobile`.
- Imágenes subidas se guardan como data URL dentro del JSON/HTML (cómodo, pero pesa).

### Bugs conocidos
- Cada tecla en el panel crea un estado nuevo (clon completo del árbol): sin lag con páginas chicas; cuando llegue undo/redo (Etapa 3) hay que agrupar cambios seguidos.
- Imágenes grandes subidas como data URL pueden inflar el `.html` y el JSON.
- No probado en Firefox real (m3nt41); `contenteditable="plaintext-only"` pide Firefox 136+ (hay fallback a `true`).
- Aviso: `npm run dev` usa el puerto 5173; si está ocupado, Vite elige el siguiente.

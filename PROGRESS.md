# PROGRESS

## Etapa 1 — Estructura, árbol JSON, preview y selección  ✅
- Proyecto Vite + vanilla JS, `motion` instalado (sin usar hasta la Etapa 4).
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

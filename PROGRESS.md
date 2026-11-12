# PROGRESS

## Etapa 1 — Estructura, árbol JSON, preview y selección  ✅

### Hecho
- Proyecto Vite + vanilla JS, `motion` instalado (aún sin usar).
- Árbol JSON (`core/tree.js`) y store con `mutate`/`subscribe` (`core/store.js`).
- 3 bloques base con 1 variante cada uno: Hero, Servicios, Footer (`blocks/`).
- Renderer árbol -> DOM con `data-id` (`render/renderer.js`), soporta `styles.mobile`.
- Layout de 3 columnas: sidebar (lista de secciones, añadir, borrar), preview (clic para seleccionar, hover punteado), inspector (solo lectura: muestra el JSON del nodo).
- Probado con `npm run dev`: añadir bloques, seleccionar, deseleccionar, borrar; sin errores de consola.

### Pendiente (siguientes etapas)
- Etapa 2: controles de propiedades, edición directa de texto, exportar HTML.
- Etapa 3: reordenar/duplicar secciones, vista móvil/escritorio (el store ya tiene `viewMode`, falta el botón y el ancho del stage), JSON, undo/redo.
- Etapas 4–6: animaciones, scroll/3D/drag, más bloques.

### Decisiones
- Estilos inline en el preview; el exportador generará CSS con clases.
- Responsive: `styles.base` + `styles.mobile` (overrides). En el export se convertirá a `@media (max-width: 768px)`.
- Preview en un `div`, no en iframe (más simple). Si luego las media queries del preview dan problemas, pasar a iframe.
- Re-render completo al cambiar la página (suficiente por ahora; optimizar solo si hay lag).

### Bugs conocidos
- Ninguno detectado. Sin probar aún en Firefox real.

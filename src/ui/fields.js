// CAMPOS DEL PANEL DE PROPIEDADES (declarativo).
// Para añadir un control: agrega una línea en el grupo que corresponda.
//   key: propiedad CSS (camelCase) · kind: 'text' | 'color' | 'select'
//   cuando(estilos): opcional, el campo solo aparece si devuelve true
//   vacioMovil: solo para selects cuya primera opcion ('') es un valor CSS real distinto del de escritorio.
//     En vista movil, '' pasa a significar "Igual que escritorio" (borra el override) y aparece una opcion
//     extra con este valor explicito (ej. 'static') para poder volver al valor normal en movil.
//     vacioTexto: nombre de esa opcion explicita (por defecto, el texto de la primera opcion).
//   Controles visuales (src/ui/controles.js): kind 'columnas' | 'anchoMax' | 'centrar' | 'proporcion'. Escriben los MISMOS
//     strings CSS de siempre. El campo de texto del valor queda en "Avanzado" del grupo (crudo = su etiqueta ahi).
//     autoVacio (solo proporcion): "Auto" = quitar la proporcion en vez de escribir 'auto' (para "Proporcion de los hijos").

const TEXTO = ['heading', 'text', 'button'];
const CONTENEDOR = ['section', 'container'];

const FUENTES = [
  ['', '(heredada)'],
  ['system-ui, sans-serif', 'Sistema'],
  ['Georgia, serif', 'Georgia (serif)'],
  ['"Trebuchet MS", sans-serif', 'Trebuchet'],
  ['"Courier New", monospace', 'Courier (mono)'],
  ['Impact, sans-serif', 'Impact'],
];

export const GRUPOS = [
  {
    titulo: 'Tipografía',
    tipos: [...TEXTO, 'page'],
    campos: [
      { key: 'fontFamily', label: 'Fuente', kind: 'select', options: FUENTES, vacioMovil: 'inherit' },
      { key: 'fontSize', label: 'Tamaño', kind: 'text', placeholder: '24px' },
      { key: 'fontWeight', label: 'Grosor', kind: 'select', options: [['', '—'], ['400', 'Normal'], ['600', 'Seminegrita'], ['800', 'Negrita'], ['900', 'Extra']] },
      { key: 'lineHeight', label: 'Interlínea', kind: 'text', placeholder: '1.2' },
      { key: 'letterSpacing', label: 'Espaciado letras', kind: 'text', placeholder: '0.02em' },
      { key: 'textAlign', label: 'Alineación', kind: 'select', options: [['', '—'], ['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']] },
      { key: 'color', label: 'Color', kind: 'color' },
    ],
  },
  {
    titulo: 'Fondo y borde',
    tipos: [...TEXTO, ...CONTENEDOR, 'page', 'image'],
    campos: [
      { key: 'background', label: 'Fondo', kind: 'color' },
      { key: 'borderRadius', label: 'Radio', kind: 'text', placeholder: '12px' },
      { key: 'border', label: 'Borde', kind: 'text', placeholder: '1px solid #ccc' },
      { key: 'opacity', label: 'Opacidad', kind: 'text', placeholder: '1' },
    ],
  },
  {
    // Imagen de fondo de secciones/contenedores. Campos propios (no son CSS directo: ver CLAVES_PROPIAS en tree.js);
    // el export los convierte en background-image (+ capa oscura) en CSS puro. "Fondo" de arriba queda de color de respaldo.
    titulo: 'Fondo e imagen',
    tipos: CONTENEDOR,
    campos: [
      { key: 'fondoImagen', label: 'Imagen de fondo', kind: 'fondoImagen' },
      { key: 'fondoAjuste', label: 'Ajuste', kind: 'fondoAjuste', cuando: (s) => !!s.fondoImagen },
      { key: 'fondoPosicion', label: 'Posición', kind: 'fondoPosicion', cuando: (s) => !!s.fondoImagen },
      { key: 'fondoCapa', label: 'Capa oscura', kind: 'fondoCapa', cuando: (s) => !!s.fondoImagen },
    ],
  },
  {
    titulo: 'Tamaño y espaciado',
    tipos: [...TEXTO, ...CONTENEDOR, 'image'],
    campos: [
      { key: 'padding', label: 'Padding', kind: 'text', placeholder: '24px 32px' },
      { key: 'margin', label: 'Centrar', crudo: 'Margen', kind: 'centrar', placeholder: '0 auto' },
      { key: 'width', label: 'Ancho', kind: 'text', placeholder: '100%' },
      { key: 'maxWidth', label: 'Ancho máx.', kind: 'anchoMax', placeholder: '600px' },
      { key: 'minHeight', label: 'Alto mín.', kind: 'text', placeholder: '60vh' },
      { key: 'height', label: 'Alto', kind: 'text', placeholder: 'auto' },
      // Proporción = aspect-ratio (ej. 4 / 3, 1 / 1). Solo imágenes. En móvil, escribe "auto" para volver a la proporción natural.
      { key: 'aspectRatio', label: 'Proporción', kind: 'proporcion', placeholder: '4 / 3', tipos: ['image'] },
    ],
  },
  {
    titulo: 'Posición',
    tipos: [...TEXTO, ...CONTENEDOR, 'image'],
    campos: [
      // "Pegado" = position:sticky (CSS puro, sin script). Se queda fijo al hacer scroll mientras
      // su contenedor siga a la vista. Escribe una distancia arriba (ej. 0) y/o abajo; vacío = no se pega por ese lado.
      // Para quitarlo: elige "Normal".
      { key: 'position', label: 'Posición', kind: 'select', options: [['', 'Normal'], ['sticky', 'Pegado (sticky)']], vacioMovil: 'static' },
      { key: 'top', label: 'Pegar arriba (distancia)', kind: 'text', placeholder: '0', cuando: (s) => s.position === 'sticky' },
      { key: 'bottom', label: 'Pegar abajo (distancia)', kind: 'text', placeholder: '0', cuando: (s) => s.position === 'sticky' },
      { key: 'zIndex', label: 'z-index', kind: 'text', placeholder: '50', cuando: (s) => s.position === 'sticky' },
    ],
  },
  {
    titulo: 'Imagen',
    tipos: ['image'],
    campos: [{ key: 'objectFit', label: 'Ajuste', kind: 'select', options: [['', '—'], ['cover', 'Cover'], ['contain', 'Contain']], vacioMovil: 'fill', vacioTexto: 'Rellenar (fill)' }],
  },
  {
    titulo: 'Layout (hijos)',
    tipos: [...CONTENEDOR, 'page'],
    campos: [
      { key: 'display', label: 'Tipo', kind: 'select', options: [['', 'Bloque'], ['flex', 'Flex'], ['grid', 'Grid']], vacioMovil: 'block' },
      { key: 'flexDirection', label: 'Dirección', kind: 'select', options: [['', '—'], ['row', 'Fila'], ['column', 'Columna']], cuando: (s) => s.display === 'flex' },
      { key: 'flexWrap', label: 'Envolver', kind: 'select', options: [['', '—'], ['wrap', 'Sí'], ['nowrap', 'No']], cuando: (s) => s.display === 'flex' },
      { key: 'justifyContent', label: 'Justificar', kind: 'select', options: [['', '—'], ['flex-start', 'Inicio'], ['center', 'Centro'], ['flex-end', 'Fin'], ['space-between', 'Espaciado']], cuando: (s) => s.display === 'flex' },
      { key: 'alignItems', label: 'Alinear', kind: 'select', options: [['', '—'], ['flex-start', 'Inicio'], ['center', 'Centro'], ['flex-end', 'Fin'], ['stretch', 'Estirar']], cuando: (s) => s.display === 'flex' || s.display === 'grid' },
      { key: 'gridTemplateColumns', label: 'Columnas', kind: 'columnas', placeholder: 'repeat(3, 1fr)', cuando: (s) => s.display === 'grid' },
      { key: 'gap', label: 'Separación', kind: 'text', placeholder: '20px', cuando: (s) => s.display === 'flex' || s.display === 'grid' },
      // Proporción de los hijos: todas las imágenes de este grid (hijas directas) quedan con la misma proporción y recortadas (cover).
      // Una foto con su propia Proporción mantiene la suya.
      { key: 'hijosAspectRatio', label: 'Proporción de los hijos', kind: 'proporcion', autoVacio: true, placeholder: '1 / 1', cuando: (s) => s.display === 'grid' },
      // Recortar contenido = overflow:hidden. Útil para que una imagen con parallax quede dentro de su marco.
      // Solo contenedores y secciones (en la página recortaría todo el scroll).
      { key: 'overflow', label: 'Recortar contenido', kind: 'select', options: [['', 'No (normal)'], ['hidden', 'Sí (recortar)']], tipos: CONTENEDOR, vacioMovil: 'visible' },
      { kind: 'nota', tipos: CONTENEDOR, cuando: (s) => s.overflow === 'hidden',
        texto: '⚠ Un contenedor que recorta rompe el sticky de lo que tenga adentro (el sticky deja de pegarse). Si necesitas sticky dentro, no recortes aquí.' },
    ],
  },
];

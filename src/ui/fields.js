// CAMPOS DEL PANEL DE PROPIEDADES (declarativo).
// Para añadir un control: agrega una línea en el grupo que corresponda.
//   key: propiedad CSS (camelCase) · kind: 'text' | 'color' | 'select'
//   cuando(estilos): opcional, el campo solo aparece si devuelve true

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
      { key: 'fontFamily', label: 'Fuente', kind: 'select', options: FUENTES },
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
    titulo: 'Tamaño y espaciado',
    tipos: [...TEXTO, ...CONTENEDOR, 'image'],
    campos: [
      { key: 'padding', label: 'Padding', kind: 'text', placeholder: '24px 32px' },
      { key: 'margin', label: 'Margen', kind: 'text', placeholder: '0' },
      { key: 'width', label: 'Ancho', kind: 'text', placeholder: '100%' },
      { key: 'maxWidth', label: 'Ancho máx.', kind: 'text', placeholder: '600px' },
      { key: 'minHeight', label: 'Alto mín.', kind: 'text', placeholder: '60vh' },
      { key: 'height', label: 'Alto', kind: 'text', placeholder: 'auto' },
    ],
  },
  {
    titulo: 'Imagen',
    tipos: ['image'],
    campos: [{ key: 'objectFit', label: 'Ajuste', kind: 'select', options: [['', '—'], ['cover', 'Cover'], ['contain', 'Contain']] }],
  },
  {
    titulo: 'Layout (hijos)',
    tipos: [...CONTENEDOR, 'page'],
    campos: [
      { key: 'display', label: 'Tipo', kind: 'select', options: [['', 'Bloque'], ['flex', 'Flex'], ['grid', 'Grid']] },
      { key: 'flexDirection', label: 'Dirección', kind: 'select', options: [['', '—'], ['row', 'Fila'], ['column', 'Columna']], cuando: (s) => s.display === 'flex' },
      { key: 'flexWrap', label: 'Envolver', kind: 'select', options: [['', '—'], ['wrap', 'Sí'], ['nowrap', 'No']], cuando: (s) => s.display === 'flex' },
      { key: 'justifyContent', label: 'Justificar', kind: 'select', options: [['', '—'], ['flex-start', 'Inicio'], ['center', 'Centro'], ['flex-end', 'Fin'], ['space-between', 'Espaciado']], cuando: (s) => s.display === 'flex' },
      { key: 'alignItems', label: 'Alinear', kind: 'select', options: [['', '—'], ['flex-start', 'Inicio'], ['center', 'Centro'], ['flex-end', 'Fin'], ['stretch', 'Estirar']], cuando: (s) => s.display === 'flex' || s.display === 'grid' },
      { key: 'gridTemplateColumns', label: 'Columnas', kind: 'text', placeholder: 'repeat(3, 1fr)', cuando: (s) => s.display === 'grid' },
      { key: 'gap', label: 'Separación', kind: 'text', placeholder: '20px', cuando: (s) => s.display === 'flex' || s.display === 'grid' },
    ],
  },
];

// CAMPOS DEL PANEL DE PROPIEDADES (declarativo).
// Para añadir un control: agrega una línea en el grupo que corresponda.
//   key: propiedad CSS (camelCase) · kind: 'text' | 'color' | 'select'
//   cuando(estilos): opcional, el campo solo aparece si devuelve true
//   vacioMovil: solo para selects cuya primera opcion ('') es un valor CSS real distinto del de escritorio.
//     En vista movil, '' pasa a significar "Igual que escritorio" (borra el override) y aparece una opcion
//     extra con este valor explicito (ej. 'static') para poder volver al valor normal en movil.
//     vacioTexto: nombre de esa opcion explicita (por defecto, el texto de la primera opcion).
//   acordeon: 'contenido' | 'estilo' | 'movimiento' = en cuál de los 3 acordeones del inspector vive el GRUPO ENTERO
//     (un grupo nunca se reparte entre dos acordeones). Si falta, va a 'estilo'. El texto/enlace del elemento no está aquí:
//     va fijo arriba del panel (inspector.js). Las animaciones (src/animations/) y los estados van siempre en 'movimiento'.
//   fila: campos seguidos con el mismo `fila` van en una sola fila de columnas (etiqueta arriba); solo para kind 'text' | 'select' | 'color'.
//   Controles visuales (src/ui/controles.js): kind 'columnas' | 'anchoMax' | 'centrar' | 'proporcion'. Escriben los MISMOS
//     strings CSS de siempre. El campo de texto del valor queda en "Escribir el valor a mano" del grupo (crudo = su etiqueta ahi).
//     'forma' (borderRadius) y 'tamanoBoton' (padding + fontSize en una sola accion; crudos: [{key,label,placeholder}] = sus campos de texto en "a mano").
//     'estiloBoton' (Relleno/Contorno/Suave: background + color + border en una sola accion; sin "a mano" propio).
//     autoVacio (solo proporcion): "Auto" = quitar la proporcion en vez de escribir 'auto' (para "Proporcion de las fotos").
// NOMBRES: las etiquetas evitan jerga CSS y no se repiten con otro significado ("Tamaño de letra / del botón / del icono",
//   "Alinear texto" frente a "Alinear elementos"). Cambiar una etiqueta aquí no cambia lo que se guarda.

import { SVG_AVISO } from './iconos.js';

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
    // Solo botones, arriba del todo. Esquinas = border-radius; Tamaño del botón = padding + font-size juntos (sus campos de texto crudos
    // van en "Escribir el valor a mano"; por eso el espacio interior y el tamaño de letra no se repiten abajo para botones).
    titulo: 'Botón',
    acordeon: 'estilo',
    tipos: ['button'],
    campos: [
      // Aspecto (Relleno / Contorno / Suave) = background + color + border juntos. Sus valores crudos ya están más abajo
      // (Color de fondo, Color del texto y Borde), así que no lleva "a mano"; "Otro" lleva el cursor al campo Color de fondo.
      { key: 'background', label: 'Aspecto', kind: 'estiloBoton' },
      { key: 'borderRadius', label: 'Esquinas', crudo: 'Redondeo', kind: 'forma', placeholder: '12px' },
      { key: 'padding', label: 'Tamaño del botón', kind: 'tamanoBoton',
        crudos: [{ key: 'padding', label: 'Espacio interior', placeholder: '12px 24px' }, { key: 'fontSize', label: 'Tamaño de letra', placeholder: '16px' }] },
    ],
  },
  {
    titulo: 'Texto',
    acordeon: 'estilo',
    tipos: [...TEXTO, 'page'],
    campos: [
      { key: 'fontSize', label: 'Tamaño de letra', kind: 'text', placeholder: '24px', tipos: ['heading', 'text', 'page'], fila: 'tam-color' },
      { key: 'color', label: 'Color del texto', kind: 'color', fila: 'tam-color' },
      { key: 'fontFamily', label: 'Tipo de letra', kind: 'select', options: FUENTES, vacioMovil: 'inherit' },
      { key: 'fontWeight', label: 'Grosor', kind: 'select', options: [['', '—'], ['400', 'Normal'], ['600', 'Seminegrita'], ['800', 'Negrita'], ['900', 'Extra']], fila: 'peso-alin' },
      { key: 'textAlign', label: 'Alinear texto', kind: 'select', options: [['', '—'], ['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']], fila: 'peso-alin' },
      { key: 'lineHeight', label: 'Espacio entre líneas', kind: 'text', placeholder: '1.2', fila: 'inter' },
      { key: 'letterSpacing', label: 'Espacio entre letras', kind: 'text', placeholder: '0.02em', fila: 'inter' },
    ],
  },
  {
    // Elemento Icono: la elección del icono va en "Contenido" (cuadrícula). Tamaño = width y height a la vez; Color = color
    // (si no tiene, hereda del padre). En móvil los dos se pueden sobrescribir como cualquier campo.
    titulo: 'Icono',
    acordeon: 'estilo',
    tipos: ['icon'],
    campos: [
      { key: 'width', label: 'Tamaño del icono', kind: 'iconoTamano' },
      { key: 'color', label: 'Color del icono', kind: 'color' },
    ],
  },
  {
    titulo: 'Fondo, borde y esquinas',
    acordeon: 'estilo',
    tipos: [...TEXTO, ...CONTENEDOR, 'page', 'image', 'icon'],
    campos: [
      { key: 'background', label: 'Color de fondo', kind: 'color' },
      // Esquinas (Recto/Suave/Redondo/Pastilla) para todo salvo botones (que las tienen arriba, en "Botón"). Su texto crudo (Redondeo) va en "a mano".
      { key: 'borderRadius', label: 'Esquinas', crudo: 'Redondeo', kind: 'forma', placeholder: '12px', tipos: [...CONTENEDOR, 'page', 'image', 'heading', 'text', 'icon'] },
      { key: 'border', label: 'Borde', kind: 'text', placeholder: '1px solid #ccc' },
      { key: 'opacity', label: 'Opacidad', kind: 'text', placeholder: '1' },
    ],
  },
  {
    // Imagen de fondo de secciones/contenedores. Campos propios (no son CSS directo: ver CLAVES_PROPIAS en tree.js);
    // el export los convierte en background-image (+ capa oscura) en CSS puro. "Color de fondo" de arriba queda de color de respaldo.
    titulo: 'Imagen de fondo',
    acordeon: 'estilo',
    tipos: CONTENEDOR,
    campos: [
      { key: 'fondoImagen', label: 'Imagen de fondo', kind: 'fondoImagen' },
      { key: 'fondoAjuste', label: 'Ajuste de la imagen', kind: 'fondoAjuste', cuando: (s) => !!s.fondoImagen },
      { key: 'fondoPosicion', label: 'Encuadre', kind: 'fondoPosicion', cuando: (s) => !!s.fondoImagen },
      { key: 'fondoCapa', label: 'Capa oscura', kind: 'fondoCapa', cuando: (s) => !!s.fondoImagen },
    ],
  },
  {
    titulo: 'Medidas y espacios',
    acordeon: 'estilo',
    tipos: [...TEXTO, ...CONTENEDOR, 'image'],
    campos: [
      { key: 'padding', label: 'Espacio interior', kind: 'text', placeholder: '24px 32px', tipos: ['heading', 'text', ...CONTENEDOR, 'image'] },
      { key: 'width', label: 'Ancho', kind: 'text', placeholder: '100%', fila: 'dim' },
      { key: 'height', label: 'Alto', kind: 'text', placeholder: 'auto', fila: 'dim' },
      { key: 'maxWidth', label: 'Ancho máximo', kind: 'anchoMax', placeholder: '600px' },
      { key: 'margin', label: 'Centrar', crudo: 'Espacio exterior', kind: 'centrar', placeholder: '0 auto' },
      { key: 'minHeight', label: 'Alto mínimo', kind: 'text', placeholder: '60vh' },
      // Proporción = aspect-ratio (ej. 4 / 3, 1 / 1). Solo imágenes. En móvil, escribe "auto" para volver a la proporción natural.
      { key: 'aspectRatio', label: 'Proporción', kind: 'proporcion', placeholder: '4 / 3', tipos: ['image'] },
    ],
  },
  {
    titulo: 'Pegado al hacer scroll',
    acordeon: 'movimiento',
    tipos: [...TEXTO, ...CONTENEDOR, 'image'],
    campos: [
      // "Se queda fijo" = position:sticky (CSS puro, sin script). Se queda fijo al hacer scroll mientras
      // su contenedor siga a la vista. Escribe una distancia arriba (ej. 0) y/o abajo; vacío = no se pega por ese lado.
      // Para quitarlo: elige "Normal".
      { key: 'position', label: 'Modo', kind: 'select', options: [['', 'Normal'], ['sticky', 'Se queda fijo']], vacioMovil: 'static' },
      { key: 'top', label: 'Distancia arriba', kind: 'text', placeholder: '0', fila: 'pegar', cuando: (s) => s.position === 'sticky' },
      { key: 'bottom', label: 'Distancia abajo', kind: 'text', placeholder: '0', fila: 'pegar', cuando: (s) => s.position === 'sticky' },
      { key: 'zIndex', label: 'Capa (qué queda encima)', kind: 'text', placeholder: '50', fila: 'pegar', cuando: (s) => s.position === 'sticky' },
    ],
  },
  {
    titulo: 'Imagen',
    acordeon: 'estilo',
    tipos: ['image'],
    campos: [{ key: 'objectFit', label: 'Ajuste de la foto', kind: 'select', options: [['', '—'], ['cover', 'Cubrir (recorta)'], ['contain', 'Entera (sin recortar)']], vacioMovil: 'fill', vacioTexto: 'Rellenar (fill)' }],
  },
  {
    titulo: 'Disposición',
    acordeon: 'estilo',
    tipos: [...CONTENEDOR, 'page'],
    campos: [
      { key: 'display', label: 'Disposición', kind: 'select', options: [['', 'Apilados'], ['flex', 'Fila o columna'], ['grid', 'Cuadrícula']], vacioMovil: 'block' },
      { key: 'flexDirection', label: 'Dirección', kind: 'select', options: [['', '—'], ['row', 'Fila'], ['column', 'Columna']], cuando: (s) => s.display === 'flex' },
      { key: 'flexWrap', label: 'Saltar de línea', kind: 'select', options: [['', '—'], ['wrap', 'Sí'], ['nowrap', 'No']], cuando: (s) => s.display === 'flex' },
      { key: 'justifyContent', label: 'Repartir', kind: 'select', options: [['', '—'], ['flex-start', 'Inicio'], ['center', 'Centro'], ['flex-end', 'Fin'], ['space-between', 'Espaciado']], cuando: (s) => s.display === 'flex' },
      { key: 'alignItems', label: 'Alinear elementos', kind: 'select', options: [['', '—'], ['flex-start', 'Inicio'], ['center', 'Centro'], ['flex-end', 'Fin'], ['stretch', 'Estirar']], cuando: (s) => s.display === 'flex' || s.display === 'grid' },
      { key: 'gridTemplateColumns', label: 'Columnas', kind: 'columnas', placeholder: 'repeat(3, 1fr)', cuando: (s) => s.display === 'grid' },
      { key: 'gap', label: 'Espacio entre elementos', kind: 'text', placeholder: '20px', cuando: (s) => s.display === 'flex' || s.display === 'grid' },
      // Proporción de las fotos: todas las imágenes de esta cuadrícula (hijas directas) quedan con la misma proporción y recortadas (cover).
      // Una foto con su propia Proporción mantiene la suya.
      { key: 'hijosAspectRatio', label: 'Proporción de las fotos', kind: 'proporcion', autoVacio: true, placeholder: '1 / 1', cuando: (s) => s.display === 'grid' },
      // Recortar contenido = overflow:hidden. Útil para que una imagen con parallax quede dentro de su marco.
      // Solo contenedores y secciones (en la página recortaría todo el scroll).
      { key: 'overflow', label: 'Recortar lo que sobresale', kind: 'select', options: [['', 'No (normal)'], ['hidden', 'Sí (recortar)']], tipos: CONTENEDOR, vacioMovil: 'visible' },
      { kind: 'nota', tipos: CONTENEDOR, cuando: (s) => s.overflow === 'hidden',
        texto: `${SVG_AVISO} Un contenedor que recorta rompe el sticky de lo que tenga adentro (el sticky deja de pegarse). Si necesitas sticky dentro, no recortes aquí.` },
    ],
  },
];

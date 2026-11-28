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

import { t } from '../i18n/index.js';
import { SVG_AVISO } from './iconos.js';

const TEXTO = ['heading', 'text', 'button'];
const CONTENEDOR = ['section', 'container'];

const FUENTES = [
  ['', t('campo.fuenteHeredada')],
  ['system-ui, sans-serif', t('campo.fuenteSistema')],
  ['Georgia, serif', 'Georgia (serif)'],
  ['"Trebuchet MS", sans-serif', 'Trebuchet'],
  ['"Courier New", monospace', 'Courier (mono)'],
  ['Impact, sans-serif', 'Impact'],
];

export const GRUPOS = [
  {
    // Solo botones, arriba del todo. Esquinas = border-radius; Tamaño del botón = padding + font-size juntos (sus campos de texto crudos
    // van en "Escribir el valor a mano"; por eso el espacio interior y el tamaño de letra no se repiten abajo para botones).
    titulo: t('tipo.boton'),
    acordeon: 'estilo',
    tipos: ['button'],
    campos: [
      // Aspecto (Relleno / Contorno / Suave) = background + color + border juntos. Sus valores crudos ya están más abajo
      // (Color de fondo, Color del texto y Borde), así que no lleva "a mano"; "Otro" lleva el cursor al campo Color de fondo.
      { key: 'background', label: t('campo.aspecto'), kind: 'estiloBoton' },
      { key: 'borderRadius', label: t('campo.esquinas'), crudo: t('campo.redondeo'), kind: 'forma', placeholder: '12px' },
      { key: 'padding', label: t('campo.tamBoton'), kind: 'tamanoBoton',
        crudos: [{ key: 'padding', label: t('campo.padding'), placeholder: '12px 24px' }, { key: 'fontSize', label: t('campo.tamLetra'), placeholder: '16px' }] },
    ],
  },
  {
    titulo: t('tipo.texto'),
    acordeon: 'estilo',
    tipos: [...TEXTO, 'page'],
    campos: [
      { key: 'fontSize', label: t('campo.tamLetra'), kind: 'text', placeholder: '24px', tipos: ['heading', 'text', 'page'], fila: 'tam-color' },
      { key: 'color', label: t('campo.colorTexto'), kind: 'color', fila: 'tam-color' },
      { key: 'fontFamily', label: t('campo.fuente'), kind: 'select', options: FUENTES, vacioMovil: 'inherit' },
      { key: 'fontWeight', label: t('campo.grosor'), kind: 'select', options: [['', '—'], ['400', t('comun.normal')], ['600', t('campo.seminegrita')], ['800', t('campo.negrita')], ['900', t('campo.extra')]], fila: 'peso-alin' },
      { key: 'textAlign', label: t('campo.alinearTexto'), kind: 'select', options: [['', '—'], ['left', t('comun.izquierda')], ['center', t('comun.centro')], ['right', t('comun.derecha')]], fila: 'peso-alin' },
      { key: 'lineHeight', label: t('campo.interlineado'), kind: 'text', placeholder: '1.2', fila: 'inter' },
      { key: 'letterSpacing', label: t('campo.interletra'), kind: 'text', placeholder: '0.02em', fila: 'inter' },
    ],
  },
  {
    // Elemento Icono: la elección del icono va en "Contenido" (cuadrícula). Tamaño = width y height a la vez; Color = color
    // (si no tiene, hereda del padre). En móvil los dos se pueden sobrescribir como cualquier campo.
    titulo: t('tipo.icono'),
    acordeon: 'estilo',
    tipos: ['icon'],
    campos: [
      { key: 'width', label: t('campo.tamIcono'), kind: 'iconoTamano' },
      { key: 'color', label: t('campo.colorIcono'), kind: 'color' },
    ],
  },
  {
    titulo: t('campo.grupoFondo'),
    acordeon: 'estilo',
    tipos: [...TEXTO, ...CONTENEDOR, 'page', 'image', 'icon'],
    campos: [
      { key: 'background', label: t('campo.colorFondo'), kind: 'color' },
      // Esquinas (Recto/Suave/Redondo/Pastilla) para todo salvo botones (que las tienen arriba, en "Botón"). Su texto crudo (Redondeo) va en "a mano".
      { key: 'borderRadius', label: t('campo.esquinas'), crudo: t('campo.redondeo'), kind: 'forma', placeholder: '12px', tipos: [...CONTENEDOR, 'page', 'image', 'heading', 'text', 'icon'] },
      { key: 'border', label: t('campo.borde'), kind: 'text', placeholder: '1px solid #ccc' },
      { key: 'opacity', label: t('comun.opacidad'), kind: 'text', placeholder: '1' },
      // Sombra en reposo (clave propia `sombra`, ver core/sombra.js). La técnica CSS (box-shadow / text-shadow / drop-shadow) la elige
      // el editor según el elemento. Sin valor "a mano": los presets y los números ya lo cubren. No va en la página.
      { key: 'sombra', label: t('comun.sombra'), kind: 'sombra', tipos: [...TEXTO, ...CONTENEDOR, 'image', 'icon'] },
    ],
  },
  {
    // Imagen de fondo de secciones/contenedores. Campos propios (no son CSS directo: ver CLAVES_PROPIAS en tree.js);
    // el export los convierte en background-image (+ capa oscura) en CSS puro. "Color de fondo" de arriba queda de color de respaldo.
    titulo: t('campo.fondoImagen'),
    acordeon: 'estilo',
    tipos: CONTENEDOR,
    campos: [
      { key: 'fondoImagen', label: t('campo.fondoImagen'), kind: 'fondoImagen' },
      { key: 'fondoAjuste', label: t('campo.ajusteImagen'), kind: 'fondoAjuste', cuando: (s) => !!s.fondoImagen },
      { key: 'fondoPosicion', label: t('campo.encuadre'), kind: 'fondoPosicion', cuando: (s) => !!s.fondoImagen },
      { key: 'fondoCapa', label: t('campo.capaOscura'), kind: 'fondoCapa', cuando: (s) => !!s.fondoImagen },
    ],
  },
  {
    titulo: t('campo.grupoMedidas'),
    acordeon: 'estilo',
    tipos: [...TEXTO, ...CONTENEDOR, 'image'],
    campos: [
      { key: 'padding', label: t('campo.padding'), kind: 'text', placeholder: '24px 32px', tipos: ['heading', 'text', ...CONTENEDOR, 'image'] },
      { key: 'width', label: t('campo.ancho'), kind: 'text', placeholder: '100%', fila: 'dim' },
      { key: 'height', label: t('campo.alto'), kind: 'text', placeholder: 'auto', fila: 'dim' },
      { key: 'maxWidth', label: t('campo.anchoMax'), kind: 'anchoMax', placeholder: '600px' },
      { key: 'margin', label: t('campo.centrar'), crudo: t('campo.margen'), kind: 'centrar', placeholder: '0 auto' },
      { key: 'minHeight', label: t('campo.altoMin'), kind: 'text', placeholder: '60vh' },
      // Proporción = aspect-ratio (ej. 4 / 3, 1 / 1). Solo imágenes. En móvil, escribe "auto" para volver a la proporción natural.
      { key: 'aspectRatio', label: t('campo.proporcion'), kind: 'proporcion', placeholder: '4 / 3', tipos: ['image'] },
    ],
  },
  {
    titulo: t('campo.grupoPegado'),
    acordeon: 'movimiento',
    tipos: [...TEXTO, ...CONTENEDOR, 'image'],
    campos: [
      // "Se queda fijo" = position:sticky (CSS puro, sin script). Se queda fijo al hacer scroll mientras
      // su contenedor siga a la vista. Escribe una distancia arriba (ej. 0) y/o abajo; vacío = no se pega por ese lado.
      // Para quitarlo: elige "Normal".
      { key: 'position', label: t('comun.modo'), kind: 'select', options: [['', t('comun.normal')], ['sticky', t('campo.fijo')]], vacioMovil: 'static' },
      { key: 'top', label: t('campo.distArriba'), kind: 'text', placeholder: '0', fila: 'pegar', cuando: (s) => s.position === 'sticky' },
      { key: 'bottom', label: t('campo.distAbajo'), kind: 'text', placeholder: '0', fila: 'pegar', cuando: (s) => s.position === 'sticky' },
      { key: 'zIndex', label: t('campo.zindex'), kind: 'text', placeholder: '50', fila: 'pegar', cuando: (s) => s.position === 'sticky' },
    ],
  },
  {
    titulo: t('tipo.imagen'),
    acordeon: 'estilo',
    tipos: ['image'],
    campos: [{ key: 'objectFit', label: t('campo.ajusteFoto'), kind: 'select', options: [['', '—'], ['cover', t('campo.cubrirRecorta')], ['contain', t('campo.entera')]], vacioMovil: 'fill', vacioTexto: t('campo.rellenar') }],
  },
  {
    titulo: t('campo.disposicion'),
    acordeon: 'estilo',
    tipos: [...CONTENEDOR, 'page'],
    campos: [
      { key: 'display', label: t('campo.disposicion'), kind: 'select', options: [['', t('campo.apilados')], ['flex', t('campo.filaColumna')], ['grid', t('campo.cuadricula')]], vacioMovil: 'block' },
      { key: 'flexDirection', label: t('comun.direccion'), kind: 'select', options: [['', '—'], ['row', t('campo.fila')], ['column', t('campo.columna')]], cuando: (s) => s.display === 'flex' },
      { key: 'flexWrap', label: t('campo.saltar'), kind: 'select', options: [['', '—'], ['wrap', t('comun.si')], ['nowrap', t('comun.no')]], cuando: (s) => s.display === 'flex' },
      { key: 'justifyContent', label: t('campo.repartir'), kind: 'select', options: [['', '—'], ['flex-start', t('campo.inicio')], ['center', t('comun.centro')], ['flex-end', t('campo.final')], ['space-between', t('campo.espaciado')]], cuando: (s) => s.display === 'flex' },
      { key: 'alignItems', label: t('campo.alinearElementos'), kind: 'select', options: [['', '—'], ['flex-start', t('campo.inicio')], ['center', t('comun.centro')], ['flex-end', t('campo.final')], ['stretch', t('campo.estirar')]], cuando: (s) => s.display === 'flex' || s.display === 'grid' },
      { key: 'gridTemplateColumns', label: t('campo.columnas'), kind: 'columnas', placeholder: 'repeat(3, 1fr)', cuando: (s) => s.display === 'grid' },
      { key: 'gap', label: t('campo.gap'), kind: 'text', placeholder: '20px', cuando: (s) => s.display === 'flex' || s.display === 'grid' },
      // Proporción de las fotos: todas las imágenes de esta cuadrícula (hijas directas) quedan con la misma proporción y recortadas (cover).
      // Una foto con su propia Proporción mantiene la suya.
      { key: 'hijosAspectRatio', label: t('campo.propFotos'), kind: 'proporcion', autoVacio: true, placeholder: '1 / 1', cuando: (s) => s.display === 'grid' },
      // Recortar contenido = overflow:hidden. Útil para que una imagen con parallax quede dentro de su marco.
      // Solo contenedores y secciones (en la página recortaría todo el scroll).
      { key: 'overflow', label: t('campo.recortar'), kind: 'select', options: [['', t('campo.noNormal')], ['hidden', t('campo.siRecortar')]], tipos: CONTENEDOR, vacioMovil: 'visible' },
      { kind: 'nota', tipos: CONTENEDOR, cuando: (s) => s.overflow === 'hidden',
        texto: `${SVG_AVISO} ${t('campo.notaRecorte')}` },
    ],
  },
];

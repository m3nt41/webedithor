# Auditoría de textos para traducir (i18n, mini-etapa 2)

Solo lectura: no se ha extraído ningún texto todavía. Lista sacada del código con un lector de literales (sin comentarios) y filtrada de CSS y scripts: 481 entradas más los nombres de bloques. Puede faltar algún texto corto en minúscula; el test de idiomas y una pasada a ojo los cazan. `{}` marca un dato que se rellena solo. Una fila puede traer varias frases (trozos de HTML).

## Resumen: revisa esto

| Qué | Veredicto |
|---|---|
| Interfaz: barra, sidebar, inspector, diálogos, avisos, tooltips y `aria-label` | **traducir** (tandas A, B y C) |
| Nombres de animaciones y efectos | **traducir** (tanda D, mini-etapa 3); los ids no cambian |
| Nombres de bloques, variantes y elementos sueltos (la paleta) | **traducir** |
| `name` de los nodos (Logo, Enlaces, Botón de acción…) | **dejar**: se guardan en el JSON |
| Textos de ejemplo de las plantillas y la landing de la demo | **dejar** (ya decidido) |
| `Página` y `Mi landing` de una página nueva, y el título `Landing` de respaldo del export | **dejar**: son datos de la página |
| Claves del plan de IA (`bloque`, `secciones`, `valores`) y claves de variantes | **dejar**: son formato |
| Guía de IA (`guiaia.js`, `guiaia-ejemplos.js`), README y CLI | **al final** (mini-etapa 5) |
| "Abrir menú" / "Cerrar menú" del export (`exporter.js`, `menumovil.js`) | **al final** (mini-etapa 5, según el idioma de la página) |
| `index.html`: aviso "solo en computadora" | **dejar** (ya sale en los dos idiomas) |
| `index.html`: `aria-label` "Secciones", "Vista previa", "Propiedades" y `<html lang>` | **traducir** (tanda A) |
| Fuentes ("Georgia (serif)", "Courier (mono)"…) | **dejar** los nombres de fuente; **traducir** "Sistema" |

## Cosas a cuidar al extraer

1. **Tests:** el Firefox de prueba puede venir en inglés. Antes de añadir `en.js` hay que fijar español en `opcionesFirefox()` (`tools/lib-tests.mjs`) y en los tests que no la usen; si no, fallan al buscar textos.
2. **Nombre `t`:** varios archivos ya usan `t` como variable (p. ej. `main.js`, `navbar.js`). Hay que renombrarla donde se importe la función.
3. **Plurales:** hay textos del tipo "sección{}" o "valor{}". Cada uno pasa a dos claves (uno / varios).
4. **Títulos de grupo:** el inspector usa el título del grupo en `data-g` para recordar qué está abierto; revisarlo en la tanda B.
5. **Node y CLI:** fuera del navegador `t()` siempre devuelve español.

## Bloques y variantes (traducir solo estos nombres)

| Bloque | Variantes |
|---|---|
| Navbar | Claro, Oscuro, Centrado, Con botón |
| Hero | Oscuro, Claro, Texto + imagen, Con fondo, Acento |
| Servicios | Tarjetas, Con iconos, Oscuro, Lista numerada |
| Galería | Cuadrícula 3, Foto destacada, Fila de 4, Oscura |
| Testimonios | Tarjetas, Cita grande, Con foto, Oscuro |
| Precios | 3 planes, 2 planes, Oscuro, Lista simple |
| Escena | Tres mensajes, Texto + imagen |
| Marquesina | Contorno · claro, Contorno · oscuro, Cinta · clara, Cinta · oscura, Logos · claro, Logos · oscuro |
| Contacto WhatsApp | Centrado, Tarjeta, Texto + datos, Oscuro |
| Footer | Simple, Columnas, Centrado, Mínimo |

Elementos sueltos: Sección vacía, Contenedor, Título, Texto, Botón, Imagen, Icono, Marquesina.

## Tanda A: Barra, sidebar y arranque

### src/main.js (8)

| Línea | Texto | Qué hacer |
|---|---|---|
| 40 | Otra pestaña guardó cambios distintos en este editor. | traducir |
| 41 | Recargar con lo guardado | traducir |
| 42 | Seguir con esta versión | traducir |
| 53 | {} No se pudo autoguardar: el almacenamiento del navegador está lleno (probablemente por imágenes pesadas). Usa "Guardar JSON" para no perder tu trabajo, o quita/usa una imagen más liviana (o pega su URL). | traducir |
| 65 | No se pudo leer la página guardada en este navegador.{} Descárgala antes de seguir si te importa. | traducir |
| 65 | Se apartó una copia. | traducir |
| 66 | Descargar copia Cerrar | traducir |
| 75 | Esto es una demo: haz clic en cualquier cosa para editarla. Las animaciones se ven con el botón del ojo (Vista previa). | traducir |

### src/ui/toolbar.js (6)

| Línea | Texto | Qué hacer |
|---|---|---|
| 15 | WebEdiThor [Deshacer] {} [Rehacer] {} [Modo de edición] [Escritorio] {} [Móvil] {} [Vista previa] {} {} {} Nuevo Abrir JSON Guardar JSON Exportar HTML | traducir |
| 27 | Ver demo | traducir |
| 44 | ¿Empezar una página nueva? (Puedes deshacerlo con Ctrl+Z) | traducir |
| 49 | ¿Cargar la landing de muestra? Reemplaza tu página actual (puedes deshacerlo con Ctrl+Z mientras no recargues). | traducir |
| 69 | No se pudo abrir el archivo: {} | traducir |
| 83 | Tiradores de espaciado: | traducir |

### src/ui/sidebar.js (9)

| Línea | Texto | Qué hacer |
|---|---|---|
| 24 | Bloques | traducir |
| 25 | Capas | traducir |
| 26 | Elem. | traducir |
| 30 | [Paneles] [Ajustes de la página] {} | traducir |
| 111 | Se añadirá dentro de: {} | traducir |
| 111 | Se añadirá al final de la página | traducir |
| 230 | Duplicar | traducir |
| 235 | Borrar | traducir |
| 283 | Aún no hay secciones. Añade un bloque. | traducir |

### src/ui/vistaprevia.js (1)

| Línea | Texto | Qué hacer |
|---|---|---|
| 38 | [Vista previa] [Modo de la vista previa] [Escritorio] {} [Móvil] {} [Salir de la vista previa (Esc)] {} [Reiniciar] {} [Vista previa de la página] | traducir |

## Tanda B: Inspector y campos

### src/ui/inspector.js (96)

| Línea | Texto | Qué hacer |
|---|---|---|
| 29 | Contenido | traducir |
| 29 | Estilo | traducir |
| 29 | Movimiento | traducir |
| 44 | Página | traducir |
| 44 | Sección | traducir |
| 44 | Contenedor | traducir |
| 44 | Título | traducir |
| 44 | Texto | traducir |
| 44 | Botón | traducir |
| 44 | Imagen | traducir |
| 44 | Icono | traducir |
| 61 | El navegador no entiende este valor y lo ignora (¿falta la unidad? ej. 900px). | traducir |
| 68 | class="ov" title="Solo en móvil: este valor pisa el de escritorio" | traducir |
| 96 | [Escribir otro valor CSS (en Avanzado)] Otro | traducir |
| 97 | mín. px | traducir |
| 99 | ↺ igual que escritorio | traducir |
| 101 | ↺ igual que escritorio | traducir |
| 102 | ↺ igual que escritorio | traducir |
| 112 | Sigue las letras (text-shadow). | traducir |
| 112 | Sigue la forma del icono o la imagen (si la imagen tiene transparencia, sigue su silueta; si es un rectángulo opaco, un rectángulo). | traducir |
| 112 | Sigue la caja del elemento y sus esquinas. | traducir |
| 118 | [Elegir tú el desplazamiento, el desfoque y el color] Personalizada | traducir |
| 119 | ↺ igual que escritorio | traducir |
| 121 | Esta sombra tiene varias capas o un formato especial: se respeta tal cual. Elige un preset para reemplazarla. | traducir |
| 128 | Horizontal | traducir |
| 128 | Vertical | traducir |
| 128 | Desfoque | traducir |
| 128 | Grosor | traducir |
| 128 | Expansión | traducir |
| 129 | Color [Color de la sombra] | traducir |
| 130 | Opacidad {}% | traducir |
| 141 | Marquesina | traducir |
| 142 | Movimiento | traducir |
| 142 | Con movimiento | traducir |
| 142 | Sin movimiento (fija) | traducir |
| 143 | Velocidad | traducir |
| 143 | {} s por vuelta | traducir |
| 144 | Segundos por vuelta | traducir |
| 145 | Dirección | traducir |
| 145 | Derecha → | traducir |
| 146 | Pausa al pasar el ratón | traducir |
| 146 | Sí | traducir |
| 146 | No | traducir |
| 147 | Separación | traducir |
| 148 | Más opciones | traducir |
| 149 | Repetición (copias de la tira) | traducir |
| 150 | Cuántas veces se repite la tira para que no queden huecos en pantallas anchas. Con pocos items o items cortos, sube el número. Solo cuenta en el HTML exportado y en la Vista previa. Los botones o enlaces de las copias repetidas no se pueden pulsar (solo los de la primera tira). | traducir |
| 151 | En el editor la marquesina se ve quieta, con todos los items a la vista para editarlos; la animación se ve en 👁 Vista previa y en el export. Cada item es un elemento normal (selecciónalo en Capas o en el preview). | traducir |
| 159 | Estados (hover, clic…) reposo = el aspecto normal del elemento. Cada estado cambia solo lo que rellenes; si dos coinciden, gana el de más abajo. | traducir |
| 164 | [Nombre del estado] [Ver este estado en el preview (no se exporta)] {} [Subir] ↑ [Bajar] ↓ [Borrar estado] ✕ Se dispara {} Qué cambia (vacío = no cambia) | traducir |
| 167 | Dejar de ver | traducir |
| 167 | Ver | traducir |
| 177 | {} [sin cambio] | traducir |
| 181 | {} [sin cambio] | traducir |
| 184 | Cómo viaja | traducir |
| 195 | Un clic activa el estado y otro clic vuelve a reposo. El .html exportado lleva un script de unas líneas. | traducir |
| 198 | + Añadir estado | traducir |
| 203 | Para enlazar: #nombre | traducir |
| 204 | Inválida: empieza con letra; solo letras, números y guiones. No se guarda. | traducir |
| 205 | {}"{}" ya existe en otra parte de la página (se repite). | traducir |
| 206 | Enlace: #{} | traducir |
| 224 | Propiedades Haz clic en un elemento del preview. Doble clic en un texto para escribir directamente. | traducir |
| 235 | [Subir (Alt+↑)] ↑ [Bajar (Alt+↓)] ↓ [Duplicar (Ctrl+D)] ⧉ [Borrar (Supr)] ✕ | traducir |
| 242 | {} [Nombre del elemento] {} · {} {} | traducir |
| 244 | Móvil | traducir |
| 244 | Escritorio | traducir |
| 254 | Título | traducir |
| 255 | Página Scroll suave No Sí Solo la rueda del mouse en escritorio (táctil, teclado, barra y anclas quedan nativos). Se ve en el HTML exportado, no en este preview. Buscadores y redes Descripción [Qué ofrece esta página, en una o dos frases] {} Es el texto que Google suele mostrar bajo el título y lo q | traducir |
| 267 | Icono [Elegir icono] {} | traducir |
| 269 | Texto {} | traducir |
| 271 | Nivel {} | traducir |
| 273 | Enlace [https://wa.me/506...] | traducir |
| 275 | URL [https://...] Archivo Texto alterno | traducir |
| 280 | Ancla Ancla (id) [contacto] {} | traducir |
| 286 | Landing con IA Pídele a cualquier IA de chat una landing: pégale la guía y carga aquí lo que devuelva. {} Copiar guía para IA {} Pegar plan o JSON | traducir |
| 292 | Menú en móvil Menú hamburguesa en móvil No Sí En móvil el primer elemento (el logo) queda visible y todo lo demás va al panel de la hamburguesa. El panel se superpone al contenido. En la vista móvil del editor empieza cerrado: ábrelo con la hamburguesa o seleccionando un enlace desde Capas. | traducir |
| 299 | Contenido {} | traducir |
| 303 | Marquesina | traducir |
| 326 | ↺ igual que escritorio | traducir |
| 328 | Subir imagen {} | traducir |
| 329 | …o pega una URL | traducir |
| 329 | (imagen subida) | traducir |
| 336 | ↺ igual que escritorio | traducir |
| 337 | {} {} [Escribir otro tamaño] Otro [Tamaño en px] px {} | traducir |
| 341 | ↺ igual que escritorio | traducir |
| 368 | Igual que escritorio | traducir |
| 375 | {} [#ffffff] {} | traducir |
| 388 | Escribir el valor a mano | traducir |
| 405 | La sección se queda fija y sus hijos se apilan en el mismo lugar: se respetan Alineación y Justificar (y su fondo, borde y padding); Dirección, Separación y Columnas no se usan. Una vez creada, cada hijo directo tiene su "Paso de escena". Solo se ve en Vista previa y en el exportado. "Transición (%  | traducir |
| 408 | {} Un contenedor de arriba tiene scroll propio (overflow auto/scroll): ahí el parallax no se moverá. Quita ese scroll o usa "Recortar contenido". | traducir |
| 429 | Copiar y pegar efectos | traducir |
| 430 | [Ctrl+Alt+C] Copiar efectos | traducir |
| 431 | [Ctrl+Alt+V] Pegar efectos | traducir |
| 432 | [Pega en este y en sus hermanos del mismo tipo] Pegar en hermanos del mismo tipo | traducir |
| 436 | JSON del nodo {} | traducir |
| 676 | Procesando imagen… | traducir |

### src/ui/fields.js (91)

| Línea | Texto | Qué hacer |
|---|---|---|
| 28 | Sistema | traducir |
| 29 | Georgia (serif) | traducir |
| 30 | Trebuchet | traducir |
| 31 | Courier (mono) | traducir |
| 32 | Impact | traducir |
| 39 | Botón | traducir |
| 45 | Aspecto | traducir |
| 46 | Esquinas | traducir |
| 46 | Redondeo | traducir |
| 47 | Tamaño del botón | traducir |
| 48 | Espacio interior | traducir |
| 48 | Tamaño de letra | traducir |
| 52 | Texto | traducir |
| 56 | Tamaño de letra | traducir |
| 57 | Color del texto | traducir |
| 58 | Tipo de letra | traducir |
| 59 | Grosor | traducir |
| 59 | Normal | traducir |
| 59 | Seminegrita | traducir |
| 59 | Negrita | traducir |
| 59 | Extra | traducir |
| 60 | Alinear texto | traducir |
| 60 | Izquierda | traducir |
| 60 | Centro | traducir |
| 60 | Derecha | traducir |
| 61 | Espacio entre líneas | traducir |
| 62 | Espacio entre letras | traducir |
| 68 | Icono | traducir |
| 72 | Tamaño del icono | traducir |
| 73 | Color del icono | traducir |
| 77 | Fondo, borde y esquinas | traducir |
| 81 | Color de fondo | traducir |
| 83 | Esquinas | traducir |
| 83 | Redondeo | traducir |
| 84 | Borde | traducir |
| 85 | Opacidad | traducir |
| 88 | Sombra | traducir |
| 94 | Imagen de fondo | traducir |
| 98 | Imagen de fondo | traducir |
| 99 | Ajuste de la imagen | traducir |
| 100 | Encuadre | traducir |
| 101 | Capa oscura | traducir |
| 105 | Medidas y espacios | traducir |
| 109 | Espacio interior | traducir |
| 110 | Ancho | traducir |
| 111 | Alto | traducir |
| 112 | Ancho máximo | traducir |
| 113 | Centrar | traducir |
| 113 | Espacio exterior | traducir |
| 114 | Alto mínimo | traducir |
| 116 | Proporción | traducir |
| 120 | Pegado al hacer scroll | traducir |
| 127 | Modo | traducir |
| 127 | Normal | traducir |
| 127 | Se queda fijo | traducir |
| 128 | Distancia arriba | traducir |
| 129 | Distancia abajo | traducir |
| 130 | Capa (qué queda encima) | traducir |
| 134 | Imagen | traducir |
| 137 | Ajuste de la foto | traducir |
| 137 | Cubrir (recorta) | traducir |
| 137 | Entera (sin recortar) | traducir |
| 137 | Rellenar (fill) | traducir |
| 140 | Disposición | traducir |
| 144 | Disposición | traducir |
| 144 | Apilados | traducir |
| 144 | Fila o columna | traducir |
| 144 | Cuadrícula | traducir |
| 145 | Dirección | traducir |
| 145 | Fila | traducir |
| 145 | Columna | traducir |
| 146 | Saltar de línea | traducir |
| 146 | Sí | traducir |
| 146 | No | traducir |
| 147 | Repartir | traducir |
| 147 | Inicio | traducir |
| 147 | Centro | traducir |
| 147 | Fin | traducir |
| 147 | Espaciado | traducir |
| 148 | Alinear elementos | traducir |
| 148 | Inicio | traducir |
| 148 | Centro | traducir |
| 148 | Fin | traducir |
| 148 | Estirar | traducir |
| 149 | Columnas | traducir |
| 150 | Espacio entre elementos | traducir |
| 153 | Proporción de las fotos | traducir |
| 156 | Recortar lo que sobresale | traducir |
| 156 | No (normal) | traducir |
| 156 | Sí (recortar) | traducir |
| 158 | {} Un contenedor que recorta rompe el sticky de lo que tenga adentro (el sticky deja de pegarse). Si necesitas sticky dentro, no recortes aquí. | traducir |

### src/ui/controles.js (23)

| Línea | Texto | Qué hacer |
|---|---|---|
| 85 | Recto | traducir |
| 86 | Suave | traducir |
| 87 | Redondo | traducir |
| 88 | Pastilla | traducir |
| 104 | Pequeño | traducir |
| 105 | Mediano | traducir |
| 106 | Grande | traducir |
| 131 | Relleno | traducir |
| 132 | Contorno | traducir |
| 133 | Suave | traducir |
| 234 | Auto | traducir |
| 239 | Completo | traducir |
| 247 | Centrado | traducir |
| 248 | Sin centrar | traducir |
| 258 | Auto | traducir |
| 279 | kind de control desconocido: | traducir |
| 282 | Cubrir | traducir |
| 282 | Contener | traducir |
| 283 | Centro | traducir |
| 283 | Arriba | traducir |
| 283 | Abajo | traducir |
| 283 | Izquierda | traducir |
| 283 | Derecha | traducir |

### src/ui/imagen.js (3)

| Línea | Texto | Qué hacer |
|---|---|---|
| 10 | No se pudo leer el archivo | traducir |
| 16 | El archivo no es una imagen | traducir |
| 20 | No se pudo abrir la imagen | traducir |

### src/ui/tiradores.js (5)

| Línea | Texto | Qué hacer |
|---|---|---|
| 31 | Arrastra · Shift = lado opuesto · Alt = 4 lados · Ctrl = múltiplos de 8 | traducir |
| 134 | Padding | traducir |
| 134 | Margen | traducir |
| 135 | Cambiar entre padding y margen · vista | traducir |
| 135 | móvil | traducir |

### src/ui/efectos.js (7)

| Línea | Texto | Qué hacer |
|---|---|---|
| 9 | Este elemento no tiene efectos que copiar. | traducir |
| 10 | Efectos copiados ({} {}). | traducir |
| 16 | No hay efectos copiados. Copia primero (Ctrl+Alt+C). | traducir |
| 19 | No se pegó nada. Omitido: {}. | traducir |
| 19 | No hay otros elementos donde pegar. | traducir |
| 20 | Efectos pegados en {} {} | traducir |
| 26 | Este elemento no tiene hermanos del mismo tipo. | traducir |

### src/core/sombra.js (10)

| Línea | Texto | Qué hacer |
|---|---|---|
| 112 | Ninguna | traducir |
| 112 | Sin sombra | traducir |
| 113 | Suave | traducir |
| 113 | Sombra pequeña y discreta | traducir |
| 114 | Media | traducir |
| 114 | Sombra normal, como una tarjeta | traducir |
| 115 | Elevada | traducir |
| 115 | Sombra grande: el elemento parece flotar | traducir |
| 116 | Contorno | traducir |
| 116 | Un borde de color alrededor, sin desenfoque | traducir |

### src/core/marquesina.js (3)

| Línea | Texto | Qué hacer |
|---|---|---|
| 16 | Lenta | traducir |
| 16 | Media | traducir |
| 16 | Rápida | traducir |

## Tanda C: Diálogos y avisos del núcleo

### src/ui/plania.js (10)

| Línea | Texto | Qué hacer |
|---|---|---|
| 38 | No se pudo copiar. Abre docs/guia-ia.md y cópiala de ahí. | traducir |
| 40 | Guía copiada. Pégala en el chat de la IA junto con tu pedido. | traducir |
| 52 | Pegar plan o JSON Pega la respuesta de la IA (un plan) o el JSON completo de una página. Si viene con texto alrededor o dentro de ```, se extrae solo. [Plan o JSON] [Qué hacer con lo pegado] Reemplazar la página Añadir al final Cancelar Aplicar | traducir |
| 80 | No hay secciones que aplicar. | traducir |
| 82 | {} No se aplicó nada. {} | traducir |
| 90 | Aplicado ({} sección{}) con avisos: {} | traducir |
| 91 | Listo | traducir |
| 96 | Aplicado: {} sección{} {}. | traducir |
| 96 | añadidas al final | traducir |
| 96 | en la página | traducir |

### src/core/plan.js (21)

| Línea | Texto | Qué hacer |
|---|---|---|
| 49 | El enlace «{}» apunta a {} y no hay sección con ese ancla. | traducir |
| 89 | el valor debe ser un texto o un objeto; se ignoró. | traducir |
| 93 | las imágenes usan "src" y "alt", no "texto"; se ignoró "texto". | traducir |
| 94 | "src" no es una dirección válida (https://… o data:image); se dejó la imagen de relleno. | traducir |
| 96 | las imágenes no tienen enlace; se ignoró. | traducir |
| 98 | "src"/"alt" solo valen en imágenes; se ignoraron. | traducir |
| 99 | "texto" debe ser un texto; se ignoró. | traducir |
| 101 | "enlace" solo vale en botones; se ignoró. | traducir |
| 103 | el enlace "{}" no es válido (usa #ancla, https://…, mailto: o tel:); se dejó el original. | traducir |
| 112 | No es un plan: falta "plan": 1. | traducir |
| 113 | El plan no tiene "secciones" (debe ser una lista con al menos una). | traducir |
| 116 | Sección {} | traducir |
| 117 | {}: debe ser un objeto con "bloque". | traducir |
| 119 | {}: el bloque "{}" no existe. Bloques válidos: {}. | traducir |
| 121 | {} ({}): la variante "{}" no existe. Variantes válidas: {}. | traducir |
| 122 | {} ({}): "valores" debe ser un objeto {"1": "texto", ...}. | traducir |
| 129 | {} ({}/{}): el hueco "{}" no existe (esta variante tiene {}); se ignoró. | traducir |
| 137 | {} ({}): "fondo" debe ser una dirección https://… o una ruta que empiece con /; se descartó. | traducir |
| 150 | No encontré ningún JSON en el texto pegado. Pega la respuesta de la IA completa. | traducir |
| 164 | La página no es válida: {} | traducir |
| 167 | El JSON no es un plan ("plan": 1) ni una página completa ("type": "page"). | traducir |

### src/core/seguridad.js (1)

| Línea | Texto | Qué hacer |
|---|---|---|
| 19 | Se quitaron {} valor{} peligroso{} del archivo (código o enlaces que no son seguros). El resto de la página se conservó. | traducir |

### src/core/tree.js (7)

| Línea | Texto | Qué hacer |
|---|---|---|
| 199 | Nodo inválido | traducir |
| 200 | Tipo desconocido: {} | traducir |
| 201 | La raíz debe ser de tipo page | traducir |
| 203 | Anidado inválido: "{}" ({}) no puede estar dentro de "{}" ({}) | traducir |
| 205 | "children" de "{}" debe ser una lista | traducir |
| 223 | Página | dejar (dato que se guarda en el JSON) |
| 224 | Mi landing | dejar (dato que se guarda en el JSON) |

### src/core/store.js (1)

| Línea | Texto | Qué hacer |
|---|---|---|
| 542 | Sección | revisar al extraer |

## Tanda D: Animaciones (mini-etapa 3: solo etiquetas, los ids no cambian)

### src/animations/appear.js (2)

| Línea | Texto | Qué hacer |
|---|---|---|
| 8 | Al aparecer | traducir |
| 11 | Efecto | traducir |

### src/animations/base.js (31)

| Línea | Texto | Qué hacer |
|---|---|---|
| 12 | Ninguna | traducir |
| 13 | Aparecer (fade) | traducir |
| 14 | Subir | traducir |
| 15 | Bajar | traducir |
| 16 | Desde la izquierda | traducir |
| 17 | Desde la derecha | traducir |
| 18 | Zoom | traducir |
| 19 | Desenfoque | traducir |
| 20 | Voltear | traducir |
| 21 | Rotar | traducir |
| 26 | Al entrar en pantalla | traducir |
| 27 | Al cargar la página | traducir |
| 36 | Suave | traducir |
| 37 | Rebote (fijo) | traducir |
| 38 | Spring (rigidez/amortiguación/masa) | traducir |
| 39 | Cubic-bezier (editable) | traducir |
| 40 | Rápido al inicio | traducir |
| 41 | Lineal | traducir |
| 110 | Bezier x1 (0–1) | traducir |
| 111 | Bezier y1 | traducir |
| 112 | Bezier x2 (0–1) | traducir |
| 113 | Bezier y2 | traducir |
| 114 | Rigidez | traducir |
| 115 | Amortiguación | traducir |
| 116 | Masa | traducir |
| 193 | Duración (s) | traducir |
| 194 | Retraso (s) | traducir |
| 195 | Curva | traducir |
| 197 | Distancia (px) | traducir |
| 198 | Ángulo (°) | traducir |
| 200 | Se dispara | traducir |

### src/animations/copiar.js (3)

| Línea | Texto | Qué hacer |
|---|---|---|
| 33 | las imágenes no admiten pseudo-elementos | traducir |
| 34 | sin caja (fondo) no hay nada que rellenar | traducir |
| 58 | Estados con disparo "foco" (solo botones) | traducir |

### src/animations/focus.js (10)

| Línea | Texto | Qué hacer |
|---|---|---|
| 8 | Ninguno | traducir |
| 9 | Anillo | traducir |
| 10 | Resplandor | traducir |
| 11 | Agrandar | traducir |
| 12 | Aclarar | traducir |
| 30 | Al enfocar (teclado) | traducir |
| 34 | Efecto | traducir |
| 35 | Duración (s) | traducir |
| 36 | Curva | traducir |
| 38 | Color | traducir |

### src/animations/hover.js (49)

| Línea | Texto | Qué hacer |
|---|---|---|
| 16 | Subrayado | traducir |
| 17 | Color | traducir |
| 18 | Fondo suave | traducir |
| 20 | Relleno | traducir |
| 22 | Fondo que crece | traducir |
| 24 | Fundido | traducir |
| 24 | Barrido | traducir |
| 26 | Desde la izquierda | traducir |
| 26 | Desde la derecha | traducir |
| 27 | Desde arriba | traducir |
| 27 | Desde abajo | traducir |
| 31 | Elevar | traducir |
| 32 | Agrandar | traducir |
| 33 | Encoger | traducir |
| 34 | Inclinar | traducir |
| 35 | Resplandor | traducir |
| 36 | Aclarar | traducir |
| 41 | Desde la izquierda | traducir |
| 42 | Desde la derecha | traducir |
| 43 | Desde el centro | traducir |
| 44 | Pasa de lado a lado (puede verse brusca con pasadas rápidas) | traducir |
| 46 | Ninguno | traducir |
| 53 | Ninguno | traducir |
| 53 | Subrayado (sugerido) | traducir |
| 54 | Ninguno | traducir |
| 54 | Relleno (sugerido) | traducir |
| 102 | Al pasar el mouse | traducir |
| 106 | Efecto | traducir |
| 107 | Dirección | traducir |
| 108 | Grosor (px) | traducir |
| 109 | Separación del texto (px) | traducir |
| 110 | Color de la línea | traducir |
| 110 | El del texto | traducir |
| 110 | Otro color | traducir |
| 111 | Modo | traducir |
| 112 | Dirección del barrido | traducir |
| 113 | Color del texto al pasar | traducir |
| 113 | Sin cambio | traducir |
| 113 | Cambiar | traducir |
| 114 | Color del texto | traducir |
| 116 | Texto fijo | traducir |
| 116 | No | traducir |
| 116 | Sí | traducir |
| 118 | En Firefox el texto puede verse raro al agrandarse. Activa «Texto fijo» (el texto no cambia) o usa «Fondo que crece». | traducir |
| 120 | Necesita fondo o borde: sin ellos no hay nada que mover y el efecto no se ve. Ponle un fondo o un borde, o desactiva «Texto fijo». | traducir |
| 121 | Duración (s) | traducir |
| 122 | Curva | traducir |
| 124 | Color de relleno | traducir |
| 125 | Color | traducir |

### src/animations/normalizar.js (1)

| Línea | Texto | Qué hacer |
|---|---|---|
| 70 | Estado {} | traducir |

### src/animations/parallax.js (6)

| Línea | Texto | Qué hacer |
|---|---|---|
| 59 | Parallax (scroll) | traducir |
| 63 | Dirección | traducir |
| 63 | Ninguno | traducir |
| 63 | Vertical | traducir |
| 63 | Horizontal | traducir |
| 64 | Recorrido (px, negativo = más rápido) | traducir |

### src/animations/press.js (10)

| Línea | Texto | Qué hacer |
|---|---|---|
| 7 | Ninguno | traducir |
| 8 | Encoger | traducir |
| 9 | Hundir | traducir |
| 10 | Agrandar | traducir |
| 11 | Oscurecer | traducir |
| 12 | Aclarar | traducir |
| 26 | Al presionar | traducir |
| 30 | Efecto | traducir |
| 31 | Duración (s) | traducir |
| 32 | Curva | traducir |

### src/animations/scene.js (6)

| Línea | Texto | Qué hacer |
|---|---|---|
| 45 | Escena por scroll | traducir |
| 49 | Pasos | traducir |
| 49 | Ninguna | traducir |
| 50 | Duración (pantallas de scroll) | traducir |
| 51 | Transición (% del tramo) | traducir |
| 52 | Espacio arriba (px, vacío = medir el navbar) | traducir |

### src/animations/scenestep.js (15)

| Línea | Texto | Qué hacer |
|---|---|---|
| 25 | Paso de escena | traducir |
| 29 | Qué hace | traducir |
| 29 | Ninguno | traducir |
| 29 | Aparece en el paso | traducir |
| 29 | Se va en el paso | traducir |
| 29 | Aparece y se va en el siguiente | traducir |
| 30 | Paso | traducir |
| 31 | Movimiento | traducir |
| 31 | Solo fundido | traducir |
| 31 | Subir | traducir |
| 31 | Bajar | traducir |
| 31 | Izquierda | traducir |
| 31 | Derecha | traducir |
| 31 | Zoom | traducir |
| 32 | Distancia (px) o zoom (%) | traducir |

### src/animations/scrolllink.js (11)

| Línea | Texto | Qué hacer |
|---|---|---|
| 11 | Ninguno | traducir |
| 12 | Aparecer (opacidad 0 → 1) | traducir |
| 13 | Desaparecer (opacidad 1 → 0) | traducir |
| 14 | Crecer hasta su tamaño | traducir |
| 15 | Encoger | traducir |
| 16 | Girar hasta enderezarse | traducir |
| 23 | Ligado al scroll | traducir |
| 27 | Efecto | traducir |
| 28 | Intensidad (% de tamaño / grados) | traducir |
| 29 | Empieza (% del recorrido) | traducir |
| 30 | Termina (% del recorrido) | traducir |

### src/animations/stagger.js (3)

| Línea | Texto | Qué hacer |
|---|---|---|
| 17 | Cascada de hijos | traducir |
| 21 | Efecto | traducir |
| 23 | Cascada entre hijos (s) | traducir |

### src/animations/text.js (9)

| Línea | Texto | Qué hacer |
|---|---|---|
| 28 | Animación de texto | traducir |
| 32 | Partir por | traducir |
| 32 | Ninguna | traducir |
| 32 | Palabras | traducir |
| 32 | Letras | traducir |
| 32 | Por línea (mis saltos) | traducir |
| 32 | Por línea (medida) | traducir |
| 33 | Efecto | traducir |
| 35 | Cascada (s) | traducir |

### src/animations/variants.js (23)

| Línea | Texto | Qué hacer |
|---|---|---|
| 24 | Al pasar el mouse | traducir |
| 25 | Al presionar | traducir |
| 26 | Al enfocar (solo botones) | traducir |
| 27 | Al hacer clic (alterna) | traducir |
| 28 | Al cargar la página | traducir |
| 29 | Al entrar en pantalla | traducir |
| 34 | Opacidad (0–1) | traducir |
| 35 | Mover X (px) | traducir |
| 36 | Mover Y (px) | traducir |
| 37 | Escala (1 = igual) | traducir |
| 38 | Rotación (°) | traducir |
| 39 | Desenfoque (px) | traducir |
| 40 | Brillo (1 = igual) | traducir |
| 41 | Color de texto | traducir |
| 42 | Color de fondo | traducir |
| 43 | Color de borde | traducir |
| 44 | Radio de borde (px) | traducir |
| 45 | Sombra | traducir |
| 50 | Duración (s) | traducir |
| 51 | Retraso (s) | traducir |
| 52 | Curva | traducir |
| 101 | Estado {} | traducir |
| 129 | Estados (variants) | traducir |

# FEATURES — lista oficial de animaciones

Esta es la lista oficial de lo que el editor debe poder hacer (estilo Framer). **No se recorta ni se cambia sin preguntar a m3nt41.**
`[x]` = hecho · `[ ]` = pendiente · `→ Etapa N` = dónde está planificado (ver `CLAUDE.md`).
Motion vs CSS puro: m3nt41 ya decidió la opción (a), CSS puro donde se pueda y Motion solo en lo que obliga (análisis en `docs/historial.md`, sección "Decisión tomada").

## Appear
- [x] Fade (Etapa 4)
- [x] Slide: subir, bajar, izquierda, derecha (Etapa 4)
- [x] Zoom (Etapa 4)
- [x] Blur / desenfoque (Etapa 4)
- [x] Rotación (rotar al entrar, con ángulo editable; también en texto por letra/palabra) (Etapa 6)
- [x] Al entrar en pantalla (Etapa 4)
- [x] Al cargar la página (selector "Se dispara" en Al aparecer y en Animación de texto; CSS puro, sin script) (Etapa 6)

## Scroll
- [x] Parallax (vertical u horizontal, recorrido en px; CSS nativo `animation-timeline: view()` sin script, con el motor JS mínimo solo como respaldo en navegadores sin soporte o si el nodo ya usa otra animación de entrada; un contenedor que recorta lo exporta como `overflow:clip` para no romperlo; no corre con "reducir movimiento") (Etapa 7)
- [x] Scroll-linked (opacidad, escala o giro ligados al progreso del scroll del elemento, con rango empieza/termina; mismo script mínimo) (Etapa 7)
- [x] Sticky (grupo "Posición" en cualquier elemento menos la página: pegar arriba y/o abajo con distancia y z-index; CSS puro, sin script; se pega mientras su contenedor siga a la vista) (Etapa 7)
- [x] Escenas por scroll (grupo "Escena por scroll" en una sección: 2–4 pasos, duración en pantallas de scroll; la sección se pega (sticky) y sus hijos directos, con "Paso de escena", aparecen/se van por pasos con fundido + subir/bajar/izquierda/derecha/zoom; hijos apilados con grid; usa el motor de scroll, solo viaja si se usa; bloque "Escena" con 2 variantes de 3 pasos) (Etapa 7)

## Hover / press / focus
- [x] Hover con transición: elevar, agrandar, encoger, inclinar, resplandor, aclarar (Etapa 4)
- [x] Hover para texto y botones sin caja, sin mover las letras: subrayado (dirección elegible: desde la izquierda por defecto, derecha, centro o de lado a lado; grosor 1–4 px y separación 0–8 px), color y fondo suave (CSS puro; mini-etapa 2026-11-15)
- [x] Hover "Relleno" para botones y texto con caja: modo Fundido (background-color) o Barrido (desde izquierda, derecha, arriba o abajo, recortado por el border-radius), con color de relleno y color de texto al pasar opcional (CSS puro; mini-etapa 2026-11-15)
- [x] Press (al mantener clic/tocar) con transición (Etapa 6)
- [x] Focus (`:focus-visible`) con transición, solo en botones/enlaces (Etapa 6)

## Variants
- [x] Estados con nombre por elemento (sección "Estados (variants)": lista de estados con nombre; cada uno cambia opacidad, mover X/Y, escala, rotación, desenfoque, brillo, color de texto/fondo/borde, radio y sombra; si coinciden gana el de más abajo entre los interactivos (los de cargar/entrar siempre pierden contra uno interactivo que toque lo mismo); botón "Ver" para fijarlo en el preview) (Etapa 6)
- [x] Animación entre estados y qué la dispara: pasar el mouse, presionar, enfocar (botones), clic (alterna; único caso con script, de unas líneas y solo si se usa), al cargar y al entrar en pantalla; con duración, retraso y curva (bezier/spring). Limitación: ver docs/historial.md (Etapa 6, bloque 4) (Etapa 6)

## Transiciones
- [x] Spring real con rigidez, amortiguación y masa editables (curva calculada en el editor y exportada como `linear()`; la duración sale de la física; no es interrumpible como un spring de Motion) (Etapa 6)
- [x] Tween con cubic-bezier editable (x1, y1, x2, y2; las y pueden pasarse de 0–1 para rebote) (Etapa 6)
- [ ] Inercia → Etapa 8 (va con Drag)
- [x] Delay (Etapa 4)
- [x] Stagger entre letras/palabras del mismo texto (Etapa 4)
- [x] Stagger entre hijos (grupo "Cascada de hijos" en secciones/contenedores; CSS puro con `:nth-child`; los hijos con su propia animación de entrada quedan fuera) (Etapa 6)

## Texto
- [x] Revelado por letra (Etapa 4)
- [x] Revelado por palabra (Etapa 4)
- [x] Revelado por línea: "Por línea (mis saltos)" (CSS puro, cada línea escrita con Enter) y "Por línea (medida)" (script de medición solo si se usa; re-mide al redimensionar y al cargar las fuentes) (Etapa 6)

## Layout animations
- [ ] Elementos que se mueven suave al cambiar de lugar o tamaño → Etapa 8

## Drag
- [ ] Drag con límites → Etapa 8
- [ ] Rebote (spring al soltar / al chocar con el límite) → Etapa 8

## 3D transforms
- [ ] Perspectiva → Etapa 8
- [ ] Rotación X / Y (estática y animada) → Etapa 8

## Extras
- [x] Marquee / ticker (elemento "+ Marquesina" y bloque de 6 variantes; CSS puro con bucle exacto, pausa al pasar el mouse, respeta "reducir movimiento"; la pista se ve quieta en el editor y se anima en 👁 Vista previa y en el export) (Etapa 9)
- [ ] Cursor personalizado → Etapa 9
- [x] Scroll suave (interruptor "Scroll suave" en Ajustes de la página, apagado por defecto; script propio aislado en `animations/scrollsuave.js`, solo viaja si está activado; solo rueda de mouse en escritorio con inercia; táctil, teclado, barra, anclas, trackpad y scroll interno quedan nativos; no corre con "reducir movimiento") (Etapa 7)
- [ ] Page transitions → Etapa 9

> Nota (2026-11-13): se quitó el botón "▶ Reproducir" del editor; las animaciones se siguen viendo, ahora en 👁 Vista previa (con ↻ Reiniciar para verlas de nuevo). La lista de funciones no cambió.

> Nota (2026-11-13): ajustes de imagen en el inspector: campo "Proporción" (aspect-ratio) en imágenes y "Proporción de los hijos" en contenedores grid (CSS puro `:where(.cls>img)`); la Galería nace con ella. La lista de funciones no cambió.
> Nota (2026-11-13): imagen de fondo para secciones y contenedores (grupo "Fondo e imagen": subir o pegar URL, Cubrir/Contener, posición y capa oscura 0–80 %; CSS puro en el export) y hero "Con fondo". La lista de funciones no cambió.

> Nota (2026-11-14): inspector con controles visuales de Forma (redondeo) y Tamaño de botón (padding + tamaño de fuente en un clic); escriben el mismo CSS de siempre. La lista de funciones no cambió.
> Nota (2026-11-15): rediseño del inspector: cabecera fija (icono, nombre, tipo) y campos en 3 niveles plegables (Esencial / Estilo / Avanzado) por tipo de nodo; Esencial abierto y lo que el usuario abre se recuerda. Sin funciones nuevas ni quitadas; la lista no cambió.

> Nota (2026-11-15): tiradores de espaciado en el preview: con un nodo seleccionado se arrastra su padding (secciones y contenedores) o su margen (títulos, textos, botones, imágenes e iconos) directamente en el lienzo; Shift = lado opuesto, Alt = 4 lados, Ctrl = múltiplos de 8; escribe en escritorio o móvil según la vista y es un solo paso de Undo. Es una herramienta del editor (no se exporta); la lista de funciones no cambió.

## Elementos (añadido 2026-11-14, mini-etapa iconos)
- [x] Icono: elemento propio (tipo `icon`) con SVG de línea de una biblioteca de 41 iconos (Lucide, ISC); tamaño y color editables (también en móvil); sin emoticonos en bloques ni en la interfaz; las animaciones existentes (al aparecer, hover, press, scroll, estados) funcionan sobre él

- [x] Marquesina: se añade desde Elem. ("+ Marquesina") o como bloque; ver "Marquee / ticker" en Extras (mini-etapa marquesina)

## Botones (añadido 2026-11-14)
- [x] Estilo del botón: Relleno / Contorno / Suave en un clic (escribe fondo, color y borde juntos; también en móvil)
- [x] Forma y Tamaño de botón: Forma Recto / Suave / Redondo / Pastilla y Tamaño Pequeño / Mediano / Grande (escriben el mismo CSS de siempre)

## Estilo de los bloques
- [x] Estilo base elegante para todos los bloques: tema único `src/blocks/tema.js` (editorial minimalista + moderno oscuro, un solo acento, todo recto, sin sombras ni degradados) y landing de muestra `docs/demo-estilo.json` (mini-etapa estética)

## Navbar en móvil
- [x] Menú hamburguesa opcional en el Navbar (`content.menuMovil`, activo de fábrica en las 4 variantes; interruptor "Menú hamburguesa en móvil" en el inspector): el primer hijo (logo) queda visible y el resto va a un panel desplegable; en el export es CSS puro (checkbox + label, sin nodos nuevos) con un script mínimo solo si se usa (Esc, cerrar al pulsar un enlace, Enter, aria-expanded); en el editor móvil el panel empieza cerrado (se abre con la hamburguesa o al seleccionar un hijo del panel) y se superpone al contenido, igual que en el export (mini-etapa menú móvil)

## Landing con IA (camino 1, sin servidor)
- [x] "Copiar guía para IA" y "Pegar plan o JSON" en Ajustes de la página: la guía se genera sola del código (bloques, variantes y huecos numerados; también en `docs/guia-ia.md`); el formato compacto "plan" (`{"plan":1,"titulo":…,"secciones":[{"bloque","variante","valores"}]}`) o el JSON completo de una página se carga con Reemplazar o Añadir al final, en un solo paso de Undo, con errores/avisos en lenguaje claro y tolerando ``` y texto alrededor (mini-etapa IA camino 1). Los caminos 2 (clave de API propia) y 3 (servidor público) quedan como ideas en `PROGRESS.md`
- [x] Mejora de la guía y del importador del plan: ejemplos completos y coherentes (cafetería y estudio de masajes) probados con el importador, reglas nuevas (todos los huecos, enlaces navbar/footer, cantidades fijas, WhatsApp), etiqueta de tono claro/oscuro/acento por variante, `"fondo"` opcional por sección (solo http(s) o ruta), avisos de enlaces #ancla rotos al importar y guía ~31 % más corta (mini-etapa IA camino 1)

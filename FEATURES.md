# FEATURES — lista oficial de animaciones

Esta es la lista oficial de lo que el editor debe poder hacer (estilo Framer). **No se recorta ni se cambia sin preguntar a m3nt41.**
`[x]` = hecho · `[ ]` = pendiente · `→ Etapa N` = dónde está planificado (ver `CLAUDE.md`).
Motion vs CSS puro: m3nt41 ya decidió la opción (a), CSS puro donde se pueda y Motion solo en lo que obliga (análisis en `PROGRESS.md`, sección "Decisión tomada").

## Appear
- [x] Fade (Etapa 4)
- [x] Slide: subir, bajar, izquierda, derecha (Etapa 4)
- [x] Zoom (Etapa 4)
- [x] Blur / desenfoque (Etapa 4)
- [x] Rotación (rotar al entrar, con ángulo editable; también en texto por letra/palabra) (Etapa 6)
- [x] Al entrar en pantalla (Etapa 4)
- [x] Al cargar la página (selector "Se dispara" en Al aparecer y en Animación de texto; CSS puro, sin script) (Etapa 6)

## Scroll
- [x] Parallax (vertical u horizontal, recorrido en px; CSS `translate` + script mínimo, solo si se usa; no corre con "reducir movimiento") (Etapa 7)
- [x] Scroll-linked (opacidad, escala o giro ligados al progreso del scroll del elemento, con rango empieza/termina; mismo script mínimo) (Etapa 7)
- [x] Sticky (grupo "Posición" en cualquier elemento menos la página: pegar arriba y/o abajo con distancia y z-index; CSS puro, sin script; se pega mientras su contenedor siga a la vista) (Etapa 7)
- [ ] Escenas por scroll (secciones fijadas con varios pasos animados) → Etapa 7

## Hover / press / focus
- [x] Hover con transición: elevar, agrandar, encoger, inclinar, resplandor, aclarar (Etapa 4)
- [x] Press (al mantener clic/tocar) con transición (Etapa 6)
- [x] Focus (`:focus-visible`) con transición, solo en botones/enlaces (Etapa 6)

## Variants
- [x] Estados con nombre por elemento (sección "Estados (variants)": lista de estados con nombre; cada uno cambia opacidad, mover X/Y, escala, rotación, desenfoque, brillo, color de texto/fondo/borde, radio y sombra; si coinciden gana el de más abajo entre los interactivos (los de cargar/entrar siempre pierden contra uno interactivo que toque lo mismo); botón "Ver" para fijarlo en el preview) (Etapa 6)
- [x] Animación entre estados y qué la dispara: pasar el mouse, presionar, enfocar (botones), clic (alterna; único caso con script, de unas líneas y solo si se usa), al cargar y al entrar en pantalla; con duración, retraso y curva (bezier/spring). Limitación: ver PROGRESS.md (Etapa 6, bloque 4) (Etapa 6)

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
- [ ] Marquee / ticker → Etapa 9
- [ ] Cursor personalizado → Etapa 9
- [ ] Scroll suave → Etapa 7
- [ ] Page transitions → Etapa 9

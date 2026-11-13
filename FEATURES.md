# FEATURES — lista oficial de animaciones

Esta es la lista oficial de lo que el editor debe poder hacer (estilo Framer). **No se recorta ni se cambia sin preguntar a m3nt41.**
`[x]` = hecho · `[ ]` = pendiente · `→ Etapa N` = dónde está planificado (ver `CLAUDE.md`).
"Tecnología" es solo una propuesta: **la decisión de usar Motion o CSS puro es de m3nt41** (ver sección final).

## Appear
- [x] Fade (Etapa 4)
- [x] Slide: subir, bajar, izquierda, derecha (Etapa 4)
- [x] Zoom (Etapa 4)
- [x] Blur / desenfoque (Etapa 4)
- [ ] Rotación (rotar al entrar, con ángulo editable). Hoy solo existe "Voltear" (rotateX fijo de 70°), que no cuenta como la rotación completa → Etapa 6
- [x] Al entrar en pantalla (Etapa 4)
- [ ] Al cargar la página (opción explícita; hoy solo se dispara al entrar en pantalla) → Etapa 6

## Scroll
- [ ] Parallax → Etapa 7
- [ ] Scroll-linked (propiedad ligada al progreso del scroll) → Etapa 7
- [ ] Sticky → Etapa 7
- [ ] Escenas por scroll (secciones fijadas con varios pasos animados) → Etapa 7

## Hover / press / focus
- [x] Hover con transición: elevar, agrandar, encoger, inclinar, resplandor, aclarar (Etapa 4)
- [ ] Press (al mantener clic/tocar) con transición → Etapa 6
- [ ] Focus (`:focus-visible`) con transición → Etapa 6

## Variants
- [ ] Estados con nombre por elemento (p. ej. `reposo`, `activo`, `abierto`) con sus propios estilos → Etapa 6
- [ ] Animación entre estados (y qué dispara el cambio: hover, clic, scroll, carga) → Etapa 6

## Transiciones
- [ ] Spring real con rigidez, amortiguación y masa editables (hoy solo hay una curva "rebote" fija) → Etapa 6
- [ ] Tween con cubic-bezier editable (hoy solo hay 4 curvas predefinidas) → Etapa 6
- [ ] Inercia → Etapa 8 (va con Drag)
- [x] Delay (Etapa 4)
- [x] Stagger entre letras/palabras del mismo texto (Etapa 4)
- [ ] Stagger entre hijos (los elementos de un contenedor entran en cascada) → Etapa 6

## Texto
- [x] Revelado por letra (Etapa 4)
- [x] Revelado por palabra (Etapa 4)
- [ ] Revelado por línea → Etapa 6

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

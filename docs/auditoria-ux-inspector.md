# Auditoría de UX del inspector y propuestas (2026-11-16)

Solo lectura sobre `src/`. Base: `src/ui/inspector.js`, `src/ui/fields.js`, `src/animations/index.js`, `docs/auditoria-inspector.md` (2026-11-15) y `docs/capturas-inspector/`. Los mockups están en `docs/propuestas-inspector/` (abrir `a-por-tarea.html`, `b-por-control.html`, `c-por-estado.html`; llevan enlaces entre sí).

## 0. Aclaración clave: no son pestañas, son acordeones

Los "3 niveles" (Esencial / Estilo / Avanzado) son `<details>` independientes (`inspector.js:391`), no pestañas. Se pueden abrir varios a la vez, y el estado abierto/cerrado se guarda en `localStorage` (`editor-landings:niveles`). Es probable que parte de la confusión venga de ahí: el aspecto invita a tratarlos como pestañas, pero se comportan distinto, y el panel arranca distinto según lo que se dejó abierto en una sesión anterior. Además, los niveles se llaman por **importancia** (Esencial/Avanzado), no por **tarea** (qué quiero cambiar).

## 1. Inventario

| Nivel | Qué contiene | Cambia según el tipo |
|---|---|---|
| **Esencial** (abierto de fábrica) | Contenido (texto, enlace, imagen, icono) + los campos más usados de cada grupo de estilo | Lo que ya dice `docs/auditoria-inspector.md` (tabla por tipo) |
| **Estilo** (plegado) | Resto de Tipografía (fuente, grosor, alineación, interlínea), Forma, Borde, Opacidad, medidas (ancho, alto, ancho máx., centrar, alto mín.), imagen de fondo, ajuste de imagen | Section/container: imagen de fondo y medidas; image: proporción y ajuste; button: tipografía fina |
| **Avanzado** (plegado) | Ancla, menú móvil, Posición (sticky), Layout de hijos, Copiar/pegar efectos, **todas las animaciones**, Estados, JSON del nodo | Section/container: Layout, Cascada, Escena; button: además Foco; el resto, solo las animaciones que le tocan |

Por tipo (resumen; detalle en la auditoría previa): **section/container** Fondo + Padding en Esencial, medidas e imagen de fondo en Estilo, Layout + animaciones en Avanzado. **heading/text** Texto, Tamaño, Color, Fondo, Padding en Esencial. **button** Texto, Enlace, Estilo (Relleno/Contorno/Suave), Forma, Tamaño, Color, Fondo en Esencial. **image** URL, Archivo, Alt, Fondo, Padding. **icon** cuadrícula, Tamaño, Color. **page** (no usa niveles): vista plana.

**Qué cambió desde la auditoría (2026-11-15):**
- El nodo `page` volvió a una vista plana sin acordeones (commits `565c26c`, `b3043cf`); la auditoría aún lo lista como "Esencial/Estilo/Avanzado".
- Nuevo bloque "Copiar y pegar efectos" al inicio de las animaciones en Avanzado (`a614764`), más atajos Ctrl+Alt+C/V.
- Aviso de parallax con ancestro con scroll (`73782dc`), hover nuevos (Subrayado, Color, Fondo suave, Relleno): más opciones dentro del mismo Avanzado.
- Tiradores de espaciado en el preview (arrastrar padding/margen): una vía alternativa para espaciado, fuera del panel.
- `fields.js` no cambió desde el rediseño; `inspector.js` sí (página plana, efectos, aviso parallax). Las capturas de `docs/capturas-inspector/` de `page-*` son de la vista plana; el resto (`button-*`, etc.) siguen vigentes. No re-ejecuté las capturas.

## 2. Tareas reales: clics y dónde están

Condiciones: botón seleccionado, panel con los valores de fábrica (solo Esencial abierto), preview seleccionado por clic. Un "clic" cuenta abrir un acordeón, o enfocar/pulsar el control. No cuento scroll ni teclear. Medido leyendo el código, **no cronometrado con una persona**.

| Tarea | Dónde está hoy | Clics hoy |
|---|---|---|
| Cambiar el texto | Esencial › Contenido › Texto | 1 |
| Color de texto | Esencial › Tipografía › Color | 1 |
| Fondo | Esencial › Fondo y borde › Fondo (en botón: también "Estilo" Relleno/Contorno/Suave, que lo cambia a la vez) | 1 |
| Tamaño | Botón: Esencial › Botón › Tamaño (S/M/L). Heading/text: Esencial › Tipografía › Tamaño | 1 |
| Fuente | Estilo › Tipografía › Fuente | 2 (abrir Estilo + select) |
| Espaciado (padding) | Heading/text/section/container/image: Esencial › Padding. **Botón**: sus S/M/L; el padding exacto está en "Valor CSS exacto" plegado | 1 (otros) · 3 (botón, exacto) |
| Margen | Estilo › Tamaño y espaciado › "Centrar" (botones) y, para escribir el margen, "Valor CSS exacto" plegado | 3 (o arrastre de tirador en el preview) |
| Alinear texto | Estilo › Tipografía › Alineación | 2 |
| Alinear hijos (contenedor) | Avanzado › Layout (hijos) › Alinear; solo aparece si Tipo = Flex/Grid | 3–4 |
| Esquinas redondeadas | Botón: Esencial › Botón › Forma. Resto: Estilo › Fondo y borde › Forma | 1 (botón) · 2 (resto) |
| Sombra (reposo) | **No existe**. Solo como estado/hover (Elevar, Resplandor) o en un Estado "Sombra" | no se puede en reposo |
| Efecto hover | Avanzado › Al pasar el mouse › Efecto | 2 (más scroll: está bajo Copiar/pegar y "Al aparecer") |
| Animación de entrada | Avanzado › Al aparecer › Efecto (primer grupo de animaciones) | 2 |
| Ocultar en móvil | **No existe** (ningún campo escribe `display:none` ni visibilidad). Se pueden dar valores propios de móvil con el interruptor Escritorio/Móvil de la barra, pero no ocultar | no se puede |
| Enlace del botón | Esencial › Contenido › Enlace | 1 |

## 3. Problemas detectados

Fuente de usabilidad: **Jakob Nielsen, "10 Usability Heuristics for User Interface Design", NN/G** (https://www.nngroup.com/articles/ten-usability-heuristics/; publicado 24-abr-1994, última revisión 30-ene-2024; la página dice que las heurísticas no cambian desde 1994). Las uso con los nombres originales; las descripciones de cada hallazgo son mías.

1. **Mismo grupo repartido en dos o tres niveles** (heurísticas 6 *Recognition rather than recall* y 4 *Consistency and standards*). "Tipografía" tiene Tamaño y Color en Esencial y Fuente, Grosor, Alineación en Estilo; "Tamaño y espaciado" tiene Padding en Esencial, Ancho/Alto en Estilo y "Posición" en Avanzado (`fields.js`). Hay que recordar en qué nivel vive cada propiedad.
2. **Nombres que se repiten o chocan** (4). "Estilo" es el nombre del nivel, el nombre del campo Relleno/Contorno/Suave y el nombre de la pestaña "Estilo". "Tamaño" es tamaño de letra, tamaño S/M/L del botón y tamaño de icono. "Alinear" (flex, hijos) vs "Alineación" (texto). "Posición" es un grupo y un campo dentro de él. "Fondo" aparece en "Fondo y borde" y "Fondo e imagen".
3. **Jerga CSS** (2 *Match between system and the real world*): Padding, "Valor CSS exacto", "Capa (z-index)", "Radio", "Pegado (sticky)", "Layout (hijos)", "Flex/Grid". Parte del panel ya usa palabras claras (Esquinas como Recto/Suave/Redondo/Pastilla), y eso funciona; el resto no.
4. **Todo lo de movimiento está escondido en Avanzado** (6, 8 *Aesthetic and minimalist design*). Es el motivo del editor ("landings muy animadas"), pero hover y entrada están tras dos clics, entre ~12 grupos largos y el JSON del nodo. "Avanzado" mezcla funciones frecuentes (hover, entrada) con raras (ancla, JSON, escena).
5. **Dos sistemas que se pisan para lo mismo**: el grupo "Al pasar el mouse" y los "Estados" con disparo "Al pasar el mouse" (`DISPAROS_VARIANT`) hacen cosas parecidas en dos sitios, ambos en Avanzado (4).
6. **Faltan tareas habituales**: sombra en reposo y ocultar en móvil no existen (ver tabla). Margen solo por "Centrar" o valor exacto.
7. **Controles repetidos** (4): Fondo/Color aparecen para un botón en el control "Estilo" y de nuevo como campos sueltos; el botón tiene "Tamaño" S/M/L y además "Padding" y "Tamaño de fuente" dentro de "Valor CSS exacto". Aviso: esto es deliberado (el control visual escribe varias propiedades) pero genera dos vías para lo mismo.
8. **Opciones raras para el tipo** (8): un icono muestra Borde y Opacidad; un texto suelto ofrece Parallax, Ligado y Escena; Heading muestra su "Nivel" (H1–H4) en Contenido, correcto, pero separado de Tamaño. No es un error grave, es ruido.
9. **Acordeones que parecen pestañas y recuerdan estado** (4/1 visibilidad): lo abierto depende de la sesión previa; no hay indicador de qué hay dentro de un nivel plegado.
10. **Panel de 300 px fijos** (`app.css:8`, `grid-template-columns: 210px 1fr 300px`) con columna de etiqueta de 84 px (`app.css:120`): las etiquetas largas ("Separación del texto (px)", "Color del texto al pasar") se parten en varias líneas. Las filas de 2 columnas ya existen para mitigar. No hay forma de ensanchar el panel.
11. **Ayuda en línea larga** (10 *Help and documentation*): párrafos `.modo` de 3–6 líneas en Escena, Menú móvil y Marquesina dentro del propio panel.
12. **Sin variables de espaciado ni tipografía**: tamaño, padding y márgenes son texto libre (`24px 32px`); `FUENTES` ofrece 5 valores; el tema visual (`blocks/tema.js` tiene H1…CUERPO, colores) no se expone en el inspector. Resultado: cada landing puede salirse de la escala sin aviso (hallazgo, no heurística: lo marco como mejora propuesta, no como regla de Nielsen).
13. **Lo que sí funciona** (no tocar): "leer nunca escribe", el ● de valor propio en móvil y "↺ igual que escritorio" (1 *Visibility of system status*), Copiar/pegar efectos y atajos (7 *Flexibility and efficiency of use*), Forma con dibujitos (6).

## 4. Tres propuestas

Todas mantienen cabecera fija, "leer nunca escribe" y el ● de móvil. Conteo de clics con la misma regla de la sección 2, **estimado en mockup**, no medido.

### A · Pestañas por tarea: Contenido / Estilo / Movimiento (`a-por-tarea.html`)
- **Contenido:** texto, enlace, imagen, "Visible en" (nuevo), ancla. **Estilo:** Aspecto (estilo, fondo, esquinas, sombra), Texto, Espacio, todo junto. **Movimiento:** entrada, hover, presionar, foco, scroll, estados, copiar efectos.
- **Ventajas:** responde a "¿qué quiero hacer?"; Tamaño+Fuente+Color juntos; el movimiento sale de Avanzado; pestañas de verdad (una visible); cabe en 300 px con tres botones.
- **Desventajas:** la pestaña Estilo es larga; Layout de hijos (Flex/Grid) no tiene casa clara (propongo "Estilo › Disposición" solo en contenedores).
- **Clics (desde Contenido; −1 si ya estás en la pestaña):** texto 1 · color 2 · fondo 2 · tamaño y fuente 2 · espaciado 2 · alinear 2 · esquinas 2 · sombra 2 (requiere campo nuevo) · hover 2 · entrada 2 · ocultar móvil 1 (campo nuevo) · enlace 1.

### B · Por tipo de control: Colores / Medidas / Opciones / Efectos (`b-por-control.html`)
- Texto y enlace fijos arriba. Colores: fondo, texto, borde, sombra. Medidas: tamaño, relleno, ancho, margen, radio. Opciones: selectores y botones (estilo, fuente, grosor, alineación, visible en móvil). Efectos.
- **Ventajas:** muy predecible para quien ya piensa "voy a un color"; filas homogéneas; fácil de construir (cada campo ya tiene un `kind`).
- **Desventajas:** parte tareas que van juntas (tamaño en Medidas y fuente en Opciones; hover color lejos de color normal); cuatro pestañas en 300 px; no responde a "qué quiero hacer" sino a "cómo lo manejo", que no es como piensa la mayoría; Forma (botones visuales) vs Radio (número) se duplican.
- **Clics (desde Colores):** texto 1 · color 1 · fondo 1 · tamaño y fuente 3 · espaciado 2 · alinear 3 · esquinas 2 · sombra 1 · hover 4 · entrada 4 · ocultar móvil 3 · enlace 1.

### C · Contenido fijo + estados + buscador (`c-por-estado.html`)
- Arriba, siempre: texto, enlace, "Visible en móvil". Un buscador. Un selector de estado (Reposo / Hover / Presionar / Entrada): en Reposo, secciones siempre abiertas (Texto, Caja, Espacio); en cada estado, su efecto prediseñado y "además cambia" (fondo, color, escala, sombra).
- **Ventajas:** casi todo a 1 clic; el hover queda junto al aspecto normal (mismo modelo mental que las variantes de Figma); el buscador cubre lo que no se encuentra.
- **Desventajas:** es el rediseño más grande: fusiona "Efectos" con "Estados" (hoy son sistemas distintos) y requiere tocar el modelo y el export; panel de Reposo largo (mucho scroll, sin acordeones); el buscador es JS nuevo (el repo prefiere CSS puro).
- **Clics:** texto 1 · color 1 · fondo 1 · tamaño y fuente 1 · espaciado 1 · alinear 1 · esquinas 1 · sombra 1 · hover 2 · entrada 2 · ocultar móvil 1 · enlace 1.

## 5. Recomendación

**A (por tarea), con dos préstamos de C:** el interruptor "Visible en móvil" arriba y el texto/enlace siempre visibles. Razones:
1. Ataca la queja real: el problema hoy no es el número de clics (ya son 1–2 en lo más usado), es **dónde está cada cosa** (hallazgos 1, 2, 4, 9). A nombra los niveles por lo que haces y deja una sola casa por propiedad.
2. Es una reorganización barata: el reparto actual sale de `nivel` en `fields.js` y del bloque de animaciones en `inspector.js`; no cambia el árbol JSON, ni el export, ni las animaciones.
3. C es mejor en clics pero obliga a unificar Efectos y Estados y cambiar el export: es una etapa propia, no un arreglo de inspector. Si A funciona, C queda abierto como evolución.
4. B no reduce la confusión: sustituye "no sé en qué nivel está" por "no sé en qué tipo de control está".

Antes de implementar A: decidir si se añaden **sombra en reposo** y **ocultar en móvil** (hoy no existen; la tarea "no se puede" no es un problema de organización) y confirmar el nombre de las pestañas con m3nt41.

## 6. Qué NO pude verificar
- **No hay prueba con personas**: los clics son contados leyendo código y mockups; la confusión de m3nt41 con las pestañas es lo que me dijo, no la medí.
- No abrí el editor en navegador ni regeneré las capturas; me apoyo en las capturas del 15-nov, que solo mostré para `button-plegado` (vigente) y en la lectura del código para el resto.
- No medí el ancho real de los controles dentro de los 300 px (solo la columna de etiquetas, 84 px, en el CSS).
- Nielsen: confirmé el artículo, su autor y sus fechas, pero no hay una regla concreta de Nielsen sobre acordeones vs pestañas; la asociación hallazgo → heurística es interpretación mía.
- Los mockups son HTML estático; no los probé en Firefox ni en Chrome ni en ancho móvil, y no prueban el comportamiento (solo el contenido y la disposición).
- Frecuencia de uso de cada tarea: no tengo datos de uso, el orden de prioridades es una suposición.

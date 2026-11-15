# Auditoría del inspector (2026-11-15)

Qué campos muestra el panel derecho por tipo de nodo y en qué nivel quedan tras el rediseño. Los tipos salen de `tipos` en `src/ui/fields.js`; el nivel, de `nivel` (grupo o campo). Nada se eliminó: solo se reparte en tres niveles plegables.

| Tipo | Esencial (abierto) | Estilo (plegado) | Avanzado (plegado) |
|---|---|---|---|
| page | Título, Landing con IA, Tamaño y Color de texto, Fondo | Fuente, Grosor, Alineación, Interlínea, Espaciado, Forma, Borde, Opacidad | Scroll suave, Layout (tipo, dirección…) |
| section | Fondo, Padding | Forma, Borde, Opacidad, Imagen de fondo (ajuste, posición, capa), Ancho/Alto, Ancho máx., Centrar, Alto mín. | Ancla, Menú móvil (navbar), Posición (sticky), Layout, Animaciones, Estados |
| container | igual que section | igual que section | igual que section (+ Marquesina en Esencial si lo es) |
| heading | Texto, Nivel, Tamaño, Color, Fondo, Padding | Tipografía fina, Forma, Borde, Opacidad, medidas | Posición, Animaciones, Estados |
| text | Texto, Tamaño, Color, Fondo, Padding | igual que heading | igual que heading |
| button | Texto, Enlace, Estilo, Forma, Tamaño, Color, Fondo | Tipografía fina, Borde, Opacidad, medidas | Posición, Animaciones, Estados |
| image | URL, Archivo, Texto alterno, Fondo, Padding | Forma, Borde, Opacidad, medidas, Proporción, Ajuste | Posición, Animaciones, Estados |
| icon | Icono (cuadrícula), Tamaño, Color, Fondo | Forma, Borde, Opacidad | Animaciones, Estados |

Notas
- Una sección no muestra opciones de botón (el grupo "Botón" solo aplica a `button`).
- Campos con control visual (Forma, Ancho máx., Centrar, Proporción, Columnas…) llevan su "Valor CSS exacto" plegado al final del grupo, en el mismo nivel.
- Las parejas Tamaño/Color, Grosor/Alineación, Interlínea/Espaciado, Ancho/Alto y Pegar arriba/abajo/Capa van en filas de columnas.
- Los niveles abiertos se recuerdan en `localStorage` (`editor-landings:niveles`).

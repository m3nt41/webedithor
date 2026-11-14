// GUÍA PARA IA, generada del código (nunca se escribe a mano: así no queda desactualizada).
// Recorre BLOCKS, crea cada variante y lista sus "huecos" numerados. La usa el botón "Copiar guía para IA"
// y tools/gen-guia-ia.mjs (docs/guia-ia.md). Lógica pura, sin DOM.

import { BLOCKS, createBlock } from '../blocks/index.js';
import { huecosDe } from './plan.js';

const TIPO = { heading: 'título', text: 'texto', button: 'botón', image: 'imagen' };

/** Longitud máxima sugerida: algo más que el ejemplo, con mínimos razonables por tipo. */
function limite(nodo) {
  const len = String(nodo.content.text ?? '').length;
  if (nodo.type === 'button') return Math.max(24, Math.min(30, len + 10));
  if (nodo.type === 'heading') return Math.max(nodo.content.level === 1 ? 70 : 45, Math.ceil(len * 1.4 / 5) * 5);
  return Math.max(30, Math.ceil(len * 1.5 / 10) * 10);
}

/** Una línea por hueco de una variante. */
function lineasHuecos(nodo) {
  return huecosDe(nodo).map((h, i) => {
    const num = i + 1;
    if (h.type === 'image') return `    ${num} · ${h.name} (imagen) · opcional: {"src":"https://…","alt":"descripción"} · alt de ejemplo: «${h.content.alt ?? ''}»`;
    const nivel = h.type === 'heading' ? ` H${h.content.level}` : '';
    const extra = h.type === 'button' ? ` · enlace por defecto ${h.content.href}; también {"texto":"…","enlace":"#contacto"}` : '';
    return `    ${num} · ${h.name} (${TIPO[h.type]}${nivel}) · máx. ~${limite(h)} caracteres · ejemplo: «${String(h.content.text ?? '').replace(/\s+/g, ' ')}»${extra}`;
  });
}

/** Lista de bloques y variantes con sus huecos (también la usan los tests). */
export function catalogoHuecos() {
  return BLOCKS.map((b) => ({
    bloque: b.id, etiqueta: b.label, ancla: b.ancla ?? null,
    variantes: Object.entries(b.variants).map(([clave, v]) => {
      const nodo = createBlock(b.id, clave);
      return { clave, etiqueta: v.label, huecos: huecosDe(nodo).map((h, i) => ({ num: i + 1, nombre: h.name, tipo: h.type, defecto: h.content.text ?? h.content.alt ?? '' })), lineas: lineasHuecos(nodo) };
    }),
  }));
}

export function guiaIA() {
  const primera = (id) => Object.keys(BLOCKS.find((b) => b.id === id).variants)[0];
  const ejemplo1 = { plan: 1, titulo: 'Café Almendro', secciones: [
    { bloque: 'navbar', variante: primera('navbar'), valores: { 1: 'Café Almendro' } },
    { bloque: 'hero', variante: 'claro', valores: { 1: 'Nuevo', 2: 'Café de especialidad en el centro', 3: 'Tostamos cada semana y servimos todo el día.', 4: { texto: 'Reservar mesa', enlace: '#contacto' } } },
    { bloque: 'contact', variante: primera('contact'), valores: {} },
    { bloque: 'footer', variante: primera('footer'), valores: {} },
  ] };
  const ejemplo2 = { plan: 1, titulo: 'Estudio Magnolia', secciones: [
    { bloque: 'hero', variante: 'dividido', valores: { 1: 'Bienestar sin prisa', 2: 'Masajes y terapias en un espacio tranquilo.', 3: 'Agendar cita' } },
    { bloque: 'services', variante: primera('services'), valores: {} },
  ] };

  const out = [];
  out.push('# Guía para armar una landing en el editor visual');
  out.push('');
  out.push('Eres un asistente que diseña el CONTENIDO de una landing page. El editor (que corre en el navegador del usuario) ya tiene el diseño, los colores, las fuentes y las animaciones: tú solo eliges qué bloques van, en qué orden, con qué variante y qué textos llevan. No escribas HTML ni CSS.');
  out.push('');
  out.push('## Formato de respuesta: el "plan"');
  out.push('');
  out.push('Responde SOLO con un objeto JSON, sin texto antes ni después y SIN bloques de código markdown (nada de ```). Forma:');
  out.push('');
  out.push('{ "plan": 1, "titulo": "Nombre de la landing", "secciones": [ { "bloque": "hero", "variante": "claro", "valores": { "1": "Texto", "2": "Texto" } } ] }');
  out.push('');
  out.push('- "plan": siempre 1. "titulo": el nombre del sitio.');
  out.push('- "secciones": lista en el orden de la página (de arriba abajo).');
  out.push('- "bloque" y "variante": claves exactas de la lista de abajo. Si omites "variante" se usa la primera.');
  out.push('- "valores": mapa del número de hueco → texto. Los huecos son los textos editables de la variante, numerados desde 1 (la lista de abajo dice cuál es cada uno). Los huecos que no menciones conservan su texto de ejemplo.');
  out.push('- En un botón puedes poner un texto, o un objeto {"texto":"Reservar","enlace":"#contacto"}. En una imagen: {"src":"https://…","alt":"descripción"} (solo si tienes una dirección real; si no, no la menciones y queda una imagen de relleno).');
  out.push('- Un hueco que no existe se ignora con un aviso; un bloque o variante que no existe da error y no se aplica nada.');
  out.push('');
  out.push('## Reglas de estilo');
  out.push('');
  out.push('- Todo el texto en español, conciso y concreto. Respeta los límites de caracteres sugeridos (los textos largos rompen el diseño).');
  out.push('- Un solo título principal (H1) en toda la página: el del hero. No pongas otro hero.');
  out.push('- Tono sobrio y editorial, acorde al diseño (minimalista, serio, sin signos de exclamación ni emoticonos). Nada de mayúsculas sostenidas ni frases de venta exageradas.');
  out.push('- Orden típico de una landing: navbar, hero, servicios, galería, testimonios, precios, contacto, footer. Usa solo lo que tenga sentido para el negocio (no hace falta usar todos).');
  out.push('- Usa las anclas que ya existen en los enlaces de los botones: #inicio (hero), #servicios, #precios y #contacto. No inventes otras.');
  out.push('- Alterna variantes claras y oscuras entre secciones seguidas para dar ritmo.');
  out.push('- No inventes datos reales (teléfonos, precios exactos, direcciones, nombres de clientes) si el usuario no los dio: usa textos genéricos o pídele el dato.');
  out.push('');
  out.push('## Bloques, variantes y huecos');
  out.push('');
  for (const b of catalogoHuecos()) {
    out.push(`### ${b.bloque} — ${b.etiqueta}${b.ancla ? ` (ancla #${b.ancla})` : ''}`);
    for (const v of b.variantes) {
      out.push(`- variante "${v.clave}" (${v.etiqueta})${v.lineas.length ? '' : ' · sin textos editables'}`);
      out.push(...v.lineas);
    }
    out.push('');
  }
  out.push('## Ejemplos completos');
  out.push('');
  out.push(JSON.stringify(ejemplo1));
  out.push('');
  out.push(JSON.stringify(ejemplo2));
  out.push('');
  out.push('Recuerda: tu respuesta debe ser únicamente el JSON del plan.');
  return out.join('\n') + '\n';
}

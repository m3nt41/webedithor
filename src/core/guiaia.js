// GUÍA PARA IA, generada del código (nunca se escribe a mano: así no queda desactualizada).
// Recorre BLOCKS, crea cada variante y lista sus "huecos" numerados, con su etiqueta de tono (claro/oscuro/acento)
// y si admite foto de fondo. La usa el botón "Copiar guía para IA" y tools/gen-guia-ia.mjs (docs/guia-ia.md).
// Lógica pura, sin DOM. Los ejemplos viven en guiaia-ejemplos.js.

import { BLOCKS, createBlock } from '../blocks/index.js';
import { MODOS } from '../blocks/tema.js';
import { huecosDe } from './plan.js';
import { ejemplosPlan } from './guiaia-ejemplos.js';

/** Longitud máxima sugerida: algo más que el ejemplo, con mínimos razonables por tipo. */
export function limite(nodo) {
  const len = String(nodo.content.text ?? '').length;
  if (nodo.type === 'button') return Math.max(24, Math.min(30, len + 10));
  if (nodo.type === 'heading') return Math.max(nodo.content.level === 1 ? 70 : 45, Math.ceil(len * 1.4 / 5) * 5);
  return Math.max(30, Math.ceil(len * 1.5 / 10) * 10);
}

/** Tono de fondo de una variante, calculado de su nodo raíz: claro | oscuro | acento (fondo que no es de un modo claro/oscuro del tema). */
export function tonoDe(nodo) {
  const bg = nodo.styles?.base?.background;
  const modo = Object.entries(MODOS).find(([, m]) => m.bg === bg);
  if (!modo) return 'acento';
  return modo[0].startsWith('claro') ? 'claro' : 'oscuro';
}

/** Destino por defecto de un botón, muy abreviado: #ancla o el dominio (p. ej. wa.me). El más común, #contacto, se omite (lo dice la notación). */
function destino(href) {
  const h = String(href ?? '');
  if (h.startsWith('#')) return h;
  try { return new URL(h).host; } catch { return h.slice(0, 12); }
}

/** Una línea por hueco de una variante (formato corto; la notación se explica una sola vez en las reglas). */
function lineasHuecos(nodo) {
  return huecosDe(nodo).map((h, i) => {
    const num = i + 1;
    if (h.type === 'image') return `  ${num} ${h.name} (imagen)`;
    const ej = String(h.content.text ?? '').replace(/\s+/g, ' ');
    if (h.type === 'button') return `  ${num} ${h.name} (botón ≤${limite(h)}) «${ej}»${h.content.href === '#contacto' ? '' : ` →${destino(h.content.href)}`}`;
    const tipo = h.type === 'heading' ? `H${h.content.level} ` : '';
    return `  ${num} ${h.name} (${tipo}≤${limite(h)}) «${ej}»`;
  });
}

/** Lista de bloques y variantes con sus huecos (también la usan los tests). */
export function catalogoHuecos() {
  return BLOCKS.filter((b) => !b.excluidoIA).map((b) => ({
    bloque: b.id, etiqueta: b.label, ancla: b.ancla ?? null,
    variantes: Object.entries(b.variants).map(([clave, v]) => {
      const nodo = createBlock(b.id, clave);
      return {
        clave, etiqueta: v.label, tono: tonoDe(nodo), fondo: !!nodo.styles?.base?.fondoImagen,
        huecos: huecosDe(nodo).map((h, i) => ({ num: i + 1, nombre: h.name, tipo: h.type, defecto: h.content.text ?? h.content.alt ?? '' })),
        lineas: lineasHuecos(nodo),
      };
    }),
  }));
}

export function guiaIA() {
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
  out.push('- "plan": siempre 1. "titulo": el nombre del sitio. "secciones": lista en el orden de la página (de arriba abajo).');
  out.push('- "bloque" y "variante": claves exactas de la lista de abajo (sin "variante" se usa la primera).');
  out.push('- "valores": número de hueco → valor. Los huecos son los textos editables de la variante, numerados desde 1 como en la lista.');
  out.push('- Notación de la lista: «…» = texto de ejemplo; ≤N = máximo de caracteres; (≤N) = texto, (H1/H2/H3 ≤N) = título, (botón ≤N), (imagen); →destino = enlace por defecto de un botón (sin flecha: #contacto).');
  out.push('- Un botón se rellena con un texto o con {"texto":"Reservar","enlace":"#contacto"} (enlaces: #ancla, https://…, mailto: o tel:).');
  out.push('- Una imagen (opcional) es {"src":"https://…","alt":"descripción"}. Sin una dirección real, no la menciones: queda una imagen de relleno.');
  out.push('- "fondo" (opcional, en la sección): "https://…" o "/ruta" = foto de fondo. Solo las variantes marcadas «admite fondo» lo usan; en las demás no lo pongas.');
  out.push('- Un hueco que no existe se ignora con un aviso; un bloque o variante que no existe da error y no se aplica nada.');
  out.push('');
  out.push('## Reglas');
  out.push('');
  out.push('- Rellena TODOS los huecos de texto de cada sección que uses. Los huecos que no menciones conservarán el texto de ejemplo, que no corresponde a tu negocio. Solo las imágenes pueden omitirse.');
  out.push('- Los enlaces del navbar y del footer no se pueden quitar ni añadir: reescribe el texto y el destino de cada uno para que apunten a una sección que exista en tu plan (#inicio solo existe si hay hero; #servicios, #precios y #contacto solo si incluyes esos bloques).');
  out.push('- Las cantidades son fijas por variante (por ejemplo 3 tarjetas, 3 planes, 4 fotos). No puedes añadir ni quitar elementos: elige la variante cuyo número de elementos encaje con el negocio y escribe contenido para todos.');
  out.push('- WhatsApp: pide al usuario su número. El enlace del botón de WhatsApp es https://wa.me/506NÚMERO sin espacios ni signos (código de país + número). Si no te lo dio, no inventes uno: deja el valor por defecto y avisa al usuario de que debe cambiarlo después.');
  out.push('- Todo el texto en español, conciso y concreto; respeta los límites de caracteres (los textos largos rompen el diseño).');
  out.push('- Un solo H1 en toda la página: el del hero. No pongas otro hero.');
  out.push('- Tono sobrio y editorial: sin signos de exclamación, emoticonos, mayúsculas sostenidas ni frases de venta exageradas.');
  out.push('- Orden típico: navbar, hero, servicios, galería, testimonios, precios, contacto, footer. Usa solo lo que tenga sentido para el negocio.');
  out.push('- Alterna fondo claro y oscuro en secciones seguidas usando la etiqueta «fondo» de cada variante.');
  out.push('- No inventes datos reales (teléfonos, precios exactos, direcciones, clientes) si el usuario no los dio: usa textos genéricos o pídele el dato.');
  out.push('');
  out.push('## Bloques, variantes y huecos');
  out.push('');
  for (const b of catalogoHuecos()) {
    out.push(`### ${b.bloque} — ${b.etiqueta}${b.ancla ? ` (ancla #${b.ancla})` : ''}`);
    for (const v of b.variantes) {
      out.push(`- variante "${v.clave}" (${v.etiqueta}) · fondo ${v.tono}${v.fondo ? ' · admite fondo' : ''}${v.lineas.length ? '' : ' · sin textos editables'}`);
      out.push(...v.lineas);
    }
    out.push('');
  }
  out.push('## Ejemplos completos');
  out.push('');
  for (const e of ejemplosPlan()) { out.push(JSON.stringify(e)); out.push(''); }
  out.push('Recuerda: tu respuesta debe ser únicamente el JSON del plan.');
  return out.join('\n') + '\n';
}

// GUÍA PARA IA, generada del código (nunca se escribe a mano: así no queda desactualizada).
// Recorre BLOCKS, crea cada variante y lista sus "huecos" numerados, con su etiqueta de tono (claro/oscuro/acento)
// y si admite foto de fondo. La usa el botón "Copiar guía para IA" y tools/gen-guia-ia.mjs (docs/guia-ia.md).
// Lógica pura, sin DOM. Los ejemplos viven en guiaia-ejemplos.js.

import { t } from '../i18n/index.js';
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
    if (h.type === 'image') return `  ${num} ${h.name} (${t('guia.imagen')})`;
    const ej = String(h.content.text ?? '').replace(/\s+/g, ' ');
    if (h.type === 'button') return `  ${num} ${h.name} (${t('guia.boton')} ≤${limite(h)}) «${ej}»${h.content.href === '#contacto' ? '' : ` →${destino(h.content.href)}`}`;
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

// El tono es un dato (lo usan los tests); aquí solo se traduce al escribirlo en la guía
const TONOS = { claro: () => t('guia.claro'), oscuro: () => t('guia.oscuro'), acento: () => t('guia.acento') };

export function guiaIA() {
  const out = [];
  out.push(t('guia.l01'));
  out.push('');
  out.push(t('guia.l02'));
  out.push('');
  out.push(t('guia.l03'));
  out.push('');
  out.push(t('guia.l04'));
  out.push('');
  out.push(t('guia.l05'));
  out.push('');
  out.push(t('guia.l06'));
  out.push(t('guia.l07'));
  out.push(t('guia.l08'));
  out.push(t('guia.l09'));
  out.push(t('guia.l10'));
  out.push(t('guia.l11'));
  out.push(t('guia.l12'));
  out.push(t('guia.l13'));
  out.push('');
  out.push(t('guia.l14'));
  out.push('');
  out.push(t('guia.l15'));
  out.push(t('guia.l16'));
  out.push(t('guia.l17'));
  out.push(t('guia.l18'));
  out.push(t('guia.l19'));
  out.push(t('guia.l20'));
  out.push(t('guia.l21'));
  out.push(t('guia.l22'));
  out.push(t('guia.l23'));
  out.push(t('guia.l24'));
  out.push('');
  out.push(t('guia.l25'));
  out.push('');
  for (const b of catalogoHuecos()) {
    out.push(`### ${b.bloque} — ${b.etiqueta}${b.ancla ? ` (${t('guia.ancla')} #${b.ancla})` : ''}`);
    for (const v of b.variantes) {
      out.push(`- ${t('guia.variante')} "${v.clave}" (${v.etiqueta}) · ${t('guia.fondo')} ${TONOS[v.tono]()}${v.fondo ? ` · ${t('guia.admiteFondo')}` : ''}${v.lineas.length ? '' : ` · ${t('guia.sinTextos')}`}`);
      out.push(...v.lineas);
    }
    out.push('');
  }
  out.push(t('guia.l26'));
  out.push('');
  for (const e of ejemplosPlan()) { out.push(JSON.stringify(e)); out.push(''); }
  out.push(t('guia.l27'));
  return out.join('\n') + '\n';
}

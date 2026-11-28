// MARQUESINA (ticker): un `container` con content.marquesina = { mov, vel, dir, pausa, gap, copias }.
// Los hijos del contenedor son los items (texto, icono, imagen, punto separador...).
// UN solo punto de generación: lo usan el export (exporter.js) y el editor (renderer.js).
//
// Export (CSS puro, cero JS):
//   <div class="nX">                       marco: overflow:hidden
//     <div class="mq-p">                   pista: flex, width:max-content, @keyframes con translate
//       <div class="mq-g"> items </div>    copia visible
//       <div class="mq-g" aria-hidden="true" inert> items sin id </div>   copias duplicadas (K-1)
// Bucle exacto: cada grupo lleva padding-inline-end = separación (todos miden lo mismo) y la animación
// mueve la pista -(100/K)% = justo un grupo. Velocidad = segundos por vuelta (una copia).
// Sin movimiento: una sola tira estática (.mq-g) centrada y con wrap. prefers-reduced-motion = igual que la estática.
// Editor: los items se ven UNA vez, quietos, con wrap (editables); la animación se ve en 👁 y en el export.
import { t } from '../i18n/index.js';


export const MQ_DEFECTO = { mov: true, vel: 25, dir: 'izq', pausa: true, gap: 48, copias: 4 };
export const MQ_VELOCIDADES = [['lenta', t('mq.lenta'), 50], ['media', t('sombra.media'), 25], ['rapida', t('mq.rapida'), 12]]; // [clave, texto, segundos por vuelta]
export const MQ_GAPS = [16, 32, 48, 64, 96];
export const MQ_COPIAS = [2, 3, 4, 5, 6];
export const MQ_VEL_MIN = 5, MQ_VEL_MAX = 120;

const num = (v, min, max, def, entero = false) => {
  const x = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max) return def;
  return entero ? Math.round(x) : Math.round(x * 10) / 10;
};

/** Valida content.marquesina: devuelve el objeto completo y limpio, o undefined si no es un objeto (= no es marquesina). */
export function normalizarMarquesina(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return {
    mov: v.mov !== false,
    vel: num(v.vel, MQ_VEL_MIN, MQ_VEL_MAX, MQ_DEFECTO.vel),
    dir: v.dir === 'der' ? 'der' : 'izq',
    pausa: v.pausa !== false,
    gap: num(v.gap, 0, 200, MQ_DEFECTO.gap, true),
    copias: num(v.copias, 2, 6, MQ_DEFECTO.copias, true),
  };
}

/** Config efectiva de un nodo, o null si no es una marquesina. */
export const usaMarquesina = (node) => (node.type === 'container' && node.content?.marquesina ? normalizarMarquesina(node.content.marquesina) ?? null : null);

export const paginaUsaMarquesina = (page) => { let u = false; (function rec(n) { if (usaMarquesina(n)) u = true; n.children.forEach(rec); })(page); return u; };

/** Estilos inline de la marquesina en el EDITOR (quieta, con wrap, para poder editar todos los items). */
export const estilosMarquesinaEditor = (cfg) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: `${cfg.gap}px`, maxWidth: '100%', minWidth: '0',
});

export const keyframesMarquesina = (copias) => `@keyframes mq${copias}{from{translate:0 0}to{translate:calc(-100% / ${copias}) 0}}`;

/** Reglas CSS del export para el nodo `sel` (ej. ".n3"). Devuelve { base:[...], reducido:[...] } (reducido va dentro de prefers-reduced-motion). */
export function cssMarquesina(sel, cfg) {
  const g = `${cfg.gap}px`;
  // marco: nunca más ancho que su contenedor (aunque la pista mida mucho más) y sin barra de scroll
  const marco = `${sel}{display:block;max-width:100%;min-width:0;overflow:hidden}`;
  // tira estática (sin movimiento y reduced-motion): centrada, con wrap
  const estatica = `${sel} .mq-g{display:flex;flex:none;flex-wrap:wrap;align-items:center;justify-content:center;gap:${g}}`;
  if (!cfg.mov) return { base: [marco, `${sel} .mq-g{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:${g}}`], reducido: [] };
  const anim = `mq${cfg.copias} ${cfg.vel}s linear infinite${cfg.dir === 'der' ? ' reverse' : ''}`;
  const base = [
    marco,
    `${sel}>.mq-p{display:flex;width:max-content;animation:${anim}}`,
    `${sel} .mq-g{display:flex;flex:none;align-items:center;gap:${g};padding-inline-end:${g}}`,
  ];
  if (cfg.pausa) base.push(`${sel}:hover>.mq-p{animation-play-state:paused}`);
  const reducido = [
    `${sel}>.mq-p{animation:none;width:auto;justify-content:center}`,
    estatica.replace('flex:none;', 'flex:0 1 auto;') + `${sel} .mq-g{padding-inline-end:0}`,
    `${sel} .mq-g[aria-hidden]{display:none}`,
  ];
  return { base, reducido };
}

/** HTML interior de la marquesina del export: `partes` = HTML de los items (ya generado, una sola vez). */
export function htmlMarquesina(partes, nivel, cfg) {
  const s1 = '  '.repeat(nivel + 1), s2 = '  '.repeat(nivel + 2);
  const items = partes.join('\n');
  if (!cfg.mov) return `${s1}<div class="mq-g">\n${items}\n${s1}</div>`;
  // las copias no llevan ids (no se repiten) y van aria-hidden + inert (ni lectores de pantalla ni foco)
  const sinIds = items.replace(/(<[a-z][^>]*?) id="[^"]*"/g, '$1');
  const copias = Array.from({ length: cfg.copias - 1 }, () => `${s2}<div class="mq-g" aria-hidden="true" inert>\n${sinIds}\n${s2}</div>`);
  return `${s1}<div class="mq-p">\n${s2}<div class="mq-g">\n${items}\n${s2}</div>\n${copias.join('\n')}\n${s1}</div>`;
}

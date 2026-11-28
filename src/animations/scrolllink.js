// LIGADO AL SCROLL (scroll-linked): una propiedad avanza con el progreso del scroll del elemento.
// Solo opacity / scale / rotate (nada que recoloque el layout). CSS + variable --sp (scrollmotor.js);
// las reglas valen solo con la clase .sc (sin JS o con "reducir movimiento" no se aplican).
// Datos en node.animation.scrolllink = { effect, amount, start, end }
//   start / end = en qué parte del recorrido (0–100 %) empieza y termina el cambio.
//   0 % = el elemento asoma por abajo de la pantalla · 100 % = sale por arriba.
//   Antes de `start` está en el valor inicial; después de `end`, en el final.
// Ojo: no combinar con "Al aparecer" sobre la misma propiedad (la animación de entrada pisa a esta).
import { t } from '../i18n/index.js';


const EFECTOS = [
  ['', t('anim.ninguno')],
  ['fade-in', t('anim.aparecer_opacidad_0_1')],
  ['fade-out', t('anim.desaparecer_opacidad_1_0')],
  ['zoom-in', t('anim.crecer_hasta_su_tamano')],
  ['zoom-out', t('anim.encoger')],
  ['rotate', t('anim.girar_hasta_enderezarse')],
];

const conIntensidad = (g, efecto) => efecto === 'zoom-in' || efecto === 'zoom-out' || efecto === 'rotate';

export default {
  id: 'scrolllink',
  titulo: t('anim.ligado_al_scroll'),
  principal: 'effect',
  defaults: { effect: 'fade-in', amount: 20, start: 0, end: 50 },
  campos: [
    { key: 'effect', label: t('anim.efecto'), kind: 'select', options: EFECTOS },
    { key: 'amount', label: t('anim.intensidad_de_tamano_grados'), kind: 'num', step: 5, min: -360, cuando: conIntensidad },
    { key: 'start', label: t('anim.empieza_del_recorrido'), kind: 'num', step: 5, min: 0 },
    { key: 'end', label: t('anim.termina_del_recorrido'), kind: 'num', step: 5, min: 0 },
  ],

  css(g, sel) {
    if (!g?.effect) return '';
    const a = Math.min(100, g.start ?? 0) / 100;
    const b = Math.max(a + 0.01, Math.min(100, g.end ?? 50) / 100);
    const amt = g.amount ?? 20;
    const k = Math.min(0.9, Math.max(0, amt / 100)); // zoom: 0 – 90 %
    const q = '--q:clamp(0,calc((var(--sp,0) - ' + a + ') / ' + (b - a) + '),1)'; // progreso del efecto 0..1
    const reglas = {
      'fade-in': 'opacity:var(--q)',
      'fade-out': 'opacity:calc(1 - var(--q))',
      'zoom-in': `scale:calc(${1 - k} + ${k} * var(--q))`,
      'zoom-out': `scale:calc(1 - ${k} * var(--q))`,
      rotate: `rotate:calc(${amt}deg * (1 - var(--q)))`,
    };
    const r = reglas[g.effect];
    return r ? `.sc ${sel}{${q};${r}}` : '';
  },
};

// DIAGNÓSTICO de animaciones de texto: genera la página de medición y la librería que corre DENTRO de la página
// (la misma para Firefox/Selenium y para Chrome). No toca código de producción: solo usa exportHTML().
// Uso: node tools/medir-texto.mjs  (Firefox, por píxeles)  ·  la página también se escribe en tmp-logs/medicion.html (Chrome).
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';

const TEXTO = 'Waveform quickly jumped';
const BASE = { fontSize: '56px', color: '#111111', margin: '24px 0 0 40px', lineHeight: '1.2' };
const TD = { trigger: 'scroll', duration: 0.7, delay: 0, stagger: 0.06, ease: 'suave', distance: 30, angle: -90 };

const head = (id, anim, texto = TEXTO, base = {}) => {
  const x = n('heading', { name: id, content: { text: texto, level: 2, anchor: id } });
  x.styles.base = { ...BASE, ...base }; x.animation = anim; return x;
};
const txt = (modo, efecto, extra = {}) => ({ text: { ...TD, mode: modo, effect: efecto, ...extra } });

// Animaciones de texto (cada una = un caso). Mismos valores por defecto que el editor.
export const CASOS_TEXTO = [
  ['w-up', txt('words', 'up')], ['w-fade', txt('words', 'fade')], ['w-zoom', txt('words', 'zoom')], ['w-blur', txt('words', 'blur')],
  ['w-flip', txt('words', 'flip')], ['w-rotate', txt('words', 'rotate')],
  ['c-up', txt('chars', 'up')], ['c-fade', txt('chars', 'fade')], ['c-zoom', txt('chars', 'zoom')], ['c-blur', txt('chars', 'blur')],
  ['c-flip', txt('chars', 'flip')], ['c-rotate', txt('chars', 'rotate')], ['c-left', txt('chars', 'left')],
  ['l-up', txt('lines', 'up')], ['lm-up', txt('linesm', 'up')],
  // "Al aparecer" sobre el título entero (control: no parte el texto)
  ['ap-up', { appear: { effect: 'up', trigger: 'scroll', duration: 0.7, delay: 0, ease: 'suave', distance: 30 } }],
  ['ap-blur', { appear: { effect: 'blur', trigger: 'scroll', duration: 0.7, delay: 0, ease: 'suave', distance: 30 } }],
];
// Hovers sobre un título sin caja (texto sin fondo)
export const CASOS_HOVER = ['lift', 'grow', 'shrink', 'tilt', 'glow', 'bright', 'underline', 'color', 'soft'].map((e) => [
  'h-' + e, { hover: { effect: e, duration: 0.2, ease: 'suave', color: '#e0245e', lineaColor: 'texto', direccion: 'izq', grosor: 2, separacion: 0 } }]);
// Hover sobre un título cuyo texto está partido en letras (el hover mueve el bloque con N letras dentro)
export const CASOS_HOVER_CHARS = [
  ['hc-lift', { ...txt('chars', 'up', { trigger: 'load' }), hover: { effect: 'lift', duration: 0.2, ease: 'suave' } }],
  ['hc-grow', { ...txt('chars', 'up', { trigger: 'load' }), hover: { effect: 'grow', duration: 0.2, ease: 'suave' } }],
];
// Referencias: texto sin animación y sin partir
export const CASOS_REF = [['ref-plano', {}]];
// Variantes para separar motor de animación (se construyen por JS sobre un título con texto plano)
export const VARIANTES = ['v-css', 'v-transform', 'v-willchange', 'v-waapi', 'v-raf'];
// Párrafo largo para el coste por número de letras
const LARGO = 'Las animaciones de texto parten cada palabra y cada letra en su propio elemento y por eso un párrafo largo cuesta mucho más que un título corto.';

export function paginaMedicion() {
  const pagina = n('page', { name: 'Medición', content: { title: 'Medición texto' } });
  const sec = n('section', { name: 'S' });
  sec.styles.base = { padding: '20px 0', background: '#ffffff' };
  const lista = [
    ...CASOS_TEXTO.map(([id, a]) => head(id, a)),
    ...CASOS_REF.map(([id, a]) => head(id, a)),
    ...CASOS_HOVER.map(([id, a]) => head(id, a, 'Hover sobre texto')),
    ...CASOS_HOVER_CHARS.map(([id, a]) => head(id, a, 'Hover con letras')),
    ...VARIANTES.map((id) => head(id, {})),
    head('n-40', txt('chars', 'up'), 'x'.repeat(40), { fontSize: '30px' }),
    head('n-150', txt('chars', 'up'), LARGO, { fontSize: '30px', maxWidth: '1000px' }),
    head('n-400', txt('chars', 'up'), (LARGO + ' ').repeat(3), { fontSize: '30px', maxWidth: '1000px' }),
  ];
  sec.children.push(...lista);
  pagina.children.push(sec);
  return exportHTML(pagina).replace('</body>', () => `<style id="medicion-css">${CSS_EXTRA}</style><style id="medicion-pausa">.w,.w2,[data-rv],[data-ld]{animation-play-state:paused!important}</style><script>${LIB}</script></body>`);
}

// Variantes (CSS del experimento). a-up viene del export (KEYFRAMES), así que se reutiliza para comparar manzanas con manzanas.
const CSS_EXTRA = `
.w2{display:inline-block}.ww2{display:inline-block;white-space:nowrap}
.v-css .w2{animation:a-up .7s cubic-bezier(.22,1,.36,1) calc(var(--i)*.06s) backwards;--ad:30px}
.v-transform .w2{animation:vt .7s cubic-bezier(.22,1,.36,1) calc(var(--i)*.06s) backwards}
@keyframes vt{from{opacity:0;transform:translateY(30px)}}
.v-willchange .w2{will-change:transform,opacity;animation:vt .7s cubic-bezier(.22,1,.36,1) calc(var(--i)*.06s) backwards}
`;

// ---- Librería dentro de la página (ES5-ish, sin dependencias) ----
const LIB = String.raw`
(function(){
var $=function(id){return document.getElementById(id)};
var raf=function(){return new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})})};
var PZ='.w,.w2,[data-rv],[data-ld]{animation-play-state:paused!important}';
function pausar(on){var s=document.getElementById('medicion-pausa');if(s)s.textContent=on?PZ:''}
document.documentElement.style.scrollBehavior='auto';
function partirVariante(el){ // texto plano -> .ww2 > .w2 por letra (misma estructura que el exportador)
  if(el.dataset.partido)return;var t=el.textContent,i=0,h='';
  t.split(/\s+/).forEach(function(p,k){if(k)h+=' ';h+='<span class="ww2">'+p.split('').map(function(c){return '<span class="w2" style="--i:'+(i++)+'">'+c+'</span>'}).join('')+'</span>'});
  el.innerHTML=h;el.dataset.partido='1'}
function letras(el){return [].slice.call(el.querySelectorAll('.w,.w2'))}
function rects(el){var L=letras(el);if(!L.length)L=[el];return L.map(function(w){var r=w.getBoundingClientRect();return [r.left+scrollX,r.top+scrollY,r.width,r.height]})}
function maxDelta(a,b){var m=0;for(var i=0;i<a.length;i++)for(var k=0;k<4;k++)m=Math.max(m,Math.abs(a[i][k]-b[i][k]));return m}
function fin(a){var t=a.effect.getComputedTiming();return t.endTime}
window.M={
  pausar:pausar,
  info:function(){return {ua:navigator.userAgent,dpr:devicePixelRatio,vw:innerWidth,vh:innerHeight,fonts:getComputedStyle($('c-up')).fontFamily}},
  preparar:function(id){var el=$(id);if(/^v-/.test(id)&&id!=='v-raf'&&id!=='v-waapi'){el.className=(el.className+' '+id).trim();partirVariante(el)}
    if(id==='v-waapi'||id==='v-raf')partirVariante(el);
    document.documentElement.style.scrollBehavior='auto';el.scrollIntoView({block:'center',behavior:'instant'});return {n:letras(el).length}},
  // 1) congela cada animación a 1 ms de su final (efecto casi terminado)
  congelar:async function(id){var el=$(id);M.preparar(id);
    if(id==='v-waapi'){letras(el).forEach(function(w,i){w.animate([{opacity:0,translate:'0 30px'},{opacity:1,translate:'0 0'}],{duration:700,delay:i*60,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'})})}
    var cs=[];if(id==='v-raf'){letras(el).forEach(function(w){w.style.opacity='0.999';w.style.translate='0 0.01px'});cs=null}
    else{el.classList.add('in');cs=el.getAnimations({subtree:true});cs.forEach(function(a){a.pause();a.currentTime=Math.max(0,fin(a)-1)})}
    await raf();return {anims:cs?cs.length:0,rects:rects(el)}},
  // 2) termina todas las animaciones (estado final real)
  terminar:async function(id){var el=$(id);
    if(id==='v-raf'){letras(el).forEach(function(w){w.style.opacity='';w.style.translate=''})}
    else el.getAnimations({subtree:true}).forEach(function(a){a.finish()});
    await raf();return {rects:rects(el)}},
  limpiar:function(id){var el=$(id);el.getAnimations({subtree:true}).forEach(function(a){a.cancel()});el.classList.remove('in')},
  delta:maxDelta,
  // Corrida REAL (sin congelar): registra, por fotograma, la posición de hasta 12 letras y los intervalos entre fotogramas.
  real:function(id,extraMs){return new Promise(function(res){var el=$(id);M.preparar(id);
    var L=letras(el);var paso=Math.max(1,Math.floor(L.length/12));var idx=[];for(var i=0;i<L.length;i+=paso)idx.push(i);
    var fr=[],t0=performance.now(),last=t0,finTs=null,anims=null,fallos=0;
    if(id==='v-waapi'){L.forEach(function(w,i){w.animate([{opacity:0,translate:'0 30px'},{opacity:1,translate:'0 0'}],{duration:700,delay:i*60,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'})})}
    else if(id==='v-raf'){var d0=performance.now();var tick=function(){var t=performance.now()-d0,all=true;L.forEach(function(w,i){var p=(t-i*60)/700;if(p<1)all=false;p=Math.min(1,Math.max(0,p));var e=1-Math.pow(1-p,4);w.style.opacity=e;w.style.translate='0 '+(30*(1-e))+'px'});if(!all)requestAnimationFrame(tick);else L.forEach(function(w){w.style.opacity='';w.style.translate=''})};tick()}
    else{el.classList.add('in');el.getAnimations({subtree:true}).forEach(function(a){a.play()})}
    anims=el.getAnimations({subtree:true});var total=0;anims.forEach(function(a){total=Math.max(total,fin(a))});if(id==='v-raf')total=700+60*L.length;
    var cnt=anims.length;
    function f(now){fr.push({t:now-t0,dt:now-last,r:idx.map(function(k){var q=L[k].getBoundingClientRect();return [q.left,q.top]})});last=now;
      if(now-t0<total+(extraMs||300))requestAnimationFrame(f);else{
        var dts=fr.slice(1).map(function(x){return x.dt}).sort(function(a,b){return a-b});
        // salto al final: mayor cambio de posición entre dos fotogramas consecutivos DESPUÉS de total-80ms vs el mayor ANTES
        var antes=0,final=0;for(var j=1;j<fr.length;j++){var m=0;for(var q=0;q<idx.length;q++){m=Math.max(m,Math.abs(fr[j].r[q][0]-fr[j-1].r[q][0]),Math.abs(fr[j].r[q][1]-fr[j-1].r[q][1]))}
          if(fr[j].t<total-120)antes=Math.max(antes,m);else final=Math.max(final,m)}
        res({n:L.length,anims:cnt,totalMs:Math.round(total),frames:fr.length,dtMed:dts[Math.floor(dts.length/2)],dtP95:dts[Math.floor(dts.length*.95)],dtMax:dts[dts.length-1],largos:dts.filter(function(x){return x>20}).length,maxPasoAntes:+antes.toFixed(3),maxPasoFinal:+final.toFixed(3)})}}
    requestAnimationFrame(f)})},
  // Registro de fotogramas para hover (arrancar, mover el ratón, parar)
  frames:{ini:function(){var a=[],l=performance.now(),on=true;M._fr={a:a,on:function(){return on},stop:function(){on=false}};(function f(n){if(!on)return;a.push(n-l);l=n;requestAnimationFrame(f)})(performance.now());return 1},
    fin:function(){M._fr.stop();var d=M._fr.a.slice(1).sort(function(a,b){return a-b});return {n:d.length,med:d[Math.floor(d.length/2)],p95:d[Math.floor(d.length*.95)],max:d[d.length-1],largos:d.filter(function(x){return x>20}).length}}},
  estilo:function(id){var c=getComputedStyle($(id));return {transform:c.transform,textShadow:c.textShadow,filter:c.filter,willChange:c.willChange,opacity:c.opacity}},
  // Recuento de elementos animados/compositables
  coste:function(id){var el=$(id);var L=letras(el);return {letras:L.length,anims:el.getAnimations({subtree:true}).length}}
};
})();
`;

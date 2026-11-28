// MENÚ HAMBURGUESA EN MÓVIL (opción del Navbar: content.menuMovil === true)
// Regla: el PRIMER hijo directo (el logo) queda siempre visible; todos los demás hijos directos
// (enlaces, botón de acción, lo que haya) van al panel desplegable.
// No hay nodos nuevos en el árbol: el export inserta, como hermanos de los hijos, un
// <input type="checkbox" class="mm-chk"> (oculto pero accesible por teclado), un <label class="mm-btn"> y un
// <div class="mm-pn"> GENERADO que envuelve los hijos del panel (todos menos el primero).
// En escritorio .mm-pn es display:contents (los hijos se comportan como hijos directos del navbar y el layout
// no cambia); en móvil es un panel absoluto (top:100%) que SE SUPERPONE al contenido, anclado al navbar.
// El CSS del panel se genera UNA vez aquí (cssMenuMovil) y lo usan el export y el editor, cada uno con su
// propio selector (el editor no tiene checkbox: el panel se abre con la clase .abierto, estado solo en memoria).

/** ¿Este nodo lleva menú hamburguesa? (sección con la opción activa y algo que meter en el panel). */
export const usaMenuMovil = (node) => node.type === 'section' && node.content?.menuMovil === true && node.children.length >= 2;

/** ¿Alguna parte de la página lo usa? (decide si viaja el script mínimo). */
export function paginaUsaMenuMovil(page) {
  let usa = false;
  (function rec(n) { if (usaMenuMovil(n)) usa = true; n.children.forEach(rec); })(page);
  return usa;
}

const FALLBACK_LINEA = 'rgba(128,128,128,.35)';
/** Color de las líneas separadoras: el del borde del navbar (borderBottom/borderTop/border); si no hay, un gris suave. */
export function colorLinea(est) {
  for (const k of ['borderBottom', 'borderTop', 'border']) {
    const m = String(est[k] ?? '').match(/(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))\s*$/i);
    if (m) return m[1];
  }
  return FALLBACK_LINEA;
}

/** Quita la transparencia de un color (#rgba, #rrggbbaa, rgba(), hsla()); null si no es un color simple. */
function opaco(f) {
  f = String(f ?? '').trim();
  let m = f.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) return '#' + h.slice(0, 3).split('').map((c) => c + c).join('');
    if (h.length === 6 || h.length === 8) return '#' + h.slice(0, 6);
    return null;
  }
  m = f.match(/^(rgb|hsl)a?\(\s*([^,\s\/)]+)[,\s]+([^,\s\/)]+)[,\s]+([^,\s\/)]+)/i);
  return m ? `${m[1].toLowerCase()}(${m[2]},${m[3]},${m[4]})` : null;
}

/** Fondo SÓLIDO del panel: el del navbar sin transparencia; si no hay color simple, claro u oscuro según el color del texto. */
export function fondoSolido(est) {
  const c = opaco(est.backgroundColor) ?? opaco(est.background);
  if (c) return c;
  const t = String(est.color ?? '').trim().match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (t) {
    const h = t[1].length === 3 ? t[1].split('').map((x) => x + x).join('') : t[1];
    const lum = (parseInt(h.slice(0, 2), 16) * 299 + parseInt(h.slice(2, 4), 16) * 587 + parseInt(h.slice(4, 6), 16) * 114) / 1000;
    return lum > 150 ? '#111111' : '#ffffff'; // texto claro -> fondo oscuro
  }
  return '#ffffff';
}

/** Padding izquierdo/derecho efectivo del navbar (el panel lo repite para alinear sus enlaces con el logo). */
export function paddingLR(est) {
  let l = est.paddingLeft, r = est.paddingRight;
  if (est.padding != null && (l == null || r == null)) {
    const [a, b = a, , d = b] = String(est.padding).trim().split(/\s+/); // arriba derecha abajo izquierda
    r ??= b; l ??= d;
  }
  return [l ?? '16px', r ?? '16px'];
}

/** Variables --mm-* de la barra: línea, fondo sólido y padding lateral. */
export function varsMenu(est) {
  const [l, r] = paddingLR(est);
  return { '--mm-linea': colorLinea(est), '--mm-fondo': fondoSolido(est), '--mm-pl': l, '--mm-pr': r };
}

/** ¿El navbar necesita ancla? Si no es sticky/fixed/relative/absolute, en móvil recibe position:relative + z-index:50. */
export const necesitaAncla = (est) => !['sticky', 'fixed', 'relative', 'absolute'].includes(String(est.position ?? '').trim());

/** Añade `!important` a cada declaración (el editor pinta estilos inline y hay que ganarles). */
const imp = (s, i) => (i ? s.split(';').filter(Boolean).map((d) => `${d}!important`).join(';') : s);

/**
 * Reglas del menú.
 *  sel   = selector de la barra (export: `.n3`; editor: `.mm-edit`)
 *  vars  = declaraciones --mm-* de la barra para el export (en el editor las pone el renderer inline)
 *  ancla = true: la barra recibe position:relative + z-index:50 en móvil (solo si no es sticky/relative/...)
 *  important = true en el editor
 *  Devuelve { base, movil, reducido }: base va fuera del @media (oculta checkbox y label, panel display:contents y @keyframes),
 *  movil va dentro de @media (max-width:768px), reducido va en un @media (prefers-reduced-motion:reduce).
 */
export function cssMenuMovil(sel, vars, { important = false, editor = false, ancla = false } = {}) {
  const I = (s) => imp(s, important);
  const btn = `${sel}>.mm-btn`;
  const chk = `${sel}>.mm-chk`;
  const pn = `${sel}>.mm-pn`;
  const abre = editor ? `${sel}.abierto>.mm-pn` : `${chk}:checked~.mm-pn`;
  const pref = `${pn}>`;
  const todos = `:where(:not(.mm-btn))`; // especificidad 0: div y a (abajo) ganan sobre esta regla genérica
  const base = editor ? [] : [
    `${chk},${btn}{display:none}`,
    `${pn}{display:contents}`, // escritorio: los hijos se comportan como hijos directos del navbar
    '@keyframes mm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}',
  ];
  const movil = [
    // barra: una sola fila (logo + hamburguesa); el panel abierto va SUPERPUESTO debajo (no empuja el contenido)
    `${sel}{${I('flex-direction:row;flex-wrap:wrap;align-items:center;row-gap:0' + (ancla ? ';position:relative;z-index:50' : ''))}${vars ? ';' + vars : ''}${editor ? ';--mm-vh:var(--alto-v,100dvh)' : ''}}`,
    // botón de 44x44 a la derecha de la fila del logo; el icono son dos líneas con currentColor
    `${btn}{${I('display:flex;position:relative;flex:0 0 44px;width:44px;height:44px;margin-left:auto;cursor:pointer;color:inherit')}}`,
    `${btn}::before,${btn}::after{content:"";position:absolute;left:12px;width:20px;height:2px;background:currentColor;transition:transform .18s ease}`,
    `${btn}::before{top:17px}`,
    `${btn}::after{top:25px}`,
    // panel: cerrado oculto; abierto = capa absoluta bajo la barra, fondo sólido y una línea de 1px abajo (sin sombra)
    `${pn}{${I('display:none')}}`,
    `${abre}{${I('display:flex;flex-direction:column;position:absolute;top:100%;left:0;right:0;z-index:50;box-sizing:border-box;padding:0 var(--mm-pr,16px) 0 var(--mm-pl,16px);background:var(--mm-fondo,#fff);border-bottom:1px solid var(--mm-linea);box-shadow:none;max-height:calc(var(--mm-vh,100dvh) - var(--mm-h,64px));overflow-y:auto')}${editor ? '' : ';animation:mm-in .18s ease-out'}}`,
    // hijos del panel: a todo el ancho
    `${pref}${todos}{${I('display:block;width:100%;order:0;flex:none')}}`,
    // grupo de enlaces (contenedor): columna, con separadores de 1px y áreas de toque de 44px
    `${pref}div{${I('display:flex;flex-direction:column;align-items:stretch;flex-wrap:nowrap;justify-content:flex-start;gap:0')}}`,
    `${pref}div>*{${I('display:flex;align-items:center;justify-content:flex-start;width:100%;min-height:44px;padding:0')};border-top:1px solid var(--mm-linea)}`,
    // botón de acción (enlace directo): al final, a todo el ancho y con margen arriba
    `${pref}a{${I('display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;margin:12px 0 6px;text-align:center')}}`,
  ];
  if (!editor) {
    // position:fixed;top:0;left:0 (no absolute sin coordenadas): al enfocarse con el clic, Firefox hace scroll hasta la posición de maquetación
    // del checkbox, y dentro de un navbar sticky esa posición es la de la barra SIN pegar (arriba de la página): la página saltaba hacia arriba en cada apertura.
    movil.unshift(`${chk}{display:block;position:fixed;top:0;left:0;width:1px;height:1px;margin:-1px;opacity:0;overflow:hidden}`);
    movil.push(`${chk}:checked+.mm-btn::before{transform:translateY(4px) rotate(45deg)}`);
    movil.push(`${chk}:checked+.mm-btn::after{transform:translateY(-4px) rotate(-45deg)}`);
    movil.push(`${chk}:focus-visible+.mm-btn{outline:2px solid currentColor;outline-offset:-4px}`);
  } else {
    movil.push(`${sel}.abierto>.mm-btn::before{transform:translateY(4px) rotate(45deg)}`);
    movil.push(`${sel}.abierto>.mm-btn::after{transform:translateY(-4px) rotate(-45deg)}`);
  }
  const reducido = editor ? [] : [`${btn}::before,${btn}::after{transition:none}`, `${abre}{animation:none}`];
  return { base, movil, reducido };
}

/** Script mínimo (solo viaja si la página usa el menú): Enter abre/cierra; un enlace del panel, Esc o un clic fuera del navbar lo cierran;
 *  actualiza aria-expanded y el alto del navbar (--mm-h, para el max-height del panel). Sin JS el checkbox sigue abriendo y cerrando (Espacio / clic). */
/** Textos del menú EXPORTADO: siguen el idioma de la PÁGINA (content.lang), no el del editor. Sin idioma o 'es…' = español; otro = inglés. */
export function textosMenu(lang) {
  return !lang || /^es(-|$)/i.test(lang) ? { abrir: 'Abrir menú', cerrar: 'Cerrar menú' } : { abrir: 'Open menu', cerrar: 'Close menu' };
}

export const scriptMenu = ({ abrir, cerrar }) => `(function(){
var ks=document.querySelectorAll('.mm-chk');
function s(k){k.setAttribute('aria-expanded',k.checked?'true':'false');k.setAttribute('aria-label',k.checked?'${cerrar}':'${abrir}');if(k.checked)k.parentNode.style.setProperty('--mm-h',k.parentNode.offsetHeight+'px')}
ks.forEach(function(k){
var p=k.parentNode;
k.addEventListener('change',function(){s(k)});
k.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();k.click()}});
p.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(a&&k.checked&&!p.firstElementChild.contains(a)){k.checked=false;s(k)}});
});
document.addEventListener('click',function(e){ks.forEach(function(k){if(k.checked&&!k.parentNode.contains(e.target)){k.checked=false;s(k)}})});
document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;ks.forEach(function(k){if(k.checked){k.checked=false;s(k);k.focus()}})});
})();`;

/** CSS del editor (vista móvil): la barra con `.mm-edit`; el panel se abre con `.abierto`. Se inyecta una vez en el preview.
 *  Las variables --mm-* y el position:relative los pone el renderer inline en la barra. */
export const CSS_MENU_EDITOR = cssMenuMovil('.mm-edit', null, { important: true, editor: true }).movil.join('\n');

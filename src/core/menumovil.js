// MENÚ HAMBURGUESA EN MÓVIL (opción del Navbar: content.menuMovil === true)
// Regla: el PRIMER hijo directo (el logo) queda siempre visible; todos los demás hijos directos
// (enlaces, botón de acción, lo que haya) van al panel desplegable.
// No hay nodos nuevos en el árbol: el export inserta, como hermanos de los hijos, un
// <input type="checkbox" class="mm-chk"> (oculto pero accesible por teclado) y un <label class="mm-btn">.
// El CSS del panel se genera UNA vez aquí (cssMenuMovil) y lo usan el export y el editor,
// cada uno con su propio selector (el editor no tiene checkbox: muestra el panel siempre abierto).

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

/** Añade `!important` a cada declaración (el editor pinta estilos inline y hay que ganarles). */
const imp = (s, i) => (i ? s.split(';').filter(Boolean).map((d) => `${d}!important`).join(';') : s);

/**
 * Reglas del menú.
 *  sel  = selector de la barra (export: `.n3`; editor: `.mm-edit`)
 *  pref = prefijo de los hermanos del panel, terminado en `~` (export: `.n3>.mm-chk:checked~`; editor: `.mm-edit>.mm-btn~`)
 *  important = true en el editor
 *  Devuelve { base, movil, reducido }: base va fuera del @media (oculta checkbox y label en escritorio y define @keyframes),
 *  movil va dentro de @media (max-width:768px), reducido va en un @media (prefers-reduced-motion:reduce).
 */
export function cssMenuMovil(sel, pref, linea, { important = false, editor = false } = {}) {
  const I = (s) => imp(s, important);
  const btn = `${sel}>.mm-btn`;
  const chk = `${sel}>.mm-chk`;
  const todos = `:where(:not(.mm-btn))`; // especificidad 0: div y a (abajo) ganan sobre esta regla genérica
  const base = editor ? [] : [
    `${chk},${btn}{display:none}`,
    '@keyframes mm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}',
  ];
  const movil = [
    // barra: una sola fila (logo + hamburguesa); el panel abierto se apila debajo y EMPUJA el contenido (no es overlay)
    `${sel}{${I('flex-direction:row;flex-wrap:wrap;align-items:center;row-gap:0')}${linea ? `;--mm-linea:${linea}` : ''}}`,
    // botón de 44x44 a la derecha de la fila del logo; el icono son dos líneas con currentColor
    `${btn}{${I('display:flex;position:relative;flex:0 0 44px;width:44px;height:44px;margin-left:auto;cursor:pointer;color:inherit')}}`,
    `${btn}::before,${btn}::after{content:"";position:absolute;left:12px;width:20px;height:2px;background:currentColor;transition:transform .18s ease}`,
    `${btn}::before{top:17px}`,
    `${btn}::after{top:25px}`,
    // panel: hermanos después del botón; todo a todo el ancho
    `${pref}${todos}{${I('display:block;width:100%;order:0')}${editor ? '' : ';animation:mm-in .18s ease-out'}}`,
    // grupo de enlaces (contenedor): columna, con separadores de 1px y áreas de toque de 44px
    `${pref}div{${I('display:flex;flex-direction:column;align-items:stretch;flex-wrap:nowrap;justify-content:flex-start;gap:0')}}`,
    `${pref}div>*{${I('display:flex;align-items:center;justify-content:flex-start;width:100%;min-height:44px;padding:0')};border-top:1px solid var(--mm-linea)}`,
    // botón de acción (enlace directo): al final, a todo el ancho y con margen arriba
    `${pref}a{${I('display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;margin:12px 0 6px;text-align:center')}}`,
  ];
  if (!editor) {
    movil.unshift(`${chk}{display:block;position:absolute;width:1px;height:1px;margin:-1px;opacity:0;overflow:hidden}`);
    movil.push(`${chk}~${todos}{display:none}`); // cerrado: el panel está oculto (la regla de abierto, de mayor especificidad, lo muestra)
    movil.push(`${chk}:checked+.mm-btn::before{transform:translateY(4px) rotate(45deg)}`);
    movil.push(`${chk}:checked+.mm-btn::after{transform:translateY(-4px) rotate(-45deg)}`);
    movil.push(`${chk}:focus-visible+.mm-btn{outline:2px solid currentColor;outline-offset:-4px}`);
  }
  const reducido = editor ? [] : [`${btn}::before,${btn}::after{transition:none}`, `${pref}${todos}{animation:none}`];
  return { base, movil, reducido };
}

/** Script mínimo (solo viaja si la página usa el menú): Enter abre/cierra, un enlace del panel o Esc lo cierran, y actualiza aria-expanded.
 *  Sin JS el checkbox sigue abriendo y cerrando el menú (Espacio / clic). */
export const SCRIPT_MENU = `(function(){
var ks=document.querySelectorAll('.mm-chk');
function s(k){k.setAttribute('aria-expanded',k.checked?'true':'false');k.setAttribute('aria-label',k.checked?'Cerrar menú':'Abrir menú')}
ks.forEach(function(k){
var p=k.parentNode;
k.addEventListener('change',function(){s(k)});
k.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();k.click()}});
p.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(a&&k.checked&&!p.firstElementChild.contains(a)){k.checked=false;s(k)}});
});
document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;ks.forEach(function(k){if(k.checked){k.checked=false;s(k);k.focus()}})});
})();`;

/** CSS del editor (vista móvil): la barra con `.mm-edit` y el panel siempre abierto. Se inyecta una vez en el preview. */
export const CSS_MENU_EDITOR = (() => {
  // linea = null: el renderer pone --mm-linea inline en la barra (con el color de su borde)
  return cssMenuMovil('.mm-edit', '.mm-edit>.mm-btn~', null, { important: true, editor: true }).movil.join('\n');
})();

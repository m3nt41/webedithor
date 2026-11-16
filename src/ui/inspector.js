// INSPECTOR (derecha): edita el nodo seleccionado.
// - Contenido (texto, enlace, imagen) + grupos de estilos definidos en fields.js.
// - Cada cambio llama a setStyle/setContent del store; el preview se redibuja.
// - Para no perder el foco al escribir, NO se reconstruye el panel en cambios de
//   página mientras el foco está dentro (salvo que cambie la selección o un
//   select altere qué campos se muestran: ahí se fuerza).

import { getState, subscribe, gestoActivo, setStyle, setStyles, setPosicion, setContent, setName, setAnimation, moveBy, duplicateNode, removeNode, addVariant, removeVariant, moveVariant, setVariant, setVariantProp, verEstado, setIconSize, setMarquesina, setEstilosGesto } from '../core/store.js';
import { findNode, findParent, anchorValido, contarAncla, aspectoValido, capaValida } from '../core/tree.js';
import { reducirImagen } from './imagen.js';
import { PRESETS_SOMBRA, SOMBRA_PERSONALIZADA, leerSombraUi, colorSombra, armarSombra } from '../core/sombra.js';
import { modoSombra } from '../animations/base.js';
import { effectiveStyles, TIPOS_TEXTO } from '../render/renderer.js';
import { GRUPOS } from './fields.js';
import { SVG_AVISO, SVG_COPIAR, SVG_PEGAR } from './iconos.js';
import { copiarGuia, abrirDialogoPlan } from './plania.js';
import { ICONOS } from '../blocks/iconos-data.js';
import { iconoSvg, TAMANOS_ICONO, TAMANO_ICONO_DEFECTO } from '../core/icono.js';
import { modeloControl, columnasAuto, kebab, KINDS_CONTROL, KINDS_BOTONES, TAMANOS_BOTON, leerEstiloBoton, valoresEstiloBoton } from './controles.js';
import { usaMarquesina, MQ_VELOCIDADES, MQ_GAPS, MQ_COPIAS, MQ_VEL_MIN, MQ_VEL_MAX } from '../core/marquesina.js';
import { GRUPOS_ANIM } from '../animations/index.js';
import { accionCopiarEfectos, accionPegarEfectos, accionPegarEnHermanos } from './efectos.js';
import { ancestrosConScroll } from '../animations/parallax.js';
import { DISPAROS_VARIANT, CAMPOS_PROPS, CAMPOS_TIEMPO, DEF_TIEMPO } from '../animations/variants.js';

// Los 3 acordeones del panel, por TAREA: Contenido (qué dice/muestra), Estilo (cómo se ve) y Movimiento (cómo se mueve).
// Contenido y Estilo abiertos de fábrica; Movimiento plegado. Lo que el usuario deja abierto se guarda.
// (El texto y el enlace del elemento van fijos arriba, fuera de los acordeones.)
const ACORDEONES = [['contenido', 'Contenido'], ['estilo', 'Estilo'], ['movimiento', 'Movimiento']];
const LS_NIVELES = 'editor-landings:niveles';
const NIVELES_DEF = { contenido: true, estilo: true, movimiento: false };
function leerNiveles() {
  try {
    const o = JSON.parse(localStorage.getItem(LS_NIVELES));
    const g = o && typeof o === 'object' ? { ...o } : {};
    // Lo guardado con los nombres viejos (Esencial / Avanzado) pasa a los nuevos (Contenido / Movimiento)
    if ('esencial' in g && !('contenido' in g)) g.contenido = g.esencial;
    if ('avanzado' in g && !('movimiento' in g)) g.movimiento = g.avanzado;
    return { ...NIVELES_DEF, contenido: g.contenido ?? NIVELES_DEF.contenido, estilo: g.estilo ?? NIVELES_DEF.estilo, movimiento: g.movimiento ?? NIVELES_DEF.movimiento };
  } catch { return { ...NIVELES_DEF }; }
}
function guardarNiveles(o) { try { localStorage.setItem(LS_NIVELES, JSON.stringify(o)); } catch { /* sin localStorage: no pasa nada */ } }
// Cabecera del panel: nombre del tipo y su icono (los mismos glifos del árbol de capas)
const TIPO_ES = { page: 'Página', section: 'Sección', container: 'Contenedor', heading: 'Título', text: 'Texto', button: 'Botón', image: 'Imagen', icon: 'Icono' };
const GLIFO_TIPO = { page: '▤', section: '▭', container: '▢', heading: 'H', text: '¶', button: '⬭', image: '▣', icon: '✦' };

const esc =(s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** '#abc' -> '#aabbcc'; si no es hex devuelve null (el picker no admite rgba/gradientes). */
function aHex(v) {
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
  return null;
}

/** Aviso si un valor CSS no sirve (vacío = todo bien). El valor se guarda igual: solo se avisa. */
function avisoCss(key, v) {
  v = String(v ?? '').trim();
  if (!v) return '';
  const ok = key === 'aspectRatio' || key === 'hijosAspectRatio' ? aspectoValido(v) : typeof CSS === 'undefined' || CSS.supports(kebab(key), v);
  return ok ? '' : 'El navegador no entiende este valor y lo ignora (¿falta la unidad? ej. 900px).';
}

/** Mensaje de aviso con su triángulo SVG (el texto va escapado). */
const avisoHtml = (msg) => `${SVG_AVISO}${esc(msg)}`;

/** Etiqueta de un campo; en móvil marca con ● los que tienen un valor propio (pisan el de escritorio). */
const etiqueta = (texto, ov) => `<label${ov ? ' class="ov" title="Solo en móvil: este valor pisa el de escritorio"' : ''}>${texto}</label>`;

/** Campo de texto con valor CSS crudo + su aviso de validez. */
function htmlTexto(key, v, placeholder, texto, ov, compacto = false) {
  const av = avisoCss(key, v);
  return `<div class="campo${compacto ? ' v' : ''}">${etiqueta(texto, ov)}<input data-s="${key}" class="${av ? 'invalido' : ''}" value="${esc(v)}" placeholder="${esc(placeholder)}"></div>` +
    `<p class="aviso-css" data-aviso-css${av ? '' : ' hidden'}>${av ? avisoHtml(av) : ''}</p>`;
}

/** Control visual (botones) de un campo con kind de controles.js. Escribe los mismos strings CSS de siempre. */
function htmlControl(f, v, modo, ov, tieneValor) {
  const m = modeloControl(f, v, modo);
  let botones;
  if (f.kind === 'estiloBoton') {
    // Cada botón lleva un dibujito del estilo y escribe background + color + border a la vez (data-est = estilo; el quitar usa data-est="")
    const dib = { relleno: '<rect x="2" y="2" width="24" height="14" fill="currentColor"/>',
      contorno: '<rect x="2.5" y="2.5" width="23" height="13" fill="none" stroke="currentColor" stroke-width="1.6"/>',
      suave: '<rect x="2" y="2" width="24" height="14" fill="currentColor" fill-opacity=".2"/><rect x="8" y="8" width="12" height="2" fill="currentColor"/>' };
    botones = m.opciones.map((o) => `<button type="button" class="forma ${o.on ? 'on' : ''}" data-est="${o.k}" title="${o.txt}"><svg viewBox="0 0 28 18" width="28" height="18" aria-hidden="true">${dib[o.k]}</svg>${o.txt}</button>`).join('');
  } else if (f.kind === 'tamanoBoton') {
    // Cada botón escribe padding Y fontSize a la vez (data-tam = tamaño; el quitar usa data-tam="")
    botones = m.opciones.map((o) => `<button type="button" data-tam="${o.k}" title="padding ${esc(o.vals.padding)} · ${esc(o.vals.fontSize)}" class="${o.on ? 'on' : ''}">${o.txt}</button>`).join('');
  } else if (f.kind === 'forma') {
    // Cada botón lleva un dibujito de la forma (un rectángulo con ese redondeo)
    botones = m.opciones.map((o) => `<button type="button" class="forma ${o.on ? 'on' : ''}" data-ctl="${f.key}" data-val="${esc(o.val)}" title="${o.txt} (${o.val})"><svg viewBox="0 0 28 18" width="28" height="18" aria-hidden="true"><rect x="2" y="2" width="24" height="14" rx="${o.r === 999 ? 7 : o.r / 2}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>${o.txt}</button>`).join('');
  } else {
    botones = m.opciones.map((o) => `<button type="button" data-ctl="${f.key}" data-val="${esc(o.val)}" class="${o.on ? 'on' : ''}">${o.txt}</button>`).join('');
  }
  const otro = m.sinOtro ? '' : `<button type="button" data-ctl-otro="${f.key}" class="${m.personalizado ? 'on' : ''}" title="Escribir otro valor CSS (en Avanzado)">Otro</button>`;
  const min = m.min != null ? `<span class="mini">mín. <input type="number" min="50" step="10" data-ctl-min="${f.key}" value="${m.min}"> px</span>` : '';
  const quitar = !tieneValor ? '' : f.kind === 'tamanoBoton'
    ? `<button type="button" class="quitar" data-tam="">${modo === 'mobile' ? '↺ igual que escritorio' : '✕ quitar'}</button>`
    : f.kind === 'estiloBoton'
    ? `<button type="button" class="quitar" data-est="">${modo === 'mobile' ? '↺ igual que escritorio' : '✕ quitar'}</button>`
    :`<button type="button" class="quitar" data-ctl="${f.key}" data-val="">${modo === 'mobile' ? '↺ igual que escritorio' : '✕ quitar'}</button>`;
  return `<div class="campo ctl">${etiqueta(f.label, ov)}<div class="botones${modo === 'mobile' && !ov ? ' heredado' : ''}">${botones}${otro}${min}${quitar}</div></div>`;
}

/** Campo "Sombra": presets (botones) + números y color si hay sombra. Los presets escriben el mismo valor que escribirías a mano
 *  (data-ctl="sombra", como los demás controles); los números/color se leen del DOM en el listener de 'input' (data-sh). */
function htmlSombra(f, v, modo, ov, tieneValor, nodo) {
  const movil = modo === 'mobile';
  const l = leerSombraUi(v);
  const tecnica = modoSombra(nodo); // 'texto' | 'plano' | false
  const donde = tecnica === 'texto' ? 'Sigue las letras (text-shadow).' : tecnica === 'plano' ? 'Sigue la forma del icono o la imagen (si la imagen tiene transparencia, sigue su silueta; si es un rectángulo opaco, un rectángulo).' : 'Sigue la caja del elemento y sus esquinas.';
  const botones = PRESETS_SOMBRA.map((p) => {
    const val = p.k === 'ninguna' ? (movil ? 'none' : '') : p.val;
    const on = p.k === 'ninguna' ? l.tipo === 'ninguna' && (!movil || ov || v !== '') : l.tipo === 'preset' && l.k === p.k;
    return `<button type="button" data-ctl="sombra" data-val="${esc(val)}" class="${on ? 'on' : ''}" title="${esc(p.ayuda)}">${p.txt}</button>`;
  }).join('');
  const custom = `<button type="button" data-sh-custom class="${l.tipo === 'custom' ? 'on' : ''}" title="Elegir tú el desplazamiento, el desfoque y el color">Personalizada</button>`;
  const quitar = tieneValor ? `<button type="button" class="quitar" data-ctl="sombra" data-val="">${movil ? '↺ igual que escritorio' : '✕ quitar'}</button>` : '';
  let h = `<div class="campo ctl">${etiqueta(f.label, ov)}<div class="botones${movil && !ov ? ' heredado' : ''}">${botones}${custom}${quitar}</div></div>`;
  if (l.tipo === 'otro') return h + '<p class="modo">Esta sombra tiene varias capas o un formato especial: se respeta tal cual. Elige un preset para reemplazarla.</p>';
  if (l.tipo === 'ninguna') return h;
  const c = l.capa, col = colorSombra(c.color);
  const px = (t) => Math.round(parseFloat(t) || 0);
  const anillo = px(c.x) === 0 && px(c.y) === 0 && px(c.blur) === 0;
  const campoNum = (k, txt, val, min, max) => `<label class="sh-n">${txt}<input type="number" data-sh="${k}" min="${min}" max="${max}" step="1" value="${val}"></label>`;
  h += `<div class="sombra-ed" data-sombra-ed>` +
    `<div class="fila" style="--n:${tecnica === false || anillo ? 4 : 3}">${campoNum('x', 'Horizontal', px(c.x), -200, 200)}${campoNum('y', 'Vertical', px(c.y), -200, 200)}${campoNum('blur', 'Desfoque', px(c.blur), 0, 200)}${tecnica === false || anillo ? campoNum('spread', anillo && tecnica ? 'Grosor' : 'Expansión', px(c.spread), -100, 100) : ''}</div>` +
    `<div class="campo"><label>Color</label><span class="color"><input type="color" data-sh="hex" value="${col.hex}" aria-label="Color de la sombra"></span></div>` +
    `<div class="campo rango"><label>Opacidad</label><span class="rango-fila"><input type="range" min="0" max="100" step="1" data-sh="alfa" value="${Math.round(col.alfa * 100)}"><output data-sh-out>${Math.round(col.alfa * 100)}%</output></span></div>` +
    `<p class="modo">${donde}</p></div>`;
  return h;
}

/** Grupo "Marquesina": controles visuales (botones). Cada botón lleva data-mq="campo" y data-val; "Repetición" va en Avanzado. */
function htmlMarq(mq, abierto) {
  const b = (k, val, txt, on, title = '') => `<button type="button" data-mq="${k}" data-val="${val}" class="${on ? 'on' : ''}"${title ? ` title="${esc(title)}"` : ''}>${txt}</button>`;
  const fila = (label, botones, extra = '') => `<div class="campo ctl"><label>${label}</label><div class="botones">${botones}${extra}</div></div>`;
  const velPreset = MQ_VELOCIDADES.some(([, , seg]) => seg === mq.vel);
  const reps = MQ_COPIAS.map((n) => b('copias', n, n, mq.copias === n)).join('');
  return '<h3>Marquesina</h3>' +
    fila('Movimiento', b('mov', 1, 'Con movimiento', mq.mov) + b('mov', 0, 'Sin movimiento (fija)', !mq.mov)) +
    (mq.mov ? fila('Velocidad', MQ_VELOCIDADES.map(([, txt, seg]) => b('vel', seg, txt, mq.vel === seg, `${seg} s por vuelta`)).join('')) +
      `<div class="campo"><label>Segundos por vuelta</label><input type="number" min="${MQ_VEL_MIN}" max="${MQ_VEL_MAX}" step="1" data-mq-num="vel" value="${mq.vel}" class="${velPreset ? '' : 'on'}"></div>` +
      fila('Dirección', b('dir', 'izq', '← Izquierda', mq.dir === 'izq') + b('dir', 'der', 'Derecha →', mq.dir === 'der')) +
      fila('Pausa al pasar el ratón', b('pausa', 1, 'Sí', mq.pausa) + b('pausa', 0, 'No', !mq.pausa)) : '') +
    fila('Separación', MQ_GAPS.map((g) => b('gap', g, `${g}`, mq.gap === g)).join(''), '<span class="mini">px</span>') +
    (mq.mov ? `<details class="avanzado" data-g="Marquesina"${abierto ? ' open' : ''}><summary>Más opciones</summary>` +
      fila('Repetición (copias de la tira)', reps) +
      '<p class="modo">Cuántas veces se repite la tira para que no queden huecos en pantallas anchas. Con pocos items o items cortos, sube el número. Solo cuenta en el HTML exportado y en la Vista previa. Los botones o enlaces de las copias repetidas no se pueden pulsar (solo los de la primera tira).</p></details>' : '') +
    '<p class="modo">En el editor la marquesina se ve quieta, con todos los items a la vista para editarlos; la animación se ve en 👁 Vista previa y en el export. Cada item es un elemento normal (selecciónalo en Capas o en el preview).</p>';
}

/** Sección "Estados (variants)": lista de estados con su disparo, lo que cambian y su tiempo. */
function htmlEstados(nodo, verActual) {
  const lista = nodo.animation?.variants ?? [];
  // "Enfocar" solo tiene sentido en botones (los únicos que reciben foco de teclado)
  const disparos = DISPAROS_VARIANT.filter(([v]) => v !== 'focus' || nodo.type === 'button');
  let h = `<h3>Estados (hover, clic…)</h3>
    <p class="modo"><strong>reposo</strong> = el aspecto normal del elemento. Cada estado cambia solo lo que rellenes; si dos coinciden, gana el de más abajo.</p>`;
  lista.forEach((s, i) => {
    const viendo = verActual?.id === nodo.id && verActual.estado === s.id;
    const opts = disparos.map(([v, t]) => `<option value="${v}" ${v === s.trigger ? 'selected' : ''}>${t}</option>`).join('');
    h += `<div class="variante" data-vs="${esc(s.id)}">
      <div class="vhead">
        <input data-v="name" value="${esc(s.name)}" title="Nombre del estado">
        <button data-vact="ver" class="${viendo ? 'on' : ''}" title="Ver este estado en el preview (no se exporta)">${viendo ? 'Dejar de ver' : 'Ver'}</button>
        <button data-vact="vup" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button data-vact="vdown" title="Bajar" ${i === lista.length - 1 ? 'disabled' : ''}>↓</button>
        <button data-vact="vdel" class="borrar" title="Borrar estado">✕</button>
      </div>
      <div class="campo"><label>Se dispara</label><select data-v="trigger">${opts}</select></div>
      <p class="modo">Qué cambia (vacío = no cambia)</p>`;
    for (const f of CAMPOS_PROPS) {
      const v = s.props?.[f.key] ?? '';
      if (f.kind === 'color') {
        h += `<div class="campo"><label>${f.label}</label><span class="color"><input type="color" data-vpick="${f.key}" value="${aHex(v) ?? '#000000'}"><input data-vp="${f.key}" value="${esc(v)}" placeholder="sin cambio"></span></div>`;
      } else if (f.kind === 'text') {
        h += `<div class="campo"><label>${f.label}</label><input data-vp="${f.key}" value="${esc(v)}" placeholder="${esc(f.placeholder)}"></div>`;
      } else {
        h += `<div class="campo"><label>${f.label}</label><input type="number" data-vp="${f.key}" data-num step="${f.step ?? 1}" value="${v}" placeholder="sin cambio"></div>`;
      }
    }
    h += '<p class="modo">Cómo viaja</p>';
    for (const f of CAMPOS_TIEMPO) {
      if (f.cuando && !f.cuando(s)) continue;
      const v = s[f.key] ?? DEF_TIEMPO[f.key] ?? '';
      if (f.kind === 'select') {
        const o = f.options.map(([val, t]) => `<option value="${esc(val)}" ${val === String(v) ? 'selected' : ''}>${t}</option>`).join('');
        h += `<div class="campo"><label>${f.label}</label><select data-v="${f.key}">${o}</select></div>`;
      } else {
        h += `<div class="campo"><label>${f.label}</label><input type="number" data-v="${f.key}" data-num step="${f.step ?? 1}" min="${f.min ?? 0}" value="${v}"></div>`;
      }
    }
    if (s.trigger === 'click') h += '<p class="modo">Un clic activa el estado y otro clic vuelve a reposo. El .html exportado lleva un script de unas líneas.</p>';
    h += '</div>';
  });
  return h + '<button class="vadd" data-vact="add">+ Añadir estado</button>';
}

/** Mensaje de validación del ancla (vacío si todo bien). */
function avisoAncla(page, nodo, valor) {
  if (!valor) return 'Para enlazar: <code>#nombre</code>';
  if (!anchorValido(valor)) return SVG_AVISO + 'Inválida: empieza con letra; solo letras, números y guiones. No se guarda.';
  if (contarAncla(page, valor, nodo.id) > 0) return `${SVG_AVISO}"${esc(valor)}" ya existe en otra parte de la página (se repite).`;
  return `Enlace: <code>#${esc(valor)}</code>`;
}

export function initInspector(host) {
  let idDibujado = null; // id del nodo para el que está construido el panel
  let huboGesto = false; // un arrastre de tirador actualizó el panel sin reconstruirlo
  let forzar = false; // un select pidió reconstruir el panel
  let claveSlider = null; // gesto de un slider (input range) en curso: de la primera `input` hasta `change` (soltar); todo el arrastre = 1 paso de Undo
  let contSliders = 0;
  const abiertos = new Set(); // grupos cuyo "Avanzado" el usuario abrió (se conservan al reconstruir el panel)

  function dibujar() {
    const { page, selectedId, viewMode } = getState();
    const nodo = selectedId ? findNode(page, selectedId) : null;
    const idPrevio = idDibujado;
    if ((nodo?.id ?? null) !== idDibujado) abiertos.clear();
    idDibujado = nodo?.id ?? null;
    if (!nodo) {
      host.innerHTML = '<div class="insp-cuerpo"><h2>Propiedades</h2><p class="vacio">Haz clic en un elemento del preview.<br><br>Doble clic en un texto para escribir directamente.</p></div>';
      return;
    }
    const estilos = effectiveStyles(nodo, viewMode);
    const scrollPrevio = idPrevio === idDibujado ? (host.querySelector('.insp-cuerpo')?.scrollTop ?? 0) : 0;

    // ---- Cabecera fija: icono + nombre + tipo (+ modo) y las acciones ----
    let acciones = '';
    if (nodo.type !== 'page') {
      const padre = findParent(page, nodo.id);
      const i = padre.children.indexOf(nodo);
      acciones = `<div class="acciones">
        <button data-act="up" title="Subir (Alt+↑)" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button data-act="down" title="Bajar (Alt+↓)" ${i === padre.children.length - 1 ? 'disabled' : ''}>↓</button>
        <button data-act="dup" title="Duplicar (Ctrl+D)">⧉</button>
        <button data-act="del" class="borrar" title="Borrar (Supr)">✕</button>
      </div>`;
    }
    const cabecera = `<header class="insp-cab"><span class="insp-ico" aria-hidden="true">${GLIFO_TIPO[nodo.type] ?? '▭'}</span>
      <div class="insp-nom"><input data-name value="${esc(nodo.name)}" aria-label="Nombre del elemento" title="Nombre del elemento">
      <span class="insp-tipo">${TIPO_ES[nodo.type] ?? nodo.type} · <b>${viewMode === 'mobile' ? 'Móvil' : 'Escritorio'}</b></span></div>${acciones}</header>`;

    // ---- Los 3 acordeones (Contenido / Estilo / Movimiento): cada pieza se añade al que le toca ----
    const N = { contenido: '', estilo: '', movimiento: '' };
    let cima = ''; // texto y enlace del elemento: SIEMPRE arriba, fuera de los acordeones

    // Contenido (texto, enlace, imagen, icono)
    const c = nodo.content;
    let cont = '', contAv = '';
    if (nodo.type === 'page') {
      cont += `<div class="campo"><label>Título</label><input data-c="title" value="${esc(c.title)}"></div>`;
      contAv += `<h3>Página</h3><div class="campo"><label>Scroll suave</label><select data-c="smoothScroll" data-bool><option value="no" ${c.smoothScroll ? '' : 'selected'}>No</option><option value="si" ${c.smoothScroll ? 'selected' : ''}>Sí</option></select></div>
        <p class="modo">Solo la rueda del mouse en escritorio (táctil, teclado, barra y anclas quedan nativos). Se ve en el HTML exportado, no en este preview.</p>`;
    }
    if (nodo.type === 'icon') {
      const botones = Object.entries(ICONOS).map(([k, ic]) => `<button type="button" data-icono="${k}" title="${esc(ic.t)}" aria-label="${esc(ic.t)}" aria-pressed="${c.name === k}" class="${c.name === k ? 'on' : ''}">${iconoSvg(k, 18)}</button>`).join('');
      cont += `<div class="campo"><label>Icono</label></div><div class="icono-grid" role="group" aria-label="Elegir icono">${botones}</div>`;
    }
    if (TIPOS_TEXTO.includes(nodo.type)) cima += `<div class="campo v"><label>Texto</label><textarea data-c="text" rows="3">${esc(c.text)}</textarea></div>`;
    if (nodo.type === 'heading') {
      cima += `<div class="campo"><label>Nivel</label><select data-c="level" data-num>${[1, 2, 3, 4].map((n) => `<option value="${n}" ${+c.level === n ? 'selected' : ''}>H${n}</option>`).join('')}</select></div>`;
    }
    if (nodo.type === 'button') cima += `<div class="campo"><label>Enlace</label><input data-c="href" value="${esc(c.href)}" placeholder="https://wa.me/506..."></div>`;
    if (nodo.type === 'image') {
      cont += `<div class="campo"><label>URL</label><input data-c="src" value="${esc(c.src?.startsWith('data:') ? '' : c.src)}" placeholder="https://..."></div>
        <div class="campo v"><label>Archivo</label><input type="file" accept="image/*" data-file></div>
        <div class="campo"><label>Texto alterno</label><input data-c="alt" value="${esc(c.alt)}"></div>`;
    }
    if (nodo.type === 'section' || nodo.type === 'container') {
      contAv += `<h3>Ancla</h3><div class="campo"><label>Ancla (id)</label><input data-anchor value="${esc(c.anchor)}" placeholder="contacto"></div>
        <p class="modo" data-aviso-ancla>${avisoAncla(page, nodo, c.anchor ?? '')}</p>`;
    }
    if (cont && nodo.type !== 'page') N.contenido += cont;
    let iaPage = '';
    if (nodo.type === 'page') {
      iaPage = `<h3>Landing con IA</h3>
        <p class="modo">Pídele a cualquier IA de chat una landing: pégale la guía y carga aquí lo que devuelva.</p>
        <div class="ia-botones"><button type="button" data-ia="copiar">${SVG_COPIAR} Copiar guía para IA</button><button type="button" data-ia="pegar">${SVG_PEGAR} Pegar plan o JSON</button></div>`;
    }
    // Menú hamburguesa en móvil: solo en el Navbar (sección con "nav" en el nombre o que ya lo tiene activado)
    if (nodo.type === 'section' && (c.menuMovil === true || /nav/i.test(nodo.name))) {
      contAv += `<h3>Menú en móvil</h3><div class="campo"><label>Menú hamburguesa en móvil</label><select data-c="menuMovil" data-bool><option value="no" ${c.menuMovil ? '' : 'selected'}>No</option><option value="si" ${c.menuMovil ? 'selected' : ''}>Sí</option></select></div>
        <p class="modo">En móvil el primer elemento (el logo) queda visible y todo lo demás va al panel de la hamburguesa. El panel se superpone al contenido. En la vista móvil del editor empieza cerrado: ábrelo con la hamburguesa o seleccionando un enlace desde Capas.</p>`;
    }

    // El nodo page NO usa acordeones: vista plana con todo visible (Contenido, Página, IA y luego los grupos de estilo en orden)
    const planoPage = nodo.type === 'page';
    let planoCab = '', planoEstilos = '';
    if (planoPage) planoCab = (cont ? `<h3>Contenido</h3>${cont}` : '') + contAv + iaPage;
    else N.contenido += contAv; // ancla y menú móvil (solo secciones/contenedores) van en el acordeón Contenido

    const mq = usaMarquesina(nodo);
    if (mq) N.movimiento += htmlMarq(mq, abiertos.has('Marquesina')); // la marquesina ES movimiento

    // ---- Estilos: cada grupo va ENTERO al acordeón que dice su `acordeon` en fields.js ----
    let gruposMov = ''; // grupos de fields.js que viven en Movimiento (hoy: Pegado al hacer scroll)
    for (const g of GRUPOS) {
      if (!g.tipos.includes(nodo.type)) continue;
      const visibles = g.campos.filter((f) => (!f.tipos || f.tipos.includes(nodo.type)) && (!f.cuando || f.cuando(estilos)));
      const acordeon = g.acordeon ?? 'estilo'; // el grupo entero vive en UN acordeón
      let G = ''; // HTML de este grupo
      let filaAbierta = null; // fila de columnas pendiente: { id, items }
      const cerrarFila = () => { const r = filaAbierta; if (!r) return; G += `<div class="fila" style="--n:${r.items.length}">${r.items.join('')}</div>`; filaAbierta = null; };
      const poner = (h, filaId) => {
        if (filaId) {
          if (filaAbierta?.id !== filaId) { cerrarFila(); filaAbierta = { id: filaId, items: [] }; }
          filaAbierta.items.push(h);
        } else { cerrarFila(); G += h; }
      };
      const conControl = []; // campos con control visual: su valor CSS crudo va en "Escribir el valor a mano" al final del grupo
      for (const f of visibles) {
        const v = estilos[f.key] ?? '';
        const ov = viewMode === 'mobile' && f.key in nodo.styles.mobile; // en móvil: ¿tiene valor propio?
        let h = '';
        if (f.kind === 'fondoImagen') {
          const quitar = `<button type="button" class="quitar" data-ctl="fondoImagen" data-val="">${viewMode === 'mobile' ? '↺ igual que escritorio' : '✕ Quitar'}</button>`;
          h = `<div class="campo ctl">${etiqueta(f.label, ov)}<div class="botones${viewMode === 'mobile' && !ov ? ' heredado' : ''}">` +
            `<label class="subir">Subir imagen<input type="file" accept="image/*" data-fondo-file style="position:absolute;width:1px;height:1px;opacity:0"></label>${quitar}</div></div>` +
            `<div class="campo"><label>…o pega una URL</label><input data-fondo-url value="${esc(v.startsWith('data:') ? '' : v)}" placeholder="${v.startsWith('data:') ? '(imagen subida)' : 'https://…'}"></div>` +
            '<p class="fondo-msg" data-fondo-msg hidden></p>';
        } else if (f.kind === 'iconoTamano') {
          const px = parseFloat(v) || TAMANO_ICONO_DEFECTO; // efectivo (en móvil: ya mezclado con escritorio)
          const tieneValor = viewMode === 'mobile' ? ov : f.key in nodo.styles.base;
          const preset = TAMANOS_ICONO.includes(px) && (v === '' || /^\d+(\.\d+)?px$/.test(String(v)));
          const bs = TAMANOS_ICONO.map((t) => `<button type="button" data-isz="${t}" class="${preset && t === px ? 'on' : ''}">${t}</button>`).join('');
          const quitar = tieneValor ? `<button type="button" class="quitar" data-isz="">${viewMode === 'mobile' ? '↺ igual que escritorio' : '✕ quitar'}</button>` : '';
          h = `<div class="campo ctl">${etiqueta(f.label, ov)}<div class="botones${viewMode === 'mobile' && !ov ? ' heredado' : ''}">${bs}<button type="button" data-isz-otro class="${preset ? '' : 'on'}" title="Escribir otro tamaño">Otro</button><span class="mini"><input type="number" min="4" max="512" step="1" data-isz-num value="${Math.round(px)}" aria-label="Tamaño en px"> px</span>${quitar}</div></div>`;
        } else if (f.kind === 'fondoCapa') {
          const n = capaValida(v) ?? 0;
          h = `<div class="campo rango">${etiqueta(f.label, ov)}<span class="rango-fila"><input type="range" min="0" max="80" step="1" data-capa value="${n}"><output data-capa-out>${n}%</output></span></div>` +
            (ov || (viewMode !== 'mobile' && f.key in nodo.styles.base) ? `<div class="campo ctl"><label></label><div class="botones"><button type="button" class="quitar" data-ctl="fondoCapa" data-val="">${viewMode === 'mobile' ? '↺ igual que escritorio' : '✕ quitar'}</button></div></div>` : '');
        } else if (f.kind === 'sombra') {
          h = htmlSombra(f, v, viewMode, ov, viewMode === 'mobile' ? ov : f.key in nodo.styles.base, nodo);
        } else if (KINDS_BOTONES.includes(f.kind)) {
          const tieneValor = viewMode === 'mobile' ? ov : f.key in nodo.styles.base;
          h = htmlControl(f, v, viewMode, ov, tieneValor);
        } else if (f.kind === 'estiloBoton') {
          // Mira background, color y border a la vez; sin "Valor CSS exacto" (sus campos crudos son Fondo, Color y Borde, más abajo)
          const dest = viewMode === 'mobile' ? nodo.styles.mobile : nodo.styles.base;
          const tieneValor = ['background', 'color', 'border'].some((k) => k in dest);
          h = htmlControl(f, { background: estilos.background, color: estilos.color, border: estilos.border }, viewMode, viewMode === 'mobile' && tieneValor, tieneValor);
        } else if (KINDS_CONTROL.includes(f.kind)) {
          // Tamaño de botón mira padding y fontSize a la vez; los demás, su propia clave
          const claves = (f.crudos ?? [{ key: f.key }]).map((c) => c.key);
          const dest = viewMode === 'mobile' ? nodo.styles.mobile : nodo.styles.base;
          const tieneValor = claves.some((k) => k in dest);
          const ovC = viewMode === 'mobile' && tieneValor;
          const vC = f.kind === 'tamanoBoton' ? { padding: estilos.padding, fontSize: estilos.fontSize } : v;
          h = htmlControl(f, vC, viewMode, ovC, tieneValor);
          conControl.push({ f, v, ov: ovC, personalizado: modeloControl(f, vC, viewMode).personalizado, estilos });
        } else if (f.kind === 'nota') {
          h = `<p class="modo">${f.texto}</p>`;
        } else if (f.kind === 'select') {
          // En móvil, un select cuyo '' es un valor real (vacioMovil) separa dos cosas: '' = "Igual que escritorio"
          // (sin override) y el valor explícito (ej. static) = "Normal en móvil". El valor mostrado es solo el override móvil.
          let opciones = f.options, vSel = v;
          if (viewMode === 'mobile' && f.vacioMovil) {
            opciones = [['', 'Igual que escritorio'], [f.vacioMovil, f.vacioTexto ?? f.options[0][1]], ...f.options.slice(1)];
            vSel = nodo.styles.mobile[f.key] ?? '';
          }
          const opts = opciones.map(([val, txt]) => `<option value="${esc(val)}" ${val === String(vSel) ? 'selected' : ''}>${txt}</option>`).join('');
          h = `<div class="campo${f.fila ? ' v' : ''}">${etiqueta(f.label, ov)}<select data-s="${f.key}">${opts}</select></div>`;
        } else if (f.kind === 'color') {
          const av = avisoCss(f.key, v);
          h = `<div class="campo${f.fila ? ' v' : ''}">${etiqueta(f.label, ov)}<span class="color"><input type="color" data-pick="${f.key}" class="${aHex(v) ? '' : 'sin-valor'}" value="${aHex(v) ?? '#000000'}" aria-label="Elegir color: ${esc(f.label)}"><input data-s="${f.key}" class="${av ? 'invalido' : ''}" value="${esc(v)}" placeholder="#ffffff"></span></div><p class="aviso-css" data-aviso-css${av ? '' : ' hidden'}>${av ? avisoHtml(av) : ''}</p>`;
        } else {
          h = htmlTexto(f.key, v, f.placeholder, f.label, ov, !!f.fila);
        }
        // En una fila de columnas, campo + aviso van juntos en una celda
        poner(f.fila ? `<div class="celda">${h}</div>` : h, f.fila);
      }
      cerrarFila();
      if (conControl.length) {
        // campos de texto crudos de cada control (tamanoBoton tiene dos: padding y fontSize)
        const crudosDe = (c) => (c.f.crudos ?? [{ key: c.f.key, label: c.f.crudo ?? c.f.label, placeholder: c.f.placeholder }])
          .map((r) => ({ ...r, v: c.estilos[r.key] ?? '', ov: viewMode === 'mobile' && r.key in nodo.styles.mobile }));
        const abrir = abiertos.has(g.titulo) || conControl.some((c) => c.personalizado || crudosDe(c).some((r) => avisoCss(r.key, r.v)));
        G += `<details class="avanzado" data-g="${esc(g.titulo)}"${abrir ? ' open' : ''}><summary>Escribir el valor a mano</summary>` +
          conControl.map((c) => crudosDe(c).map((r) => htmlTexto(r.key, r.v, r.placeholder, r.label, r.ov)).join('')).join('') + '</details>';
      }
      if (!G) continue;
      if (planoPage) planoEstilos += `<h3>${g.titulo}</h3>` + G; // vista plana: todos los grupos seguidos
      else if (acordeon === 'movimiento') gruposMov += `<h3>${g.titulo}</h3>` + G; // se añade después de las animaciones
      else N[acordeon] += `<h3>${g.titulo}</h3>` + G;
    }

    // ---- Animaciones (los grupos viven en src/animations/) ----
    for (const g of GRUPOS_ANIM) {
      if (!g.tipos.includes(nodo.type)) continue;
      // "Paso de escena" solo se ofrece a hijos directos de una escena (o si ya lo tienen puesto)
      if (g.soloEnEscena && !nodo.animation?.[g.id] && !findParent(page, nodo.id)?.animation?.scene?.steps) continue;
      if (g.propio) { N.movimiento += htmlEstados(nodo, getState().verEstado); continue; } // los estados tienen su propia sección
      const datos = nodo.animation?.[g.id]; // undefined = grupo apagado
      let h = `<h3>${g.titulo}</h3>`;
      if (g.id === 'scene' && datos) h += '<p class="modo">La sección se queda fija y sus hijos se apilan en el mismo lugar: se respetan Alineación y Justificar (y su fondo, borde y padding); Dirección, Separación y Columnas no se usan. Una vez creada, cada hijo directo tiene su "Paso de escena". Solo se ve en Vista previa y en el exportado. "Transición (% del tramo)" = cuánto dura el cambio entre pasos dentro de cada tramo (el resto del tramo el paso queda quieto). Un navbar pegado arriba se mide solo (o escribe "Espacio arriba").</p>';
      // Parallax: si un ancestro tiene scroll real (overflow auto/scroll) el efecto nativo no se mueve ahí (solo se avisa)
      if (g.id === 'parallax' && datos?.effect && ancestrosConScroll(page, nodo.id, viewMode).length) {
        h += `<p class="modo aviso-parallax">${SVG_AVISO} Un contenedor de arriba tiene scroll propio (overflow auto/scroll): ahí el parallax no se moverá. Quita ese scroll o usa "Recortar contenido".</p>`;
      }
      for (const f of g.campos) {
        if (f.key !== g.principal && !datos) continue; // apagado: solo se ve el selector principal
        if (f.cuando && !f.cuando(datos, datos?.effect, nodo)) continue;
        const v = datos?.[f.key] ?? g.defaults[f.key] ?? '';
        const a = `data-a="${g.id}.${f.key}"`;
        if (f.kind === 'select') {
          const vSel = f.key === g.principal ? (datos?.[f.key] ?? '') : v;
          const opts = (f.opcionesNodo ? f.opcionesNodo(nodo) : f.options).map(([val, txt]) => `<option value="${esc(val)}" ${val === String(vSel) ? 'selected' : ''}>${txt}</option>`).join('');
          h += `<div class="campo"><label>${f.label}</label><select ${a}>${opts}</select></div>`;
        } else if (f.kind === 'color') {
          h += `<div class="campo"><label>${f.label}</label><input type="color" ${a} value="${aHex(v) ?? '#7c5cff'}"></div>`;
        } else {
          h += `<div class="campo"><label>${f.label}</label><input type="number" ${a} data-num step="${f.step ?? 1}" min="${f.min ?? 0}"${f.max != null ? ` max="${f.max}"` : ''} value="${v}"></div>`;
        }
      }
      N.movimiento += h;
    }
    N.movimiento += gruposMov; // Pegado al hacer scroll
    if (nodo.type !== 'page') N.movimiento += '<h3>Copiar y pegar efectos</h3><div class="efectos-acciones">'
      + '<button type="button" data-efectos="copiar" title="Ctrl+Alt+C">Copiar efectos</button>'
      + '<button type="button" data-efectos="pegar" title="Ctrl+Alt+V">Pegar efectos</button>'
      + '<button type="button" data-efectos="hermanos" title="Pega en este y en sus hermanos del mismo tipo">Pegar en hermanos del mismo tipo</button></div>';

    // JSON del nodo, plegado (útil para depurar); fuera de los acordeones, al final
    const { children, ...resto } = nodo;
    const jsonNodo = `<details class="json"><summary>JSON del nodo</summary><pre>${esc(JSON.stringify(resto, null, 2))}</pre></details>`;

    // ---- Montaje: texto/enlace fijos arriba, luego un <details> por acordeón (se recuerda cuáles dejó abiertos el usuario) ----
    const niveles = leerNiveles();
    let cuerpo = '';
    if (planoPage) cuerpo = `<div class="nivel-plano" data-plano>${planoCab}${planoEstilos}${jsonNodo}</div>`;
    else {
      if (cima) cuerpo += `<div class="insp-cima">${cima}</div>`;
      for (const [k, titulo] of ACORDEONES) {
        if (!N[k]) continue;
        cuerpo += `<details class="nivel nivel-${k}" data-nivel="${k}"${niveles[k] ? ' open' : ''}><summary>${titulo}</summary><div class="nivel-cuerpo">${N[k]}</div></details>`;
      }
      cuerpo += `<div class="insp-pie">${jsonNodo}</div>`;
    }
    host.innerHTML = cabecera + `<div class="insp-cuerpo">${cuerpo}</div>`;
    if (scrollPrevio) host.querySelector('.insp-cuerpo').scrollTo({ top: scrollPrevio, behavior: 'instant' }); // 'instant': el scroll-behavior:smooth del CSS lo animaba desde 0 (rebote)
  }

  // Clave de gesto del slider: la misma de la primera `input` hasta `change`. Empieza por "gesto:" -> sin tope de tiempo y sin reconstruir el panel.
  const claveDeSlider = (id) => (claveSlider ??= `gesto:rng:${id}:${++contSliders}`);

  // ---- Eventos (delegados: un solo listener para todo el panel) ----
  host.addEventListener('input', (e) => {
    const t = e.target;
    const id = idDibujado;
    if (!id) return;
    // Mínimo (px) del modo Auto de Columnas: escribe repeat(auto-fit, minmax(Npx, 1fr)); no se reconstruye el panel (se pierde el foco)
    if (t.dataset.ctlMin) {
      if (+t.value > 0) setStyle(id, t.dataset.ctlMin, columnasAuto(+t.value));
      return;
    }
    if (t.dataset.mqNum !== undefined) { // Marquesina: segundos por vuelta libres (no se reconstruye el panel: se perdería el foco)
      const x = +t.value;
      if (x >= MQ_VEL_MIN && x <= MQ_VEL_MAX) setMarquesina(id, { vel: x });
      return;
    }
    if (t.dataset.iszNum !== undefined) { // Icono: tamaño libre (no se reconstruye el panel: se perdería el foco)
      if (+t.value > 0) setIconSize(id, Math.min(512, +t.value));
      return;
    }
    if (t.dataset.sh !== undefined) { // Sombra: números, color y opacidad -> un solo valor (no se reconstruye el panel: se perdería el foco)
      const ed = t.closest('[data-sombra-ed]');
      const g = (k) => ed.querySelector(`[data-sh="${k}"]`)?.value;
      if (t.dataset.sh === 'alfa') ed.querySelector('[data-sh-out]').textContent = `${t.value}%`;
      const valorSombra = armarSombra({ x: g('x'), y: g('y'), blur: g('blur'), spread: g('spread') ?? 0, hex: g('hex'), alfa: (+g('alfa')) / 100 });
      if (t.type === 'range') setEstilosGesto(id, { sombra: valorSombra }, [], claveDeSlider(id)); // slider: gesto (no reconstruye el panel hasta soltar)
      else setStyle(id, 'sombra', valorSombra);
      return;
    }
    // Un select puede mostrar/ocultar campos: pedimos reconstruir el panel (antes del cambio)
    if (t.tagName === 'SELECT' && (t.dataset.s || t.dataset.a || t.dataset.v)) forzar = true;
    // Estados (variants): los campos viven dentro de un [data-vs] con el id del estado
    const vs = t.closest('[data-vs]')?.dataset.vs;
    if (vs) {
      const num = t.dataset.num !== undefined;
      if (t.dataset.vpick) { // el selector de color rellena la caja de texto vecina
        t.nextElementSibling.value = t.value;
        setVariantProp(id, vs, t.dataset.vpick, t.value);
      } else if (t.dataset.vp) {
        const pick = t.previousElementSibling;
        if (pick?.dataset.vpick && aHex(t.value)) pick.value = aHex(t.value);
        setVariantProp(id, vs, t.dataset.vp, num ? (t.value === '' ? '' : +t.value) : t.value.trim());
      } else if (t.dataset.v) setVariant(id, vs, t.dataset.v, num ? (t.value === '' ? '' : +t.value) : t.value);
      return;
    }
    if (t.dataset.anchor !== undefined) {
      // Ancla: solo se guarda si es válida (o vacía); siempre se muestra el aviso
      const v = t.value.trim();
      const { page } = getState();
      const aviso = host.querySelector('[data-aviso-ancla]');
      if (aviso) aviso.innerHTML = avisoAncla(page, findNode(page, id), v);
      if (v === '' || anchorValido(v)) setContent(id, 'anchor', v || undefined);
      return;
    }
    if (t.dataset.fondoUrl !== undefined) { setStyle(id, 'fondoImagen', t.value.trim()); return; }
    if (t.dataset.capa !== undefined) { // deslizador de la capa oscura: muestra el valor y guarda
      host.querySelector('[data-capa-out]').textContent = `${t.value}%`;
      setEstilosGesto(id, { fondoCapa: t.value }, [], claveDeSlider(id)); // slider: gesto (no reconstruye el panel hasta soltar)
      return;
    }
    if (t.dataset.name !== undefined) setName(id, t.value);
    else if (t.dataset.a) {
      const [grupo, key] = t.dataset.a.split('.');
      const num = t.dataset.num !== undefined;
      setAnimation(id, grupo, key, num ? (t.value === '' ? '' : +t.value) : t.value);
    } else if (t.dataset.c) setContent(id, t.dataset.c, t.dataset.bool !== undefined ? (t.value === 'si' ? true : undefined) : t.dataset.num !== undefined ? +t.value : t.value);
    else if (t.dataset.pick) {
      // el selector de color rellena la caja de texto vecina
      t.nextElementSibling.value = t.value;
      setStyle(id, t.dataset.pick, t.value);
    } else if (t.dataset.s) {
      const pick = t.previousElementSibling;
      if (pick?.dataset.pick && aHex(t.value)) pick.value = aHex(t.value);
      if (t.dataset.s === 'position') setPosicion(id, t.value); // escribe también top/zIndex en un solo mutate
      else setStyle(id, t.dataset.s, t.value.trim());
      // Aviso en rojo si el navegador no entiende el valor (se guarda igual)
      const av = t.closest('.campo')?.nextElementSibling;
      if (t.tagName === 'INPUT' && av?.matches('[data-aviso-css]')) {
        const msg = avisoCss(t.dataset.s, t.value);
        t.classList.toggle('invalido', !!msg);
        av.hidden = !msg;
        av.innerHTML = msg ? avisoHtml(msg) : '';
      }
    }
  });

  // Controles visuales (botones de Columnas, Ancho máx., Centrar, Proporción): escriben el mismo string CSS que escribirías a mano.
  host.addEventListener('click', (e) => {
    const otro = e.target.closest('[data-ctl-otro]');
    if (otro) { // "Otro": abre Avanzado y deja el cursor en el campo de texto (no escribe nada)
      // (Estilo de botón no tiene Avanzado: lleva el cursor al campo Fondo de más abajo)
      const campo = host.querySelector(`details.avanzado [data-s="${otro.dataset.ctlOtro}"]`)
        ?? (otro.dataset.ctlOtro === 'background' ? host.querySelector('[data-s="background"]') : null);
      if (campo) { for (let det = campo.closest('details'); det; det = det.parentElement?.closest('details')) det.open = true; campo.focus(); }
      return;
    }
    if (e.target.closest('[data-sh-custom]') && idDibujado) { // Sombra "Personalizada": si no hay sombra escribe una de partida; si ya hay, lleva el cursor al primer número
      const ed = host.querySelector('[data-sombra-ed] [data-sh="x"]');
      if (ed) { ed.focus(); return; }
      forzar = true; setStyle(idDibujado, 'sombra', SOMBRA_PERSONALIZADA); return;
    }
    const mqb = e.target.closest('[data-mq]'); // Marquesina: botones visuales
    if (mqb && idDibujado) {
      const raw = mqb.dataset.val;
      forzar = true;
      setMarquesina(idDibujado, { [mqb.dataset.mq]: raw === '1' && ['mov', 'pausa'].includes(mqb.dataset.mq) ? true : raw === '0' && ['mov', 'pausa'].includes(mqb.dataset.mq) ? false : Number.isNaN(+raw) ? raw : +raw });
      return;
    }
    const ic = e.target.closest('[data-icono]'); // Icono: elegir de la cuadrícula
    if (ic && idDibujado) { forzar = true; setContent(idDibujado, 'name', ic.dataset.icono); return; }
    const sz = e.target.closest('[data-isz]'); // Icono: tamaño predefinido (o quitar)
    if (sz && idDibujado) { forzar = true; setIconSize(idDibujado, +sz.dataset.isz); return; }
    if (e.target.closest('[data-isz-otro]')) { host.querySelector('[data-isz-num]')?.focus(); return; }
    const tam = e.target.closest('[data-tam]'); // Tamaño de botón: padding + fontSize en una sola acción (un paso de Undo)
    if (tam && idDibujado) {
      forzar = true;
      const t = TAMANOS_BOTON.find((x) => x.k === tam.dataset.tam);
      setStyles(idDibujado, { padding: t?.padding ?? '', fontSize: t?.fontSize ?? '' });
      return;
    }
    const est = e.target.closest('[data-est]'); // Estilo de botón: background + color + border en una sola acción (un paso de Undo)
    if (est && idDibujado) {
      const nodo = findNode(getState().page, idDibujado);
      const e2 = effectiveStyles(nodo, getState().viewMode);
      const v = { background: e2.background, color: e2.color, border: e2.border };
      // pulsar el estilo que ya está activo no escribe nada
      if (est.dataset.est && leerEstiloBoton(v).k === est.dataset.est) return;
      forzar = true;
      setStyles(idDibujado, valoresEstiloBoton(est.dataset.est, v));
      return;
    }
    const b = e.target.closest('[data-ctl]');
    if (!b || !idDibujado) return;
    forzar = true; // reconstruir el panel para marcar el botón activo
    setStyle(idDibujado, b.dataset.ctl, b.dataset.val);
  });

  // Recuerda qué acordeones (Contenido / Estilo / Movimiento) dejó abiertos el usuario
  host.addEventListener('toggle', (e) => {
    const det = e.target;
    if (!det.matches?.('details.nivel')) return;
    const n = leerNiveles();
    if (n[det.dataset.nivel] !== det.open) { n[det.dataset.nivel] = det.open; guardarNiveles(n); }
  }, true);

  // Recuerda qué "Avanzado" abrió el usuario (el evento toggle no burbujea: se escucha en captura)
  host.addEventListener('toggle', (e) => {
    const det = e.target;
    if (!det.matches?.('details.avanzado')) return;
    if (det.open) abiertos.add(det.dataset.g); else abiertos.delete(det.dataset.g);
  }, true);

  // Landing con IA (solo en Ajustes de la página)
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ia]');
    if (!b) return;
    if (b.dataset.ia === 'copiar') copiarGuia(); else abrirDialogoPlan();
  });

  // Copiar / pegar efectos (el panel se redibuja solo: pegarEfectos emite 'efectos')
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-efectos]');
    const id = idDibujado;
    if (!b || !id) return;
    if (b.dataset.efectos === 'copiar') accionCopiarEfectos(id);
    else if (b.dataset.efectos === 'pegar') accionPegarEfectos([id]);
    else accionPegarEnHermanos(id);
  });

  // Botones ↑ ↓ ⧉ ✕ del elemento seleccionado
  host.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const id = idDibujado;
    if (!act || !id) return;
    forzar = true; // reconstruir el panel (los botones ↑ ↓ cambian de estado)
    if (act === 'up') moveBy(id, -1);
    else if (act === 'down') moveBy(id, 1);
    else if (act === 'dup') duplicateNode(id);
    else if (act === 'del') removeNode(id);
  });

  // Botones de los estados: añadir, ver, subir, bajar, borrar
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-vact]');
    const id = idDibujado;
    if (!b || !id || b.disabled) return;
    const vs = b.closest('[data-vs]')?.dataset.vs;
    forzar = true;
    const act = b.dataset.vact;
    if (act === 'add') addVariant(id);
    else if (act === 'vup') moveVariant(id, vs, -1);
    else if (act === 'vdown') moveVariant(id, vs, 1);
    else if (act === 'vdel') removeVariant(id, vs);
    else if (act === 'ver') {
      const ya = getState().verEstado;
      verEstado(id, ya?.id === id && ya.estado === vs ? null : vs);
    }
  });

  host.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'range') { // soltar el slider (o una flecha): fin del gesto; UNA reconstrucción para dejar botones y '✕ quitar' al día, devolviendo foco y scroll (cada flecha = un paso de Undo)
      claveSlider = null;
      if (!huboGesto) return;
      huboGesto = false;
      const marca = t.dataset.sh !== undefined ? `[data-sh="${t.dataset.sh}"]` : t.dataset.capa !== undefined ? '[data-capa]' : null;
      const cuerpo = host.querySelector('.insp-cuerpo');
      const top = cuerpo ? cuerpo.scrollTop : 0;
      dibujar();
      const nuevo = marca && host.querySelector(`input[type=range]${marca}`);
      if (nuevo) nuevo.focus({ preventScroll: true });
      const c2 = host.querySelector('.insp-cuerpo');
      if (c2 && Math.abs(c2.scrollTop - top) > 0.01) c2.scrollTo({ top, behavior: 'instant' });
      return;
    }
    if (t.tagName === 'SELECT' && t.dataset.c) return; // ya manejado en 'input'
    if (t.tagName === 'SELECT' && t.dataset.s) forzar = true; // puede mostrar/ocultar campos
    if (t.dataset.fondoFile !== undefined && t.files[0]) {
      const id = idDibujado, archivo = t.files[0];
      const msg = (txt, aviso = false) => { const p = host.querySelector('[data-fondo-msg]'); if (p) { if (aviso) p.innerHTML = avisoHtml(txt); else p.textContent = txt; p.hidden = !txt; } };
      msg('Procesando imagen…');
      reducirImagen(archivo).then((url) => { forzar = true; setStyle(id, 'fondoImagen', url); })
        .catch((err) => msg(err.message, true));
      return;
    }
    if (t.dataset.file !== undefined && t.files[0]) {
      const lector = new FileReader();
      lector.onload = () => { forzar = true; setContent(idDibujado, 'src', lector.result); };
      lector.readAsDataURL(t.files[0]);
    }
  });

  subscribe((state, cambio) => {
    if (cambio === 'selection' || cambio === 'view' || cambio === 'verestado' || cambio === 'efectos') return dibujar();
    if (cambio === 'text') return; // se escribe en el preview: no tocar el panel
    // Arrastre de un tirador: NO se reconstruye el panel (saltaba el scroll y se recreaban todos los nodos);
    // solo se ponen al día los campos de texto CSS. Al soltar (pointerup) se reconstruye UNA vez.
    if (cambio === 'page' && gestoActivo() && state.selectedId === idDibujado && idDibujado) {
      huboGesto = true;
      const nodo = findNode(state.page, idDibujado);
      const estilos = nodo && effectiveStyles(nodo, state.viewMode);
      if (estilos) host.querySelectorAll('input[data-s]').forEach((inp) => {
        const nuevo = estilos[inp.dataset.s] ?? '';
        if (inp !== document.activeElement && inp.value !== String(nuevo)) inp.value = nuevo;
      });
      return;
    }
    // Cambio de página: reconstruir solo si cambió el nodo, o se forzó, o el foco no está aquí
    const enfocado = host.contains(document.activeElement) && document.activeElement !== host;
    if (forzar || state.selectedId !== idDibujado || !enfocado) {
      forzar = false;
      dibujar();
    }
  });

  // Al soltar el tirador: una sola reconstrucción para que los controles visuales queden al día
  window.addEventListener('pointerup', () => { if (huboGesto && !claveSlider) { huboGesto = false; dibujar(); } });

  // Cuando se escribe en el preview, refresca la caja de "Texto" del panel
  subscribe((state, cambio) => {
    if (cambio !== 'text') return;
    const nodo = state.selectedId && findNode(state.page, state.selectedId);
    const area = host.querySelector('textarea[data-c="text"]');
    if (nodo && area && document.activeElement !== area) area.value = nodo.content.text ?? '';
  });

  dibujar();
}

// INSPECTOR (derecha): edita el nodo seleccionado.
// - Contenido (texto, enlace, imagen) + grupos de estilos definidos en fields.js.
// - Cada cambio llama a setStyle/setContent del store; el preview se redibuja.
// - Para no perder el foco al escribir, NO se reconstruye el panel en cambios de
//   página mientras el foco está dentro (salvo que cambie la selección o un
//   select altere qué campos se muestran: ahí se fuerza).

import { getState, subscribe, setStyle, setContent, setName, setAnimation, moveBy, duplicateNode, removeNode, addVariant, removeVariant, moveVariant, setVariant, setVariantProp, verEstado } from '../core/store.js';
import { findNode, findParent, anchorValido, contarAncla } from '../core/tree.js';
import { effectiveStyles, TIPOS_TEXTO } from '../render/renderer.js';
import { GRUPOS } from './fields.js';
import { GRUPOS_ANIM } from '../animations/index.js';
import { DISPAROS_VARIANT, CAMPOS_PROPS, CAMPOS_TIEMPO, DEF_TIEMPO } from '../animations/variants.js';

const esc =(s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** '#abc' -> '#aabbcc'; si no es hex devuelve null (el picker no admite rgba/gradientes). */
function aHex(v) {
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
  return null;
}

/** Sección "Estados (variants)": lista de estados con su disparo, lo que cambian y su tiempo. */
function htmlEstados(nodo, verActual) {
  const lista = nodo.animation?.variants ?? [];
  // "Enfocar" solo tiene sentido en botones (los únicos que reciben foco de teclado)
  const disparos = DISPAROS_VARIANT.filter(([v]) => v !== 'focus' || nodo.type === 'button');
  let h = `<h3>Estados (variants)</h3>
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
  if (!anchorValido(valor)) return '⚠ Inválida: empieza con letra; solo letras, números y guiones. No se guarda.';
  if (contarAncla(page, valor, nodo.id) > 0) return `⚠ "${esc(valor)}" ya existe en otra parte de la página (se repite).`;
  return `Enlace: <code>#${esc(valor)}</code>`;
}

export function initInspector(host) {
  let idDibujado = null; // id del nodo para el que está construido el panel
  let forzar = false; // un select pidió reconstruir el panel

  function dibujar() {
    const { page, selectedId, viewMode } = getState();
    const nodo = selectedId ? findNode(page, selectedId) : null;
    idDibujado = nodo?.id ?? null;
    if (!nodo) {
      host.innerHTML = '<h2>Propiedades</h2><p class="vacio">Haz clic en un elemento del preview.<br><br>Doble clic en un texto para escribir directamente.</p>';
      return;
    }
    const estilos = effectiveStyles(nodo, viewMode);

    let html = '<h2>Propiedades</h2>';
    if (nodo.type !== 'page') {
      const padre = findParent(page, nodo.id);
      const i = padre.children.indexOf(nodo);
      html += `<div class="acciones">
        <button data-act="up" title="Subir (Alt+↑)" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button data-act="down" title="Bajar (Alt+↓)" ${i === padre.children.length - 1 ? 'disabled' : ''}>↓</button>
        <button data-act="dup" title="Duplicar (Ctrl+D)">⧉</button>
        <button data-act="del" class="borrar" title="Borrar (Supr)">✕</button>
      </div>`;
    }
    html += `
      <div class="campo"><label>Nombre</label><input data-name value="${esc(nodo.name)}"></div>
      <p class="modo">${nodo.type} · editando <strong>${viewMode === 'mobile' ? 'móvil' : 'escritorio'}</strong></p>`;

    // ---- Contenido ----
    const c = nodo.content;
    let cont = '';
    if (nodo.type === 'page') {
      cont += `<div class="campo"><label>Título</label><input data-c="title" value="${esc(c.title)}"></div>
        <div class="campo"><label>Scroll suave</label><select data-c="smoothScroll" data-bool><option value="no" ${c.smoothScroll ? '' : 'selected'}>No</option><option value="si" ${c.smoothScroll ? 'selected' : ''}>Sí</option></select></div>
        <p class="modo">Solo la rueda del mouse en escritorio (táctil, teclado, barra y anclas quedan nativos). Se ve en el HTML exportado, no en este preview.</p>`;
    }
    if (TIPOS_TEXTO.includes(nodo.type)) cont += `<div class="campo"><label>Texto</label><textarea data-c="text" rows="3">${esc(c.text)}</textarea></div>`;
    if (nodo.type === 'heading') {
      cont += `<div class="campo"><label>Nivel</label><select data-c="level" data-num>${[1, 2, 3, 4].map((n) => `<option value="${n}" ${+c.level === n ? 'selected' : ''}>H${n}</option>`).join('')}</select></div>`;
    }
    if (nodo.type === 'button') cont += `<div class="campo"><label>Enlace</label><input data-c="href" value="${esc(c.href)}" placeholder="https://wa.me/506..."></div>`;
    if (nodo.type === 'image') {
      cont += `<div class="campo"><label>URL</label><input data-c="src" value="${esc(c.src?.startsWith('data:') ? '' : c.src)}" placeholder="https://..."></div>
        <div class="campo"><label>Archivo</label><input type="file" accept="image/*" data-file></div>
        <div class="campo"><label>Alt</label><input data-c="alt" value="${esc(c.alt)}"></div>`;
    }
    if (nodo.type === 'section' || nodo.type === 'container') {
      cont += `<div class="campo"><label>Ancla (id)</label><input data-anchor value="${esc(c.anchor)}" placeholder="contacto"></div>
        <p class="modo" data-aviso-ancla>${avisoAncla(page, nodo, c.anchor ?? '')}</p>`;
    }
    if (cont) html += `<h3>Contenido</h3>${cont}`;

    // ---- Estilos ----
    for (const g of GRUPOS) {
      if (!g.tipos.includes(nodo.type)) continue;
      const visibles = g.campos.filter((f) => (!f.tipos || f.tipos.includes(nodo.type)) && (!f.cuando || f.cuando(estilos)));
      html += `<h3>${g.titulo}</h3>`;
      for (const f of visibles) {
        const v = estilos[f.key] ?? '';
        if (f.kind === 'nota') {
          html += `<p class="modo">${f.texto}</p>`;
        } else if (f.kind === 'select') {
          // En móvil, un select cuyo '' es un valor real (vacioMovil) separa dos cosas: '' = "Igual que escritorio"
          // (sin override) y el valor explícito (ej. static) = "Normal en móvil". El valor mostrado es solo el override móvil.
          let opciones = f.options, vSel = v;
          if (viewMode === 'mobile' && f.vacioMovil) {
            opciones = [['', 'Igual que escritorio'], [f.vacioMovil, f.vacioTexto ?? f.options[0][1]], ...f.options.slice(1)];
            vSel = nodo.styles.mobile[f.key] ?? '';
          }
          const opts = opciones.map(([val, txt]) => `<option value="${esc(val)}" ${val === String(vSel) ? 'selected' : ''}>${txt}</option>`).join('');
          html += `<div class="campo"><label>${f.label}</label><select data-s="${f.key}">${opts}</select></div>`;
        } else if (f.kind === 'color') {
          html += `<div class="campo"><label>${f.label}</label><span class="color"><input type="color" data-pick="${f.key}" value="${aHex(v) ?? '#000000'}"><input data-s="${f.key}" value="${esc(v)}" placeholder="#ffffff"></span></div>`;
        } else {
          html += `<div class="campo"><label>${f.label}</label><input data-s="${f.key}" value="${esc(v)}" placeholder="${esc(f.placeholder)}"></div>`;
        }
      }
    }

    // ---- Animaciones (los grupos viven en src/animations/) ----
    for (const g of GRUPOS_ANIM) {
      if (!g.tipos.includes(nodo.type)) continue;
      // "Paso de escena" solo se ofrece a hijos directos de una escena (o si ya lo tienen puesto)
      if (g.soloEnEscena && !nodo.animation?.[g.id] && !findParent(page, nodo.id)?.animation?.scene?.steps) continue;
      if (g.propio) { html += htmlEstados(nodo, getState().verEstado); continue; } // los estados tienen su propia sección
      const datos = nodo.animation?.[g.id]; // undefined = grupo apagado
      html += `<h3>${g.titulo}</h3>`;
      if (g.id === 'scene' && datos) html += '<p class="modo">La sección se queda fija y sus hijos se apilan en el mismo lugar: se respetan Alineación y Justificar (y su fondo, borde y padding); Dirección, Separación y Columnas no se usan. Una vez creada, cada hijo directo tiene su "Paso de escena". Solo se ve con ▶ Reproducir y en el exportado. Un navbar pegado arriba se mide solo (o escribe "Espacio arriba").</p>';
      for (const f of g.campos) {
        if (f.key !== g.principal && !datos) continue; // apagado: solo se ve el selector principal
        if (f.cuando && !f.cuando(datos, datos?.effect)) continue;
        const v = datos?.[f.key] ?? g.defaults[f.key] ?? '';
        const a = `data-a="${g.id}.${f.key}"`;
        if (f.kind === 'select') {
          const vSel = f.key === g.principal ? (datos?.[f.key] ?? '') : v;
          const opts = f.options.map(([val, txt]) => `<option value="${esc(val)}" ${val === String(vSel) ? 'selected' : ''}>${txt}</option>`).join('');
          html += `<div class="campo"><label>${f.label}</label><select ${a}>${opts}</select></div>`;
        } else if (f.kind === 'color') {
          html += `<div class="campo"><label>${f.label}</label><input type="color" ${a} value="${aHex(v) ?? '#7c5cff'}"></div>`;
        } else {
          html += `<div class="campo"><label>${f.label}</label><input type="number" ${a} data-num step="${f.step ?? 1}" min="${f.min ?? 0}" value="${v}"></div>`;
        }
      }
    }

    // JSON del nodo, plegado (útil para depurar)
    const { children, ...resto } = nodo;
    html += `<details><summary>JSON del nodo</summary><pre>${esc(JSON.stringify(resto, null, 2))}</pre></details>`;
    host.innerHTML = html;
  }

  // ---- Eventos (delegados: un solo listener para todo el panel) ----
  host.addEventListener('input', (e) => {
    const t = e.target;
    const id = idDibujado;
    if (!id) return;
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
      setStyle(id, t.dataset.s, t.value.trim());
    }
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
    if (t.tagName === 'SELECT' && t.dataset.c) return; // ya manejado en 'input'
    if (t.tagName === 'SELECT' && t.dataset.s) forzar = true; // puede mostrar/ocultar campos
    if (t.dataset.file !== undefined && t.files[0]) {
      const lector = new FileReader();
      lector.onload = () => { forzar = true; setContent(idDibujado, 'src', lector.result); };
      lector.readAsDataURL(t.files[0]);
    }
  });

  subscribe((state, cambio) => {
    if (cambio === 'selection' || cambio === 'view' || cambio === 'verestado') return dibujar();
    if (cambio === 'text') return; // se escribe en el preview: no tocar el panel
    // Cambio de página: reconstruir solo si cambió el nodo, o se forzó, o el foco no está aquí
    const enfocado = host.contains(document.activeElement) && document.activeElement !== host;
    if (forzar || state.selectedId !== idDibujado || !enfocado) {
      forzar = false;
      dibujar();
    }
  });

  // Cuando se escribe en el preview, refresca la caja de "Texto" del panel
  subscribe((state, cambio) => {
    if (cambio !== 'text') return;
    const nodo = state.selectedId && findNode(state.page, state.selectedId);
    const area = host.querySelector('textarea[data-c="text"]');
    if (nodo && area && document.activeElement !== area) area.value = nodo.content.text ?? '';
  });

  dibujar();
}

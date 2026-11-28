// FORMATO "PLAN" (camino 1 de la IA, sin servidor ni API)
// Una IA de chat devuelve un JSON corto con bloques y textos; aquí se convierte en nodos reales con
// createBlock() (así conserva el tema, las animaciones y todo lo editable).
//
//   { "plan": 1, "titulo": "Nombre", "secciones": [ { "bloque": "hero", "variante": "acento",
//       "valores": { "1": "Texto", "2": { "texto": "Botón", "enlace": "#contacto" } } } ] }
//
// "Hueco" = nodo con contenido editable (título, texto, botón, imagen), numerado desde 1 en el orden en
// que aparece al recorrer el árbol de createBlock(). Los iconos, estilos y animaciones no los toca la IA.
// Todo es lógica pura (sin DOM): se prueba en Node.

import { t as tr } from '../i18n/index.js';
import { BLOCKS, createBlock } from '../blocks/index.js';
import { walk, normalizePage } from './tree.js';
import { avisoQuitados } from './seguridad.js';

export const TIPOS_HUECO = ['heading', 'text', 'button', 'image'];
const MAX_TEXTO = 2000; // tope de seguridad por valor (la guía sugiere límites mucho más cortos)

/** Nodos con contenido editable de un árbol, en orden de recorrido (el índice + 1 es el número de hueco). */
export function huecosDe(nodo) {
  const lista = [];
  walk(nodo, (x) => { if (TIPOS_HUECO.includes(x.type)) lista.push(x); });
  return lista;
}

// Los bloques con excluidoIA (marquesina) no se ofrecen a la IA: el plan los trata como inexistentes
const bloquesIA = () => BLOCKS.filter((b) => !b.excluidoIA);
const bloqueDe = (id) => bloquesIA().find((b) => b.id === id);
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const limpiar = (s) => (s.length > MAX_TEXTO ? s.slice(0, MAX_TEXTO) : s);

/** Enlace permitido: ancla, ruta, http(s), mailto o tel. Cualquier otra cosa (p. ej. javascript:) se rechaza. */
export const enlaceValido = (h) => typeof h === 'string' && /^(#[A-Za-z0-9_-]*|\/[^\s]*|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+)$/i.test(h.trim());
/** Imagen permitida: http(s), ruta o data:image (no SVG con script: el navegador no ejecuta scripts de un <img>). */
export const srcValido = (s) => typeof s === 'string' && /^(https?:\/\/[^\s]+|\/[^\s]*|data:image\/[a-z+.-]+[;,][^\s]*)$/i.test(s.trim());

/** Foto de fondo permitida desde un plan: solo http(s) o ruta relativa (nada de data: ni otros esquemas). */
export const fondoValido = (s) => typeof s === 'string' && /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i.test(s.trim());

/** Avisos de enlaces rotos: botones con #ancla que no coincide con ninguna sección (content.anchor) de la página.
 *  `secciones` = la página resultante (en modo "añadir", las existentes + las nuevas). */
export function avisosEnlaces(secciones) {
  const anclas = new Set(secciones.map((s) => s.content?.anchor).filter(Boolean));
  const avisos = [];
  for (const s of secciones) {
    walk(s, (x) => {
      const h = x.type === 'button' ? String(x.content?.href ?? '').trim() : '';
      if (h.length > 1 && h.startsWith('#') && !anclas.has(h.slice(1))) {
        avisos.push(tr('plan.enlaceRoto', { texto: String(x.content.text ?? '').replace(/\s+/g, ' ').trim(), destino: h }));
      }
    });
  }
  return avisos;
}

/** Extrae el primer objeto JSON válido de un texto de chat (con ``` o texto antes/después). Devuelve el objeto o null. */
export function extraerJSON(texto) {
  const t = String(texto ?? '');
  try { const v = JSON.parse(t.trim()); if (esObjeto(v)) return v; } catch { /* seguimos */ }
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== '{') continue;
    // busca el cierre que empareja (respetando strings y escapes) y prueba a parsear ese tramo
    let prof = 0, enStr = false, esc = false;
    for (let j = i; j < t.length; j++) {
      const ch = t[j];
      if (enStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') enStr = false; continue; }
      if (ch === '"') enStr = true;
      else if (ch === '{') prof++;
      else if (ch === '}' && --prof === 0) {
        try { const v = JSON.parse(t.slice(i, j + 1)); if (esObjeto(v)) return v; } catch { /* no era JSON: probamos el siguiente '{' */ }
        break;
      }
    }
  }
  return null;
}

/** Pone un valor (texto u objeto) en un nodo hueco. Devuelve un aviso (string) si algo se ignoró, o null. */
function aplicarValor(nodo, num, valor, ctx) {
  const t = nodo.type;
  const aviso = (m) => tr('plan.hueco', { ctx, num, nombre: nodo.name, mensaje: m });
  const av = [];
  let texto, enlace, src, alt;
  if (typeof valor === 'string') {
    if (t === 'image') src = valor; else texto = valor;
  } else if (esObjeto(valor)) {
    texto = valor.texto ?? valor.text; enlace = valor.enlace ?? valor.href; src = valor.src; alt = valor.alt;
  } else {
    return aviso(tr('plan.valorTipo'));
  }

  if (t === 'image') {
    if (texto !== undefined) av.push(tr('plan.imagenTexto'));
    if (src !== undefined) { if (srcValido(src)) nodo.content.src = src.trim(); else av.push(tr('plan.srcInvalido')); }
    if (alt !== undefined) nodo.content.alt = limpiar(String(alt));
    if (enlace !== undefined) av.push(tr('plan.imagenEnlace'));
  } else {
    if (src !== undefined || alt !== undefined) av.push(tr('plan.soloImagen'));
    if (texto !== undefined) { if (typeof texto === 'string') nodo.content.text = limpiar(texto); else av.push(tr('plan.textoTipo')); }
    if (enlace !== undefined) {
      if (t !== 'button') av.push(tr('plan.soloBotones'));
      else if (enlaceValido(enlace)) nodo.content.href = enlace.trim();
      else av.push(tr('plan.enlaceInvalido', { enlace: String(enlace).slice(0, 40) }));
    }
  }
  return av.length ? av.map(aviso).join(' ') : null;
}

/** Valida un plan y construye sus secciones. Devuelve { nodos, errores, avisos, titulo }. Si hay errores no se aplica nada. */
export function construirPlan(plan) {
  const errores = [], avisos = [], nodos = [];
  if (!esObjeto(plan) || plan.plan !== 1) { return { nodos, errores: [tr('plan.noEsPlan')], avisos, titulo: null }; }
  if (!Array.isArray(plan.secciones) || !plan.secciones.length) { return { nodos, errores: [tr('plan.sinSecciones')], avisos, titulo: null }; }

  plan.secciones.forEach((s, i) => {
    const ctx = tr('plan.seccion', { n: i + 1 });
    if (!esObjeto(s)) { errores.push(tr('plan.noObjeto', { ctx })); return; }
    const b = bloqueDe(s.bloque);
    if (!b) { errores.push(tr('plan.bloqueNoExiste', { ctx, bloque: s.bloque, lista: bloquesIA().map((x) => x.id).join(', ') })); return; }
    const claves = Object.keys(b.variants);
    if (s.variante != null && !claves.includes(s.variante)) { errores.push(tr('plan.varianteNoExiste', { ctx: `${ctx} (${b.id})`, variante: s.variante, lista: claves.join(', ') })); return; }
    if (s.valores != null && !esObjeto(s.valores)) { errores.push(tr('plan.valoresTipo', { ctx: `${ctx} (${b.id})` })); return; }
    const nodo = createBlock(b.id, s.variante ?? claves[0]);
    delete nodo.content.alInicio; // marca solo para "Añadir bloque" del editor: el plan ya fija el orden
    const huecos = huecosDe(nodo);
    for (const [k, v] of Object.entries(s.valores ?? {})) {
      const num = Number(k);
      if (!Number.isInteger(num) || num < 1 || num > huecos.length) {
        avisos.push(tr('plan.huecoNoExiste', { ctx: `${ctx} (${b.id}/${s.variante ?? claves[0]})`, hueco: k, total: huecos.length }));
        continue;
      }
      const a = aplicarValor(huecos[num - 1], num, v, `${ctx} (${b.id})`);
      if (a) avisos.push(a);
    }
    if (s.fondo !== undefined) {
      if (fondoValido(s.fondo)) nodo.styles.base.fondoImagen = s.fondo.trim(); // ajuste y capa: los de la variante
      else avisos.push(tr('plan.fondoInvalido', { ctx: `${ctx} (${b.id})` }));
    }
    nodos.push(nodo);
  });
  const titulo = typeof plan.titulo === 'string' && plan.titulo.trim() ? limpiar(plan.titulo.trim()) : null;
  return { nodos: errores.length ? [] : nodos, errores, avisos, titulo };
}

/** Interpreta lo que el usuario pegó: un plan o una página completa (el mismo JSON de "Abrir JSON").
 *  `existentes` = secciones que ya están en la página y se conservan (modo "añadir"): cuentan como destinos de enlaces.
 *  Devuelve { tipo: 'plan'|'pagina', secciones: nodos[], titulo, pagina?, errores, avisos }. No toca el editor. */
export function leerEntrada(texto, existentes = []) {
  const obj = extraerJSON(texto);
  if (!obj) return { tipo: null, secciones: [], titulo: null, errores: [tr('plan.sinJson')], avisos: [] };
  if (obj.plan !== undefined) {
    const r = construirPlan(obj);
    const avisos = r.errores.length ? r.avisos : [...r.avisos, ...avisosEnlaces([...existentes, ...r.nodos])];
    return { tipo: 'plan', secciones: r.nodos, titulo: r.titulo, errores: r.errores, avisos };
  }
  if (obj.type === 'page') {
    try {
      const informe = {};
      const pagina = normalizePage(obj, informe);
      const avisos = avisosEnlaces([...existentes, ...pagina.children]);
      if (informe.quitados > 0) avisos.unshift(avisoQuitados(informe.quitados));
      return { tipo: 'pagina', secciones: pagina.children, titulo: pagina.content?.title ?? null, pagina, errores: [], avisos };
    } catch (e) {
      return { tipo: 'pagina', secciones: [], titulo: null, errores: [tr('plan.paginaInvalida', { error: e.message })], avisos: [] };
    }
  }
  return { tipo: null, secciones: [], titulo: null, errores: [tr('plan.jsonRaro')], avisos: [] };
}

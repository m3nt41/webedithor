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

import { BLOCKS, createBlock } from '../blocks/index.js';
import { walk, normalizePage } from './tree.js';

export const TIPOS_HUECO = ['heading', 'text', 'button', 'image'];
const MAX_TEXTO = 2000; // tope de seguridad por valor (la guía sugiere límites mucho más cortos)

/** Nodos con contenido editable de un árbol, en orden de recorrido (el índice + 1 es el número de hueco). */
export function huecosDe(nodo) {
  const lista = [];
  walk(nodo, (x) => { if (TIPOS_HUECO.includes(x.type)) lista.push(x); });
  return lista;
}

const bloqueDe = (id) => BLOCKS.find((b) => b.id === id);
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const limpiar = (s) => (s.length > MAX_TEXTO ? s.slice(0, MAX_TEXTO) : s);

/** Enlace permitido: ancla, ruta, http(s), mailto o tel. Cualquier otra cosa (p. ej. javascript:) se rechaza. */
export const enlaceValido = (h) => typeof h === 'string' && /^(#[A-Za-z0-9_-]*|\/[^\s]*|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+)$/i.test(h.trim());
/** Imagen permitida: http(s), ruta o data:image (no SVG con script: el navegador no ejecuta scripts de un <img>). */
export const srcValido = (s) => typeof s === 'string' && /^(https?:\/\/[^\s]+|\/[^\s]*|data:image\/[a-z+.-]+[;,][^\s]*)$/i.test(s.trim());

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
  const aviso = (m) => `${ctx}, hueco ${num} (${nodo.name}): ${m}`;
  const av = [];
  let texto, enlace, src, alt;
  if (typeof valor === 'string') {
    if (t === 'image') src = valor; else texto = valor;
  } else if (esObjeto(valor)) {
    texto = valor.texto ?? valor.text; enlace = valor.enlace ?? valor.href; src = valor.src; alt = valor.alt;
  } else {
    return aviso('el valor debe ser un texto o un objeto; se ignoró.');
  }

  if (t === 'image') {
    if (texto !== undefined) av.push('las imágenes usan "src" y "alt", no "texto"; se ignoró "texto".');
    if (src !== undefined) { if (srcValido(src)) nodo.content.src = src.trim(); else av.push('"src" no es una dirección válida (https://… o data:image); se dejó la imagen de relleno.'); }
    if (alt !== undefined) nodo.content.alt = limpiar(String(alt));
    if (enlace !== undefined) av.push('las imágenes no tienen enlace; se ignoró.');
  } else {
    if (src !== undefined || alt !== undefined) av.push('"src"/"alt" solo valen en imágenes; se ignoraron.');
    if (texto !== undefined) { if (typeof texto === 'string') nodo.content.text = limpiar(texto); else av.push('"texto" debe ser un texto; se ignoró.'); }
    if (enlace !== undefined) {
      if (t !== 'button') av.push('"enlace" solo vale en botones; se ignoró.');
      else if (enlaceValido(enlace)) nodo.content.href = enlace.trim();
      else av.push(`el enlace "${String(enlace).slice(0, 40)}" no es válido (usa #ancla, https://…, mailto: o tel:); se dejó el original.`);
    }
  }
  return av.length ? av.map(aviso).join(' ') : null;
}

/** Valida un plan y construye sus secciones. Devuelve { nodos, errores, avisos, titulo }. Si hay errores no se aplica nada. */
export function construirPlan(plan) {
  const errores = [], avisos = [], nodos = [];
  if (!esObjeto(plan) || plan.plan !== 1) { return { nodos, errores: ['No es un plan: falta "plan": 1.'], avisos, titulo: null }; }
  if (!Array.isArray(plan.secciones) || !plan.secciones.length) { return { nodos, errores: ['El plan no tiene "secciones" (debe ser una lista con al menos una).'], avisos, titulo: null }; }

  plan.secciones.forEach((s, i) => {
    const ctx = `Sección ${i + 1}`;
    if (!esObjeto(s)) { errores.push(`${ctx}: debe ser un objeto con "bloque".`); return; }
    const b = bloqueDe(s.bloque);
    if (!b) { errores.push(`${ctx}: el bloque "${s.bloque}" no existe. Bloques válidos: ${BLOCKS.map((x) => x.id).join(', ')}.`); return; }
    const claves = Object.keys(b.variants);
    if (s.variante != null && !claves.includes(s.variante)) { errores.push(`${ctx} (${b.id}): la variante "${s.variante}" no existe. Variantes válidas: ${claves.join(', ')}.`); return; }
    if (s.valores != null && !esObjeto(s.valores)) { errores.push(`${ctx} (${b.id}): "valores" debe ser un objeto {"1": "texto", ...}.`); return; }
    const nodo = createBlock(b.id, s.variante ?? claves[0]);
    delete nodo.content.alInicio; // marca solo para "Añadir bloque" del editor: el plan ya fija el orden
    const huecos = huecosDe(nodo);
    for (const [k, v] of Object.entries(s.valores ?? {})) {
      const num = Number(k);
      if (!Number.isInteger(num) || num < 1 || num > huecos.length) {
        avisos.push(`${ctx} (${b.id}/${s.variante ?? claves[0]}): el hueco "${k}" no existe (esta variante tiene ${huecos.length}); se ignoró.`);
        continue;
      }
      const a = aplicarValor(huecos[num - 1], num, v, `${ctx} (${b.id})`);
      if (a) avisos.push(a);
    }
    nodos.push(nodo);
  });
  const titulo = typeof plan.titulo === 'string' && plan.titulo.trim() ? limpiar(plan.titulo.trim()) : null;
  return { nodos: errores.length ? [] : nodos, errores, avisos, titulo };
}

/** Interpreta lo que el usuario pegó: un plan o una página completa (el mismo JSON de "Abrir JSON").
 *  Devuelve { tipo: 'plan'|'pagina', secciones: nodos[], titulo, pagina?, errores, avisos }. No toca el editor. */
export function leerEntrada(texto) {
  const obj = extraerJSON(texto);
  if (!obj) return { tipo: null, secciones: [], titulo: null, errores: ['No encontré ningún JSON en el texto pegado. Pega la respuesta de la IA completa.'], avisos: [] };
  if (obj.plan !== undefined) {
    const r = construirPlan(obj);
    return { tipo: 'plan', secciones: r.nodos, titulo: r.titulo, errores: r.errores, avisos: r.avisos };
  }
  if (obj.type === 'page') {
    try {
      const pagina = normalizePage(obj);
      return { tipo: 'pagina', secciones: pagina.children, titulo: pagina.content?.title ?? null, pagina, errores: [], avisos: [] };
    } catch (e) {
      return { tipo: 'pagina', secciones: [], titulo: null, errores: [`La página no es válida: ${e.message}`], avisos: [] };
    }
  }
  return { tipo: null, secciones: [], titulo: null, errores: ['El JSON no es un plan ("plan": 1) ni una página completa ("type": "page").'], avisos: [] };
}

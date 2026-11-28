// TRADUCCIÓN DE LA INTERFAZ DEL EDITOR, sin librerías. Uso: t('zona.nombre') o t('zona.nombre', { n: 3 }).
// Solo traduce el EDITOR: los textos de ejemplo de las plantillas y la página del usuario no pasan por aquí.
//
// El idioma se decide UNA vez al arrancar: lo guardado en localStorage; si no hay, el del navegador;
// y si no tenemos ese idioma, español. Cambiarlo se aplica al recargar.
// Añadir un idioma = su archivo (copia de es.js) + una línea en IDIOMAS.
import es from './es.js';

export const BASE = 'es';
export const CLAVE_IDIOMA = 'editor-landings:idioma';
// Nota: el editor compilado es un solo .html, así que todos los idiomas viajan dentro (son solo texto).
export const IDIOMAS = { es };

/** Elige un idioma disponible: el guardado; si no, el del navegador ('en-US' -> 'en'); si no, español. */
export function elegirIdioma(guardado, delNavegador, disponibles = IDIOMAS) {
  for (const candidato of [guardado, delNavegador]) {
    const corto = String(candidato || '').toLowerCase().split('-')[0];
    if (Object.hasOwn(disponibles, corto)) return corto;
  }
  return BASE;
}

/** Crea la función de traducir: idioma activo -> español -> la propia clave (así se ve qué falta). */
export function crearT(activo, base = es) {
  return (clave, datos) => {
    let texto = Object.hasOwn(activo, clave) ? activo[clave] : Object.hasOwn(base, clave) ? base[clave] : clave;
    // {n} se cambia por datos.n; si no viene ese dato, las llaves se quedan tal cual.
    if (datos) texto = texto.replace(/\{(\w+)\}/g, (todo, k) => (Object.hasOwn(datos, k) ? String(datos[k]) : todo));
    return texto;
  };
}

// Fuera del navegador (tests en Node, CLI) siempre español. localStorage puede lanzar (modo privado, bloqueado).
const enNavegador = typeof window !== 'undefined';
function leerGuardado() {
  try { return enNavegador ? window.localStorage.getItem(CLAVE_IDIOMA) : null; } catch { return null; }
}

export const idioma = enNavegador ? elegirIdioma(leerGuardado(), window.navigator.language) : BASE;
export const t = crearT(IDIOMAS[idioma]);

/** Guarda la elección (se aplica al recargar). Devuelve false si no se pudo guardar. */
export function guardarIdioma(codigo) {
  if (!enNavegador || !Object.hasOwn(IDIOMAS, codigo)) return false;
  try { window.localStorage.setItem(CLAVE_IDIOMA, codigo); return true; } catch { return false; }
}

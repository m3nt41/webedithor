// ESPACIADO (lógica pura de los tiradores del preview; sin DOM, se prueba en Node).
// Lados siempre en este orden: 0 = arriba, 1 = derecha, 2 = abajo, 3 = izquierda (como el atajo CSS padding/margin).
// Un "token" es el texto CSS de un lado ("24px", "2rem", "auto"...). Los lados que el usuario no toca CONSERVAN su token.

export const LADOS = ['Top', 'Right', 'Bottom', 'Left'];
const NOMBRES = ['arriba', 'derecha', 'abajo', 'izquierda'];
export const nombreLado = (i) => NOMBRES[i];

/** Claves por lado de "padding" o "margin": paddingTop, paddingRight... */
export const largas = (prop) => LADOS.map((l) => prop + l);

/** Parte "10px calc(1px + 2px) auto" en tokens sin romper los paréntesis. */
export function partes(valor) {
  const out = []; let actual = ''; let prof = 0;
  for (const c of String(valor ?? '').trim()) {
    if (c === '(') prof++;
    if (c === ')') prof = Math.max(0, prof - 1);
    if (/\s/.test(c) && prof === 0) { if (actual) out.push(actual); actual = ''; } else actual += c;
  }
  if (actual) out.push(actual);
  return out;
}

/** Atajo CSS de 1 a 4 partes -> [arriba, derecha, abajo, izquierda]; null si no tiene 1-4 partes. */
export function expandir(valor) {
  const p = partes(valor);
  if (p.length < 1 || p.length > 4) return null;
  const [a, b = a, c = a, d = b] = p;
  return [a, b, c, d];
}

/** Tokens efectivos [t, r, b, l] de `prop` ("padding"|"margin") en unos estilos ya fusionados (base + móvil).
 *  Atajo primero y encima lo que tenga cada lado suelto (paddingTop...). Un lado sin valor = null. */
export function tokensEfectivos(est, prop) {
  const t = (est?.[prop] != null && String(est[prop]).trim() !== '' ? expandir(est[prop]) : null) ?? [null, null, null, null];
  return t.map((v, i) => {
    const l = est?.[prop + LADOS[i]];
    return l != null && String(l).trim() !== '' ? String(l).trim() : v;
  });
}

/** [t, r, b, l] -> atajo CSS lo más corto posible. */
export function componer([t, r, b, l]) {
  if (t === r && r === b && b === l) return t;
  if (t === b && r === l) return `${t} ${r}`;
  if (r === l) return `${t} ${r} ${b}`;
  return `${t} ${r} ${b} ${l}`;
}

/** Lados que cambian con el arrastre: Alt = los 4, Shift = ese y su opuesto, nada = solo ese. */
export function ladosAfectados(lado, { shift = false, alt = false } = {}) {
  if (alt) return [0, 1, 2, 3];
  if (shift) return [lado, (lado + 2) % 4];
  return [lado];
}

/** Valor final en px: entero, mínimo 0; con Ctrl se pega al múltiplo de 8 más cercano. */
export function ajustarValor(px, { ctrl = false } = {}) {
  let v = Math.max(0, Math.round(px));
  if (ctrl) v = Math.max(0, Math.round(v / 8) * 8);
  return v;
}

/** Tokens nuevos: los lados afectados valen `valor`px; el resto conserva su token (o, si no tenía, su valor medido `inicioPx`). */
export function aplicarValor(tokens, inicioPx, afectados, valor) {
  return tokens.map((tk, i) => (afectados.includes(i) ? `${valor}px` : tk ?? `${Math.round(inicioPx[i])}px`));
}

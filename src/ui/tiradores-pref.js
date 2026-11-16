// INTERRUPTOR DE TIRADORES: encendido/apagado, recordado entre sesiones (localStorage, siempre con try/catch).
// Solo guarda la preferencia; quien dibuja los tiradores es tiradores.js y quien pinta el botón es toolbar.js.
// No entra al árbol de la página: ni al export ni a la Vista previa.

const CLAVE = 'editor-landings:tiradores';
let encendido = true; // por defecto encendido (como hasta ahora)
try { encendido = localStorage.getItem(CLAVE) !== '0'; } catch { /* sin localStorage: queda encendido */ }
const oyentes = new Set();

export const tiradoresEncendidos = () => encendido;

export function ponerTiradores(valor) {
  valor = !!valor;
  if (valor === encendido) return;
  encendido = valor;
  try { localStorage.setItem(CLAVE, valor ? '1' : '0'); } catch { /* no se pudo recordar: sigue valiendo en esta sesión */ }
  oyentes.forEach((f) => f(encendido));
}

export const alternarTiradores = () => ponerTiradores(!encendido);

/** Avisa cuando cambia el interruptor. Devuelve la función para dejar de escuchar. */
export function alCambiarTiradores(f) { oyentes.add(f); return () => oyentes.delete(f); }

// Formato de salida mínimo: colores ANSI solo si la terminal los soporta y no hay NO_COLOR.
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const envolver = (n) => (s) => (color ? `\x1b[${n}m${s}\x1b[0m` : String(s));
export const rojo = envolver(31);
export const amarillo = envolver(33);
export const gris = envolver(90);
export const negrita = envolver(1);
export const verde = envolver(32);

export const kb = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

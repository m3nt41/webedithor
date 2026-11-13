// Subir una imagen de fondo: se redimensiona (máx. 1920 px de ancho) y se comprime a JPEG ~0.8
// antes de guardarla como data URL, para no reventar localStorage.

export const FONDO_MAX_ANCHO = 1920;
export const FONDO_CALIDAD = 0.8;

const leer = (file) => new Promise((ok, mal) => {
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.onerror = () => mal(r.error ?? new Error('No se pudo leer el archivo'));
  r.readAsDataURL(file);
});

/** File -> Promise<data URL>. SVG se deja tal cual (ya es liviano y vectorial). Lanza Error si no es una imagen válida. */
export async function reducirImagen(file, maxAncho = FONDO_MAX_ANCHO, calidad = FONDO_CALIDAD) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen');
  const original = await leer(file);
  if (file.type === 'image/svg+xml') return original;
  const img = new Image();
  await new Promise((ok, mal) => { img.onload = ok; img.onerror = () => mal(new Error('No se pudo abrir la imagen')); img.src = original; });
  const esc = Math.min(1, maxAncho / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * esc)), h = Math.max(1, Math.round(img.naturalHeight * esc));
  const lienzo = document.createElement('canvas');
  lienzo.width = w; lienzo.height = h;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#fff'; // JPEG no tiene transparencia
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return lienzo.toDataURL('image/jpeg', calidad);
}

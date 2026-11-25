// Comprobación OPCIONAL de enlaces e imágenes externas (--check-external). Es lo único de la CLI que usa la red,
// y solo pide las URL que ya están en tu página. Sin dependencias: fetch de Node.
const TIMEOUT_MS = 8000;
const EN_PARALELO = 5;
const IMG_AVISO_BYTES = 500 * 1024;

async function pedir(url, method) {
  return fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': 'webedithor-audit' } });
}

async function comprobar(url) {
  try {
    let r = await pedir(url, 'HEAD');
    if ([403, 405, 501].includes(r.status)) r = await pedir(url, 'GET'); // algunos servidores no aceptan HEAD
    return { status: r.status, bytes: Number(r.headers.get('content-length')) || 0 };
  } catch (e) {
    // fetch de Node esconde la causa real en e.cause (a veces dentro de un AggregateError)
    const causa = e?.cause?.code ?? e?.cause?.errors?.[0]?.code ?? e?.cause?.message;
    return { error: e?.name === 'TimeoutError' ? 'timed out' : (causa ?? e?.message ?? 'network error') };
  }
}

/** Comprueba cada URL única con un máximo de EN_PARALELO a la vez. Devuelve hallazgos. */
export async function checkExternos(enlaces, imagenes) {
  const unicas = new Map();
  for (const x of [...enlaces, ...imagenes]) if (!unicas.has(x.url)) unicas.set(x.url, null);
  const urls = [...unicas.keys()];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(EN_PARALELO, urls.length) }, async () => {
    while (i < urls.length) { const u = urls[i++]; unicas.set(u, await comprobar(u)); }
  }));

  const out = [];
  const add = (level, area, rule, message) => out.push({ level, area, rule, message });
  for (const { url, donde } of enlaces) {
    const r = unicas.get(url);
    if (r.error) add('warn', 'links', 'link-unreachable', `${donde} → ${url}: ${r.error}`);
    else if (r.status >= 400) add('warn', 'links', 'link-broken', `${donde} → ${url}: HTTP ${r.status}`);
  }
  for (const { url, donde } of imagenes) {
    const r = unicas.get(url);
    if (r.error) add('warn', 'assets', 'image-unreachable', `Image ${donde} → ${url}: ${r.error}`);
    else if (r.status >= 400) add('warn', 'assets', 'image-broken', `Image ${donde} → ${url}: HTTP ${r.status}`);
    else if (r.bytes >= IMG_AVISO_BYTES) add('warn', 'assets', 'image-heavy', `Image ${donde} is ${Math.round(r.bytes / 1024)} KB (${url})`);
  }
  return { hallazgos: out, comprobadas: urls.length };
}

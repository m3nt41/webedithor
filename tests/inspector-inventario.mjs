// Reorganización del inspector por tarea (Contenido / Estilo / Movimiento): NINGÚN campo se pierde ni se duplica,
// cada grupo vive entero en un solo acordeón y editar sigue escribiendo lo mismo que antes.
//  1) Inventario de controles por tipo de nodo (y por estado: flex, grid, sticky, imagen de fondo, marquesina, escena, con y sin
//     animaciones) = EXACTAMENTE el de antes de reorganizar (tests/golden/inspector-inventario.json, ids por atributo data-*, sin etiquetas).
//  2) Cada grupo de fields.js (h3) aparece una sola vez en el panel y todos sus controles caen en el acordeón que dice `acordeon`.
//  3) Texto y enlace del elemento fuera de los acordeones; ancla y menú móvil en Contenido; animaciones, estados y copiar/pegar en Movimiento.
//  4) Mismo comportamiento: se edita cada campo de estilo/contenido de cada caso y se guarda en la misma clave que su data-s / data-c.
// Ejecutar: npm run build && node tests/inspector-inventario.mjs     (regenerar el inventario base: node tools/inventario-inspector.mjs tests/golden/inspector-inventario.json)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Builder, By } from 'selenium-webdriver';
import { walk } from '../src/core/tree.js';
import { GRUPOS } from '../src/ui/fields.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';
import { crearPaginaInventario, abrirEditor, seleccionarNodo, leerPanel, contenedoresDe, LS } from '../tools/inventario-inspector.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const base = JSON.parse(readFileSync(new URL('./golden/inspector-inventario.json', import.meta.url), 'utf8'));
const fx = crearPaginaInventario();
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
let comprobaciones = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); comprobaciones++; };
try {
  await abrirEditor(d, fx.pagina);

  for (const [caso, nodo] of fx.casos) {
    await seleccionarNodo(d, fx.pagina, nodo);
    const ahora = await leerPanel(d);

    // ---- 1) mismo inventario que antes: nada perdido, nada duplicado, nada nuevo ----
    const antes = base[caso];
    assert.ok(antes, `el inventario base no tiene el caso ${caso}`);
    const perdidos = Object.keys(antes).filter((k) => !(k in ahora));
    const nuevos = Object.keys(ahora).filter((k) => !(k in antes));
    const distintos = Object.keys(antes).filter((k) => k in ahora && antes[k] !== ahora[k]).map((k) => `${k}: ${antes[k]} → ${ahora[k]}`);
    assert.deepEqual({ perdidos, nuevos, distintos }, { perdidos: [], nuevos: [], distintos: [] }, `${caso}: el inventario de controles cambió`);
    comprobaciones++;

    // ---- 2) cada grupo una sola vez; sus controles en el acordeón de su grupo ----
    const info = await d.executeScript(`
      const h3 = [...document.querySelectorAll('#inspector h3')].map((h) => ({ t: h.textContent, nivel: h.closest('details.nivel')?.dataset.nivel ?? (h.closest('.nivel-plano') ? 'plano' : 'fuera') }));
      return h3;`);
    const titulos = info.map((x) => x.t);
    const repetidos = titulos.filter((t, i) => titulos.indexOf(t) !== i);
    assert.deepEqual(repetidos, [], `${caso}: grupo repartido o duplicado: ${repetidos}`);
    comprobaciones++;
    if (nodo.type !== 'page') {
      for (const g of GRUPOS) {
        const h = info.find((x) => x.t === g.titulo);
        if (!h) continue;
        assert.equal(h.nivel, g.acordeon ?? 'estilo', `${caso}: el grupo "${g.titulo}" debe estar en ${g.acordeon ?? 'estilo'}`);
        comprobaciones++;
      }
    }

    // ---- 3) quién vive dónde ----
    const donde = await contenedoresDe(d);
    const en = (prefijo) => Object.entries(donde).filter(([k]) => k.startsWith(prefijo)).map(([, v]) => v);
    if (nodo.type === 'page') {
      assert.ok([...new Set(Object.values(donde))].every((v) => v === 'plano' || v === 'cabecera'), `${caso}: la página debe seguir en vista plana`);
      assert.equal(await d.executeScript(`return document.querySelectorAll('#inspector details.nivel').length`), 0, 'page sin acordeones');
      comprobaciones += 2;
      continue;
    }
    for (const v of en('data-c=text')) assert.equal(v, 'fuera', `${caso}: el texto va arriba, fuera de los acordeones`);
    for (const v of en('data-c=href')) assert.equal(v, 'fuera', `${caso}: el enlace va arriba, fuera de los acordeones`);
    for (const v of [...en('data-a='), ...en('data-efectos='), ...en('data-v='), ...en('data-vact='), ...en('data-mq')]) assert.equal(v, 'movimiento', `${caso}: movimiento`);
    for (const v of [...en('data-anchor'), ...en('data-c=menuMovil'), ...en('data-icono='), ...en('data-c=src'), ...en('data-c=alt'), ...en('data-file')]) assert.equal(v, 'contenido', `${caso}: contenido`);
    for (const v of [...en('data-s=fontSize'), ...en('data-s=color'), ...en('data-s=padding'), ...en('data-s=display'), ...en('data-est='), ...en('data-tam='), ...en('data-fondo-url')]) assert.equal(v, 'estilo', `${caso}: estilo`);
    for (const v of en('data-s=position')) assert.equal(v, 'movimiento', `${caso}: el pegado es movimiento`);
    comprobaciones++;
  }
  console.log(`  inventario y reparto: ${fx.casos.length} casos, ${comprobaciones} comprobaciones`);

  // ---- 4) mismo comportamiento al editar: cada campo data-s / data-c escribe en su clave ----
  let editados = 0;
  for (const [caso, nodo] of fx.casos) {
    await seleccionarNodo(d, fx.pagina, nodo);
    const campos = await d.executeScript(`
      return [...document.querySelectorAll('#inspector [data-s]:not([type=color]), #inspector [data-c]:not([data-bool]):not([data-num])')]
        .filter((e) => !e.closest('details.json'))
        .map((e) => ({ clave: e.dataset.s ?? e.dataset.c, tipo: e.dataset.s !== undefined ? 's' : 'c', sel: e.tagName === 'SELECT' }));`);
    const unicos = [...new Map(campos.map((c) => [c.tipo + c.clave, c])).values()].filter((c) => c.clave !== 'position' && c.clave !== 'display' && c.clave !== 'overflow');
    const puestos = {};
    for (const c of unicos) {
      const css = `#inspector [data-${c.tipo === 's' ? 's' : 'c'}="${c.clave}"]:not([type=color])`;
      const valor = await d.executeScript(`
        const e = document.querySelector(arguments[0]); if (!e) return null;
        let v;
        if (e.tagName === 'SELECT') { const o = [...e.options].filter((x) => x.value !== ''); if (!o.length) return null; v = o[o.length - 1].value; }
        else v = 'zz' + arguments[1];
        e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); return v;`, css, String(editados));
      if (valor === null) continue;
      puestos[c.tipo + ':' + c.clave] = valor; editados++;
    }
    await esperar(550);
    const guardada = JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`));
    let nodoGuardado = null; walk(guardada, (x) => { if (x.id === nodo.id) nodoGuardado = x; });
    assert.ok(nodoGuardado, `${caso}: el nodo no se guardó`);
    for (const [k, v] of Object.entries(puestos)) {
      const [tipo, clave] = [k[0], k.slice(2)];
      const real = tipo === 's' ? nodoGuardado.styles.base[clave] : nodoGuardado.content[clave];
      assert.equal(String(real), String(v).trim(), `${caso}: editar ${k} no escribió lo mismo (guardado: ${real})`);
      comprobaciones++;
    }
  }
  console.log(`OK inspector por tarea: mismo inventario que antes (0 perdidos, 0 duplicados), cada grupo entero en su acordeón, texto/enlace arriba y ${editados} campos editados escriben en su misma clave (${comprobaciones} comprobaciones)`);
} finally { await d.quit(); }

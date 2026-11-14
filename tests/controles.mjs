// Controles visuales del inspector (lógica pura de src/ui/controles.js). Ejecutar: node tests/controles.mjs
import assert from 'node:assert/strict';
import { leerColumnas, leerAnchoMax, leerCentrar, leerProporcion, leerForma, leerTamanoBoton, FORMAS, TAMANOS_BOTON, modeloControl, columnasN, columnasAuto } from '../src/ui/controles.js';
import { createBlock, BLOCKS } from '../src/blocks/index.js';
import { walk } from '../src/core/tree.js';
let ok = 0; const t = (nombre, f) => { f(); ok++; console.log('✔', nombre); };
const activo = (m) => m.opciones.filter((o) => o.on).map((o) => o.txt);

t('columnas: lee los valores de los bloques (n, 1fr 1fr, auto-fit) y marca raros como personalizado', () => {
  assert.deepEqual(leerColumnas('repeat(3, 1fr)'), { tipo: 'n', n: 3 });
  assert.deepEqual(leerColumnas('repeat(3,1fr)'), { tipo: 'n', n: 3 });
  assert.deepEqual(leerColumnas('1fr 1fr'), { tipo: 'n', n: 2 });
  assert.deepEqual(leerColumnas('repeat(auto-fit, minmax(260px, 1fr))'), { tipo: 'auto', min: 260 });
  assert.equal(leerColumnas('repeat(7, 1fr)').tipo, 'otro');
  assert.equal(leerColumnas('2fr 1fr').tipo, 'otro');
  assert.equal(leerColumnas('repeat(auto-fill, minmax(200px, 1fr))').tipo, 'otro');
  assert.equal(leerColumnas('').tipo, 'vacio');
  // los botones escriben exactamente el string que escribirías a mano
  assert.equal(modeloControl({ kind: 'columnas' }, '', 'desktop').opciones[2].val, 'repeat(3, 1fr)');
  assert.equal(columnasAuto(240), 'repeat(auto-fit, minmax(240px, 1fr))');
  assert.equal(columnasN(4), 'repeat(4, 1fr)');
});

t('ancho máx.: presets, Completo (escritorio borra, móvil escribe none) y otro', () => {
  assert.equal(leerAnchoMax('900px').n, 900);
  assert.equal(leerAnchoMax('760px').n, 760);
  assert.equal(leerAnchoMax('').tipo, 'completo');
  assert.equal(leerAnchoMax('none').tipo, 'completo');
  assert.equal(leerAnchoMax('900').tipo, 'otro');      // sin unidad: no se "arregla" solo
  assert.equal(leerAnchoMax('65ch').tipo, 'otro');
  const f = { kind: 'anchoMax' };
  assert.equal(modeloControl(f, '', 'desktop').opciones[0].val, '');
  assert.equal(modeloControl(f, '', 'mobile').opciones[0].val, 'none');
  assert.deepEqual(activo(modeloControl(f, '700px', 'desktop')), ['700']);
});

t('centrar: reconoce las formas de margin, y lo demás es personalizado (no se pisa)', () => {
  for (const v of ['0 auto', '0px auto', 'auto', '0 auto 0', '0 auto 0 auto']) assert.equal(leerCentrar(v).tipo, 'si', v);
  for (const v of ['0', '0px', '0 0', '0 0 0 0']) assert.equal(leerCentrar(v).tipo, 'no', v);
  for (const v of ['20px 0', '0 auto 20px', '0 10px', '1 2 3 4 5']) assert.equal(leerCentrar(v).tipo, 'otro', v);
  assert.equal(leerCentrar('').tipo, 'vacio');
  const f = { kind: 'centrar' };
  assert.equal(modeloControl(f, '', 'desktop').opciones[1].val, '');   // escritorio: "Sin centrar" quita el margen
  assert.equal(modeloControl(f, '', 'mobile').opciones[1].val, '0');   // móvil: valor explícito
  assert.equal(modeloControl(f, '0 auto', 'desktop').opciones[0].val, '0 auto');
  assert.equal(modeloControl(f, '20px 0', 'desktop').personalizado, true);
  assert.deepEqual(activo(modeloControl(f, '20px 0', 'desktop')), []);
});

t('proporción: compara sin espacios, Auto distinto para imagen y para "de los hijos"', () => {
  assert.equal(leerProporcion('4/3').k, '4/3');
  assert.equal(leerProporcion('4 / 3').k, '4/3');
  assert.equal(leerProporcion('3 / 2').k, '3/2');
  assert.equal(leerProporcion('auto').tipo, 'auto');
  assert.equal(leerProporcion('21 / 9').tipo, 'otro');
  const img = { kind: 'proporcion' }, hijos = { kind: 'proporcion', autoVacio: true };
  const auto = (m) => m.opciones.find((o) => o.txt === 'Auto');
  assert.equal(auto(modeloControl(img, '', 'desktop')).val, 'auto');      // imagen: explícito, gana al grid
  assert.equal(auto(modeloControl(hijos, '', 'desktop')).val, '');        // hijos: quitar
  assert.equal(auto(modeloControl(hijos, '', 'mobile')).val, 'auto');
  assert.equal(auto(modeloControl(hijos, '', 'desktop')).on, true);       // sin valor = Auto
  assert.equal(auto(modeloControl(img, '', 'desktop')).on, false);
  assert.equal(modeloControl(img, '16/9', 'desktop').opciones.find((o) => o.on).val, '16 / 9');
});

t('todos los valores que traen los bloques se leen sin romperse (leer nunca escribe: son funciones puras)', () => {
  const vistos = { columnas: new Set(), ancho: new Set(), margen: new Set(), prop: new Set() };
  for (const b of BLOCKS) for (const v of Object.keys(b.variants)) {
    walk(createBlock(b.id, v), (nodo) => {
      for (const est of [nodo.styles.base, nodo.styles.mobile]) {
        if (est.gridTemplateColumns) vistos.columnas.add(est.gridTemplateColumns);
        if (est.maxWidth) vistos.ancho.add(est.maxWidth);
        if (est.margin) vistos.margen.add(est.margin);
        if (est.aspectRatio) vistos.prop.add(est.aspectRatio);
        if (est.hijosAspectRatio) vistos.prop.add(est.hijosAspectRatio);
      }
    });
  }
  // los patrones simples (repeat(n, 1fr), auto-fit minmax, "1fr 1fr") se reconocen; lo demás (ej. "80px 1fr") es personalizado y se respeta
  for (const v of vistos.columnas) if (/^(repeat\(\d|repeat\(auto-fit|1fr( 1fr)*$)/.test(v)) assert.notEqual(leerColumnas(v).tipo, 'otro', 'columnas: ' + v);
  for (const v of vistos.ancho) assert.doesNotThrow(() => leerAnchoMax(v));
  for (const v of vistos.margen) assert.doesNotThrow(() => leerCentrar(v));
  for (const v of vistos.prop) assert.notEqual(leerProporcion(v).tipo, 'otro', 'proporción: ' + v);
  console.log('   (columnas:', [...vistos.columnas].join(' | '), ')');
});

t('forma: Recto/Suave/Redondo/Pastilla, vacío = Recto y lo raro es Otro (no se toca)', () => {
  assert.equal(leerForma('0').k, 'recto'); assert.equal(leerForma('0px').k, 'recto'); assert.equal(leerForma('0 0 0 0').k, 'recto');
  assert.equal(leerForma('6px').k, 'suave'); assert.equal(leerForma('12px').k, 'redondo'); assert.equal(leerForma('12px 12px').k, 'redondo');
  assert.equal(leerForma('999px').k, 'pastilla');
  for (const v of ['4px', '50%', '8px 0', '12px 0 0 12px', '1rem', '1 2 3 4 5']) assert.equal(leerForma(v).tipo, 'otro', v);
  assert.equal(leerForma('').tipo, 'vacio');
  const f = { kind: 'forma' };
  assert.deepEqual(activo(modeloControl(f, '12px', 'desktop')), ['Redondo']);
  assert.deepEqual(activo(modeloControl(f, '', 'desktop')), ['Recto']);
  assert.deepEqual(activo(modeloControl(f, '4px', 'desktop')), []);          // imagen con 4px (grid de bloques): Otro
  assert.equal(modeloControl(f, '4px', 'desktop').personalizado, true);
  assert.equal(modeloControl(f, '12px', 'desktop').personalizado, false);
  // en móvil los botones también escriben un valor explícito (nunca '': eso sería "igual que escritorio")
  for (const m of ['desktop', 'mobile']) assert.deepEqual(modeloControl(f, '', m).opciones.map((o) => o.val), ['0', '6px', '12px', '999px']);
  assert.equal(FORMAS.length, 4);
});

t('tamaño de botón: S/M/L solo si coinciden padding Y fontSize; lo demás es Otro', () => {
  assert.deepEqual(leerTamanoBoton({ padding: '8px 16px', fontSize: '14px' }), { tipo: 'tam', k: 's' });
  assert.equal(leerTamanoBoton({ padding: '12px 24px', fontSize: '16px' }).k, 'm');
  assert.equal(leerTamanoBoton({ padding: '16px 32px', fontSize: '18px' }).k, 'l');
  assert.equal(leerTamanoBoton({ padding: ' 12px   24px ', fontSize: '16PX' }).k, 'm');                 // espacios y mayúsculas
  assert.equal(leerTamanoBoton({ padding: '12px 24px 12px 24px', fontSize: '16px' }).k, 'm');            // atajo de 4 partes
  assert.equal(leerTamanoBoton({ padding: '14px 28px', fontSize: '16px' }).tipo, 'otro');               // el botón por defecto de los bloques
  assert.equal(leerTamanoBoton({ padding: '12px 24px', fontSize: '17px' }).tipo, 'otro');               // solo coincide uno
  assert.equal(leerTamanoBoton({ padding: '12px 24px' }).tipo, 'otro');                                   // falta fontSize
  assert.equal(leerTamanoBoton({ fontSize: '16px' }).tipo, 'otro');
  assert.equal(leerTamanoBoton({}).tipo, 'vacio');
  const f = { kind: 'tamanoBoton' };
  const m = modeloControl(f, { padding: '16px 32px', fontSize: '18px' }, 'desktop');
  assert.deepEqual(activo(m), ['Grande']);
  assert.deepEqual(m.opciones.map((o) => o.vals), TAMANOS_BOTON.map((x) => ({ padding: x.padding, fontSize: x.fontSize })));
  assert.equal(modeloControl(f, { padding: '1px', fontSize: '2px' }, 'desktop').personalizado, true);
  assert.equal(modeloControl(f, {}, 'desktop').personalizado, false);
});

t('todos los botones y radios que traen los bloques se leen sin romperse', () => {
  const formas = new Set(), tams = new Set();
  for (const b of BLOCKS) for (const v of Object.keys(b.variants)) {
    walk(createBlock(b.id, v), (nodo) => {
      for (const est of [nodo.styles.base, nodo.styles.mobile]) {
        if (est.borderRadius) formas.add(est.borderRadius);
        if (nodo.type === 'button' && (est.padding || est.fontSize)) tams.add(`${est.padding}|${est.fontSize}`);
      }
    });
  }
  for (const v of formas) assert.doesNotThrow(() => leerForma(v), v);
  for (const t2 of tams) { const [padding, fontSize] = t2.split('|'); assert.doesNotThrow(() => leerTamanoBoton({ padding, fontSize }), t2); }
  console.log('   (radios:', [...formas].join(' | '), ')');
});

console.log(ok, 'pruebas ok');

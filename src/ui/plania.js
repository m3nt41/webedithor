// INTERFAZ DEL CAMINO 1 DE LA IA (sin servidor): "Copiar guía para IA" y "Pegar plan o JSON".
// La lógica vive en core/plan.js y core/guiaia.js; aquí solo hay diálogo, aviso y portapapeles.

import { t as tr } from '../i18n/index.js';
import { guiaIA } from '../core/guiaia.js';
import { leerEntrada } from '../core/plan.js';
import { aplicarEntrada, getState } from '../core/store.js';
import { SVG_AVISO } from './iconos.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Aviso breve abajo (se quita solo). */
export function toast(texto, error = false, ms = 2600) {
  let t = document.getElementById('toast-ia');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast-ia';
    t.setAttribute('role', 'status');
    document.body.append(t);
  }
  t.textContent = texto;
  t.classList.toggle('error', error);
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.hidden = true; }, ms);
}

/** Copia la guía al portapapeles. Si el navegador no deja (sin permiso), cae a un textarea temporal. */
export async function copiarGuia() {
  const texto = guiaIA();
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(ta); ta.select();
    const ok = document.execCommand?.('copy');
    ta.remove();
    if (!ok) { toast(tr('ia.noCopiado'), true); return false; }
  }
  toast(tr('ia.copiada'));
  return true;
}

let dialogo = null;

/** Abre el diálogo para pegar un plan o el JSON completo de una página. */
export function abrirDialogoPlan() {
  if (!dialogo) {
    dialogo = document.createElement('dialog');
    dialogo.id = 'dlg-plan';
    dialogo.setAttribute('aria-labelledby', 'dlg-plan-t');
    dialogo.innerHTML = `
      <form method="dialog" id="dlg-plan-f" novalidate>
        <h2 id="dlg-plan-t">${tr('ia.pegar')}</h2>
        <p class="modo">${tr('ia.dlgAyuda')}</p>
        <textarea id="dlg-plan-txt" rows="12" spellcheck="false" aria-label="${tr('ia.dlgCampo')}" placeholder='{ "plan": 1, "titulo": "…", "secciones": [ … ] }'></textarea>
        <div class="dlg-modo" role="radiogroup" aria-label="${tr('ia.dlgModo')}">
          <label><input type="radio" name="dlg-plan-modo" value="reemplazar" checked> ${tr('ia.reemplazar')}</label>
          <label><input type="radio" name="dlg-plan-modo" value="anadir"> ${tr('ia.anadir')}</label>
        </div>
        <div id="dlg-plan-msg" role="alert" hidden></div>
        <div class="dlg-botones">
          <button type="button" id="dlg-plan-cancel">${tr('comun.cancelar')}</button>
          <button type="submit" id="dlg-plan-ok" class="primario">${tr('comun.aplicar')}</button>
        </div>
      </form>`;
    document.body.append(dialogo);
    const txt = dialogo.querySelector('#dlg-plan-txt');
    const msg = dialogo.querySelector('#dlg-plan-msg');
    dialogo.querySelector('#dlg-plan-cancel').addEventListener('click', () => dialogo.close());
    dialogo.querySelector('#dlg-plan-f').addEventListener('submit', (e) => {
      e.preventDefault();
      if (dialogo.dataset.hecho === '1') { dialogo.close(); return; } // ya aplicado con avisos: "Listo" solo cierra
      const modo = dialogo.querySelector('input[name="dlg-plan-modo"]:checked').value;
      // en "Añadir" las secciones que ya hay también cuentan como destino de los enlaces
      const r = leerEntrada(txt.value, modo === 'anadir' ? getState().page.children : []);
      const lista = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
      if (r.errores.length || !r.secciones.length) {
        // No se cambia nada: se muestran los problemas
        const errs = r.errores.length ? r.errores : [tr('ia.sinSecciones')];
        msg.className = 'error'; msg.hidden = false;
        msg.innerHTML = `${SVG_AVISO}<strong>${tr('ia.nada')}</strong>${lista(errs)}`;
        return;
      }
      aplicarEntrada(r, modo);
      const n = r.secciones.length;
      if (r.avisos.length) {
        // Se aplicó, pero había cosas ignoradas: se muestran sin cerrar para que se lean
        msg.className = 'aviso'; msg.hidden = false;
        msg.innerHTML = `<strong>${tr(n === 1 ? 'ia.conAvisosUno' : 'ia.conAvisos', { n })}</strong>${lista(r.avisos)}`;
        dialogo.querySelector('#dlg-plan-ok').textContent = tr('comun.listo');
        dialogo.dataset.hecho = '1';
        return;
      }
      dialogo.close();
      toast(tr(`ia.aplicado${modo === 'anadir' ? 'Fin' : 'Pagina'}${n === 1 ? 'Uno' : ''}`, { n }));
    });
    dialogo.addEventListener('close', () => { dialogo.remove(); dialogo = null; });
  }
  dialogo.showModal();
  dialogo.querySelector('#dlg-plan-txt').focus();
  return dialogo;
}

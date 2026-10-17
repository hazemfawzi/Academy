/* Finishing touches applied after every screen and dialog is drawn, on both pages:
   - every player's name gets their avatar (their photo when one was added) beside it,
     unless the row already shows one;
   - the cash-shift feature is switched off, so its buttons and links disappear. */
(function () {
  'use strict';
  if (typeof V === 'undefined' || !window.KoraAvatars) return;
  const db = V.db;
  const HAS_AV = '.kg-avatar,.fb-av,.dk-av,.gd-av,.pa-av,.ms-avatar,.rf-avatar,.ax-avatar,.ax-av,.pc-av,img,.rg-photo';
  const SKIP = 'select,option,textarea,svg,.kg-avatar,.pa-av,.dk-assist-panel,.fp-nav,.kd-chart,title,script,style';
  const TAGS = 'b,strong,td,button,a,span,.pg-name,p,h3,h4,dd';
  function avatars(root) {
    if (!root) return;
    const names = new Map(); db.state.members.forEach(m => { if (m.name) names.set(m.name.trim(), m); });
    root.querySelectorAll(TAGS).forEach(el => {
      if (el.childElementCount || el.closest(SKIP)) return;
      const text = el.textContent.trim(); if (!names.has(text)) return;
      /* Look a few levels up, stopping at the row, for an avatar already shown with this name. */
      let up = el.parentElement, hops = 0, seen = false;
      while (up && hops < 4 && !seen) { if (up.querySelector(HAS_AV)) seen = true; if (up.matches('tr,li,[class*="row"],.ax-card,article,.fb-cand,.kd-detail,.it,.dk-msg,.gd-row,label,button')) break; up = up.parentElement; hops++; }
      if (seen) return;
      el.classList.add('pa-named');
      el.insertAdjacentHTML('afterbegin', `<span class="pa-av" aria-hidden="true">${KoraAvatars.portrait(text)}</span>`);
    });
  }
  /* No cash shifts: drop every way into them. */
  function noShifts(root) {
    if (!root) return;
    root.querySelectorAll('[onclick]').forEach(el => { if (/vshifts|shiftForm|shiftDetail|go\('shifts'\)|closeShift/.test(el.getAttribute('onclick'))) (el.closest('.ax-grid>button,.kd-quick>button,.v-stack>*') || el).remove(); });
    root.querySelectorAll('.kd-hero-side').forEach(el => el.remove());
  }
  const polish = root => { try { noShifts(root); avatars(root); } catch (e) { /* cosmetic only */ } };
  const content = () => document.getElementById('content') || document.querySelector('.phone') || document.body;
  if (typeof window.render === 'function') { const r = window.render; window.render = function () { const out = r.apply(this, arguments); polish(content()); return out; }; }
  if (typeof window.draw === 'function') { const d = window.draw; window.draw = function () { const out = d.apply(this, arguments); polish(content()); return out; }; }
  if (V.open) { const o = V.open; V.open = function () { const out = o.apply(this, arguments); polish(document.getElementById('modal')); polish(document.getElementById('sheet')); return out; }; }
  if (window.APPS?.manager) { APPS.manager.list = (APPS.manager.list || []).filter(x => x[0] !== 'shifts'); }
  polish(content());
})();

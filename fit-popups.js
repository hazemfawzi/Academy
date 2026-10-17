/* Popups never scroll. When a dialog is taller than the screen, its content is split into
   steps (a form) or pages (a list or a report) with back and next, keeping every field in
   the page so saving reads them all. Long lists and tables inside one block are split by
   rows. Registration manages its own steps and is left alone. Loaded last on both pages. */
(function () {
  'use strict';
  const HIDE = 'data-fp-hide';
  const skip = el => el.matches('.x,.grab,.v-modal-close,#v-error,.fp-nav,script,style,input[type=hidden]');
  const kids = el => [...el.children].filter(c => !skip(c));
  const hOf = el => { if (!el.getClientRects().length) return 0; const cs = getComputedStyle(el); return el.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); };
  const isAction = el => (el.tagName === 'BUTTON' || (el.querySelector('button') && !el.querySelector('input,select,textarea,table') && el.textContent.trim().length < 80)) && /primary|ax-btn|btn/.test(el.className + ' ' + (el.querySelector('button')?.className || ''));

  function fit(box) {
    if (!box || !box.isConnected) return;
    box.querySelectorAll('.fp-nav').forEach(n => n.remove());
    box.querySelectorAll(`[${HIDE}]`).forEach(n => n.removeAttribute(HIDE));
    if (box.querySelector('[data-no-fit]')) return;
    if (box.scrollHeight <= box.clientHeight + 4) return;
    let root = box;
    for (let k = kids(root); k.length === 1 && kids(k[0]).length; k = kids(root)) root = k[0];
    const all = kids(root);
    let head = 0;
    while (head < all.length - 1 && head < 3 && (/^H[1-4]$/.test(all[head].tagName) || all[head].matches('.rg-head') || (head && all[head].matches('.py-help,small')))) head++;
    let tail = all.length; while (tail > head + 1 && isAction(all[tail - 1])) tail--;
    const body = all.slice(head, tail), actions = all.slice(tail);
    if (!body.length) return;
    const gap = parseFloat(getComputedStyle(root).rowGap) || 0;
    const bodyH = body.reduce((n, el) => n + hOf(el) + gap, 0), avail = Math.max(160, box.clientHeight - (box.scrollHeight - bodyH) - 64);
    /* Units: whole blocks, or the rows of a block taller than a page. */
    const units = [];
    body.forEach(el => {
      const h = hOf(el) + gap;
      if (h <= avail) return units.push({ el, h });
      const cands = [el, ...el.querySelectorAll('tbody,ul,ol,div,section')].filter(c => kids(c).length >= 3 && hOf(c) >= h * 0.5);
      const box2 = cands.sort((a, b) => kids(b).length - kids(a).length)[0];
      if (!box2) return units.push({ el, h });
      const rows = kids(box2), rowsH = rows.reduce((n, r) => n + hOf(r), 0), over = Math.max(0, h - rowsH);
      rows.forEach(r => units.push({ el, h: hOf(r), over, part: box2, row: r }));
    });
    const pages = [[]]; let cur = 0;
    units.forEach(u => {
      const extra = page => u.part && !page.some(x => x.el === u.el) ? u.over : 0;
      if (cur + u.h + extra(pages[pages.length - 1]) > avail && pages[pages.length - 1].length) { pages.push([]); cur = 0; }
      cur += u.h + extra(pages[pages.length - 1]); pages[pages.length - 1].push(u);
    });
    if (pages.length < 2) return;
    const form = !!root.querySelector('input:not([type=hidden]),select,textarea');
    let at = 0;
    const nav = document.createElement('div'); nav.className = 'fp-nav';
    const show = i => {
      at = i;
      body.forEach(el => el.setAttribute(HIDE, ''));
      units.forEach(u => u.part && u.row.setAttribute(HIDE, ''));
      pages[i].forEach(u => { u.el.removeAttribute(HIDE); if (u.part) u.row.removeAttribute(HIDE); });
      actions.forEach(el => i === pages.length - 1 ? el.removeAttribute(HIDE) : el.setAttribute(HIDE, ''));
      nav.innerHTML = `<button type="button" class="fp-btn" ${i ? '' : 'disabled'} data-go="${i - 1}">→ السابق</button><span class="fp-steps">${pages.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('')}<b>${box.querySelector('.rg-steps') ? 'جزء' : form ? 'خطوة' : 'صفحة'} ${i + 1} من ${pages.length}</b></span>${i < pages.length - 1 ? `<button type="button" class="fp-btn fp-next" data-go="${i + 1}">التالي ←</button>` : `<span class="fp-btn fp-ghost"></span>`}`;
      box.scrollTop = 0;
    };
    nav.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b && !b.disabled) show(Number(b.dataset.go)); });
    const err = box.querySelector('#v-error');
    if (actions.length) actions[0].before(nav); else if (err && err.parentElement === root) err.before(nav); else root.appendChild(nav);
    show(0);
    /* A save that fails on a field from an earlier step jumps back to it. */
    if (err) new MutationObserver(() => { if (!err.textContent.trim()) return; const bad = root.querySelector(':invalid'); const p = bad && pages.findIndex(pg => pg.some(u => u.el.contains(bad))); if (p >= 0 && p !== at) show(p); }).observe(err, { childList: true, characterData: true, subtree: true });
  }
  window.FitPopups = { fit };
  const timers = {};
  const later = id => { clearTimeout(timers[id]); timers[id] = setTimeout(() => { const box = document.getElementById(id); fit(box); watch(box); }, 30); };
  /* Dialogs that redraw themselves (registration moving between its own steps) are fitted again. */
  const watched = new WeakSet();
  const watch = box => {
    if (!box || watched.has(box)) return; watched.add(box);
    const ours = n => n.nodeType === 1 && n.matches('.fp-nav');
    new MutationObserver(recs => {
      if (recs.every(r => (r.target.closest && r.target.closest('.fp-nav,#v-error')) || [...r.addedNodes, ...r.removedNodes].every(ours) || (r.addedNodes.length + r.removedNodes.length === 0))) return;
      later(box.id);
    }).observe(box, { childList: true, subtree: true });
  };
  if (typeof window.modal === 'function') { const m = window.modal; window.modal = function () { const r = m.apply(this, arguments); later('modal'); return r; }; }
  if (typeof window.sheet === 'function') { const s = window.sheet; window.sheet = function () { const r = s.apply(this, arguments); later('sheet'); return r; }; }
  /* Last script on the page: the final screen is drawn, show it. */
  const reveal = () => document.documentElement?.classList?.remove('booting');
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(reveal); else reveal();
  if (typeof V !== 'undefined' && V.open) { const o = V.open; V.open = function () { const r = o.apply(this, arguments); later('modal'); later('sheet'); return r; }; }
})();

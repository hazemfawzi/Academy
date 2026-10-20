/* Multi-sport showcase: in the full edition the apps can be seen as any coach (with their
   own sports and groups) or as the manager of any branch, straight from the home screen. */
(function () {
  'use strict';
  if (typeof APPS === 'undefined' || !window.AcademyApps || window.Edition?.single) return;
  const AA = window.AcademyApps, db = V.db, SE = window.SportEngine;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sportName = id => SE.get(id)?.name || id;
  const coaches = () => {
    const by = new Map();
    db.state.groups.forEach(g => { if (!g.coach) return; if (!by.has(g.coach)) by.set(g.coach, new Set()); by.get(g.coach).add(g.sport); });
    return [...by].map(([name, sports]) => ({ name, sports: [...sports] })).sort((a, b) => sportName(a.sports[0]).localeCompare(sportName(b.sports[0]), 'ar') || a.name.localeCompare(b.name, 'ar'));
  };
  const branches = () => [...new Set(db.state.groups.map(g => g.branch).filter(Boolean))];
  const Showcase = window.Showcase = {
    coach(name) {
      AA.coachName = name;
      const sports = AA.assignedSports ? AA.assignedSports() : [];
      if (sports.length) AA.sport = sports[0];
      AA.branch = 'all'; AA.groupId = 'all'; AA.sessionId = '';
      draw();
    },
    branch(name) {
      const MW = window.ManagerWorkspace; if (!MW) return;
      MW.branch = name;
      if (!db.state.groups.some(g => g.branch === name && g.sport === AA.sport)) { const g = db.state.groups.find(x => x.branch === name); if (g) AA.sport = g.sport; }
      AA.groupId = 'all'; AA.sessionId = '';
      draw();
    }
  };
  const bar = (label, select) => `<div class="sc-pick"><label><span>${label}</span>${select}</label></div>`;
  const inject = () => {
    const top = document.querySelector('.phone .ax-top'); if (!top || document.querySelector('.phone .sc-pick')) return;
    if (S.app === 'coach' && S.scr.coach === 'home') {
      top.insertAdjacentHTML('afterend', bar('تشوف التطبيق كمدرب', `<select aria-label="المدرب" onchange="Showcase.coach(this.value)">${coaches().map(c => `<option value="${E(c.name)}" ${c.name === AA.coachName ? 'selected' : ''}>${E(c.name)} · ${E(c.sports.map(sportName).join('، '))}</option>`).join('')}</select>`));
    }
    if (S.app === 'manager' && S.scr.manager === 'home' && window.ManagerWorkspace) {
      top.insertAdjacentHTML('afterend', bar('تشوف التطبيق كمدير فرع', `<select aria-label="الفرع" onchange="Showcase.branch(this.value)">${branches().map(b => `<option ${b === ManagerWorkspace.branch ? 'selected' : ''}>${E(b)}</option>`).join('')}</select>`));
    }
  };
  const base = window.draw;
  window.draw = function () { const out = base.apply(this, arguments); try { inject(); } catch (e) { console.error(e); } return out; };
  const css = document.createElement('style');
  css.textContent = '.sc-pick{padding:10px 16px 0}.sc-pick label{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#53695d;background:#eef3ef;border:1px dashed #b9cbbf;border-radius:12px;padding:6px 10px}.sc-pick span{white-space:nowrap;font-weight:600}.sc-pick select{flex:1;min-width:0;font:inherit;font-size:13px;border:0;background:transparent;color:#173b31;font-weight:700}';
  document.head.appendChild(css);
  inject();
})();

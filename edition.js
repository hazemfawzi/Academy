/* Editions: the same system runs as the full multi-sport academy, or as a system for one
   sport only (dashboard.html?edition=football, apps.html?edition=swimming ...). A single-
   sport edition locks every screen to that sport, hides sport switching and the other
   sports' tools, and carries the edition along every link. ?edition=all goes back to the
   full system. Loaded last on both pages. */
(function () {
  'use strict';
  const SE = window.SportEngine;
  if (!SE || typeof V === 'undefined') return;
  const db = V.db;
  let id = new URLSearchParams(location.search).get('edition');
  try { if (id) sessionStorage.setItem('academy-edition', id); else id = sessionStorage.getItem('academy-edition'); } catch { /* storage off: the URL alone decides */ }
  const def = id && id !== 'all' ? SE.get(id) : null;
  const ED = window.Edition = {
    sport: def && def.on !== false ? def.id : null,
    get def() { return this.sport ? SE.get(this.sport) : null; },
    get single() { return !!this.sport; },
    get title() { return this.single ? `أكاديمية ${this.def.name}` : 'أكاديمية النخبة'; },
    /* Same page, same edition: used for links between the dashboard and the apps. */
    link(href) { if (!this.single || !/(dashboard|apps)\.html/.test(href) || /edition=/.test(href)) return href; const [path, hash = ''] = href.split('#'); return path + (path.includes('?') ? '&' : '?') + 'edition=' + this.sport + (hash ? '#' + hash : ''); }
  };
  /* The state as one sport sees it: its groups, their players, sessions and money. */
  ED.scope = s => {
    if (!ED.sport) return s;
    const groups = s.groups.filter(g => g.sport === ED.sport), gid = new Set(groups.map(g => g.id)), members = s.members.filter(m => gid.has(m.group)), mid = new Set(members.map(m => m.id)), mine = r => mid.has(r.memberId);
    return { ...s, groups, members, sessions: s.sessions.filter(x => gid.has(x.group)), transactions: s.transactions.filter(mine), invoices: s.invoices.filter(mine), requests: s.requests.filter(mine), followups: s.followups.filter(mine), waitlist: (s.waitlist || []).filter(w => !w.group || gid.has(w.group)), leads: s.leads.filter(l => (!l.group || gid.has(l.group)) && (!l.sport || l.sport === ED.sport)) };
  };
  /* Football academies speak of squads and groups, not casual "جروبات". */
  const TERMS = ED.sport === 'football' ? [[/كل الجروبات/g, 'كل الفرق والمجموعات'], [/الجروبات/g, 'الفرق والمجموعات'], [/جروبات/g, 'فرق ومجموعات'], [/جروبًا/g, 'فريقًا أو مجموعة'], [/الجروب/g, 'الفريق'], [/جروب/g, 'مجموعة']] : [];
  ED.terms = root => {
    if (!TERMS.length || !root) return;
    const fix = t => TERMS.reduce((v, [a, b]) => v.replace(a, b), t);
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.nodeValue.includes('جروب')) n.nodeValue = fix(n.nodeValue);
    root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => ['placeholder', 'aria-label', 'title'].forEach(a => { const v = el.getAttribute(a); if (v && v.includes('جروب')) el.setAttribute(a, fix(v)); }));
  };
  document.documentElement.dataset.edition = ED.sport || 'all';
  if (!ED.single) return;
  document.body.classList.add('edition-single');
  document.title = ED.title;
  const fixLinks = () => document.querySelectorAll('a[href*="dashboard.html"],a[href*="apps.html"]').forEach(a => { const h = a.getAttribute('href'), n = ED.link(h); if (n !== h) a.setAttribute('href', n); });

  /* ---------- dashboard ---------- */
  if (typeof PAGES !== 'undefined' && window.AcademyUI) {
    const U = window.AcademyUI;
    U.sport = ED.sport;
    U.setSport = () => { U.sport = ED.sport; U.refresh(); };
    U.leaveSport = () => go('dash');
    U.openSport = () => go('dash');
    /* Sport settings open straight on this sport; other sports' pages leave the menu. */
    const settings = PAGES.sports;
    PAGES.sports = () => { setTimeout(() => window.SportBuilder?.open(ED.sport)); return settings ? settings() : ''; };
    const others = { matches: 'none', pathway: 'football', scouting: 'football' };
    const trim = (list, at) => list.forEach(sec => { const pages = sec[at]; for (let i = pages.length - 1; i >= 0; i--) { const r = pages[i][0]; if (others[r] && others[r] !== ED.sport) { pages.splice(i, 1); continue; } if (r === 'sports') pages[i][at === 2 ? 1 : 2] = 'إعدادات ' + ED.def.name; if (r === 'pathway') pages[i][at === 2 ? 1 : 2] = 'المراحل السنية'; if (r === 'groups' && ED.sport === 'football') pages[i][at === 2 ? 1 : 2] = 'الفرق والمجموعات'; } });
    if (window.WS_SECTIONS) { trim(window.WS_SECTIONS, 2); for (let i = window.WS_SECTIONS.length - 1; i >= 0; i--) { const sec = window.WS_SECTIONS[i]; if (!sec[2].length) window.WS_SECTIONS.splice(i, 1); else if (sec[0] === 'pathway') sec[1] = 'مسار الاحتراف'; } }
    trim(NAV, 1);
    for (let i = NAV.length - 1; i >= 0; i--) if (!NAV[i][1].length) NAV.splice(i, 1);
    if (window.Dashboard) window.Dashboard.scope = ED.scope;
    const analytics = PAGES.analytics;
    if (analytics) PAGES.analytics = () => analytics().replace('لكل الفروع والرياضات', `لكل فروع ${ED.title}`).replace('كل الفروع والرياضات /', `${ED.title} /`);
    const open = V.open;
    V.open = function (html) { const r = open.apply(this, arguments); ED.terms(document.getElementById('modal')); return r; };
    const base = window.render;
    window.render = function () {
      base();
      ED.terms(document.getElementById('content'));
      const logo = document.querySelector('.side .logo small'); if (logo) logo.textContent = `${ED.def.ico} ${ED.title}`;
      document.querySelectorAll('#content .ws-home-sports').forEach(el => el.remove());
      document.querySelectorAll('#content button[onclick]').forEach(b => { const on = b.getAttribute('onclick'); if (/leaveSport|sport\s*=\s*'all'|go\('sports'\)/.test(on) && !b.closest('.sb-page')) b.remove(); });
      fixLinks();
    };
  }

  /* ---------- apps ---------- */
  if (typeof APPS !== 'undefined' && window.AcademyApps) {
    const AA = window.AcademyApps, sportOf = m => db.state.groups.find(g => g.id === m?.group)?.sport;
    AA.sport = ED.sport;
    const pick = AA.pick; AA.pick = sid => { if (sid === ED.sport) pick(sid); };
    /* The parent sees only their children in this sport. */
    const switcher = AA.switcher;
    if (switcher) AA.switcher = () => { const html = switcher(); const box = document.createElement('div'); box.innerHTML = html; box.querySelectorAll('button[onclick]').forEach(b => { const mid = (b.getAttribute('onclick').match(/view\('([^']+)'\)/) || [])[1]; if (mid && sportOf(db.member(mid)) !== ED.sport) b.remove(); }); return box.querySelectorAll('button').length > 1 ? box.innerHTML : ''; };
    const viewer = AA.viewer && AA.viewer();
    if (viewer && sportOf(viewer) !== ED.sport) {
      const fam = window.Family?.of(db.member('m0')), kids = fam ? window.Family.members(fam.id) : [];
      const next = kids.find(m => sportOf(m) === ED.sport) || db.state.members.find(m => sportOf(m) === ED.sport);
      if (next && AA.view) { AA.viewerId = next.id; }
    }
    AA.configure && AA.configure();
    const base = window.draw;
    window.draw = function () { AA.sport = ED.sport; base(); ED.terms(document.querySelector('.phone') || document.body); fixLinks(); };
    const open = V.open;
    V.open = function (html) { const r = open.apply(this, arguments); ED.terms(document.getElementById('sheet')); return r; };
  }

  if (typeof render === 'function' && typeof PAGES !== 'undefined') render();
  if (typeof draw === 'function' && typeof APPS !== 'undefined') draw();
})();

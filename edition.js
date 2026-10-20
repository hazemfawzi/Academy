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
  /* The state as one sport sees it: its groups, their players, sessions and money, and
     the families, conversations, tickets and coaches that belong to them. */
  ED.scopeTo = (s, sport) => {
    const groups = s.groups.filter(g => g.sport === sport), gid = new Set(groups.map(g => g.id)), members = s.members.filter(m => gid.has(m.group)), mid = new Set(members.map(m => m.id)), mine = r => mid.has(r.memberId);
    const coaches = new Set(groups.map(g => g.coach).filter(Boolean)), fams = new Set(members.map(m => m.familyId).filter(Boolean));
    const party = p => p === 'admin' || (p.startsWith('member:') && mid.has(p.slice(7))) || (p.startsWith('coach:') && coaches.has(p.slice(6)));
    const settings = s.settings && s.settings.payroll ? { ...s.settings, payroll: Object.fromEntries(Object.entries(s.settings.payroll).filter(([c]) => coaches.has(c))) } : s.settings;
    return { ...s, groups, members, settings, sessions: s.sessions.filter(x => gid.has(x.group)), transactions: s.transactions.filter(mine), invoices: s.invoices.filter(mine), requests: s.requests.filter(mine), followups: s.followups.filter(mine), waitlist: (s.waitlist || []).filter(w => !w.group || gid.has(w.group)), leads: s.leads.filter(l => (!l.group || gid.has(l.group)) && (!l.sport || l.sport === sport)),
      families: (s.families || []).filter(f => fams.has(f.id)), chats: (s.chats || []).filter(t => t.kind === 'group' ? gid.has(t.groupId) : (t.members || []).every(party)), tickets: (s.tickets || []).filter(t => party(t.from || '')), payrollRuns: (s.payrollRuns || []).filter(r => coaches.has(r.coach)), payrollAdjust: (s.payrollAdjust || []).filter(r => coaches.has(r.coach)) };
  };
  ED.scope = s => ED.sport ? ED.scopeTo(s, ED.sport) : s;
  /* Football academies speak of squads and groups, not casual "جروبات". */
  const TERMS = ED.sport === 'football' ? [[/كل الجروبات/g, 'كل الفرق والمجموعات'], [/الجروبات/g, 'الفرق والمجموعات'], [/جروبات/g, 'فرق ومجموعات'], [/جروبًا/g, 'فريقًا أو مجموعة'], [/الجروب/g, 'الفريق'], [/جروب/g, 'مجموعة'], [/الأعضاء/g, 'اللاعبين'], [/أعضاء/g, 'لاعبين'], [/العضو(?!ي)/g, 'اللاعب'], [/عضو(?!ي)/g, 'لاعب']] : [];
  ED.terms = root => {
    if (!TERMS.length || !root) return;
    const fix = t => TERMS.reduce((v, [a, b]) => v.replace(a, b), t);
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (/جروب|عضو|أعضاء/.test(n.nodeValue)) n.nodeValue = fix(n.nodeValue);
    root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => ['placeholder', 'aria-label', 'title'].forEach(a => { const v = el.getAttribute(a); if (v && /جروب|عضو|أعضاء/.test(v)) el.setAttribute(a, fix(v)); }));
  };
  document.documentElement.dataset.edition = ED.sport || 'all';
  /* The full multi-sport academy: football's own tools sit together in one «كرة القدم»
     section after the programs, so the shared menu stays the same for every sport. */
  if (!ED.single && window.WS_SECTIONS) {
    const S = window.WS_SECTIONS, at = S.findIndex(x => x[0] === 'pathway');
    if (at >= 0) {
      const [fb] = S.splice(at, 1), OWN = { skills: 'المهارات والقوالب', tactics: 'اللوحة التكتيكية', matches: 'الماتشات والتقسيمة' };
      fb[1] = 'كرة القدم';
      fb[2] = fb[2].map(([r, t]) => [r, r === 'pathway' ? 'مسار الاحتراف' : t]);
      S.forEach(sec => { for (let i = sec[2].length - 1; i >= 0; i--) { const r = sec[2][i][0]; if (OWN[r]) { sec[2].splice(i, 1); fb[2].push([r, OWN[r]]); } } });
      const cal = S.findIndex(x => x[0] === 'calendar');
      S.splice(cal >= 0 ? cal + 1 : S.length - 1, 0, fb);
    }
  }
  /* Multi-sport academy: the sport chosen in the header (or the sport bar on each page)
     scopes every page, not only the ones that read it; the page keeps its scroll place. */
  if (!ED.single && window.AcademyUI && typeof window.render === 'function') {
    const U = window.AcademyUI, OWN = new Set(['dash', 'sports', 'pathway', 'scouting', 'tactics', 'skills', 'matches', 'squad', 'fbplayer']);
    const desc = Object.getOwnPropertyDescriptor(db, 'state');
    const draw = window.render;
    window.render = function () {
      const sport = U.sport;
      if (!sport || sport === 'all' || OWN.has(state.page) || !desc || !desc.configurable) return draw.apply(this, arguments);
      const view = ED.scopeTo(desc.get.call(db), sport);
      Object.defineProperty(db, 'state', { get: () => view, configurable: true, enumerable: desc.enumerable });
      try { return draw.apply(this, arguments); } finally { Object.defineProperty(db, 'state', desc); }
    };
    /* A sport bar at the top of every shared page. */
    const sportBar = () => {
      const content = document.getElementById('content');
      if (!content || OWN.has(state.page) || content.querySelector('.ws-sportbar')) return;
      const sports = SE.list().filter(d => d.on !== false && db.state.groups.some(g => g.sport === d.id));
      if (sports.length < 2) return;
      const chip = (id, label) => `<button type="button" class="${U.sport === id ? 'on' : ''}" aria-pressed="${U.sport === id}" onclick="AcademyUI.setSport('${id}')">${label}</button>`;
      content.insertAdjacentHTML('afterbegin', `<nav class="ws-sportbar" aria-label="الرياضة">${chip('all', 'كل الرياضات')}${sports.map(d => chip(d.id, `<span aria-hidden="true">${d.ico || ''}</span>${d.name}`)).join('')}</nav>`);
    };
    const scoped = window.render;
    /* The staff page lists coaches from the settings; keep the selected sport's coaches. */
    const staffRows = () => {
      if (state.page !== 'users' || U.sport === 'all') return;
      const names = SE.list().map(d => d.name), mine = SE.get(U.sport)?.name;
      document.querySelectorAll('#content tr').forEach(tr => { const t = tr.textContent, other = names.find(n => n !== mine && t.includes('مدرب ' + n)); if (other && !t.includes('مدرب ' + mine)) tr.hidden = true; });
    };
    window.render = function () { const out = scoped.apply(this, arguments); try { sportBar(); staffRows(); } catch (e) { console.error(e); } return out; };
    /* Changing the sport or branch redraws the same page where the reader is. */
    const keep = fn => function () { const y = window.scrollY, page = state.page; const out = fn.apply(this, arguments); if (state.page === page) window.scrollTo(0, y); return out; };
    U.setSport = keep(U.setSport); U.setBranch = keep(U.setBranch);
    const open = U.openSport;
    U.openSport = function (id) { if (state.page !== 'dash') return open.apply(this, arguments); const y = window.scrollY; U.sport = id; U.memberStatus = 'all'; U.query = ''; history.replaceState(null, '', '#sport=' + encodeURIComponent(id)); render(); window.scrollTo(0, y); };
  }
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
    const others = { matches: 'none', pathway: 'football', scouting: 'football', skills: 'football', tactics: 'football' };
    const trim = (list, at) => list.forEach(sec => { const pages = sec[at]; for (let i = pages.length - 1; i >= 0; i--) { const r = pages[i][0]; if (others[r] && others[r] !== ED.sport) { pages.splice(i, 1); continue; } if (r === 'sports') pages[i][at === 2 ? 1 : 2] = 'إعدادات ' + ED.def.name; if (r === 'pathway') pages[i][at === 2 ? 1 : 2] = 'المراحل السنية'; if (r === 'groups' && ED.sport === 'football') pages[i][at === 2 ? 1 : 2] = 'الفرق والمجموعات'; } });
    if (window.WS_SECTIONS) { trim(window.WS_SECTIONS, 2); for (let i = window.WS_SECTIONS.length - 1; i >= 0; i--) { const sec = window.WS_SECTIONS[i]; if (!sec[2].length) window.WS_SECTIONS.splice(i, 1); else if (sec[0] === 'pathway') sec[1] = 'مسار الاحتراف'; } }
    trim(NAV, 1);
    for (let i = NAV.length - 1; i >= 0; i--) if (!NAV[i][1].length) NAV.splice(i, 1);
    if (window.Dashboard) window.Dashboard.scope = ED.scope;
    /* The prototype's own group list (nutrition and older screens) keeps only this sport. */
    if (typeof GROUPS !== 'undefined' && window.MS?.GROUP_SPORT) { const mine = GROUPS.filter(g => (window.MS.GROUP_SPORT[g.id] || 'football') === ED.sport); GROUPS.splice(0, GROUPS.length, ...mine); }
    const analytics = PAGES.analytics;
    if (analytics) PAGES.analytics = () => analytics().replace('لكل الفروع والرياضات', `لكل فروع ${ED.title}`).replace('كل الفروع والرياضات /', `${ED.title} /`);
    const open = V.open;
    V.open = function (html) { const r = open.apply(this, arguments); ED.terms(document.getElementById('modal')); return r; };
    const base = window.render;
    window.render = function () {
      base();
      ED.terms(document.getElementById('content'));
      if (typeof state !== 'undefined' && state.page === 'dash') { const t = document.getElementById('title'); if (t) t.textContent = ED.title; }
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

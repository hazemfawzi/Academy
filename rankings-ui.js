/* Rankings on the dashboard:
   - a «الترتيب والأفضل» page: the best in every category, and the full ranking of any
     category or group with what each score is made of;
   - a «الأفضل في كل فئة» summary on the home page;
   - the group's own ranking at the top of its file;
   - a rank badge beside every player and one shared rank filter on every players list
     (players, the group file, the pathway squad). */
(function () {
  'use strict';
  if (typeof PAGES === 'undefined' || !window.Rankings || !window.AcademyUI) return;
  const R = window.Rankings, U = window.AcademyUI, db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const av = (name, size = 34) => window.KoraAvatars ? KoraAvatars.render(name, 'rk-av', size) : '';
  const TRACK = { pathway: 'مسار الاحتراف', school: 'مدرسة الكرة' };
  const RK = window.RankingsUI = { cat: 'all', group: 'all', gid: '' };
  RK.filter = (() => { try { return localStorage.getItem('kora.rankFilter') || 'all'; } catch (e) { return 'all'; } })();

  /* Rankings follow the branch-and-sport scope like every other page. */
  let memo = null;
  RK.rows = () => {
    if (memo && Date.now() - memo.t < 400) return memo.rows;
    const rows = R.all(db.state, { sports: window.SportEngine ? SportEngine.list() : [] });
    memo = { t: Date.now(), rows, by: new Map(rows.map(r => [r.id, r])) };
    return rows;
  };
  RK.of = id => { RK.rows(); return memo.by.get(id); };
  const scoped = () => { const ids = new Set(U.scope().members.map(m => m.id)); return RK.rows().filter(r => ids.has(r.id)); };

  const medal = rank => `<span class="rk-medal ${rank && rank <= 3 ? 'rk-m' + rank : ''}">${rank ?? '—'}</span>`;
  const bar = v => `<span class="rk-bar"><i style="width:${v ?? 0}%"></i></span>`;
  const catLabel = c => `${E(c.name)}${c.track ? ` <small>${TRACK[c.track]}</small>` : ''}`;
  const why = r => r.score == null ? 'لسه ماتقيّمش' : `الأداء ${r.perf} · الحضور ${r.attendance ?? '—'}% · ${Object.entries(r.parts).map(([k, v]) => R.PARTS[k] + ' ' + v).join(' · ')}`;
  /* The badge beside a player's name: their place in the category, then in the group. */
  RK.chip = id => {
    const r = RK.of(id); if (!r) return '';
    if (r.score == null) return '<span class="rk-chip rk-none" title="لسه ماتقيّمش">غير مقيّم</span>';
    return `<span class="rk-chip ${r.catRank <= 3 ? 'rk-c' + r.catRank : ''}" title="${E(why(r))}"><b>#${r.catRank}</b> في ${E(r.cat.name)} · #${r.groupRank} في المجموعة · ${r.score}</span>`;
  };
  RK.select = () => `<label class="rk-filter"><span>الترتيب</span><select aria-label="فلتر الترتيب" onchange="RankingsUI.setFilter(this.value)">${R.FILTERS.map(([k, l]) => `<option value="${k}" ${RK.filter === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
  RK.setFilter = v => {
    RK.filter = v; try { localStorage.setItem('kora.rankFilter', v); } catch (e) { /* per-device nicety only */ }
    const modal = document.querySelector('#modal .gd');
    if (modal && RK.gid) U.groupDetail(RK.gid); else render();
  };

  /* Badge every row and apply the filter: hide the rows it leaves out and order the rest by rank. */
  const ID = /(?:Refine\.profile|FootballUI\.openPlayer|FootballLabUI\.card)\('([^']+)'\)/;
  RK.decorate = (root, rowSel, nameSel) => {
    if (!root) return;
    const rows = [...root.querySelectorAll(rowSel)].map(el => ({ el, id: (ID.exec(el.innerHTML) || [])[1] })).filter(x => x.id);
    if (!rows.length) return;
    rows.forEach(({ el, id }) => { if (el.querySelector('.rk-chip')) return; const n = el.querySelector(nameSel); if (n) n.insertAdjacentHTML('afterend', RK.chip(id)); });
    if (RK.filter === 'all') return;
    /* Reorder in place: the rows may share their parent with headings and other blocks. */
    const parent = rows[0].el.parentElement, anchor = rows[rows.length - 1].el.nextSibling;
    rows.forEach(x => { x.r = RK.of(x.id); x.el.hidden = !R.keep(x.r, RK.filter); });
    rows.slice().sort((a, b) => (a.el.hidden - b.el.hidden) || R.sortKey(a.r, RK.filter) - R.sortKey(b.r, RK.filter)).forEach(x => parent.insertBefore(x.el, anchor));
    parent.querySelector(':scope > .rk-empty')?.remove();
    if (rows.every(x => x.el.hidden)) parent.insertBefore(Object.assign(document.createElement('p'), { className: 'rk-empty', textContent: 'مفيش لاعيبة في الفلتر ده. غيّر فلتر الترتيب.' }), anchor);
  };

  /* ---------- the page ---------- */
  const podium = c => `<article class="rk-cat"><header><h3>${catLabel(c)}</h3><span>${c.size} لاعب · ${c.groups} ${c.groups === 1 ? 'مجموعة' : 'مجموعات'}</span></header>
    <ol>${c.top.map(r => `<li><button type="button" onclick="Refine.profile('${r.id}')">${medal(r.catRank)}${av(r.name)}<span class="rk-who"><b>${E(r.name)}</b><small>${E(r.groupName)}</small></span><span class="rk-score">${r.score}</span></button></li>`).join('')}</ol>
    <button type="button" class="rk-more" onclick="RankingsUI.cat='${E(c.key)}';RankingsUI.group='all';render()">الترتيب الكامل للفئة</button></article>`;
  const table = list => `<div class="rk-table" role="table"><div class="rk-tr rk-th" role="row"><span>الترتيب</span><span>اللاعب</span><span>النتيجة</span><span>الأداء</span><span>الحضور</span><span>في المجموعة</span><span></span></div>
    ${list.map(r => `<div class="rk-tr" role="row">${medal(RK.group !== 'all' ? r.groupRank : r.catRank)}<span class="rk-who">${av(r.name)}<span><b>${E(r.name)}</b><small>${E(r.groupName)} · ${E(r.cat.name)}</small></span></span><span class="rk-total"><b>${r.score ?? '—'}</b>${bar(r.score)}</span><span title="${E(why(r))}">${r.perf ?? '—'}</span><span>${r.attendance ?? '—'}%</span><span>${r.groupRank ? `#${r.groupRank} من ${r.groupSize}` : '—'}</span><span><button type="button" class="sb-btn quiet small" onclick="Refine.profile('${r.id}')">الملف</button></span></div>`).join('') || '<p class="rk-empty">مفيش لاعيبة هنا.</p>'}</div>`;
  PAGES.rankings = () => {
    const rows = scoped(), cats = R.leaders(rows, 3), allCats = R.leaders(rows, 999);
    const groups = [...new Map(rows.map(r => [r.group, r.groupName])).entries()].filter(([g]) => RK.cat === 'all' || rows.some(r => r.group === g && r.cat.key === RK.cat));
    let body;
    if (RK.cat === 'all' && RK.group === 'all') body = `<div class="rk-cats">${cats.map(podium).join('') || '<p class="rk-empty">لسه مفيش تقييمات. قيّم اللاعيبة من المستويات والتقييمات أو بطاقة المهارات.</p>'}</div>`;
    else {
      let list = rows.filter(r => (RK.cat === 'all' || r.cat.key === RK.cat) && (RK.group === 'all' || r.group === RK.group));
      const f = RK.filter === 'all' ? 'sorted' : RK.filter, byGroup = RK.group !== 'all';
      list = list.filter(r => R.keep(r, f)).sort((a, b) => (a.score == null) - (b.score == null) || (byGroup ? a.groupRank - b.groupRank : a.catRank - b.catRank) || b.score - a.score);
      body = table(list);
    }
    return `<div class="sb-page rk-page"><header class="sb-head"><div><small>اللاعبون والعائلات</small><h1>الترتيب والأفضل</h1><p>كل لاعب ليه نتيجة من 100: <b>70% الأداء</b> (متوسط تقييم المحاور وبطاقة المهارات وتقييم الحصص وتقييم المستوى) و<b>30% الحضور</b>. الترتيب جوه الفئة العمرية وجوه المجموعة.</p></div></header>
      <div class="rk-bar-top"><div class="mg-filter rk-cats-filter"><button type="button" class="${RK.cat === 'all' ? 'on' : ''}" onclick="RankingsUI.cat='all';RankingsUI.group='all';render()">كل الفئات</button>${allCats.map(c => `<button type="button" class="${RK.cat === c.key ? 'on' : ''}" onclick="RankingsUI.cat='${E(c.key)}';RankingsUI.group='all';render()">${E(c.name)}${c.track === 'pathway' ? ' · مسار' : ''}</button>`).join('')}</div>
        <label class="rk-filter"><span>المجموعة</span><select aria-label="المجموعة" onchange="RankingsUI.group=this.value;render()"><option value="all">كل المجموعات</option>${groups.map(([g, n]) => `<option value="${E(g)}" ${RK.group === g ? 'selected' : ''}>${E(n)}</option>`).join('')}</select></label>
        ${RK.cat === 'all' && RK.group === 'all' ? '' : RK.select()}</div>${body}</div>`;
  };

  /* ---------- home summary ---------- */
  /* One category at a time: tabs for the categories and a podium of its best three. */
  RK.home = () => {
    const cats = R.leaders(scoped(), 3); if (!cats.length) return '';
    const c = cats.find(x => x.key === RK.homeCat) || cats[0];
    const portrait = r => { const m = db.state.members.find(m => m.id === r.id), photo = m?.photo; return photo && /^(data:image\/(png|jpe?g|webp);base64,|https?:\/\/|\/?assets\/)/i.test(photo) ? `<img class="rk-home-photo" src="${E(photo)}" alt="صورة ${E(r.name)}">` : `<span class="rk-home-initials" aria-label="${E(r.name)}">${E(r.name.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join(' '))}</span>`; };
    const card = r => `<button type="button" class="rk-hp rk-p${r.catRank}" onclick="Refine.profile('${r.id}')" title="${E(why(r))}"><div class="rk-player-head">${portrait(r)}<span class="rk-player-name"><b>${E(r.name)}</b><small>${E(r.groupName)}</small></span>${medal(r.catRank)}</div><div class="rk-player-metrics"><span><small>الأداء</small><b>${r.perf ?? '—'}<i> / 100</i></b></span><span><small>الحضور المسجّل</small><b>${r.attendance == null ? '—' : r.attendance+'%'}</b></span><span class="rk-player-total"><small>النتيجة</small><b>${r.score}<i> / 100</i></b></span></div></button>`;
    return `<section class="rk-home"><header><div><h2>المتميزون في كل فئة</h2><p>آخر التقييمات المتاحة وسجل الحضور الحالي · النتيجة: 70% أداء و30% حضور.</p></div><button type="button" class="sb-btn quiet small" onclick="RankingsUI.cat='${E(c.key)}';RankingsUI.group='all';go('rankings')">عرض الترتيب كاملًا ‹</button></header>
      <nav class="rk-tabs" aria-label="الفئات">${cats.map(x => `<button type="button" class="${x.key === c.key ? 'on' : ''}" aria-pressed="${x.key === c.key}" onclick="RankingsUI.homeTab('${E(x.key)}')">${E(x.name)}${x.track ? `<small>${x.track === 'pathway' ? 'مسار' : 'مدرسة'}</small>` : ''}</button>`).join('')}</nav>
      <div class="rk-hpodium">${c.top.map(card).join('')}</div><p class="rk-hfoot">أعلى ${c.top.length} من ${c.size} لاعبًا مقيّمًا في ${E(c.name)} · ${c.groups} ${c.groups === 1 ? 'مجموعة' : 'مجموعات'}</p></section>`;
  };
  RK.homeTab = key => { RK.homeCat = key; const el = document.querySelector('.rk-home'); if (el) el.outerHTML = RK.home(); };
  const home = PAGES.dash;
  PAGES.dash = function () { const html = home.apply(this, arguments), card = RK.home(); if (!card) return html; let at = html.indexOf('<div class="sport-bottom-grid">');if(at<0)at=html.indexOf('<section class="ws-home-tools">');if(at<0)at=html.lastIndexOf('</div>');return at < 0 ? html + card : html.slice(0,at)+card+html.slice(at); };

  /* ---------- group file ---------- */
  const groupDetail = U.groupDetail;
  U.groupDetail = id => {
    RK.gid = id;
    const out = groupDetail(id), modal = document.querySelector('#modal .gd');
    if (!modal) return out;
    const list = RK.rows().filter(r => r.group === id && r.groupRank != null).sort((a, b) => a.groupRank - b.groupRank), h3 = [...modal.querySelectorAll('h3')].find(h => h.nextElementSibling?.classList.contains('gd-row'));
    if (list.length && h3) h3.insertAdjacentHTML('beforebegin', `<section class="rk-group"><h3>ترتيب المجموعة</h3><div class="rk-podium">${list.slice(0, 3).map(r => `<button type="button" onclick="V.close();Refine.profile('${r.id}')" class="rk-p${r.groupRank}">${medal(r.groupRank)}${av(r.name, 44)}<b>${E(r.name)}</b><small>${r.score} من 100 · #${r.catRank} في ${E(r.cat.name)}</small></button>`).join('')}</div></section>`);
    if (h3) h3.insertAdjacentHTML('afterend', `<div class="rk-gd-tools">${RK.select()}</div>`);
    RK.decorate(modal, '.gd-row', '.gd-main b');
    return out;
  };

  /* ---------- players lists ---------- */
  const decoratePage = () => {
    const content = document.getElementById('content'); if (!content) return;
    if (state.page === 'members') {
      const bar = content.querySelector('.ac-filters'); if (bar && !bar.querySelector('.rk-filter')) bar.insertAdjacentHTML('beforeend', RK.select());
      RK.decorate(document.getElementById('ac-player-list'), 'article.ac-player', '.ac-name');
    }
    if (state.page === 'squad') {
      const bar = content.querySelector('.fb-filter'); if (bar && !bar.querySelector('.rk-filter')) bar.insertAdjacentHTML('beforeend', RK.select());
      RK.decorate(content.querySelector('.fb-roster'), '.fb-row:not(.fb-head)', '.fb-who b');
    }
  };
  const draw = window.render;
  window.render = function () { const out = draw.apply(this, arguments); try { decoratePage(); } catch (e) { console.error(e); } return out; };
  const search = U.search;
  if (search) U.search = v => { search(v); RK.decorate(document.getElementById('ac-player-list'), 'article.ac-player', '.ac-name'); };
  /* The first screen was drawn before this layer loaded. */
  if (document.getElementById('content') && typeof state !== 'undefined') try { render(); } catch (e) { console.error(e); }
})();

/* Multi-sport layer for the admin dashboard.
   Loads after every other dashboard script and extends GROUPS, NAV and PAGES in place. */
(function () {
  'use strict';
  if (typeof PAGES === 'undefined' || !window.MS) return;
  const M = window.MS;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = d => `<svg class="v-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const sportOf = gid => M.GROUP_SPORT[gid] || 'football';
  const on = () => M.SPORTS.filter(s => s.on);
  const BELT = ['#f4f4f4', '#f5d000', '#f08a00', '#1f9d55', '#2563eb', '#7c4a1e', '#111'];

  /* ---------- data: add the non-football groups ---------- */
  M.NEW_GROUPS.forEach(g => { if (!GROUPS.some(x => x.id === g.id)) GROUPS.push(Object.assign({}, g)); });
  if (typeof LG !== 'undefined') LG.groups = LG.groups.filter(id => sportOf(id) === 'football');

  /* Match/team selectors only list football groups. */
  if (typeof groupSelect === 'function') {
    const orig = groupSelect;
    window.groupSelect = function (cur, fn) {
      const keep = GROUPS.splice(0);
      GROUPS.push(...keep.filter(g => sportOf(g.id) === 'football'));
      try { return orig(cur, fn); } finally { GROUPS.splice(0, GROUPS.length, ...keep); }
    };
  }

  /* ---------- navigation ---------- */
  NAV.splice(2, 0, ['الرياضات', [
    ['sports', icon('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2c3 3 3 17 0 20'), 'الرياضات والخصائص'],
    ['progress', icon('M4 20V10 M10 20V4 M16 20v-7 M22 20H2'), 'المستويات والترقيات'],
    ['resources', icon('M3 4h18v16H3z M3 10h18 M9 4v16 M15 4v16'), 'الملاعب والحجوزات'],
    ['families', icon('M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 11a3 3 0 1 0 0-6 M3 21v-2a5 5 0 0 1 10 0v2 M15 21v-2a4 4 0 0 1 6-3.4'), 'أولياء الأمور والعائلات']
  ]]);
  NAV.forEach(([, items]) => items.forEach(it => { if (it[0] === 'matches') it[2] = 'الكورة: الماتشات والدوري'; }));

  /* ---------- shared bits ---------- */
  const chip = (txt, act, isOn) => `<button class="ms-chip ${isOn ? 'on' : ''}" onclick="${act}">${txt}</button>`;
  const sportChips = (cur, act, list) => `<div class="ms-chips">${(list || [['all', 'كل الرياضات']].concat(on().map(s => [s.id, s.ico + ' ' + s.name])))
    .map(([k, l]) => chip(l, `${act}('${k}')`, cur === k)).join('')}</div>`;
  const groupsOf = id => GROUPS.filter(g => sportOf(g.id) === id);

  /* ---------- dashboard home: sports strip ---------- */
  const dashOrig = PAGES.dash;
  PAGES.dash = function () {
    const strip = `<div class="card ms-strip"><h3>الرياضات في الأكاديمية<span class="sp"></span><button class="btn sm ghost" onclick="go('sports')">إدارة الرياضات</button></h3>
      <div class="ms-sports">${on().map(s => { const gs = groupsOf(s.id); return `<button class="ms-sport" onclick="MSD.filterGroups('${s.id}')"><span class="ms-ico">${s.ico}</span><b>${s.name}</b><small>${s.members} عضو · ${gs.length} جروب</small></button>`; }).join('')}</div></div>`;
    return strip + dashOrig.apply(this, arguments);
  };

  /* ---------- groups: sport filter + icons ---------- */
  const groupsOrig = PAGES.groups;
  PAGES.groups = function () {
    const f = M.state.sportFilter, keep = GROUPS.splice(0), names = keep.map(g => g.name);
    GROUPS.push(...keep.filter(g => f === 'all' || sportOf(g.id) === f));
    GROUPS.forEach(g => { g.name = M.sport(sportOf(g.id)).ico + ' ' + g.name; });
    let html;
    try { html = groupsOrig.apply(this, arguments); }
    finally { keep.forEach((g, i) => { g.name = names[i]; }); GROUPS.splice(0, GROUPS.length, ...keep); }
    return sportChips(f, 'MSD.filterGroups') + html;
  };

  /* ---------- group detail for non-football sports ---------- */
  const groupOrig = PAGES.group;
  PAGES.group = function () {
    const g = GROUPS.find(x => x.id === state.gid), sid = sportOf(g.id);
    if (sid === 'football') return groupOrig.apply(this, arguments);
    const s = M.sport(sid);
    const kpi = (l, v, d) => `<div class="card kpi"><div class="l">${l}</div><div class="v">${v}</div>${d ? `<div class="d muted">${d}</div>` : ''}</div>`;
    const mods = s.modules.map(k => `<span class="badge b-gray">${M.MODULES[k].name}</span>`).join(' ');
    let body = '';
    if (sid === 'karate') body = karateTable();
    else if (sid === 'swimming') body = swimTable();
    else if (sid === 'gymnastics') body = gymMatrix();
    else if (sid === 'padel') body = courtsGrid(true);
    else body = classesCard(g);
    return `<div style="margin-bottom:12px"><button class="btn sm ghost" onclick="go('groups')">→ رجوع للجروبات والمواعيد</button></div>
      <div class="grid g4">${kpi('الرياضة', s.ico + ' ' + s.name, s.tpl)}${kpi('المشتركين', g.n + '/' + g.cap, g.cap - g.n > 0 ? `${g.cap - g.n} أماكن فاضية` : 'الجروب كامل')}${kpi('المدربين', g.coaches.length, esc(g.coaches.map(c => c[0]).join(' + ')))}${kpi('المواعيد', g.days.map(d => DAYS[d]).join('، '), g.time + ' · ' + g.br)}</div>
      <div class="card" style="margin-top:16px"><h3>الخصائص المفعّلة للرياضة دي<span class="sp"></span><button class="btn sm ghost" onclick="go('sports')">تعديل</button></h3>${mods}</div>
      <div style="margin-top:16px">${body}</div>`;
  };

  /* ---------- page: sports & modules ---------- */
  PAGES.sports = function () {
    const cards = M.SPORTS.map(s => `<div class="card ms-scard ${s.on ? '' : 'off'}">
      <div class="ms-shead"><span class="ms-ico">${s.ico}</span><div class="f1"><b>${s.name}</b><div class="muted">قالب: ${s.tpl} · لقب المدرب: ${s.coach} · ${s.members} عضو</div></div>
      <label class="ms-switch"><input type="checkbox" ${s.on ? 'checked' : ''} onchange="MSD.toggleSport('${s.id}')" aria-label="تشغيل ${s.name}"><i></i></label></div>
      <div class="ms-sub">المستويات</div><div class="ms-levels">${s.levels.map((l, i) => `<span>${s.id === 'karate' ? `<em style="background:${BELT[i]}"></em>` : ''}${esc(l)}</span>`).join('')}</div>
      <div class="ms-sub">الخصائص</div><div class="ms-mods">${Object.keys(M.MODULES).filter(k => s.modules.includes(k) || relevant(s, k)).map(k =>
        `<button class="ms-mod ${s.modules.includes(k) ? 'on' : ''}" onclick="MSD.toggleMod('${s.id}','${k}')" title="${esc(M.MODULES[k].desc)}">${s.modules.includes(k) ? '✓ ' : '+ '}${M.MODULES[k].name}</button>`).join('')}</div>
    </div>`).join('');
    return `<div class="card ms-intro"><h3>كل رياضة بتفتح الخصائص اللي محتاجاها بس</h3><div class="muted">النظام واحد للكل: الأعضاء والاشتراكات والحضور والتحصيل والتغذية والتواصل. الرياضة بتضيف فوقهم خصائصها: الكورة تقسيمة وماتشات، الكاراتيه أحزمة واختبارات، السباحة مستويات وأزمنة، البادل حجز ملاعب. تقدر تشغّل أو تقفل أي خاصية لأي رياضة.</div>
      <div style="margin-top:12px"><button class="btn" onclick="MSD.addSport()">+ إضافة رياضة</button></div></div>
      <div class="ms-sgrid">${cards}</div>`;
  };
  const RELATED = { 'رياضة جماعية': ['teams', 'matches', 'league', 'ratings', 'tournaments', 'parents'], 'سباحة': ['levels', 'times', 'lanes', 'parents', 'tournaments'],
    'فنون قتالية': ['belts', 'exams', 'tournaments', 'parents'], 'مهارات بمستويات': ['levels', 'skills', 'parents', 'tournaments'],
    'رياضات المضرب': ['courts', 'pairs', 'americano', 'tournaments', 'levels'], 'كلاسات': ['classes', 'pr', 'levels'], 'فروسية': ['horses', 'levels', 'tournaments', 'parents'] };
  const relevant = (s, k) => (RELATED[s.tpl] || []).includes(k);

  /* ---------- page: progress (belts / levels / skills) ---------- */
  function karateTable() {
    const s = M.sport('karate');
    return `<div class="card"><h3>🥋 اختبار الأحزمة · ${M.KARATE_EXAM.date}<span class="sp"></span><button class="btn sm" onclick="MSD.notifyExam()">بلّغ أولياء الأمور</button></h3>
      <div class="muted" style="margin-bottom:10px">بنود الاختبار: ${M.KARATE_EXAM.items.join(' · ')}</div>
      <div class="tbl-wrap"><table><tr><th>اللاعب</th><th>السن</th><th>الحزام الحالي</th><th>الجاهزية للاختبار</th><th>ولي الأمر</th><th></th></tr>
      ${M.KARATE.map((k, i) => `<tr><td><b>${esc(k.n)}</b></td><td>${k.age}</td><td><span class="ms-belt"><em style="background:${BELT[k.belt]}"></em>${esc(s.levels[k.belt])}</span></td>
        <td><div class="ms-bar ${k.ready >= 70 ? 'ok' : ''}"><i style="width:${k.ready}%"></i></div><small>${k.ready}%</small></td><td>${esc(k.parent)}</td>
        <td>${k.ready >= 70 && k.belt < s.levels.length - 1 ? `<button class="btn sm" onclick="MSD.promote(${i})">ترقية لـ ${esc(s.levels[Math.min(k.belt + 1, s.levels.length - 1)])}</button>` : '<span class="badge b-or">محتاج تدريب</span>'}</td></tr>`).join('')}</table></div></div>`;
  }
  function swimTable() {
    const s = M.sport('swimming');
    return `<div class="card"><h3>🏊 المستويات وزمن 25 متر حرة<span class="sp"></span><span class="muted">الترقية لما الزمن ينزل عن 30 ثانية</span></h3>
      <div class="tbl-wrap"><table><tr><th>السبّاح</th><th>السن</th><th>المستوى</th><th>آخر زمن</th><th>قبلها</th><th>التحسن</th><th></th></tr>
      ${M.SWIM.map((w, i) => { const d = (w.prev - w.free25).toFixed(1); return `<tr><td><b>${esc(w.n)}</b></td><td>${w.age}</td><td><span class="badge b-blue">${esc(s.levels[w.level])}</span></td>
        <td><b class="v-mono">${w.free25.toFixed(1)}s</b></td><td class="muted v-mono">${w.prev.toFixed(1)}s</td><td><span class="badge b-green">▼ ${d} ث</span></td>
        <td>${w.free25 < 30 && w.level < s.levels.length - 1 ? `<button class="btn sm" onclick="MSD.swimUp(${i})">رقّي لـ ${esc(s.levels[w.level + 1].split(' · ')[0])}</button>` : ''}</td></tr>`; }).join('')}</table></div></div>`;
  }
  function gymMatrix() {
    return `<div class="card"><h3>🤸 مهارات مستوى 2<span class="sp"></span><span class="muted">اضغط على أي خانة تعلّم المهارة</span></h3>
      <div class="tbl-wrap"><table class="ms-matrix"><tr><th>اللاعبة</th>${M.GYM_SKILLS.map(x => `<th>${esc(x)}</th>`).join('')}<th>الإنجاز</th></tr>
      ${M.GYM.map((a, i) => { const n = a.done.filter(Boolean).length; return `<tr><td><b>${esc(a.n)}</b><div class="muted">${a.age} سنين</div></td>${a.done.map((d, j) => `<td><button class="ms-cell ${d ? 'on' : ''}" onclick="MSD.skill(${i},${j})" aria-label="${M.GYM_SKILLS[j]}">${d ? '✓' : ''}</button></td>`).join('')}
        <td>${n === M.GYM_SKILLS.length ? '<span class="badge b-green">جاهزة لمستوى 3</span>' : `${n}/${M.GYM_SKILLS.length}`}</td></tr>`; }).join('')}</table></div></div>`;
  }
  function classesCard(g) {
    const rows = [['الأحد', '8:00 ص', 'كروس فيت', 13, 16], ['الثلاثاء', '8:00 ص', 'قوة ومقاومة', 16, 16], ['الخميس', '8:00 ص', 'كارديو HIIT', 9, 16]];
    return `<div class="card"><h3>💪 كلاسات الأسبوع<span class="sp"></span><span class="muted">الكلاس بيتقفل أوتوماتيك لما يكمل</span></h3><div class="tbl-wrap"><table><tr><th>اليوم</th><th>الميعاد</th><th>الكلاس</th><th>الحجز</th></tr>
      ${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td><td>${r[3] >= r[4] ? '<span class="badge b-red">كامل · قايمة انتظار</span>' : `${r[3]}/${r[4]}`}</td></tr>`).join('')}</table></div></div>
      <div class="card" style="margin-top:16px"><h3>🏆 الأرقام القياسية في الجروب</h3><div class="list"><div class="it"><div class="f1">سكوات · سيف علاء</div><b>120 كجم</b></div><div class="it"><div class="f1">ديدليفت · عمر خالد</div><b>150 كجم</b></div><div class="it"><div class="f1">جري 1 كم · منة حسام</div><b>4:12</b></div></div></div>`;
  }
  PAGES.progress = function () {
    const tabs = [['karate', '🥋 الكاراتيه: الأحزمة'], ['swimming', '🏊 السباحة: المستويات'], ['gymnastics', '🤸 الجمباز: المهارات']].filter(t => M.sport(t[0]).on);
    if (!tabs.some(t => t[0] === M.state.progSport) && tabs[0]) M.state.progSport = tabs[0][0];
    const p = M.state.progSport;
    const body = !tabs.length ? '<div class="card muted">مفيش رياضة بمستويات شغّالة دلوقتي.</div>' : p === 'karate' ? karateTable() : p === 'swimming' ? swimTable() : gymMatrix();
    return `<div class="card ms-intro"><div class="muted">كل رياضة ليها طريقة ترقي مختلفة، بس كلها بتتسجل في ملف اللاعب وبتوصل لولي الأمر على تطبيقه.</div></div>
      ${sportChips(p, 'MSD.prog', tabs)}${body}`;
  };

  /* ---------- page: courts & bookings ---------- */
  function courtsGrid(compact) {
    const cell = (c, t) => { const b = M.BOOKINGS.find(x => x[0] === c && x[1] === t);
      return b ? `<div class="ms-slot ${b[3]}">${esc(b[2])}<small>${b[3] === 'group' ? 'جروب' : b[3] === 'event' ? 'بطولة' : 'حجز'}</small></div>`
        : `<button class="ms-slot free" onclick="MSD.book(${c},${t})">فاضي<small>+ احجز</small></button>`; };
    const grid = `<div class="ms-court-grid" style="grid-template-columns:90px repeat(${M.COURTS.length},1fr)"><div></div>${M.COURTS.map(c => `<div class="h">${c}</div>`).join('')}
      ${M.SLOTS.map((t, ti) => `<div class="t">${t}</div>${M.COURTS.map((_, ci) => cell(ci, ti)).join('')}`).join('')}</div>`;
    if (compact) return `<div class="card"><h3>🎾 ملاعب البادل النهارده</h3>${grid}</div>`;
    return grid;
  }
  PAGES.resources = function () {
    const paid = M.BOOKINGS.filter(b => b[3] === 'booking').length, total = M.COURTS.length * M.SLOTS.length, used = M.BOOKINGS.length;
    return `<div class="grid g4"><div class="card kpi"><div class="l">إشغال الملاعب النهارده</div><div class="v">${Math.round(used / total * 100)}%</div><div class="d muted">${used} من ${total} فترة محجوزة</div></div>
      <div class="card kpi"><div class="l">حجوزات خارجية</div><div class="v">${paid}</div><div class="d muted">إيراد ${(paid * 600).toLocaleString('en')} ج</div></div>
      <div class="card kpi"><div class="l">حصص الجروبات</div><div class="v">${M.BOOKINGS.filter(b => b[3] === 'group').length}</div><div class="d muted">محجوزة أوتوماتيك من الجدول</div></div>
      <div class="card kpi"><div class="l">بطولات</div><div class="v">${new Set(M.BOOKINGS.filter(b => b[3] === 'event').map(b => b[2])).size}</div><div class="d muted">أمريكانو الخميس</div></div></div>
      <div class="card" style="margin-top:16px"><h3>🎾 ملاعب البادل · النهارده<span class="sp"></span><span class="muted">الساعة ونص بـ 600 ج</span></h3>${courtsGrid(false)}
      <div class="ms-legend"><span class="group">جروب</span><span class="booking">حجز</span><span class="event">بطولة</span><span class="free">فاضي</span></div></div>
      <div class="card" style="margin-top:16px"><h3>موارد تانية بتتحجز بنفس الطريقة</h3><div class="muted">حارات حمام السباحة، صالة الجمباز، ملاعب الكورة الخماسي، وأي حصان في الإسطبل لو الأكاديمية فيها فروسية.</div></div>`;
  };

  /* ---------- page: families ---------- */
  PAGES.families = function () {
    const due = M.FAMILIES.reduce((a, f) => a + f.due, 0), kids = M.FAMILIES.reduce((a, f) => a + f.kids.length, 0);
    return `<div class="grid g4"><div class="card kpi"><div class="l">حسابات عائلية</div><div class="v">${M.FAMILIES.length}</div></div>
      <div class="card kpi"><div class="l">أفراد تحت الحسابات</div><div class="v">${kids}</div></div>
      <div class="card kpi"><div class="l">خصم الإخوات</div><div class="v">10%</div><div class="d muted">من تاني فرد في العيلة</div></div>
      <div class="card kpi"><div class="l">مستحق على العائلات</div><div class="v" style="color:var(--red)">${due.toLocaleString('en')} ج</div></div></div>
      <div class="ms-fam">${M.FAMILIES.map((f, i) => `<div class="card"><h3>${esc(f.parent)}<span class="sp"></span><span class="muted v-mono">${f.phone}</span></h3>
        <div class="list">${f.kids.map(k => { const s = M.sport(k.sport); return `<div class="it"><span class="ms-ico sm">${s.ico}</span><div class="f1"><b>${esc(k.n)}</b><div class="muted">${k.age ? k.age + ' سنين · ' : ''}${esc(k.group)}</div></div><span class="badge ${stB(k.status)}">${k.status}</span></div>`; }).join('')}</div>
        <div class="ms-famfoot"><div><div class="muted">الاشتراك الشهري للعيلة</div><b>${f.monthly.toLocaleString('en')} ج</b>${f.discount ? ` <span class="badge b-green">خصم ${f.discount}%</span>` : ''}</div>
        ${f.due ? `<button class="btn sm" onclick="MSD.collect(${i})">تحصيل ${f.due} ج</button>` : '<span class="badge b-green">مدفوع</span>'}<button class="btn sm wa" onclick="toast('اتبعتت رسالة لـ ${esc(f.parent)} على الواتساب')">واتساب</button></div></div>`).join('')}</div>`;
  };

  /* ---------- actions ---------- */
  window.MSD = {
    filterGroups(id) { M.state.sportFilter = id; go('groups'); },
    prog(id) { M.state.progSport = id; render(); },
    toggleSport(id) { V.run(() => { const s = SportEngine.toggle(id, !M.sport(id).on); toast(s.on ? `${s.name} اتشغّلت` : `${s.name} اتقفلت ومش هتظهر للأعضاء`); render(); }); },
    toggleMod(id, k) { V.run(() => { const i = M.sport(id).modules.indexOf(k), s = SportEngine.toggleModule(id, k); toast(`${M.MODULES[k].name}: ${i >= 0 ? 'اتقفلت' : 'اتفعّلت'} لـ ${s.name}`); render(); }); },
    addSport() {
      const left = M.CATALOG.filter(c => !M.SPORTS.some(s => s.id === c.id));
      modal(`<h2>إضافة رياضة</h2><div class="muted" style="margin-bottom:12px">اختار الرياضة، وهي بتيجي بالخصائص المناسبة ليها، وتقدر تعدّلها بعدين.</div>
        <div class="list">${left.map(c => `<div class="it"><span class="ms-ico sm">${c.ico}</span><div class="f1"><b>${c.name}</b><div class="muted">${c.modules.map(k => M.MODULES[k].name).join(' · ')}</div></div><button class="btn sm" onclick="MSD.addFrom('${c.id}')">إضافة</button></div>`).join('') || '<div class="muted">كل الرياضات المتاحة مضافة.</div>'}</div>`);
    },
    addFrom(id) {
      V.run(() => { const def = SportEngine.save(SportEngine.draft({ catalogId: id })); closeAll(); toast(`${def.name} اتضافت بخصائصها`); render(); });
    },
    promote(i) { const k = M.KARATE[i], s = M.sport('karate'); if (k.belt < s.levels.length - 1) k.belt++; k.ready = 20; toast(`${k.n} اترقى للحزام ${s.levels[k.belt]} واتبعت لولي أمره`); render(); },
    swimUp(i) { const w = M.SWIM[i], s = M.sport('swimming'); w.level++; toast(`${w.n} اترقت لـ ${s.levels[w.level]}`); render(); },
    skill(i, j) { const a = M.GYM[i]; a.done[j] = a.done[j] ? 0 : 1; render(); },
    notifyExam() { toast(`اتبعت ميعاد الاختبار (${M.KARATE_EXAM.date}) لأولياء الأمور`); },
    book(c, t) {
      modal(`<h2>حجز ${M.COURTS[c]} · ${M.SLOTS[t]}</h2><label class="muted">اسم اللي حاجز</label><input id="msBk" class="sel" style="width:100%;margin:6px 0 12px" placeholder="مثلاً: عمرو نبيل + 3">
        <div class="muted" style="margin-bottom:12px">السعر 600 ج للساعة ونص · الدفع كاش أو إنستاباي</div><button class="btn" onclick="MSD.saveBook(${c},${t})">تأكيد الحجز</button>`);
    },
    saveBook(c, t) { const v = (document.getElementById('msBk').value || '').trim() || 'حجز جديد'; M.BOOKINGS.push([c, t, v, 'booking']); closeAll(); toast('الحجز اتأكد واتبعت للعميل'); render(); },
    collect(i) { const f = M.FAMILIES[i]; toast(`اتحصّل ${f.due} ج من ${f.parent}`); f.due = 0; f.kids.forEach(k => { if (k.status === 'متأخر') k.status = 'نشط'; }); render(); }
  };

  const h = (location.hash || '').slice(1);
  if (PAGES[h] && h !== 'group') state.page = h;
  if (typeof render === 'function') render();
})();

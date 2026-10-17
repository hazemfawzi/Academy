/* Dashboard shell: seven menu sections with tabs inside each, one branch-and-sport
   scope in the header, and a home page built around today's decisions. */
(function () {
  'use strict';
  if (typeof PAGES === 'undefined' || !window.AcademyUI || !window.AcademyModel) return;
  const U = window.AcademyUI, M = window.AcademyModel, db = V.db, SE = window.SportEngine;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => new Intl.NumberFormat('en-US').format(Math.round(n)) + ' ج';
  const time = v => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' }).format(new Date(v));
  const today = () => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const count = (n, one, two, few, many) => n === 0 ? 'لا ' + many : n === 1 ? one : n === 2 ? two : n <= 10 ? n + ' ' + few : n + ' ' + many;
  const btn = (label, action, cls = '') => `<button type="button" class="sb-btn ${cls}" onclick="${E(action)}">${E(label)}</button>`;

  const ICONS = { desk: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', pathway: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 12h.01', home: 'M3 11l9-8 9 8M5 10v11h5v-7h4v7h5V10', people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9', calendar: 'M3 5h18v16H3zM7 3v4M17 3v4M3 11h18', tasks: 'M5 3h14v18H5zM8 8h8M8 12h8M8 16h5', money: 'M3 5h18v14H3zM3 10h18M7 15h3', chart: 'M4 20V4M4 20h17M8 16v-4M13 16V8M18 16V5', settings: 'M4 7h16M4 12h16M4 17h16M8 5v4M16 10v4M10 15v4' };
  const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[k]}"/></svg>`;

  const SECTIONS = [
    ['home', 'الرئيسية', [['dash', 'الرئيسية']]],
    ['people', 'اللاعبون والعائلات', [['members', 'اللاعبون'], ['families', 'العائلات']]],
    ['pathway', 'مسار الكورة', [['pathway', 'المراحل السنية'], ['scouting', 'الكشافة والاختبارات']]],
    ['calendar', 'البرامج والجدول', [['attendance', 'الجدول والحصص'], ['groups', 'الجروبات'], ['progress', 'المستويات والتقييمات'], ['plans', 'خطط التدريب'], ['skills', 'المهارات والقوالب'], ['tactics', 'اللوحة التكتيكية'], ['sports', 'بناء الرياضات']]],
    ['tasks', 'المبيعات والمتابعة', [['vleads', 'العملاء والتجارب'], ['vrequests', 'الطلبات'], ['vfollowups', 'المتابعات'], ['vwaitlist', 'قائمة الانتظار']]],
    ['desk', 'التواصل والدعم', [['chat', 'المحادثات'], ['tickets', 'تذاكر الدعم'], ['automation', 'الرسائل الآلية']]],
    ['money', 'المالية', [['billing', 'التحصيل والفواتير'], ['payroll', 'مستحقات المدربين']]],
    ['chart', 'التقارير', [['reports', 'التقارير وسجل الإجراءات'], ['analytics', 'تحليل الأداء']]],
    ['settings', 'الإعدادات والأدوات', [['settings', 'الإعدادات'], ['users', 'الفريق والصلاحيات'], ['branches', 'الفروع'], ['comms', 'التواصل'], ['resources', 'الملاعب والحجوزات'], ['matches', 'الكورة: الماتشات'], ['nutrition', 'التغذية']]]
  ];
  const EXTRA = { sportedit: 'calendar', group: 'people', coach: 'settings', squad: 'pathway', fbplayer: 'pathway' };
  window.WS_SECTIONS = SECTIONS;
  const sectionOf = page => SECTIONS.find(s => s[2].some(([r]) => r === page)) || SECTIONS.find(s => s[0] === EXTRA[page]);

  /* Keep NAV in the format the base render expects for page titles. */
  NAV.splice(0, NAV.length, ...SECTIONS.map(([k, label, pages]) => [label, pages.map(([r, t]) => [r, k, t])]));

  const badges = () => {
    const a = U.scope(), overdue = a.followups.filter(f => f.status === 'open' && f.due <= db.day(new Date())).length;
    const desk = window.Desk && window.DeskCore ? Desk.unreadFor('admin') + (db.state.tickets || []).filter(t => t.status === 'open').length : 0;
    return { tasks: a.pending.length + overdue, money: a.openInvoices.length, desk };
  };
  navHTML = () => {
    const b = badges(), cur = sectionOf(state.page);
    return SECTIONS.map(([k, label, pages]) => `<a href="#${pages[0][0]}" class="${cur && cur[0] === k ? 'on' : ''}" onclick="go('${pages[0][0]}');return false"><span class="ac-nav-icon">${icon(k)}</span>${E(label)}${b[k] ? `<em class="ws-badge">${b[k]}</em>` : ''}</a>`).join('');
  };

  /* One scope control in the header for every page. */
  const scopeHTML = () => {
    const branches = [...new Set(db.state.groups.map(g => g.branch).filter(Boolean))];
    const sports = SE ? SE.list().filter(d => d.on !== false) : [];
    return `<label><span>الفرع</span><select aria-label="الفرع" onchange="AcademyUI.setBranch(this.value)"><option value="all">كل الفروع</option>${branches.map(b => `<option ${U.branch === b ? 'selected' : ''}>${E(b)}</option>`).join('')}</select></label>
      <label><span>الرياضة</span><select aria-label="الرياضة" onchange="AcademyUI.setSport(this.value)"><option value="all">كل الرياضات</option>${sports.map(d => `<option value="${d.id}" ${U.sport === d.id ? 'selected' : ''}>${E(d.ico)} ${E(d.name)}</option>`).join('')}</select></label>`;
  };

  const base = window.render;
  window.render = function () {
    base();
    const top = document.querySelector('.top');
    if (top) {
      let scope = document.getElementById('ws-scope');
      if (!scope) { scope = document.createElement('div'); scope.id = 'ws-scope'; scope.className = 'ws-scope'; const sel = document.getElementById('branchSel'); (sel?.parentElement || top).insertBefore(scope, sel || null); }
      scope.innerHTML = scopeHTML();
    }
    const sec = sectionOf(state.page), content = document.getElementById('content');
    if (sec && sec[2].length > 1 && content && !content.querySelector('.ws-section-tabs')) {
      content.insertAdjacentHTML('afterbegin', `<nav class="ws-section-tabs" aria-label="${E(sec[1])}">${sec[2].map(([r, t]) => `<button type="button" class="${state.page === r ? 'on' : ''}" aria-current="${state.page === r ? 'page' : 'false'}" onclick="go('${r}')">${E(t)}</button>`).join('')}</nav>`);
    }
    document.body.classList.add('ws-shell');
  };

  /* ---------- home ---------- */
  const homeBase = PAGES.dash;
  /* The original home (colored indicators, quick actions, sport cards) stays the default;
     the decisions view below is kept as AcademyUI.decisions for later use. */
  U.decisions = () => {
    const a = U.scope(), now = new Date(), day = db.day(now);
    const todays = a.todaySessions.filter(s => s.status !== 'cancelled');
    const overdue = a.followups.filter(f => f.status === 'open' && f.due <= day);
    const eligible = window.Progress ? a.members.filter(m => m.sportLevel && Progress.eligibility(m)?.eligible).length : 0;
    const exams = (db.state.exams || []).filter(e => e.status === 'scheduled' && e.date >= day);
    const conflicts = (db.state.scheduleConflicts || []).length;
    const decisions = [
      [a.pending.length, 'طلبات تنتظر المراجعة', 'تجميد ودفع وتعويض', "go('vrequests')", 'warn'],
      [a.openInvoices.length, 'فواتير عليها متبقي', money(a.outstanding) + ' إجمالي المتبقي', "go('billing')", 'warn'],
      [overdue.length, 'متابعات مستحقة', overdue.filter(f => f.kind === 'unpaid-attendance').length ? 'منها حضور بدون اشتراك' : 'تواصل مع اللاعب أو ولي الأمر', "go('vfollowups')", ''],
      [a.renewals.length, 'تجديدات خلال أسبوع', 'اشتراكات قربت تخلص', "AcademyUI.memberStatus='renewal';go('members')", ''],
      [eligible, 'مؤهلون للترقية', 'المهارات والحضور مكتملة', "go('progress')", 'ok'],
      [exams.length, 'اختبارات ترقية قادمة', exams[0] ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(exams[0].date + 'T12:00')) + ' · ' + (SE.get(exams[0].sport)?.name || '') : '', "go('progress')", ''],
      [conflicts, 'مواعيد بها تعارض', 'مدرب أو مكان محجوز', "go('groups')", 'warn']
    ].filter(x => x[0] > 0);
    const sports = SE.list().filter(d => d.on !== false).map(d => {
      const gs = a.groups.filter(g => g.sport === d.id), ids = new Set(gs.map(g => g.id)), players = a.members.filter(m => ids.has(m.group));
      return { d, players: players.length, active: players.filter(m => M.status(m, now) === 'active').length, groups: gs.length, today: todays.filter(s => ids.has(s.group)).length };
    }).filter(x => x.groups);
    const series = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 6 + i); const k = db.day(d); return { label: new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'short' }).format(d), v: a.transactions.filter(t => db.day(t.at) === k).reduce((n, t) => n + (t.kind === 'refund' ? -t.amount : t.amount), 0) }; });
    const max = Math.max(1, ...series.map(x => x.v));
    const group = id => db.state.groups.find(g => g.id === id);
    return `<div class="ws-home2">
      <header class="ws-hello"><div><small>${E(today())} · ${U.branch === 'all' ? 'كل الفروع' : E(U.branch)}</small><h1>يوم الأكاديمية</h1></div>
        <div class="ws-quick">${btn('+ تسجيل لاعب', 'Registration.open()', 'primary')}${btn('تحصيل', 'AcademyUI.chooseMember()')}${btn('عميل جديد', 'V.leadForm()')}${btn('جروب جديد', 'ProgramsUI.groupForm()')}</div></header>
      <div class="ws-kpis">
        <button type="button" onclick="go('members')"><small>اشتراكات نشطة</small><b>${a.active}</b><span>من ${count(a.members.length, 'لاعب واحد', 'لاعبين', 'لاعبين', 'لاعب')}</span></button>
        <button type="button" onclick="go('billing')"><small>تحصيل اليوم</small><b>${money(a.net)}</b><span>${a.refund ? 'بعد استرداد ' + money(a.refund) : 'صافي بعد الاسترداد'}</span></button>
        <button type="button" onclick="go('attendance')"><small>حصص اليوم</small><b>${todays.length}</b><span>${count(a.upcoming.length, 'حصة قادمة', 'حصتان قادمتان', 'حصص قادمة', 'حصة قادمة')}</span></button>
        <button type="button" class="${a.outstanding ? 'attention' : ''}" onclick="go('billing')"><small>متبقي للتحصيل</small><b>${money(a.outstanding)}</b><span>${count(a.openInvoices.length, 'فاتورة واحدة', 'فاتورتان', 'فواتير', 'فاتورة')}</span></button>
      </div>
      <div class="ws-home-grid">
        <section class="sb-section"><header><h2>يحتاج قرارك</h2><p>${decisions.length ? 'مرتبة حسب الأولوية' : 'مفيش حاجة متأخرة النهارده'}</p></header>
          ${decisions.map(([n, title, sub, action, cls]) => `<button type="button" class="ws-decision2 ${cls}" onclick="${E(action)}"><b>${n}</b><span><strong>${E(title)}</strong><small>${E(sub)}</small></span><i aria-hidden="true">←</i></button>`).join('') || '<p class="ws-clear">كل الطلبات والمتابعات محدّثة.</p>'}</section>
        <section class="sb-section"><header><h2>حصص اليوم</h2><p>${todays.length ? 'حسب الميعاد' : 'لا توجد حصص اليوم في النطاق'}</p></header>
          ${todays.map(s => { const g = group(s.group), d = SE.get(g?.sport), present = Object.values(s.present).filter(Boolean).length, total = db.state.members.filter(m => m.group === s.group).length;
            return `<button type="button" class="ws-today" onclick="AcademyUI.sessionDetail('${s.id}')"><time>${time(s.start)}</time><span><strong>${E(d?.ico || '')} ${E(g?.name)}</strong><small>${E(s.coach || g?.coach || '')} · ${E(s.resource || g?.resource || '')}</small></span><em>${s.status === 'ended' ? 'انتهت · ' + present + ' حضور' : present + ' من ' + total}</em></button>`; }).join('') || `<p class="ws-clear">${a.upcoming[0] ? 'الحصة القادمة: ' + E(group(a.upcoming[0].group)?.name) : ''}</p>`}</section>
      </div>
      <div class="ws-home-grid">
        <section class="sb-section"><header><h2>الرياضات</h2><p>اضغط على الرياضة لفتح مساحتها</p></header><div class="ws-sport-rows">${sports.map(x => `<button type="button" onclick="AcademyUI.openSport('${x.d.id}')" style="--sport:${E(x.d.color)}"><span class="sb-icon">${E(x.d.ico)}</span><strong>${E(x.d.name)}</strong><small>${count(x.groups, 'جروب واحد', 'جروبان', 'جروبات', 'جروب')} · اليوم ${x.today}</small><b>${x.active}<small> / ${x.players}</small></b></button>`).join('')}</div></section>
        <section class="sb-section"><header><h2>التحصيل آخر 7 أيام</h2><p>${money(series.reduce((n, x) => n + x.v, 0))} صافي</p></header><div class="ws-bars" role="img" aria-label="التحصيل اليومي خلال آخر سبعة أيام">${series.map(x => `<div><i style="height:${Math.max(2, x.v / max * 100)}%" title="${E(money(x.v))}"></i><small>${E(x.label)}</small></div>`).join('')}</div></section>
      </div></div>`;
  };
  PAGES.dash = homeBase;
  PAGES.dash_after = () => {};

  render();
})();

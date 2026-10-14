/* Levels and assessments in the dashboard: one page for every sport built from the
   sport definition and the progress record, the "التقدم الرياضي" tab of the player
   profile, promotion and belt-exam forms. Replaces the earlier static preview tables. */
(function () {
  'use strict';
  if (typeof PAGES === 'undefined' || !window.Progress || !window.SportEngine) return;
  const P = window.Progress, SE = window.SportEngine, db = V.db, U = window.AcademyUI;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const btn = (label, action, cls = '') => `<button type="button" class="sb-btn ${cls}" onclick="${E(action)}">${E(label)}</button>`;
  const date = v => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }).format(new Date(v));
  const empty = (t, d) => `<div class="ac-empty"><b>${E(t)}</b><p>${E(d)}</p></div>`;
  const group = id => db.state.groups.find(g => g.id === id);

  const PG = window.ProgressUI = { sport: '', group: 'all', filter: 'all' };
  const sportsWithLevels = () => SE.list().filter(d => d.on !== false && (d.modules.includes('levels') || d.modules.includes('belts')));
  const currentSport = () => {
    const list = sportsWithLevels();
    if (U && U.sport && U.sport !== 'all' && list.some(d => d.id === U.sport)) PG.sport = U.sport;
    if (!list.some(d => d.id === PG.sport)) PG.sport = list.find(d => d.id !== 'football')?.id || list[0]?.id || '';
    return SE.get(PG.sport);
  };
  const rosterOf = d => {
    const branch = U?.branch && U.branch !== 'all' ? U.branch : null;
    const groups = db.state.groups.filter(g => g.sport === d.id && (!branch || g.branch === branch) && (PG.group === 'all' || g.id === PG.group));
    const ids = new Set(groups.map(g => g.id));
    return { groups, members: db.state.members.filter(m => ids.has(m.group)) };
  };
  const statusOf = el => el.unassigned ? ['يحتاج تحديد مستوى', 'warn', 'unassigned'] : !el.next ? ['آخر مستوى', '', 'top'] : el.eligible ? [el.needsExam ? 'مؤهل للاختبار' : 'مؤهل للترقية', 'ok', 'eligible'] : ['يستكمل المتطلبات', '', 'working'];

  PAGES.progress = () => {
    const d = currentSport();
    if (!d) return `<div class="sb-page">${empty('لا توجد رياضة بمستويات', 'فعّل أداة المستويات أو الأحزمة لرياضة من صفحة بناء الرياضات.')}</div>`;
    const { groups, members } = rosterOf(d);
    const rows = members.map(m => ({ m, el: P.eligibility(m), sk: P.skills(m) }));
    const counts = { eligible: rows.filter(r => r.el.eligible).length, unassigned: rows.filter(r => r.el.unassigned).length };
    const recent = (db.state.sportProgress || []).filter(r => r.sport === d.id && Date.now() - new Date(r.at) < 30 * 86400000).length;
    const exam = d.modules.includes('exams') ? P.exams(d.id).find(e => e.status === 'scheduled') : null;
    const main = d.metrics.find(m => m.kind === 'time') || d.metrics[0];
    const filtered = rows.filter(r => PG.filter === 'all' || statusOf(r.el)[2] === PG.filter);
    const dist = d.levels.map(l => ({ l, n: members.filter(m => m.sportLevel === l.id).length }));
    const max = Math.max(1, ...dist.map(x => x.n));
    return `<div class="sb-page pg-page" style="--sport:${E(d.color)}">
      <header class="sb-head"><div><small>المستويات والتقييمات</small><h1>${E(d.ico)} ${E(d.name)}</h1><p>الأهلية محسوبة من شروط الرياضة: ${E([d.promotion.skills ? 'إتقان مهارات المستوى' : '', d.promotion.minSessions ? d.promotion.minSessions + ' حصة منذ آخر ترقية' : '', d.promotion.minAttendance ? 'حضور ' + d.promotion.minAttendance + '%' : '', d.promotion.exam ? 'واختبار ترقية' : ''].filter(Boolean).join(' · ') || 'بدون شروط')}.</p></div>${btn('شروط الرياضة ومستوياتها', `SportBuilder.open('${d.id}');SportBuilder.setTab('assess')`)}</header>
      <nav class="pg-sports" aria-label="الرياضة">${sportsWithLevels().map(x => `<button type="button" class="${x.id === d.id ? 'on' : ''}" onclick="ProgressUI.pick('${x.id}')">${E(x.ico)} ${E(x.name)}</button>`).join('')}</nav>
      <div class="pg-kpis"><div><small>${E(d.terms.players)}</small><b>${members.length}</b></div><div class="ok"><small>مؤهلون للترقية</small><b>${counts.eligible}</b></div><div class="warn"><small>بدون مستوى محدد</small><b>${counts.unassigned}</b></div><div><small>تقييمات آخر 30 يومًا</small><b>${recent}</b></div></div>
      <div class="pg-two"><section class="sb-section"><header><h2>توزيع المستويات</h2></header><div class="pg-dist">${dist.map(x => `<div class="${x.l.active ? '' : 'inactive'}"><span>${E(x.l.name)}</span><i><em style="width:${x.n / max * 100}%"></em></i><b>${x.n}</b></div>`).join('')}</div></section>
      ${d.modules.includes('exams') ? examPanel(d, exam) : `<section class="sb-section"><header><h2>آخر النتائج</h2></header>${recentResults(d)}</section>`}</div>
      <section class="sb-section"><header class="pg-list-head"><h2>${E(d.terms.players)} والترقية</h2><div class="pg-filters">
        <select aria-label="الجروب" onchange="ProgressUI.group=this.value;render()"><option value="all">كل الجروبات</option>${db.state.groups.filter(g => g.sport === d.id).map(g => `<option value="${g.id}" ${PG.group === g.id ? 'selected' : ''}>${E(g.name)}</option>`).join('')}</select>
        <select aria-label="الحالة" onchange="ProgressUI.filter=this.value;render()">${[['all', 'كل الحالات'], ['eligible', 'المؤهلون'], ['working', 'يستكملون المتطلبات'], ['unassigned', 'بدون مستوى'], ['top', 'آخر مستوى']].map(([v, l]) => `<option value="${v}" ${PG.filter === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></header>
        <div class="pg-table" role="table"><div class="pg-row pg-th" role="row"><span>اللاعب</span><span>المستوى</span><span>المهارات</span><span>${E(main?.name || 'أفضل نتيجة')}</span><span>الحضور</span><span>الحالة</span><span></span></div>
        ${filtered.map(({ m, el, sk }) => { const st = statusOf(el), b = main ? P.best(m, main) : null; return `<div class="pg-row" role="row">
          <span><button type="button" class="pg-name" onclick="Refine.profile('${m.id}');AcademyUI.profileTab='sport';AcademyUI.profile('${m.id}')">${E(m.name)}</button><small>${E(group(m.group)?.name)}</small></span>
          <span data-label="المستوى">${E(el.level?.name || '—')}${el.next ? `<small>← ${E(el.next.name)}</small>` : ''}</span>
          <span data-label="المهارات">${sk.total ? `<i class="pg-bar"><em style="width:${sk.done / sk.total * 100}%"></em></i><small>${sk.done}/${sk.total}</small>` : '—'}</span>
          <span data-label="${E(main?.name || 'النتيجة')}">${b ? E(P.formatValue(main, b.value)) : '—'}</span>
          <span data-label="الحضور">${el.attendance ? el.attendance.rate + '%' : '—'}</span>
          <span><span class="sa-chip ${st[1]}">${st[0]}</span></span>
          <span>${el.unassigned ? btn('تحديد المستوى', `ProgressUI.promoteForm('${m.id}')`, 'small') : el.eligible && !el.needsExam ? btn('ترقية', `ProgressUI.promoteForm('${m.id}','${el.next.id}')`, 'primary small') : el.eligible && exam && !exam.candidates.some(c => c.memberId === m.id) ? btn('إضافة للاختبار', `ProgressUI.toExam('${exam.id}','${m.id}')`, 'small') : ''}</span></div>`; }).join('') || empty('لا يوجد لاعبون في الاختيار الحالي', groups.length ? 'غيّر الفلتر أو الجروب.' : 'أضف جروبًا لهذه الرياضة وسجّل لاعبين.')}</div></section></div>`;
  };
  PAGES.progress_after = () => {};
  window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { progress: 'المستويات والتقييمات' });

  function recentResults(d) {
    const rows = (db.state.sportProgress || []).filter(r => r.sport === d.id).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
    return rows.map(r => { const mt = d.metrics.find(x => x.id === r.metricId); return `<div class="pg-result"><span><b>${E(db.member(r.memberId).name)}</b><small>${E(r.label)} · ${date(r.at)}</small></span><strong>${E(mt ? P.formatValue(mt, r.value) : r.value)}</strong></div>`; }).join('') || empty('لا توجد نتائج بعد', 'تظهر هنا تقييمات المدربين من التطبيق.');
  }

  function examPanel(d, exam) {
    const done = P.exams(d.id).filter(e => e.status === 'done').slice(-2);
    if (!exam) return `<section class="sb-section"><header><h2>اختبار الترقية</h2><p>لا يوجد اختبار مجدول.</p></header>${btn('جدولة اختبار', `ProgressUI.examForm('${d.id}')`, 'primary')}${done.map(e => `<p class="muted">آخر اختبار ${date(e.date + 'T12:00')} · نجح ${e.candidates.filter(c => c.result === 'pass').length} من ${e.candidates.length}</p>`).join('')}</section>`;
    return `<section class="sb-section pg-exam"><header><h2>اختبار الترقية · ${date(exam.date + 'T12:00')} ${E(exam.time)}</h2><p>${E(exam.place)} · المختبِر ${E(exam.examiner)} · ${exam.candidates.length} متقدمين</p></header>
      ${exam.candidates.map(c => { const m = db.member(c.memberId), to = d.levels.find(l => l.id === c.levelId); return `<div class="pg-result"><span><b>${E(m.name)}</b><small>إلى ${E(to?.name)}</small></span>${c.result ? `<span class="sa-chip ${c.result === 'pass' ? 'ok' : 'warn'}">${c.result === 'pass' ? 'ناجح' : 'يعيد'}${c.score != null ? ' · ' + c.score : ''}</span>` : btn('تسجيل النتيجة', `ProgressUI.examResultForm('${exam.id}','${m.id}')`, 'small')}</div>`; }).join('') || '<p class="muted">أضف المؤهلين من القائمة بالأسفل.</p>'}</section>`;
  }

  PG.pick = id => { PG.sport = id; PG.group = 'all'; PG.filter = 'all'; if (U && U.sport !== 'all') U.sport = id; render(); };
  PG.promoteForm = (mid, levelId = '') => {
    const m = db.member(mid), d = P.def(m);
    if (!d) return toast('اللاعب غير مسجل في جروب رياضة');
    V.open(`<div class="ac-form"><h2>${levelId ? 'ترقية' : 'تعيين مستوى'} · ${E(m.name)}</h2><div class="v-field"><label for="pg-level">المستوى</label><select id="pg-level">${d.levels.filter(l => l.active).map(l => `<option value="${l.id}" ${l.id === (levelId || m.sportLevel) ? 'selected' : ''}>${E(l.name)}</option>`).join('')}</select></div>
      <div class="v-field"><label for="pg-reason">السبب</label><input id="pg-reason" value="${levelId ? 'استوفى متطلبات المستوى' : ''}" placeholder="مثال: تقييم البداية"></div><p class="muted">يظهر في سجل اللاعب وتطبيق ولي الأمر.</p>${btn('حفظ المستوى', `ProgressUI.promoteSave('${mid}')`, 'primary')}</div>`);
  };
  PG.promoteSave = mid => V.run(() => { const row = P.promote(mid, document.getElementById('pg-level').value, document.getElementById('pg-reason').value, 'الإدارة'); V.close(); render(); toast('اتسجل المستوى: ' + row.levelName); });
  PG.examForm = sport => { const d = SE.get(sport); V.open(`<div class="ac-form"><h2>جدولة اختبار ترقية · ${E(d.name)}</h2><div class="v-field"><label for="pg-ex-date">التاريخ</label><input id="pg-ex-date" type="date" value="${db.day(new Date(Date.now() + 7 * 86400000))}"></div><div class="v-field"><label for="pg-ex-time">الوقت</label><input id="pg-ex-time" type="time" value="11:00"></div><div class="v-field"><label for="pg-ex-place">المكان</label><input id="pg-ex-place" value="${E(d.resources[0]?.name || '')}"></div><div class="v-field"><label for="pg-ex-examiner">المختبِر</label><input id="pg-ex-examiner" value="${E(d.terms.coach)}"></div>${btn('حفظ الاختبار', `ProgressUI.examSave('${sport}')`, 'primary')}</div>`); };
  PG.examSave = sport => V.run(() => { const v = id => document.getElementById(id).value; P.scheduleExam(sport, { date: v('pg-ex-date'), time: v('pg-ex-time'), place: v('pg-ex-place'), examiner: v('pg-ex-examiner') }); V.close(); render(); toast('اتجدول الاختبار، وأضف المؤهلين من القائمة'); });
  PG.toExam = (examId, mid) => V.run(() => { P.addCandidate(examId, mid); render(); toast('اتضاف للاختبار'); });
  PG.examResultForm = (examId, mid) => V.open(`<div class="ac-form"><h2>نتيجة ${E(db.member(mid).name)}</h2><div class="v-field"><label for="pg-ex-result">النتيجة</label><select id="pg-ex-result"><option value="pass">ناجح · ترقية تلقائية</option><option value="fail">يعيد الاختبار</option></select></div><div class="v-field"><label for="pg-ex-score">الدرجة من 100</label><input id="pg-ex-score" inputmode="numeric"></div>${btn('حفظ النتيجة', `ProgressUI.examResultSave('${examId}','${mid}')`, 'primary')}</div>`);
  PG.examResultSave = (examId, mid) => V.run(() => { P.examResult(examId, mid, document.getElementById('pg-ex-result').value, document.getElementById('pg-ex-score').value); V.close(); render(); toast('اتسجلت النتيجة'); });

  /* Profile tab: level, checks, skills, results with a small trend line, history. */
  const spark = (rows, lowerIsBetter) => {
    if (rows.length < 2) return '';
    const vals = rows.map(r => r.value), lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
    const pts = rows.map((r, i) => `${(i / (rows.length - 1) * 100).toFixed(1)},${(lowerIsBetter ? 4 + (r.value - lo) / span * 24 : 28 - (r.value - lo) / span * 24).toFixed(1)}`).join(' ');
    return `<svg class="pg-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  };
  PG.profileTab = m => {
    const d = P.def(m);
    if (!d) return empty('اللاعب غير مسجل في جروب رياضة', 'سجّله في جروب لتظهر مستوياته.');
    const el = P.eligibility(m), sk = P.skills(m), hist = P.history(m.id);
    const metrics = d.metrics.map(mt => { const rows = P.attempts(m, mt.id); if (!rows.length) return ''; const b = P.best(m, mt), last = rows[rows.length - 1];
      return `<div class="pg-metric"><span><b>${E(mt.name)}</b><small>${rows.length} محاولات · آخرها ${E(P.formatValue(mt, last.value))} في ${date(last.at)}</small></span>${spark(rows, mt.better === 'lower')}<strong>${E(P.formatValue(mt, b.value))}<small>الأفضل</small></strong></div>`; }).join('');
    const pcard = window.PlayerCard ? `<section class="pg-card"><div>${PlayerCard.svg(m, { width: 220 })}</div><div><h3>بطاقة اللاعب</h3><p class="muted">${PlayerCard.of(m).empty ? 'تكتمل بعد أول تقييم من المدرب.' : PlayerCard.of(m).count + ' تقييمات من المدرب'}</p><button type="button" class="sb-btn primary" onclick="PlayerCard.download('${m.id}')">تحميل البطاقة</button> <button type="button" class="sb-btn" onclick="PlayerCard.awardForm('${m.id}')">منح شهادة تميز</button>${PlayerCard.certificates(m.id).map(c => `<p class="muted">🏅 ${E(c.month)} · ${E(c.reason)}</p>`).join('')}</div></section>` : '';
    return `<div class="pg-profile">${pcard}<section class="pg-level"><small>${E(d.name)} · المستوى الحالي</small><b>${E(el.level?.name || 'لم يحدد')}</b>${el.next ? `<p>التالي: ${E(el.next.name)} · <span class="sa-chip ${statusOf(el)[1]}">${statusOf(el)[0]}</span></p>` : ''}
      <ul class="sa-checks">${el.checks.map(c => `<li class="${c.ok ? 'ok' : ''}"><span>${c.ok ? '✓' : '•'}</span>${E(c.label)}<small>${E(c.detail)}</small></li>`).join('')}</ul></section>
      ${sk.total ? `<section><h3>مهارات ${E(el.level?.name || '')} · ${sk.done}/${sk.total}</h3><div class="sa-skills">${sk.skills.map(x => `<button type="button" class="sa-skill ${x.done ? 'done' : ''}" aria-pressed="${x.done}" onclick="ProgressUI.toggleSkill('${m.id}','${x.id}',${!x.done})">${x.done ? '✓ ' : ''}${E(x.name)}</button>`).join('')}</div></section>` : ''}
      <section><h3>النتائج</h3>${metrics || empty('لا توجد نتائج بعد', 'تقييمات المدرب تظهر هنا مع تطورها.')}</section>
      <section><h3>سجل المستويات</h3>${hist.map(h => `<div class="pg-result"><span><b>${E(h.levelName)}</b><small>${E(h.reason)}${h.by ? ' · ' + E(h.by) : ''}</small></span><small>${date(h.at)}</small></div>`).join('') || '<p class="muted">لا يوجد سجل بعد.</p>'}</section></div>`;
  };
  PG.toggleSkill = (mid, skillId, on) => V.run(() => { P.mark(mid, skillId, on, 'الإدارة'); AcademyUI.profile(mid); });

  /* The "progress" menu entry and older links now open this page. */
  if (window.MS) MS.state.progSport = '';
  render();
})();

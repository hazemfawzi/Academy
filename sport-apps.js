/* Sport tools in the mobile apps, driven by the sport definition and the progress record.
   Coach: assess the whole group, mark skills, levels and eligibility, belt exams, lanes,
   pairs. Member: level, skills, best results and history for the selected sport. */
(function () {
  'use strict';
  if (typeof APPS === 'undefined' || !window.AcademyApps || !window.Progress || !window.SportEngine) return;
  const AA = window.AcademyApps, P = window.Progress, SE = window.SportEngine, db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const btn = (label, action, cls = '') => `<button type="button" class="ma-button ${cls}" onclick="${E(action)}">${E(label)}</button>`;
  const empty = (title, text) => `<div class="ma-empty"><b>${E(title)}</b><p>${E(text)}</p></div>`;
  const date = v => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }).format(new Date(v));
  const def = () => SE.get(AA.sport);
  const group = id => db.state.groups.find(g => g.id === id);
  const header = (title, sub) => `<header class="ma-header"><div><small>${E(def().ico)} ${E(def().name)}</small><h2>${E(title)}</h2><p>${E(sub)}</p></div></header>`;
  const page = (title, sub, body) => `<div class="ma-workspace">${header(title, sub)}<div class="ma-body">${body}</div></div>`;

  /* The group the coach is working with: the selected one, or the first of the sport. */
  const workingGroup = () => {
    const groups = AA.scope().groups;
    return groups.find(g => g.id === (S.app==='coach'&&AA.toolGroupId?AA.toolGroupId:AA.groupId)) || groups[0] || null;
  };
  const roster = g => g ? db.state.members.filter(m => m.group === g.id) : [];
  const groupPicker = g => {
    const groups = AA.scope().groups;
    if (groups.length < 2) return '';
    return `<label class="sa-label">الجروب<select class="ma-select" onchange="AcademyApps.groupId=this.value;draw()">${groups.map(x => `<option value="${x.id}" ${x.id === g?.id ? 'selected' : ''}>${E(x.name)}</option>`).join('')}</select></label>`;
  };
  const latestSession = g => db.state.sessions.find(s=>s.id===AA.sessionId&&s.group===g.id&&s.status!=='cancelled') || db.state.sessions.filter(s => s.group === g.id && s.status !== 'cancelled' && new Date(s.start) <= new Date(Date.now() + 3600000)).sort((a, b) => new Date(b.start) - new Date(a.start))[0] || null;

  /* ---------- group assessment (ratings, times, exam scores, personal records) ---------- */
  AA.assess = kind => {
    const d = def(), g = workingGroup();
    const metrics = d.metrics.filter(m => kind === 'rating' ? m.kind === 'rating' : m.kind === kind);
    if (!g || !roster(g).length) return V.open(empty('لا يوجد لاعبون', 'سجّل لاعبين في جروب هذه الرياضة أولًا.'));
    if (!metrics.length) return V.open(empty('لا توجد عناصر تقييم من هذا النوع', 'أضفها من إعدادات الرياضة في لوحة الإدارة.'));
    AA.assessKind = kind;
    AA.assessMetric = metrics.some(m => m.id === AA.assessMetric) ? AA.assessMetric : metrics[0].id;
    const metric = metrics.find(m => m.id === AA.assessMetric), s = latestSession(g);
    const hint = metric.kind === 'time' ? 'ثواني' : metric.kind === 'rating' ? '1 إلى 5' : metric.kind === 'score' ? '0 إلى 100' : metric.unit;
    V.open(`<div class="ma-form sa-assess"><h3>${E(metric.name)} · ${E(g.name)}</h3>
      <p class="ma-note">${s ? 'مرتبط بحصة ' + date(s.start) : 'غير مرتبط بحصة'} · اترك الخانة فاضية للاعب الغائب.${metric.kind === 'time' ? ' اكتب الزمن بالثواني (32.5) أو بالدقائق (1:05.3).' : ''}</p>
      ${metrics.length > 1 ? `<label>عنصر التقييم<select id="sa-metric" onchange="AcademyApps.assessMetric=this.value;AcademyApps.assess('${kind}')">${metrics.map(m => `<option value="${m.id}" ${m.id === metric.id ? 'selected' : ''}>${E(m.name)}</option>`).join('')}</select></label>` : ''}
      <div class="sa-entry-list">${roster(g).map(m => { const b = P.best(m, metric); return `<div class="sa-entry"><span><b>${E(m.name)}</b><small>${E(P.level(m)?.name || 'بدون مستوى')}${b ? ' · الأفضل ' + E(P.formatValue(metric, b.value)) : ''}</small></span>
        ${metric.kind === 'rating' ? `<select data-sa-member="${m.id}" aria-label="تقييم ${E(m.name)}"><option value="">—</option>${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join('')}</select>` : `<input data-sa-member="${m.id}" inputmode="decimal" placeholder="${E(hint)}" aria-label="${E(metric.name)} ${E(m.name)}">`}</div>`; }).join('')}</div>
      <label>ملاحظة عامة<input id="sa-note" placeholder="اختياري"></label>
      ${btn('حفظ التقييم', `AcademyApps.saveAssess('${s ? s.id : ''}')`, 'primary')}</div>`);
  };
  AA.saveAssess = sessionId => V.run(() => {
    const note = document.getElementById('sa-note')?.value || '';
    const entries = [...document.querySelectorAll('[data-sa-member]')].map(el => ({ memberId: el.dataset.saMember, value: el.value, note }));
    const rows = P.record(AA.sport, { metricId: AA.assessMetric, sessionId, entries });
    V.close(); draw(); toast(`اتحفظ تقييم ${rows.length} لاعب`);
  });

  /* ---------- skills board ---------- */
  AA.skillsBoard = () => { AA.groupBoard = true; go('skills'); };
  AA.skillsPage = () => {
    const d = def(), g = workingGroup();
    if (!g) return page('مهارات المستوى', '', empty('لا يوجد جروب', 'أضف جروبًا لهذه الرياضة.'));
    const rows = roster(g).map(m => {
      const lvl = P.level(m), sk = P.skills(m), el = P.eligibility(m);
      return `<article class="ma-card sa-skill-card"><header><b>${E(m.name)}</b><small>${E(lvl?.name || 'بدون مستوى')} · ${sk.done}/${sk.total}</small>${el?.eligible ? '<span class="sa-chip ok">مؤهل للترقية</span>' : ''}</header>
        <div class="sa-skills">${sk.skills.map(x => `<button type="button" class="sa-skill ${x.done ? 'done' : ''}" aria-pressed="${x.done}" onclick="AcademyApps.toggleSkill('${m.id}','${x.id}',${!x.done})">${x.done ? '✓ ' : ''}${E(x.name)}</button>`).join('') || '<small>لا توجد مهارات لهذا المستوى؛ أضفها من إعدادات الرياضة.</small>'}</div></article>`;
    }).join('');
    return page('مهارات المستوى', 'اضغط على المهارة لما اللاعب يتقنها. التعديل يتحفظ فورًا.', groupPicker(g) + (rows || empty('الجروب بلا لاعبين', 'سجّل لاعبين أولًا.')));
  };
  AA.toggleSkill = (mid, skillId, on) => V.run(() => { P.mark(mid, skillId, on, def().terms.coach); draw(); });

  /* ---------- levels, eligibility and promotion ---------- */
  AA.levelsPage = () => {
    const d = def(), g = workingGroup();
    if (!g) return page('المستويات والترقية', '', empty('لا يوجد جروب', 'أضف جروبًا لهذه الرياضة.'));
    const rows = roster(g).map(m => {
      const el = P.eligibility(m), cur = el.level, next = el.next;
      const state = el.unassigned ? ['يحتاج تحديد مستوى', 'warn'] : !next ? ['آخر مستوى', ''] : el.eligible ? [el.needsExam ? 'مؤهل للاختبار' : 'مؤهل للترقية', 'ok'] : ['يستكمل المتطلبات', ''];
      const action = el.unassigned ? btn('تحديد المستوى', `AcademyApps.promoteForm('${m.id}')`) : el.eligible && !el.needsExam ? btn('ترقية لـ ' + next.name, `AcademyApps.promoteForm('${m.id}','${next.id}')`, 'primary') : el.eligible && el.needsExam ? btn('إضافة للاختبار', `AcademyApps.toExam('${m.id}')`) : '';
      return `<article class="ma-card sa-level-card"><header><b>${E(m.name)}</b><span class="sa-chip ${state[1]}">${state[0]}</span></header>
        <p>${E(cur?.name || '—')}${next ? ' ← ' + E(next.name) : ''}</p>
        <ul class="sa-checks">${el.checks.map(c => `<li class="${c.ok ? 'ok' : ''}"><span>${c.ok ? '✓' : '•'}</span>${E(c.label)}<small>${E(c.detail)}</small></li>`).join('')}</ul>${action}</article>`;
    }).join('');
    const exams = d.modules.includes('exams') ? examSection(d) : '';
    return page(d.type === 'ranks' ? 'الأحزمة والأهلية' : 'المستويات والترقية', 'الأهلية محسوبة من شروط الرياضة: المهارات والحضور وعدد الحصص.', groupPicker(g) + exams + (rows || empty('الجروب بلا لاعبين', 'سجّل لاعبين أولًا.')));
  };
  AA.promoteForm = (mid, levelId = '') => {
    const m = db.member(mid), d = P.def(m);
    V.open(`<div class="ma-form"><h3>${levelId ? 'ترقية' : 'تحديد مستوى'} · ${E(m.name)}</h3><label>المستوى<select id="sa-level">${d.levels.filter(l => l.active).map(l => `<option value="${l.id}" ${l.id === levelId ? 'selected' : ''}>${E(l.name)}</option>`).join('')}</select></label>
      <label>السبب<input id="sa-reason" value="${levelId ? 'استوفى متطلبات المستوى' : 'تقييم المدرب'}"></label>${btn('حفظ', `AcademyApps.promoteSave('${mid}')`, 'primary')}<p class="ma-note">يظهر في سجل اللاعب وتطبيق ولي الأمر.</p></div>`);
  };
  AA.promoteSave = mid => V.run(() => { const row = P.promote(mid, document.getElementById('sa-level').value, document.getElementById('sa-reason').value, def().terms.coach); V.close(); draw(); toast('اتسجل المستوى: ' + row.levelName); });

  function examSection(d) {
    const exam = P.exams(d.id).find(e => e.status === 'scheduled');
    if (!exam) return `<section class="ma-card sa-exam"><b>لا يوجد اختبار ترقية مجدول</b><p>حدد ميعاد الاختبار من لوحة الإدارة أو من هنا.</p>${btn('جدولة اختبار', 'AcademyApps.examForm()')}</section>`;
    return `<section class="ma-card sa-exam"><header><b>اختبار الترقية · ${date(exam.date + 'T12:00:00')} ${E(exam.time || '')}</b><small>${E(exam.place)} · المختبِر ${E(exam.examiner)}</small></header>
      ${exam.candidates.map(c => { const m = db.member(c.memberId), to = d.levels.find(l => l.id === c.levelId); return `<div class="sa-candidate"><span><b>${E(m.name)}</b><small>إلى ${E(to?.name)}</small></span>${c.result ? `<span class="sa-chip ${c.result === 'pass' ? 'ok' : 'warn'}">${c.result === 'pass' ? 'ناجح' : 'يعيد'}${c.score != null ? ' · ' + c.score : ''}</span>` : btn('النتيجة', `AcademyApps.examResultForm('${exam.id}','${m.id}')`)}</div>`; }).join('') || '<p>لا يوجد متقدمون بعد. أضف المؤهلين من القائمة.</p>'}</section>`;
  }
  AA.examForm = () => V.open(`<div class="ma-form"><h3>جدولة اختبار ترقية</h3><label>التاريخ<input id="sa-exam-date" type="date" value="${db.day(new Date(Date.now() + 7 * 86400000))}"></label><label>الوقت<input id="sa-exam-time" type="time" value="11:00"></label><label>المكان<input id="sa-exam-place" value="${E(def().resources[0]?.name || '')}"></label><label>المختبِر<input id="sa-exam-examiner" value="${E(def().terms.coach)}"></label>${btn('حفظ الاختبار', 'AcademyApps.examSave()', 'primary')}</div>`);
  AA.examSave = () => V.run(() => { const v = id => document.getElementById(id).value; P.scheduleExam(AA.sport, { date: v('sa-exam-date'), time: v('sa-exam-time'), place: v('sa-exam-place'), examiner: v('sa-exam-examiner') }); V.close(); draw(); toast('اتجدول الاختبار'); });
  AA.toExam = mid => V.run(() => { const exam = P.exams(AA.sport).find(e => e.status === 'scheduled'); if (!exam) throw Error('جدول اختبارًا أولًا'); P.addCandidate(exam.id, mid); draw(); toast('اتضاف للاختبار'); });
  AA.examResultForm = (examId, mid) => V.open(`<div class="ma-form"><h3>نتيجة ${E(db.member(mid).name)}</h3><label>النتيجة<select id="sa-ex-result"><option value="pass">ناجح · ترقية تلقائية</option><option value="fail">يعيد الاختبار</option></select></label><label>الدرجة من 100<input id="sa-ex-score" inputmode="numeric"></label>${btn('حفظ النتيجة', `AcademyApps.examResultSave('${examId}','${mid}')`, 'primary')}</div>`);
  AA.examResultSave = (examId, mid) => V.run(() => { P.examResult(examId, mid, document.getElementById('sa-ex-result').value, document.getElementById('sa-ex-score').value); V.close(); draw(); toast('اتسجلت النتيجة'); });

  /* ---------- lanes and pairs ---------- */
  AA.lanes = () => {
    const d = def(), g = workingGroup();
    const lanes = d.resources.length || 1, players = roster(g);
    if (!players.length) return V.open(empty('لا يوجد لاعبون', 'سجّل لاعبين أولًا.'));
    const size = Math.ceil(players.length / lanes), parts = P.split(d.id, players, size), metric = d.metrics.find(m => m.kind === 'time');
    V.open(`<div class="ma-form"><h3>توزيع الحارات · ${E(g.name)}</h3><p class="ma-note">الترتيب حسب المستوى ثم أفضل زمن.</p>${parts.map((list, i) => `<section class="sa-lane"><b>${E(d.resources[i]?.name || 'مجموعة ' + (i + 1))}</b>${list.map(m => { const b = metric && P.best(m, metric); return `<div><span>${E(m.name)}</span><small>${E(P.level(m)?.name || '')}${b ? ' · ' + E(P.formatValue(metric, b.value)) : ''}</small></div>`; }).join('')}</section>`).join('')}</div>`);
  };
  AA.pairs = () => {
    const d = def(), g = workingGroup(), s = latestSession(g);
    const present = s ? roster(g).filter(m => s.present[m.id]) : [];
    const players = present.length >= 2 ? present : roster(g);
    if (players.length < 2) return V.open(empty('العدد غير كافٍ', 'تحتاج لاعبين اثنين على الأقل.'));
    const parts = P.split(d.id, players, 2);
    V.open(`<div class="ma-form"><h3>أزواج متقاربة · ${E(g.name)}</h3><p class="ma-note">${present.length >= 2 ? 'من الحاضرين في آخر حصة.' : 'من كل لاعبي الجروب؛ سجّل الحضور لتقسيم الحاضرين فقط.'}</p>${parts.map((pair, i) => `<section class="sa-lane"><b>زوج ${i + 1}</b>${pair.map(m => `<div><span>${E(m.name)}</span><small>${E(P.level(m)?.name || '')}</small></div>`).join('')}</section>`).join('')}</div>`);
  };

  /* ---------- member progress for any sport ---------- */
  const footballProgress = APPS.member.F.progress;
  AA.progress = () => {
    const me = AA.viewer ? AA.viewer() : db.member('m0');
    const g = group(me.group);
    if (g?.sport !== AA.sport) return page('التقدم الرياضي', '', empty('لا يوجد تسجيل في هذه الرياضة', 'اختر رياضة مسجل فيها من أعلى الصفحة.'));
    const d = def();
    if (d.id === 'football' && !d.levels.some(l => l.id === me.sportLevel)) return footballProgress ? footballProgress() : '';
    const el = P.eligibility(me), sk = P.skills(me);
    const metrics = d.metrics.map(mt => { const rows = P.attempts(me, mt.id); if (!rows.length) return ''; const b = P.best(me, mt), last = rows[rows.length - 1], first = rows[0];
      const better = mt.better === 'lower' ? last.value < first.value : last.value > first.value;
      return `<div class="sa-metric"><span><b>${E(mt.name)}</b><small>${rows.length} محاولات · آخرها ${date(last.at)}</small></span><strong>${E(P.formatValue(mt, b.value))}</strong>${rows.length > 1 ? `<em class="${better ? 'up' : ''}">${better ? 'تحسن' : 'ثابت'}</em>` : ''}</div>`; }).join('');
    const history = P.history(me.id).slice(0, 4).map(h => `<li><b>${E(h.levelName)}</b><small>${date(h.at)} · ${E(h.reason)}</small></li>`).join('');
    return page('التقدم الرياضي', me.name + ' · ' + d.name, `<section class="ma-card sa-level-hero"><small>المستوى الحالي</small><b>${E(el.level?.name || 'لم يحدد بعد')}</b>${el.next ? `<p>التالي: ${E(el.next.name)}${el.eligible ? ' · ' + (el.needsExam ? 'مؤهل للاختبار' : 'مؤهل للترقية') : ''}</p>` : '<p>آخر مستوى في البرنامج</p>'}
      <ul class="sa-checks">${el.checks.map(c => `<li class="${c.ok ? 'ok' : ''}"><span>${c.ok ? '✓' : '•'}</span>${E(c.label)}<small>${E(c.detail)}</small></li>`).join('')}</ul></section>
      ${sk.total ? `<h3 class="ma-section-title">مهارات المستوى · ${sk.done} من ${sk.total}</h3><div class="sa-skills readonly">${sk.skills.map(x => `<span class="sa-skill ${x.done ? 'done' : ''}">${x.done ? '✓ ' : ''}${E(x.name)}</span>`).join('')}</div>` : ''}
      <h3 class="ma-section-title">أفضل النتائج</h3>${metrics || empty('لا توجد نتائج بعد', 'تظهر هنا تقييمات المدرب وأزمنتك.')}
      ${history ? `<h3 class="ma-section-title">سجل المستويات</h3><ul class="sa-history">${history}</ul>` : ''}`);
  };

  /* ---------- routes ---------- */
  APPS.coach.F.skills = AA.skillsPage; APPS.coach.sub.skills = 'sporttools';
  APPS.coach.F.levels = AA.levelsPage; APPS.coach.sub.levels = 'sporttools';
  APPS.member.F.progress = AA.progress;
  const configure = AA.configure.bind(AA);
  AA.configure = function () {
    configure();
    if (!APPS.coach.list.some(x => x[0] === 'levels')) APPS.coach.list.splice(5, 0, ['levels', 'المستويات والترقية'], ['skills', 'مهارات المستوى']);
  };
  AA.configure();
  draw();
})();

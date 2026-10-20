/* Groups with weekly schedules, academy holidays, families and program renewals in the
   dashboard. Groups carry their days, time, coach, place and age range; sessions are
   generated from them by the schedule engine. */
(function () {
  'use strict';
  if (typeof PAGES === 'undefined' || !window.Schedule || !window.Family || !window.AcademyUI) return;
  const db = V.db, U = window.AcademyUI, SE = window.SportEngine, S = window.Schedule, F = window.Family;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const btn = (label, action, cls = '') => `<button type="button" class="sb-btn ${cls}" onclick="${E(action)}">${E(label)}</button>`;
  const money = n => new Intl.NumberFormat('en-US').format(Math.round(n)) + ' EGP';
  const date = v => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(v));
  const val = id => document.getElementById(id)?.value ?? '';
  const empty = (t, d) => `<div class="ac-empty"><b>${E(t)}</b><p>${E(d)}</p></div>`;
  const statusName = { active: 'نشط', expired: 'يحتاج اشتراك', frozen: 'مجمد' };
  window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { families: 'العائلات وأولياء الأمور' });

  /* ---------- groups ---------- */
  const scoped = () => U.scope();
  PAGES.groups = () => {
    const a = scoped();
    const cards = a.groups.map(g => {
      const d = SE.get(g.sport), count = a.members.filter(m => m.group === g.id).length, pct = g.capacity ? Math.min(100, count / g.capacity * 100) : 0;
      const next = db.state.sessions.filter(s => s.group === g.id && s.status === 'scheduled' && new Date(s.start) > new Date()).sort((x, y) => new Date(x.start) - new Date(y.start))[0];
      return `<article class="pr-group" style="--sport:${E(d?.color || '#5d8a6f')}"><header><span>${E(d?.ico || '')} ${E(d?.name || '')}</span><small>${E(g.branch)}</small></header>
        <h3>${E(g.name)}</h3><p class="pr-when">${E(S.describe(g))}</p>
        <dl><div><dt>${E(d?.terms.coach || 'المدرب')}</dt><dd>${E(g.coach || 'لم يحدد')}</dd></div><div><dt>المكان</dt><dd>${E(g.resource || 'لم يحدد')}</dd></div><div><dt>السن</dt><dd>${g.ageMin != null ? `من ${g.ageMin} إلى ${g.ageMax}` : '—'}</dd></div></dl>
        <div class="pr-cap"><i><em style="width:${pct}%"></em></i><small>${count} من ${g.capacity} · ${Math.max(0, g.capacity - count)} أماكن متاحة</small></div>
        <p class="pr-next">${next ? 'الحصة القادمة: ' + E(date(next.start)) : 'لا توجد حصص قادمة'}</p>
        <footer>${btn('ملف الجروب', `AcademyUI.groupDetail('${g.id}')`)}${btn('تعديل الجدول', `ProgramsUI.groupForm('${g.id}')`)}</footer></article>`;
    }).join('');
    const hol = (db.state.holidays || []).filter(h => h.date >= db.day(new Date())).sort((x, y) => x.date.localeCompare(y.date));
    return `<div class="sb-page"><header class="sb-head"><div><small>الجروبات والبرامج</small><h1>الجروبات ومواعيدها</h1><p>كل جروب له أيام ثابتة وميعاد ومدرب ومكان. الحصص بتتولد تلقائيًا لأسبوعين قدام، وبتتخطى الإجازات وأي تعارض.</p></div><div class="pr-head-actions">${btn('الإجازات', 'ProgramsUI.holidays()')}${btn('+ جروب جديد', 'ProgramsUI.groupForm()', 'primary')}</div></header>
      ${hol.length ? `<p class="pr-holiday-strip">إجازات قادمة: ${hol.slice(0, 3).map(h => E(h.name) + ' (' + E(date(h.date + 'T12:00')) + ')').join(' · ')}</p>` : ''}
      ${(db.state.scheduleConflicts || []).length ? `<p class="rg-note warn">${db.state.scheduleConflicts.length} موعد لم يتولد بسبب تعارض مدرب أو مكان. راجع جداول الجروبات.</p>` : ''}
      <div class="pr-grid">${cards || empty('لا توجد جروبات في النطاق', 'غيّر الفرع أو الرياضة، أو أضف جروبًا جديدًا.')}</div></div>`;
  };
  PAGES.groups_after = () => {};

  const PU = window.ProgramsUI = {};
  PU.groupForm = (id = '') => {
    const g = id ? db.state.groups.find(x => x.id === id) : null;
    const branches = [...new Set(db.state.groups.map(x => x.branch).filter(Boolean))];
    const sportId = g?.sport || (U.sport !== 'all' ? U.sport : SE.list().find(d => d.on !== false)?.id);
    const d = SE.get(sportId);
    const coaches = [...new Set(db.state.groups.filter(x => !window.Edition?.sport || x.sport === Edition.sport).map(x => x.coach).filter(Boolean))];
    V.open(`<div class="ac-form pr-form"><h2>${g ? 'تعديل جدول ' + E(g.name) : 'جروب جديد'}</h2>
      <div class="rg-row"><label class="rg-field"><span>اسم الجروب</span><input id="pr-name" value="${E(g?.name || '')}" placeholder="مثال: سباحة أطفال · مستوى 1"></label>
      <label class="rg-field"><span>الرياضة</span><select id="pr-sport" ${g ? 'disabled' : ''} onchange="ProgramsUI.sportChanged()">${SE.list().filter(x => x.on !== false || x.id === sportId).map(x => `<option value="${x.id}" ${x.id === sportId ? 'selected' : ''}>${E(x.name)}</option>`).join('')}</select></label></div>
      <div class="rg-row"><label class="rg-field"><span>الفرع</span><select id="pr-branch" ${g ? 'disabled' : ''}>${branches.map(b => `<option ${b === (g?.branch || (U.branch !== 'all' ? U.branch : '')) ? 'selected' : ''}>${E(b)}</option>`).join('')}</select></label>
      <label class="rg-field"><span>السعة</span><input id="pr-cap" type="number" min="1" max="100" value="${g?.capacity || d?.capacity || 16}"></label></div>
      <span class="sb-label">أيام التدريب</span><div class="pr-days">${S.ORDER.map(n => `<label><input type="checkbox" value="${n}" ${g?.days?.includes(n) ? 'checked' : ''}><span>${S.DAYS[n]}</span></label>`).join('')}</div>
      <div class="rg-row"><label class="rg-field"><span>الميعاد</span><input id="pr-time" type="time" value="${E(g?.time || '17:00')}"></label>
      <label class="rg-field"><span>${E(d?.terms.coach || 'المدرب')}</span><select id="pr-coach" onchange="document.getElementById('pr-coach-new').hidden=this.value!=='__new'"><option value="">اختار المدرب المسؤول</option>${coaches.map(c => `<option ${g?.coach === c ? 'selected' : ''}>${E(c)}</option>`).join('')}<option value="__new">+ مدرب جديد…</option></select><input id="pr-coach-new" hidden placeholder="اسم المدرب الجديد"><small class="rg-hint">كل مجموعة لازم يكون ليها مدرب مسؤول.</small></label>
      <label class="rg-field"><span>مكان التدريب</span><select id="pr-resource">${(d?.resources || []).map(r => `<option ${r.name === g?.resource ? 'selected' : ''}>${E(r.name)}</option>`).join('')}${g?.resource && !(d?.resources || []).some(r => r.name === g.resource) ? `<option selected>${E(g.resource)}</option>` : ''}</select></label></div>
      <div class="rg-row"><label class="rg-field"><span>من سن</span><input id="pr-age-min" type="number" min="2" max="90" value="${g?.ageMin ?? 6}"></label><label class="rg-field"><span>إلى سن</span><input id="pr-age-max" type="number" min="2" max="90" value="${g?.ageMax ?? 12}"></label></div>
      <p class="rg-note">${g ? 'الحصص القادمة اللي اتولدت تلقائيًا ولسه مفيهاش حضور بتتعدل للميعاد الجديد.' : 'بعد الحفظ، الحصص بتتولد لأسبوعين قدام.'}</p>
      <div id="pr-error" class="rg-error" hidden></div>${btn('حفظ الجروب', `ProgramsUI.saveGroup('${id}')`, 'primary')}</div>`);
  };
  PU.sportChanged = () => { const d = SE.get(val('pr-sport')); if (!d) return; document.getElementById('pr-cap').value = d.capacity; document.getElementById('pr-resource').innerHTML = d.resources.map(r => `<option>${E(r.name)}</option>`).join(''); };
  PU.saveGroup = id => {
    const box = document.getElementById('pr-error');
    try {
      const name = val('pr-name').trim(), capacity = Number(val('pr-cap'));
      if (!name) throw Error('اكتب اسم الجروب');
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw Error('السعة من 1 إلى 100');
      const schedule = S.validateSchedule({ days: [...document.querySelectorAll('.pr-days input:checked')].map(x => Number(x.value)), time: val('pr-time'), coach: val('pr-coach') === '__new' ? val('pr-coach-new') : val('pr-coach'), resource: val('pr-resource'), ageMin: val('pr-age-min'), ageMax: val('pr-age-max') });
      db.update(st => {
        if (id) {
          const g = st.groups.find(x => x.id === id);
          const members = st.members.filter(m => m.group === id).length;
          if (capacity < members) throw Error(`في الجروب ${members} لاعب؛ السعة لا تقل عن ذلك`);
          Object.assign(g, { name, capacity }, schedule);
          st.sessions = st.sessions.filter(s => !(s.auto && s.group === id && s.status === 'scheduled' && new Date(s.start) > new Date() && !Object.keys(s.present || {}).length && !Object.keys(s.rsvp || {}).length));
        } else {
          const sport = val('pr-sport'), branch = val('pr-branch');
          if (st.groups.some(g => g.name === name && g.branch === branch && g.sport === sport)) throw Error('هذا الجروب مسجل بالفعل في الفرع والرياضة');
          st.groups.push({ id: db.id('group'), name, branch, sport, capacity, ...schedule });
        }
        st.audit.unshift({ id: db.id('audit'), at: new Date().toISOString(), action: id ? 'تعديل جدول جروب' : 'إنشاء جروب', details: name });
      });
      const added = S.topUp();
      V.close(); render(); toast(`اتحفظ الجروب${added ? ' واتولدت ' + added + ' حصة' : ''}`);
    } catch (e) { if (box) { box.textContent = e.message; box.hidden = false; } }
  };
  U.groupForm = () => PU.groupForm();

  /* ---------- a group's own file: players, schedule and next sessions ---------- */
  const isSquad = g => !!window.FootballCore?.isSquad(g);
  const gName = g => g ? (isSquad(g) ? FootballCore.squadName(g.fb.birthYear) : g.name) : 'بدون مجموعة';
  const av = name => window.KoraAvatars ? KoraAvatars.render(name, 'gd-av', 34) : '';
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  U.groupDetail = id => {
    const g = db.state.groups.find(x => x.id === id); if (!g) return;
    const members = db.state.members.filter(m => m.group === id), now = new Date();
    const next = db.state.sessions.filter(x => x.group === id && x.status === 'scheduled' && new Date(x.start) >= now).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 4);
    const pct = g.capacity ? Math.min(100, members.length / g.capacity * 100) : 0;
    V.open(`<div class="ac-form gd"><header class="gd-head"><div><h2>${E(gName(g))}</h2><p>${E(g.branch)} · ${E(S.describe ? S.describe(g) : '')}</p><p>المدرب <b>${E(g.coach || 'لم يحدد')}</b> · ${E(g.resource || '')}${g.ageMin != null && !isSquad(g) ? ` · من ${g.ageMin} لـ ${g.ageMax} سنة` : ''}</p></div><div class="gd-cap"><b>${members.length}</b><small>من ${g.capacity}</small><i><em style="width:${pct}%"></em></i></div></header>
      <div class="gd-actions">${btn('+ إضافة لاعبين', `ProgramsUI.addToGroup('${id}')`, 'primary')}${btn('تعديل المجموعة', `ProgramsUI.groupForm('${id}')`)}${window.Desk ? btn('شات المجموعة', `V.close();Desk.open('g:${id}','admin');go('chat')`) : ''}</div>
      <h3>اللاعبين (${members.length})</h3>${members.map(m => `<div class="gd-row">${av(m.name)}<span class="gd-main"><b>${E(m.name)}</b><small>${E(statusName[window.AcademyModel?.status ? AcademyModel.status(m) : ''] || '')}${m.fb?.position && window.FootballCore ? ' · ' + E(FootballCore.POSITIONS[m.fb.position]?.name || '') : ''}</small></span><span class="gd-btns">${btn('الملف', `V.close();Refine.profile('${m.id}')`, 'quiet small')}${window.FootballLabUI && g.sport === 'football' ? btn('الأداء', `FootballLabUI.card('${m.id}')`, 'quiet small') : ''}${btn('نقل', `ProgramsUI.moveForm('${m.id}')`, 'quiet small')}${btn('إخراج', `ProgramsUI.removeForm('${m.id}')`, 'quiet small')}</span></div>`).join('') || empty('المجموعة لسه فاضية', 'ضيف لاعبين للمجموعة من الزرار اللي فوق.')}
      <h3>الحصص الجاية</h3><p class="rg-note">الحصص بتتولد لوحدها من جدول المجموعة. ${E(S.describe ? S.describe(g) : '')}</p>${next.map(x => `<div class="gd-session"><b>${E(fmt(x.start, { weekday: 'long', day: 'numeric', month: 'short' }))}</b><span>${E(fmt(x.start, { hour: 'numeric', minute: '2-digit' }))} · ${x.duration} دقيقة · ${E(x.resource || g.resource || '')}</span>${btn('تفاصيل', `AcademyUI.sessionDetail('${x.id}')`, 'quiet small')}</div>`).join('') || '<p class="rg-note">مفيش حصص جاية.</p>'}
      <button type="button" class="gd-extra" onclick="AcademyUI.sessionForm('${id}')">+ حصة إضافية خارج الجدول (تعويض أو ودية)</button></div>`);
  };

  /* Moving a player keeps their file, payments and history; only the group changes. */
  PU.moveMember = (mid, gid) => V.run(() => {
    db.update(st => {
      const m = st.members.find(x => x.id === mid), g = st.groups.find(x => x.id === gid);
      if (!m || !g) throw Error('اختار المجموعة');
      if (m.group === gid) throw Error('اللاعب في المجموعة دي بالفعل');
      if (st.members.filter(x => x.group === gid).length >= g.capacity) throw Error(`${gName(g)} مليانة (${g.capacity} لاعب)`);
      const from = m.group, future = s => s.group === from && s.status === 'scheduled' && new Date(s.start) > new Date();
      st.sessions.filter(future).forEach(s => { delete s.rsvp[mid]; });
      Object.assign(m, { group: gid, branch: g.branch || m.branch, sport: g.sport || m.sport }); delete m.left;
      if (g.sport === 'football') m.fb = { ...(m.fb || {}), track: isSquad(g) ? 'pathway' : 'school' };
      st.audit.unshift({ id: db.id('audit'), at: new Date().toISOString(), action: from ? 'نقل لاعب' : 'إضافة لاعب لمجموعة', details: `${m.name} ← ${gName(g)}` });
    });
    V.close(); render(); toast('اتنقل اللاعب');
  });
  /* Taking a player out of a group: the file stays (payments, history); they just leave the
     group's roster, sessions and chat. Not while they still owe money. */
  PU.removeMember = (mid, reason) => V.run(() => {
    let gid = '';
    db.update(st => {
      const m = st.members.find(x => x.id === mid); if (!m) throw Error('اللاعب مش موجود');
      const owed = st.invoices.filter(i => i.memberId === mid && i.total > i.paid).reduce((n, i) => n + i.total - i.paid, 0);
      if (owed) throw Error(`على اللاعب ${money(owed)}. حصّلها أو الغي الفاتورة الأول.`);
      if (!String(reason || '').trim()) throw Error('اختار سبب الإخراج');
      gid = m.group;
      st.sessions.filter(s => s.group === gid && s.status === 'scheduled' && new Date(s.start) > new Date()).forEach(s => { delete s.rsvp[mid]; });
      m.left = { at: new Date().toISOString(), from: gid, reason: String(reason).trim() }; m.group = '';
      st.audit.unshift({ id: db.id('audit'), at: new Date().toISOString(), action: 'إخراج لاعب من مجموعة', details: `${m.name} · ${reason}` });
    });
    V.close(); render(); toast('اتشال اللاعب من المجموعة');
    if (gid) U.groupDetail(gid);
  });
  const sameSport = m => { const g = db.state.groups.find(x => x.id === m.group) || db.state.groups.find(x => x.id === m.left?.from); return db.state.groups.filter(x => !g || x.sport === g.sport); };
  PU.moveForm = mid => { const m = db.member(mid), list = sameSport(m).filter(g => g.id !== m.group), by = m.dob ? Number(m.dob.slice(0, 4)) : 0, fit = list.find(g => isSquad(g) && g.fb.birthYear === by);
    V.open(`<div class="ma-form fb-form"><h3>نقل ${E(m.name)}</h3><p class="py-help">ملفه ومدفوعاته وتاريخه بيفضلوا زي ما هما؛ بيتغير فريقه وحصصه وشات المجموعة.</p><label>ينتقل لـ<select id="gd-to">${list.map(g => `<option value="${g.id}" ${fit && fit.id === g.id ? 'selected' : ''}>${E(gName(g))} · ${E(g.branch)} (${db.state.members.filter(x => x.group === g.id).length}/${g.capacity})</option>`).join('')}</select></label>${fit ? `<p class="py-help">مقترح: ${E(gName(fit))} لأنه مواليد ${by}.</p>` : ''}${btn('نقل', `ProgramsUI.moveMember('${mid}',document.getElementById('gd-to').value)`, 'primary ax-btn')}</div>`); };
  PU.removeForm = mid => { const m = db.member(mid);
    V.open(`<div class="ma-form fb-form"><h3>إخراج ${E(m.name)} من ${E(gName(db.state.groups.find(x => x.id === m.group)))}</h3><p class="py-help">اللاعب بيخرج من قايمة المجموعة وحصصها وشاتها. ملفه ومدفوعاته بيفضلوا، وتقدر ترجعه أو تنقله لمجموعة تانية بعدين من «إضافة لاعبين».</p>
      <label>السبب<select id="gd-why">${['ترك الأكاديمية', 'وقف مؤقت', 'انتقل لنادي تاني', 'ظروف مادية', 'أسباب صحية', 'تانية'].map(r => `<option>${r}</option>`).join('')}</select></label>
      <div class="rg-actions">${btn('رجوع', `AcademyUI.groupDetail('${m.group}')`)}${btn('إخراج من المجموعة', `ProgramsUI.removeMember('${mid}',document.getElementById('gd-why').value)`, 'primary')}</div></div>`); };
  /* Adding players: new ones register straight into this group, or pick existing ones. */
  PU.addToGroup = gid => { const g = db.state.groups.find(x => x.id === gid), out = db.state.members.filter(m => !m.group && (!m.sport || m.sport === g.sport)), others = db.state.members.filter(m => m.group && m.group !== gid && db.state.groups.find(x => x.id === m.group)?.sport === g.sport);
    V.open(`<div class="ma-form fb-form"><h3>إضافة لاعبين لـ ${E(gName(g))}</h3>
      <div class="rg-actions">${btn('+ لاعب جديد', `V.close();Registration.open();setTimeout(()=>Registration.preset&&Registration.preset('${gid}'),50)`, 'primary')}${btn('استيراد من Excel', 'Registration.importForm()')}</div>
      <label>أو لاعب مسجل<select id="gd-pick">${out.length ? `<optgroup label="بدون مجموعة">${out.map(m => `<option value="${m.id}">${E(m.name)}${m.left ? ' · ' + E(m.left.reason) : ''}</option>`).join('')}</optgroup>` : ''}<optgroup label="في مجموعات تانية (نقل)">${others.map(m => `<option value="${m.id}">${E(m.name)} · ${E(gName(db.state.groups.find(x => x.id === m.group)))}</option>`).join('')}</optgroup></select></label>
      ${btn('إضافة للمجموعة', `ProgramsUI.moveMember(document.getElementById('gd-pick').value,'${gid}')`, 'ax-btn')}</div>`); };


  PU.holidays = () => {
    const list = (db.state.holidays || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    V.open(`<div class="ac-form"><h2>إجازات الأكاديمية</h2><p class="rg-note">في يوم الإجازة لا تتولد حصص، والحصص المجدولة فيه تتلغي بدون خصم من رصيد اللاعبين.</p>
      ${list.map(h => `<div class="pg-result"><span><b>${E(h.name)}</b><small>${E(date(h.date + 'T12:00'))}</small></span>${btn('حذف', `ProgramsUI.removeHoliday('${h.date}')`, 'quiet small')}</div>`).join('') || '<p class="muted">لا توجد إجازات مسجلة.</p>'}
      <div class="rg-row"><label class="rg-field"><span>التاريخ</span><input id="pr-hol-date" type="date" min="${db.day(new Date())}"></label><label class="rg-field"><span>المناسبة</span><input id="pr-hol-name" placeholder="مثال: عيد الأضحى"></label></div>
      <div id="pr-error" class="rg-error" hidden></div>${btn('إضافة الإجازة', 'ProgramsUI.addHoliday()', 'primary')}</div>`);
  };
  PU.addHoliday = () => {
    const box = document.getElementById('pr-error');
    try {
      const day = val('pr-hol-date'), name = val('pr-hol-name').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < db.day(new Date())) throw Error('اختر تاريخًا من النهارده أو بعده');
      if (!name) throw Error('اكتب اسم المناسبة');
      let cancelled = 0;
      db.update(st => {
        st.holidays = st.holidays || [];
        if (st.holidays.some(h => h.date === day)) throw Error('اليوم مسجل كإجازة بالفعل');
        st.holidays.push({ date: day, name });
        st.sessions.forEach(s => { if (s.status === 'scheduled' && db.day(s.start) === day && !Object.values(s.present || {}).some(Boolean)) { s.status = 'cancelled'; s.scheduleReason = 'إجازة: ' + name; cancelled++; } });
      });
      PU.holidays(); render(); toast(`اتسجلت الإجازة${cancelled ? ' واتلغت ' + cancelled + ' حصة' : ''}`);
    } catch (e) { if (box) { box.textContent = e.message; box.hidden = false; } }
  };
  PU.removeHoliday = day => V.run(() => { db.update(st => { st.holidays = (st.holidays || []).filter(h => h.date !== day); }); S.topUp(); PU.holidays(); render(); });

  /* ---------- families ---------- */
  PAGES.families = () => {
    const q = (PU.familyQuery || '').trim();
    const fams = F.all().map(f => ({ f, members: F.members(f.id) })).filter(x => x.members.length && (!q || (x.f.name + ' ' + x.f.phone + ' ' + x.members.map(m => m.name).join(' ')).includes(q)));
    const multi = fams.filter(x => x.members.length > 1).length, owed = fams.reduce((n, x) => n + F.balance(x.f.id), 0);
    return `<div class="sb-page"><header class="sb-head"><div><small>العائلات وأولياء الأمور</small><h1>العائلات</h1><p>ولي الأمر بيتابع كل أولاده من حساب واحد، ويدفع لهم، وخصم الإخوات ${Number(db.state.settings?.siblingDiscount ?? 10)}% يطبق تلقائيًا من تاني لاعب نشط.</p></div>${btn('+ تسجيل لاعب', 'Registration.open()', 'primary')}</header>
      <div class="pg-kpis"><div><small>حسابات</small><b>${fams.length}</b></div><div><small>عائلات بأكثر من لاعب</small><b>${multi}</b></div><div class="warn"><small>متبقي على العائلات</small><b>${money(owed)}</b></div><div><small>لاعبون تحت الحسابات</small><b>${fams.reduce((n, x) => n + x.members.length, 0)}</b></div></div>
      <label class="ac-search pr-search"><input aria-label="بحث العائلات" placeholder="ابحث باسم ولي الأمر أو اللاعب أو الموبايل" value="${E(q)}" oninput="ProgramsUI.familyQuery=this.value;clearTimeout(ProgramsUI.t);ProgramsUI.t=setTimeout(render,250)"></label>
      <div class="pr-grid">${fams.sort((a, b) => b.members.length - a.members.length).map(({ f, members }) => {
        const owe = F.balance(f.id);
        return `<article class="pr-family"><header><div><h3>${E(f.name)}</h3><small><bdi>${E(f.phone)}</bdi> · ${E(f.relation)}</small></div>${owe ? `<span class="sa-chip warn">متبقي ${money(owe)}</span>` : '<span class="sa-chip ok">لا يوجد متبقي</span>'}</header>
          ${members.map(m => { const g = db.state.groups.find(x => x.id === m.group), d = g && SE.get(g.sport), st = AcademyModel.status(m); const age = F.age(m.dob);
            return `<button type="button" class="pr-kid" onclick="Refine.profile('${m.id}')"><span class="sb-icon" style="--sport:${E(d?.color || '#5d8a6f')}">${E(d?.ico || '')}</span><span><b>${E(m.name)}${m.phone === f.phone ? (f.relation === 'نفسه' ? ' (صاحب الحساب)' : ' (ولي الأمر)') : ''}</b><small>${age != null ? age + ' سنة · ' : ''}${E(g?.name || '')} · ${E(window.Progress?.level(m)?.name || 'بدون مستوى')}</small></span><span class="sa-chip ${st === 'active' ? 'ok' : 'warn'}">${statusName[st]}</span></button>`; }).join('')}
          <footer>${btn(f.relation === 'نفسه' ? 'تسجيل فرد من العائلة' : 'إضافة أخ أو أخت', `ProgramsUI.addSibling('${f.id}')`)}${owe ? btn('تحصيل المتبقي', `ProgramsUI.collectFamily('${f.id}')`, 'primary') : ''}</footer></article>`;
      }).join('') || empty('لا توجد نتائج', 'غيّر البحث.')}</div></div>`;
  };
  PAGES.families_after = () => {};
  PU.addSibling = id => { const f = F.get(id); Registration.open(); Registration.set('family.phone', f.phone); Registration.refresh(); };
  PU.collectFamily = id => { const inv = db.state.invoices.find(i => F.members(id).some(m => m.id === i.memberId) && i.paid < i.total); if (inv) V.settleForm(inv.id); };

  /* ---------- renewal at the program price ---------- */
  const legacyCollect = V.collectForm;
  V.collectForm = mid => {
    const m = db.member(mid), g = db.state.groups.find(x => x.id === m.group), d = g && SE.get(g.sport), p = d?.programs.find(x => x.id === m.programId);
    if (!p) return legacyCollect(mid);
    const fam = F.of(m), others = fam ? F.members(fam.id).filter(x => x.id !== mid && F.active(x)) : [];
    const disc = others.length ? Number(db.state.settings?.siblingDiscount ?? 10) : 0, due = Math.round(p.price * (1 - disc / 100));
    return `<div class="ac-form pr-renew"><h2>تجديد ${E(m.name)}</h2><div class="rg-bill"><div><span>${E(d.name)} · ${E(p.name)} · ${p.sessions} حصة</span><b>${money(p.price)}</b></div>${disc ? `<div class="ok"><span>خصم الإخوات ${disc}%</span><b>− ${money(p.price - due)}</b></div>` : ''}<div class="total"><span>المطلوب</span><b>${money(due)}</b></div></div>
      <div class="rg-row"><label class="rg-field"><span>طريقة الدفع</span><select id="pr-method" onchange="document.getElementById('pr-ref-wrap').hidden=this.value==='كاش'">${['كاش', 'إنستاباي', 'فودافون كاش'].map(x => `<option>${x}</option>`).join('')}</select></label><label class="rg-field" id="pr-ref-wrap" hidden><span>رقم عملية التحويل</span><input id="pr-ref"></label><label class="rg-field"><span>المدفوع الآن</span><input id="pr-paid" type="number" min="1" max="${due}" value="${due}"></label></div>
      <p class="rg-note">الاشتراك الجديد يضاف بعد نهاية الحالي (${E(new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }).format(new Date(m.end)))}) عند اكتمال الدفع.</p><div id="pr-error" class="rg-error" hidden></div>${btn('تسجيل الدفع', `ProgramsUI.renew('${mid}',${disc})`, 'primary')}</div>`;
  };
  PU.renew = (mid, disc) => {
    const box = document.getElementById('pr-error');
    try {
      const m = db.member(mid), g = db.state.groups.find(x => x.id === m.group), d = SE.get(g.sport), p = d.programs.find(x => x.id === m.programId);
      const tx = db.pay(mid, 'monthly', val('pr-method'), val('pr-ref').trim(), disc, Number(val('pr-paid')), { label: `${d.name} · ${p.name}`, price: p.price, sessions: p.sessions, days: 30, programId: p.id });
      V.close(); render(); toast('اتسجل الدفع'); if (tx) V.receipt(tx.id);
    } catch (e) { if (box) { box.textContent = e.message; box.hidden = false; } }
  };

  render();
})();

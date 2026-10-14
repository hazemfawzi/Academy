/* Sport builder in the dashboard: an overview of every sport, a wizard to add one from
   the catalog or from scratch, and a full-page editor with tabs. Nothing is stored until
   "حفظ"; the engine validates the whole definition on save. */
(function () {
  'use strict';
  if (typeof PAGES === 'undefined' || !window.SportEngine || !window.SportCore) return;
  const SE = window.SportEngine, SC = window.SportCore, db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const btn = (label, action, cls = '') => `<button type="button" class="sb-btn ${cls}" onclick="${E(action)}">${E(label)}</button>`;
  const money = n => new Intl.NumberFormat('en-US').format(n) + ' ج';
  const clone = v => JSON.parse(JSON.stringify(v));
  const plural = (n, one, two, few, many) => n === 0 ? 'لا ' + many : n === 1 ? one : n === 2 ? two : n <= 10 ? n + ' ' + few : n + ' ' + many;
  window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { sportedit: 'بناء الرياضة' });

  const ICONS = ['⚽', '🏊', '🥋', '🤸', '🎾', '💪', '🏀', '🏐', '🏓', '🏸', '🐎', '🧘', '🥊', '🤺', '⛸️', '🚴', '🏃', '🤾', '🏋️', '🏅'];
  const COLORS = ['#4c8c6e', '#3f84a8', '#b48952', '#9772ac', '#c08079', '#879c54', '#c7783f', '#5d6fa8', '#a24d4d', '#5d8a6f'];
  const MODULE_GROUPS = [
    ['التدريب والتقييم', ['levels', 'skills', 'ratings', 'times', 'belts', 'exams', 'pr']],
    ['تنظيم الحصة', ['teams', 'pairs', 'lanes', 'classes', 'courts']],
    ['المنافسات', ['matches', 'league', 'tournaments', 'americano']],
    ['الأسرة والخدمات', ['parents', 'horses']]
  ];
  const TABS = [['basics', 'الأساسيات'], ['levels', 'المستويات والمهارات'], ['assess', 'التقييم والترقية'], ['programs', 'البرامج والأسعار'], ['places', 'أماكن التدريب'], ['tools', 'الأدوات'], ['preview', 'المعاينة']];

  const B = window.SportBuilder = { id: '', draft: null, tab: 'basics', level: 0, dirty: false, isNew: false };

  const playersOf = id => { const gs = new Set(db.state.groups.filter(g => g.sport === id).map(g => g.id)); return db.state.members.filter(m => gs.has(m.group)); };
  const groupsOf = id => db.state.groups.filter(g => g.sport === id);

  /* ---------- overview ---------- */
  PAGES.sports = () => {
    const cards = SE.list().map(d => {
      const players = playersOf(d.id).length, groups = groupsOf(d.id).length, levels = d.levels.filter(l => l.active).length;
      const prices = d.programs.filter(p => p.active !== false).map(p => p.price);
      const tools = SC.tools(d).map(t => `<span>${E(t.title)}</span>`).join('');
      return `<article class="sb-card ${d.on === false ? 'off' : ''}" style="--sport:${E(d.color)}">
        <header><span class="sb-icon">${E(d.ico)}</span><div><h3>${E(d.name)}</h3><small>${E(SC.TYPES[d.type].name)}${d.custom ? ' · رياضة خاصة' : ''}</small></div>
        <label class="sb-switch" title="التسجيل"><input type="checkbox" ${d.on !== false ? 'checked' : ''} onchange="SportBuilder.toggle('${d.id}',this.checked)" aria-label="التسجيل في ${E(d.name)}"><i></i><span>${d.on !== false ? 'التسجيل مفتوح' : 'التسجيل متوقف'}</span></label></header>
        <dl><div><dt>اللاعبون</dt><dd>${players}</dd></div><div><dt>الجروبات</dt><dd>${groups}</dd></div><div><dt>المستويات</dt><dd>${levels}</dd></div><div><dt>الاشتراك</dt><dd>${prices.length ? (Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : new Intl.NumberFormat('en-US').format(Math.min(...prices)) + '–' + money(Math.max(...prices))) : '—'}</dd></div></dl>
        <p class="sb-path">${d.levels.filter(l => l.active).map(l => E(l.name)).join(' <i>←</i> ')}</p>
        <div class="sb-tools">${tools || '<span class="muted">لا توجد أدوات مفعلة</span>'}</div>
        <footer>${btn('تعديل الرياضة', `SportBuilder.open('${d.id}')`, 'primary')}${d.on !== false ? btn('مساحة الرياضة', `AcademyUI.openSport('${d.id}')`) : ''}</footer></article>`;
    }).join('');
    return `<div class="sb-page"><header class="sb-head"><div><small>الرياضات والبرامج</small><h1>بناء الرياضات</h1><p>كل رياضة لها مستويات ومهارات وطريقة تقييم وبرامج وأسعار. الأدوات اللي تفعّلها هنا هي اللي تظهر للمدرب وولي الأمر.</p></div>${btn('+ رياضة جديدة', 'SportBuilder.newSport()', 'primary')}</header><div class="sb-grid">${cards}</div></div>`;
  };
  PAGES.sports_after = () => {};

  B.toggle = (id, on) => V.run(() => { SE.toggle(id, on); render(); toast(on ? 'التسجيل مفتوح للرياضة' : 'التسجيل متوقف؛ اللاعبون الحاليون لا يتأثرون'); });

  /* ---------- new sport wizard ---------- */
  B.newSport = (step = 'source') => {
    if (step === 'source') {
      const left = MS.CATALOG.filter(c => !SE.get(c.id));
      return V.open(`<div class="sb-wizard"><small>رياضة جديدة · الخطوة 1 من 2</small><h2>منين تبدأ؟</h2>
        <h3>من الكتالوج</h3><p class="muted">بتيجي بمستوياتها وأدواتها جاهزة، وتقدر تعدل كل حاجة.</p>
        <div class="sb-choice-grid">${left.map(c => `<button type="button" onclick="SportBuilder.create({catalogId:'${c.id}'})"><span>${E(c.ico)}</span><b>${E(c.name)}</b><small>${E(SC.TYPES[SC.PRESETS[c.id]?.type || 'levels'].name)}</small></button>`).join('') || '<p class="muted">كل رياضات الكتالوج مضافة.</p>'}</div>
        <h3>رياضة خاصة من الصفر</h3><p class="muted">اختر نوع الرياضة، والنوع بيحدد الأدوات المقترحة.</p>
        <div class="sb-choice-grid">${Object.entries(SC.TYPES).map(([k, t]) => `<button type="button" onclick="SportBuilder.newSport('${k}')"><b>${E(t.name)}</b><small>${E(t.desc)}</small></button>`).join('')}</div></div>`);
    }
    const t = SC.TYPES[step];
    V.open(`<div class="sb-wizard"><small>رياضة جديدة · الخطوة 2 من 2 · ${E(t.name)}</small><h2>اسم الرياضة وأيقونتها</h2>
      <div class="v-field"><label for="sb-new-name">اسم الرياضة</label><input id="sb-new-name" placeholder="مثال: تنس طاولة"></div>
      <div class="v-field"><span class="sb-label">الأيقونة</span><div class="sb-icons" role="radiogroup">${ICONS.map((ic, i) => `<label><input type="radio" name="sb-new-icon" value="${ic}" ${i === ICONS.length - 1 ? 'checked' : ''}><span>${ic}</span></label>`).join('')}</div></div>
      <div class="sb-wizard-actions">${btn('رجوع', 'SportBuilder.newSport()')}${btn('ابدأ البناء', `SportBuilder.createCustom('${step}')`, 'primary')}</div></div>`);
  };
  B.createCustom = type => V.run(() => {
    const ico = document.querySelector('input[name="sb-new-icon"]:checked')?.value || '🏅';
    B.create({ name: document.getElementById('sb-new-name').value, type, ico });
  });
  B.create = source => V.run(() => {
    B.draft = SE.draft(source); B.id = B.draft.id; B.isNew = true; B.dirty = true; B.tab = 'basics'; B.level = 0;
    V.close(); go('sportedit');
  });

  /* ---------- editor ---------- */
  B.open = id => { const d = SE.get(id); if (!d) return; B.draft = clone(d); B.id = id; B.isNew = false; B.dirty = false; B.tab = 'basics'; B.level = 0; go('sportedit'); };
  B.setTab = tab => { B.tab = tab; render(); };
  const touch = () => { B.dirty = true; const el = document.getElementById('sb-dirty'); if (el) el.hidden = false; };
  B.field = (key, value) => { B.draft[key] = value; touch(); };
  B.num = (key, value) => { B.draft[key] = Number(value); touch(); };
  B.term = (key, value) => { B.draft.terms[key] = value; touch(); };
  B.reg = (key, value) => { B.draft.registration[key] = value; touch(); };
  B.promo = (key, value) => { B.draft.promotion[key] = value; touch(); };
  B.pick = (key, value) => { B.draft[key] = value; touch(); render(); };

  PAGES.sportedit = () => {
    const d = B.draft;
    if (!d) return `<div class="sb-page">${btn('رجوع للرياضات', "go('sports')")}</div>`;
    const body = ({ basics, levels, assess, programs, places, tools, preview })[B.tab]();
    return `<div class="sb-page sb-editor" style="--sport:${E(d.color)}">
      <header class="sb-editor-head"><button type="button" class="sb-back" onclick="SportBuilder.close()">→ الرياضات</button>
        <div class="sb-title"><span class="sb-icon">${E(d.ico)}</span><div><small>${B.isNew ? 'رياضة جديدة · لم تحفظ بعد' : E(SC.TYPES[d.type].name)}</small><h1>${E(d.name || 'رياضة بدون اسم')}</h1></div></div>
        <div class="sb-save"><span id="sb-dirty" class="sb-dirty" ${B.dirty ? '' : 'hidden'}>تعديلات غير محفوظة</span>${btn('إلغاء', 'SportBuilder.close()')}${btn(B.isNew ? 'حفظ وإضافة الرياضة' : 'حفظ التعديلات', 'SportBuilder.save()', 'primary')}</div></header>
      <nav class="sb-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${B.tab === k}" class="${B.tab === k ? 'on' : ''}" onclick="SportBuilder.setTab('${k}')">${l}</button>`).join('')}</nav>
      <div id="sb-error" class="sb-error" role="alert" hidden></div>
      <section class="sb-body">${body}</section></div>`;
  };

  const section = (title, hint, content) => `<section class="sb-section"><header><h2>${E(title)}</h2>${hint ? `<p>${E(hint)}</p>` : ''}</header>${content}</section>`;
  const input = (label, value, handler, attrs = '') => `<label class="sb-field"><span>${E(label)}</span><input value="${E(value)}" oninput="${E(handler)}" ${attrs}></label>`;

  function basics() {
    const d = B.draft;
    return section('هوية الرياضة', 'الاسم والأيقونة واللون بيظهروا في كل الشاشات والتطبيقات.', `<div class="sb-row">${input('اسم الرياضة', d.name, "SportBuilder.field('name',this.value)")}</div>
        <span class="sb-label">الأيقونة</span><div class="sb-icons">${ICONS.map(ic => `<label><input type="radio" name="sb-icon" ${d.ico === ic ? 'checked' : ''} onchange="SportBuilder.pick('ico','${ic}')"><span>${ic}</span></label>`).join('')}</div>
        <span class="sb-label">اللون</span><div class="sb-colors">${COLORS.map(c => `<label style="--c:${c}"><input type="radio" name="sb-color" ${d.color === c ? 'checked' : ''} onchange="SportBuilder.pick('color','${c}')"><span></span></label>`).join('')}</div>`)
      + section('المصطلحات', 'الكلمات اللي بيشوفها المدرب وولي الأمر في هذه الرياضة.', `<div class="sb-row">${input('لقب المدرب', d.terms.coach, "SportBuilder.term('coach',this.value)", 'placeholder="كابتن، سنسي، كوتش"')}${input('اللاعب (مفرد)', d.terms.player, "SportBuilder.term('player',this.value)", 'placeholder="لاعب، سبّاح"')}${input('اللاعبون (جمع)', d.terms.players, "SportBuilder.term('players',this.value)")}</div>`)
      + section('إعدادات الحصص', 'تطبق على الجروبات والحصص الجديدة فقط.', `<div class="sb-row">${input('مدة الحصة (دقيقة)', d.duration, "SportBuilder.num('duration',this.value)", 'type="number" min="15" max="240"')}${input('سعة الجروب', d.capacity, "SportBuilder.num('capacity',this.value)", 'type="number" min="1" max="100"')}</div>`)
      + section('شروط التسجيل', 'تظهر في استمارة تسجيل اللاعب.', `<label class="sb-check"><input type="checkbox" ${d.registration.medical ? 'checked' : ''} onchange="SportBuilder.reg('medical',this.checked)"> شهادة طبية مطلوبة قبل أول حصة</label>
        <label class="sb-check"><input type="checkbox" ${d.registration.consent ? 'checked' : ''} onchange="SportBuilder.reg('consent',this.checked)"> موافقة ولي الأمر للأطفال</label>
        ${input('ملاحظة للتسجيل', d.registration.note, "SportBuilder.reg('note',this.value)", 'placeholder="مثال: الزي الرسمي متاح من الاستقبال"')}`);
  }

  /* Levels: compact list with an editing panel for the selected level. */
  function levels() {
    const d = B.draft, used = SC.levelUsage(db.state, d), sel = d.levels[B.level] || d.levels[0];
    const list = d.levels.map((l, i) => `<li class="${l === sel ? 'on' : ''} ${l.active ? '' : 'inactive'}"><button type="button" class="sb-level-pick" onclick="SportBuilder.selectLevel(${i})"><b>${i + 1}</b><span>${E(l.name || 'بدون اسم')}</span><small>${plural(l.skills.length, 'مهارة واحدة', 'مهارتان', 'مهارات', 'مهارة')}${l.active ? '' : ' · معطل'}</small></button>
      <span class="sb-move">${btn('↑', `SportBuilder.moveLevel(${i},-1)`, 'icon')}${btn('↓', `SportBuilder.moveLevel(${i},1)`, 'icon')}</span></li>`).join('');
    const panel = sel ? `<div class="sb-level-panel"><div class="sb-row">${input('اسم المستوى', sel.name, `SportBuilder.levelField(${d.levels.indexOf(sel)},'name',this.value)`)}</div>
      <label class="sb-field"><span>متطلبات اجتياز المستوى</span><textarea rows="2" oninput="SportBuilder.levelField(${d.levels.indexOf(sel)},'criteria',this.value)" placeholder="مثال: يسبح 25 متر كرول بدون توقف">${E(sel.criteria)}</textarea></label>
      <span class="sb-label">مهارات المستوى</span><p class="sb-hint">المدرب يعلّم على كل مهارة لما اللاعب يتقنها، وده شرط الترقية لو فعلته.</p>
      <ol class="sb-skill-list">${sel.skills.map((s, j) => `<li><input value="${E(s.name)}" aria-label="مهارة ${j + 1}" oninput="SportBuilder.skillField(${d.levels.indexOf(sel)},${j},this.value)">${btn('حذف', `SportBuilder.removeSkill(${d.levels.indexOf(sel)},${j})`, 'quiet small')}</li>`).join('')}</ol>
      ${btn('+ إضافة مهارة', `SportBuilder.addSkill(${d.levels.indexOf(sel)})`)}
      <footer class="sb-level-foot"><label class="sb-check"><input type="checkbox" ${sel.active ? 'checked' : ''} onchange="SportBuilder.levelActive(${d.levels.indexOf(sel)},this.checked)"> المستوى متاح للتعيين والترقية</label>
      ${used[sel.id] ? '<small class="muted">عليه لاعبون أو سجل؛ يمكن تعطيله فقط</small>' : btn('حذف المستوى', `SportBuilder.removeLevel(${d.levels.indexOf(sel)})`, 'danger small')}</footer></div>` : '';
    return section('مسار المستويات', 'رتّب المستويات من الأول للأخير. اختر مستوى لتعديل اسمه ومهاراته.', `<div class="sb-levels"><div><ol class="sb-level-list">${list}</ol>${btn('+ إضافة مستوى', 'SportBuilder.addLevel()')}</div>${panel}</div>`);
  }
  B.selectLevel = i => { B.level = i; render(); };
  B.levelField = (i, key, value) => { B.draft.levels[i][key] = value; touch(); if (key === 'name') { const el = document.querySelectorAll('.sb-level-pick span')[i]; if (el) el.textContent = value || 'بدون اسم'; } };
  B.levelActive = (i, on) => { B.draft.levels[i].active = on; touch(); render(); };
  B.moveLevel = (i, step) => { const L = B.draft.levels, j = i + step; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; B.level = j; touch(); render(); };
  B.addLevel = () => { const d = B.draft; d.levels.push({ id: d.id + '-level-' + db.id('x').slice(2), name: 'مستوى ' + (d.levels.length + 1), criteria: '', active: true, skills: [] }); B.level = d.levels.length - 1; touch(); render(); };
  B.removeLevel = i => { B.draft.levels.splice(i, 1); B.level = Math.max(0, i - 1); touch(); render(); };
  B.addSkill = i => { const l = B.draft.levels[i]; l.skills.push({ id: l.id + '-skill-' + db.id('x').slice(2), name: '' }); touch(); render(); setTimeout(() => { const all = document.querySelectorAll('.sb-skill-list input'); all[all.length - 1]?.focus(); }); };
  B.skillField = (i, j, value) => { B.draft.levels[i].skills[j].name = value; touch(); };
  B.removeSkill = (i, j) => { B.draft.levels[i].skills.splice(j, 1); touch(); render(); };

  function assess() {
    const d = B.draft, kinds = Object.entries(SC.KINDS);
    const rows = d.metrics.map((m, i) => `<tr><td><input value="${E(m.name)}" aria-label="اسم عنصر التقييم" oninput="SportBuilder.metricField(${i},'name',this.value)"></td>
      <td><select aria-label="نوع القياس" onchange="SportBuilder.metricKind(${i},this.value)">${kinds.map(([k, v]) => `<option value="${k}" ${m.kind === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select></td>
      <td>${m.kind === 'number' ? `<input value="${E(m.unit)}" aria-label="الوحدة" placeholder="كجم، متر، عدة" oninput="SportBuilder.metricField(${i},'unit',this.value)">` : `<span class="muted">${E(SC.KINDS[m.kind].unit || '—')}</span>`}</td>
      <td><span class="muted">${SC.KINDS[m.kind].better === 'lower' ? 'الأقل أفضل' : 'الأعلى أفضل'}</span></td><td>${btn('حذف', `SportBuilder.removeMetric(${i})`, 'quiet small')}</td></tr>`).join('');
    const p = d.promotion;
    return section('عناصر التقييم', 'اللي المدرب بيقيسه في الحصة: زمن، درجة، تقييم من 5، أو رقم بوحدة.', `<div class="sb-table-wrap"><table class="sb-table"><thead><tr><th>العنصر</th><th>نوع القياس</th><th>الوحدة</th><th>المقارنة</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${btn('+ إضافة عنصر تقييم', 'SportBuilder.addMetric()')}`)
      + section('شروط الترقية', 'النظام يحسب أهلية كل لاعب من الشروط دي ويعرضها للمدرب وولي الأمر.', `<div class="sb-row">${input('أقل عدد حصص منذ آخر ترقية', p.minSessions, "SportBuilder.promo('minSessions',Number(this.value))", 'type="number" min="0" max="200"')}${input('أقل نسبة حضور %', p.minAttendance, "SportBuilder.promo('minAttendance',Number(this.value))", 'type="number" min="0" max="100"')}</div>
        <label class="sb-check"><input type="checkbox" ${p.skills ? 'checked' : ''} onchange="SportBuilder.promo('skills',this.checked)"> إتقان كل مهارات المستوى الحالي</label>
        <label class="sb-check"><input type="checkbox" ${p.exam ? 'checked' : ''} onchange="SportBuilder.promo('exam',this.checked)"> النجاح في اختبار ترقية (الترقية تحصل تلقائيًا عند تسجيل النجاح)</label>`);
  }
  B.metricField = (i, key, value) => { B.draft.metrics[i][key] = value; touch(); };
  B.metricKind = (i, kind) => { const m = B.draft.metrics[i]; m.kind = kind; m.unit = SC.KINDS[kind].unit; m.better = SC.KINDS[kind].better; touch(); render(); };
  B.addMetric = () => { B.draft.metrics.push({ id: B.draft.id + '-metric-' + db.id('x').slice(2), name: '', kind: 'rating', unit: 'من 5', better: 'higher' }); touch(); render(); };
  B.removeMetric = i => { B.draft.metrics.splice(i, 1); touch(); render(); };

  function programs() {
    const d = B.draft;
    const rows = d.programs.map((p, i) => `<tr class="${p.active === false ? 'inactive' : ''}"><td><input value="${E(p.name)}" aria-label="اسم البرنامج" oninput="SportBuilder.programField(${i},'name',this.value)"></td>
      <td><input type="number" value="${p.ageMin}" min="2" max="90" aria-label="من سن" oninput="SportBuilder.programField(${i},'ageMin',this.value)"></td>
      <td><input type="number" value="${p.ageMax}" min="2" max="90" aria-label="إلى سن" oninput="SportBuilder.programField(${i},'ageMax',this.value)"></td>
      <td><input type="number" value="${p.sessions}" min="1" max="60" aria-label="حصص في الشهر" oninput="SportBuilder.programField(${i},'sessions',this.value)"></td>
      <td><input type="number" value="${p.price}" min="0" aria-label="السعر الشهري" oninput="SportBuilder.programField(${i},'price',this.value)"></td>
      <td><label class="sb-check"><input type="checkbox" ${p.active !== false ? 'checked' : ''} onchange="SportBuilder.programField(${i},'active',this.checked)"> متاح</label></td><td>${btn('حذف', `SportBuilder.removeProgram(${i})`, 'quiet small')}</td></tr>`).join('');
    return section('البرامج والأسعار', 'كل برنامج فئة عمرية بسعر شهري وعدد حصص. التسجيل يقترح البرنامج المناسب لسن اللاعب.', `<div class="sb-table-wrap"><table class="sb-table"><thead><tr><th>البرنامج</th><th>من سن</th><th>إلى سن</th><th>حصص/شهر</th><th>السعر الشهري (ج)</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${btn('+ إضافة برنامج', 'SportBuilder.addProgram()')}`);
  }
  B.programField = (i, key, value) => { B.draft.programs[i][key] = key === 'name' || key === 'active' ? value : Number(value); touch(); };
  B.addProgram = () => { B.draft.programs.push({ id: B.draft.id + '-program-' + db.id('x').slice(2), name: '', ageMin: 6, ageMax: 12, price: 900, sessions: 8, active: true }); touch(); render(); };
  B.removeProgram = i => { B.draft.programs.splice(i, 1); touch(); render(); };

  function places() {
    const d = B.draft;
    const rows = d.resources.map((r, i) => `<li><input value="${E(r.name)}" aria-label="اسم المكان" oninput="SportBuilder.resourceField(${i},'name',this.value)" placeholder="حارة 1، ملعب 2، صالة"><input type="number" value="${r.capacity || ''}" min="0" aria-label="السعة" placeholder="السعة" oninput="SportBuilder.resourceField(${i},'capacity',this.value)">${btn('حذف', `SportBuilder.removeResource(${i})`, 'quiet small')}</li>`).join('');
    return section('أماكن التدريب', 'الحارات والملاعب والصالات اللي تتحجز للحصص. النظام يمنع حجز نفس المكان في نفس الوقت، ويوزع اللاعبين عليها.', `<ul class="sb-resource-list">${rows}</ul>${btn('+ إضافة مكان', 'SportBuilder.addResource()')}`);
  }
  B.resourceField = (i, key, value) => { B.draft.resources[i][key] = key === 'capacity' ? Number(value) : value; touch(); };
  B.addResource = () => { B.draft.resources.push({ id: B.draft.id + '-resource-' + db.id('x').slice(2), name: '', capacity: 0 }); touch(); render(); };
  B.removeResource = i => { B.draft.resources.splice(i, 1); touch(); render(); };

  function tools() {
    const d = B.draft;
    return section('أدوات الرياضة', 'الأداة المفعلة تظهر للمدرب في التطبيق ولولي الأمر في التقدم. المقفولة تختفي فعلًا.', MODULE_GROUPS.map(([title, keys]) => `<h3 class="sb-sub">${title}</h3><div class="sb-modules">${keys.map(k => {
      const m = SC.MODULES[k], state = SC.moduleState(d, k), on = d.modules.includes(k);
      const note = state === 'planned' ? 'قيد التطوير' : state === 'limited' ? 'شاشاته متاحة لـ' + (MS.sport(m.ready)?.name || m.ready) + ' حاليًا' : '';
      return `<label class="sb-module ${on ? 'on' : ''} ${state}"><input type="checkbox" ${on ? 'checked' : ''} ${state === 'planned' ? 'disabled' : ''} onchange="SportBuilder.toggleModule('${k}')"><span><b>${E(m.name)}</b><small>${E(m.desc)}</small>${note ? `<em>${E(note)}</em>` : ''}</span></label>`;
    }).join('')}</div>`).join(''));
  }
  B.toggleModule = k => { const d = B.draft; d.modules = d.modules.includes(k) ? d.modules.filter(x => x !== k) : [...d.modules, k]; touch(); render(); };

  function preview() {
    const d = B.draft, t = SC.tools(d), a = SC.adminTools(d), active = d.levels.filter(l => l.active);
    return `<div class="sb-preview"><section class="sb-phone"><small>تطبيق ${E(d.terms.coach)}</small><h3>أدوات ${E(d.name)}</h3>${t.map(x => `<div class="sb-phone-row"><b>${E(x.title)}</b><small>${E(x.desc)}</small></div>`).join('') || '<p class="muted">لا توجد أدوات مفعلة.</p>'}</section>
      <section class="sb-phone"><small>تطبيق ولي الأمر</small><h3>تقدم ${E(d.terms.player)}</h3><div class="sb-phone-row"><b>المستوى الحالي</b><small>${E(active[0]?.name || '—')} ← ${E(active[1]?.name || '—')}</small></div>
        ${active[0]?.skills.length ? `<div class="sb-phone-row"><b>مهارات المستوى</b><small>${active[0].skills.map(s => E(s.name)).join(' · ')}</small></div>` : ''}
        <div class="sb-phone-row"><b>أفضل النتائج</b><small>${d.metrics.map(m => E(m.name)).join(' · ') || '—'}</small></div>
        <div class="sb-phone-row"><b>شروط الترقية</b><small>${[d.promotion.skills ? 'إتقان المهارات' : '', d.promotion.minSessions ? d.promotion.minSessions + ' حصة' : '', d.promotion.minAttendance ? 'حضور ' + d.promotion.minAttendance + '%' : '', d.promotion.exam ? 'اختبار' : ''].filter(Boolean).join(' · ') || 'بدون شروط'}</small></div></section>
      <section class="sb-phone"><small>لوحة الإدارة</small><h3>شاشات إضافية</h3>${a.map(x => `<div class="sb-phone-row"><b>${E(x.title)}</b></div>`).join('') || '<p class="muted">لا توجد شاشات إضافية.</p>'}<div class="sb-phone-row"><b>البرامج</b><small>${d.programs.filter(p => p.active !== false).map(p => `${E(p.name)} (من ${p.ageMin} إلى ${p.ageMax} سنة) ${money(p.price)}`).join(' · ')}</small></div></section></div>`;
  }

  B.save = () => {
    const box = document.getElementById('sb-error');
    try {
      const saved = SE.save(B.draft);
      B.draft = clone(saved); B.id = saved.id; B.dirty = false;
      const wasNew = B.isNew; B.isNew = false;
      toast(wasNew ? `${saved.name} اتضافت. أضف لها جروبًا لتبدأ التسجيل.` : 'اتحفظت إعدادات ' + saved.name);
      render();
    } catch (e) { if (box) { box.textContent = e.message; box.hidden = false; box.scrollIntoView({ block: 'center' }); } }
  };
  B.close = () => {
    if (B.dirty && !confirm('فيه تعديلات غير محفوظة. تخرج بدون حفظ؟')) return;
    B.draft = null; B.dirty = false; go('sports');
  };

  /* Earlier entry points keep working. */
  window.SportAdmin = { edit: id => B.open(id), assign: id => { AcademyUI.sport = id; go('progress'); } };

  /* New groups and sessions start from the sport defaults. */
  const groupForm = AcademyUI.groupForm;
  AcademyUI.groupForm = () => { groupForm(); const el = document.getElementById('ac-g-sport'), apply = () => { const d = SE.get(el.value); if (d) document.getElementById('ac-g-cap').value = d.capacity; }; el.onchange = apply; apply(); };
  const sessionSport = AcademyUI.sessionSport;
  if (sessionSport) AcademyUI.sessionSport = () => { sessionSport(); const id = document.getElementById('ac-s-sport')?.value, d = id && SE.get(id); if (d) { document.getElementById('ac-s-duration').value = d.duration; const r = document.getElementById('ac-s-resource'); if (r) r.placeholder = d.resources.map(x => x.name).join('، '); } };

  render();
})();

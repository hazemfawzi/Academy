/* One registration flow for the dashboard and the branch manager app:
   guardian (or adult player) → player → program and group → review.
   It links children to a family, offers only the programs and groups that fit the
   player's age, and bills the first month without taking money: payment is collected
   afterwards from billing. Football has two tracks: the football school (a training
   group chosen by age and time) and the pathway, where the squad follows the birth year
   and the player's position, foot and scholarship are recorded. */
(function () {
  'use strict';
  if (!window.V || !window.Family || !window.SportEngine) return;
  const db = V.db, SE = window.SportEngine, F = window.Family;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => new Intl.NumberFormat('en-US').format(Math.round(n)) + ' ج';
  const STEPS = ['ولي الأمر', 'اللاعب', 'البرنامج', 'المراجعة'];
  const FC = () => window.FootballCore;
  const edition = () => window.Edition?.sport || '';
  const describe = g => window.ScheduleCore ? ScheduleCore.describe(g) : '';

  let R = null;
  const fresh = (leadId = '', keepFamily = null) => {
    const lead = leadId ? db.state.leads.find(l => l.id === leadId) : null;
    R = {
      step: 0, mode: keepFamily?.mode || 'child', leadId: lead?.id || '', error: '', done: null,
      family: keepFamily ? { ...keepFamily.family } : { phone: lead?.phone || '', name: lead?.name || '', relation: 'الأب' },
      player: { name: '', dob: '', gender: '', nationality: 'مصري', photo: '', medical: '', phone: '', emergencySame: true, emergencyName: '', emergencyPhone: '' },
      sport: edition(), programId: '', branch: '', group: '', levelId: '',
      fb: { track: '', position: '', foot: 'يمين', funding: 'اشتراك', partial: 50 }, consent: false, medicalReceived: false
    };
  };

  const def = () => SE.get(R.sport);
  const age = () => F.age(R.player.dob);
  const familyFound = () => R.mode === 'child' && F.MOBILE.test(R.family.phone) ? F.byPhone(R.family.phone) : null;
  const program = () => def()?.programs.find(p => p.id === R.programId) || null;
  const groupRow = () => db.state.groups.find(g => g.id === R.group) || null;
  const seatsLeft = g => g.capacity - db.state.members.filter(m => m.group === g.id).length;
  const sibling = () => { const fam = R.mode === 'child' ? familyFound() : null; return fam ? F.discountFor(fam.id) : 0; };
  const football = () => R.sport === 'football' && !!FC();
  const pathway = () => football() && R.fb.track === 'pathway';
  /* Pathway scholarships replace the sibling discount; everyone else gets the sibling discount. */
  const discount = () => pathway() ? (R.fb.funding === 'منحة كاملة' ? 100 : R.fb.funding === 'منحة جزئية' ? Math.max(1, Math.min(99, Number(R.fb.partial) || 0)) : sibling()) : sibling();
  const discountName = () => pathway() && R.fb.funding !== 'اشتراك' ? R.fb.funding + (R.fb.funding === 'منحة جزئية' ? ` ${discount()}%` : '') : discount() ? `خصم الإخوات ${discount()}%` : '';
  const total = () => { const p = program(); return p ? Math.round(p.price * (1 - discount() / 100)) : 0; };
  const birthYear = () => R.player.dob ? Number(R.player.dob.slice(0, 4)) : null;
  const ageFits = (g, a) => a == null || g.ageMin == null || (a >= g.ageMin && a <= g.ageMax);
  /* Groups the player can join: the squad of their birth year on the pathway, otherwise
     the groups of this sport (football school groups only, for football) that fit their age. */
  const groupsFor = () => {
    const a = age(), all = db.state.groups.filter(g => g.sport === R.sport);
    if (pathway()) return FC().squads(db.state).filter(g => g.fb.birthYear === birthYear());
    return all.filter(g => !(football() && FC().isSquad(g)) && ageFits(g, a));
  };

  /* ---------- views ---------- */
  const NATIONS = ['مصري', 'سعودي', 'إماراتي', 'كويتي', 'قطري', 'بحريني', 'عماني', 'أردني', 'فلسطيني', 'لبناني', 'سوري', 'عراقي', 'سوداني', 'ليبي', 'تونسي', 'جزائري', 'مغربي', 'يمني', 'أخرى'];
  const field = (label, html, hint = '') => `<label class="rg-field"><span>${E(label)}</span>${html}${hint ? `<small>${E(hint)}</small>` : ''}</label>`;
  const input = (key, value, attrs = '') => `<input value="${E(value)}" oninput="Registration.set('${key}',this.value)" ${attrs}>`;
  const choice = (name, value, current, title, desc, action) => `<label class="rg-choice ${current === value ? 'on' : ''}"><input type="radio" name="${name}" value="${E(value)}" ${current === value ? 'checked' : ''} onchange="${E(action)}"><span><b>${E(title)}</b>${desc ? `<small>${E(desc)}</small>` : ''}</span></label>`;

  function stepFamily() {
    const fam = familyFound(), kids = fam ? F.members(fam.id) : [];
    return `<div class="rg-choices">${choice('rg-mode', 'child', R.mode, 'تسجيل طفل', 'ولي الأمر يسجل ويدفع ويتابع من حسابه', "Registration.mode('child')")}${choice('rg-mode', 'adult', R.mode, 'لاعب بالغ', 'اللاعب يسجل لنفسه برقمه', "Registration.mode('adult')")}</div>
      ${R.mode === 'child' ? `${field('موبايل ولي الأمر', input('family.phone', R.family.phone, 'inputmode="tel" maxlength="11" placeholder="01xxxxxxxxx" autocomplete="tel"'), 'لو الرقم مسجل، الطفل يتضاف لنفس العائلة')}
        ${fam ? `<div class="rg-family"><b>عائلة ${E(fam.name)} مسجلة</b><small>${kids.map(k => E(k.name)).join('، ') || 'بدون لاعبين بعد'}</small>${F.discountFor(fam.id) ? `<em>خصم الإخوات ${F.discountFor(fam.id)}% يطبق على الاشتراك الجديد</em>` : ''}</div>`
        : `<div class="rg-row">${field('اسم ولي الأمر', input('family.name', R.family.name, 'autocomplete="name"'))}${field('صلة القرابة', `<select onchange="Registration.set('family.relation',this.value)">${['الأب', 'الأم', 'ولي أمر آخر'].map(r => `<option ${R.family.relation === r ? 'selected' : ''}>${r}</option>`).join('')}</select>`)}</div>`}`
      : `<div class="rg-row">${field('اسم اللاعب', input('player.name', R.player.name, 'autocomplete="name"'))}${field('موبايل اللاعب', input('player.phone', R.player.phone, 'inputmode="tel" maxlength="11" placeholder="01xxxxxxxxx"'))}</div>`}`;
  }

  function stepPlayer() {
    const a = age();
    return `<div class="rg-photo-row"><label class="rg-photo">${R.player.photo ? `<img src="${R.player.photo}" alt="صورة اللاعب">` : '<span>📷</span>'}<input type="file" accept="image/*" onchange="Registration.photo(this)"></label><div class="rg-photo-main">${R.mode === 'child' ? field('اسم الطفل', input('player.name', R.player.name)) : `<p class="rg-note">${E(R.player.name)} · <bdi>${E(R.player.phone)}</bdi></p>`}<small class="rg-hint">${R.player.photo ? 'اضغط على الصورة لتغييرها' : 'صورة اللاعب (اختياري): بتظهر في الكارت وكشف الحضور'}</small></div></div>
      <div class="rg-row rg-row-top">${field('تاريخ الميلاد', `<input type="date" value="${E(R.player.dob)}" max="${db.day(new Date())}" onchange="Registration.set('player.dob',this.value);Registration.set('group','');Registration.refresh()">`, a != null ? `السن ${a} سنة${football() && birthYear() ? ' · ' + FC().squadName(birthYear()) : ''}` : 'بيحدد البرامج والجروبات المناسبة')}
      ${field('النوع', `<div class="rg-seg">${[['m', 'ذكر'], ['f', 'أنثى']].map(([v, l]) => `<label><input type="radio" name="rg-gender" value="${v}" ${R.player.gender === v ? 'checked' : ''} onchange="Registration.set('player.gender','${v}')"><span>${l}</span></label>`).join('')}</div>`, '\u00a0')}</div>
      ${field('الجنسية', `<select onchange="Registration.set('player.nationality',this.value)">${NATIONS.map(n => `<option ${R.player.nationality === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`)}
      ${field('ملاحظات صحية', `<textarea rows="2" oninput="Registration.set('player.medical',this.value)" placeholder="حساسية، ربو، إصابة سابقة… اتركها فاضية لو لا يوجد">${E(R.player.medical)}</textarea>`, 'تظهر للمدرب في كشف الحضور')}
      ${R.mode === 'child' ? `<label class="rg-check"><input type="checkbox" ${R.player.emergencySame ? 'checked' : ''} onchange="Registration.set('player.emergencySame',this.checked);Registration.refresh()"> جهة الطوارئ هي ولي الأمر</label>` : ''}
      ${R.mode === 'adult' || !R.player.emergencySame ? `<div class="rg-row">${field('اسم جهة الطوارئ', input('player.emergencyName', R.player.emergencyName))}${field('موبايل الطوارئ', input('player.emergencyPhone', R.player.emergencyPhone, 'inputmode="tel" maxlength="11"'))}</div>` : ''}`;
  }

  function stepProgram() {
    const sports = SE.list().filter(d => d.on !== false && db.state.groups.some(g => g.sport === d.id) && (!edition() || d.id === edition()));
    if (sports.length === 1 && !R.sport) R.sport = sports[0].id;
    const d = def(), a = age();
    const fits = p => a == null || (a >= p.ageMin && a <= p.ageMax);
    const hasPathway = football() && FC().squads(db.state).length > 0;
    if (football() && !R.fb.track) R.fb.track = hasPathway ? '' : 'school';
    const programs = d ? d.programs.filter(p => p.active !== false && fits(p)) : [];
    if (d && (!R.programId || !programs.some(p => p.id === R.programId))) R.programId = programs[0]?.id || '';
    const groups = d && (!football() || R.fb.track) ? groupsFor() : [];
    if (R.group && !groups.some(g => g.id === R.group)) R.group = '';
    if (pathway() && groups.length === 1 && !R.group) R.group = groups[0].id;
    const unit = pathway() ? 'الفريق' : football() ? 'مجموعة مدرسة الكرة' : 'الجروب';
    const groupCard = g => { const left = seatsLeft(g);
      return `<label class="rg-group ${R.group === g.id ? 'on' : ''} ${left <= 0 ? 'full' : ''}"><input type="radio" name="rg-group" ${R.group === g.id ? 'checked' : ''} ${left <= 0 ? 'disabled' : ''} onchange="Registration.set('group','${g.id}');Registration.refresh()"><span><b>${E(pathway() ? FC().squadName(g.fb.birthYear) : g.name)}</b><small>${E(g.branch)} · ${E(describe(g))}${g.coach ? ' · ' + E(g.coach) : ''}</small><small>${left > 0 ? `${left} أماكن متاحة` : 'مكتمل · قائمة انتظار'}</small></span></label>`; };
    const positions = Object.entries(FC()?.POSITIONS || {});
    return `${!edition() && sports.length > 1 ? field('الرياضة', `<div class="rg-sports">${sports.map(s => `<button type="button" class="${s.id === R.sport ? 'on' : ''}" onclick="Registration.pickSport('${s.id}')"><span>${E(s.ico)}</span>${E(s.name)}</button>`).join('')}</div>`) : ''}
      ${hasPathway ? field('المسار', `<div class="rg-choices">${choice('rg-track', 'pathway', R.fb.track, 'مسار الاحتراف', 'فريق المرحلة السنية بسنة الميلاد · تقييم وخطة تطوير · منحة أو اشتراك', "Registration.track('pathway')")}${choice('rg-track', 'school', R.fb.track, 'مدرسة الكرة', 'تدريب بالاشتراك في مجموعة حسب السن والميعاد', "Registration.track('school')")}</div>`) : ''}
      ${d && (!football() || R.fb.track) ? `
        ${field(unit, `<div class="rg-groups">${groups.map(groupCard).join('') || `<p class="rg-note">${pathway() ? `مفيش فريق لمواليد ${birthYear() || '—'} في المسار. أنشئ الفريق من صفحة الفرق الأول.` : `مفيش ${unit} مناسبة لسن ${a ?? '—'}${a == null ? '؛ ارجع حدد تاريخ الميلاد' : ''}.`}</p>`}</div>`, pathway() ? 'الفريق بيتحدد بسنة الميلاد زي قيد الاتحاد' : a != null ? `معروض بس اللي يناسب سن ${a} سنة` : '')}
        ${football() ? `<div class="rg-row rg-row-top">${field('المركز', `<div class="rg-positions">${positions.map(([k, p]) => `<label><input type="radio" name="rg-pos" value="${k}" ${R.fb.position === k ? 'checked' : ''} onchange="Registration.set('fb.position','${k}')"><span>${E(p.short)}</span></label>`).join('')}${pathway() ? '' : `<label><input type="radio" name="rg-pos" value="" ${!R.fb.position ? 'checked' : ''} onchange="Registration.set('fb.position','')"><span>لسه</span></label>`}</div>`)}
          ${field('القدم المفضلة', `<div class="rg-seg">${['يمين', 'شمال', 'الاتنين'].map(f => `<label><input type="radio" name="rg-foot" ${R.fb.foot === f ? 'checked' : ''} onchange="Registration.set('fb.foot','${f}')"><span>${f}</span></label>`).join('')}</div>`)}</div>` : ''}
        ${pathway() ? field('التمويل', `<div class="rg-seg">${FC().FUNDING.map(f => `<label><input type="radio" name="rg-fund" ${R.fb.funding === f ? 'checked' : ''} onchange="Registration.set('fb.funding','${f}');Registration.refresh()"><span>${f}</span></label>`).join('')}</div>${R.fb.funding === 'منحة جزئية' ? `<span class="rg-inline-num">نسبة المنحة <input type="number" min="1" max="99" value="${E(R.fb.partial)}" oninput="Registration.set('fb.partial',this.value)">%</span>` : ''}`) : ''}
        ${programs.length > 1 && !pathway() ? field('البرنامج', `<div class="rg-choices">${programs.map(p => `<label class="rg-choice ${R.programId === p.id ? 'on' : ''}"><input type="radio" name="rg-program" ${R.programId === p.id ? 'checked' : ''} onchange="Registration.set('programId','${p.id}');Registration.refresh()"><span><b>${E(p.name)}</b><small>${p.sessions} حصة شهريًا · ${money(p.price)}</small></span></label>`).join('')}</div>`) : ''}
        ${!programs.length ? `<p class="rg-note warn">مفيش برنامج أسعار لسن ${a ?? '—'} في ${E(d.name)}؛ أضفه من إعدادات الرياضة.</p>` : ''}
        ${!pathway() && d.levels.some(l => l.active) ? field('المستوى عند البداية', `<select onchange="Registration.set('levelId',this.value)"><option value="">يحدد بعد أول تقييم</option>${d.levels.filter(l => l.active).map(l => `<option value="${l.id}" ${R.levelId === l.id ? 'selected' : ''}>${E(l.name)}</option>`).join('')}</select>`) : ''}` : d ? '' : '<p class="rg-note">اختر الرياضة لعرض البرامج والجروبات.</p>'}`;
  }

  function stepReview() {
    const g = groupRow(), d = def(), p = program(), fam = familyFound(), pos = football() && R.fb.position ? FC().POSITIONS[R.fb.position].name : '';
    const rows = [
      ['اللاعب', `${R.player.name}${age() != null ? ' · ' + age() + ' سنة' : ''}${R.player.gender ? ' · ' + (R.player.gender === 'm' ? 'ذكر' : 'أنثى') : ''} · ${R.player.nationality || 'مصري'}${R.player.photo ? ' · 📷' : ''}`],
      [R.mode === 'child' ? 'ولي الأمر' : 'الموبايل', R.mode === 'child' ? `${fam ? fam.name : R.family.name} · ${R.family.phone}${fam ? ' (عائلة مسجلة)' : ''}` : R.player.phone],
      ...(football() ? [['المسار', FC().TRACKS[R.fb.track]], ['المركز', `${pos || 'يتحدد مع المدرب'} · القدم ${R.fb.foot}`]] : [['البرنامج', `${d.name} · ${p.name}`]]),
      [pathway() ? 'الفريق' : football() ? 'المجموعة' : 'الجروب', `${pathway() ? FC().squadName(g.fb.birthYear) : g.name} · ${g.branch}`], ['المواعيد', describe(g) + (g.coach ? ' · ' + g.coach : '')],
      ...(!pathway() && R.levelId ? [['المستوى', d.levels.find(l => l.id === R.levelId)?.name]] : [])
    ];
    return `<dl class="rg-review">${rows.map(([k, v]) => `<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
      <div class="rg-bill"><div><span>${E(p.name)} · ${p.sessions} حصة شهريًا</span><b>${money(p.price)}</b></div>${discount() ? `<div class="ok"><span>${E(discountName())}</span><b>− ${money(p.price - total())}</b></div>` : ''}<div class="total"><span>${total() ? 'هيتسجل مستحق على الحساب' : 'مفيش مبلغ مطلوب'}</span><b>${money(total())}</b></div></div>
      <p class="rg-note">التسجيل مش بياخد فلوس. ${total() ? 'الاشتراك بيتفعل لما الاستقبال يحصّل المبلغ من صفحة التحصيل، أو من زرار «تحصيل الآن» بعد التسجيل.' : 'الاشتراك بيتفعل على طول.'}</p>
      ${d.registration.medical ? `<label class="rg-check"><input type="checkbox" ${R.medicalReceived ? 'checked' : ''} onchange="Registration.set('medicalReceived',this.checked)"> استلمنا الشهادة الطبية</label>` : ''}
      ${R.mode === 'child' && d.registration.consent ? `<label class="rg-check"><input type="checkbox" ${R.consent ? 'checked' : ''} onchange="Registration.set('consent',this.checked)"> ولي الأمر وافق على شروط الأكاديمية والتصوير والإسعافات الأولية</label>` : ''}
      ${R.player.medical ? `<p class="rg-note warn">ملاحظة صحية: ${E(R.player.medical)}</p>` : ''}`;
  }

  function doneView() {
    const m = db.member(R.done.memberId), fam = F.of(m);
    return `<div class="rg-done"><span aria-hidden="true">✓</span><h3>اتسجل ${E(m.name)}</h3><p>${E(db.state.groups.find(g => g.id === m.group)?.name)} · ${E(describe(db.state.groups.find(g => g.id === m.group)))}</p>
      ${R.done.due ? `<p class="rg-note">مستحق ${money(R.done.due)} على الحساب.</p>` : ''}
      <div class="rg-actions">${R.done.invoiceId && R.done.due ? `<button type="button" class="rg-btn" onclick="Registration.collect()">تحصيل الآن</button>` : ''}${R.done.pathway && window.FootballUI && typeof PAGES !== 'undefined' ? `<button type="button" class="rg-btn" onclick="V.close();FootballUI.openPlayer('${R.done.memberId}')">ملف التطوير</button>` : ''}${fam ? `<button type="button" class="rg-btn" onclick="Registration.sibling()">تسجيل أخ أو أخت</button>` : ''}<button type="button" class="rg-btn primary" onclick="Registration.finish()">تم</button></div></div>`;
  }

  const stepName = i => i === 2 && football() ? 'المسار والفريق' : STEPS[i];
  function view() {
    if (R.done) return doneView();
    const body = [stepFamily, stepPlayer, stepProgram, stepReview][R.step]();
    return `<div class="rg-head"><small>تسجيل لاعب جديد</small><h2>${E(stepName(R.step))}</h2><ol class="rg-steps">${STEPS.map((s, i) => `<li class="${i < R.step ? 'done' : i === R.step ? 'on' : ''}"><span>${i + 1}</span>${E(stepName(i))}</li>`).join('')}</ol></div>
      <div class="rg-body">${body}</div>
      <div id="rg-error" class="rg-error" role="alert" ${R.error ? '' : 'hidden'}>${E(R.error)}</div>
      <div class="rg-actions">${R.step > 0 ? '<button type="button" class="rg-btn" onclick="Registration.back()">رجوع</button>' : ''}<button type="button" class="rg-btn primary" onclick="Registration.next()">${R.step === STEPS.length - 1 ? 'تأكيد التسجيل' : 'التالي'}</button></div>`;
  }

  /* ---------- validation per step ---------- */
  function check() {
    const fail = m => { throw Error(m); };
    if (R.step === 0) {
      if (R.mode === 'child') { if (!F.MOBILE.test(R.family.phone)) fail('اكتب موبايل ولي الأمر (11 رقم يبدأ بـ 01)'); if (!familyFound() && !R.family.name.trim()) fail('اكتب اسم ولي الأمر'); }
      else { if (!R.player.name.trim()) fail('اكتب اسم اللاعب'); if (!F.MOBILE.test(R.player.phone)) fail('اكتب موبايل اللاعب صحيح'); if (db.state.members.some(m => m.phone === R.player.phone)) fail('الرقم مسجل للاعب آخر؛ ابحث عنه من قائمة اللاعبين'); }
    }
    if (R.step === 1) {
      if (!R.player.name.trim()) fail('اكتب اسم اللاعب');
      if (!R.player.dob) fail('اختر تاريخ الميلاد');
      const a = age(); if (a == null || a < 2 || a > 90) fail('تاريخ الميلاد غير منطقي');
      if (R.mode === 'adult' || !R.player.emergencySame) { if (!R.player.emergencyName.trim() || !F.MOBILE.test(R.player.emergencyPhone)) fail('اكتب اسم ورقم جهة الطوارئ'); }
      const fam = familyFound(); if (fam && F.members(fam.id).some(m => m.name.trim() === R.player.name.trim())) fail('الاسم مسجل بالفعل في نفس العائلة');
    }
    if (R.step === 2) {
      if (!def()) fail('اختر الرياضة');
      if (football() && !R.fb.track) fail('اختار المسار: مسار الاحتراف أو مدرسة الكرة');
      const g = groupRow(); if (!g) fail(pathway() ? 'مفيش فريق لسنة ميلاد اللاعب في المسار' : 'اختر ' + (football() ? 'المجموعة' : 'الجروب'));
      if (seatsLeft(g) <= 0) fail('مكتمل؛ اختر غيره أو سجّل في قائمة الانتظار');
      if (pathway() && !R.fb.position) fail('اختار مركز اللاعب');
      if (pathway() && R.fb.funding === 'منحة جزئية') { const v = Number(R.fb.partial); if (!Number.isInteger(v) || v < 1 || v > 99) fail('نسبة المنحة الجزئية من 1 لـ 99%'); }
      if (!program()) fail('مفيش برنامج أسعار مناسب لسن اللاعب');
    }
    if (R.step === 3) {
      if (R.mode === 'child' && def().registration.consent && !R.consent) fail('موافقة ولي الأمر مطلوبة للتسجيل');
    }
  }

  function commit() {
    const d = def(), p = program(), g = groupRow();
    let familyId = '', fam = familyFound();
    db.update(st => {
      const meta = { at: new Date().toISOString(), newId: db.id };
      if (R.mode === 'child') familyId = FamilyCore.ensure(st, fam || R.family, meta).id;
      else familyId = FamilyCore.ensure(st, { name: R.player.name, phone: R.player.phone, relation: 'نفسه' }, meta).id;
    });
    fam = F.get(familyId);
    const disc = pathway() ? discount() : (sibling() || (R.mode === 'child' ? F.discountFor(familyId) : 0));
    const emergency = R.mode === 'child' && R.player.emergencySame ? { name: fam.name, phone: fam.phone } : { name: R.player.emergencyName.trim(), phone: R.player.emergencyPhone };
    const m = db.addMember({ name: R.player.name, phone: R.mode === 'adult' ? R.player.phone : '', group: g.id, guardian: R.mode === 'child' ? { name: fam.name, phone: fam.phone, relation: fam.relation } : null, dob: R.player.dob, gender: R.player.gender, medical: R.player.medical, emergency, familyId, programId: p.id, consent: R.consent, source: R.leadId ? 'عميل محتمل' : 'الاستقبال', ...(football() ? { fb: { track: R.fb.track, position: R.fb.position, foot: R.fb.foot, ...(pathway() ? { funding: R.fb.funding === 'منحة جزئية' ? `منحة جزئية` : R.fb.funding, scholarship: discount(), number: '', registration: '', joined: db.day(new Date()) } : {}) } } : {}) });
    db.update(st => { const x = st.members.find(y => y.id === m.id); if (x) { x.nationality = R.player.nationality || 'مصري'; if (R.player.photo) x.photo = R.player.photo; } });
    if (R.levelId && !pathway()) window.Progress?.promote(m.id, R.levelId, 'تقييم البداية عند التسجيل', 'الاستقبال');
    const inv = db.bill(m.id, { label: `${d.name} · ${p.name}`, price: p.price, sessions: p.sessions, days: 30, programId: p.id }, disc, discountName());
    if (d.registration.medical && !R.medicalReceived) db.update(st => st.followups.unshift({ id: db.id('task'), memberId: m.id, kind: 'medical', owner: 'الاستقبال', due: db.day(new Date()), status: 'open', note: 'استلام الشهادة الطبية قبل أول حصة', created: new Date().toISOString() }));
    if (R.scoutId) db.update(st => { const c = window.FootballCore.candidate(st, R.scoutId); if (c && c.stage === 'offer') { c.memberId = m.id; window.FootballCore.move(st, c.id, 'joined', { squadId: g.id }); } });
    if (R.leadId) { try { db.moveLead(R.leadId, 'won', 'اتسجل ' + m.name + ' في ' + g.name); } catch (e) { /* the lead stays open if it cannot be closed */ } }
    return { memberId: m.id, invoiceId: inv.id, due: inv.total - inv.paid, pathway: pathway() };
  }

  /* ---------- actions ---------- */
  const paint = () => { const root = document.getElementById('rg-root'); if (root) root.innerHTML = view(); };
  const G = window.Registration = {
    markup(leadId = '') { fresh(leadId); return `<div id="rg-root" class="rg">${view()}</div>`; },
    inline() { if (!R || R.done === 'closed') fresh(); return `<div id="rg-root" class="rg rg-inline">${view()}</div>`; },
    open(leadId = '') { V.open(G.markup(leadId)); },
    /* The player's photo, shrunk to a small square so it fits the saved record. */
    photo(inp) { const f = inp.files && inp.files[0]; if (!f) return; if (!/^image\//.test(f.type)) { R.error = 'اختار صورة'; return paint(); } const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'), n = 240, k = Math.min(img.width, img.height); c.width = c.height = n; c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, n, n); R.player.photo = c.toDataURL('image/jpeg', 0.82); paint(); }; img.src = r.result; }; r.readAsDataURL(f); },
    /* A trial candidate who accepted the offer: registration opens filled from the trial. */
    scout(cid) {
      const c = window.FootballCore?.candidate(db.state, cid); if (!c) return;
      fresh();
      Object.assign(R, { scoutId: c.id, sport: 'football', branch: c.branch || '' });
      Object.assign(R.family, { name: c.guardian || '', phone: c.phone || '' });
      Object.assign(R.player, { name: c.name, dob: c.dob });
      Object.assign(R.fb, { track: 'pathway', position: c.position, foot: c.foot || 'يمين', funding: c.offer?.funding || 'اشتراك', partial: c.offer?.pct || 50 });
      V.open(`<div id="rg-root" class="rg">${view()}</div>`);
    },
    set(path, value) { const [a, b] = path.split('.'); if (b) R[a][b] = value; else R[a] = value; R.error = ''; const box = document.getElementById('rg-error'); if (box) box.hidden = true; },
    refresh: paint,
    mode(m) { R.mode = m; if (m === 'adult' && !R.player.name && R.family.name) { R.player.name = R.family.name; R.player.phone = R.family.phone; } paint(); },
    pickSport(id) { R.sport = id; R.programId = ''; R.group = ''; R.levelId = ''; R.fb.track = ''; paint(); },
    track(t) { R.fb.track = t; R.group = ''; if (t === 'school' && R.fb.funding !== 'اشتراك') R.fb.funding = 'اشتراك'; paint(); },
    collect() { const id = R.done.invoiceId; R.done = 'closed'; if (V.settleForm && typeof PAGES !== 'undefined') { V.close(); V.settleForm(id); } else if (typeof go === 'function') { fresh(); go('collect'); } },
    next() {
      try {
        check();
        if (R.step === STEPS.length - 1) { R.done = commit(); if (typeof render === 'function' && document.getElementById('content')) render(); if (typeof draw === 'function' && document.getElementById('view') && !document.getElementById('rg-root')?.closest('.ma-body')) draw(); }
        else R.step++;
      } catch (e) { R.error = e.message; }
      paint();
      document.getElementById('rg-root')?.scrollIntoView({ block: 'start' });
    },
    back() { R.step = Math.max(0, R.step - 1); R.error = ''; paint(); },
    sibling() { const keep = { mode: 'child', family: { ...R.family, phone: F.of(db.member(R.done.memberId))?.phone || R.family.phone } }; fresh('', keep); paint(); },
    finish() { R.done = 'closed'; if (document.getElementById('rg-root')?.classList.contains('rg-inline')) { fresh(); if (typeof go === 'function') go('home'); } else V.close(); }
  };

  /* Every older entry point now opens this flow. */
  V.newMemberForm = (leadId = '') => G.markup(leadId);
  if (typeof APPS !== 'undefined' && APPS.manager) { APPS.manager.F.newm = () => `<div class="ma-body">${G.inline()}</div>`; }

  /* ---------- adding players: one by one, from Excel, or by a link the parents fill ---------- */
  const ICONS = { one: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6', xls: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 12l6 6M15 12l-6 6', card: 'M3 5h18v14H3zM7 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0M6 16c.7-1.5 2-2 3-2s2.3.5 3 2M14 9h4M14 13h4' };
  const ico = k => `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[k]}"/></svg>`;
  G.addPlayers = () => V.open(G.addMarkup());
  G.addMarkup = () => (`<div class="rg-add" data-no-fit><h3>إضافة لاعبين</h3><p class="rg-note">ضيف اللاعبين مرة واحدة، وبعدها كل حاجة (الجدول، الرسائل، الفواتير، التقييم) بتترتبط بيهم تلقائي.</p>
    <div class="rg-add-grid">${[['one', 'لاعب واحد', 'لو هتضيف لاعب أو اتنين: خطوات قصيرة وبعدها الفريق أو المجموعة', 'إضافة يدوي', 'V.close();Registration.open()'], ['xls', 'استيراد من Excel', 'لو عندك قايمة لاعبين: ارفع الملف، راجع، واختار الفرق', 'استيراد', 'Registration.importForm()'], ['card', 'رابط التسجيل', 'ولي الأمر يسجّل ابنه بنفسه ويوافق على الشروط', 'جهّز الرابط', 'Registration.applyLink()']].map(([k, t, d, b, js]) => `<div class="rg-add-card"><b>${t}</b><span>${ico(k)}</span><p>${d}</p><button type="button" class="rg-btn primary" onclick="${js}">${b}</button></div>`).join('')}</div></div>`);
  /* «إضافة لاعب» everywhere opens the three ways; a lead being converted goes straight to the form. */
  V.newMemberForm = (leadId = '') => leadId ? G.markup(leadId) : G.addMarkup();

  /* Import: a CSV saved from Excel or rows pasted straight from it. */
  const COLS = [['name', 'الاسم'], ['dob', 'تاريخ الميلاد'], ['guardian', 'ولي الأمر'], ['phone', 'موبايل ولي الأمر'], ['position', 'المركز'], ['nationality', 'الجنسية']];
  let IMP = null;
  G.template = () => { const rows = [COLS.map(c => c[1]).join(','), 'يوسف أحمد علي,2015-03-14,أحمد علي,01012345678,ST,مصري', 'عمر خالد حسن,2013-09-02,خالد حسن,01198765432,CB,مصري']; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'لاعبين.csv'; a.click(); };
  const POS = () => window.FootballCore ? Object.entries(FootballCore.POSITIONS) : [];
  const posOf = v => { v = String(v || '').trim(); const p = POS().find(([k, x]) => k.toLowerCase() === v.toLowerCase() || x.name === v || x.short === v); return p ? p[0] : ''; };
  const dateOf = v => { v = String(v || '').trim(); let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`; m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
  G.parse = text => {
    const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    const head = lines[0].split(sep).map(h => h.trim()), hasHead = head.some(h => COLS.some(c => c[1] === h || c[0] === h.toLowerCase()));
    const idx = COLS.map(([k, l], i) => { const j = head.findIndex(h => h === l || h.toLowerCase() === k); return hasHead ? j : i; });
    return lines.slice(hasHead ? 1 : 0).map(l => { const c = l.split(sep).map(x => x.trim()); const r = Object.fromEntries(COLS.map(([k], i) => [k, idx[i] >= 0 ? c[idx[i]] || '' : ''])); r.dob = dateOf(r.dob); r.position = posOf(r.position); r.nationality = r.nationality || 'مصري';
      r.errors = [r.name.split(/\s+/).length < 2 && 'الاسم ثنائي', !r.dob && 'تاريخ الميلاد', !/^01[0125]\d{8}$/.test(r.phone) && 'الموبايل', db.state.members.some(m => m.name === r.name && m.dob === r.dob) && 'مسجل قبل كده'].filter(Boolean); return r; });
  };
  G.importForm = () => { IMP = { rows: [], mode: 'auto', group: '' }; V.open(`<div class="ma-form fb-form" id="rg-imp"><h3>استيراد لاعبين من Excel</h3><p class="py-help">احفظ الشيت كـ CSV وارفعه، أو انسخ الصفوف من Excel والصقها هنا. الأعمدة: ${COLS.map(c => c[1]).join('، ')}.</p>
    <label>ملف CSV<input type="file" accept=".csv,.txt,text/csv" onchange="Registration.readFile(this)"></label>
    <label>أو الصق الصفوف<textarea id="rg-paste" rows="5" placeholder="${E(COLS.map(c => c[1]).join('\t'))}"></textarea></label>
    <div class="rg-actions"><button type="button" class="rg-btn" onclick="Registration.template()">تنزيل نموذج</button><button type="button" class="rg-btn primary" onclick="Registration.preview(document.getElementById('rg-paste').value)">مراجعة ←</button></div></div>`); };
  G.readFile = inp => { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { document.getElementById('rg-paste').value = String(r.result).replace(/^﻿/, ''); }; r.readAsText(f, 'utf-8'); };
  const squadFor = r => window.FootballCore ? FootballCore.squads(db.state).find(g => g.fb.birthYear === Number(r.dob.slice(0, 4))) : null;
  const targetOf = r => IMP.mode === 'auto' ? squadFor(r) : db.state.groups.find(g => g.id === IMP.group);
  /* Step 2 comes on its own: where the new players go. */
  G.preview = text => { IMP.rows = G.parse(text); if (!IMP.rows.length) return toast('مفيش صفوف'); G.groupsStep(); };
  G.groupsStep = () => {
    const ok = IMP.rows.filter(r => !r.errors.length), bad = IMP.rows.length - ok.length, sport = window.Edition?.sport || 'football';
    const school = db.state.groups.filter(g => g.sport === sport && !(window.FootballCore?.isSquad(g)));
    V.open(`<div class="ma-form fb-form"><h3>اختار الفريق أو المجموعة</h3><p class="py-help">${ok.length} لاعب جاهز${bad ? ` · ${bad} صفوف فيها مشاكل هتتشال` : ''}. بعد الاستيراد كل لاعب بيظهر في جدول فريقه ورسايله وفواتيره.</p>
      <label>يدخلوا فين؟<select onchange="Registration.impMode(this.value)"><option value="auto" ${IMP.mode === 'auto' ? 'selected' : ''}>فرق مسار الاحتراف حسب سنة الميلاد</option>${school.map(g => `<option value="${g.id}" ${IMP.mode === 'group' && IMP.group === g.id ? 'selected' : ''}>${E(g.name)}</option>`).join('')}</select></label>
      <div class="v-table"><table class="fb-report-table"><thead><tr><th>اللاعب</th><th>الميلاد</th><th>ولي الأمر</th><th>يدخل</th><th></th></tr></thead><tbody>${IMP.rows.map(r => { const g = !r.errors.length && targetOf(r); return `<tr><td><b>${E(r.name)}</b>${r.position ? ` <small>${E(window.FootballCore?.POSITIONS[r.position]?.short || '')}</small>` : ''}</td><td>${E(r.dob || '—')}</td><td>${E(r.guardian || '')} <bdi>${E(r.phone)}</bdi></td><td>${g ? E(window.FootballCore?.isSquad(g) ? FootballCore.squadName(g.fb.birthYear) : g.name) : r.errors.length ? '' : '<span class="fb-alert">مفيش فريق لسنته</span>'}</td><td>${r.errors.length ? `<span class="fb-alert">${E(r.errors.join('، '))}</span>` : '✓'}</td></tr>`; }).join('')}</tbody></table></div>
      <button type="button" class="sb-btn primary ax-btn" onclick="Registration.runImport()">استيراد ${ok.filter(r => targetOf(r)).length} لاعب</button></div>`);
  };
  G.impMode = v => { if (v === 'auto') IMP.mode = 'auto'; else { IMP.mode = 'group'; IMP.group = v; } G.groupsStep(); };
  G.runImport = () => V.run(() => {
    const rows = IMP.rows.filter(r => !r.errors.length && targetOf(r)); if (!rows.length) throw Error('مفيش لاعبين ينفع يتسجلوا');
    rows.forEach(r => { const g = targetOf(r), m = db.addMember({ name: r.name, phone: '', group: g.id, guardian: { name: r.guardian || 'ولي الأمر', phone: r.phone, relation: 'ولي الأمر' }, dob: r.dob, source: 'استيراد Excel', ...(g.sport === 'football' ? { fb: { track: window.FootballCore?.isSquad(g) ? 'pathway' : 'school', position: r.position, foot: 'يمين', ...(window.FootballCore?.isSquad(g) ? { funding: 'اشتراك' } : {}) } } : {}) }); db.update(st => { const x = st.members.find(y => y.id === m.id); if (x) x.nationality = r.nationality; }); });
    V.close(); if (typeof render === 'function') render(); toast(`اتسجل ${rows.length} لاعب واتوزعوا على فرقهم`);
  });

  /* A link and a QR code for the parents; the apps open registration when it is followed. */
  G.applyLink = () => {
    const base = location.href.replace(/[^/]*$/, ''), url = `${base}apps.html?${window.Edition?.single ? 'edition=' + Edition.sport + '&' : ''}apply=1`;
    let qr = ''; if (typeof qrcode === 'function') { const q = qrcode(0, 'M'); q.addData(url); q.make(); const n = q.getModuleCount(), t = n + 6; let d = ''; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + 3} ${y + 3}h1v1h-1z`; qr = `<svg width="170" height="170" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img" aria-label="كود رابط التسجيل"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#13261d"/></svg>`; }
    V.open(`<div class="ma-form fb-form rg-apply"><h3>رابط التسجيل لأولياء الأمور</h3><p class="py-help">ولي الأمر يفتح الرابط أو يصوّر الكود، يسجّل بيانات ابنه، يختار المسار والفريق، ويوافق على الشروط. التسجيل بيوصلك في اللاعبين والفاتورة بتتعمل لوحدها.</p>
      <div class="rg-apply-qr">${qr}</div><label>الرابط<input readonly value="${E(url)}" onclick="this.select()"></label>
      <div class="rg-actions"><button type="button" class="rg-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${E(url)}');toast('اتنسخ الرابط')">نسخ الرابط</button><a class="rg-btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('سجّل ابنك في الأكاديمية من هنا: ' + url)}">مشاركة واتساب</a></div></div>`);
  };
  if (typeof APPS !== 'undefined' && new URLSearchParams(location.search).get('apply') === '1') setTimeout(() => V.open(G.markup()), 400);

  /* A player's photo replaces the drawn portrait wherever the name is shown. */
  if (window.KoraAvatars?.portrait) { const portrait = KoraAvatars.portrait; KoraAvatars.portrait = function (name) { const m = db.state.members.find(x => x.name === name && x.photo); return m ? `<img class="rg-portrait" src="${m.photo}" alt="${E(name)}">` : portrait.apply(this, arguments); }; }
})();

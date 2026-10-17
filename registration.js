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
      player: { name: '', dob: '', gender: '', medical: '', phone: '', emergencySame: true, emergencyName: '', emergencyPhone: '' },
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
    return `${R.mode === 'child' ? field('اسم الطفل', input('player.name', R.player.name)) : `<p class="rg-note">${E(R.player.name)} · <bdi>${E(R.player.phone)}</bdi></p>`}
      <div class="rg-row rg-row-top">${field('تاريخ الميلاد', `<input type="date" value="${E(R.player.dob)}" max="${db.day(new Date())}" onchange="Registration.set('player.dob',this.value);Registration.set('group','');Registration.refresh()">`, a != null ? `السن ${a} سنة${football() && birthYear() ? ' · ' + FC().squadName(birthYear()) : ''}` : 'بيحدد البرامج والجروبات المناسبة')}
      ${field('النوع', `<div class="rg-seg">${[['m', 'ذكر'], ['f', 'أنثى']].map(([v, l]) => `<label><input type="radio" name="rg-gender" value="${v}" ${R.player.gender === v ? 'checked' : ''} onchange="Registration.set('player.gender','${v}')"><span>${l}</span></label>`).join('')}</div>`, '\u00a0')}</div>
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
      ['اللاعب', `${R.player.name}${age() != null ? ' · ' + age() + ' سنة' : ''}${R.player.gender ? ' · ' + (R.player.gender === 'm' ? 'ذكر' : 'أنثى') : ''}`],
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
    if (R.levelId && !pathway()) window.Progress?.promote(m.id, R.levelId, 'تقييم البداية عند التسجيل', 'الاستقبال');
    const inv = db.bill(m.id, { label: `${d.name} · ${p.name}`, price: p.price, sessions: p.sessions, days: 30, programId: p.id }, disc, discountName());
    if (d.registration.medical && !R.medicalReceived) db.update(st => st.followups.unshift({ id: db.id('task'), memberId: m.id, kind: 'medical', owner: 'الاستقبال', due: db.day(new Date()), status: 'open', note: 'استلام الشهادة الطبية قبل أول حصة', created: new Date().toISOString() }));
    if (R.leadId) { try { db.moveLead(R.leadId, 'won', 'اتسجل ' + m.name + ' في ' + g.name); } catch (e) { /* the lead stays open if it cannot be closed */ } }
    return { memberId: m.id, invoiceId: inv.id, due: inv.total - inv.paid, pathway: pathway() };
  }

  /* ---------- actions ---------- */
  const paint = () => { const root = document.getElementById('rg-root'); if (root) root.innerHTML = view(); };
  const G = window.Registration = {
    markup(leadId = '') { fresh(leadId); return `<div id="rg-root" class="rg">${view()}</div>`; },
    inline() { if (!R || R.done === 'closed') fresh(); return `<div id="rg-root" class="rg rg-inline">${view()}</div>`; },
    open(leadId = '') { V.open(G.markup(leadId)); },
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
})();

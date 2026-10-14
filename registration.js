/* One registration flow for the dashboard and the branch manager app:
   guardian (or adult player) → player → program and group → payment → review.
   It links children to a family, suggests the program that fits the player's age,
   shows each group's schedule and free seats, applies the sibling discount and
   records the first payment against the program price. */
(function () {
  'use strict';
  if (!window.V || !window.Family || !window.SportEngine) return;
  const db = V.db, SE = window.SportEngine, F = window.Family;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => new Intl.NumberFormat('en-US').format(Math.round(n)) + ' ج';
  const STEPS = ['ولي الأمر', 'اللاعب', 'البرنامج', 'الدفع', 'المراجعة'];
  const METHODS = ['كاش', 'إنستاباي', 'فودافون كاش'];
  const describe = g => window.ScheduleCore ? ScheduleCore.describe(g) : '';

  let R = null;
  const fresh = (leadId = '', keepFamily = null) => {
    const lead = leadId ? db.state.leads.find(l => l.id === leadId) : null;
    R = {
      step: 0, mode: keepFamily?.mode || 'child', leadId: lead?.id || '', error: '', done: null,
      family: keepFamily ? { ...keepFamily.family } : { phone: lead?.phone || '', name: lead?.name || '', relation: 'الأب' },
      player: { name: '', dob: '', gender: '', medical: '', phone: '', emergencySame: true, emergencyName: '', emergencyPhone: '' },
      sport: '', programId: '', branch: '', group: '', levelId: '',
      pay: { method: 'كاش', reference: '', paid: '' }, consent: false, medicalReceived: false
    };
  };

  const def = () => SE.get(R.sport);
  const age = () => F.age(R.player.dob);
  const familyFound = () => R.mode === 'child' && F.MOBILE.test(R.family.phone) ? F.byPhone(R.family.phone) : null;
  const program = () => def()?.programs.find(p => p.id === R.programId) || null;
  const groupRow = () => db.state.groups.find(g => g.id === R.group) || null;
  const seatsLeft = g => g.capacity - db.state.members.filter(m => m.group === g.id).length;
  const discount = () => { const fam = R.mode === 'child' ? familyFound() : null; return fam ? F.discountFor(fam.id) : 0; };
  const total = () => { const p = program(); return p ? Math.round(p.price * (1 - discount() / 100)) : 0; };

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
      <div class="rg-row">${field('تاريخ الميلاد', `<input type="date" value="${E(R.player.dob)}" max="${db.day(new Date())}" onchange="Registration.set('player.dob',this.value);Registration.refresh()">`, a != null ? `السن ${a} سنة` : 'مطلوب لاقتراح البرنامج المناسب')}
      ${field('النوع', `<select onchange="Registration.set('player.gender',this.value)"><option value="">اختر</option><option value="m" ${R.player.gender === 'm' ? 'selected' : ''}>ذكر</option><option value="f" ${R.player.gender === 'f' ? 'selected' : ''}>أنثى</option></select>`)}</div>
      ${field('ملاحظات صحية', `<textarea rows="2" oninput="Registration.set('player.medical',this.value)" placeholder="حساسية، ربو، إصابة سابقة… اتركها فاضية لو لا يوجد">${E(R.player.medical)}</textarea>`, 'تظهر للمدرب في كشف الحضور')}
      ${R.mode === 'child' ? `<label class="rg-check"><input type="checkbox" ${R.player.emergencySame ? 'checked' : ''} onchange="Registration.set('player.emergencySame',this.checked);Registration.refresh()"> جهة الطوارئ هي ولي الأمر</label>` : ''}
      ${R.mode === 'adult' || !R.player.emergencySame ? `<div class="rg-row">${field('اسم جهة الطوارئ', input('player.emergencyName', R.player.emergencyName))}${field('موبايل الطوارئ', input('player.emergencyPhone', R.player.emergencyPhone, 'inputmode="tel" maxlength="11"'))}</div>` : ''}`;
  }

  function stepProgram() {
    const sports = SE.list().filter(d => d.on !== false && db.state.groups.some(g => g.sport === d.id));
    const d = def(), a = age();
    const fits = p => a == null || (a >= p.ageMin && a <= p.ageMax);
    const programs = d ? d.programs.filter(p => p.active !== false) : [];
    if (d && !R.programId) { const best = programs.find(fits); if (best) R.programId = best.id; }
    const branches = d ? [...new Set(db.state.groups.filter(g => g.sport === d.id).map(g => g.branch))] : [];
    if (d && !branches.includes(R.branch)) R.branch = branches[0] || '';
    const groups = d ? db.state.groups.filter(g => g.sport === d.id && g.branch === R.branch) : [];
    return `${field('الرياضة', `<div class="rg-sports">${sports.map(s => `<button type="button" class="${s.id === R.sport ? 'on' : ''}" onclick="Registration.pickSport('${s.id}')"><span>${E(s.ico)}</span>${E(s.name)}</button>`).join('')}</div>`)}
      ${d ? `${field('البرنامج', `<div class="rg-choices">${programs.map(p => `<label class="rg-choice ${R.programId === p.id ? 'on' : ''} ${fits(p) ? '' : 'mismatch'}"><input type="radio" name="rg-program" ${R.programId === p.id ? 'checked' : ''} onchange="Registration.set('programId','${p.id}');Registration.refresh()"><span><b>${E(p.name)}</b><small>من ${p.ageMin} إلى ${p.ageMax} سنة · ${p.sessions} حصة شهريًا · ${money(p.price)}${fits(p) ? '' : ' · لا يناسب السن'}</small></span></label>`).join('')}</div>`)}
        ${field('الفرع', `<select onchange="Registration.set('branch',this.value);Registration.set('group','');Registration.refresh()">${branches.map(b => `<option ${b === R.branch ? 'selected' : ''}>${E(b)}</option>`).join('')}</select>`)}
        ${field('الجروب', `<div class="rg-groups">${groups.map(g => { const left = seatsLeft(g), ageOk = a == null || g.ageMin == null || (a >= g.ageMin && a <= g.ageMax);
          return `<label class="rg-group ${R.group === g.id ? 'on' : ''} ${left <= 0 ? 'full' : ''}"><input type="radio" name="rg-group" ${R.group === g.id ? 'checked' : ''} ${left <= 0 ? 'disabled' : ''} onchange="Registration.set('group','${g.id}');Registration.refresh()"><span><b>${E(g.name)}</b><small>${E(describe(g))}${g.coach ? ' · ' + E(g.coach) : ''}</small><small>${g.ageMin != null ? `من ${g.ageMin} إلى ${g.ageMax} سنة · ` : ''}${left > 0 ? `${left} أماكن متاحة` : 'مكتمل · قائمة انتظار'}${ageOk ? '' : ' · خارج الفئة العمرية'}</small></span></label>`; }).join('') || '<p class="rg-note">لا توجد جروبات لهذه الرياضة في الفرع.</p>'}</div>`)}
        ${field('المستوى عند البداية', `<select onchange="Registration.set('levelId',this.value)"><option value="">يحدد بعد أول تقييم</option>${d.levels.filter(l => l.active).map(l => `<option value="${l.id}" ${R.levelId === l.id ? 'selected' : ''}>${E(l.name)}</option>`).join('')}</select>`)}` : '<p class="rg-note">اختر الرياضة لعرض البرامج والجروبات.</p>'}`;
  }

  function stepPay() {
    const p = program(), d = def(), disc = discount();
    if (R.pay.paid === '') R.pay.paid = String(total());
    return `<div class="rg-bill"><div><span>${E(d.name)} · ${E(p.name)}</span><b>${money(p.price)}</b></div>${disc ? `<div class="ok"><span>خصم الإخوات ${disc}%</span><b>− ${money(p.price - total())}</b></div>` : ''}<div class="total"><span>المطلوب لأول شهر · ${p.sessions} حصة</span><b>${money(total())}</b></div></div>
      ${field('طريقة الدفع', `<div class="rg-methods">${METHODS.map(m => choice('rg-method', m, R.pay.method, m, '', `Registration.set('pay.method','${m}');Registration.refresh()`)).join('')}</div>`)}
      <div class="rg-row">${R.pay.method !== 'كاش' ? field('رقم عملية التحويل', input('pay.reference', R.pay.reference, 'placeholder="4 أرقام على الأقل"')) : ''}${field('المبلغ المدفوع الآن', input('pay.paid', R.pay.paid, `type="number" min="1" max="${total()}"`), 'يمكن الدفع الجزئي واستكمال الباقي لاحقًا')}</div>
      ${d.registration.medical ? `<label class="rg-check"><input type="checkbox" ${R.medicalReceived ? 'checked' : ''} onchange="Registration.set('medicalReceived',this.checked)"> استلمنا الشهادة الطبية</label><small class="rg-hint">لو لم تستلم، يتعمل تذكير للاستقبال قبل أول حصة.</small>` : ''}
      ${R.mode === 'child' && d.registration.consent ? `<label class="rg-check"><input type="checkbox" ${R.consent ? 'checked' : ''} onchange="Registration.set('consent',this.checked)"> ولي الأمر وافق على شروط الأكاديمية والتصوير والإسعافات الأولية</label>` : ''}
      ${d.registration.note ? `<p class="rg-note">${E(d.registration.note)}</p>` : ''}`;
  }

  function stepReview() {
    const g = groupRow(), d = def(), p = program(), fam = familyFound();
    const rows = [
      ['اللاعب', `${R.player.name}${age() != null ? ' · ' + age() + ' سنة' : ''}`],
      [R.mode === 'child' ? 'ولي الأمر' : 'الموبايل', R.mode === 'child' ? `${fam ? fam.name : R.family.name} · ${R.family.phone}${fam ? ' (عائلة مسجلة)' : ''}` : R.player.phone],
      ['البرنامج', `${d.name} · ${p.name}`], ['الجروب', `${g.name} · ${g.branch}`], ['المواعيد', describe(g) + (g.coach ? ' · ' + g.coach : '')],
      ['المستوى', d.levels.find(l => l.id === R.levelId)?.name || 'يحدد بعد أول تقييم'],
      ['الدفع', `${money(Number(R.pay.paid))} من ${money(total())} · ${R.pay.method}`]
    ];
    return `<dl class="rg-review">${rows.map(([k, v]) => `<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>${R.player.medical ? `<p class="rg-note warn">ملاحظة صحية: ${E(R.player.medical)}</p>` : ''}`;
  }

  function doneView() {
    const m = db.member(R.done.memberId), fam = F.of(m);
    return `<div class="rg-done"><span aria-hidden="true">✓</span><h3>اتسجل ${E(m.name)}</h3><p>${E(db.state.groups.find(g => g.id === m.group)?.name)} · ${E(describe(db.state.groups.find(g => g.id === m.group)))}</p>
      <div class="rg-actions">${R.done.txId ? `<button type="button" class="rg-btn" onclick="V.receipt('${R.done.txId}')">عرض الإيصال</button>` : ''}${fam ? `<button type="button" class="rg-btn" onclick="Registration.sibling()">تسجيل أخ أو أخت</button>` : ''}<button type="button" class="rg-btn primary" onclick="Registration.finish()">تم</button></div></div>`;
  }

  function view() {
    if (R.done) return doneView();
    const body = [stepFamily, stepPlayer, stepProgram, stepPay, stepReview][R.step]();
    return `<div class="rg-head"><small>تسجيل لاعب جديد</small><h2>${E(STEPS[R.step])}</h2><ol class="rg-steps">${STEPS.map((s, i) => `<li class="${i < R.step ? 'done' : i === R.step ? 'on' : ''}"><span>${i + 1}</span>${E(s)}</li>`).join('')}</ol></div>
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
      if (!program()) fail('اختر البرنامج');
      const g = groupRow(); if (!g) fail('اختر الجروب');
      if (seatsLeft(g) <= 0) fail('الجروب مكتمل؛ اختر جروبًا آخر');
    }
    if (R.step === 3) {
      const paid = Number(R.pay.paid);
      if (!Number.isFinite(paid) || paid <= 0 || paid > total()) fail('المبلغ المدفوع من 1 إلى ' + total());
      if (R.pay.method !== 'كاش') { if (R.pay.reference.trim().length < 4) fail('اكتب رقم عملية التحويل (4 أرقام على الأقل)'); if (db.state.transactions.some(t => t.reference === R.pay.reference.trim())) fail('رقم التحويل مسجل في عملية سابقة'); }
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
    const disc = discount() || (R.mode === 'child' ? F.discountFor(familyId) : 0);
    const emergency = R.mode === 'child' && R.player.emergencySame ? { name: fam.name, phone: fam.phone } : { name: R.player.emergencyName.trim(), phone: R.player.emergencyPhone };
    const m = db.addMember({ name: R.player.name, phone: R.mode === 'adult' ? R.player.phone : '', group: g.id, guardian: R.mode === 'child' ? { name: fam.name, phone: fam.phone, relation: fam.relation } : null, dob: R.player.dob, gender: R.player.gender, medical: R.player.medical, emergency, familyId, programId: p.id, consent: R.consent, source: R.leadId ? 'عميل محتمل' : 'الاستقبال' });
    if (R.levelId) window.Progress?.promote(m.id, R.levelId, 'تقييم البداية عند التسجيل', 'الاستقبال');
    const tx = db.pay(m.id, 'monthly', R.pay.method, R.pay.reference.trim(), disc, Number(R.pay.paid), { label: `${d.name} · ${p.name}`, price: p.price, sessions: p.sessions, days: 30, programId: p.id });
    if (d.registration.medical && !R.medicalReceived) db.update(st => st.followups.unshift({ id: db.id('task'), memberId: m.id, kind: 'medical', owner: 'الاستقبال', due: db.day(new Date()), status: 'open', note: 'استلام الشهادة الطبية قبل أول حصة', created: new Date().toISOString() }));
    if (R.leadId) { try { db.moveLead(R.leadId, 'won', 'اتسجل ' + m.name + ' في ' + g.name); } catch (e) { /* the lead stays open if it cannot be closed */ } }
    return { memberId: m.id, txId: tx?.id || '' };
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
    pickSport(id) { R.sport = id; R.programId = ''; R.group = ''; R.levelId = ''; R.pay.paid = ''; paint(); },
    next() {
      try {
        check();
        if (R.step === STEPS.length - 1) { R.done = commit(); if (typeof render === 'function' && document.getElementById('content')) render(); if (typeof draw === 'function' && document.getElementById('view') && !document.getElementById('rg-root')?.closest('.ma-body')) draw(); }
        else { R.step++; if (R.step === 3) R.pay.paid = ''; }
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

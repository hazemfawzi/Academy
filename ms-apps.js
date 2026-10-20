/* Multi-sport layer for the mobile apps (member / coach / manager).
   Loads after every other app script and adds screens through APPS[role].F / sub / list. */
(function () {
  'use strict';
  if (typeof APPS === 'undefined' || !window.MS) return;
  const M = window.MS;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const btn = (t, a, c = '') => `<button class="btn ${c}" onclick="${a}">${t}</button>`;
  const BELT = ['#f4f4f4', '#f5d000', '#f08a00', '#1f9d55', '#2563eb', '#7c4a1e', '#111'];
  const fam = () => M.FAMILIES[0];
  const stCls = s => s === 'نشط' ? 'ok' : s === 'متأخر' ? 'bad' : 'warn';

  /* ================= member: family ================= */
  const famRows = () => fam().kids.map((k, i) => { const s = M.sport(k.sport);
    return `<div class="it tap" onclick="MSA.kid(${i})"><span class="msx-ico">${s.ico}</span><div class="f1"><b>${esc(k.n)}</b><small class="msx-mut">${s.name} · ${esc(k.group)}</small></div><span class="msx-pill ${stCls(k.status)}">${k.status}</span></div>`; }).join('');
  const homeOrig = APPS.member.F.home;
  APPS.member.F.home = function () {
    return homeOrig.apply(this, arguments) + `<div class="pad"><div class="sec">عيلتي في الأكاديمية<span class="f1"></span>${btn('الكل', "go('family')", 'ghost sm')}</div><div class="card lst">${famRows()}</div></div>`;
  };
  APPS.member.F.family = function () {
    const f = fam(), full = Math.round(f.monthly / (1 - f.discount / 100));
    return hd('عيلتي', 'home') + `<div class="pad"><div class="card msx-hero"><small>حساب عائلي واحد</small><b>${f.kids.length} أفراد · ${[...new Set(f.kids.map(k => M.sport(k.sport).ico))].join(' ')}</b>
      <p>بتتابع حضور ومستوى كل واحد، وبتدفع لهم مرة واحدة.</p></div>
      <div class="card lst">${famRows()}</div>
      <div class="card"><div class="msx-row"><span>الاشتراكات الشهرية</span><s class="msx-mut">${full.toLocaleString('en')} EGP</s></div><div class="msx-row"><span>خصم الإخوات ${f.discount}%</span><b class="msx-green">-${(full - f.monthly).toLocaleString('en')} EGP</b></div>
      <div class="msx-row big"><span>الإجمالي</span><b>${f.monthly.toLocaleString('en')} EGP</b></div>${btn('ادفع للكل مرة واحدة', 'MSA.payAll()', 'full')}</div>
      <div class="card"><b>تضيف فرد جديد؟</b><p class="msx-mut" style="margin:6px 0 12px">ابنك أو بنتك يقدروا يجرّبوا أي رياضة حصة مجانية.</p>${btn('احجز حصة تجربة', 'MSA.trial()', 'ghost full')}</div></div>`;
  };
  APPS.member.F.kid = function () {
    const k = fam().kids[M.state.kid] || fam().kids[1], s = M.sport(k.sport);
    let body = '';
    if (k.sport === 'swimming') {
      const w = M.SWIM.find(x => x.n === k.n), next = s.levels[w.level + 1];
      body = `<div class="card"><div class="msx-mut">المستوى الحالي</div><b class="msx-big">${esc(s.levels[w.level] ?? '')}</b>
        <div class="msx-bar"><i style="width:${Math.max(10, Math.min(100, (40 - w.free25) / 10 * 100))}%"></i></div><small class="msx-mut">الترقية لـ «${esc(next || "")}» لما زمن 25 متر ينزل عن 30 ثانية</small></div>
        <div class="g2 msx-g2"><div class="st"><b>${w.free25.toFixed(1)} ث</b><small>آخر زمن 25 م حرة</small></div><div class="st"><b class="msx-green">▼ ${(w.prev - w.free25).toFixed(1)} ث</b><small>تحسّن عن المرة اللي فاتت</small></div></div>
        <div class="card"><b>ملاحظة كابتن سلمى</b><p class="msx-mut" style="margin:6px 0 0">${esc(k.n.split(' ')[0])} بقت بتطفو لوحدها من غير خوف. الأسبوع ده هنشتغل على التنفس الجانبي.</p></div>`;
    } else if (k.sport === 'karate') {
      const a = M.KARATE.find(x => x.n === k.n);
      body = `<div class="card"><div class="msx-mut">الحزام الحالي</div><b class="msx-big"><span class="msx-belt" style="background:${BELT[a.belt]}"></span>${esc(s.levels[a.belt] ?? '')}</b>
        <div class="msx-bar"><i style="width:${a.ready}%"></i></div><small class="msx-mut">جاهزية اختبار الحزام ${esc(s.levels[a.belt + 1] ?? '')}: ${a.ready}%</small></div>
        <div class="card"><b>🗓️ اختبار الأحزمة · ${M.KARATE_EXAM.date}</b><div class="lst" style="margin-top:8px">${M.KARATE_EXAM.items.map((x, i) => `<div class="it"><span class="f1">${x}</span><span class="msx-pill ${i < 3 ? 'ok' : 'warn'}">${i < 3 ? 'جاهز' : 'محتاج حضور أكتر'}</span></div>`).join('')}</div>
        ${btn('أكّد حضوره للاختبار', "toast('اتأكد حضور الاختبار')", 'full')}</div>`;
    } else return APPS.member.F.football();
    return hd(esc(k.n), 'family') + `<div class="pad"><div class="card msx-kid"><span class="msx-ico lg">${s.ico}</span><div class="f1"><b>${esc(k.n)}</b><small class="msx-mut">${k.age} سنين · ${esc(k.group)}</small></div><span class="msx-pill ${stCls(k.status)}">${k.status}</span></div>
      ${body}<div class="g2 msx-g2">${btn('مش هيقدر ييجي', "toast('اتبلغ المدرب بالاعتذار')", 'ghost')}${btn('كلّم المدرب', "toast('اتفتحت المحادثة مع المدرب')", 'dark')}</div></div>`;
  };
  Object.assign(APPS.member.sub, { family: 'home', kid: 'home' });
  APPS.member.list.splice(1, 0, ['family', 'عيلتي وأولادي'], ['kid', 'متابعة ابن/بنت']);

  /* ================= coach: sport tools ================= */
  const persona = { karate: 'سنسي وليد · كاراتيه', swimming: 'كابتن سلمى · سباحة', gymnastics: 'كابتن ندى · جمباز' };
  APPS.coach.F.sport = function () {
    const c = M.state.coachSport, s = M.sport(c);
    const sw = `<div class="chips" style="margin-bottom:12px">${Object.keys(persona).map(k => `<button class="chip ${c === k ? 'on' : ''}" onclick="MSA.coach('${k}')">${M.sport(k).ico} ${M.sport(k).name}</button>`).join('')}</div>`;
    let body = '';
    if (c === 'karate') {
      body = `<div class="card"><b>ترشيحات اختبار ${M.KARATE_EXAM.date}</b><p class="msx-mut" style="margin:4px 0 8px">علّم مين جاهز، والترشيح بيوصل للإدارة ولولي الأمر.</p><div class="lst">${M.KARATE.map((a, i) => `<div class="it">
        <span class="msx-belt" style="background:${BELT[a.belt]}"></span><div class="f1"><b>${esc(a.n)}</b><small class="msx-mut">${esc(s.levels[a.belt] ?? '')} · جاهزية ${a.ready}%</small></div>
        <button class="chip ${a.nom ? 'on' : ''}" onclick="MSA.nom(${i})">${a.nom ? '✓ مرشّح' : 'رشّح'}</button></div>`).join('')}</div>
        ${btn(`ابعت الترشيحات (${M.KARATE.filter(a => a.nom).length})`, "MSA.sendNoms()", 'full')}</div>`;
    } else if (c === 'swimming') {
      body = `<div class="card"><b>تسجيل أزمنة 25 متر حرة</b><p class="msx-mut" style="margin:4px 0 8px">اكتب الزمن بالثواني، والرقم الشخصي بيتحدّث لوحده.</p><div class="lst">${M.SWIM.map((w, i) => `<div class="it">
        <div class="f1"><b>${esc(w.n)}</b><small class="msx-mut">${esc((M.sport('swimming').levels[w.level] || '').split(' · ')[0])} · أحسن زمن ${w.free25.toFixed(1)} ث</small></div>
        <input class="msx-in" id="msT${i}" inputmode="decimal" placeholder="ث" aria-label="زمن ${esc(w.n)}"></div>`).join('')}</div>${btn('حفظ الأزمنة', 'MSA.saveTimes()', 'full')}</div>`;
    } else {
      body = `<div class="card"><b>مهارات مستوى 2</b><p class="msx-mut" style="margin:4px 0 8px">اضغط على المهارة لما اللاعبة تتقنها.</p>${M.GYM.map((a, i) => `<div class="msx-gym"><b>${esc(a.n)} <small class="msx-mut">${a.done.filter(Boolean).length}/${M.GYM_SKILLS.length}</small></b><div class="chips">${M.GYM_SKILLS.map((x, j) => `<button class="chip ${a.done[j] ? 'on' : ''}" onclick="MSA.skill(${i},${j})">${a.done[j] ? '✓ ' : ''}${x}</button>`).join('')}</div></div>`).join('')}</div>`;
    }
    return hd('أدوات الرياضة', 'home') + `<div class="pad"><div class="card msx-hero"><small>نفس التطبيق لكل المدربين</small><b>${persona[c]}</b><p>كل مدرب بيشوف أدوات رياضته: الكورة تقسيمة وماتش، الكاراتيه أحزمة، السباحة أزمنة، الجمباز مهارات.</p></div>${sw}${body}</div>`;
  };
  const coachHome = APPS.coach.F.home;
  APPS.coach.F.home = function () {
    return coachHome.apply(this, arguments) + `<div class="pad"><div class="card msx-link" onclick="go('sport')"><span class="msx-ico">🥋🏊🤸</span><div class="f1"><b>مدرب رياضة تانية؟</b><small class="msx-mut">شوف التطبيق بعين سنسي الكاراتيه أو كابتن السباحة أو الجمباز</small></div>${ic('chev', 18)}</div></div>`;
  };
  APPS.coach.sub.sport = 'home';
  APPS.coach.list.push(['sport', 'أدوات الرياضات التانية']);

  /* ================= manager: courts ================= */
  APPS.manager.F.courts = function () {
    const cell = (c, t) => { const b = M.BOOKINGS.find(x => x[0] === c && x[1] === t);
      return b ? `<div class="msx-slot ${b[3]}">${esc(b[2])}</div>` : `<button class="msx-slot free" onclick="MSA.book(${c},${t})">+ فاضي</button>`; };
    const n = M.BOOKINGS.filter(b => b[3] === 'booking').length;
    return hd('ملاعب البادل', 'gmore') + `<div class="pad"><div class="g2 msx-g2"><div class="st"><b>${M.BOOKINGS.length}/${M.COURTS.length * M.SLOTS.length}</b><small>فترات محجوزة</small></div><div class="st"><b>${(n * 600).toLocaleString('en')} EGP</b><small>إيراد الحجوزات</small></div></div>
      <div class="card"><div class="msx-courts" style="grid-template-columns:56px repeat(${M.COURTS.length},1fr)"><div></div>${M.COURTS.map(c => `<div class="h">${c}</div>`).join('')}
      ${M.SLOTS.map((t, ti) => `<div class="t">${t}</div>${M.COURTS.map((_, ci) => cell(ci, ti)).join('')}`).join('')}</div>
      <div class="msx-legend"><span class="group">جروب</span><span class="booking">حجز</span><span class="event">بطولة</span></div></div></div>`;
  };
  const gmore = APPS.manager.F.gmore;
  APPS.manager.F.gmore = function () {
    const h = gmore.apply(this, arguments), link = `<div class="pad" style="padding-bottom:0"><div class="card msx-link" onclick="go('courts')"><span class="msx-ico">🎾</span><div class="f1"><b>ملاعب البادل والحجوزات</b><small class="msx-mut">${M.BOOKINGS.length} فترة محجوزة النهارده</small></div>${ic('chev', 18)}</div></div>`;
    const i = h.indexOf('<div class="pad');
    return i >= 0 ? h.slice(0, i) + link + h.slice(i) : link + h;
  };
  APPS.manager.sub.courts = 'gmore';
  APPS.manager.list.push(['courts', 'ملاعب البادل والحجوزات']);

  /* ================= actions ================= */
  window.MSA = {
    kid(i) { const k = fam().kids[i]; if (k.sport === 'football') return go('football'); M.state.kid = i; go('kid'); },
    payAll() { sheet(`<h3>دفع اشتراكات العيلة</h3><p class="msx-mut">${fam().kids.length} اشتراكات · ${fam().monthly.toLocaleString('en')} EGP بعد خصم الإخوات</p>
      <div class="g2 msx-g2">${btn('إنستاباي', "closeSheet();toast('اتبعت طلب الدفع على إنستاباي')", 'dark')}${btn('كاش في الفرع', "closeSheet();toast('اتسجل إنك هتدفع كاش في الفرع')", 'ghost')}</div>`); },
    trial() { sheet(`<h3>حصة تجربة مجانية</h3><p class="msx-mut">اختار الرياضة:</p><div class="chips">${M.SPORTS.filter(s => s.on).map(s => `<button class="chip" onclick="closeSheet();toast('اتحجزت تجربة ${s.name} وهنكلمك نأكد الميعاد')">${s.ico} ${s.name}</button>`).join('')}</div>`); },
    coach(k) { M.state.coachSport = k; draw(); },
    nom(i) { M.KARATE[i].nom = !M.KARATE[i].nom; draw(); },
    sendNoms() { const n = M.KARATE.filter(a => a.nom).length; toast(n ? `اتبعت ${n} ترشيحات للإدارة وأولياء الأمور` : 'رشّح لاعب الأول'); },
    saveTimes() { let n = 0; M.SWIM.forEach((w, i) => { const el = document.getElementById('msT' + i), v = parseFloat((el && el.value || '').replace(',', '.')); if (v > 5 && v < 120) { n++; if (v < w.free25) { w.prev = w.free25; w.free25 = v; } } }); toast(n ? `اتسجل ${n} زمن` : 'اكتب زمن واحد على الأقل'); if (n) draw(); },
    skill(i, j) { const a = M.GYM[i]; a.done[j] = a.done[j] ? 0 : 1; draw(); },
    book(c, t) { sheet(`<h3>حجز ${M.COURTS[c]} · ${M.SLOTS[t]}</h3><p class="msx-mut">ساعة ونص · 600 EGP</p><input id="msBk" class="msx-in wide" placeholder="اسم اللي حاجز"><div style="margin-top:12px">${btn('تأكيد الحجز', `MSA.saveBook(${c},${t})`, 'full')}</div>`); },
    saveBook(c, t) { const v = (document.getElementById('msBk').value || '').trim() || 'حجز جديد'; M.BOOKINGS.push([c, t, v, 'booking']); closeSheet(); toast('الحجز اتأكد'); draw(); }
  };

  draw();
})();

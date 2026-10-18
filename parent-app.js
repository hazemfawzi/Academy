/* Parent view and session attendance in the apps.
   - The member app follows one family: the guardian switches between their children
     (and themselves when they play), and every screen follows the chosen player.
   - The subscription screen shows the chosen player's program, invoices and receipts,
     and sends a renewal at the program price.
   - Coaches mark present, late, absent or excused, or everyone present at once. */
(function () {
  'use strict';
  if (typeof APPS === 'undefined' || !window.AcademyApps || !window.Family) return;
  const AA = window.AcademyApps, F = window.Family, SE = window.SportEngine, db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const btn = (label, action, cls = '') => `<button type="button" class="ma-button ${cls}" onclick="${E(action)}">${E(label)}</button>`;
  const money = n => new Intl.NumberFormat('en-US').format(Math.round(n)) + ' ج';
  const date = v => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }).format(new Date(v));
  const time = v => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
  const empty = (t, d) => `<div class="ma-empty"><b>${E(t)}</b><p>${E(d)}</p></div>`;
  const group = id => db.state.groups.find(g => g.id === id);
  const sportOf = m => group(m.group)?.sport;

  const owner = () => db.member('m0');
  const family = () => F.of(owner());
  const people = () => { const f = family(); return f ? F.members(f.id) : [owner()]; };
  AA.viewer = () => db.member(AA.viewerId || 'm0');

  AA.switcher = () => {
    const list = people();
    if (list.length < 2) return '';
    const selected = AA.viewer(), g = group(selected.group), d = SE.get(sportOf(selected));
    return `<section class="pa-family" aria-label="ملفات الأسرة"><p class="pa-family-label">ملف مين تحب تتابع؟</p><div class="pa-switch" role="group" aria-label="اختيار اللاعب">${list.map(m => `<button type="button" aria-pressed="${selected.id === m.id}" aria-label="متابعة ${E(m.name)}" title="${E(m.name)}" class="${selected.id === m.id ? 'on' : ''}" onclick="AcademyApps.view('${m.id}')">${KoraAvatars.render(m.name, 'pa-family-avatar', 32)}<span>${E(m.name.split(' ')[0])}</span></button>`).join('')}</div><p class="pa-family-context" aria-label="اشتراك اللاعب المختار"><span>${E(g?.branch || 'الفرع غير محدد')}</span><i aria-hidden="true">‹</i><span>${E(d?.name || 'الرياضة غير محددة')}</span><i aria-hidden="true">‹</i><span>${E(g?.name || 'المجموعة غير محددة')}</span></p></section>`;
  };
  AA.view = id => {
    AA.viewerId = id === 'm0' ? '' : id;
    const s = sportOf(db.member(id));
    if (s && SE.get(s)) AA.sport = s;
    AA.sessionId = ''; AA.groupId = 'all';
    AA.configure(); S.scr.member = S.scr.member === 'sports' ? 'home' : S.scr.member; draw();
  };

  /* Home for a child: next session, level and the family balance. */
  const baseHome = APPS.member.F.home;
  APPS.member.F.home = () => {
    const m = AA.viewer();
    if (m.id === 'm0' && !family()) return baseHome();
    const d = SE.get(sportOf(m)), g = group(m.group), fam = family();
    const next = db.state.sessions.filter(s => s.group === m.group && s.status === 'scheduled' && new Date(s.start) > new Date(Date.now() - 3600000)).sort((a, b) => new Date(a.start) - new Date(b.start))[0];
    const lvl = window.Progress?.level(m), el = window.Progress?.eligibility(m), st = AcademyModel.status(m);
    const owe = fam ? F.balance(fam.id) : 0;
    return `<div class="ma-workspace"><header class="ma-header"><div><small>${E(d?.ico || '')} ${E(d?.name || '')} · ${E(g?.branch || '')}</small><h2>${m.id === 'm0' ? 'أهلًا ' + E(m.name.split(' ')[0]) : 'متابعة ' + E(m.name)}</h2><p>${E(g?.name || '')} · ${E(ScheduleCore.describe(g))}</p></div>${AA.switcher()}</header><div class="ma-body">
      ${next ? `<article class="ma-card pa-next"><small>الحصة القادمة</small><h3>${E(time(next.start))}</h3><p>${E(next.coach || g?.coach || '')} · ${E(next.resource || g?.resource || '')}</p>${next.rsvp[m.id] === 'confirmed' ? '<span class="sa-chip ok">الحضور مؤكد</span>' : btn('تأكيد الحضور', `AcademyApps.confirmFor('${next.id}','${m.id}')`, 'primary')}</article>` : empty('لا توجد حصص قادمة', 'تظهر هنا مواعيد الجروب.')}
      <div class="ma-metrics"><div><small>حصص متبقية</small><b>${m.remaining}</b></div><div><small>المستوى</small><b class="pa-small">${E(lvl?.name || '—')}</b></div><div><small>${st === 'active' ? 'ينتهي' : 'الاشتراك'}</small><b class="pa-small">${st === 'active' ? date(m.end) : st === 'frozen' ? 'مجمد' : 'منتهي'}</b></div></div>
      ${el?.eligible ? `<p class="ma-note pa-good">${E(m.name.split(' ')[0])} ${el.needsExam ? 'مؤهل لاختبار' : 'مؤهل للترقية إلى'} ${E(el.next.name)}</p>` : ''}
      ${owe ? `<button type="button" class="ma-action pa-owe" onclick="go('account')"><b>متبقي على العائلة ${money(owe)}</b><small>ادفع من صفحة الاشتراك</small><span>←</span></button>` : ''}
      <button type="button" class="ma-action" onclick="go('progress')"><b>التقدم الرياضي</b><small>المستوى والمهارات وأفضل النتائج</small><span>←</span></button>
      <button type="button" class="ma-action" onclick="go('account')"><b>الاشتراك والإيصالات</b><small>${E(d?.programs.find(p => p.id === m.programId)?.name || 'الباقة')} · تجديد</small><span>←</span></button></div></div>`;
  };
  AA.confirmFor = (sid, mid) => V.run(() => { db.rsvp(sid, mid, 'confirmed'); draw(); toast('اتأكد الحضور'); });

  /* Subscription for the chosen player. */
  const baseAccount = APPS.member.F.account;
  APPS.member.F.account = () => {
    const m = AA.viewer();
    if (m.id === 'm0' && !m.programId) return baseAccount();
    const g = group(m.group), d = SE.get(g?.sport), p = d?.programs.find(x => x.id === m.programId) || d?.programs[0];
    const inv = db.state.invoices.filter(i => i.memberId === m.id).sort((a, b) => new Date(b.created) - new Date(a.created));
    const tx = db.state.transactions.filter(t => t.memberId === m.id).sort((a, b) => new Date(b.at) - new Date(a.at));
    const pending = db.state.requests.find(r => r.memberId === m.id && r.type === 'payment' && r.status === 'pending');
    const fam = family(), others = fam ? F.members(fam.id).filter(x => x.id !== m.id && F.active(x)) : [], disc = others.length ? Number(db.state.settings?.siblingDiscount ?? 10) : 0;
    return `<div class="ma-workspace"><header class="ma-header"><div><small>${E(d?.name || '')}</small><h2>اشتراك ${E(m.name.split(' ')[0])}</h2><p>${E(p?.name || '')} · ${p ? p.sessions + ' حصة شهريًا' : ''}</p></div>${AA.switcher()}</header><div class="ma-body">
      <article class="ma-card pa-sub"><small>${AcademyModel.status(m) === 'active' ? 'ساري' : 'يحتاج تجديد'}</small><h3>${m.remaining} حصص متبقية</h3><p>ينتهي ${date(m.end)} · الاشتراك ينتهي بالتاريخ أو باستهلاك الحصص، أيهما أولًا.</p></article>
      ${inv.filter(i => i.paid < i.total).map(i => `<article class="ma-card pa-owe"><b>متبقي ${money(i.total - i.paid)}</b><p>${E(i.planLabel || '')} · إجمالي ${money(i.total)}</p><small>ادفع المتبقي في الفرع أو بتحويل، والاستقبال يسجله.</small></article>`).join('')}
      ${pending ? `<p class="ma-note">طلب التجديد قيد المراجعة · ${E(pending.payload.method)}</p>` : p ? `<h3 class="ma-section-title">تجديد الاشتراك</h3><div class="ma-form pa-renew"><div class="rg-bill"><div><span>${E(p.name)}</span><b>${money(p.price)}</b></div>${disc ? `<div class="ok"><span>خصم الإخوات ${disc}%</span><b>− ${money(p.price * disc / 100)}</b></div>` : ''}<div class="total"><span>المطلوب</span><b>${money(p.price * (1 - disc / 100))}</b></div></div>
        <label>طريقة الدفع<select id="pa-method">${['إنستاباي', 'فودافون كاش', 'كاش في الفرع'].map(x => `<option>${x}</option>`).join('')}</select></label><label>رقم عملية التحويل<input id="pa-ref" placeholder="لا يلزم للكاش في الفرع"></label>${btn('إرسال طلب التجديد', `AcademyApps.renew('${m.id}',${disc})`, 'primary')}<p class="ma-note">الاستقبال يراجع التحويل ويفعّل الاشتراك، ويوصلك الإيصال هنا.</p></div>` : ''}
      <h3 class="ma-section-title">الإيصالات</h3>${tx.map(t => `<button type="button" class="ma-action" onclick="V.receipt('${t.id}')"><b>${t.kind === 'refund' ? 'استرداد' : 'دفع'} ${money(t.amount)}</b><small>${date(t.at)} · ${E(t.method)}</small><span>←</span></button>`).join('') || empty('لا توجد إيصالات', 'تظهر هنا بعد أول دفعة.')}</div></div>`;
  };
  AA.renew = (mid, disc) => V.run(() => {
    const m = db.member(mid), d = SE.get(sportOf(m)), p = d.programs.find(x => x.id === m.programId) || d.programs[0];
    db.request(mid, 'payment', { plan: 'monthly', method: document.getElementById('pa-method').value, reference: document.getElementById('pa-ref').value.trim(), discount: disc, charge: { label: `${d.name} · ${p.name}`, price: p.price, sessions: p.sessions, days: 30, programId: p.id } });
    draw(); toast('اتبعت طلب التجديد للاستقبال');
  });

  /* Attendance with statuses for every sport except the football session screen. */
  const marks = [['present', 'حاضر'], ['late', 'متأخر'], ['absent', 'غائب'], ['excused', 'بعذر']];
  const baseAttendance = AA.attendance;
  AA.attendance = () => {
    if (AA.sport === 'football' && AA.branch === 'all' && AA.groupId === 'all' && !AA.sessionId) return baseAttendance();
    const rows = AA.scope().sessions.filter(s => s.status === 'scheduled').sort((a, b) => new Date(a.start) - new Date(b.start));
    const s = rows.find(x => x.id === AA.sessionId) || rows.find(x => new Date(x.start).getTime() + x.duration * 60000 > Date.now()) || rows[0];
    if (!s) return baseAttendance();
    AA.sessionId = s.id;
    const members = db.state.members.filter(m => m.group === s.group), d = SE.get(group(s.group)?.sport);
    const stateOf = m => s.marks?.[m.id] || (s.present[m.id] ? 'present' : '');
    const counted = members.filter(m => s.present[m.id]).length;
    return `<div class="ma-workspace"><header class="ma-header"><div><small>${E(d?.ico || '')} ${E(d?.name || '')}</small><h2>الحضور</h2><p>${E(group(s.group)?.name)} · ${E(time(s.start))}</p></div></header><div class="ma-body">
      <select class="ma-select" aria-label="الحصة" onchange="AcademyApps.sessionId=this.value;draw()">${rows.map(x => `<option value="${x.id}" ${x.id === s.id ? 'selected' : ''}>${E(group(x.group)?.name)} · ${E(time(x.start))}</option>`).join('')}</select>
      <div class="pa-att-head"><b>${counted} حاضر من ${members.length}</b>${btn('الكل حاضر', 'AcademyApps.allPresent()')}</div>
      ${members.map(m => { const cur = stateOf(m), covered = m.remaining > 0 && new Date(m.end) >= new Date();
        return `<article class="pa-att ${cur}"><div><b>${E(m.name)}</b>${m.medical ? `<small class="pa-med">⚕ ${E(m.medical)}</small>` : ''}${covered ? '' : '<small class="pa-warn">اشتراك منتهي · الاستقبال يتابع</small>'}</div><div class="pa-seg" role="group" aria-label="حالة ${E(m.name)}">${marks.map(([k, l]) => `<button type="button" class="${cur === k ? 'on ' + k : ''}" aria-pressed="${cur === k}" onclick="AcademyApps.markAs('${m.id}','${k}')">${l}</button>`).join('')}</div></article>`; }).join('') || empty('الجروب بلا لاعبين', 'سجّل اللاعبين أولًا.')}
      ${btn('إنهاء الحصة وحفظ الحضور', 'AcademyApps.finish()', 'primary')}<p class="ma-note">المتأخر يحسب حاضرًا. الغياب بعذر لا يخصم ولا يحسب غيابًا في نسبة الالتزام. الحضور يفتح قبل الموعد بـ30 دقيقة.</p></div></div>`;
  };
  AA.markAs = (mid, mark) => V.run(() => { db.attend(AA.sessionId, mid, mark === 'present', mark === 'present' ? undefined : mark); draw(); });
  AA.allPresent = () => V.run(() => { const s = db.session(AA.sessionId); db.state.members.filter(m => m.group === s.group && !s.present[m.id] && !s.marks?.[m.id]).forEach(m => db.attend(s.id, m.id, true)); draw(); toast('اتسجل حضور الجميع'); });

  APPS.coach.F.attend = AA.attendance;
  draw();
})();

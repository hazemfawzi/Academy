/* Role homes in the apps.
   Coach: the session now (or next) with attendance and the sport tools one tap away.
   Branch manager: what needs action today — money owed, requests, renewals, follow-ups —
   and collections ordered by urgency instead of an alphabetical list. */
(function () {
  'use strict';
  if (typeof APPS === 'undefined' || !window.AcademyApps || !window.AcademyModel) return;
  const AA = window.AcademyApps, M = window.AcademyModel, SE = window.SportEngine, db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => new Intl.NumberFormat('en-US').format(Math.round(n)) + ' ج';
  const when = v => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
  const short = v => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }).format(new Date(v));
  const empty = (t, d) => `<div class="ma-empty"><b>${E(t)}</b><p>${E(d)}</p></div>`;
  const action = (title, desc, act, badge = '') => `<button type="button" class="ma-action" onclick="${E(act)}"><b>${E(title)}${badge ? ` <em class="rh-badge">${E(badge)}</em>` : ''}</b><small>${E(desc)}</small><span>←</span></button>`;
  const group = id => db.state.groups.find(g => g.id === id);
  const head = (title, sub) => { const d = SE.get(AA.sport); return `<header class="ma-header"><div><small>${E(d?.ico || '')} ${E(d?.name || '')}${AA.branch !== 'all' ? ' · ' + E(AA.branch) : ''}</small><h2>${E(title)}</h2><p>${E(sub)}</p></div></header>`; };
  const page = (title, sub, body) => `<div class="ma-workspace">${head(title, sub)}<div class="ma-body">${body}</div></div>`;

  /* ---------- coach ---------- */
  const coachBase = APPS.coach.F.home;
  APPS.coach.F.home = () => {
    const a = AA.scope(), now = Date.now();
    const live = a.sessions.filter(s => s.status === 'scheduled' && new Date(s.start).getTime() - 30 * 60000 <= now && new Date(s.start).getTime() + s.duration * 60000 >= now)[0];
    const next = live || a.sessions.filter(s => s.status === 'scheduled' && new Date(s.start).getTime() > now).sort((x, y) => new Date(x.start) - new Date(y.start))[0];
    if (!next && !a.groups.length) return coachBase();
    const tools = SE.tools(AA.sport);
    const g = next && group(next.group), roster = next ? db.state.members.filter(m => m.group === next.group) : [];
    const present = next ? roster.filter(m => next.present[m.id]).length : 0, confirmed = next ? roster.filter(m => next.rsvp[m.id] === 'confirmed').length : 0;
    const health = roster.filter(m => m.medical).length, unpaid = roster.filter(m => !(m.remaining > 0 && new Date(m.end) >= new Date())).length;
    const eligible = window.Progress ? a.members.filter(m => m.sportLevel && Progress.eligibility(m)?.eligible).length : 0;
    return page('مساحة التدريب', 'حصتك وأدواتك في مكان واحد.', `${next ? `<article class="ma-card rh-session ${live ? 'live' : ''}"><small>${live ? 'الحصة الآن' : 'الحصة القادمة'}</small><h3>${E(g?.name)}</h3><p>${E(when(next.start))} · ${E(next.resource || g?.resource || '')}</p>
        <div class="rh-stats"><span><b>${live ? present : confirmed}</b>${live ? 'حاضر' : 'أكد الحضور'}</span><span><b>${roster.length}</b>في الجروب</span>${health ? `<span class="warn"><b>${health}</b>ملاحظة صحية</span>` : ''}${unpaid ? `<span class="warn"><b>${unpaid}</b>بدون اشتراك</span>` : ''}</div>
        <button type="button" class="ma-button primary" onclick="AcademyApps.sessionId='${next.id}';go('attend')">${live ? 'سجّل الحضور' : 'كشف الحضور'}</button></article>` : empty('لا توجد حصص قادمة', 'الحصص بتتولد من جدول الجروب.')}
      ${eligible ? action('مؤهلون للترقية', 'راجع وأكد الترقية', "go('levels')", String(eligible)) : ''}
      <h3 class="ma-section-title">أدوات ${E(SE.get(AA.sport)?.name || '')}</h3>${tools.map(t => action(t.title, t.desc, t.action)).join('') || empty('لا توجد أدوات مفعلة', 'فعّلها من إعدادات الرياضة.')}`);
  };

  /* ---------- branch manager ---------- */
  const dueOf = id => db.state.invoices.filter(i => i.memberId === id).reduce((n, i) => n + Math.max(0, i.total - i.paid), 0);
  APPS.manager.F.home = () => {
    const a = AA.scope(), now = new Date(), day = db.day(now);
    const members = a.members, ids = new Set(members.map(m => m.id));
    const owed = members.filter(m => dueOf(m.id) > 0);
    const renew = members.filter(m => M.status(m, now) === 'active' && (m.remaining <= 2 || new Date(m.end) <= new Date(now.getTime() + 7 * 86400000)));
    const expired = members.filter(m => M.status(m, now) === 'expired');
    const pending = a.requests.filter(r => r.status === 'pending');
    const tasks = db.state.followups.filter(f => f.status === 'open' && ids.has(f.memberId) && f.due <= day);
    const paidToday = a.transactions.filter(t => db.day(t.at) === day).reduce((n, t) => n + (t.kind === 'refund' ? -t.amount : t.amount), 0);
    const todays = a.sessions.filter(s => db.day(s.start) === day && s.status !== 'cancelled');
    return page('يوم الفرع', 'اللي محتاج إجراء النهارده.', `<div class="ma-metrics"><div><small>تحصيل اليوم</small><b class="rh-num">${money(paidToday)}</b></div><div><small>حصص اليوم</small><b>${todays.length}</b></div><div><small>اشتراكات نشطة</small><b>${members.length - expired.length}</b></div></div>
      ${action('تسجيل لاعب جديد', 'ولي الأمر ثم اللاعب ثم البرنامج والدفع', "go('newm')")}
      ${pending.length ? action('طلبات تنتظر المراجعة', pending.slice(0, 2).map(r => db.member(r.memberId).name).join('، '), "go('requests')", String(pending.length)) : ''}
      ${owed.length ? action('متبقي على لاعبين', money(owed.reduce((n, m) => n + dueOf(m.id), 0)) + ' إجمالي', "go('collect')", String(owed.length)) : ''}
      ${renew.length ? action('تجديدات قريبة', 'خلال أسبوع أو حصتين', "go('collect')", String(renew.length)) : ''}
      ${expired.length ? action('اشتراكات منتهية', 'تواصل للتجديد', "go('collect')", String(expired.length)) : ''}
      ${tasks.length ? action('متابعات مستحقة', tasks[0].note || '', "go('followups')", String(tasks.length)) : ''}
      <h3 class="ma-section-title">حصص اليوم</h3>${todays.map(s => { const g = group(s.group); return `<article class="ma-card rh-row"><b>${E(new Intl.DateTimeFormat('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' }).format(new Date(s.start)))}</b><span>${E(g?.name)}<small>${E(s.coach || g?.coach || '')} · ${E(s.resource || '')}</small></span></article>`; }).join('') || empty('لا توجد حصص اليوم', 'في الرياضة والفرع المختارين.')}`);
  };

  APPS.manager.F.collect = () => {
    const a = AA.scope(), now = new Date();
    const rank = m => { const due = dueOf(m.id), st = M.status(m, now); return due > 0 ? 0 : st === 'expired' ? 1 : (m.remaining <= 2 || new Date(m.end) <= new Date(now.getTime() + 7 * 86400000)) ? 2 : 3; };
    const labels = ['عليه متبقي', 'اشتراك منتهي', 'تجديد قريب'];
    const rows = a.members.map(m => ({ m, r: rank(m) })).filter(x => x.r < 3).sort((x, y) => x.r - y.r || dueOf(y.m.id) - dueOf(x.m.id));
    const rest = a.members.length - rows.length;
    const card = ({ m, r }) => { const due = dueOf(m.id), inv = db.state.invoices.find(i => i.memberId === m.id && i.paid < i.total);
      return `<article class="ma-card rh-pay r${r}"><div><b>${E(m.name)}</b><small>${E(group(m.group)?.name || '')} · ${m.remaining} حصص · ينتهي ${short(m.end)}</small></div><span class="sa-chip ${r === 0 ? 'warn' : ''}">${labels[r]}${due ? ' · ' + money(due) : ''}</span>
        <button type="button" class="ma-button ${r === 0 ? 'primary' : ''}" onclick="${E(inv ? `V.settleForm('${inv.id}')` : `V.open(V.collectForm('${m.id}'))`)}">${inv ? 'استكمال الدفع' : 'تجديد'}</button></article>`; };
    return page('التحصيل', rows.length ? 'الأولوية: المتبقي، ثم المنتهي، ثم التجديد القريب.' : 'لا يوجد تحصيل مستحق.', rows.map(card).join('') + (rest ? `<p class="ma-note">${rest} لاعب اشتراكهم ساري ولا يحتاجون تحصيلًا الآن. ابحث عنهم من «اللاعبون».</p>` : '')
      + `<h3 class="ma-section-title">آخر الإيصالات</h3>` + a.transactions.slice().sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 5).map(t => action(db.member(t.memberId).name, money(t.amount) + ' · ' + t.method + ' · ' + short(t.at), `V.receipt('${t.id}')`)).join(''));
  };

  draw();
})();

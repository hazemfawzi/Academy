/* Coach pay: each coach is paid a fixed monthly amount, a rate per session they
   actually ran, a share of the fees collected from their groups, or any mix of the
   three. The monthly statement lists the sessions, the collected fees, the bonuses and
   deductions, and is marked paid once the money goes out. */
(function (root) {
  'use strict';
  const MODES = { fixed: 'راتب ثابت', session: 'بالحصة', percent: 'نسبة من الاشتراكات', mixed: 'ثابت + حصص + نسبة' };
  const monthOf = v => { const d = new Date(v); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const shift = (month, n) => { const [y, m] = month.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return monthOf(d); };
  const coachOf = (state, s) => s.coach || state.groups.find(g => g.id === s.group)?.coach || '';

  function coaches(state) {
    const names = new Set(state.groups.map(g => g.coach).filter(Boolean));
    state.sessions.forEach(s => s.coach && names.add(s.coach));
    Object.keys(state.settings?.payroll || {}).forEach(n => names.add(n));
    return [...names];
  }

  /* Normalises the saved terms; nothing saved means the coach still needs terms. */
  function terms(state, coach) {
    const t = state.settings?.payroll?.[coach];
    if (!t) return null;
    return { mode: t.mode || 'session', base: Number(t.base) || 0, perSession: Number(t.perSession) || 0, percent: Number(t.percent) || 0 };
  }

  function validateTerms(t) {
    if (!MODES[t.mode]) throw Error('اختار طريقة الحساب');
    const n = k => Number(t[k]) || 0;
    if (['base', 'perSession', 'percent'].some(k => n(k) < 0)) throw Error('القيم لازم تكون صفر أو أكبر');
    if (n('percent') > 60) throw Error('النسبة أكبر من 60%، راجعها');
    if (t.mode === 'fixed' && !n('base')) throw Error('اكتب الراتب الثابت');
    if (t.mode === 'session' && !n('perSession')) throw Error('اكتب أجر الحصة');
    if (t.mode === 'percent' && !n('percent')) throw Error('اكتب النسبة');
    if (t.mode === 'mixed' && !n('base') && !n('perSession') && !n('percent')) throw Error('اكتب قيمة واحدة على الأقل');
    return { mode: t.mode, base: t.mode === 'fixed' || t.mode === 'mixed' ? n('base') : 0, perSession: t.mode === 'session' || t.mode === 'mixed' ? n('perSession') : 0, percent: t.mode === 'percent' || t.mode === 'mixed' ? n('percent') : 0 };
  }

  /* The month's statement for one coach. Only sessions that ended count; a substitute
     named on the session is paid for it instead of the group coach. */
  function statement(state, coach, month) {
    const t = terms(state, coach);
    const sessions = state.sessions.filter(s => s.status === 'ended' && monthOf(s.start) === month && coachOf(state, s) === coach).sort((a, b) => new Date(a.start) - new Date(b.start));
    const groupIds = state.groups.filter(g => g.coach === coach).map(g => g.id);
    const memberIds = new Set(state.members.filter(m => groupIds.includes(m.group)).map(m => m.id));
    const tx = (state.transactions || []).filter(x => memberIds.has(x.memberId) && monthOf(x.at) === month);
    const revenue = tx.reduce((n, x) => n + (x.kind === 'refund' ? -x.amount : x.amount), 0);
    const adjustments = (state.payrollAdjust || []).filter(a => a.coach === coach && a.month === month);
    const adj = adjustments.reduce((n, a) => n + a.amount, 0);
    const present = s => Object.values(s.present || {}).filter(Boolean).length;
    const lines = t ? [
      t.base && { label: 'الراتب الثابت', amount: t.base },
      t.perSession && { label: `${sessions.length} حصة × ${t.perSession}`, amount: sessions.length * t.perSession },
      t.percent && { label: `${t.percent}% من ${Math.round(revenue)} ج اشتراكات`, amount: Math.round(Math.max(0, revenue) * t.percent / 100) }
    ].filter(Boolean) : [];
    const gross = lines.reduce((n, l) => n + l.amount, 0);
    const run = (state.payrollRuns || []).find(r => r.coach === coach && r.month === month);
    return {
      coach, month, terms: t, sessions: sessions.map(s => ({ id: s.id, start: s.start, group: s.group, duration: s.duration, present: present(s), substitute: !!s.coach && s.coach !== state.groups.find(g => g.id === s.group)?.coach })),
      minutes: sessions.reduce((n, s) => n + (s.duration || 60), 0), revenue, payments: tx.length, lines, adjustments, gross, total: Math.max(0, gross + adj), run,
      avgAttendance: sessions.length ? Math.round(sessions.reduce((n, s) => n + present(s), 0) / sessions.length * 10) / 10 : 0
    };
  }

  function month(state, m) {
    const list = coaches(state).map(c => statement(state, c, m)).filter(x => x.sessions.length || x.terms || x.adjustments.length);
    return { month: m, list, total: list.reduce((n, x) => n + x.total, 0), paid: list.filter(x => x.run).reduce((n, x) => n + x.run.total, 0), revenue: (state.transactions || []).filter(x => monthOf(x.at) === m).reduce((n, x) => n + (x.kind === 'refund' ? -x.amount : x.amount), 0) };
  }

  const api = { MODES, monthOf, shift, coaches, terms, validateTerms, statement, month };
  root.PayrollCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined' || typeof V === 'undefined') return;

  const db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => new Intl.NumberFormat('en-US').format(Math.round(n)) + ' ج';
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  const monthName = m => fmt(m + '-15T12:00:00', { month: 'long', year: 'numeric' });
  const groupName = id => db.state.groups.find(g => g.id === id)?.name || '';
  const PR = window.Payroll = { ...api, current: monthOf(new Date()) };
  const lock = (coach, m) => { if ((db.state.payrollRuns || []).some(r => r.coach === coach && r.month === m)) throw Error('الكشف ده اتصرف واتقفل'); };

  PR.saveTerms = (coach, t) => db.update(st => { st.settings.payroll = st.settings.payroll || {}; st.settings.payroll[coach] = validateTerms(t); });
  PR.adjust = (coach, m, amount, note) => db.update(st => { lock(coach, m); amount = Math.round(Number(amount)); if (!amount) throw Error('اكتب المبلغ'); if (!String(note || '').trim()) throw Error('اكتب السبب'); st.payrollAdjust = st.payrollAdjust || []; st.payrollAdjust.push({ id: 'adj-' + Date.now().toString(36), coach, month: m, amount, note: note.trim(), at: new Date().toISOString() }); });
  PR.removeAdjust = id => db.update(st => { const a = (st.payrollAdjust || []).find(x => x.id === id); if (!a) return; lock(a.coach, a.month); st.payrollAdjust = st.payrollAdjust.filter(x => x.id !== id); });
  PR.pay = (coach, m, method) => db.update(st => {
    lock(coach, m);
    if (m >= monthOf(new Date())) throw Error('الصرف بيكون بعد ما الشهر يخلص');
    const s = statement(st, coach, m);
    if (!s.terms) throw Error('حدد طريقة حساب أجر المدرب الأول');
    st.payrollRuns = st.payrollRuns || [];
    st.payrollRuns.push({ id: 'pay-' + Date.now().toString(36), coach, month: m, total: s.total, sessions: s.sessions.length, method, at: new Date().toISOString() });
  });

  /* ---------- dashboard ---------- */
  if (typeof PAGES !== 'undefined') {
    const btn = (label, action, cls = '') => `<button type="button" class="sb-btn ${cls}" onclick="${E(action)}">${E(label)}</button>`;
    window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { payroll: 'مستحقات المدربين' });
    const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

    PAGES.payroll = () => {
      const m = PR.current, data = month(db.state, m), U = window.AcademyUI || { branch: 'all', sport: 'all' };
      const inScope = s => { const gs = db.state.groups.filter(g => g.coach === s.coach || s.sessions.some(x => x.group === g.id)); return (U.branch === 'all' || gs.some(g => g.branch === U.branch)) && (U.sport === 'all' || gs.some(g => g.sport === U.sport)); };
      const list = data.list.filter(inScope), total = list.reduce((n, x) => n + x.total, 0), open = list.filter(x => !x.run), needs = list.filter(x => !x.terms);
      const ratio = data.revenue > 0 ? Math.round(total / data.revenue * 100) : 0, past = m < monthOf(new Date()), sessionsCount = list.reduce((n, x) => n + x.sessions.length, 0);
      return `<div class="sb-page py-page"><header class="sb-head"><div><small>المالية</small><h1>مستحقات المدربين</h1><p>كل مدرب ليه طريقة حساب: راتب ثابت، أو أجر لكل حصة أداها فعلًا، أو نسبة من اشتراكات جروباته، أو خليط. الحصص الملغاة مش بتتحسب، والبديل بياخد أجر الحصة اللي غطاها.</p></div><div class="pr-head-actions">${btn('تنزيل الكشف (CSV)', 'Payroll.csv()')}</div></header>
        <div class="py-month"><button type="button" class="sb-btn" aria-label="الشهر اللي فات" onclick="Payroll.current=Payroll.shift(Payroll.current,-1);render()">→</button><b>${E(monthName(m))}</b><button type="button" class="sb-btn" aria-label="الشهر الجاي" ${m >= monthOf(new Date()) ? 'disabled' : ''} onclick="Payroll.current=Payroll.shift(Payroll.current,1);render()">←</button>${m === monthOf(new Date()) ? '<span class="sa-chip">الشهر الحالي · الأرقام بتزيد مع كل حصة</span>' : ''}</div>
        <div class="pg-kpis"><div><small>إجمالي المستحقات</small><b>${money(total)}</b></div><div class="${open.length && past ? 'warn' : 'ok'}"><small>${past ? 'لسه ما اتصرفش' : 'اتصرف'}</small><b>${past ? money(open.reduce((n, x) => n + x.total, 0)) : money(list.filter(x => x.run).reduce((n, x) => n + x.run.total, 0))}</b></div><div><small>حصص اتأدت</small><b>${sessionsCount}</b></div><div><small>متوسط تكلفة الحصة</small><b>${sessionsCount ? money(total / sessionsCount) : '—'}</b>${past && data.revenue > 0 ? `<small class="${ratio > 45 ? 'py-warn' : ''}">${ratio}% من إيراد الشهر</small>` : ''}</div></div>
        ${needs.length ? `<div class="py-alert">${needs.length === 1 ? 'مدرب واحد' : needs.length + ' مدربين'} من غير طريقة حساب: ${needs.map(x => `<button type="button" onclick="Payroll.termsForm(${E(q(x.coach))})">${E(x.coach)}</button>`).join('، ')}</div>` : ''}
        <div class="py-table" role="table" aria-label="مستحقات المدربين"><div class="py-row py-headrow" role="row"><span>المدرب</span><span>طريقة الحساب</span><span>الحصص</span><span>اشتراكات جروباته</span><span>تسويات</span><span>المستحق</span><span></span></div>
          ${list.sort((a, b) => b.total - a.total).map(s => { const adj = s.adjustments.reduce((n, a) => n + a.amount, 0), t = s.terms;
            return `<div class="py-row" role="row"><span><b>${E(s.coach)}</b><small>${E([...new Set(db.state.groups.filter(g => g.coach === s.coach).map(g => g.branch))].join('، ') || 'بديل')}</small></span>
              <span>${t ? `<button type="button" class="py-terms" onclick="Payroll.termsForm(${E(q(s.coach))})">${E(MODES[t.mode])}<small>${[t.base && money(t.base) + ' ثابت', t.perSession && money(t.perSession) + ' للحصة', t.percent && t.percent + '%'].filter(Boolean).join(' + ')}</small></button>` : `<button type="button" class="py-terms need" onclick="Payroll.termsForm(${E(q(s.coach))})">حدد طريقة الحساب</button>`}</span>
              <span><b>${s.sessions.length}</b><small>${Math.round(s.minutes / 60 * 10) / 10} ساعة · متوسط ${s.avgAttendance} لاعب</small></span>
              <span><b>${money(s.revenue)}</b><small>${s.payments} عملية</small></span>
              <span class="${adj > 0 ? 'ok' : adj < 0 ? 'bad' : ''}">${adj ? (adj > 0 ? '+' : '−') + money(Math.abs(adj)) : '—'}</span>
              <span><b class="py-total">${money(s.total)}</b>${s.run ? `<small class="ok">اتصرف ${E(fmt(s.run.at, { day: 'numeric', month: 'short' }))} · ${E(s.run.method)}</small>` : past ? '<small class="warn">مستحق</small>' : '<small>لحد النهارده</small>'}</span>
              <span class="py-actions">${btn('الكشف', `Payroll.detail(${q(s.coach)})`)}${!s.run && past && s.terms ? btn('تسجيل الصرف', `Payroll.payForm(${q(s.coach)})`, 'primary') : ''}</span></div>`; }).join('') || '<div class="ac-empty"><b>مفيش حصص في الشهر ده</b><p>غيّر الشهر أو نطاق الفرع والرياضة.</p></div>'}
        </div></div>`;
    };
    PAGES.payroll_after = () => {};

    PR.termsForm = coach => {
      const t = terms(db.state, coach) || { mode: 'session', base: 0, perSession: 250, percent: 0 };
      V.open(`<div class="ma-form py-form"><h3>طريقة حساب أجر ${E(coach)}</h3><div class="py-modes">${Object.entries(MODES).map(([k, l]) => `<label><input type="radio" name="py-mode" value="${k}" ${t.mode === k ? 'checked' : ''} onchange="Payroll.modeChanged()"><span>${E(l)}</span></label>`).join('')}</div>
        <label data-py="base">الراتب الثابت في الشهر (ج)<input id="py-base" type="number" min="0" step="50" value="${t.base || ''}"></label>
        <label data-py="perSession">أجر الحصة الواحدة (ج)<input id="py-ps" type="number" min="0" step="10" value="${t.perSession || ''}"></label>
        <label data-py="percent">النسبة من اشتراكات جروباته (%)<input id="py-pc" type="number" min="0" max="60" step="1" value="${t.percent || ''}"></label>
        <p class="py-help">الحصة بتتحسب لما تتقفل بعد ما تخلص. النسبة بتتحسب على المدفوع فعلًا في الشهر بعد المرتجعات.</p>
        <button type="button" class="sb-btn primary" onclick="Payroll.saveForm(${E(q(coach))})">حفظ</button></div>`);
      PR.modeChanged();
    };
    PR.modeChanged = () => { const m = document.querySelector('[name=py-mode]:checked')?.value; const show = { fixed: ['base'], session: ['perSession'], percent: ['percent'], mixed: ['base', 'perSession', 'percent'] }[m] || []; document.querySelectorAll('[data-py]').forEach(el => { el.hidden = !show.includes(el.dataset.py); }); };
    PR.saveForm = coach => V.run(() => { const v = id => document.getElementById(id)?.value; PR.saveTerms(coach, { mode: document.querySelector('[name=py-mode]:checked')?.value, base: v('py-base'), perSession: v('py-ps'), percent: v('py-pc') }); V.close(); render(); toast('اتحفظت طريقة الحساب'); });

    PR.detail = coach => {
      const s = statement(db.state, coach, PR.current);
      V.open(`<div class="py-detail"><h3>كشف ${E(coach)} · ${E(monthName(s.month))}</h3>
        <div class="py-lines">${s.lines.map(l => `<div><span>${E(l.label)}</span><b>${money(l.amount)}</b></div>`).join('') || '<div><span>مفيش طريقة حساب محددة</span><b>—</b></div>'}
        ${s.adjustments.map(a => `<div class="${a.amount > 0 ? 'ok' : 'bad'}"><span>${a.amount > 0 ? 'مكافأة' : 'خصم'}: ${E(a.note)}${s.run ? '' : ` <button type="button" class="py-x" aria-label="حذف" onclick="Payroll.dropAdjust('${a.id}',${E(q(coach))})">×</button>`}</span><b>${a.amount > 0 ? '+' : '−'}${money(Math.abs(a.amount))}</b></div>`).join('')}
        <div class="total"><span>الصافي</span><b>${money(s.total)}</b></div></div>
        ${s.run ? `<p class="py-paid">اتصرف ${E(fmt(s.run.at, { day: 'numeric', month: 'long' }))} · ${E(s.run.method)} · الكشف مقفول</p>` : `<form class="py-adj" onsubmit="event.preventDefault();Payroll.addAdjust(${E(q(coach))},this)"><select name="sign" aria-label="النوع"><option value="1">مكافأة</option><option value="-1">خصم</option></select><input name="amount" type="number" min="1" placeholder="المبلغ" aria-label="المبلغ"><input name="note" placeholder="السبب (مثلًا: حصة إضافية، تأخير)" aria-label="السبب"><button type="submit" class="sb-btn">إضافة</button></form>`}
        <h4>الحصص (${s.sessions.length})</h4><div class="py-sessions">${s.sessions.map(x => `<div><span>${E(fmt(x.start, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}</span><span>${E(groupName(x.group))}${x.substitute ? ' <em>بديل</em>' : ''}</span><span>${x.present} حاضر</span></div>`).join('') || '<p class="py-help">مفيش حصص متقفلة في الشهر ده.</p>'}</div>
        <div class="pr-head-actions">${window.Finance?.download ? `<button type="button" class="sb-btn" onclick="Payroll.print(${E(q(coach))})">نسخة للطباعة</button>` : ''}</div></div>`);
    };
    PR.addAdjust = (coach, f) => V.run(() => { PR.adjust(coach, PR.current, Number(f.sign.value) * Number(f.amount.value), f.note.value); PR.detail(coach); render(); });
    PR.dropAdjust = (id, coach) => V.run(() => { PR.removeAdjust(id); PR.detail(coach); render(); });
    PR.payForm = coach => { const s = statement(db.state, coach, PR.current); V.open(`<div class="ma-form"><h3>صرف مستحقات ${E(coach)}</h3><p>${E(monthName(s.month))} · ${s.sessions.length} حصة</p><div class="py-lines"><div class="total"><span>المبلغ</span><b>${money(s.total)}</b></div></div><label>طريقة الصرف<select id="py-method"><option>تحويل بنكي</option><option>إنستاباي</option><option>كاش من الخزنة</option></select></label><p class="py-help">بعد التسجيل الكشف بيتقفل، ومينفعش تضيف مكافأة أو خصم عليه.</p><button type="button" class="sb-btn primary" onclick="Payroll.confirmPay(${E(q(coach))})">تأكيد الصرف</button></div>`); };
    PR.confirmPay = coach => V.run(() => { PR.pay(coach, PR.current, document.getElementById('py-method').value); V.close(); render(); toast('اتسجل الصرف واتقفل الكشف'); });
    PR.csv = () => {
      const data = month(db.state, PR.current), cell = v => `"${String(v).replace(/"/g, '""')}"`;
      const rows = [['المدرب', 'طريقة الحساب', 'الحصص', 'الساعات', 'اشتراكات جروباته', 'التسويات', 'المستحق', 'الحالة'], ...data.list.map(s => [s.coach, s.terms ? MODES[s.terms.mode] : 'غير محدد', s.sessions.length, Math.round(s.minutes / 6) / 10, Math.round(s.revenue), s.adjustments.reduce((n, a) => n + a.amount, 0), s.total, s.run ? 'اتصرف' : 'مستحق'])];
      const text = '﻿' + rows.map(r => r.map(cell).join(',')).join('\n');
      if (window.Finance?.download) Finance.download(text, 'text/csv;charset=utf-8', `payroll-${PR.current}.csv`);
    };
    PR.print = coach => {
      const s = statement(db.state, coach, PR.current);
      Finance.download(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>كشف ${E(coach)}</title><style>body{font:15px Arial;padding:32px;max-width:720px;margin:auto}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:right}.t{font-weight:700;font-size:18px}@media print{button{display:none}}</style><h1>أكاديمية النخبة</h1><h2>كشف مستحقات ${E(coach)} · ${E(monthName(s.month))}</h2><table>${s.lines.map(l => `<tr><td>${E(l.label)}</td><td>${money(l.amount)}</td></tr>`).join('')}${s.adjustments.map(a => `<tr><td>${a.amount > 0 ? 'مكافأة' : 'خصم'}: ${E(a.note)}</td><td>${a.amount > 0 ? '' : '−'}${money(Math.abs(a.amount))}</td></tr>`).join('')}<tr class="t"><td>الصافي</td><td>${money(s.total)}</td></tr></table><h3>الحصص</h3><table><tr><th>التاريخ</th><th>الجروب</th><th>الحضور</th></tr>${s.sessions.map(x => `<tr><td>${E(fmt(x.start, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}</td><td>${E(groupName(x.group))}${x.substitute ? ' (بديل)' : ''}</td><td>${x.present}</td></tr>`).join('')}</table><p>${s.run ? 'تم الصرف ' + E(fmt(s.run.at, { day: 'numeric', month: 'long', year: 'numeric' })) + ' · ' + E(s.run.method) : 'لم يتم الصرف بعد'}</p><p>توقيع المدرب: ____________ &nbsp; توقيع المدير: ____________</p><button onclick="window.print()">طباعة</button></html>`, 'text/html;charset=utf-8', `payroll-${PR.current}-${coach}.html`);
    };
  }

  /* ---------- coach app: my earnings ---------- */
  if (typeof APPS === 'undefined' || !APPS.coach) return;
  const icon = (n, s = 20) => typeof ic === 'function' ? ic(n, s) : '';
  PR.me = () => { const AA = window.AcademyApps, a = AA.scope(); return a.groups[0]?.coach || db.state.groups.find(g => g.sport === AA.sport)?.coach || ''; };
  APPS.coach.F.earnings = () => {
    const coach = PR.me(), cur = statement(db.state, coach, PR.current), prev = statement(db.state, coach, shift(PR.current, -1)), K = window.AppKit;
    return `<div class="ax py-app"><header class="ax-top"><div class="ax-top-row"><button type="button" class="ax-icon-btn" aria-label="رجوع" onclick="go('home')">${icon('back', 20)}</button><div style="flex:1"><small>${E(coach)}</small><h2>مستحقاتي</h2></div></div></header>
      <div class="ax-body"><section class="ax-hero"><small>${E(monthName(cur.month))}${cur.month === monthOf(new Date()) ? ' · لحد النهارده' : ''}</small><h3>${money(cur.total)}</h3><p>${cur.terms ? E(MODES[cur.terms.mode]) : 'الإدارة لسه ما حددتش طريقة الحساب'} · ${cur.sessions.length} حصة</p></section>
        <div class="ax-card py-app-lines">${cur.lines.map(l => `<div><span>${E(l.label)}</span><b>${money(l.amount)}</b></div>`).join('')}${cur.adjustments.map(a => `<div class="${a.amount > 0 ? 'ok' : 'bad'}"><span>${E(a.note)}</span><b>${a.amount > 0 ? '+' : '−'}${money(Math.abs(a.amount))}</b></div>`).join('')}</div>
        ${K ? K.section('الشهر اللي فات') : ''}<div class="ax-card py-app-lines"><div><span>${E(monthName(prev.month))} · ${prev.sessions.length} حصة</span><b>${money(prev.total)}</b></div><div class="${prev.run ? 'ok' : ''}"><span>${prev.run ? 'اتصرف ' + E(fmt(prev.run.at, { day: 'numeric', month: 'short' })) + ' · ' + E(prev.run.method) : 'لسه ما اتصرفش'}</span><b>${prev.run ? '✓' : ''}</b></div></div>
        ${K ? K.section('حصص الشهر') : ''}${cur.sessions.slice().reverse().map(x => `<div class="ax-card py-app-session"><span>${E(fmt(x.start, { weekday: 'short', day: 'numeric', month: 'short' }))}</span><b>${E(groupName(x.group))}</b><small>${x.present} حاضر${x.substitute ? ' · بديل' : ''}</small></div>`).join('') || (K ? K.empty('مفيش حصص متقفلة', 'الحصة بتتحسب بعد ما تقفلها.', 'cal') : '')}
        <p class="ck-hint">لو فيه حصة ناقصة أو غلط في الكشف كلم مدير الفرع قبل آخر الشهر.</p></div></div>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);

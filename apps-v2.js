/* Apps v2: a visual kit (avatars, rings, tiles, week strip, icon grids, sparklines) and
   redesigned main screens for the parent, coach and branch manager. Football keeps its
   own match, teams and stats screens; everything else reads the shared records. */
(function () {
  'use strict';
  if (typeof APPS === 'undefined' || !window.AcademyApps || !window.SportEngine || !window.Progress) return;
  const AA = window.AcademyApps, SE = window.SportEngine, P = window.Progress, F = window.Family, M = window.AcademyModel, SC = window.ScheduleCore, db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, s = 20) => typeof ic === 'function' ? ic(n, s) : '';
  const avatar = (name, s = 40) => typeof av === 'function' ? av(name, s) : `<span class="ax-ini" style="width:${s}px;height:${s}px">${E(String(name)[0])}</span>`;
  const money = n => new Intl.NumberFormat('en-US').format(Math.round(n)) + ' ج';
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  const dayKey = v => db.day(v);
  const group = id => db.state.groups.find(g => g.id === id);
  const sportOf = m => SE.get(group(m.group)?.sport);
  const first = name => String(name || '').split(' ')[0];

  /* ---------- kit ---------- */
  const K = window.AppKit = {};
  K.ring = (value, max, label, size = 76, color = 'var(--ax-brand)') => {
    const r = 15.9, pct = max ? Math.max(0, Math.min(1, value / max)) : 0;
    return `<span class="ax-ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="${r}" fill="none" stroke="var(--ax-track)" stroke-width="3.2"/><circle cx="18" cy="18" r="${r}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${(pct * 100).toFixed(1)} 100" transform="rotate(-90 18 18)"/></svg><b>${E(label)}</b></span>`;
  };
  K.bar = (pct, tone = '') => `<i class="ax-bar ${tone}"><em style="width:${Math.max(0, Math.min(100, pct))}%"></em></i>`;
  K.chip = (text, tone = '') => `<span class="ax-chip ${tone}">${E(text)}</span>`;
  K.section = (title, more = '', action = '') => `<div class="ax-section"><h3>${E(title)}</h3>${more ? `<button type="button" onclick="${E(action)}">${E(more)}</button>` : ''}</div>`;
  K.tile = ({ icon: i, label, value, sub = '', tone = '', action = '' }) => `<button type="button" class="ax-tile ${tone}" ${action ? `onclick="${E(action)}"` : 'tabindex="-1"'}><span class="ax-tile-icon">${icon(i, 18)}</span><small>${E(label)}</small><b>${value}</b>${sub ? `<em>${E(sub)}</em>` : ''}</button>`;
  K.grid = items => `<div class="ax-grid">${items.map(x => `<button type="button" onclick="${E(x.action)}"><span class="ax-grid-icon ${x.tone || ''}">${icon(x.icon, 22)}${x.badge ? `<em>${x.badge}</em>` : ''}</span><small>${E(x.label)}</small></button>`).join('')}</div>`;
  K.row = ({ name, title, sub = '', chips = '', trailing = '', action = '', extra = '' }) => `<button type="button" class="ax-row" ${action ? `onclick="${E(action)}"` : ''}>${name != null ? `<span class="ax-av">${avatar(name, 42)}</span>` : ''}<span class="ax-row-main"><b>${E(title)}</b>${sub ? `<small>${sub}</small>` : ''}${chips ? `<span class="ax-row-chips">${chips}</span>` : ''}${extra}</span>${trailing ? `<span class="ax-row-end">${trailing}</span>` : ''}</button>`;
  K.spark = (values, lowerBetter = false) => {
    if (values.length < 2) return '';
    const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
    const pts = values.map((v, i) => `${(i / (values.length - 1) * 100).toFixed(1)},${(lowerBetter ? 4 + (v - lo) / span * 22 : 26 - (v - lo) / span * 22).toFixed(1)}`).join(' ');
    return `<svg class="ax-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  };
  K.empty = (title, text, i = 'cal') => `<div class="ax-empty"><span>${icon(i, 28)}</span><b>${E(title)}</b><p>${E(text)}</p></div>`;
  K.stack = names => `<span class="ax-stack">${names.slice(0, 5).map(n => avatar(n, 28)).join('')}${names.length > 5 ? `<em>+${names.length - 5}</em>` : ''}</span>`;
  K.until = v => {
    const ms = new Date(v) - Date.now(), mins = Math.round(ms / 60000);
    if (ms < 0) return 'بدأت';
    if (mins < 60) return `بعد ${mins} دقيقة`;
    const h = Math.round(mins / 60);
    if (h < 24) return h === 1 ? 'بعد ساعة' : h === 2 ? 'بعد ساعتين' : `بعد ${h} ساعات`;
    const d = Math.round(h / 24);
    return d === 1 ? 'بكرة' : d === 2 ? 'بعد يومين' : `بعد ${d} أيام`;
  };

  /* Week strip of the next seven days with dots on days that have sessions. */
  K.week = (sessions, selected, onPick) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return `<div class="ax-week" role="tablist">${Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); const k = dayKey(d), n = sessions.filter(s => dayKey(s.start) === k && s.status !== 'cancelled').length;
      return `<button type="button" role="tab" aria-selected="${k === selected}" class="${k === selected ? 'on' : ''}" onclick="${E(onPick.replace('$', k))}"><small>${i === 0 ? 'اليوم' : fmt(d, { weekday: 'short' })}</small><b>${d.getDate()}</b><i>${n ? '•'.repeat(Math.min(3, n)) : ''}</i></button>`; }).join('')}</div>`;
  };

  /* Compact sport switch + filters for staff. */
  const sportChips = () => `<div class="ax-sports">${SE.list().filter(d => d.on !== false && db.state.groups.some(g => g.sport === d.id)).map(d => `<button type="button" class="${d.id === AA.sport ? 'on' : ''}" style="--c:${E(d.color)}" onclick="AcademyApps.pick('${d.id}')">${E(d.ico)} ${E(d.name)}</button>`).join('')}</div>`;
  K.filters = () => V.open(`<div class="ma-form"><h3>تصفية</h3><label>الفرع<select onchange="AcademyApps.branch=this.value;AcademyApps.groupId='all'"><option value="all">كل الفروع</option>${[...new Set(db.state.groups.filter(g => g.sport === AA.sport).map(g => g.branch))].map(b => `<option ${AA.branch === b ? 'selected' : ''}>${E(b)}</option>`).join('')}</select></label>
    <label>الجروب<select onchange="AcademyApps.groupId=this.value"><option value="all">كل الجروبات</option>${db.state.groups.filter(g => g.sport === AA.sport && (AA.branch === 'all' || g.branch === AA.branch)).map(g => `<option value="${g.id}" ${AA.groupId === g.id ? 'selected' : ''}>${E(g.name)}</option>`).join('')}</select></label><button type="button" class="ma-button primary" onclick="V.close();draw()">تطبيق</button></div>`);
  const staffTop = (title, sub) => { const filtered = AA.branch !== 'all' || AA.groupId !== 'all';
    return `<header class="ax-top"><div class="ax-top-row"><div><small>${E(sub)}</small><h2>${E(title)}</h2></div><button type="button" class="ax-icon-btn ${filtered ? 'on' : ''}" aria-label="تصفية الفرع والجروب" onclick="AppKit.filters()">${icon('list', 20)}</button></div>${sportChips()}</header>`; };
  const page = (top, body) => `<div class="ax">${top}<div class="ax-body">${body}</div></div>`;

  /* ---------- shared data helpers ---------- */
  /* Attendance rate from held sessions; older records without sessions keep their stored rate. */
  const attOf = m => { const a = P.attendance(db.state, m); return a.held >= 4 ? a : { ...a, rate: m.attendance ?? a.rate }; };
  const statusOf = (s, mid) => s.marks?.[mid] === 'excused' ? ['بعذر', 'info'] : s.marks?.[mid] === 'late' ? ['متأخر', 'warn'] : s.present?.[mid] ? ['حضر', 'ok'] : s.marks?.[mid] === 'absent' ? ['غاب', 'bad'] : s.status === 'ended' ? ['غاب', 'bad'] : null;
  const sessionsOf = groupIds => db.state.sessions.filter(s => groupIds.includes(s.group));
  const sportTone = d => `style="--c:${E(d?.color || '#2d604c')}"`;
  const toolIcon = { teams: 'users', matches: 'trophy', ratings: 'star', levels: 'chart', skills: 'check', times: 'clock', lanes: 'list', belts: 'chart', exams: 'trophy', pairs: 'users', pr: 'bolt' };

  /* =========================================================== parent / member */
  const viewer = () => AA.viewer ? AA.viewer() : db.member('m0');
  const familyChips = () => { const html = AA.switcher ? AA.switcher() : ''; return html; };

  APPS.member.F.home = () => {
    const m = viewer(), g = group(m.group), d = sportOf(m), program = d?.programs.find(p => p.id === m.programId);
    const all = sessionsOf([m.group]), now = Date.now();
    const next = all.filter(s => s.status === 'scheduled' && new Date(s.start).getTime() + s.duration * 60000 > now).sort((a, b) => new Date(a.start) - new Date(b.start))[0];
    const att = P.attendance(db.state, m), lvl = P.level(m), el = P.eligibility(m), sk = P.skills(m);
    const total = program?.sessions || db.plans?.[m.plan]?.sessions || 12, st = M.status(m);
    const latest = (db.state.sportProgress || []).filter(r => r.memberId === m.id).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
    const metric = latest && d?.metrics.find(x => x.id === latest.metricId);
    const series = metric ? P.attempts(m, metric.id).map(r => r.value) : [];
    const note = (m.notes || []).slice(-1)[0];
    const fam = F?.of(db.member('m0')), owe = fam ? F.balance(fam.id) : 0;
    const isSelf = m.id === 'm0';
    const hour = new Date().getHours(), hello = hour < 12 ? 'صباح الخير' : 'مساء الخير';
    return page(`<header class="ax-top ax-top-family"><div class="ax-top-row"><div><small>${hello}</small><h2>${E(first(db.member('m0').name))}</h2></div><button type="button" class="ax-icon-btn" aria-label="الرسائل" onclick="go('msgs')">${icon('bell', 20)}</button></div>${familyChips()}</header>`,
      `<section class="ax-hero" ${sportTone(d)}><div class="ax-hero-head"><span class="ax-av big">${avatar(m.name, 56)}</span><div><small>${E(d?.ico || '')} ${E(d?.name || '')} · ${E(g?.branch || '')}</small><h3>${isSelf ? 'اشتراكي' : E(m.name)}</h3><span class="ax-hero-chips">${K.chip(lvl?.name || 'المستوى يحدد بعد التقييم', 'light')}${K.chip(g?.name || '', 'light')}</span></div></div>
        ${next ? `<div class="ax-next"><div><small>الحصة القادمة · ${E(K.until(next.start))}</small><b>${E(fmt(next.start, { weekday: 'long', day: 'numeric', month: 'short' }))}</b><span>${E(fmt(next.start, { hour: 'numeric', minute: '2-digit' }))} · ${E(next.coach || g?.coach || '')} · ${E(next.resource || g?.resource || '')}</span></div>${next.rsvp[m.id] === 'confirmed' ? `<span class="ax-confirmed">${icon('check', 16)} مؤكد</span>` : `<button type="button" class="ax-btn light" onclick="AcademyApps.confirmFor('${next.id}','${m.id}')">تأكيد الحضور</button>`}</div>` : '<div class="ax-next"><span>لا توجد حصص قادمة</span></div>'}</section>
      <div class="ax-tiles three">
        <div class="ax-stat">${K.ring(m.remaining, total, String(m.remaining), 64, st === 'active' ? 'var(--ax-brand)' : 'var(--ax-bad)')}<small>حصص متبقية</small><em>${st === 'active' ? 'حتى ' + E(fmt(m.end, { day: 'numeric', month: 'short' })) : st === 'frozen' ? 'مجمد' : 'يحتاج تجديد'}</em></div>
        <div class="ax-stat">${K.ring(att.rate, 100, att.rate + '%', 64, 'var(--ax-gold)')}<small>نسبة الحضور</small><em>${att.attended} من ${att.held} حصة</em></div>
        <div class="ax-stat">${K.ring(sk.done, sk.total || 1, sk.total ? `${sk.done}/${sk.total}` : '—', 64, 'var(--ax-info)')}<small>مهارات المستوى</small><em>${el?.eligible ? 'جاهز للترقية' : el?.next ? 'إلى ' + E(el.next.name) : ''}</em></div></div>
      ${window.PlayerCard ? (() => { const c = PlayerCard.of(m), cert = PlayerCard.certificates(m.id)[0]; return `<button type="button" class="ax-cardline ${c.tier || ''}" onclick="PlayerCard.open('${m.id}')"><span class="ax-cardline-num">${c.empty ? '—' : c.overall}</span><span><b>بطاقة ${isSelf ? 'اللاعب' : E(first(m.name))}</b><small>${c.empty ? 'تكتمل بعد أول تقييم من المدرب' : (c.trend ? (c.trend > 0 ? '▲ +' + c.trend : '▼ ' + c.trend) + ' منذ آخر تقييم · ' : '') + 'شاركها مع العيلة'}</small></span>${cert ? `<em>🏅 ${E(cert.month)}</em>` : '<i aria-hidden="true">←</i>'}</button>`; })() : ''}
      ${el?.eligible ? `<button type="button" class="ax-banner ok" onclick="go('progress')">${icon('trophy', 20)}<span><b>${isSelf ? 'أنت' : E(first(m.name))} ${el.needsExam ? 'مؤهل لاختبار' : 'مؤهل للترقية إلى'} ${E(el.next.name)}</b><small>اعرف التفاصيل</small></span></button>` : ''}
      ${owe ? `<button type="button" class="ax-banner warn" onclick="go('account')">${icon('wallet', 20)}<span><b>متبقي ${money(owe)} على العائلة</b><small>ادفع من صفحة الاشتراك</small></span></button>` : ''}
      ${K.section('هذا الأسبوع', 'كل الحصص', "go('sessions')")}${K.week(all, '', "go('sessions')")}
      ${latest ? `${K.section('آخر نتيجة', 'التقدم', "go('progress')")}<div class="ax-card ax-result"><div><small>${E(latest.label)} · ${E(fmt(latest.at, { day: 'numeric', month: 'short' }))}</small><b>${E(metric ? P.formatValue(metric, latest.value) : latest.value)}</b>${latest.note ? `<p>${E(latest.note)}</p>` : ''}</div>${K.spark(series, metric?.better === 'lower')}</div>` : ''}
      ${note ? `<div class="ax-card ax-note">${avatar(note.by || g?.coach || 'المدرب', 34)}<div><small>${E(note.by || g?.coach || 'المدرب')}</small><p>${E(note.text)}</p></div></div>` : ''}
      ${K.section('الخدمات')}${K.grid([
        { icon: 'star', label: 'بطاقة اللاعب', action: `PlayerCard.open('${m.id}')`, tone: 'brand' }, { icon: 'chart', label: 'التقدم', action: "go('progress')" }, { icon: 'cal', label: 'الحصص', action: "go('sessions')" }, { icon: 'wallet', label: 'الاشتراك', action: "go('account')" }, { icon: 'chat', label: 'الرسائل', action: "go('msgs')" },
        { icon: 'inbox', label: 'طلباتي', action: "go('myrequests')" }, { icon: 'users', label: 'المجتمع', action: APPS.member.F.community ? "go('community')" : "go('more')" }, { icon: 'more', label: 'المزيد', action: "go('more')" }])}`);
  };

  APPS.member.F.sessions = () => {
    const m = viewer(), g = group(m.group), d = sportOf(m), all = sessionsOf([m.group]).sort((a, b) => new Date(a.start) - new Date(b.start));
    const now = Date.now(), upcoming = all.filter(s => s.status !== 'ended' && new Date(s.start).getTime() + s.duration * 60000 > now), past = all.filter(s => s.status === 'ended' || new Date(s.start).getTime() + s.duration * 60000 <= now).reverse().slice(0, 12);
    const att = P.attendance(db.state, m);
    const card = s => { const st = statusOf(s, m.id), cancelled = s.status === 'cancelled';
      return `<article class="ax-session ${cancelled ? 'cancelled' : ''}"><div class="ax-date"><small>${E(fmt(s.start, { weekday: 'short' }))}</small><b>${new Date(s.start).getDate()}</b><small>${E(fmt(s.start, { month: 'short' }))}</small></div><div class="ax-session-main"><b>${E(fmt(s.start, { hour: 'numeric', minute: '2-digit' }))} · ${s.duration} دقيقة</b><small>${E(s.coach || g?.coach || '')} · ${E(s.resource || g?.resource || '')}</small>${cancelled ? `<small class="bad">${E(s.scheduleReason || 'الحصة ملغاة')}</small>` : ''}</div>
        <div class="ax-session-end">${st ? K.chip(st[0], st[1]) : cancelled ? K.chip('ملغاة', 'bad') : s.rsvp[m.id] === 'confirmed' ? K.chip('مؤكد', 'ok') : `<button type="button" class="ax-btn small" onclick="AcademyApps.confirmFor('${s.id}','${m.id}')">تأكيد</button>`}</div></article>`; };
    return page(`<header class="ax-top ax-top-family"><div class="ax-top-row"><div><small>${E(d?.name || '')} · ${E(g?.name || '')}</small><h2>الحصص</h2></div></div>${familyChips()}</header>`,
      `<div class="ax-card ax-summary">${K.ring(att.rate, 100, att.rate + '%', 70, 'var(--ax-gold)')}<div><b>نسبة الالتزام</b><small>حضر ${att.attended} من ${att.held} حصة منتهية</small><small>${E(SC ? SC.describe(g) : '')}</small></div></div>
      ${K.section('القادمة')}${upcoming.slice(0, 8).map(card).join('') || K.empty('لا توجد حصص قادمة', 'تظهر مواعيد الجروب هنا.')}
      ${past.length ? K.section('السابقة') + past.map(card).join('') : ''}`);
  };

  const baseProgress = APPS.member.F.progress;
  APPS.member.F.progress = () => {
    const m = viewer(), d = sportOf(m);
    if (!d || (d.id === 'football' && !m.sportLevel)) return baseProgress();
    const el = P.eligibility(m), sk = P.skills(m), hist = P.history(m.id), idx = d.levels.findIndex(l => l.id === m.sportLevel);
    const metrics = d.metrics.map(mt => ({ mt, rows: P.attempts(m, mt.id) })).filter(x => x.rows.length);
    const badges = [hist.length > 1 && ['trophy', 'ترقية مستوى'], P.attendance(db.state, m).rate >= 90 && ['check', 'حضور ممتاز'], metrics.some(x => x.rows.length > 1 && (x.mt.better === 'lower' ? x.rows.at(-1).value < x.rows[0].value : x.rows.at(-1).value > x.rows[0].value)) && ['chart', 'تحسن مستمر'], sk.total && sk.done === sk.total && ['star', 'أتقن المهارات']].filter(Boolean);
    return page(`<header class="ax-top ax-top-family"><div class="ax-top-row"><div><small>${E(d.ico)} ${E(d.name)}</small><h2>التقدم الرياضي</h2></div></div>${familyChips()}</header>`,
      `${window.PlayerCard ? `<button type="button" class="ax-cardpreview" onclick="PlayerCard.open('${m.id}')" aria-label="فتح بطاقة اللاعب">${PlayerCard.svg(m, { width: 210 })}<span>اضغط للمشاركة</span></button>` : ''}<section class="ax-hero" ${sportTone(d)}><small>المستوى الحالي</small><h3>${E(el.level?.name || 'يحدد بعد أول تقييم')}</h3>
        <div class="ax-path">${d.levels.filter(l => l.active).map((l, i) => `<span class="${d.levels.indexOf(l) < idx ? 'done' : l.id === m.sportLevel ? 'on' : ''}" title="${E(l.name)}"></span>`).join('')}</div>
        ${el.next ? `<p>التالي: <b>${E(el.next.name)}</b> ${el.eligible ? '· ' + (el.needsExam ? 'مؤهل للاختبار' : 'مؤهل للترقية') : ''}</p>` : '<p>آخر مستوى في البرنامج</p>'}</section>
      ${el.checks.length ? `<div class="ax-card ax-checks">${el.checks.map(c => `<div class="${c.ok ? 'ok' : ''}"><span>${c.ok ? icon('check', 16) : ''}</span><b>${E(c.label)}</b><small>${E(c.detail)}</small></div>`).join('')}</div>` : ''}
      ${badges.length ? `${K.section('الإنجازات')}<div class="ax-badges">${badges.map(([i, t]) => `<span>${icon(i, 22)}<small>${t}</small></span>`).join('')}</div>` : ''}
      ${sk.total ? `${K.section(`مهارات ${el.level?.name || ''}`)}<div class="ax-skills">${sk.skills.map(s => `<div class="${s.done ? 'done' : ''}"><span>${s.done ? icon('check', 16) : ''}</span><b>${E(s.name)}</b>${s.done && s.at ? `<small>${E(fmt(s.at, { day: 'numeric', month: 'short' }))}</small>` : '<small>قيد التدريب</small>'}</div>`).join('')}</div>` : ''}
      ${K.section('النتائج')}${metrics.map(({ mt, rows }) => { const b = P.best(m, mt); return `<div class="ax-card ax-metric"><div><b>${E(mt.name)}</b><small>أفضل ${E(P.formatValue(mt, b.value))} · ${rows.length} محاولات</small></div>${K.spark(rows.map(r => r.value), mt.better === 'lower')}<strong>${E(P.formatValue(mt, rows.at(-1).value))}</strong></div>`; }).join('') || K.empty('لا توجد نتائج بعد', 'تقييمات المدرب تظهر هنا.', 'chart')}
      ${hist.length ? `${K.section('سجل المستويات')}<div class="ax-timeline">${hist.map(h => `<div><i></i><b>${E(h.levelName)}</b><small>${E(fmt(h.at, { day: 'numeric', month: 'short', year: 'numeric' }))} · ${E(h.reason)}</small></div>`).join('')}</div>` : ''}`);
  };

  APPS.member.F.more = () => page(`<header class="ax-top"><div class="ax-top-row"><div><small>${E(viewer().name)}</small><h2>المزيد</h2></div></div></header>`,
    K.grid([['inbox', 'طلباتي', 'myrequests'], ['chat', 'ملاحظات المدرب', 'feedback'], ['send', 'الرسائل', 'msgs'], ['users', 'المجتمع', 'community'], ['food', 'التغذية', 'food'], ['star', 'تقييم الحصة', 'rate'], ['search', 'المفقودات', 'lost'], ['box', 'المتجر', 'shop'], ['ball', 'الرياضات', 'sports'], ['more', 'خدمات إضافية', 'legacyservices']].filter(([, , r]) => APPS.member.F[r]).map(([i, l, r]) => ({ icon: i, label: l, action: `go('${r}')` }))));

  /* =========================================================== coach */
  const scopeSessions = () => AA.scope().sessions;
  APPS.coach.F.home = () => {
    const a = AA.scope(), d = SE.get(AA.sport), now = Date.now(), todayKey = dayKey(new Date());
    const live = a.sessions.find(s => s.status === 'scheduled' && new Date(s.start).getTime() - 30 * 60000 <= now && new Date(s.start).getTime() + s.duration * 60000 >= now);
    const next = live || a.sessions.filter(s => s.status === 'scheduled' && new Date(s.start).getTime() > now).sort((x, y) => new Date(x.start) - new Date(y.start))[0];
    const g = next && group(next.group), roster = next ? db.state.members.filter(m => m.group === next.group) : [];
    const coach = g?.coach || a.groups[0]?.coach || d?.terms.coach || 'المدرب';
    const today = a.sessions.filter(s => dayKey(s.start) === todayKey && s.status !== 'cancelled').sort((x, y) => new Date(x.start) - new Date(y.start));
    const health = roster.filter(m => m.medical), unpaid = roster.filter(m => !(m.remaining > 0 && new Date(m.end) >= new Date()));
    const eligible = a.members.filter(m => m.sportLevel && P.eligibility(m)?.eligible).length;
    const tools = SE.tools(AA.sport);
    return page(`<header class="ax-top"><div class="ax-top-row"><div><small>مساحة التدريب</small><h2>${E(coach)}</h2></div><button type="button" class="ax-icon-btn" aria-label="تصفية" onclick="AppKit.filters()">${icon('list', 20)}</button></div>${sportChips()}</header>`,
      `${next ? `<section class="ax-hero" ${sportTone(d)}><small>${live ? 'الحصة الآن' : 'الحصة القادمة · ' + E(K.until(next.start))}</small><h3>${E(g?.name)}</h3><p>${E(fmt(next.start, { weekday: 'long', hour: 'numeric', minute: '2-digit' }))} · ${E(next.resource || g?.resource || '')}</p>
        <div class="ax-hero-row">${K.stack(roster.map(m => m.name))}<span>${live ? Object.values(next.present).filter(Boolean).length + ' حاضر' : roster.filter(m => next.rsvp[m.id] === 'confirmed').length + ' أكد'} من ${roster.length}</span></div>
        <div class="ax-hero-actions"><button type="button" class="ax-btn light" onclick="AcademyApps.sessionId='${next.id}';go('attend')">${icon('check', 18)} ${live ? 'سجّل الحضور' : 'كشف الحضور'}</button>${window.PlayerCard ? `<button type="button" class="ax-btn ghost" onclick="PlayerCard.rateSession('${next.id}')">${icon('star', 18)} تقييم الحصة</button>` : ''}</div></section>` : K.empty('لا توجد حصص قادمة', 'الحصص بتتولد من جدول الجروب.')}
      ${health.length || unpaid.length || eligible ? `<div class="ax-alerts">${health.length ? `<span class="warn">${icon('bell', 16)} ${health.length} ملاحظة صحية</span>` : ''}${unpaid.length ? `<span class="bad">${icon('wallet', 16)} ${unpaid.length} بدون اشتراك</span>` : ''}${eligible ? `<button type="button" class="ok" onclick="go('levels')">${icon('trophy', 16)} ${eligible} مؤهل للترقية</button>` : ''}</div>` : ''}
      ${K.section('جدول اليوم', 'الأسبوع', "go('sessions')")}${today.map(s => { const gg = group(s.group), r = db.state.members.filter(m => m.group === s.group); return `<button type="button" class="ax-slot ${s.status === 'ended' ? 'done' : ''}" onclick="AcademyApps.sessionId='${s.id}';go('attend')"><time>${E(fmt(s.start, { hour: 'numeric', minute: '2-digit' }))}</time><span><b>${E(gg?.name)}</b><small>${E(s.resource || gg?.resource || '')} · ${r.length} لاعب</small></span>${K.chip(s.status === 'ended' ? 'انتهت' : 'مجدولة', s.status === 'ended' ? '' : 'ok')}</button>`; }).join('') || K.empty('لا توجد حصص اليوم', 'استمتع بيومك.')}
      ${K.section('أدوات ' + (d?.name || ''))}${tools.length ? K.grid(tools.map(t => ({ icon: toolIcon[t.key] || 'bolt', label: t.title, action: t.action }))) : K.empty('لا توجد أدوات مفعلة', 'فعّلها من إعدادات الرياضة.', 'bolt')}`);
  };

  AA.dayPick = AA.dayPick || dayKey(new Date());
  const staffSessions = () => {
    const a = AA.scope(), d = SE.get(AA.sport), day = AA.dayPick;
    const list = a.sessions.filter(s => dayKey(s.start) === day).sort((x, y) => new Date(x.start) - new Date(y.start));
    return page(staffTop('الحصص', d?.name || ''), `${K.week(a.sessions, day, "AcademyApps.dayPick='$';draw()")}
      ${K.section(fmt(day + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' }))}${list.map(s => { const g = group(s.group), roster = db.state.members.filter(m => m.group === s.group), present = roster.filter(m => s.present[m.id]).length;
        return `<button type="button" class="ax-card ax-session-card ${s.status}" onclick="AcademyApps.sessionId='${s.id}';go('${S.app === 'coach' ? 'attend' : 'sessiondetail'}')"><div class="ax-session-card-head"><time>${E(fmt(s.start, { hour: 'numeric', minute: '2-digit' }))}</time>${K.chip(s.status === 'ended' ? 'انتهت' : s.status === 'cancelled' ? 'ملغاة' : 'مجدولة', s.status === 'ended' ? '' : s.status === 'cancelled' ? 'bad' : 'ok')}</div><b>${E(g?.name)}</b><small>${E(s.coach || g?.coach || '')} · ${E(s.resource || g?.resource || '')} · ${s.duration} دقيقة</small><div class="ax-hero-row">${K.stack(roster.map(m => m.name))}<span>${s.status === 'ended' ? present + ' حضروا' : roster.filter(m => s.rsvp[m.id] === 'confirmed').length + ' أكدوا'} من ${roster.length}</span></div></button>`; }).join('') || K.empty('لا توجد حصص في هذا اليوم', 'اختر يومًا آخر من الشريط.')}`);
  };
  APPS.coach.F.sessions = staffSessions;
  APPS.manager.F.gsess = staffSessions;

  AA.playerFilter = AA.playerFilter || 'all';
  AA.playerQuery = AA.playerQuery || '';
  const playersPage = () => {
    const a = AA.scope(), d = SE.get(AA.sport), now = new Date();
    const due = id => db.state.invoices.filter(i => i.memberId === id).reduce((n, i) => n + Math.max(0, i.total - i.paid), 0);
    const filters = S.app === 'manager' ? [['all', 'الكل'], ['dues', 'عليه متبقي'], ['expired', 'منتهي'], ['renew', 'تجديد قريب']] : [['all', 'الكل'], ['health', 'ملاحظة صحية'], ['unpaid', 'بدون اشتراك'], ['eligible', 'مؤهل']];
    const test = m => { const st = M.status(m, now); switch (AA.playerFilter) {
      case 'dues': return due(m.id) > 0; case 'expired': return st === 'expired'; case 'renew': return st === 'active' && (m.remaining <= 2 || new Date(m.end) <= new Date(now.getTime() + 7 * 86400000));
      case 'health': return !!m.medical; case 'unpaid': return st !== 'active'; case 'eligible': return m.sportLevel && P.eligibility(m)?.eligible; default: return true; } };
    const q = AA.playerQuery.trim();
    const rows = a.members.filter(test).filter(m => !q || m.name.includes(q) || (m.phone || '').includes(q) || (m.guardian?.phone || '').includes(q));
    return page(staffTop(d?.terms.players || 'اللاعبون', `${a.members.length} في ${d?.name || ''}`), `<label class="ax-search">${icon('search', 18)}<input placeholder="ابحث بالاسم أو الموبايل" value="${E(q)}" oninput="AcademyApps.playerQuery=this.value;clearTimeout(AcademyApps._t);AcademyApps._t=setTimeout(()=>{draw();const i=document.querySelector('.ax-search input');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)"></label>
      <div class="ax-filter">${filters.map(([k, l]) => `<button type="button" class="${AA.playerFilter === k ? 'on' : ''}" onclick="AcademyApps.playerFilter='${k}';draw()">${l}</button>`).join('')}</div>
      ${rows.map(m => { const st = M.status(m, now), att = attOf(m), lvl = P.level(m), owe = due(m.id), age = F?.age(m.dob);
        return K.row({ name: m.name, title: m.name, sub: `${E(group(m.group)?.name || '')}${age != null ? ' · ' + age + ' سنة' : ''}`, chips: `${lvl ? K.chip(lvl.name) : ''}${st !== 'active' ? K.chip(st === 'frozen' ? 'مجمد' : 'منتهي', st === 'frozen' ? 'info' : 'bad') : ''}${owe ? K.chip('متبقي ' + money(owe), 'warn') : ''}${m.medical ? K.chip('⚕ ' + m.medical, 'warn') : ''}`,
          trailing: `<span class="ax-att">${K.bar(att.rate, att.rate < 60 ? 'bad' : '')}<small>${att.rate}%</small></span>`, action: S.app === 'coach' && window.PlayerCard ? `PlayerCard.open('${m.id}')` : `Refine.profile('${m.id}')` }); }).join('') || K.empty('لا توجد نتائج', 'غيّر البحث أو الفلتر.', 'users')}`);
  };
  APPS.coach.F.players = playersPage;
  APPS.manager.F.members = playersPage;

  APPS.coach.F.sporttools = () => {
    const d = SE.get(AA.sport), tools = SE.tools(AA.sport);
    const recent = (db.state.sportProgress || []).filter(r => r.sport === AA.sport && AA.scope().members.some(m => m.id === r.memberId)).sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 6);
    return page(staffTop('أدوات ' + (d?.name || ''), 'اختر المهمة المناسبة لحصتك'), `${tools.length ? K.grid(tools.map(t => ({ icon: toolIcon[t.key] || 'bolt', label: t.title, action: t.action }))) : K.empty('لا توجد أدوات مفعلة', 'فعّلها من إعدادات الرياضة.', 'bolt')}
      ${K.section('آخر التقييمات')}${recent.map(r => { const mt = d.metrics.find(x => x.id === r.metricId); return K.row({ name: db.member(r.memberId).name, title: db.member(r.memberId).name, sub: `${E(r.label)} · ${E(fmt(r.at, { day: 'numeric', month: 'short' }))}`, trailing: `<b class="ax-value">${E(mt ? P.formatValue(mt, r.value) : r.value)}</b>` }); }).join('') || K.empty('لم تسجل تقييمات بعد', 'كل محاولة جديدة تحفظ في سجل اللاعب.', 'chart')}`);
  };

  APPS.coach.F.levels = () => {
    const a = AA.scope(), d = SE.get(AA.sport);
    const rows = a.members.map(m => ({ m, el: P.eligibility(m) }));
    const order = x => x.el.eligible ? 0 : x.el.unassigned ? 1 : x.el.next ? 2 : 3;
    rows.sort((x, y) => order(x) - order(y));
    const unassigned = rows.filter(x => x.el.unassigned).length, eligible = rows.filter(x => x.el.eligible).length;
    const exam = d.modules.includes('exams') ? P.exams(d.id).find(e => e.status === 'scheduled') : null;
    return page(staffTop(d.type === 'ranks' ? 'الأحزمة والأهلية' : 'المستويات والترقية', 'محسوبة من المهارات والحضور وعدد الحصص'),
      `<div class="ax-tiles">${K.tile({ icon: 'trophy', label: 'مؤهلون', value: eligible, sub: d.promotion.exam ? 'للاختبار' : 'للترقية', tone: eligible ? 'ok' : '' })}${K.tile({ icon: 'user', label: 'بدون مستوى', value: unassigned, sub: 'قيّمهم وحدد المستوى', tone: unassigned ? 'warn' : '' })}</div>
      ${exam ? `<button type="button" class="ax-banner warn" onclick="AcademyApps.examPanel()">${icon('trophy', 20)}<span><b>اختبار ترقية ${E(fmt(exam.date + 'T12:00', { weekday: 'long', day: 'numeric', month: 'short' }))}</b><small>${exam.candidates.length} متقدمين · ${exam.candidates.filter(c => c.result).length} نتائج مسجلة</small></span></button>` : d.modules.includes('exams') ? `<button type="button" class="ax-banner" onclick="AcademyApps.examForm()">${icon('plus', 20)}<span><b>جدولة اختبار ترقية</b><small>لا يوجد اختبار قادم</small></span></button>` : ''}
      ${rows.map(({ m, el }) => { const sk = P.skills(m), state = el.unassigned ? ['بدون مستوى', 'warn'] : !el.next ? ['آخر مستوى', ''] : el.eligible ? [el.needsExam ? 'مؤهل للاختبار' : 'مؤهل', 'ok'] : ['يستكمل', ''];
        const act = el.unassigned ? `AcademyApps.promoteForm('${m.id}')` : el.eligible && !el.needsExam ? `AcademyApps.promoteForm('${m.id}','${el.next.id}')` : el.eligible && exam && !exam.candidates.some(c => c.memberId === m.id) ? `AcademyApps.toExam('${m.id}')` : `Refine.profile('${m.id}')`;
        return K.row({ name: m.name, title: m.name, sub: el.unassigned ? 'قيّمه وحدد مستواه' : `${E(el.level?.name)}${el.next ? ' ← ' + E(el.next.name) : ''}`, chips: `${K.chip(state[0], state[1])}${sk.total ? K.chip(`مهارات ${sk.done}/${sk.total}`) : ''}${el.unassigned ? '' : el.checks.filter(c => !c.ok && c.label !== 'مهارات المستوى').map(c => K.chip(c.detail)).join('')}`,
          trailing: el.unassigned ? '<span class="ax-btn small">تحديد</span>' : el.eligible && !el.needsExam ? '<span class="ax-btn small">ترقية</span>' : '', action: act }); }).join('') || K.empty('لا يوجد لاعبون', 'سجّل لاعبين في جروب هذه الرياضة.', 'users')}`);
  };
  AA.examPanel = () => {
    const d = SE.get(AA.sport), exam = P.exams(d.id).find(e => e.status === 'scheduled');
    if (!exam) return;
    V.open(`<div class="ma-form"><h3>اختبار الترقية</h3><p class="ma-note">${E(fmt(exam.date + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' }))} ${E(exam.time || '')} · ${E(exam.place)} · ${E(exam.examiner)}</p>
      ${exam.candidates.map(c => { const m = db.member(c.memberId), to = d.levels.find(l => l.id === c.levelId); return K.row({ name: m.name, title: m.name, sub: 'إلى ' + E(to?.name), trailing: c.result ? K.chip(c.result === 'pass' ? 'ناجح' + (c.score != null ? ' · ' + c.score : '') : 'يعيد', c.result === 'pass' ? 'ok' : 'warn') : '<span class="ax-btn small">النتيجة</span>', action: c.result ? '' : `AcademyApps.examResultForm('${exam.id}','${m.id}')` }); }).join('') || '<p class="ma-note">أضف المؤهلين من القائمة.</p>'}</div>`);
  };

  /* Subscription for the chosen player, with the renewal form. */
  const baseAccount = APPS.member.F.account;
  APPS.member.F.account = () => {
    const m = viewer(), d = sportOf(m), p = d?.programs.find(x => x.id === m.programId) || (m.id !== 'm0' ? d?.programs[0] : null);
    if (!p) return baseAccount();
    const st = M.status(m), daysLeft = Math.max(0, Math.ceil((new Date(m.end) - Date.now()) / 86400000));
    const inv = db.state.invoices.filter(i => i.memberId === m.id).sort((a, b) => new Date(b.created) - new Date(a.created));
    const tx = db.state.transactions.filter(t => t.memberId === m.id).sort((a, b) => new Date(b.at) - new Date(a.at));
    const pending = db.state.requests.find(r => r.memberId === m.id && r.type === 'payment' && r.status === 'pending');
    const fam = F?.of(m), others = fam ? F.members(fam.id).filter(x => x.id !== m.id && F.active(x)) : [], disc = others.length ? Number(db.state.settings?.siblingDiscount ?? 10) : 0, due = Math.round(p.price * (1 - disc / 100));
    return page(`<header class="ax-top ax-top-family"><div class="ax-top-row"><div><small>${E(d.name)} · ${E(p.name)}</small><h2>الاشتراك</h2></div></div>${familyChips()}</header>`,
      `<section class="ax-hero" ${sportTone(d)}><div class="ax-sub-hero">${K.ring(m.remaining, p.sessions, String(m.remaining), 86, '#fff')}<div><small>${st === 'active' ? 'ساري' : st === 'frozen' ? 'مجمد' : 'يحتاج تجديد'}</small><h3>${m.remaining} حصص متبقية</h3><p>${st === 'active' ? `${daysLeft} يوم · حتى ${E(fmt(m.end, { day: 'numeric', month: 'long' }))}` : 'جدّد لمواصلة الحصص'}</p></div></div><p class="ax-fine">ينتهي الاشتراك بالتاريخ أو باستهلاك الحصص، أيهما أولًا.</p></section>
      ${inv.filter(i => i.paid < i.total).map(i => `<div class="ax-banner warn">${icon('wallet', 20)}<span><b>متبقي ${money(i.total - i.paid)}</b><small>${E(i.planLabel || '')} · ادفعه في الفرع أو بتحويل</small></span></div>`).join('')}
      ${pending ? `<div class="ax-banner">${icon('clock', 20)}<span><b>طلب التجديد قيد المراجعة</b><small>${E(pending.payload.method)} · الاستقبال هيأكد قريبًا</small></span></div>` : `${K.section('تجديد الاشتراك')}<div class="ax-card ax-renew"><div class="ax-bill"><div><span>${E(p.name)} · ${p.sessions} حصة</span><b>${money(p.price)}</b></div>${disc ? `<div class="ok"><span>خصم الإخوات ${disc}%</span><b>− ${money(p.price - due)}</b></div>` : ''}<div class="total"><span>المطلوب</span><b>${money(due)}</b></div></div>
        <div class="ax-methods">${['إنستاباي', 'فودافون كاش', 'كاش في الفرع'].map((x, i) => `<label><input type="radio" name="pa-method-r" value="${x}" ${i === 0 ? 'checked' : ''} onchange="document.getElementById('pa-method').value=this.value"><span>${x}</span></label>`).join('')}</div><input type="hidden" id="pa-method" value="إنستاباي">
        <label class="ax-field">رقم عملية التحويل<input id="pa-ref" inputmode="numeric" placeholder="لا يلزم للكاش في الفرع"></label><button type="button" class="ax-btn" onclick="AcademyApps.renew('${m.id}',${disc})">إرسال طلب التجديد</button></div>`}
      ${K.section('الإيصالات')}${tx.map(t => K.row({ title: `${t.kind === 'refund' ? 'استرداد' : 'دفع'} ${money(t.amount)}`, sub: `${E(fmt(t.at, { day: 'numeric', month: 'long' }))} · ${E(t.method)}`, trailing: icon('chev', 18), action: `V.receipt('${t.id}')` })).join('') || K.empty('لا توجد إيصالات', 'تظهر بعد أول دفعة.', 'wallet')}`);
  };

  /* =========================================================== manager */
  APPS.manager.F.home = () => {
    const a = AA.scope(), now = new Date(), day = dayKey(now), d = SE.get(AA.sport);
    const due = id => db.state.invoices.filter(i => i.memberId === id).reduce((n, i) => n + Math.max(0, i.total - i.paid), 0);
    const owed = a.members.filter(m => due(m.id) > 0), expired = a.members.filter(m => M.status(m, now) === 'expired');
    const renew = a.members.filter(m => M.status(m, now) === 'active' && (m.remaining <= 2 || new Date(m.end) <= new Date(now.getTime() + 7 * 86400000)));
    const pending = a.requests.filter(r => r.status === 'pending');
    const ids = new Set(a.members.map(m => m.id)), tasks = db.state.followups.filter(f => f.status === 'open' && ids.has(f.memberId) && f.due <= day);
    const series = Array.from({ length: 7 }, (_, i) => { const x = new Date(now); x.setDate(x.getDate() - 6 + i); const k = dayKey(x); return a.transactions.filter(t => dayKey(t.at) === k).reduce((n, t) => n + (t.kind === 'refund' ? -t.amount : t.amount), 0); });
    const max = Math.max(1, ...series);
    const today = a.sessions.filter(s => dayKey(s.start) === day && s.status !== 'cancelled').sort((x, y) => new Date(x.start) - new Date(y.start));
    return page(staffTop('يوم الفرع', AA.branch === 'all' ? 'كل الفروع' : AA.branch),
      `<section class="ax-hero" ${sportTone(d)}><small>تحصيل اليوم</small><h3>${money(series[6])}</h3><div class="ax-mini-bars">${series.map((v, i) => `<i style="height:${Math.max(6, v / max * 100)}%" class="${i === 6 ? 'on' : ''}"></i>`).join('')}</div><p>${money(series.reduce((n, v) => n + v, 0))} خلال 7 أيام</p></section>
      <div class="ax-tiles">${K.tile({ icon: 'users', label: 'اشتراكات نشطة', value: a.members.length - expired.length, sub: 'من ' + a.members.length, action: "go('members')" })}${K.tile({ icon: 'cal', label: 'حصص اليوم', value: today.length, sub: a.groups.length + ' جروب', action: "go('gsess')" })}${K.tile({ icon: 'wallet', label: 'متبقي', value: money(owed.reduce((n, m) => n + due(m.id), 0)), sub: owed.length + ' لاعب', tone: owed.length ? 'warn' : '', action: "go('collect')" })}${K.tile({ icon: 'inbox', label: 'طلبات', value: pending.length, sub: 'تنتظر قرارك', tone: pending.length ? 'warn' : '', action: "go('requests')" })}</div>
      ${K.section('إجراءات سريعة')}${K.grid([{ icon: 'plus', label: 'تسجيل لاعب', action: "go('newm')", tone: 'brand' }, { icon: 'wallet', label: 'تحصيل', action: "go('collect')", badge: owed.length || '' }, { icon: 'inbox', label: 'الطلبات', action: "go('requests')", badge: pending.length || '' }, { icon: 'chat', label: 'الرسائل', action: APPS.manager.F.gchats ? "go('gchats')" : "go('gmore')" }])}
      ${renew.length || expired.length || tasks.length ? `${K.section('محتاج متابعة')}${[...renew.slice(0, 3).map(m => K.row({ name: m.name, title: m.name, sub: 'تجديد قريب · ' + m.remaining + ' حصص · ينتهي ' + E(fmt(m.end, { day: 'numeric', month: 'short' })), trailing: K.chip('تجديد', 'warn'), action: `V.open(V.collectForm('${m.id}'))` })), ...expired.slice(0, 3).map(m => K.row({ name: m.name, title: m.name, sub: 'الاشتراك منتهي', trailing: K.chip('منتهي', 'bad'), action: `V.open(V.collectForm('${m.id}'))` })), ...tasks.slice(0, 3).map(t => K.row({ name: db.member(t.memberId).name, title: db.member(t.memberId).name, sub: E(t.note || ''), trailing: K.chip('متابعة'), action: "go('followups')" }))].join('')}` : ''}
      ${K.section('حصص اليوم', 'الأسبوع', "go('gsess')")}${today.map(s => { const g = group(s.group); return `<div class="ax-slot"><time>${E(fmt(s.start, { hour: 'numeric', minute: '2-digit' }))}</time><span><b>${E(g?.name)}</b><small>${E(s.coach || g?.coach || '')} · ${E(s.resource || '')}</small></span></div>`; }).join('') || K.empty('لا توجد حصص اليوم', 'في الرياضة والفرع المختارين.')}`);
  };

  APPS.manager.F.collect = () => {
    const a = AA.scope(), now = new Date(), due = id => db.state.invoices.filter(i => i.memberId === id).reduce((n, i) => n + Math.max(0, i.total - i.paid), 0);
    const rank = m => due(m.id) > 0 ? 0 : M.status(m, now) === 'expired' ? 1 : (m.remaining <= 2 || new Date(m.end) <= new Date(now.getTime() + 7 * 86400000)) ? 2 : 3;
    const rows = a.members.map(m => ({ m, r: rank(m) })).filter(x => x.r < 3).sort((x, y) => x.r - y.r || due(y.m.id) - due(x.m.id));
    const total = a.members.reduce((n, m) => n + due(m.id), 0), labels = [['عليه متبقي', 'warn'], ['منتهي', 'bad'], ['تجديد قريب', '']];
    return page(staffTop('التحصيل', 'الأولوية: المتبقي ثم المنتهي ثم التجديد'), `<div class="ax-tiles">${K.tile({ icon: 'wallet', label: 'متبقي للتحصيل', value: money(total), sub: rows.filter(x => x.r === 0).length + ' لاعب', tone: total ? 'warn' : '' })}${K.tile({ icon: 'clock', label: 'تجديد ومنتهي', value: rows.filter(x => x.r > 0).length, sub: 'تواصل معهم' })}</div>
      ${rows.map(({ m, r }) => { const owe = due(m.id), inv = db.state.invoices.find(i => i.memberId === m.id && i.paid < i.total);
        return K.row({ name: m.name, title: m.name, sub: `${E(group(m.group)?.name || '')} · ${m.remaining} حصص · ينتهي ${E(fmt(m.end, { day: 'numeric', month: 'short' }))}`, chips: K.chip(labels[r][0] + (owe ? ' · ' + money(owe) : ''), labels[r][1]), trailing: `<span class="ax-btn small">${inv ? 'استكمال' : 'تجديد'}</span>`, action: inv ? `V.settleForm('${inv.id}')` : `V.open(V.collectForm('${m.id}'))` }); }).join('') || K.empty('لا يوجد تحصيل مستحق', 'كل الاشتراكات سارية.', 'check')}
      ${K.section('آخر الإيصالات')}${a.transactions.slice().sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 5).map(t => K.row({ name: db.member(t.memberId).name, title: db.member(t.memberId).name, sub: `${money(t.amount)} · ${E(t.method)} · ${E(fmt(t.at, { day: 'numeric', month: 'short' }))}`, trailing: icon('chev', 18), action: `V.receipt('${t.id}')` })).join('')}`);
  };

  APPS.manager.F.gmore = () => page(staffTop('المزيد', 'خدمات الفرع'), K.grid([['users', 'اللاعبون', 'members'], ['plus', 'تسجيل لاعب', 'newm'], ['wallet', 'التحصيل', 'collect'], ['inbox', 'الطلبات', 'requests'], ['chat', 'الرسائل', 'gchats'], ['list', 'المتابعات', 'followups'], ['users', 'العملاء المحتملون', 'leads'], ['clock', 'قائمة الانتظار', 'waitlist'], ['box', 'الوردية', 'shifts'], ['search', 'المفقودات', 'glost'], ['users', 'مجتمع النادي', 'community']].filter(([, , r]) => APPS.manager.F[r]).map(([i, l, r]) => ({ icon: i, label: l, action: `go('${r}')` }))));

  /* Bottom tabs: the sport switch lives in the header now. */
  const configure = AA.configure.bind(AA);
  AA.configure = function () {
    configure();
    const football = AA.sport === 'football';
    APPS.member.tabs = [['home', 'home', 'الرئيسية'], ['sessions', 'cal', 'الحصص'], ['progress', 'chart', 'التقدم'], ['account', 'wallet', 'الاشتراك'], ['more', 'more', 'المزيد']];
    APPS.coach.tabs = [['home', 'home', 'الرئيسية'], ['sessions', 'cal', 'الحصص'], ['attend', 'check', 'الحضور'], [football ? 'teams' : 'sporttools', football ? 'bolt' : 'star', football ? 'التقسيمة' : 'الأدوات'], ['players', 'users', 'اللاعبون']];
    APPS.manager.tabs = [['home', 'home', 'الرئيسية'], ['gsess', 'cal', 'الحصص'], ['members', 'users', 'اللاعبون'], ['collect', 'wallet', 'التحصيل'], ['gmore', 'more', 'المزيد']];
    if (!APPS.member.list.some(x => x[0] === 'progress')) APPS.member.list.push(['progress', 'التقدم الرياضي']);
    APPS.member.sub.progress = 'progress'; APPS.member.sub.sessions = 'sessions';
  };
  AA.configure();
  document.body.classList.add('apps-v2');
  draw();
})();

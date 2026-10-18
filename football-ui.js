/* Football pathway screens: the age-group overview, each squad, and each player's
   development profile in the dashboard; development tools for the coach and the
   development plan for the player and parent in the apps. */
(function () {
  'use strict';
  const FC = window.FootballCore;
  if (!FC || typeof V === 'undefined') return;
  const db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  const short = v => fmt(v, { day: 'numeric', month: 'short' });
  const KEYS = Object.keys(FC.CORNERS);
  const avatar = (name, size = 40) => window.KoraAvatars ? `<span class="fb-av" style="width:${size}px;height:${size}px">${KoraAvatars.portrait(name)}</span>` : `<span class="fb-av fb-ini" style="width:${size}px;height:${size}px">${E(String(name)[0])}</span>`;
  const group = id => db.state.groups.find(g => g.id === id);
  const FU = window.FootballUI = { squadId: '', playerId: '', filter: 'all' };
  /* Line icons in the sidebar's style for the home's actions and the work journey. */
  const ICON = { search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3', userPlus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', calendar: 'M3 5h18v16H3zM7 3v4M17 3v4M3 11h18', plan: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM9 12h6M9 16h4', target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 12h.01', trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3', chart: 'M3 3v18h18M7 15v2M11 11v6M15 7v10M19 12v5', card: 'M2 6h20v13H2zM2 10h20M6 15h4', activity: 'M22 12h-4l-3 9L9 3l-3 9H2', bandage: 'M10.5 20.5 3.5 13.5a3.5 3.5 0 0 1 0-5l5-5a3.5 3.5 0 0 1 5 0l7 7a3.5 3.5 0 0 1 0 5l-5 5a3.5 3.5 0 0 1-5 0zM9 12h.01M12 9h.01M12 15h.01M15 12h.01', ruler: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2', layers: 'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5', whistle: 'M2 12a6 6 0 1 0 12 0 6 6 0 0 0-12 0M14 9h8v4h-6M8 12h.01', ball: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7.5l4 2.9-1.5 4.7h-5L8 10.4zM12 3v4.5M16 10.4l4.3-1.4M14.5 15.1l2.7 3.7M9.5 15.1l-2.7 3.7M8 10.4 3.7 9' };
  const svg = (k, n = 22) => `<svg viewBox="0 0 24 24" width="${n}" height="${n}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[k] || ICON.target}"/></svg>`;
  FU.icon = svg;
  /* Football here is an academy, not casual team games: no league or matches between
     training groups and no player-of-the-match votes; the team split stays as a training tool. */
  if (window.SportEngine) {
    const SE = window.SportEngine, tools = SE.tools, admin = SE.adminTools;
    const clean = (id, list) => SE.get(id)?.id === 'football' || id === 'football' ? list.filter(t => !['matches', 'league'].includes(t.key)).map(t => t.key === 'teams' ? { ...t, title: 'تقسيمة التمرين' } : t.key === 'ratings' ? { ...t, title: 'تقييم الحصة' } : t) : list;
    SE.tools = id => clean(id, tools(id));
    if (admin) SE.adminTools = id => clean(id, admin(id));
  }
  window.SportDescriptions = Object.assign(window.SportDescriptions || {}, { football: 'مدرسة الكرة بالاشتراك ومسار الاحتراف: فرق بسنة الميلاد، تقييم كل 8 أسابيع على 4 محاور، وخطة تطوير لكل لاعب.' });
  window.SportExtraTools = Object.assign(window.SportExtraTools || {}, { football: [['المراحل السنية', 'فرق المسار والتقييمات المستحقة وخطط التطوير', "go('pathway')", true], ['الكشافة والاختبارات', 'مرشحين واختبارات وترشيحات مدرسة الكرة', "go('scouting')", true]] });

  /* Four-corner radar: latest assessment filled, the one before as a dashed outline. */
  FU.radar = (now, prev, size = 220) => {
    const c = size / 2, r = size / 2 - 52, pt = (i, v) => { const a = -Math.PI / 2 + i * Math.PI / 2, d = r * (v || 0) / 100; return [c + d * Math.cos(a), c + d * Math.sin(a)]; };
    const poly = s => KEYS.map((k, i) => pt(i, s?.[k]).map(n => n.toFixed(1)).join(',')).join(' ');
    const grid = [25, 50, 75, 100].map(v => `<polygon points="${KEYS.map((k, i) => pt(i, v).map(n => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#dfe7e2" stroke-width="1"/>`).join('');
    /* Labels sit outside the chart: above, right, below and left of it. */
    const label = (k, i) => { const [x, y] = pt(i, 100), at = [[x, y - 24, 'middle'], [x + 8, y - 4, 'start'], [x, y + 18, 'middle'], [x - 8, y - 4, 'end']][i];
      return `<text x="${at[0].toFixed(1)}" y="${at[1].toFixed(1)}" text-anchor="${at[2]}" font-size="12" font-weight="700" fill="${FC.CORNERS[k].color}">${E(FC.CORNERS[k].name)}</text><text x="${at[0].toFixed(1)}" y="${(at[1] + 15).toFixed(1)}" text-anchor="${at[2]}" font-size="13" font-weight="700" fill="#1d3127">${now?.[k] ?? '—'}</text>`; };
    const axes = KEYS.map((k, i) => { const [x, y] = pt(i, 100); return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#dfe7e2"/>${label(k, i)}`; }).join('');
    return `<svg class="fb-radar" viewBox="-40 0 ${size + 80} ${size}" width="${size + 80}" height="${size}" direction="ltr" style="direction:ltr" role="img" aria-label="المحاور الأربعة">${grid}${axes}${prev ? `<polygon points="${poly(prev)}" fill="none" stroke="#8a9a91" stroke-width="1.5" stroke-dasharray="4 3"/>` : ''}${now ? `<polygon points="${poly(now)}" fill="rgba(45,96,76,.22)" stroke="#2d604c" stroke-width="2"/>` : ''}</svg>`;
  };
  const bars = s => `<span class="fb-bars">${KEYS.map(k => `<i title="${E(FC.CORNERS[k].name)} ${s?.[k] ?? '—'}" style="--v:${s?.[k] || 0}%;--c:${FC.CORNERS[k].color}"></i>`).join('')}</span>`;
  const trend = (a, b) => a != null && b != null ? (a - b > 0 ? `<em class="fb-up">▲ ${a - b}</em>` : a - b < 0 ? `<em class="fb-down">▼ ${b - a}</em>` : '<em>=</em>') : '';
  const pos = m => FC.POSITIONS[m.fb?.position];
  const raeBar = r => `<span class="fb-rae ${r.skewed ? 'skew' : ''}" title="توزيع شهور الميلاد على أرباع السنة">${r.q.map((n, i) => `<i style="--h:${r.total ? Math.max(3, Math.round(n / r.total * 64)) : 3}px"><b>${n}</b><small>ر${i + 1}</small></i>`).join('')}</span>`;
  const depthBar = d => `<span class="fb-depth">${Object.entries(FC.LINES).map(([k, l]) => `<span><b>${d[k]}</b><small>${l}</small></span>`).join('')}</span>`;

  /* =========================================================== dashboard */
  if (typeof PAGES !== 'undefined') {
    const btn = (label, action, cls = '') => `<button type="button" class="sb-btn ${cls}" onclick="${E(action)}">${E(label)}</button>`;
    window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { pathway: 'مسار الكورة', squad: 'فريق المرحلة السنية', fbplayer: 'ملف تطوير اللاعب' });
    const scoped = () => { const U = window.AcademyUI || { branch: 'all' }; return FC.squads(db.state).filter(g => U.branch === 'all' || g.branch === U.branch); };

    PAGES.pathway = () => {
      const list = scoped().map(g => FC.squadSummary(db.state, g)), all = list.flatMap(s => s.players);
      const school = db.state.members.filter(m => { const g = group(m.group); return g?.sport === 'football' && !FC.isSquad(g); });
      const funding = FC.FUNDING.map(f => [f, all.filter(p => p.fb?.funding === f).length]);
      return `<div class="sb-page fb-page"><header class="sb-head"><div><small>كرة القدم · موسم ${E(FC.season().name)}</small><h1>${window.Edition?.single ? 'المراحل السنية' : 'مسار الكورة'}</h1><p>فرق المسار متقسمة بسنة الميلاد زي قيد الاتحاد، وكل لاعب ليه ملف تطوير: تقييم كل 8 أسابيع على 4 محاور، وخطة أهداف فردية بيتابعها المدرب مع ولي الأمر. مدرسة الكرة بالاشتراك فاضلة زي ما هي، ومنها بيتنقى الموهوبين للمسار.</p></div></header>
        <div class="pg-kpis"><div><small>لاعبين في المسار</small><b>${all.length}</b></div><div><small>فرق المراحل السنية</small><b>${list.length}</b></div><div class="${list.some(s => s.due) ? 'warn' : 'ok'}"><small>تقييمات مستحقة</small><b>${list.reduce((n, s) => n + s.due, 0)}</b></div><div><small>أهداف تطوير جارية</small><b>${list.reduce((n, s) => n + s.goals, 0)}</b></div></div>
        <div class="fb-tracks"><div><b>${TRACK_ICON.pathway} مسار الاحتراف</b><small>${all.length} لاعب بالاختيار · ${funding.map(([f, n]) => `${f} ${n}`).join(' · ')}</small></div><div><b>${TRACK_ICON.school} مدرسة الكرة</b><small>${school.length} لاعب بالاشتراك في ${new Set(school.map(m => m.group)).size} جروبات</small></div></div>
        <div class="fb-phases">${FC.PHASES.map(ph => { const items = list.filter(s => s.phase.id === ph.id);
          return `<section class="fb-phase" style="--c:${ph.color}"><header><h2>${E(ph.name)}</h2><small>${E(ph.ages)} · ${E(ph.format)}</small><p>${E(ph.focus)}</p></header>${items.map(s => `<button type="button" class="fb-squad" onclick="FootballUI.openSquad('${s.group.id}')"><span class="fb-squad-head"><b>${E(s.name)}</b><small>${E(s.group.coach)} · ${E(s.group.branch)}</small></span>
            <span class="fb-squad-stats"><span><b>${s.players.length}</b><small>لاعب</small></span><span><b>${s.corners.overall ?? '—'}</b><small>المتوسط</small></span><span class="${s.due ? 'warn' : ''}"><b>${s.due}</b><small>تقييم مستحق</small></span></span>
            ${bars(s.corners)}${depthBar(s.depth)}${s.rae.skewed ? '<span class="fb-flag">⚠ أغلب اللاعيبة مواليد أول السنة</span>' : ''}</button>`).join('') || '<p class="fb-empty">مفيش فرق في المرحلة دي.</p>'}</section>`; }).join('')}</div>
        <p class="py-help">⚠ تأثير شهر الميلاد: لو أغلب الفريق مواليد يناير–مارس وقليل جدًا مواليد أكتوبر–ديسمبر، غالبًا الانتقاء بيفضّل الأكبر جسمانيًا مش الأموهب. افتح الفريق وشوف التوزيع.</p></div>`;
    };
    const TRACK_ICON = { pathway: '🎯', school: '⚽' };

    FU.openSquad = (id, tab) => { FU.squadId = id; FU.filter = 'all'; if (tab) FU.squadTab = tab; go('squad'); };
    PAGES.squad = () => {
      const g = group(FU.squadId) || FC.squads(db.state)[0];
      if (!g) return PAGES.pathway();
      const s = FC.squadSummary(db.state, g);
      const rows = s.players.map(p => { const h = FC.history(db.state, p.id), now = FC.cornerScores(h.at(-1)), prev = FC.cornerScores(h.at(-2)), plan = FC.idp(db.state, p.id); return { p, now, prev, last: h.at(-1), due: FC.due(db.state, p.id), goals: plan.goals.filter(x => x.status === 'active').length }; })
        .filter(r => FU.filter === 'all' || (FU.filter === 'due' && r.due) || FC.POSITIONS[r.p.fb?.position]?.line === FU.filter)
        .sort((a, b) => (FC.POSITIONS[a.p.fb?.position] ? Object.keys(FC.POSITIONS).indexOf(a.p.fb.position) : 99) - (FC.POSITIONS[b.p.fb?.position] ? Object.keys(FC.POSITIONS).indexOf(b.p.fb.position) : 99));
      return `<div class="sb-page fb-page"><header class="sb-head"><div><small><button type="button" class="fb-crumb" onclick="go('pathway')">${window.Edition?.single ? 'المراحل السنية' : 'مسار الكورة'}</button> · مرحلة ${E(s.phase.name)}</small><h1>${E(s.name)}</h1><p>${E(g.coach)} · ${E(g.branch)} · ${E(g.resource)} · ${E(window.ScheduleCore ? ScheduleCore.describe(g) : '')}</p></div></header>
        <div class="fb-squad-top"><section class="fb-card"><h3>متوسط الفريق</h3>${FU.radar(s.corners, null, 250)}</section>
          <section class="fb-card"><h3>العمق في المراكز</h3>${depthBar(s.depth)}<p class="py-help">${s.depth.gk < 2 ? '⚠ حارس واحد بس في الفريق. ' : ''}${s.depth.att < 2 ? '⚠ قليل في الهجوم. ' : ''}${s.depth.gk >= 2 && s.depth.att >= 2 ? 'التوزيع متوازن على الخطوط.' : ''}</p></section>
          <section class="fb-card"><h3>شهور الميلاد</h3>${raeBar(s.rae)}<p class="py-help">${s.rae.skewed ? '⚠ الفريق مايل لمواليد أول السنة. راجع اختيارات الانتقاء ومنح فرصة لمواليد آخر السنة.' : 'التوزيع على أرباع السنة طبيعي.'}</p></section></div>
        <div class="mg-filter fb-filter">${[['all', 'الكل ' + s.players.length], ['due', 'تقييم مستحق ' + s.due], ['gk', 'حراسة'], ['def', 'دفاع'], ['mid', 'وسط'], ['att', 'هجوم']].map(([k, l]) => `<button type="button" class="${FU.filter === k ? 'on' : ''}" onclick="FootballUI.filter='${k}';render()">${E(l)}</button>`).join('')}</div>
        <div class="fb-roster" role="table"><div class="fb-row fb-head" role="row"><span>اللاعب</span><span>المركز</span><span>المحاور الأربعة</span><span>الإجمالي</span><span>آخر تقييم</span><span>الخطة</span><span></span></div>
          ${rows.map(({ p, now, prev, last, due, goals }) => `<div class="fb-row" role="row"><span class="fb-who">${avatar(p.name, 38)}<span><b>${E(p.name)}</b><small>#${E(p.fb?.number ?? '')} · ${E(p.fb?.foot || '')} · ${E(p.fb?.funding || '')}</small></span></span>
            <span>${E(pos(p)?.short || '—')}</span><span>${bars(now)}</span><span class="fb-overall"><b>${now?.overall ?? '—'}</b>${trend(now?.overall, prev?.overall)}</span>
            <span>${last ? E(short(last.at)) : '—'}${due ? '<small class="warn">مستحق</small>' : ''}</span><span>${goals} أهداف</span>
            <span class="py-actions">${btn('تقييم', `FootballUI.assess('${p.id}')`, due ? 'primary' : '')}${btn('الملف', `FootballUI.openPlayer('${p.id}')`)}</span></div>`).join('') || '<div class="ac-empty"><b>مفيش لاعيبة</b><p>غيّر الفلتر.</p></div>'}</div></div>`;
    };

    FU.openPlayer = id => { FU.playerId = id; go('fbplayer'); };
    PAGES.fbplayer = () => {
      const p = db.member(FU.playerId);
      if (!p) return PAGES.pathway();
      const g = group(p.group), h = FC.history(db.state, p.id), now = FC.cornerScores(h.at(-1)), prev = FC.cornerScores(h.at(-2)), plan = FC.idp(db.state, p.id), age = window.Family ? Family.age(p.dob) : null;
      const goals = ['active', 'achieved', 'dropped'].flatMap(st => plan.goals.filter(x => x.status === st));
      return `<div class="sb-page fb-page"><header class="sb-head"><div><small><button type="button" class="fb-crumb" onclick="FootballUI.openSquad('${g?.id}')">${E(g ? FC.squadName(g.fb?.birthYear || 0) : '')}</button></small><h1>ملف تطوير اللاعب</h1></div><div class="pr-head-actions">${btn('تقييم جديد', `FootballUI.assess('${p.id}')`, 'primary')}${btn('هدف جديد', `FootballUI.goalForm('${p.id}')`)}${btn('مراجعة مع ولي الأمر', `FootballUI.reviewForm('${p.id}')`)}</div></header>
        <section class="fb-hero">${avatar(p.name, 96)}<div><h2>${E(p.name)} <span>#${E(p.fb?.number ?? '')}</span></h2><p>${E(pos(p)?.name || 'بدون مركز')} · القدم ${E(p.fb?.foot || '—')}${age != null ? ` · ${age} سنة` : ''} · مواليد ${E(String(p.dob || '').slice(0, 4))} (الربع ${FC.quarter(p.dob) || '—'})</p>
          <div class="fb-chips"><span>${E(FC.TRACKS[p.fb?.track] || '')}</span><span>${E(p.fb?.funding || '')}</span><span>قيد ${E(p.fb?.registration || '—')}</span><span>في الأكاديمية من ${E(p.fb?.joined ? fmt(p.fb.joined, { month: 'long', year: 'numeric' }) : '—')}</span>${p.medical ? `<span class="warn">⚕ ${E(p.medical)}</span>` : ''}</div></div>
          <div class="fb-hero-score"><b>${now?.overall ?? '—'}</b><small>الإجمالي</small>${trend(now?.overall, prev?.overall)}</div></section>
        <div class="fb-grid"><section class="fb-card"><h3>المحاور الأربعة</h3>${FU.radar(now, prev, 280)}<p class="py-help">الخط المتقطع = التقييم اللي قبله${prev ? ` (${E(short(h.at(-2).at))})` : ''}</p></section>
          <section class="fb-card"><h3>آخر تقييم ${h.length ? '· ' + E(short(h.at(-1).at)) + ' · ' + E(h.at(-1).by) : ''}</h3>${h.length ? KEYS.map(k => `<div class="fb-corner"><header><b style="color:${FC.CORNERS[k].color}">${E(FC.CORNERS[k].name)}</b><span>${now[k]} ${trend(now[k], prev?.[k])}</span></header>${FC.itemsOf(k, p.fb?.position).map((it, i) => `<div class="fb-item"><span>${E(it)}</span><span class="fb-dots">${[1, 2, 3, 4, 5].map(v => `<i class="${v <= h.at(-1).scores[k][i] ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}</div>`).join('') + (h.at(-1).note ? `<p class="tp-note">${E(h.at(-1).note)}</p>` : '') : '<p class="fb-empty">لسه مفيش تقييم. ابدأ بأول تقييم علشان تتبني عليه الخطة.</p>'}</section></div>
        <section class="fb-card"><h3>خطة التطوير الفردية</h3><div class="fb-goals">${goals.map(x => `<article class="fb-goal ${x.status}"><header><span class="fb-tag" style="--c:${FC.CORNERS[x.corner].color}">${E(FC.CORNERS[x.corner].name)}</span><b>${E(x.text)}</b><span class="sa-chip ${x.status === 'achieved' ? 'ok' : ''}">${E(FC.GOAL_STATUS[x.status])}</span></header><p>${E(x.measure)}${x.due ? ' · قبل ' + E(short(x.due)) : ''}</p><div class="fb-progress"><i style="width:${x.progress}%"></i></div><footer>${x.status === 'active' ? btn('تحديث التقدم', `FootballUI.goalForm('${p.id}','${x.id}')`) : ''}</footer></article>`).join('') || '<p class="fb-empty">مفيش أهداف. أضف 2 أو 3 أهداف من أضعف محورين.</p>'}</div>
          ${plan.reviews?.length ? `<p class="py-help">آخر مراجعة: ${E(short(plan.reviews.at(-1).at))} · ${plan.reviews.at(-1).withParent ? 'مع ولي الأمر' : 'داخلية'} · ${E(plan.reviews.at(-1).note)}</p>` : ''}</section>
        <section class="fb-card"><h3>سجل التقييمات</h3><div class="fb-timeline">${h.slice().reverse().map(a => { const s = FC.cornerScores(a); return `<div><b>${E(fmt(a.at, { day: 'numeric', month: 'long', year: 'numeric' }))}</b><span>${E(a.by)}</span>${bars(s)}<strong>${s.overall}</strong></div>`; }).join('') || '<p class="fb-empty">—</p>'}</div></section></div>`;
    };
    ['pathway', 'squad', 'fbplayer'].forEach(k => { PAGES[k + '_after'] = () => {}; });
    { const baseSquad = PAGES.squad, basePlayer = PAGES.fbplayer, basePath = PAGES.pathway;
      FU.squadTab = 'dev';
      PAGES.squad = () => {
        const html = baseSquad(), g = group(FU.squadId) || FC.squads(db.state)[0]; if (!g || !FC.isSquad(g)) return html;
        const cut = html.indexOf('</header>') + 9, head = html.slice(0, cut), dev = html.slice(cut, html.lastIndexOf('</div>'));
        const tabs = [['dev', 'التطوير'], ['physical', 'البدني والنمو'], ['matches', 'الماتشات والدقائق'], ['load', 'الأحمال والإصابات']];
        const body = FU.squadTab === 'physical' ? FU.physicalSection(g.id) : FU.squadTab === 'matches' ? FU.matchesSection(g.id) : FU.squadTab === 'load' ? FU.loadSection(g.id) : dev;
        return `${head}<nav class="tp-tabs fb-tabs">${tabs.map(([k, l]) => `<button type="button" class="${FU.squadTab === k ? 'selected' : ''}" onclick="FootballUI.squadTab='${k}';render()">${l}</button>`).join('')}</nav>${body}</div>`;
      };
      PAGES.fbplayer = () => { const html = basePlayer(), p = db.member(FU.playerId); if (!p) return html; const at = html.indexOf('<section class="fb-card"><h3>خطة التطوير الفردية'); return at < 0 ? html : html.slice(0, at) + FU.growthCard(p, FC.playersOf(db.state, p.group)) + FU.playerMatches(p) + html.slice(at); };
      PAGES.pathway = () => { const html = basePath(), all = FC.squads(db.state).flatMap(g => FC.playersOf(db.state, g.id)), spurt = all.filter(p => FC.growth(db.state, p)?.spurt).length, hurt = all.filter(p => FC.injured(db.state, p.id)).length;
        const next = (db.state.fbMatches || []).filter(x => x.status !== 'played' && new Date(x.at) > new Date()).sort((a, b) => new Date(a.at) - new Date(b.at)).slice(0, 4);
        return html.replace('<div><small>أهداف تطوير جارية</small>', `<div class="${spurt ? 'warn' : ''}"><small>في طفرة نمو</small><b>${spurt}</b></div><div class="${hurt ? 'warn' : ''}"><small>مصابين</small><b>${hurt}</b></div><div><small>أهداف تطوير جارية</small>`)
          .replace('<div class="fb-phases">', `${next.length ? `<section class="fb-card fb-next"><h3>الماتشات الجاية</h3>${next.map(x => `<button type="button" class="fb-next-row" onclick="FootballUI.openSquad('${x.squadId}','matches')"><b>${E(FC.squadName(group(x.squadId).fb.birthYear))}</b><span>ضد ${E(x.opponent)}</span><small>${E(when(x.at))} · ${E(x.competition)}</small></button>`).join('')}</section>` : ''}<div class="fb-phases">`); };
    }

    /* ---------- football groups: pathway squads and football school groups, never mixed ---------- */
    const U = () => window.AcademyUI || { sport: 'all', branch: 'all' };
    const baseGroups = PAGES.groups;
    PAGES.groups = () => {
      if (U().sport !== 'football') return baseGroups();
      const inBranch = g => U().branch === 'all' || g.branch === U().branch;
      const all = db.state.groups.filter(g => g.sport === 'football' && inBranch(g)), squads = all.filter(FC.isSquad).sort((a, b) => b.fb.birthYear - a.fb.birthYear), school = all.filter(g => !FC.isSquad(g));
      const card = (g, squad) => { const n = db.state.members.filter(m => m.group === g.id).length, pct = g.capacity ? Math.min(100, n / g.capacity * 100) : 0, u = squad ? FC.uOf(g.fb.birthYear) : null;
        return `<article class="pr-group fb-group ${squad ? 'squad' : 'school'}" style="--sport:${squad ? FC.phaseOf(u).color : '#8a9a91'}"><header><span>${squad ? 'مرحلة ' + E(FC.phaseOf(u).name) : 'مدرسة الكرة'}</span><small>${E(g.branch)}</small></header>
          <h3>${E(squad ? FC.squadName(g.fb.birthYear) : g.name)}</h3><p class="pr-when">${E(window.ScheduleCore ? ScheduleCore.describe(g) : '')}</p>
          <dl><div><dt>المدرب</dt><dd>${E(g.coach || 'لم يحدد')}</dd></div><div><dt>المكان</dt><dd>${E(g.resource || 'لم يحدد')}</dd></div><div><dt>${squad ? 'القيد' : 'السن'}</dt><dd>${squad ? 'مواليد ' + g.fb.birthYear : g.ageMin != null ? `من ${g.ageMin} إلى ${g.ageMax}` : '—'}</dd></div></dl>
          <div class="pr-cap"><i><em style="width:${pct}%"></em></i><small>${n} من ${g.capacity} لاعب</small></div>
          <footer>${squad ? btn('الفريق والتطوير', `FootballUI.openSquad('${g.id}')`) : btn('ملف المجموعة', `AcademyUI.groupDetail('${g.id}')`)}${btn('تعديل الجدول', `ProgramsUI.groupForm('${g.id}')`)}</footer></article>`; };
      return `<div class="sb-page"><header class="sb-head"><div><small>كرة القدم</small><h1>الفرق والمجموعات</h1><p>نوعين مختلفين ومنفصلين: <b>فرق المسار</b> بالاختيار، والفريق بيتحدد بسنة الميلاد زي قيد الاتحاد. و<b>مجموعات مدرسة الكرة</b> بالاشتراك، والمجموعة بتتحدد بالسن والميعاد. الحصص بتتولد تلقائيًا لأسبوعين قدام.</p></div><div class="pr-head-actions">${btn('الإجازات', 'ProgramsUI.holidays()')}${btn('+ فريق مسار', "ProgramsUI.groupForm('', 'pathway')")}${btn('+ مجموعة مدرسة', "ProgramsUI.groupForm('', 'school')", 'primary')}</div></header>
        <h2 class="fb-sec">🎯 فرق المراحل السنية · مسار الاحتراف <small>${squads.length} فرق</small></h2><div class="pr-grid">${squads.map(g => card(g, true)).join('') || '<p class="fb-empty">مفيش فرق مسار. أضف أول فريق بسنة الميلاد.</p>'}</div>
        <h2 class="fb-sec">⚽ مجموعات مدرسة الكرة · بالاشتراك <small>${school.length} مجموعات</small></h2><div class="pr-grid">${school.map(g => card(g, false)).join('') || '<p class="fb-empty">مفيش مجموعات مدرسة.</p>'}</div></div>`;
    };

    const PU = window.ProgramsUI;
    if (PU) {
      const baseForm = PU.groupForm, baseSave = PU.saveGroup;
      /* Football groups ask for their kind first; a pathway squad is named and aged by its birth year. */
      PU.groupForm = (id = '', kind = '') => {
        baseForm(id);
        const g = id ? group(id) : null, sport = document.getElementById('pr-sport');
        if (!sport) return;
        const isSquad = g ? FC.isSquad(g) : kind === 'pathway';
        const y = g?.fb?.birthYear || FC.season().end - 12;
        sport.closest('.rg-row').insertAdjacentHTML('afterend', `<div id="fb-kind" class="fb-kind" ${sport.value === 'football' ? '' : 'hidden'}><span class="sb-label">نوع المجموعة</span><div class="rg-seg"><label><input type="radio" name="fb-kind" value="pathway" ${isSquad ? 'checked' : ''} ${g ? 'disabled' : ''} onchange="FootballUI.kindChanged()"><span>فريق مسار الاحتراف</span></label><label><input type="radio" name="fb-kind" value="school" ${isSquad ? '' : 'checked'} ${g ? 'disabled' : ''} onchange="FootballUI.kindChanged()"><span>مجموعة مدرسة الكرة</span></label></div>
          <label class="rg-field" id="fb-year-field"><span>سنة الميلاد</span><input id="fb-year" type="number" min="${FC.season().end - 21}" max="${FC.season().end - 6}" value="${y}" ${g ? 'disabled' : ''} oninput="FootballUI.kindChanged()"><small id="fb-year-hint"></small></label></div>`);
        sport.addEventListener('change', () => { document.getElementById('fb-kind').hidden = sport.value !== 'football'; FU.kindChanged(); });
        /* Inside the football academy the form speaks football: no sport choice, team or group wording. */
        const form = sport.closest('.pr-form');
        form.querySelector('.rg-field span').textContent = 'الاسم';
        if (window.Edition?.single) sport.closest('.rg-field').style.display = 'none';
        const nameInput = document.getElementById('pr-name'); if (nameInput) nameInput.placeholder = 'مثال: مدرسة الكرة · الصبح';
        form.querySelectorAll('.sb-btn.primary').forEach(b => { if (/الجروب/.test(b.textContent)) b.textContent = 'حفظ'; });
        FU.formTitle = g ? 'تعديل جدول ' + (FC.isSquad(g) ? FC.squadName(g.fb.birthYear) : g.name) : '';
        FU.kindChanged();
      };
      FU.kindChanged = () => {
        const box = document.getElementById('fb-kind'); if (!box) return;
        const squad = !box.hidden && document.querySelector('[name=fb-kind]:checked')?.value === 'pathway', y = Number(document.getElementById('fb-year').value);
        document.getElementById('fb-year-field').hidden = !squad;
        const h = box.closest('.pr-form')?.querySelector('h2'); if (h && !box.hidden) h.textContent = FU.formTitle || (squad ? 'فريق مسار جديد' : 'مجموعة مدرسة كرة جديدة');
        ['pr-name', 'pr-age-min', 'pr-age-max'].forEach(k => { const el = document.getElementById(k); if (el) el.readOnly = squad; });
        if (squad && y > 1990) { const u = FC.uOf(y); document.getElementById('pr-name').value = FC.squadName(y); document.getElementById('pr-age-min').value = u - 1; document.getElementById('pr-age-max').value = u; document.getElementById('fb-year-hint').textContent = `مرحلة ${FC.phaseOf(u).name} · الاسم والسن بيتحددوا من سنة الميلاد`; }
      };
      PU.saveGroup = id => {
        const box = document.getElementById('fb-kind'), squad = box && !box.hidden && document.querySelector('[name=fb-kind]:checked')?.value === 'pathway', y = Number(document.getElementById('fb-year')?.value), branch = document.getElementById('pr-branch')?.value;
        if (!id && squad && FC.squads(db.state).some(g => g.fb.birthYear === y && g.branch === branch)) { const e = document.getElementById('pr-error'); e.textContent = `فيه فريق لمواليد ${y} في الفرع ده بالفعل`; e.hidden = false; return; }
        const before = new Set(db.state.groups.map(g => g.id));
        baseSave(id);
        const added = db.state.groups.find(g => !before.has(g.id));
        if (added && added.sport === 'football') V.run(() => { db.update(st => { const g = st.groups.find(x => x.id === added.id); g.fb = squad ? { tier: 'pathway', birthYear: y } : { tier: 'school' }; }); render(); });
      };
    }

    /* Levels belong to the football school; pathway players are assessed on the four corners. */
    if (window.ProgressUI) {
      ProgressUI.include = g => g.sport !== 'football' || !FC.isSquad(g);
      const baseProgress = PAGES.progress;
      PAGES.progress = () => {
        const html = baseProgress(); if (ProgressUI.sport !== 'football') return html;
        const list = scoped().map(g => FC.squadSummary(db.state, g)), n = list.reduce((k, x) => k + x.players.length, 0), due = list.reduce((k, x) => k + x.due, 0);
        return html.replace('<small>المستويات والتقييمات</small>', '<small>مدرسة الكرة · المستويات</small>')
          .replace('<div class="pg-kpis">', `<div class="fb-tracks"><div><b>${TRACK_ICON.school} مدرسة الكرة: المستويات</b><small>الصفحة دي للاعبين بالاشتراك: مستوى ومهارات وترقية. اللاعب المتميز؟ <a href="#" onclick="FootballUI.nominateForm();return false">رشّحه لاختبار المسار</a></small></div><button type="button" class="fb-track-link" onclick="go('pathway')"><b>${TRACK_ICON.pathway} مسار الاحتراف: ${n} لاعب</b><small>بيتقيموا على الأركان الأربعة كل 8 أسابيع${due ? ` · ${due} تقييم مستحق` : ''} ← المراحل السنية</small></button></div><div class="pg-kpis">`);
      };
    }

    /* Football reports: the pathway squads side by side, then the school. */
    FU.reportsSection = () => {
      const now = new Date(), list = scoped().map(g => FC.squadSummary(db.state, g, now)), all = list.flatMap(x => x.players);
      const from = new Date(FC.season(now).start, 7, 1);
      const rows = list.map(x => { const mins = FC.minutesTable(db.state, x.group.id, from), played = FC.matches(db.state, x.group.id).filter(m => m.status === 'played' && new Date(m.at) >= from), won = played.filter(m => m.score.us > m.score.them).length;
        const high = x.players.filter(p => FC.workload(db.state, p.id, now).zone === 'high').length, hurt = x.players.filter(p => FC.injured(db.state, p.id)).length, tested = x.players.filter(p => { const t = FC.tests(db.state, p.id).slice(-1)[0]; return t && (now - new Date(t.at)) / FC.DAY <= 90; }).length;
        return { x, played: played.length, won, under: mins.filter(r => r.under).length, high, hurt, tested }; });
      const school = db.state.members.filter(m => { const g = group(m.group); return g?.sport === 'football' && !FC.isSquad(g); }), att = school.filter(m => m.attendance > 0);
      const levels = (window.SportEngine?.get('football')?.levels || []).map(l => [l.name, school.filter(m => m.sportLevel === l.id).length]);
      const cell = (v, warn) => `<td class="${warn ? 'fb-alert' : ''}">${v}</td>`;
      return `<section class="fb-card fb-report"><h3>⚽ تقارير أكاديمية الكورة · موسم ${E(FC.season(now).name)}</h3>
        <div class="pg-kpis"><div><small>لاعبين المسار</small><b>${all.length}</b></div><div><small>لاعبين المدرسة</small><b>${school.length}</b></div><div class="${list.some(x => x.due) ? 'warn' : 'ok'}"><small>تقييمات مستحقة</small><b>${list.reduce((n, x) => n + x.due, 0)}</b></div><div class="${rows.some(r => r.hurt) ? 'warn' : ''}"><small>مصابين</small><b>${rows.reduce((n, r) => n + r.hurt, 0)}</b></div></div>
        <h4>🎯 فرق مسار الاحتراف</h4><div class="v-table"><table class="fb-report-table"><thead><tr><th>الفريق</th><th>لاعبين</th><th>متوسط التقييم</th><th>تقييم مستحق</th><th>أهداف تطوير</th><th>مباريات رسمية (فوز)</th><th>تحت حصة الدقايق</th><th>حمل عالي</th><th>مصابين</th><th>اختبار بدني آخر 90 يوم</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><button type="button" class="pg-name" onclick="FootballUI.openSquad('${r.x.group.id}')">${E(r.x.name)}</button></td>${cell(r.x.players.length)}${cell(r.x.corners.overall ?? '—')}${cell(r.x.due, r.x.due)}${cell(r.x.goals)}${cell(`${r.played} · فاز ${r.won}`)}${cell(r.under, r.under)}${cell(r.high, r.high)}${cell(r.hurt, r.hurt)}${cell(`${r.tested}/${r.x.players.length}`, r.tested < r.x.players.length)}</tr>`).join('') || '<tr><td colspan="10">مفيش فرق مسار.</td></tr>'}</tbody></table></div>
        <p class="py-help">التمويل: ${FC.FUNDING.map(f => `${f} ${all.filter(p => p.fb?.funding === f).length}`).join(' · ')}</p>
        ${(() => { const f = FC.funnel(db.state, from); return `<h4>🔎 الكشافة والاختبارات</h4><div class="fb-tracks"><div><b>${f.total} مرشح · انضم ${f.stages.find(x => x.id === 'joined').now}</b><small>${f.stages.filter(x => !['joined', 'rejected'].includes(x.id)).map(x => `${E(x.name)} ${x.now}`).join(' · ')} · لم يُقبل ${f.stages.find(x => x.id === 'rejected').now}</small></div><button type="button" class="fb-track-link" onclick="go('scouting')"><b>نسبة الانضمام ${f.conversion ?? '—'}%</b><small>${f.sources.filter(x => x.n).map(x => `${E(x.source)} ${x.n}`).join(' · ')} ← الكشافة</small></button></div>`; })()}
        <h4>⚽ مدرسة الكرة</h4><div class="fb-tracks"><div><b>${db.state.groups.filter(g => g.sport === 'football' && !FC.isSquad(g)).length} مجموعات · ${school.length} لاعب</b><small>متوسط الحضور ${att.length ? Math.round(att.reduce((n, m) => n + m.attendance, 0) / att.length) + '%' : '—'}</small></div><div><b>المستويات</b><small>${levels.map(([l, n]) => `${E(l)} ${n}`).join(' · ') || '—'}</small></div></div></section>`;
    };
    const baseReports = PAGES.reports;
    PAGES.reports = () => { const html = baseReports(); if (U().sport !== 'football') return html; const mark = html.indexOf('آخر إجراءات'), at = mark < 0 ? html.lastIndexOf('</div>') : html.lastIndexOf('<section', mark); return html.slice(0, at) + FU.reportsSection() + html.slice(at); };

    /* ---------- the day at a glance and the platform plan, at the top of every home ---------- */
    const PLANS = [['مجانية', 0, 30, 1], ['أساسية', 499, 100, 1], ['نمو', 999, 300, 3], ['احترافية', 1999, Infinity, Infinity]];
    const plan = () => { const p = db.state.platformPlan || { name: 'نمو' }; const row = PLANS.find(x => x[0] === p.name) || PLANS[2]; return { name: row[0], price: row[1], players: row[2], branches: row[3] }; };
    FU.planBanner = () => '';
    FU.operatingAlerts = a => {
      const now = new Date(), today = now.toDateString(), money = v => new Intl.NumberFormat('en-US').format(Math.round(v)) + ' ج';
      const ids = new Set(a.members.map(m => m.id)), gids = new Set(a.groups.map(g => g.id));
      const requests = (a.pending || []).length, invoices = (a.openInvoices || []).length;
      const sessions = (a.sessions || db.state.sessions.filter(s => gids.has(s.group))).filter(s => s.status === 'scheduled' && new Date(s.start) <= now && new Date(s.start).getTime() + (s.duration || 60) * 60000 < now.getTime());
      const noCoach = a.groups.filter(g => !g.coach).length;
      const overdue = (a.overdue || []).length;
      const paid = db.state.transactions.filter(t => ids.has(t.memberId) && t.kind === 'payment' && new Date(t.at).toDateString() === today);
      const rows = [
        [requests, 'طلبات تحتاج قرارًا', 'دفع أو تجميد أو تعويض', "go('vrequests')", 'amber', 'مراجعة'],
        [sessions.length, 'حصص تحتاج إغلاق الحضور', 'موعدها انتهى وما زالت مجدولة', "go('attendance')", 'rose', 'فتح الجدول'],
        [noCoach, 'مجموعات بدون مدرب', 'حدّد المسؤول عن التدريب', "go('groups')", 'blue', 'عرض المجموعات'],
        [overdue, 'مهام متابعة متأخرة', 'راجع المسؤول والموعد القادم', "go('vfollowups')", 'amber', 'المتابعة'],
        [invoices, 'فواتير غير مكتملة', 'المتبقي '+money(a.outstanding || 0), "go('billing')", 'rose', 'التحصيل']
      ].filter(r => r[0] > 0).slice(0, 4);
      if (rows.length < 4) rows.push([paid.length, 'دفعات محصّلة اليوم', 'بقيمة '+money(paid.reduce((n,t)=>n+t.amount,0)), "go('billing')", 'mint', 'التفاصيل']);
      return `<section class="cb-alerts" aria-label="تنبيهات تحتاج انتباهك"><header><h2>${svg('activity',18)} تنبيهات ومتابعة اليوم</h2><small>حسب الفرع والرياضة المختارين</small></header><div>${rows.map(([n,title,detail,action,color,label])=>`<button class="cb-alert ${color}" onclick="${E(action)}"><span><b>${n} ${E(title)}</b><small>${E(detail)}</small></span><strong>${E(label)} ‹</strong></button>`).join('')}</div></section>`;
    };
    FU.plans = () => { const p = plan(), players = db.state.members.filter(m => m.group).length, branches = new Set(db.state.groups.map(g => g.branch).filter(Boolean)).size;
      V.open(`<div class="ma-form fb-form"><h3>باقات المنصة</h3><p class="py-help">باقتك الحالية «${E(p.name)}» · الاستخدام: ${players} لاعب و${branches} فروع.</p><div class="fb-plans">${PLANS.map(([n, price, pl, br]) => `<div class="fb-plan ${n === p.name ? 'on' : ''}"><b>${E(n)}</b><strong>${price ? price.toLocaleString('en') + ' ج' : 'مجانًا'}<small>/شهريًا</small></strong><small>${isFinite(pl) ? 'حتى ' + pl + ' لاعب' : 'لاعبين بلا حد'} · ${isFinite(br) ? br + (br > 1 ? ' فروع' : ' فرع') : 'فروع بلا حد'}</small>${n === p.name ? '<em>باقتك الحالية</em>' : `<button type="button" class="sb-btn ${PLANS.findIndex(x => x[0] === n) > PLANS.findIndex(x => x[0] === p.name) ? 'primary' : ''} small" onclick="FootballUI.choosePlan('${n}')">${PLANS.findIndex(x => x[0] === n) > PLANS.findIndex(x => x[0] === p.name) ? 'ترقية' : 'تغيير'}</button>`}</div>`).join('')}</div></div>`); };
    FU.choosePlan = n => V.run(() => { db.update(st => { st.platformPlan = { name: n, at: new Date().toISOString() }; }); try { sessionStorage.removeItem('plan-banner-hidden'); } catch (e) { /* storage off */ } V.close(); render(); toast('اتغيرت الباقة لـ ' + n); });
    const ringSvg = (pct, color) => { const r = 34, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, Math.round(pct || 0))); return `<svg viewBox="0 0 84 84" width="84" height="84"><circle cx="42" cy="42" r="${r}" fill="none" stroke="#e8eeea" stroke-width="9"/><circle cx="42" cy="42" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c * v / 100} ${c}" transform="rotate(-90 42 42)"/><text x="42" y="48" text-anchor="middle" font-size="18" font-weight="800" fill="#13261d">${v}%</text></svg>`; };
    FU.dayHero = (a, label) => {
      const now = new Date(), today = now.toDateString(), month = new Date(now.getFullYear(), now.getMonth(), 1);
      const ids = new Set(a.members.map(m => m.id)), gids = new Set(a.groups.map(g => g.id));
      const sessionsToday = (a.todaySessions || []).filter(x => x.status !== 'cancelled');
      const paidToday = db.state.transactions.filter(t => ids.has(t.memberId) && t.kind === 'payment' && new Date(t.at).toDateString() === today);
      const waiting = (a.pending || []).filter(r => r.type === 'payment').length;
      const active = a.members.length ? (a.active || 0) / a.members.length * 100 : 0;
      const inv = db.state.invoices.filter(i => ids.has(i.memberId) && new Date(i.created || i.at || i.date || now) >= month), billed = inv.reduce((n, i) => n + i.total, 0), got = inv.reduce((n, i) => n + i.paid, 0);
      const left = db.state.members.filter(m => m.left && gids.has(m.left.from) && (now - new Date(m.left.at)) / 864e5 <= 90).length, stay = a.members.length + left ? a.members.length / (a.members.length + left) * 100 : 100;
      const next = sessionsToday.find(x => x.status !== 'ended' && new Date(x.start).getTime() + (x.duration || 60) * 6e4 >= now.getTime()) || sessionsToday[0];
      const money = v => new Intl.NumberFormat('en-US').format(Math.round(v)) + ' ج';
      return `${FU.operatingAlerts(a)}<section class="fb-day"><div class="fb-day-main"><span class="fb-day-eyebrow">✦ لوحة التحكم · ${E(label)}</span><h1>نظرة سريعة على يومك 🚀</h1><p>${sessionsToday.length} حصص اليوم، ${paidToday.length} دفعة محصّلة بقيمة ${money(paidToday.reduce((n, t) => n + t.amount, 0))}، و${waiting} دفعات بانتظار التحقق.</p>
        <div class="fb-day-actions"><button type="button" class="fb-day-btn dark" onclick="Registration.addPlayers()">＋ تسجيل لاعب جديد</button><button type="button" class="fb-day-btn" onclick="${next ? `AcademyUI.sessionDetail('${next.id}')` : "toast('مفيش حصص النهارده')"}">📅 ${next && new Date(next.start) <= now ? 'الحصة الجارية' : 'بدء حصة اليوم'}</button><button type="button" class="fb-day-link" onclick="go('reports')">عرض التقارير ‹</button></div></div>
        <div class="fb-day-rings">${[['النشطون', active, '#2d604c', 'اشتراك ساري من كل اللاعبين'], ['التحصيل', billed ? got / billed * 100 : 0, '#2f6f8f', 'المدفوع من فواتير الشهر'], ['البقاء', stay, '#b8954f', 'اللاعبين اللي كمّلوا آخر 90 يوم']].map(([l, v, c, t]) => `<div class="fb-ring" title="${t}">${ringSvg(v, c)}<small>${l}</small></div>`).join('')}</div></section>`;
    };

    /* The football home: pathway and school side by side, never one mixed list of groups. */
    if (window.AcademyUI?.sportDashboard) {
      const AU = window.AcademyUI, baseHome = AU.sportDashboard;
      AU.sportDashboard = () => {
        const html = baseHome(); if (AU.sport !== 'football') return html.replace(/<header class="sport-workspace-heading">[\s\S]*?<\/header>/, FU.dayHero(AU.scope(), window.SportEngine?.get(AU.sport)?.name || ''));
        const k = html.indexOf('<div class="ny-kpis">'), t = html.indexOf('<section class="ny-panel">', k), bg = html.indexOf('<div class="sport-bottom-grid">');
        if (k < 0 || t < 0 || bg < 0) return html;
        const money = v => new Intl.NumberFormat('en-US').format(v) + ' ج', a = AU.scope(), now = new Date(), inScope = new Set(a.groups.map(g => g.id));
        const squadsList = a.groups.filter(FC.isSquad).sort((x, y) => y.fb.birthYear - x.fb.birthYear).map(g => FC.squadSummary(db.state, g, now)), school = a.groups.filter(g => !FC.isSquad(g));
        const pathPlayers = squadsList.flatMap(x => x.players), schoolPlayers = a.members.filter(m => school.some(g => g.id === m.group));
        const due = squadsList.reduce((n, x) => n + x.due, 0), hurt = pathPlayers.filter(p => FC.injured(db.state, p.id)).length, high = pathPlayers.filter(p => FC.workload(db.state, p.id, now).zone === 'high').length;
        const trials = (db.state.fbScouting || []).filter(c => c.stage === 'invited' && c.trialAt && new Date(c.trialAt) > new Date(now - 864e5)).length, offers = (db.state.fbScouting || []).filter(c => c.stage === 'offer').length;
        const kpi = (label, value, detail, action, color, ico) => `<button class="ny-kpi ${color}" onclick="${E(action)}"><span class="ny-kpi-top"><i>${ico}</i><span>‹</span></span><small>${E(label)}</small><b>${value}</b><p>${E(detail)}</p></button>`;
        const kpis = `<div class="ny-kpis fb-kpis">${kpi('لاعبين مسار الاحتراف', pathPlayers.length, `${squadsList.length} فرق مراحل سنية`, "go('pathway')", 'mint', svg('target', 20))}${kpi('لاعبين مدرسة الكرة', schoolPlayers.length, `${school.length} مجموعات بالاشتراك`, "go('groups')", 'blue', svg('ball', 20))}${kpi('تقييمات مستحقة', due, 'تقييم الأركان الأربعة كل 8 أسابيع', "go('pathway')", 'amber', svg('plan', 20))}${kpi('اختبارات وعروض', trials + offers, `${trials} اختبار جاي · ${offers} عرض مستني رد`, "go('scouting')", 'purple', svg('search', 20))}${kpi('مصابين وأحمال', hurt + high, `${hurt} مصاب · ${high} حمل عالي`, "go('pathway')", 'pink', svg('activity', 20))}${kpi('متبقي للتحصيل', money(a.outstanding), `${a.openInvoices.length} فواتير غير مكتملة`, "go('billing')", 'cyan', svg('card', 20))}${kpi('المدربين', new Set(a.groups.map(g => g.coach).filter(Boolean)).size, `${a.groups.filter(g => !g.coach).length ? a.groups.filter(g => !g.coach).length + ' مجموعة من غير مدرب' : 'كل مجموعة ليها مدرب'}`, "go('users')", 'mint', svg('whistle', 20))}${kpi('المجموعات', a.groups.length, `${squadsList.length} فرق مسار · ${school.length} مدرسة`, "go('groups')", 'blue', svg('users', 20))}</div>`;
        const nextMatch = gid => FC.matches(db.state, gid).find(x => x.status !== 'played' && new Date(x.at) > now);
        const squadRows = squadsList.map(x => { const m = nextMatch(x.group.id); return `<button type="button" class="fb-home-row" onclick="FootballUI.openSquad('${x.group.id}')"><span class="fb-home-dot" style="background:${x.phase.color}"></span><span class="fb-home-main"><b>${E(x.name)}</b><small>${E(x.group.coach || '')} · ${E(x.group.branch)}</small></span><span class="fb-home-tags"><em class="fb-home-player-count">${x.players.length} لاعب</em>${x.due ? `<em class="warn">${x.due} تقييم مستحق</em>` : '<em class="ok">التقييمات في ميعادها</em>'}${m ? `<em>ماتش ${E(short(m.at))} ضد ${E(m.opponent)}</em>` : ''}</span></button>`; }).join('');
        const schoolRows = school.map(g => { const n = a.members.filter(m => m.group === g.id).length, over = n - g.capacity; return `<button type="button" class="fb-home-row" onclick="AcademyUI.groupDetail('${g.id}')"><span class="fb-home-dot" style="background:#8a9a91"></span><span class="fb-home-main"><b>${E(g.name)}</b><small>${E(g.coach || '')} · ${E(g.branch)}${g.ageMin != null ? ` · ${g.ageMin}–${g.ageMax} سنة` : ''}</small></span><span class="fb-home-tags"><span class="fb-home-cap"><i><em style="width:${g.capacity ? Math.min(100, n / g.capacity * 100) : 0}%"></em></i><bdi>${n} / ${g.capacity}</bdi><small>لاعب</small></span>${over > 0 ? `<em class="warn">زيادة ${over} عن السعة</em>` : !n ? '<em>فاضية</em>' : ''}</span></button>`; }).join('');
        const panel = (title, sub, more, body) => `<section class="ny-panel fb-roster-panel ${title.includes('مسار') ? 'fb-path-panel' : 'fb-school-panel'}"><header><div><h2>${title}</h2><p>${sub}</p></div>${more}</header><div class="fb-home-list">${body}</div></section>`;
        const btnQ = (l, js) => `<button type="button" class="cb-group-link" onclick="${E(js)}">${l}</button>`;
        const bottom = `<div class="sport-bottom-grid">${panel('🎯 فرق مسار الاحتراف', 'فرق بسنة الميلاد · بالاختيار', btnQ('المراحل السنية', "go('pathway')"), squadRows || '<p class="fb-empty">مفيش فرق مسار.</p>')}${panel('⚽ مجموعات مدرسة الكرة', 'بالاشتراك · بالسن والميعاد', btnQ('الفرق والمجموعات', "go('groups')"), schoolRows || '<p class="fb-empty">مفيش مجموعات.</p>')}</div>`;
        const head = html.slice(0, k).replace(/<header class="sport-workspace-heading">[\s\S]*?<\/header>/, FU.dayHero(a, window.Edition?.single ? Edition.title : 'أكاديمية الكورة')).replace(/داشبورد كورة|داشبورد كرة القدم/, window.Edition?.single ? Edition.title : 'أكاديمية الكورة').replace('<div class="sport-quick-actions">', `<div class="sport-quick-actions"><button type="button" class="btn quiet" onclick="FootballUI.scoutForm()">+ مرشح للاختبار</button>`);
        const tools = html.slice(t, bg).replace('<h3>المستويات والتقييمات</h3>', '<h3>مستويات مدرسة الكرة</h3>').replace(/<h2>أدوات [^<]*<\/h2>/, '<h2>أدوات الأكاديمية</h2>');
        const Q = [['userPlus', 'تسجيل لاعب', 'V.open(V.newMemberForm())', 'mint'], ['search', 'مرشح للاختبار', 'FootballUI.scoutForm()', 'purple'], ['plan', `تقييم مستحق${due ? ' (' + due + ')' : ''}`, "FootballUI.quick('assess')", 'amber'], ['trophy', 'ماتش رسمي', "FootballUI.quick('match')", 'blue'], ['activity', 'مجهود الحصة', "FootballUI.quick('load')", 'cyan'], ['bandage', 'تسجيل إصابة', "FootballUI.quick('injury')", 'pink'], ['ruler', 'قياسات بدنية', "FootballUI.quick('tests')", 'mint'], ['card', 'تحصيل اشتراك', 'AcademyUI.chooseMember()', 'blue']];
        const quick = `<section class="ny-panel fb-quick-panel"><header><div><h2>إجراءات سريعة</h2><p>شغل اليوم في ضغطة</p></div></header><div class="fb-quick">${Q.map(([i, l, js, c]) => `<button type="button" class="fb-quick-btn ${c}" onclick="${E(js)}"><span>${svg(i, 20)}</span><b>${l}</b></button>`).join('')}</div></section>`;
        const J = [['search', 'الكشافة والاختبارات', 'اكتشاف المواهب واختبارها', "go('scouting')"], ['userPlus', 'التسجيل والتحصيل', 'إضافة اللاعبين واشتراكاتهم', "Registration.addPlayers()"], ['users', 'الفرق والمجموعات', 'فرق المسار ومجموعات المدرسة', "go('groups')"], ['calendar', 'الجدول والحضور', 'الحصص وتسجيل الحضور', "go('attendance')"], ['plan', 'خطط التدريب', 'خطة الأسبوع لكل فريق', "go('plans')"], ['target', 'التقييم والتطوير', 'الأركان الأربعة وخطة اللاعب', "go('pathway')"], ['trophy', 'الماتشات والأحمال', 'الدقائق والمجهود والإصابات', "FootballUI.openSquad(FootballCore.squads(V.db.state)[0]?.id,'matches')"], ['chart', 'التقارير', 'أداء الموسم', "go('reports')"]];
        const journey = `<section class="ny-panel fb-journey-panel"><header><div><h2>رحلة العمل في الأكاديمية</h2><p>من اكتشاف اللاعب لحد تقرير الموسم</p></div></header><ol class="fb-journey">${J.map(([i, l, sub, js], n) => `<li><button type="button" onclick="${E(js)}"><span class="fb-j-ico">${svg(i, 22)}</span><b>${l}</b><small>${E(sub)}</small></button></li>`).join('')}</ol></section>`;
        return head.replace(/<div class="sport-quick-actions">[\s\S]*?<\/div>/, '') + kpis + `<div class="fb-home-top">${journey}${quick}</div>` + bottom + '</div>';
      };
    }

    /* ---------- settings and tools, built from the academy's own records ---------- */
    const isFb = () => (window.AcademyUI?.sport) === 'football';
    const fbGroups = () => db.state.groups.filter(g => g.sport === 'football' && (U().branch === 'all' || g.branch === U().branch));
    const playersIn = gs => { const ids = new Set(gs.map(g => g.id)); return db.state.members.filter(m => ids.has(m.group)); };
    const nameOf = g => FC.isSquad(g) ? FC.squadName(g.fb.birthYear) : g.name;
    const cash = v => new Intl.NumberFormat('en-US').format(Math.round(v)) + ' ج';
    const wrap = (key, fn) => { const base = PAGES[key]; if (!base) return; PAGES[key] = function () { return isFb() ? fn.apply(this, arguments) : base.apply(this, arguments); }; };
    const MANAGERS = { 'الشيخ زايد': 'أ. رامي', 'أكتوبر': 'أ. هاني', 'المهندسين': 'أ. وائل' };

    /* Branches: squads, school groups, players and money from the records. */
    wrap('branches', () => {
      const all = db.state.groups.filter(g => g.sport === 'football'), branches = [...new Set(all.map(g => g.branch).filter(Boolean))], month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
      return `<div class="sb-page"><header class="sb-head"><div><small>الإعدادات والأدوات</small><h1>الفروع</h1><p>كل فرع ليه فرق مسار ومجموعات مدرسة وملاعب ومدير. الأرقام من ملفات اللاعبين والفواتير.</p></div></header><div class="pr-grid">${branches.map(b => {
        const gs = all.filter(g => g.branch === b), sq = gs.filter(FC.isSquad), sc = gs.filter(g => !FC.isSquad(g)), ps = playersIn(gs), ids = new Set(ps.map(m => m.id));
        const paid = db.state.transactions.filter(t => ids.has(t.memberId) && t.kind === 'payment' && new Date(t.at) >= month).reduce((n, t) => n + t.amount, 0), inv = db.state.invoices.filter(i => ids.has(i.memberId)), billed = inv.reduce((n, i) => n + i.total, 0), got = inv.reduce((n, i) => n + i.paid, 0);
        const pitches = [...new Set(gs.map(g => g.resource).filter(Boolean))];
        return `<article class="pr-group fb-branch"><header><span>📍 ${E(b)}</span><small>${E(MANAGERS[b] || 'مدير الفرع')}</small></header>
          <dl><div><dt>فرق المسار</dt><dd>${sq.length} · ${playersIn(sq).length} لاعب</dd></div><div><dt>مجموعات المدرسة</dt><dd>${sc.length} · ${playersIn(sc).length} لاعب</dd></div><div><dt>تحصيل الشهر</dt><dd>${cash(paid)}</dd></div><div><dt>نسبة التحصيل</dt><dd>${billed ? Math.round(got / billed * 100) + '%' : '—'}</dd></div></dl>
          <p class="pr-when">الملاعب: ${E(pitches.join('، ') || 'لم تحدد')}</p>
          <footer>${btn('الفرق والمجموعات', `AcademyUI.setBranch('${b}');go('groups')`)}${btn('لوحة الفرع', `AcademyUI.setBranch('${b}');go('dash')`)}</footer></article>`; }).join('')}</div></div>`;
    });

    /* Pitches: the week's training sessions and home matches on each pitch, with clashes flagged. */
    wrap('resources', () => {
      const gs = fbGroups(), byId = Object.fromEntries(gs.map(g => [g.id, g])), from = new Date(); from.setHours(0, 0, 0, 0);
      const days = Array.from({ length: 7 }, (_, i) => new Date(from.getTime() + i * 864e5)), to = new Date(from.getTime() + 7 * 864e5);
      const items = db.state.sessions.filter(x => byId[x.group] && x.status !== 'cancelled' && new Date(x.start) >= from && new Date(x.start) < to).map(x => ({ pitch: x.resource || byId[x.group].resource || 'بدون ملعب', branch: byId[x.group].branch, at: new Date(x.start), mins: x.duration || 60, label: nameOf(byId[x.group]), kind: FC.isSquad(byId[x.group]) ? 'path' : 'school', js: `AcademyUI.sessionDetail('${x.id}')` }))
        .concat((db.state.fbMatches || []).filter(m => byId[m.squadId] && m.home && new Date(m.at) >= from && new Date(m.at) < to).map(m => ({ pitch: m.venue || byId[m.squadId].resource || 'بدون ملعب', branch: byId[m.squadId].branch, at: new Date(m.at), mins: m.format?.minutes + 20 || 90, label: `${nameOf(byId[m.squadId])} ضد ${m.opponent}`, kind: 'match', js: `FootballUI.openSquad('${m.squadId}','matches')` })));
      const pitches = [...new Set(gs.map(g => g.resource).filter(Boolean).concat(items.map(i => i.pitch)))].map(p => ({ p, branch: items.find(i => i.pitch === p)?.branch || gs.find(g => g.resource === p)?.branch || '' }));
      const clash = items.filter(a => items.some(b => a !== b && a.pitch === b.pitch && a.at < new Date(b.at.getTime() + b.mins * 6e4) && b.at < new Date(a.at.getTime() + a.mins * 6e4)));
      const hours = items.reduce((n, i) => n + i.mins / 60, 0);
      const cell = (p, d) => items.filter(i => i.pitch === p && i.at.toDateString() === d.toDateString()).sort((a, b) => a.at - b.at).map(i => `<button type="button" class="fb-slot ${i.kind} ${clash.includes(i) ? 'clash' : ''}" onclick="${E(i.js)}"><b>${E(fmt(i.at, { hour: 'numeric', minute: '2-digit' }))}</b>${E(i.label)}</button>`).join('');
      return `<div class="sb-page"><header class="sb-head"><div><small>الإعدادات والأدوات</small><h1>الملاعب</h1><p>إشغال كل ملعب الأسبوع ده من جدول التمارين والماتشات الرسمية على أرضنا. أي تعارض في نفس الملعب ونفس الوقت بيظهر بالأحمر.</p></div></header>
        <div class="pg-kpis"><div><small>ملاعب</small><b>${pitches.length}</b></div><div><small>تمارين الأسبوع</small><b>${items.filter(i => i.kind !== 'match').length}</b></div><div><small>ماتشات على أرضنا</small><b>${items.filter(i => i.kind === 'match').length}</b></div><div class="${clash.length ? 'warn' : 'ok'}"><small>تعارضات</small><b>${clash.length}</b></div></div>
        <section class="sb-section"><header><h2>الأسبوع ده · ${Math.round(hours)} ساعة استخدام</h2></header><div class="v-table"><table class="fb-pitch"><thead><tr><th>الملعب</th>${days.map(d => `<th>${E(fmt(d, { weekday: 'short', day: 'numeric' }))}</th>`).join('')}</tr></thead><tbody>
        ${pitches.map(({ p, branch }) => `<tr><th><b>${E(p)}</b><small>${E(branch)}</small></th>${days.map(d => `<td>${cell(p, d)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="8">مفيش ملاعب متسجلة للفرق.</td></tr>`}</tbody></table></div>
        <div class="ms-legend fb-legend"><span class="path">تمرين مسار</span><span class="school">تمرين مدرسة</span><span class="match">ماتش رسمي</span><span class="clash">تعارض</span></div></section></div>`;
    });

    /* Coaching staff from the squads and groups each coach runs, plus the support staff an academy needs. */
    const baseUsers = PAGES.users;
    if (baseUsers) PAGES.users = function () {
      const html = baseUsers.apply(this, arguments); if (!isFb() || (typeof state !== 'undefined' && state.permTab && state.permTab !== 'coaches')) return html;
      const cut = html.indexOf('</div>') + 6, gs = fbGroups(), coaches = [...new Set(gs.map(g => g.coach).filter(Boolean))].map(n => ({ n, gs: gs.filter(g => g.coach === n) })).sort((a, b) => b.gs.filter(FC.isSquad).length - a.gs.filter(FC.isSquad).length);
      const noCoach = gs.filter(g => !g.coach), SUPPORT = [['مدرب لياقة بدنية', 'برامج الأحمال والقياسات البدنية لفرق المسار', 'كابتن حسام'], ['مدرب حراس مرمى', 'تدريب الحراس في كل المراحل السنية', 'كابتن أيمن'], ['أخصائي علاج طبيعي', 'متابعة الإصابات والتأهيل وقرار الرجوع للملعب', ''], ['محلل أداء', 'فيديو الماتشات ودقائق اللعب وتقارير التقييم', ''], ['كشاف', 'رصد المواهب وترشيحات الاختبار', ''], ['مدير فني للأكاديمية', 'منهج التدريب وقرارات آخر الموسم', '']];
      return html.slice(0, cut) + `<div class="sb-page fb-staff"><div class="pg-kpis"><div><small>مدربين رئيسيين</small><b>${coaches.length}</b></div><div><small>فرق مسار ليها مدرب</small><b>${gs.filter(g => FC.isSquad(g) && g.coach).length} / ${gs.filter(FC.isSquad).length}</b></div><div><small>مجموعات مدرسة ليها مدرب</small><b>${gs.filter(g => !FC.isSquad(g) && g.coach).length} / ${gs.filter(g => !FC.isSquad(g)).length}</b></div><div class="${SUPPORT.some(x => !x[2]) ? 'warn' : 'ok'}"><small>أدوار مساندة ناقصة</small><b>${SUPPORT.filter(x => !x[2]).length}</b></div></div>
        ${noCoach.length ? `<p class="fb-warn">⚠ ${noCoach.map(g => E(nameOf(g))).join('، ')} من غير مدرب رئيسي.</p>` : ''}
        <section class="sb-section"><header><h2>الجهاز الفني</h2></header><div class="v-table"><table class="fb-report-table"><thead><tr><th>المدرب</th><th>الفروع</th><th>فرق المسار</th><th>مجموعات المدرسة</th><th>لاعبين</th><th></th></tr></thead><tbody>
          ${coaches.map(c => `<tr><td><b>${E(c.n)}</b></td><td>${E([...new Set(c.gs.map(g => g.branch))].join('، '))}</td><td>${c.gs.filter(FC.isSquad).map(g => `<span class="sa-chip">${E(nameOf(g))}</span>`).join(' ') || '—'}</td><td>${c.gs.filter(g => !FC.isSquad(g)).map(g => `<span class="sa-chip">${E(g.name.replace('مدرسة الكرة · ', ''))}</span>`).join(' ') || '—'}</td><td>${playersIn(c.gs).length}</td><td>${typeof go === 'function' ? `<button type="button" class="sb-btn small" onclick="go('payroll')">المستحقات</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>
        <section class="sb-section"><header><h2>الجهاز المساند</h2></header><div class="fb-home-list">${SUPPORT.map(([r, d, n]) => `<div class="fb-home-row"><span class="fb-home-dot" style="background:${n ? '#2d604c' : '#c3a05c'}"></span><span class="fb-home-main"><b>${E(r)}</b><small>${E(d)}</small></span><span class="fb-home-tags">${n ? `<em class="ok">${E(n)}</em>` : '<em class="warn">مش متعين</em>'}</span></div>`).join('')}</div></section></div>`;
    };

    /* Messages to a squad, a school group, or the pathway parents. */
    wrap('comms', () => {
      const gs = fbGroups(), opts = [['path', 'أولياء أمور مسار الاحتراف', playersIn(gs.filter(FC.isSquad)).length], ['school', 'أولياء أمور مدرسة الكرة', playersIn(gs.filter(g => !FC.isSquad(g))).length], ['late', 'المتأخرين في الدفع', db.state.invoices.filter(i => i.total > i.paid && playersIn(gs).some(m => m.id === i.memberId)).length]].concat(gs.map(g => [g.id, nameOf(g), playersIn([g]).length]));
      const T = [['تغيير ميعاد', 'تمرين الخميس اتنقل لـ 8 بالليل على نفس الملعب. نشوفكم ⚽'], ['ماتش رسمي', 'ماتش رسمي يوم الجمعة الساعة 10 الصبح. التجمع 9:15 بالطقم الكامل والشين جارد.'], ['تقرير التقييم', 'تقييم الثمانية أسابيع اتسجل، وتقدروا تشوفوه في خطة التطوير على التطبيق.'], ['يوم اختبار', 'يوم اختبار مفتوح للمواليد من 2011 لـ 2017 يوم السبت الساعة 5 العصر.']];
      return `<div class="grid g2">${window.MessagesUI && MessagesUI.commsCard ? MessagesUI.commsCard() : ''}<div class="card fb-form"><h3>رسالة لفريق أو مجموعة</h3>
        <label>إلى<select id="fb-msg-to">${opts.map(([v, l, n]) => `<option value="${v}">${E(l)} (${n})</option>`).join('')}</select></label>
        <label>قالب<select onchange="document.getElementById('fb-msg-body').value=this.value">${T.map(([l, b]) => `<option value="${E(b)}">${E(l)}</option>`).join('')}</select></label>
        <label>الرسالة<textarea id="fb-msg-body" rows="5">${E(T[0][1])}</textarea></label>
        <button type="button" class="sb-btn primary ax-btn" onclick="toast('اتبعتت لـ '+(document.getElementById('fb-msg-to').selectedOptions[0].textContent.match(/\((\d+)\)/)||[0,0])[1]+' ولي أمر على الواتساب')">إرسال واتساب</button></div></div>`;
    });

    /* Academy rules the pathway runs on, next to the club identity. */
    const baseSettings = PAGES.settings;
    if (baseSettings) PAGES.settings = function () {
      const html = baseSettings.apply(this, arguments); if (!isFb()) return html;
      const d = window.SportEngine?.get('football'), ph = FC.PHASES;
      const usage = html.replace(/الاستخدام: [\d,]+ من/, `الاستخدام: ${playersIn(db.state.groups.filter(g => g.sport === 'football')).length} من`);
      return `<section class="sb-section fb-rules" style="margin-bottom:16px"><header><h2>⚽ قواعد أكاديمية الكورة</h2>${btn('إعدادات الكورة', "SportBuilder.open('football')")}</header>
        <dl class="fb-rules-grid"><div><dt>الموسم</dt><dd>من أغسطس لـ يوليو · الموسم الحالي ${E(FC.season().name)}</dd></div><div><dt>القيد</dt><dd>فرق المسار بسنة الميلاد (تحت X = سنة نهاية الموسم − سنة الميلاد)</dd></div>
        <div><dt>المراحل</dt><dd>${ph.map(p => `${E(p.name)} ${E(p.ages)}`).join(' · ')}</dd></div><div><dt>التقييم</dt><dd>كل ${FC.REVIEW_DAYS / 7} أسابيع على 4 أركان · بحد أقصى 4 أهداف تطوير جارية</dd></div>
        <div><dt>حصة الدقايق</dt><dd>${ph.map(p => `${E(p.name)} ${FC.MINUTES_TARGET[p.id] ? FC.MINUTES_TARGET[p.id] + '%' : 'بالأداء'}`).join(' · ')}</dd></div><div><dt>الأحمال</dt><dd>نسبة أسبوعية آمنة 0.8–1.5 · أعلى من 1.5 تنبيه</dd></div>
        <div><dt>مدرسة الكرة</dt><dd>${(d?.programs || []).map(p => `${E(p.name)} ${p.ageMin}–${p.ageMax}`).join(' · ')}</dd></div><div><dt>التمويل</dt><dd>${FC.FUNDING.join(' · ')}</dd></div></dl></section>` + usage;
    };

    /* ---------- creating or editing a football group: four short steps ---------- */
    if (window.ProgramsUI) {
      const PU = window.ProgramsUI, oldForm = PU.groupForm, DAYN = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], ORDER = [6, 0, 1, 2, 3, 4, 5];
      const fbOn = id => { const g = id && group(id); return g ? g.sport === 'football' : U().sport === 'football'; };
      const bands = () => (window.SportEngine?.get('football')?.programs || []).map(p => ({ name: p.name, min: p.ageMin, max: p.ageMax }));
      const coachesOf = () => [...new Set(db.state.groups.filter(g => g.sport === 'football').map(g => g.coach).filter(Boolean))];
      const pitchesOf = br => [...new Set(db.state.groups.filter(g => g.sport === 'football' && (!br || g.branch === br)).map(g => g.resource).concat(window.SportEngine?.get('football')?.resources?.map(r => r.name || r) || []).filter(x => x && x !== 'مساحة التدريب'))];
      const branches = () => [...new Set(db.state.groups.map(g => g.branch).filter(Boolean))];
      let W = null;
      PU.groupForm = (id = '', kind = '') => {
        if (!fbOn(id)) return oldForm(id, kind);
        const g = id ? group(id) : null, squad = g ? FC.isSquad(g) : kind === 'pathway', U0 = U();
        W = g ? { id, step: 1, kind: squad ? 'pathway' : 'school', by: g.fb?.birthYear || FC.season().end - 12, band: bands().find(b => b.min === g.ageMin)?.name || '', name: g.name, branch: g.branch, capacity: g.capacity, days: g.days.slice(), time: g.time, resource: g.resource, coach: g.coach, coachNew: '', pitchNew: '' }
          : { id: '', step: kind ? 1 : 0, kind: kind || 'school', by: FC.season().end - 12, band: bands()[1]?.name || bands()[0]?.name || '', name: '', branch: U0.branch !== 'all' ? U0.branch : branches()[0] || '', capacity: kind === 'pathway' ? 22 : 18, days: [], time: '17:00', resource: '', coach: '', coachNew: '', pitchNew: '' };
        FU.wiz();
      };
      const STEPS = ['النوع', 'البيانات', 'الجدول والمدرب', 'المراجعة'];
      const field = (l, h, hint = '') => `<label class="fw-field"><span>${l}</span>${h}${hint ? `<small>${hint}</small>` : ''}</label>`;
      const schoolName = () => `مدرسة الكرة · ${W.band || 'مجموعة'}${W.time ? ' · ' + (Number(W.time.slice(0, 2)) < 12 ? 'الصبح' : Number(W.time.slice(0, 2)) < 16 ? 'الضهر' : Number(W.time.slice(0, 2)) < 18 ? 'العصر' : Number(W.time.slice(0, 2)) < 20 ? 'المغرب' : 'الليل') : ''}`;
      const coachOf = () => W.coach === '__new' ? W.coachNew.trim() : W.coach, pitchOf = () => W.resource === '__new' ? W.pitchNew.trim() : W.resource;
      FU.wset = (k, v) => { W[k] = v; };
      FU.wday = d => { W.days = W.days.includes(d) ? W.days.filter(x => x !== d) : [...W.days, d]; FU.wiz(); };
      FU.wiz = (err = '') => {
        const sq = W.kind === 'pathway', u = FC.uOf(Number(W.by)), b = bands().find(x => x.name === W.band);
        const body = W.step === 0 ? `<div class="fw-kinds">${[['pathway', '🎯', 'فريق مسار الاحتراف', 'بالاختيار · فريق لكل سنة ميلاد زي قيد الاتحاد · تقييم وخطة تطوير وماتشات رسمية'], ['school', '⚽', 'مجموعة مدرسة الكرة', 'بالاشتراك · بالسن (براعم، أشبال، ناشئين) والميعاد · مستويات وترقية']].map(([k, i, t, d]) => `<button type="button" class="fw-kind ${W.kind === k ? 'on' : ''}" onclick="FootballUI.wset('kind','${k}');FootballUI.wset('capacity',${k === 'pathway' ? 22 : 18});FootballUI.wnext()"><span>${i}</span><b>${t}</b><small>${d}</small></button>`).join('')}</div>`
          : W.step === 1 ? (sq ? `${field('سنة الميلاد', `<input type="number" value="${W.by}" min="${FC.season().end - 21}" max="${FC.season().end - 6}" ${W.id ? 'disabled' : ''} oninput="FootballUI.wset('by',this.value);document.getElementById('fw-sq').textContent=FootballCore.squadName(Number(this.value))+' · مرحلة '+FootballCore.phaseOf(FootballCore.uOf(Number(this.value))).name">`, `<b id="fw-sq">${E(FC.squadName(Number(W.by)))} · مرحلة ${E(FC.phaseOf(u).name)}</b>`)}`
              : `${field('الفئة العمرية', `<div class="fw-chips">${bands().map(x => `<button type="button" class="${W.band === x.name ? 'on' : ''}" onclick="FootballUI.wset('band','${E(x.name)}');FootballUI.wiz()">${E(x.name)} <small>${x.min}–${x.max}</small></button>`).join('')}</div>`)}${field('اسم المجموعة', `<input value="${E(W.name || schoolName())}" oninput="FootballUI.wset('name',this.value)">`, 'اقتراح من الفئة والميعاد، وتقدر تغيّره')}`)
              + `<div class="fw-row">${field('الفرع', `<select onchange="FootballUI.wset('branch',this.value);FootballUI.wset('resource','')">${branches().map(x => `<option ${W.branch === x ? 'selected' : ''}>${E(x)}</option>`).join('')}</select>`)}${field('السعة', `<input type="number" min="4" max="40" value="${W.capacity}" oninput="FootballUI.wset('capacity',this.value)">`, 'أقصى عدد لاعبين')}</div>`
          : W.step === 2 ? `${field('أيام التدريب', `<div class="fw-chips">${ORDER.map(d => `<button type="button" class="${W.days.includes(d) ? 'on' : ''}" onclick="FootballUI.wday(${d})">${DAYN[d]}</button>`).join('')}</div>`)}
              <div class="fw-row">${field('الميعاد', `<input type="time" value="${E(W.time)}" oninput="FootballUI.wset('time',this.value)">`)}${field('الملعب', `<select onchange="FootballUI.wset('resource',this.value);document.getElementById('fw-pitch-new').hidden=this.value!=='__new'"><option value="">اختار الملعب</option>${pitchesOf(W.branch).map(x => `<option ${W.resource === x ? 'selected' : ''}>${E(x)}</option>`).join('')}<option value="__new" ${W.resource === '__new' ? 'selected' : ''}>+ ملعب تاني…</option></select><input id="fw-pitch-new" ${W.resource === '__new' ? '' : 'hidden'} placeholder="اسم الملعب" value="${E(W.pitchNew)}" oninput="FootballUI.wset('pitchNew',this.value)">`)}</div>
              ${field('المدرب المسؤول', `<select onchange="FootballUI.wset('coach',this.value);document.getElementById('fw-coach-new').hidden=this.value!=='__new'"><option value="">اختار المدرب</option>${coachesOf().map(x => `<option ${W.coach === x ? 'selected' : ''}>${E(x)}</option>`).join('')}<option value="__new" ${W.coach === '__new' ? 'selected' : ''}>+ مدرب جديد…</option></select><input id="fw-coach-new" ${W.coach === '__new' ? '' : 'hidden'} placeholder="اسم المدرب" value="${E(W.coachNew)}" oninput="FootballUI.wset('coachNew',this.value)">`, 'كل مجموعة لازم يكون ليها مدرب مسؤول')}`
          : `<dl class="fw-review">${[['النوع', sq ? 'فريق مسار الاحتراف' : 'مجموعة مدرسة الكرة'], ['الاسم', sq ? FC.squadName(Number(W.by)) : (W.name || schoolName())], [sq ? 'المرحلة' : 'الفئة', sq ? FC.phaseOf(u).name : `${W.band} (${b?.min}–${b?.max} سنة)`], ['الفرع', W.branch], ['السعة', W.capacity + ' لاعب'], ['الجدول', `${ORDER.filter(d => W.days.includes(d)).map(d => DAYN[d]).join('، ')} · ${W.time}`], ['الملعب', pitchOf()], ['المدرب', coachOf()]].map(([k, v]) => `<div><dt>${k}</dt><dd>${E(v)}</dd></div>`).join('')}</dl><p class="py-help">${W.id ? 'الحصص الجاية اللي محدش أكدها هتتعاد بالجدول الجديد.' : 'بعد الإنشاء الحصص بتتولد لوحدها لأسبوعين قدام، وبعدها تضيف اللاعبين.'}</p>`;
        V.open(`<div class="fw" data-no-fit><header class="fw-head"><h3>${W.id ? 'تعديل ' + E(sq ? FC.squadName(Number(W.by)) : W.name) : sq ? 'فريق مسار جديد' : 'مجموعة مدرسة جديدة'}</h3><small>خطوة ${W.step + 1} من 4 · ${STEPS[W.step]}</small></header>
          <ol class="fw-steps">${STEPS.map((x, i) => `<li class="${i === W.step ? 'on' : i < W.step ? 'done' : ''}">${x}</li>`).join('')}</ol>
          <div class="fw-body">${body}</div>${err ? `<p class="rg-error">${E(err)}</p>` : ''}
          <footer class="fw-foot">${W.step > (W.id ? 1 : 0) ? `<button type="button" class="rg-btn" onclick="FootballUI.wback()">→ السابق</button>` : '<span></span>'}${W.step === 0 ? '' : W.step < 3 ? `<button type="button" class="rg-btn primary" onclick="FootballUI.wnext()">التالي ←</button>` : `<button type="button" class="rg-btn primary" onclick="FootballUI.wsave()">${W.id ? 'حفظ التعديلات' : sq ? 'إنشاء الفريق' : 'إنشاء المجموعة'} ✓</button>`}</footer></div>`);
      };
      FU.wback = () => { W.step--; FU.wiz(); };
      FU.wnext = () => {
        try {
          if (W.step === 1) {
            const cap = Number(W.capacity); if (!Number.isInteger(cap) || cap < 4 || cap > 40) throw Error('السعة من 4 لـ 40');
            if (!W.branch) throw Error('اختار الفرع');
            if (W.kind === 'pathway' && !W.id && FC.squads(db.state).some(g => g.fb.birthYear === Number(W.by) && g.branch === W.branch)) throw Error(`فيه فريق لمواليد ${W.by} في ${W.branch} بالفعل`);
            if (W.kind === 'school') { if (!W.band) throw Error('اختار الفئة العمرية'); if (!W.name) W.name = schoolName(); }
          }
          if (W.step === 2) { if (!W.days.length) throw Error('اختار يوم تدريب واحد على الأقل'); if (!/^\d{2}:\d{2}$/.test(W.time)) throw Error('اختار الميعاد'); if (!pitchOf()) throw Error('اختار الملعب'); if (!coachOf()) throw Error('اختار المدرب المسؤول'); }
          W.step++; FU.wiz();
        } catch (e) { FU.wiz(e.message); }
      };
      FU.wsave = () => {
        try {
          const sq = W.kind === 'pathway', u = FC.uOf(Number(W.by)), b = bands().find(x => x.name === W.band), name = sq ? FC.squadName(Number(W.by)) : (W.name || schoolName()).trim();
          const fields = { name, branch: W.branch, capacity: Number(W.capacity), days: [...new Set(W.days)], time: W.time, coach: coachOf(), resource: pitchOf(), ageMin: sq ? u - 1 : b.min, ageMax: sq ? u : b.max, fb: sq ? { tier: 'pathway', birthYear: Number(W.by) } : { tier: 'school' } };
          let gid = W.id;
          db.update(st => {
            if (W.id) {
              const g = st.groups.find(x => x.id === W.id), n = st.members.filter(m => m.group === W.id).length;
              if (fields.capacity < n) throw Error(`في المجموعة ${n} لاعب؛ السعة متقلش عن كده`);
              Object.assign(g, fields);
              st.sessions = st.sessions.filter(x => !(x.auto && x.group === W.id && x.status === 'scheduled' && new Date(x.start) > new Date() && !Object.keys(x.present || {}).length && !Object.keys(x.rsvp || {}).length));
            } else {
              if (!sq && st.groups.some(g => g.name === name && g.branch === W.branch)) throw Error('فيه مجموعة بنفس الاسم في الفرع ده');
              gid = db.id('group'); st.groups.push({ id: gid, sport: 'football', ...fields });
            }
            st.audit.unshift({ id: db.id('audit'), at: new Date().toISOString(), action: W.id ? 'تعديل مجموعة' : 'إنشاء مجموعة', details: name });
          });
          const added = window.Schedule?.topUp ? Schedule.topUp() : 0, editing = !!W.id;
          V.close(); render(); toast(`${editing ? 'اتحفظت التعديلات' : 'اتعملت ' + name}${added ? ' · ' + added + ' حصة في الجدول' : ''}`);
          if (!editing) setTimeout(() => window.AcademyUI.groupDetail(gid), 60);
        } catch (e) { FU.wiz(e.message); }
      };
    }

    /* The all-sports home opens with the same day at a glance. */
    if (window.AcademyUI?.home) { const AU = window.AcademyUI, baseAll = AU.home; AU.home = function () { const html = baseAll.apply(this, arguments); return AU.sport === 'all' ? `<div class="fb-day-wrap">${FU.dayHero(AU.scope(), AU.branch === 'all' ? 'كل الفروع' : AU.branch)}</div>` + html : html; }; if (PAGES.dash === baseAll) PAGES.dash = AU.home; }

    /* A pathway player's file is the development profile. */
    if (window.Refine?.profile) { const profile = Refine.profile; Refine.profile = id => { const m = db.member(id); if (m && FC.isPathway(db.state, m)) { V.close && V.close(); FU.openPlayer(id); } else profile(id); }; }
  }

  /* =========================================================== physical tests and growth */
  const TK = Object.keys(FC.TESTS);
  const fmtV = (k, v) => v == null ? '—' : (FC.TESTS[k]?.unit === 'ث' ? Number(v).toFixed(2) : Math.round(v)) + ' ' + (FC.TESTS[k]?.unit || '');
  const delta = (k, now, before) => { const d = FC.improved(k, now, before); if (!d) return ''; const txt = FC.TESTS[k].unit === 'ث' ? Math.abs(d).toFixed(2) : Math.round(Math.abs(d)); return d > 0 ? `<em class="fb-up">▲ ${txt}</em>` : `<em class="fb-down">▼ ${txt}</em>`; };
  const heightLine = series => { if (series.length < 2) return ''; const w = 220, h = 60, lo = Math.min(...series.map(p => p.height)) - 1, hi = Math.max(...series.map(p => p.height)) + 1, t0 = new Date(series[0].at), t1 = new Date(series.at(-1).at); const pt = p => [(new Date(p.at) - t0) / ((t1 - t0) || 1) * (w - 16) + 8, h - 8 - (p.height - lo) / (hi - lo) * (h - 16)];
    return `<svg class="fb-hline" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" direction="ltr" style="direction:ltr" aria-hidden="true"><polyline points="${series.map(p => pt(p).map(n => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#2f6f8f" stroke-width="2.4"/>${series.map(p => { const [x, y] = pt(p); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="#2f6f8f"/>`; }).join('')}</svg>`; };
  FU.growthCard = (m, players) => {
    const rows = FC.tests(db.state, m.id), g = FC.growth(db.state, m);
    if (!rows.length) return `<section class="fb-card"><h3>البدني والنمو</h3><p class="fb-empty">مفيش قياسات لسه. سجّلها من «جلسة قياس» في صفحة الفريق.</p></section>`;
    return `<section class="fb-card fb-physical"><h3>البدني والنمو <small>آخر قياس ${E(short(rows.at(-1).at))}</small></h3>
      <div class="fb-tests">${TK.map(k => { const l = FC.lastValue(rows, k), b = FC.prevValue(rows, k), r = players ? FC.squadRank(db.state, players, m.id, k) : null; return `<div class="fb-test ${r?.third ? 'fb-' + r.third : ''}"><small>${E(FC.TESTS[k].name)}</small><b>${fmtV(k, l?.value)}</b><span>${delta(k, l?.value, b?.value)}${r ? `<i>الـ${r.rank} من ${r.of}</i>` : ''}</span></div>`; }).join('')}</div>
      ${g ? `<div class="fb-growth"><div><small>الطول</small><b>${g.height} سم</b><span>${g.velocity != null ? `${g.velocity} سم/سنة` : ''}</span></div><div><small>الوزن</small><b>${g.weight ?? '—'} كجم</b></div>${g.adult ? `<div><small>الطول المتوقع للبلوغ</small><b>${g.adult} سم</b><span>وصل ${g.pctAdult}%</span></div>` : ''}${g.timing ? `<div><small>طفرة النمو</small><b>${E(FC.TIMING[g.timing])}</b><span>${g.offset > 0 ? `عدّاها من ${g.offset} سنة` : g.offset < 0 ? `فاضل ~${Math.abs(g.offset)} سنة` : 'دلوقتي'} · عند ${g.phvAge} سنة</span></div>` : ''}${heightLine(g.series)}</div>
        ${g.spurt ? '<p class="fb-warn">⚠ في طفرة نمو دلوقتي: قلّل القفز والتسديد المتكرر والجري على الأسفلت، وراقب ألم الركبة والكعب. السرعة والتوافق ممكن يقلّوا مؤقتًا، ده طبيعي.</p>' : ''}
        ${g.timing === 'late' ? '<p class="py-help">نضجه متأخر عن سنه: متحكمش عليه بالقوة والسرعة دلوقتي، قارنه بنفسه.</p>' : g.timing === 'early' ? '<p class="py-help">نضجه مبكر: تفوقه البدني ممكن يكون مؤقت، ركّز معاه على المهارة والقرار.</p>' : ''}` : ''}</section>`;
  };

  FU.testForm = gid => {
    const g = group(gid), players = FC.playersOf(db.state, gid);
    V.open(`<div class="ma-form fb-form fb-test-form"><h3>جلسة قياس · ${E(FC.squadName(g.fb.birthYear))}</h3><p class="py-help">اكتب اللي اتقاس بس؛ الخانة الفاضية بتتساب. الأزمنة بالثانية (مثلًا 1.95)، الوثب بالسنتي، والـ Yo-Yo بالمتر.</p>
      <div class="fb-test-table"><table><thead><tr><th>اللاعب</th>${TK.map(k => `<th>${E(FC.TESTS[k].name)}</th>`).join('')}<th>الطول</th><th>الوزن</th><th>طول الجلوس</th></tr></thead><tbody>${players.map(p => `<tr data-mid="${p.id}"><td>${E(p.name)}</td>${TK.map(k => `<td><input data-k="${k}" type="number" step="0.01" inputmode="decimal" aria-label="${E(FC.TESTS[k].name)} ${E(p.name)}"></td>`).join('')}${['height', 'weight', 'sitting'].map(k => `<td><input data-b="${k}" type="number" step="0.1" inputmode="decimal" aria-label="${E(FC.BODY[k].name)} ${E(p.name)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveTests('${gid}')">حفظ الجلسة</button></div>`);
    document.getElementById('modal')?.classList.add('fn-wide');
  };
  FU.saveTests = gid => V.run(() => {
    const entries = [...document.querySelectorAll('.fb-test-table tr[data-mid]')].map(tr => ({ memberId: tr.dataset.mid, values: Object.fromEntries([...tr.querySelectorAll('[data-k]')].map(i => [i.dataset.k, i.value])), ...Object.fromEntries([...tr.querySelectorAll('[data-b]')].map(i => [i.dataset.b, i.value])) }));
    let n = 0; db.update(st => { n = FC.recordTests(st, entries, { by: group(gid).coach }).length; });
    V.close(); render(); toast(`اتسجلت قياسات ${n} لاعب`);
  });

  FU.physicalSection = gid => {
    const players = FC.playersOf(db.state, gid), last = players.flatMap(p => FC.tests(db.state, p.id)).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
    const rows = players.map(p => ({ p, g: FC.growth(db.state, p) }));
    const cell = (p, k) => { const v = FC.lastValue(FC.tests(db.state, p.id), k)?.value, r = FC.squadRank(db.state, players, p.id, k); return `<td class="${r?.third ? 'fb-' + r.third : ''}">${v == null ? '—' : FC.TESTS[k].unit === 'ث' ? Number(v).toFixed(2) : Math.round(v)}</td>`; };
    return `<section class="fb-card fb-phys-squad"><header class="fb-card-head"><h3>البدني والنمو ${last ? `<small>آخر جلسة ${E(short(last.at))}</small>` : ''}</h3><button type="button" class="sb-btn primary" onclick="FootballUI.testForm('${gid}')">جلسة قياس جديدة</button></header>
      <div class="fb-test-table"><table><thead><tr><th>اللاعب</th>${TK.map(k => `<th>${E(FC.TESTS[k].name)}<small>${E(FC.TESTS[k].unit)}</small></th>`).join('')}<th>الطول</th><th>النمو</th><th>النضج</th></tr></thead><tbody>${rows.map(({ p, g }) => `<tr><td><button type="button" class="fb-link" onclick="FootballUI.openPlayer('${p.id}')">${E(p.name)}</button></td>${TK.map(k => cell(p, k)).join('')}<td>${g?.height ?? '—'}</td><td>${g?.velocity != null ? g.velocity + ' سم/سنة' : '—'}${g?.spurt ? ' <span class="fb-badge warn">طفرة</span>' : ''}</td><td>${g?.timing ? `<span class="fb-badge ${g.timing}">${E(FC.TIMING[g.timing])}</span>` : '—'}</td></tr>`).join('')}</tbody></table></div>
      <p class="py-help">الأخضر = أحسن تلت في الفريق، والبرتقالي = أقل تلت. قارن اللاعب بنفسه قبل ما تقارنه بزمايله، خصوصًا وقت طفرة النمو.</p></section>`;
  };

  /* =========================================================== matches, minutes, load */
  const when = v => fmt(v, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const resultTag = x => { if (x.status !== 'played') return '<span class="fb-badge">قادم</span>'; const r = x.score.us > x.score.them ? ['فوز', 'ok'] : x.score.us < x.score.them ? ['خسارة', 'bad'] : ['تعادل', '']; return `<span class="fb-res ${r[1]}">${x.score.us} – ${x.score.them} · ${r[0]}</span>`; };
  FU.matchesSection = gid => {
    const g = group(gid), list = FC.matches(db.state, gid), up = list.filter(x => x.status !== 'played'), played = list.filter(x => x.status === 'played').reverse(), table = FC.minutesTable(db.state, gid), ph = FC.phaseOf(FC.uOf(g.fb.birthYear));
    const w = played.filter(x => x.score.us > x.score.them).length, dr = played.filter(x => x.score.us === x.score.them).length;
    const row = x => `<div class="fb-match"><div class="fb-match-when"><b>${E(when(x.at))}</b><small>${E(x.competition)} · ${x.home ? 'على أرضنا' : 'خارج'}${x.venue ? ' · ' + E(x.venue) : ''}</small></div><div class="fb-match-vs"><b>${E(x.opponent)}</b><small>${x.format.players} ضد ${x.format.players} · ${x.format.minutes} دقيقة</small></div>${resultTag(x)}<span class="py-actions">${x.status === 'played' ? `<button type="button" class="sb-btn" onclick="FootballUI.resultForm('${x.id}')">التشكيل والدقائق</button>` : `<button type="button" class="sb-btn primary" onclick="FootballUI.resultForm('${x.id}')">تسجيل النتيجة</button>`}</span></div>`;
    return `<section class="fb-card"><header class="fb-card-head"><h3>ماتشات الفريق <small>${played.length} ماتش · ${w} فوز · ${dr} تعادل · ${played.length - w - dr} خسارة</small></h3><button type="button" class="sb-btn primary" onclick="FootballUI.matchForm('${gid}')">+ ماتش</button></header>
      <p class="py-help">ماتشات رسمية وودية قدام أكاديميات وأندية تانية، مش بين مجموعات التمرين. في مرحلة ${E(ph.name)} الهدف ${FC.MINUTES_TARGET[ph.id] ? `إن كل لاعب ياخد ${FC.MINUTES_TARGET[ph.id]}% على الأقل من الدقائق` : 'المنافسة والاختيار حسب الأداء'}.</p>
      ${up.length ? `<h4 class="fb-sub">القادمة</h4>${up.map(row).join('')}` : ''}${played.length ? `<h4 class="fb-sub">اتلعبت</h4>${played.map(row).join('')}` : '<p class="fb-empty">لسه مفيش ماتشات اتلعبت.</p>'}</section>
      <section class="fb-card"><h3>الدقائق والمشاركة</h3><div class="fb-test-table"><table><thead><tr><th>اللاعب</th><th>المركز</th><th>مشاركات</th><th>أساسي</th><th>الدقائق</th><th>من المتاح</th><th>أهداف</th><th>صناعة</th><th>متوسط التقييم</th></tr></thead><tbody>${table.sort((a, b) => b.minutes - a.minutes).map(r => `<tr class="${r.under ? 'fb-under' : ''}"><td><button type="button" class="fb-link" onclick="FootballUI.openPlayer('${r.member.id}')">${E(r.member.name)}</button>${FC.injured(db.state, r.member.id) ? ' <span class="fb-badge warn">مصاب</span>' : ''}</td><td>${E(pos(r.member)?.short || '—')}</td><td>${r.apps}</td><td>${r.starts}</td><td>${r.minutes}</td><td><span class="fb-share"><i style="width:${Math.min(100, r.share)}%"></i></span>${r.share}%${r.under ? ' ⚠' : ''}</td><td>${r.goals}</td><td>${r.assists}</td><td>${r.rating ?? '—'}</td></tr>`).join('')}</tbody></table></div>
      ${table.some(r => r.under) ? `<p class="fb-warn">⚠ ${table.filter(r => r.under).length} لاعب أقل من ${table[0].target}% من الدقائق. الدقايق جزء من التطوير في السن ده؛ ادّيهم وقت أكتر في الماتشات الجاية.</p>` : ''}</section>`;
  };

  FU.playerMatches = m => {
    const t = FC.minutesTable(db.state, m.group).find(r => r.member.id === m.id), w = FC.workload(db.state, m.id), inj = FC.injured(db.state, m.id), next = FC.matches(db.state, m.group).find(x => x.status !== 'played');
    return `<section class="fb-card"><h3>الماتشات والأحمال</h3><div class="fb-growth"><div><small>مشاركات</small><b>${t?.apps ?? 0}</b><span>${t?.starts ?? 0} أساسي</span></div><div><small>الدقائق</small><b>${t?.minutes ?? 0}</b><span>${t?.share ?? 0}% من المتاح${t?.under ? ' ⚠' : ''}</span></div><div><small>أهداف · صناعة</small><b>${t?.goals ?? 0} · ${t?.assists ?? 0}</b></div><div><small>متوسط التقييم</small><b>${t?.rating ?? '—'}</b></div><div><small>حمل الأسبوع</small><b>${w.acute}</b><span>${w.ratio != null ? 'النسبة ' + w.ratio : ''}</span></div>${inj ? `<div class="fb-injured"><small>إصابة</small><b>${E(inj.part)}</b><span>${E(FC.INJURY[inj.status])}</span></div>` : ''}</div>${next ? `<p class="py-help">الماتش الجاي: ${E(next.opponent)} · ${E(when(next.at))}</p>` : ''}</section>`;
  };
  FU.matchForm = gid => {
    const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); d.setHours(10, 0, 0, 0);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    V.open(`<div class="ma-form fb-form"><h3>ماتش جديد · ${E(FC.squadName(group(gid).fb.birthYear))}</h3><label>الفريق المنافس<input id="fbm-opp" placeholder="مثلًا: أكاديمية الشروق"></label><label>النوع<select id="fbm-comp">${FC.COMPETITIONS.map(c => `<option>${c}</option>`).join('')}</select></label><label>الميعاد<input id="fbm-at" type="datetime-local" value="${local}"></label><div class="rg-seg"><label><input type="radio" name="fbm-home" value="true" checked><span>على أرضنا</span></label><label><input type="radio" name="fbm-home" value="false"><span>خارج</span></label></div><label>الملعب<input id="fbm-venue" placeholder="اختياري"></label><button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveMatch('${gid}')">حفظ</button></div>`);
  };
  FU.saveMatch = gid => V.run(() => { const v = id => document.getElementById(id)?.value; db.update(st => FC.addMatch(st, gid, { opponent: v('fbm-opp'), competition: v('fbm-comp'), at: v('fbm-at'), home: document.querySelector('[name=fbm-home]:checked')?.value, venue: v('fbm-venue') })); after(); toast('اتضاف الماتش'); });
  FU.resultForm = mid => {
    const x = db.state.fbMatches.find(r => r.id === mid), players = FC.playersOf(db.state, x.squadId), byId = Object.fromEntries((x.lineup || []).map(l => [l.memberId, l]));
    V.open(`<div class="ma-form fb-form fb-test-form"><h3>${E(x.opponent)} · ${E(when(x.at))}</h3><div class="fb-score"><label>أهدافنا<input id="fbr-us" type="number" min="0" value="${x.score?.us ?? ''}"></label><span>–</span><label>أهدافهم<input id="fbr-them" type="number" min="0" value="${x.score?.them ?? ''}"></label></div>
      <p class="py-help">${x.format.players} ضد ${x.format.players} · ${x.format.minutes} دقيقة. علّم اللي لعب واكتب دقايقه؛ المصاب مش متاح.</p>
      <div class="fb-test-table"><table><thead><tr><th>اللاعب</th><th>لعب</th><th>أساسي</th><th>الدقائق</th><th>أهداف</th><th>صناعة</th><th>تقييم /10</th></tr></thead><tbody>${players.map(p => { const l = byId[p.id], inj = FC.injured(db.state, p.id);
        return `<tr data-mid="${p.id}" class="${inj ? 'fb-off' : ''}"><td>${E(p.name)} <small>${E(pos(p)?.short || '')}</small>${inj ? ' <span class="fb-badge warn">مصاب</span>' : ''}</td><td><input type="checkbox" data-f="played" ${l ? 'checked' : ''} ${inj ? 'disabled' : ''}></td><td><input type="checkbox" data-f="start" ${l?.start ? 'checked' : ''} ${inj ? 'disabled' : ''}></td><td><input data-f="minutes" type="number" min="1" max="${x.format.minutes}" value="${l?.minutes ?? x.format.minutes}" ${inj ? 'disabled' : ''}></td><td><input data-f="goals" type="number" min="0" value="${l?.goals ?? 0}" ${inj ? 'disabled' : ''}></td><td><input data-f="assists" type="number" min="0" value="${l?.assists ?? 0}" ${inj ? 'disabled' : ''}></td><td><input data-f="rating" type="number" min="1" max="10" value="${l?.rating ?? ''}" ${inj ? 'disabled' : ''}></td></tr>`; }).join('')}</tbody></table></div>
      <label>ملاحظة المدرب<input id="fbr-note" value="${E(x.note || '')}"></label><button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveResult('${mid}')">حفظ النتيجة</button></div>`);
    document.getElementById('modal')?.classList.add('fn-wide');
  };
  FU.saveResult = mid => V.run(() => {
    const lineup = [...document.querySelectorAll('.fb-test-table tr[data-mid]')].map(tr => { const f = k => tr.querySelector(`[data-f=${k}]`); return { memberId: tr.dataset.mid, played: f('played').checked, start: f('start').checked, minutes: f('minutes').value, goals: f('goals').value, assists: f('assists').value, rating: f('rating').value }; });
    db.update(st => FC.recordResult(st, mid, { us: document.getElementById('fbr-us').value, them: document.getElementById('fbr-them').value, lineup, note: document.getElementById('fbr-note').value }));
    after(); toast('اتسجلت النتيجة والدقائق');
  });

  const zone = { high: ['حمل عالي', 'bad'], low: ['حمل قليل', 'warn'], ok: ['مناسب', 'ok'] };
  FU.loadSection = gid => {
    const players = FC.playersOf(db.state, gid), rows = players.map(p => ({ p, w: FC.workload(db.state, p.id), inj: FC.injured(db.state, p.id) }));
    const inj = (db.state.fbInjuries || []).filter(r => players.some(p => p.id === r.memberId)).sort((a, b) => (a.status === 'cleared') - (b.status === 'cleared') || new Date(b.at) - new Date(a.at));
    return `<section class="fb-card"><header class="fb-card-head"><h3>أحمال التدريب <small>المجهود × الدقائق · آخر 7 أيام مقارنة بمتوسط 4 أسابيع</small></h3><button type="button" class="sb-btn primary" onclick="FootballUI.loadForm('${gid}')">تسجيل مجهود الحصة</button></header>
      <div class="fb-test-table"><table><thead><tr><th>اللاعب</th><th>آخر مجهود</th><th>حمل الأسبوع</th><th>متوسط الأسبوع (4 أسابيع)</th><th>النسبة</th><th>الحالة</th></tr></thead><tbody>${rows.sort((a, b) => (b.w.ratio || 0) - (a.w.ratio || 0)).map(({ p, w, inj }) => `<tr><td><button type="button" class="fb-link" onclick="FootballUI.openPlayer('${p.id}')">${E(p.name)}</button></td><td>${w.last ? `${w.last.rpe}/10 · ${E(short(w.last.at))}` : '—'}</td><td>${w.acute}</td><td>${w.chronic}</td><td>${w.ratio ?? '—'}</td><td>${inj ? `<span class="fb-badge warn">${E(FC.INJURY[inj.status])}</span>` : w.zone ? `<span class="fb-badge ${zone[w.zone][1]}">${zone[w.zone][0]}</span>` : '—'}</td></tr>`).join('')}</tbody></table></div>
      <p class="py-help">النسبة بين 0.8 و1.3 مناسبة. فوق 1.5 الزيادة سريعة ومعاها خطر إصابة أعلى؛ خفف الحمل أو زوده تدريجيًا. اللاعب بيقيّم مجهوده من 1 لـ 10 بعد الحصة.</p></section>
      <section class="fb-card"><header class="fb-card-head"><h3>الإصابات</h3><button type="button" class="sb-btn" onclick="FootballUI.injuryForm('${gid}')">+ إصابة</button></header>
      ${inj.map(r => `<div class="fb-inj ${r.status}"><b>${E(db.member(r.memberId).name)}</b><span>${E(r.part)}${r.kind ? ' · ' + E(r.kind) : ''}</span><small>من ${E(short(r.at))}${r.expected ? ' · رجوع متوقع ' + E(short(r.expected)) : ''}</small><span class="fb-badge ${r.status === 'cleared' ? 'ontime' : 'warn'}">${E(FC.INJURY[r.status])}</span>${r.status !== 'cleared' ? `<span class="py-actions">${r.status === 'active' ? `<button type="button" class="sb-btn" onclick="FootballUI.injuryStatus('${r.id}','rehab')">بدأ التأهيل</button>` : ''}<button type="button" class="sb-btn" onclick="FootballUI.injuryStatus('${r.id}','cleared')">رجع للملعب</button></span>` : ''}</div>`).join('') || '<p class="fb-empty">مفيش إصابات مسجلة.</p>'}</section>`;
  };
  FU.loadForm = gid => {
    const g = group(gid), players = FC.playersOf(db.state, gid), s = db.state.sessions.filter(x => x.group === gid && new Date(x.start) <= new Date()).sort((a, b) => new Date(b.start) - new Date(a.start))[0];
    V.open(`<div class="ma-form fb-form fb-test-form"><h3>مجهود الحصة · ${E(FC.squadName(g.fb.birthYear))}</h3><p class="py-help">${s ? E(when(s.start)) + ' · ' : ''}كل لاعب يقول مجهوده من 1 (سهل جدًا) لـ 10 (أقصى مجهود). سيب الخانة فاضية للي ماحضرش.</p>
      <label>مدة الحصة بالدقيقة<input id="fbl-min" type="number" min="5" max="180" value="${s?.duration || 90}"></label>
      <div class="fb-test-table"><table><thead><tr><th>اللاعب</th><th>المجهود 1–10</th></tr></thead><tbody>${players.map(p => `<tr data-mid="${p.id}"><td>${E(p.name)}</td><td><input type="number" min="1" max="10" data-rpe ${FC.injured(db.state, p.id) ? 'disabled placeholder="مصاب"' : ''}></td></tr>`).join('')}</tbody></table></div>
      <button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveLoad('${gid}')">حفظ</button></div>`);
  };
  FU.saveLoad = gid => V.run(() => { const minutes = document.getElementById('fbl-min').value; let n = 0; db.update(st => { n = FC.recordLoad(st, [...document.querySelectorAll('.fb-test-table tr[data-mid]')].map(tr => ({ memberId: tr.dataset.mid, rpe: tr.querySelector('[data-rpe]').value, minutes }))).length; }); after(); toast(`اتسجل مجهود ${n} لاعب`); });
  FU.injuryForm = gid => V.open(`<div class="ma-form fb-form"><h3>تسجيل إصابة</h3><label>اللاعب<select id="fbi-m">${FC.playersOf(db.state, gid).map(p => `<option value="${p.id}">${E(p.name)}</option>`).join('')}</select></label><label>مكان الإصابة<input id="fbi-part" placeholder="مثلًا: الكاحل الشمال"></label><label>النوع<input id="fbi-kind" placeholder="مثلًا: التواء درجة أولى"></label><label>الرجوع المتوقع<input id="fbi-exp" type="date"></label><label>ملاحظة<input id="fbi-note"></label><button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveInjury()">حفظ</button></div>`);
  FU.saveInjury = () => V.run(() => { const v = id => document.getElementById(id)?.value; db.update(st => FC.addInjury(st, v('fbi-m'), { part: v('fbi-part'), kind: v('fbi-kind'), expected: v('fbi-exp'), note: v('fbi-note') })); after(); toast('اتسجلت الإصابة'); });
  FU.injuryStatus = (id, st2) => V.run(() => { db.update(st => FC.setInjury(st, id, st2)); after(); });

  /* =========================================================== forms (both pages) */
  const after = () => { V.close(); if (typeof render === 'function' && typeof PAGES !== 'undefined') render(); if (typeof draw === 'function' && typeof APPS !== 'undefined') draw(); };
  FU.assess = id => {
    const p = db.member(id), last = FC.latest(db.state, id);
    V.open(`<div class="ma-form fb-form"><h3>تقييم ${E(p.name)}</h3><p class="py-help">${E(pos(p)?.name || '')} · من 1 (محتاج شغل كتير) لـ 5 (ممتاز لسنه). ${last ? 'القيم المعروضة هي التقييم اللي فات؛ غيّر اللي اتغير.' : ''}</p>
      ${KEYS.map(k => `<fieldset class="fb-fs"><legend style="color:${FC.CORNERS[k].color}">${E(FC.CORNERS[k].name)}</legend>${FC.itemsOf(k, p.fb?.position).map((it, i) => `<div class="fb-rate"><span>${E(it)}</span><span class="fb-seg" role="radiogroup" aria-label="${E(it)}">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="fb-${k}-${i}" value="${v}" ${(last?.scores[k]?.[i] || 3) === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</span></div>`).join('')}</fieldset>`).join('')}
      <label>نقطة القوة<input id="fb-strengths" placeholder="مثلًا: الرؤية والتمريرة الأخيرة"></label><label>التركيز الجاي<input id="fb-focus" placeholder="مثلًا: القوة في الالتحامات"></label><label>ملاحظة للاعب وولي الأمر<textarea id="fb-note" rows="2"></textarea></label>
      <button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveAssess('${id}')">حفظ التقييم</button></div>`);
  };
  FU.saveAssess = id => V.run(() => {
    const p = db.member(id), val = x => document.getElementById(x)?.value || '';
    const scores = Object.fromEntries(KEYS.map(k => [k, FC.itemsOf(k, p.fb?.position).map((_, i) => Number(document.querySelector(`[name="fb-${k}-${i}"]:checked`)?.value))]));
    db.update(st => FC.addAssessment(st, id, { scores, note: val('fb-note'), strengths: val('fb-strengths'), focus: val('fb-focus') }, { by: group(p.group)?.coach || 'المدرب' }));
    after(); toast('اتحفظ التقييم');
  });
  FU.goalForm = (id, gid) => {
    const p = db.member(id), g = gid && FC.idp(db.state, id).goals.find(x => x.id === gid);
    V.open(`<div class="ma-form fb-form"><h3>${g ? 'تحديث هدف' : 'هدف تطوير جديد'} · ${E(p.name)}</h3>
      <label>المحور<select id="fb-g-corner" ${g ? 'disabled' : ''}>${KEYS.map(k => `<option value="${k}" ${g?.corner === k ? 'selected' : ''}>${E(FC.CORNERS[k].name)}</option>`).join('')}</select></label>
      <label>الهدف<input id="fb-g-text" value="${E(g?.text || '')}" placeholder="مثلًا: التمرير بالقدم الضعيفة" ${g ? 'readonly' : ''}></label>
      <label>هنقيسه إزاي<input id="fb-g-measure" value="${E(g?.measure || '')}" placeholder="مثلًا: 20 تمريرة صحيحة متتالية"></label>
      <label>الموعد<input id="fb-g-due" type="date" value="${E(g?.due || '')}"></label>
      <label>التقدم <output id="fb-g-out">${g?.progress ?? 0}%</output><input id="fb-g-progress" type="range" min="0" max="100" step="5" value="${g?.progress ?? 0}" oninput="document.getElementById('fb-g-out').textContent=this.value+'%'"></label>
      ${g ? `<label>الحالة<select id="fb-g-status">${Object.entries(FC.GOAL_STATUS).map(([k, l]) => `<option value="${k}" ${g.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
      <button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveGoal('${id}','${gid || ''}')">حفظ</button></div>`);
  };
  FU.saveGoal = (id, gid) => V.run(() => {
    const v = x => document.getElementById(x)?.value;
    db.update(st => FC.saveGoal(st, id, { id: gid || undefined, corner: v('fb-g-corner'), text: v('fb-g-text'), measure: v('fb-g-measure'), due: v('fb-g-due'), progress: v('fb-g-progress'), status: v('fb-g-status') || 'active' }));
    after(); toast('اتحفظ الهدف');
  });
  FU.reviewForm = id => V.open(`<div class="ma-form fb-form"><h3>مراجعة خطة ${E(db.member(id).name)}</h3><label class="fb-check"><input type="checkbox" id="fb-r-parent" checked> المراجعة كانت مع ولي الأمر</label><label>اللي اتفقنا عليه<textarea id="fb-r-note" rows="3"></textarea></label><button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveReview('${id}')">حفظ المراجعة</button></div>`);
  FU.saveReview = id => V.run(() => { db.update(st => FC.review(st, id, { withParent: document.getElementById('fb-r-parent').checked, note: document.getElementById('fb-r-note').value }, { by: group(db.member(id).group)?.coach || '' })); after(); toast('اتسجلت المراجعة'); });

  /* Quick actions that need a squad or a player first. */
  FU.quick = kind => {
    const list = FC.squads(db.state).filter(g => { const U = window.AcademyUI; return !U || U.branch === 'all' || g.branch === U.branch; });
    if (kind === 'assess') {
      const rows = list.flatMap(g => FC.playersOf(db.state, g.id).filter(p => FC.due(db.state, p.id)).map(p => ({ p, g })));
      return V.open(`<div class="ma-form fb-form"><h3>تقييمات مستحقة</h3><p class="py-help">آخر تقييم عدّى عليه 8 أسابيع أو مفيش تقييم خالص.</p><div class="fb-home-list">${rows.map(({ p, g }) => `<button type="button" class="fb-home-row" onclick="FootballUI.assess('${p.id}')"><span class="fb-home-dot" style="background:${FC.phaseOf(FC.uOf(g.fb.birthYear)).color}"></span><span class="fb-home-main"><b>${E(p.name)}</b><small>${E(FC.squadName(g.fb.birthYear))} · ${E(pos(p)?.name || '')}</small></span><span class="fb-home-tags"><em class="warn">تقييم</em></span></button>`).join('') || '<p class="fb-empty">كل التقييمات في ميعادها.</p>'}</div></div>`);
    }
    const title = { match: 'ماتش رسمي لأي فريق؟', load: 'مجهود حصة أي فريق؟', injury: 'إصابة في أي فريق؟', tests: 'قياسات أي فريق؟' }[kind], fn = { match: 'matchForm', load: 'loadForm', injury: 'injuryForm', tests: 'testForm' }[kind];
    V.open(`<div class="ma-form fb-form"><h3>${title}</h3><div class="fb-home-list">${list.map(g => `<button type="button" class="fb-home-row" onclick="FootballUI.${fn}('${g.id}')"><span class="fb-home-dot" style="background:${FC.phaseOf(FC.uOf(g.fb.birthYear)).color}"></span><span class="fb-home-main"><b>${E(FC.squadName(g.fb.birthYear))}</b><small>${E(g.coach || '')} · ${E(g.branch)} · ${FC.playersOf(db.state, g.id).length} لاعب</small></span></button>`).join('')}</div></div>`);
  };

  /* Sport settings → tools: what a football academy actually runs, by track. */
  if (window.SportBuilder) SportBuilder.toolsFor = d => {
    if (d.id !== 'football') return '';
    const PATH = [['users', 'فرق المراحل السنية', 'فريق لكل سنة ميلاد زي قيد الاتحاد، والمرحلة بتتحدد من السن', "go('pathway')"], ['target', 'تقييم الأركان الأربعة وخطة التطوير', 'تقييم كل 8 أسابيع: فني، تكتيكي، بدني، نفسي، وأهداف فردية', "go('pathway')"], ['ruler', 'القياسات البدنية والنمو', 'سرعة ورشاقة ووثب وتحمل، وطفرة النمو والنضج', "go('pathway')"], ['trophy', 'الماتشات الرسمية والدقائق', 'ماتشات ضد أكاديميات تانية، والتشكيل وعدالة الدقائق', "go('pathway')"], ['activity', 'الأحمال والإصابات', 'مجهود الحصة، نسبة الحمل الأسبوعي، والتأهيل', "go('pathway')"], ['search', 'الكشافة والاختبارات', 'مرشحين، أيام اختبار، عروض انضمام، وترشيحات المدرسة', "go('scouting')"]];
    const SCHOOL = [['levels', 'layers'], ['ratings', 'plan'], ['teams', 'users'], ['parents', 'userPlus']];
    const NAMES = { levels: ['المستويات والترقية', 'براعم وأشبال وناشئين بمستويات وشروط ترقية'], ratings: ['تقييم الحصة', 'المدرب يقيّم عناصر المهارة من 1 لـ 5'], teams: ['تقسيمة التمرين', 'فرق متوازنة من الحاضرين للعب المصغر'], parents: ['حساب ولي الأمر', 'ولي الأمر يتابع ويدفع لكل أولاده من حساب واحد'] };
    const card = (i, t, sub, right) => `<div class="fb-tool"><span class="fb-j-ico">${svg(i, 20)}</span><span class="fb-tool-main"><b>${E(t)}</b><small>${E(sub)}</small></span>${right}</div>`;
    return `<section class="sb-section"><header><h2>🎯 أدوات مسار الاحتراف</h2><p>أساس نظام الأكاديمية وشغالة دايمًا لفرق المسار. كل أداة بتفتح من المراحل السنية أو الكشافة.</p></header><div class="fb-tools">${PATH.map(([i, t, sub, js]) => card(i, t, sub, `<button type="button" class="sb-btn small" onclick="SportBuilder.close?SportBuilder.close():0;${E(js)}">فتح</button>`)).join('')}</div></section>
      <section class="sb-section"><header><h2>⚽ أدوات مدرسة الكرة</h2><p>تفعّلها أو تقفلها؛ المقفولة بتختفي من تطبيق المدرب ومن متابعة ولي الأمر.</p></header><div class="fb-tools">${SCHOOL.map(([k, i]) => card(i, NAMES[k][0], NAMES[k][1], `<label class="fb-switch"><input type="checkbox" ${d.modules.includes(k) ? 'checked' : ''} onchange="SportBuilder.toggleModule('${k}')"><i></i></label>`)).join('')}</div></section>
      <p class="py-help">الدوري بين المجموعات وتسجيل ماتشات اللعب الحر مش جزء من الأكاديمية: الماتشات الرسمية بتتسجل لفرق المسار بس.</p>`;
  };

  /* =========================================================== scouting and trials */
  const STAGE_COLOR = { spotted: '#8a9a91', invited: '#2f6f8f', trial: '#b8954f', offer: '#2d604c', joined: '#1f7a4d', rejected: '#a24b3c' };
  const ACTION = { invited: 'دعوة لاختبار', trial: 'تسجيل نتيجة الاختبار', offer: 'عرض انضمام', joined: 'تسجيل في المسار', rejected: 'اعتذار' };
  const ageOf = c => FC.uOf(Number(c.dob.slice(0, 4)));
  const schoolPlayers = () => db.state.members.filter(m => { const g = group(m.group); return g?.sport === 'football' && !FC.isSquad(g); }).filter(m => !(db.state.fbScouting || []).some(c => c.memberId === m.id && !['joined', 'rejected'].includes(c.stage)));
  FU.scoutCard = c => { const sq = group(c.squadId) || FC.squadFor(db.state, c.dob.slice(0, 4), c.branch);
    return `<article class="fb-cand" style="--c:${STAGE_COLOR[c.stage]}"><button type="button" class="fb-cand-head" onclick="FootballUI.candidate('${c.id}')"><b>${E(c.name)}</b><small>تحت ${ageOf(c)} · ${E(FC.POSITIONS[c.position]?.name || '')} · ${E(c.foot)}</small></button>
      <small class="fb-cand-src">${c.memberId ? '⚽ ' : ''}${E(c.source)}${c.club ? ' · ' + E(c.club) : ''}</small>
      ${c.stage === 'invited' && c.trialAt ? `<small>📅 ${E(fmt(c.trialAt, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}${sq ? ' · مع ' + E(FC.squadName(sq.fb.birthYear)) : ''}</small>` : ''}
      ${c.trial ? `<small>نتيجة الاختبار <b>${c.trial.avg}</b>/5 · ${KEYS.map(k => `${E(FC.CORNERS[k].name)} ${c.trial.scores[k]}`).join(' · ')}</small>` : ''}
      ${c.offer ? `<small>العرض: ${E(c.offer.funding)}${c.offer.pct ? ' ' + c.offer.pct + '%' : ''}</small>` : ''}
      <footer>${FC.NEXT_OF(c.stage).map(k => `<button type="button" class="sb-btn small ${k === 'rejected' ? '' : 'primary'}" onclick="FootballUI.moveForm('${c.id}','${k}')">${ACTION[k]}</button>`).join('')}</footer></article>`; };
  FU.scoutForm = () => {
    const pos = Object.entries(FC.POSITIONS), branches = [...new Set(FC.squads(db.state).map(g => g.branch))];
    V.open(`<div class="ma-form fb-form"><h3>مرشح جديد للمسار</h3><p class="py-help">لاعب من بره الأكاديمية شافه كشاف أو اتقدم لاختبار. هيتعزم على تمرين مع فريق سنه ويتقيّم على الأركان الأربعة.</p>
      <label>اسم اللاعب<input id="sc-name" placeholder="الاسم ثنائي على الأقل"></label><label>تاريخ الميلاد<input id="sc-dob" type="date"></label>
      <label>المركز<select id="sc-pos">${pos.map(([k, p]) => `<option value="${k}">${E(p.name)}</option>`).join('')}</select></label>
      <label>القدم<select id="sc-foot">${['يمين', 'شمال', 'الاتنين'].map(f => `<option>${f}</option>`).join('')}</select></label>
      <label>المصدر<select id="sc-src">${FC.SCOUT_SOURCES.filter(x => x !== 'ترشيح من مدرسة الكرة').map(x => `<option>${x}</option>`).join('')}</select></label>
      <label>النادي أو الأكاديمية الحالية<input id="sc-club" placeholder="اختياري"></label>
      ${branches.length > 1 ? `<label>الفرع<select id="sc-branch">${branches.map(b => `<option>${E(b)}</option>`).join('')}</select></label>` : `<input type="hidden" id="sc-branch" value="${E(branches[0] || '')}">`}
      <label>ولي الأمر<input id="sc-guardian"></label><label>موبايل ولي الأمر<input id="sc-phone" inputmode="tel" placeholder="01xxxxxxxxx"></label>
      <label>ليه لفت النظر<textarea id="sc-note" rows="2" placeholder="مثلًا: سرعة كبيرة وتسديد بالقدمين"></textarea></label>
      <button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveScout()">إضافة للكشافة</button></div>`);
  };
  FU.saveScout = () => V.run(() => { const v = x => document.getElementById(x)?.value || ''; db.update(st => FC.addCandidate(st, { name: v('sc-name'), dob: v('sc-dob'), position: v('sc-pos'), foot: v('sc-foot'), source: v('sc-src'), club: v('sc-club'), branch: v('sc-branch'), guardian: v('sc-guardian'), phone: v('sc-phone'), note: v('sc-note') }, { by: 'الكشاف' })); after(); toast('اتضاف المرشح'); });
  FU.nominateForm = (mid = '') => {
    const list = schoolPlayers().filter(m => m.dob && (typeof S==='undefined'||S.app!=='coach'||AcademyApps.scope().members.some(x=>x.id===m.id))), pick = mid ? list.find(m=>m.id===mid) : null;
    V.open(`<div class="ma-form fb-form"><h3>ترشيح من مدرسة الكرة للمسار</h3><p class="py-help">لاعب موهوب في مجموعات المدرسة؟ رشّحه، وهيدخل اختبار مع فريق سنه زي أي مرشح. لو اتقبل بينتقل للفريق بملفه وتاريخه.</p>
      ${pick ? `<input type="hidden" id="nm-mid" value="${pick.id}"><p><b>${E(pick.name)}</b> · ${E(group(pick.group)?.name || '')}</p>` : `<label>اللاعب<select id="nm-mid">${list.map(m => `<option value="${m.id}">${E(m.name)} · ${E(group(m.group)?.name || '')} · مواليد ${E(m.dob.slice(0, 4))}</option>`).join('')}</select></label>`}
      <label>المركز اللي بيلعب فيه<select id="nm-pos">${Object.entries(FC.POSITIONS).map(([k, p]) => `<option value="${k}">${E(p.name)}</option>`).join('')}</select></label>
      <label>القدم<select id="nm-foot">${['يمين', 'شمال', 'الاتنين'].map(f => `<option>${f}</option>`).join('')}</select></label>
      <label>سبب الترشيح<textarea id="nm-note" rows="2" placeholder="مثلًا: أعلى مستوى في مجموعته وبيتطور بسرعة"></textarea></label>
      <button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveNominate()">ترشيح</button></div>`);
  };
  FU.saveNominate = () => V.run(() => { const v = x => document.getElementById(x)?.value || ''; if (!v('nm-mid')) throw Error('مفيش لاعبين مدرسة متاحين للترشيح'); const mid = v('nm-mid'); if(typeof S!=='undefined'&&S.app==='coach'&&!AcademyApps.scope().members.some(m=>m.id===mid))throw Error('اللاعب خارج مجموعاتك'); db.update(st => FC.nominate(st, mid, { position: v('nm-pos'), foot: v('nm-foot'), note: v('nm-note') }, { by: group(db.member(mid).group)?.coach || 'المدرب' })); after(); toast('اترشح للاختبار'); });
  FU.moveForm = (cid, stage) => {
    const c = FC.candidate(db.state, cid); if (!c) return;
    if (stage === 'joined' && !c.memberId && window.Registration?.scout) return Registration.scout(cid);
    const sq = FC.squadFor(db.state, c.dob.slice(0, 4), c.branch), when = new Date(Date.now() + 3 * 864e5); when.setHours(17, 0, 0, 0);
    const local = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const body = stage === 'invited' ? `<p class="py-help">الاختبار تمرين أو اتنين مع ${sq ? E(FC.squadName(sq.fb.birthYear)) : 'فريق سنه'}${sq?.coach ? ' (المدرب ' + E(sq.coach) + ')' : ''}.</p><label>ميعاد الاختبار<input id="mv-at" type="datetime-local" value="${local(when)}"></label>`
      : stage === 'trial' ? `<p class="py-help">من 1 لـ 5 مقارنة بلاعبين الفريق اللي اتمرن معاهم.</p>${KEYS.map(k => `<div class="fb-rate"><span style="color:${FC.CORNERS[k].color}">${E(FC.CORNERS[k].name)}</span><span class="fb-seg" role="radiogroup" aria-label="${E(FC.CORNERS[k].name)}">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="mv-${k}" value="${v}" ${v === 3 ? 'checked' : ''}><span>${v}</span></label>`).join('')}</span></div>`).join('')}<label>عدد تمارين الاختبار<input id="mv-sessions" type="number" min="1" max="6" value="2"></label>`
      : stage === 'offer' ? `<label>التمويل<select id="mv-funding" onchange="document.getElementById('mv-pct-f').hidden=this.value!=='منحة جزئية'">${FC.FUNDING.map(f => `<option>${f}</option>`).join('')}</select></label><label id="mv-pct-f" hidden>نسبة المنحة %<input id="mv-pct" type="number" min="10" max="90" step="5" value="50"></label>`
      : stage === 'joined' ? `<p class="py-help">${E(c.name)} هينتقل من مجموعته في المدرسة لـ ${sq ? E(FC.squadName(sq.fb.birthYear)) : 'فريق سنه'} بتمويل ${E(c.offer?.funding || 'اشتراك')}.</p>` : '';
    V.open(`<div class="ma-form fb-form"><h3>${ACTION[stage]} · ${E(c.name)}</h3>${body}<label>${stage === 'rejected' ? 'السبب (هيتبلغ لولي الأمر)' : 'ملاحظة'}<textarea id="mv-note" rows="2"></textarea></label>
      <button type="button" class="sb-btn primary ax-btn" onclick="FootballUI.saveMove('${cid}','${stage}')">${ACTION[stage]}</button></div>`);
  };
  FU.saveMove = (cid, stage) => V.run(() => {
    const v = x => document.getElementById(x)?.value || '', scores = Object.fromEntries(KEYS.map(k => [k, Number(document.querySelector(`[name="mv-${k}"]:checked`)?.value)]));
    db.update(st => FC.move(st, cid, stage, { at: v('mv-at'), scores, sessions: v('mv-sessions'), funding: v('mv-funding'), pct: v('mv-pct'), note: v('mv-note') }, { by: 'الإدارة الفنية' }));
    after(); toast({ invited: 'اتبعتت الدعوة', trial: 'اتسجلت النتيجة', offer: 'اتسجل العرض', joined: 'انضم للمسار', rejected: 'اتسجل القرار' }[stage]);
  });
  FU.candidate = cid => { const c = FC.candidate(db.state, cid); if (!c) return;
    V.open(`<div class="ma-form fb-form"><h3>${E(c.name)}</h3><p class="py-help">مواليد ${E(c.dob)} · تحت ${ageOf(c)} · ${E(FC.POSITIONS[c.position]?.name || '')} · ${E(c.source)}${c.guardian ? ' · ولي الأمر ' + E(c.guardian) : ''}${c.phone ? ' ' + E(c.phone) : ''}</p>
      ${c.trial ? bars(Object.fromEntries(KEYS.map(k => [k, c.trial.scores[k] * 20]))) : ''}
      <ol class="fb-log">${c.log.map(l => `<li><b>${E(FC.SCOUT_STAGES[l.stage])}</b> <small>${E(short(l.at))}${l.by ? ' · ' + E(l.by) : ''}</small>${l.note ? `<p>${E(l.note)}</p>` : ''}</li>`).join('')}</ol>
      <div class="fb-actions">${FC.NEXT_OF(c.stage).map(k => `<button type="button" class="sb-btn ${k === 'rejected' ? '' : 'primary'}" onclick="FootballUI.moveForm('${c.id}','${k}')">${ACTION[k]}</button>`).join('')}${c.memberId && c.stage === 'joined' ? `<button type="button" class="sb-btn" onclick="V.close();FootballUI.openPlayer('${c.memberId}')">ملف التطوير</button>` : ''}</div></div>`); };

  if (typeof PAGES !== 'undefined') {
    window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { scouting: 'الكشافة والاختبارات' });
    FU.scoutView = 'open';
    PAGES.scouting = () => {
      const all = FC.candidates(db.state), f = FC.funnel(db.state, new Date(FC.season().start, 7, 1)), open = ['spotted', 'invited', 'trial', 'offer'];
      const soon = all.filter(c => c.stage === 'invited' && c.trialAt && new Date(c.trialAt) > new Date(Date.now() - 864e5)).sort((a, b) => new Date(a.trialAt) - new Date(b.trialAt));
      const closed = all.filter(c => !open.includes(c.stage)), max = Math.max(1, ...f.stages.map(s => s.reached));
      return `<div class="sb-page fb-page"><header class="sb-head"><div><small>مسار الاحتراف · موسم ${E(FC.season().name)}</small><h1>الكشافة والاختبارات</h1><p>كل لاعب جديد للمسار بيعدّي بنفس الطريق: رصد ← دعوة لاختبار مع فريق سنه ← تقييم على الأركان الأربعة ← عرض انضمام بتمويله ← تسجيل. ولاعبين مدرسة الكرة الموهوبين بيترشحوا من مدربينهم ويدخلوا نفس الطريق.</p></div>
        <div class="fb-actions">${`<button type="button" class="sb-btn" onclick="FootballUI.nominateForm()">⚽ ترشيح من مدرسة الكرة</button><button type="button" class="sb-btn primary" onclick="FootballUI.scoutForm()">+ مرشح جديد</button>`}</div></header>
        <section class="fb-card"><h3>قمع الموسم</h3><div class="fb-funnel">${f.stages.filter(s => s.id !== 'rejected').map(s => `<div><span>${E(s.name)}</span><i><em style="width:${s.reached / max * 100}%;background:${STAGE_COLOR[s.id]}"></em></i><b>${s.reached}</b></div>`).join('')}</div>
          <p class="py-help">${f.total} مرشح الموسم ده · نسبة الانضمام ${f.conversion ?? '—'}% · لم يُقبل ${f.stages.find(s => s.id === 'rejected').now}. المصادر: ${f.sources.filter(s => s.n).map(s => `${E(s.source)} ${s.n}${s.joined ? ` (انضم ${s.joined})` : ''}`).join(' · ') || '—'}</p></section>
        ${soon.length ? `<section class="fb-card fb-next"><h3>اختبارات جاية</h3>${soon.map(c => `<button type="button" class="fb-next-row" onclick="FootballUI.candidate('${c.id}')"><b>${E(c.name)}</b><span>تحت ${ageOf(c)} · ${E(FC.POSITIONS[c.position]?.name || '')}</span><small>${E(fmt(c.trialAt, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}</small></button>`).join('')}</section>` : ''}
        <nav class="tp-tabs fb-tabs">${[['open', `جاري (${all.length - closed.length})`], ['closed', `منتهي (${closed.length})`]].map(([k, l]) => `<button type="button" class="${FU.scoutView === k ? 'selected' : ''}" onclick="FootballUI.scoutView='${k}';render()">${l}</button>`).join('')}</nav>
        ${FU.scoutView === 'closed' ? `<div class="fb-board fb-board-2">${['joined', 'rejected'].map(k => `<section><h4 style="color:${STAGE_COLOR[k]}">${FC.SCOUT_STAGES[k]} <small>${closed.filter(c => c.stage === k).length}</small></h4>${closed.filter(c => c.stage === k).map(FU.scoutCard).join('') || '<p class="fb-empty">—</p>'}</section>`).join('')}</div>`
          : `<div class="fb-board">${open.map(k => `<section><h4 style="color:${STAGE_COLOR[k]}">${FC.SCOUT_STAGES[k]} <small>${all.filter(c => c.stage === k).length}</small></h4>${all.filter(c => c.stage === k).map(FU.scoutCard).join('') || '<p class="fb-empty">مفيش</p>'}</section>`).join('')}</div>`}</div>`;
    };
    PAGES.scouting_after = () => {};
  }

  /* =========================================================== apps */
  if (typeof APPS === 'undefined' || !APPS.coach) return;
  const icon = (n, s = 20) => typeof ic === 'function' ? ic(n, s) : '';
  const back = to => `<button type="button" class="ax-icon-btn" aria-label="رجوع" onclick="go('${to}')">${icon('back', 20)}</button>`;

  /* Coach: development of the squads the coach runs. */
  APPS.coach.F.fbdev = () => {
    const AA = window.AcademyApps, me = AA.coachName, assigned = new Set(AA.scope().groups.map(g => g.id)), list = FC.squads(db.state).filter(g => assigned.has(g.id));
    if (!list.some(g => g.id === FU.squadId)) FU.squadId = list[0]?.id || '';
    const s = list.length ? FC.squadSummary(db.state, group(FU.squadId)) : null;
    return `<div class="ax fb-app"><header class="ax-top"><div class="ax-top-row">${back('home')}<div style="flex:1"><small>مسار الكورة</small><h2>تطوير اللاعيبة</h2></div></div>
      <div class="ax-sports fb-squad-chips">${list.map(g => `<button type="button" class="${g.id === FU.squadId ? 'on' : ''}" onclick="FootballUI.squadId='${g.id}';draw()">${E('تحت ' + FC.uOf(g.fb.birthYear))}</button>`).join('')}</div></header>
      <div class="ax-body">${s ? `<section class="ax-hero"><small>${E(s.name)} · ${E(s.phase.name)}</small><h3>${s.due ? s.due + ' لاعب محتاج تقييم' : 'كل التقييمات في ميعادها'}</h3><p>${s.players.length} لاعب · متوسط الفريق ${s.corners.overall ?? '—'} · ${s.goals} هدف جاري</p>${(() => { const ms = FC.matches(db.state, FU.squadId), open = ms.filter(x => x.status !== 'played' && new Date(x.at) <= new Date()).at(-1) || ms.filter(x => x.status === 'played').at(-1); return `<div class="ax-hero-actions"><button type="button" class="ax-btn light" onclick="FootballUI.loadForm('${FU.squadId}')">مجهود الحصة</button>${open ? `<button type="button" class="ax-btn ghost" onclick="FootballUI.resultForm('${open.id}')">ماتش ${E(open.opponent)}</button>` : ''}<button type="button" class="ax-btn ghost" onclick="FootballUI.injuryForm('${FU.squadId}')">إصابة</button></div>`; })()}</section>
        ${s.players.slice().sort((a, b) => FC.due(db.state, b.id) - FC.due(db.state, a.id)).map(p => { const now = FC.cornerScores(FC.latest(db.state, p.id)), d = FC.due(db.state, p.id);
          return `<div class="ax-card fb-app-row">${avatar(p.name, 42)}<button type="button" class="fb-app-main" onclick="FootballUI.playerSheet('${p.id}')"><b>${E(p.name)}</b><small>${E(pos(p)?.short || '')} · #${E(p.fb?.number ?? '')}</small>${bars(now)}</button><span class="fb-app-end"><strong>${now?.overall ?? '—'}</strong><button type="button" class="ax-btn small ${d ? '' : 'light'}" onclick="FootballUI.assess('${p.id}')">${d ? 'قيّم' : 'تقييم'}</button></span></div>`; }).join('')}` : '<p class="ck-hint">مفيش فرق مسار.</p>'}</div></div>`;
  };
  FU.playerSheet = id => { const p = db.member(id), h = FC.history(db.state, id), plan = FC.idp(db.state, id); V.open(`<div class="fb-sheet"><h3>${E(p.name)}</h3><small>${E(pos(p)?.name || '')} · ${E(FC.squadName(group(p.group).fb.birthYear))}</small>${FU.radar(FC.cornerScores(h.at(-1)), FC.cornerScores(h.at(-2)), 220)}<h4>الأهداف الجارية</h4>${plan.goals.filter(x => x.status === 'active').map(x => `<div class="fb-mini-goal"><b>${E(x.text)}</b><small>${E(x.measure)}</small><div class="fb-progress"><i style="width:${x.progress}%"></i></div><button type="button" class="ax-btn small light" onclick="FootballUI.goalForm('${id}','${x.id}')">تحديث</button></div>`).join('') || '<p class="ck-hint">مفيش أهداف جارية.</p>'}<button type="button" class="ax-btn" onclick="FootballUI.goalForm('${id}')">+ هدف جديد</button></div>`); };

  /* Player and parent: my development plan. */
  APPS.member.F.fbidp = () => {
    const AA = window.AcademyApps, m = AA?.viewer ? AA.viewer() : db.member('m0'), g = group(m.group);
    if (!FC.isSquad(g)) return `<div class="ax"><header class="ax-top"><div class="ax-top-row">${back('home')}<h2>خطة التطوير</h2></div></header><div class="ax-body"><p class="ck-hint">خطة التطوير للاعيبة مسار الكورة.</p></div></div>`;
    const h = FC.history(db.state, m.id), now = FC.cornerScores(h.at(-1)), prev = FC.cornerScores(h.at(-2)), plan = FC.idp(db.state, m.id), next = h.length ? new Date(new Date(h.at(-1).at).getTime() + FC.REVIEW_DAYS * FC.DAY) : null;
    return `<div class="ax fb-app"><header class="ax-top ax-top-family"><div class="ax-top-row">${back('home')}<div style="flex:1"><small>${E(FC.squadName(g.fb.birthYear))}</small><h2>خطة التطوير</h2></div></div>${AA?.switcher ? AA.switcher() : ''}</header>
      <div class="ax-body"><section class="ax-card fb-app-radar">${FU.radar(now, prev, 250)}<div><b>${now?.overall ?? '—'}</b><small>الإجمالي ${trend(now?.overall, prev?.overall)}</small><small>${E(pos(m)?.name || '')} · #${E(m.fb?.number ?? '')}</small>${next ? `<small>التقييم الجاي ${E(short(next))}</small>` : ''}</div></section>
        ${h.at(-1)?.note || h.at(-1)?.strengths ? `<div class="ax-card ax-note"><div><small>${E(h.at(-1).by)} · ${E(short(h.at(-1).at))}</small>${h.at(-1).strengths ? `<p>💪 ${E(h.at(-1).strengths)}</p>` : ''}${h.at(-1).focus ? `<p>🎯 ${E(h.at(-1).focus)}</p>` : ''}${h.at(-1).note ? `<p>${E(h.at(-1).note)}</p>` : ''}</div></div>` : ''}
        <div class="ax-section"><h3>أهدافي</h3></div>${plan.goals.filter(x => x.status === 'active').map(x => `<div class="ax-card fb-mini-goal"><span class="fb-tag" style="--c:${FC.CORNERS[x.corner].color}">${E(FC.CORNERS[x.corner].name)}</span><b>${E(x.text)}</b><small>${E(x.measure)}${x.due ? ' · قبل ' + E(short(x.due)) : ''}</small><div class="fb-progress"><i style="width:${x.progress}%"></i></div></div>`).join('') || '<p class="ck-hint">المدرب هيحدد الأهداف بعد التقييم.</p>'}
        <div class="ax-section"><h3>الماتشات</h3></div>${FU.playerMatches(m).replace('<section class="fb-card', '<section class="ax-card fb-card').replace('<h3>الماتشات والأحمال</h3>', '')}
        <div class="ax-section"><h3>البدني والنمو</h3></div>${FU.growthCard(m, FC.playersOf(db.state, m.group)).replace('<section class="fb-card', '<section class="ax-card fb-card')}
        ${plan.goals.some(x => x.status === 'achieved') ? `<div class="ax-section"><h3>اتحقق 🏅</h3></div>${plan.goals.filter(x => x.status === 'achieved').map(x => `<div class="ax-card fb-done">✓ ${E(x.text)}</div>`).join('')}` : ''}</div></div>`;
  };
  /* Coach: nominate talented football school players for a pathway trial. */
  APPS.coach.F.fbnom = () => {
    const AA = window.AcademyApps, me = AA.coachName, mine = AA.scope().groups.filter(g => g.sport === 'football' && !FC.isSquad(g)), gids = new Set(mine.map(g => g.id));
    const players = db.state.members.filter(m => gids.has(m.group)), noms = (db.state.fbScouting || []).filter(c => c.source === 'ترشيح من مدرسة الكرة' && (!me || c.by === me || gids.has(db.state.members.find(m => m.id === c.memberId)?.group)));
    const open = id => (db.state.fbScouting || []).find(c => c.memberId === id && !['joined', 'rejected'].includes(c.stage));
    return `<div class="ax fb-app"><header class="ax-top"><div class="ax-top-row">${back('home')}<div style="flex:1"><small>مدرسة الكرة ← مسار الاحتراف</small><h2>ترشيح للمسار</h2></div></div></header>
      <div class="ax-body"><p class="ck-hint">لاعب موهوب في مجموعتك؟ رشّحه، وهيتعزم على اختبار مع فريق سنه في المسار.</p>
      ${noms.length ? `<div class="ax-section"><h3>ترشيحاتي</h3></div>${noms.map(c => `<div class="ax-card fb-app-row">${avatar(c.name, 38)}<div class="fb-app-main"><b>${E(c.name)}</b><small>${E(FC.SCOUT_STAGES[c.stage])}${c.trialAt && c.stage === 'invited' ? ' · ' + E(short(c.trialAt)) : ''}</small></div></div>`).join('')}` : ''}
      <div class="ax-section"><h3>لاعيبة مجموعاتي</h3></div>${players.map(m => { const c = open(m.id); return `<div class="ax-card fb-app-row">${avatar(m.name, 38)}<div class="fb-app-main"><b>${E(m.name)}</b><small>${E(group(m.group)?.name || '')}${m.dob ? ' · مواليد ' + E(m.dob.slice(0, 4)) : ''}</small></div>${c ? `<span class="sa-chip">${E(FC.SCOUT_STAGES[c.stage])}</span>` : m.dob ? `<button type="button" class="sb-btn small" onclick="FootballUI.nominateForm('${m.id}')">رشّح</button>` : ''}</div>`; }).join('') || '<p class="ck-hint">مفيش لاعيبة مدرسة في مجموعاتك.</p>'}</div></div>`;
  };
  APPS.member.sub.fbidp = 'home'; APPS.coach.sub.fbdev = 'home'; APPS.coach.sub.fbnom = 'home';
  const baseProgress = APPS.member.F.progress;
  APPS.member.F.progress = () => { const AA = window.AcademyApps, m = AA?.viewer ? AA.viewer() : db.member('m0'); return FC.isPathway(db.state, m) ? APPS.member.F.fbidp() : baseProgress(); };
})();

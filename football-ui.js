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
  /* Football here is an academy, not casual team games: no league or matches between
     training groups and no player-of-the-match votes; the team split stays as a training tool. */
  if (window.SportEngine) {
    const SE = window.SportEngine, tools = SE.tools, admin = SE.adminTools;
    const clean = (id, list) => SE.get(id)?.id === 'football' || id === 'football' ? list.filter(t => !['matches', 'league'].includes(t.key)).map(t => t.key === 'teams' ? { ...t, title: 'تقسيمة التمرين' } : t) : list;
    SE.tools = id => clean(id, tools(id));
    if (admin) SE.adminTools = id => clean(id, admin(id));
  }
  window.SportDescriptions = Object.assign(window.SportDescriptions || {}, { football: 'مدرسة الكرة بالاشتراك ومسار الاحتراف: فرق بسنة الميلاد، تقييم كل 8 أسابيع على 4 محاور، وخطة تطوير لكل لاعب.' });
  window.SportExtraTools = Object.assign(window.SportExtraTools || {}, { football: [['المراحل السنية', 'فرق المسار والتقييمات المستحقة وخطط التطوير', "go('pathway')", true]] });

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

  /* =========================================================== apps */
  if (typeof APPS === 'undefined' || !APPS.coach) return;
  const icon = (n, s = 20) => typeof ic === 'function' ? ic(n, s) : '';
  const back = to => `<button type="button" class="ax-icon-btn" aria-label="رجوع" onclick="go('${to}')">${icon('back', 20)}</button>`;

  /* Coach: development of the squads the coach runs. */
  APPS.coach.F.fbdev = () => {
    const AA = window.AcademyApps, me = AA.scope().groups[0]?.coach, mine = FC.squads(db.state).filter(g => !me || g.coach === me), list = mine.length ? mine : FC.squads(db.state);
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
  APPS.member.sub.fbidp = 'home'; APPS.coach.sub.fbdev = 'home';
  const baseProgress = APPS.member.F.progress;
  APPS.member.F.progress = () => { const AA = window.AcademyApps, m = AA?.viewer ? AA.viewer() : db.member('m0'); return FC.isPathway(db.state, m) ? APPS.member.F.fbidp() : baseProgress(); };
})();

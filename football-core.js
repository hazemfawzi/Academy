/* Football development pathway: age-group squads by birth year, development phases,
   positions, and each player's development record — four-corner assessments (technical,
   tactical, physical, psychological and social) and an individual development plan.
   Squads are ordinary groups carrying `fb` details, so sessions, attendance, payments and
   messages work for them unchanged; recreational football groups are the football school. */
(function (root) {
  'use strict';
  const DAY = 86400000, REVIEW_DAYS = 56;

  const PHASES = [
    { id: 'foundation', name: 'التأسيس', ages: 'تحت 7 – تحت 12', maxU: 12, focus: 'حب اللعبة، التوافق، والمهارات الأساسية بالكورة', format: '5 ضد 5 · 7 ضد 7', color: '#b8954f' },
    { id: 'development', name: 'التطوير', ages: 'تحت 13 – تحت 17', maxU: 17, focus: 'مهام المراكز، قراءة اللعب، واللياقة المناسبة للنمو', format: '9 ضد 9 · 11 ضد 11', color: '#2f6f8f' },
    { id: 'professional', name: 'الإعداد الاحترافي', ages: 'تحت 18 – تحت 21', maxU: 21, focus: 'الأداء التنافسي والاستعداد لعقود الأندية', format: '11 ضد 11', color: '#2d604c' }
  ];
  const POSITIONS = {
    GK: { name: 'حارس مرمى', short: 'حارس', line: 'gk' }, CB: { name: 'قلب دفاع', short: 'قلب دفاع', line: 'def' }, FB: { name: 'ظهير', short: 'ظهير', line: 'def' },
    DM: { name: 'وسط مدافع', short: 'ارتكاز', line: 'mid' }, CM: { name: 'وسط', short: 'وسط', line: 'mid' }, AM: { name: 'صانع ألعاب', short: 'صانع ألعاب', line: 'mid' },
    W: { name: 'جناح', short: 'جناح', line: 'att' }, ST: { name: 'مهاجم', short: 'مهاجم', line: 'att' }
  };
  const LINES = { gk: 'حراسة', def: 'دفاع', mid: 'وسط', att: 'هجوم' };
  const CORNERS = {
    technical: { name: 'فني', color: '#2d604c', items: ['الاستلام والتحكم', 'التمرير', 'المراوغة 1 ضد 1', 'التسديد والإنهاء', 'القدم الضعيفة'], gk: ['التمركز في المرمى', 'الإمساك والتصدي', 'اللعب بالقدم', 'الكرات العرضية', 'التوزيع'] },
    tactical: { name: 'تكتيكي', color: '#2f6f8f', items: ['التمركز', 'قراءة اللعب والقرار', 'الضغط والتحول', 'التحرك بدون كورة'] },
    physical: { name: 'بدني', color: '#b8954f', items: ['السرعة', 'الرشاقة والتوازن', 'القوة', 'التحمل'] },
    psychosocial: { name: 'نفسي واجتماعي', color: '#8a5a9e', items: ['التركيز', 'الثقة', 'الانضباط والالتزام', 'روح الفريق والتواصل'] }
  };
  const TRACKS = { pathway: 'مسار الاحتراف', school: 'مدرسة الكرة' };
  const FUNDING = ['منحة كاملة', 'منحة جزئية', 'اشتراك'];
  const GOAL_STATUS = { active: 'جاري', achieved: 'اتحقق', dropped: 'اتلغى' };

  /* Seasons run August to July; the age group is the season's end year minus birth year,
     the way federations register youth teams by birth year. */
  const season = (now = new Date()) => { const d = new Date(now), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return { start: y, end: y + 1, name: `${y}/${String(y + 1).slice(2)}` }; };
  const uOf = (birthYear, now) => season(now).end - birthYear;
  const phaseOf = u => PHASES.find(p => u <= p.maxU) || PHASES[PHASES.length - 1];
  const squadName = (birthYear, now) => `تحت ${uOf(birthYear, now)} · مواليد ${birthYear}`;
  const quarter = dob => dob ? Math.floor(Number(String(dob).slice(5, 7)) / 3.01) + 1 : null;

  const isSquad = g => !!g?.fb?.birthYear && g.fb.tier === 'pathway';
  const squads = state => state.groups.filter(isSquad).sort((a, b) => b.fb.birthYear - a.fb.birthYear);
  const playersOf = (state, gid) => state.members.filter(m => m.group === gid);
  const isPathway = (state, m) => isSquad(state.groups.find(g => g.id === m.group));
  const itemsOf = (corner, position) => position === 'GK' && CORNERS[corner].gk ? CORNERS[corner].gk : CORNERS[corner].items;

  /* Scores are 1–5 per item; a corner shows as 0–100. */
  function cornerScores(a) {
    if (!a) return null;
    const out = {};
    Object.keys(CORNERS).forEach(k => { const xs = (a.scores[k] || []).filter(v => v >= 1); out[k] = xs.length ? Math.round(xs.reduce((n, v) => n + v, 0) / xs.length / 5 * 100) : null; });
    const vals = Object.values(out).filter(v => v != null);
    out.overall = vals.length ? Math.round(vals.reduce((n, v) => n + v, 0) / vals.length) : null;
    return out;
  }
  const history = (state, mid) => (state.fbAssessments || []).filter(a => a.memberId === mid).sort((a, b) => new Date(a.at) - new Date(b.at));
  const latest = (state, mid) => history(state, mid).slice(-1)[0] || null;
  function due(state, mid, now = new Date()) { const l = latest(state, mid); return !l || (now - new Date(l.at)) / DAY >= REVIEW_DAYS; }
  const idp = (state, mid) => state.fbIdp?.[mid] || { goals: [] };

  function validateAssessment(a, position) {
    const scores = {};
    for (const k of Object.keys(CORNERS)) {
      const items = itemsOf(k, position), xs = (a.scores?.[k] || []).map(Number);
      if (xs.length !== items.length || xs.some(v => !Number.isInteger(v) || v < 1 || v > 5)) throw Error(`كمّل تقييم المحور ${CORNERS[k].name}: كل بند من 1 لـ 5`);
      scores[k] = xs;
    }
    return { scores, note: String(a.note || '').trim(), strengths: String(a.strengths || '').trim(), focus: String(a.focus || '').trim() };
  }

  function addAssessment(state, mid, input, meta = {}) {
    const m = state.members.find(x => x.id === mid);
    if (!m) throw Error('اللاعب مش موجود');
    const clean = validateAssessment(input, m.fb?.position);
    state.fbAssessments = state.fbAssessments || [];
    const row = { id: meta.id || 'fba-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), memberId: mid, at: meta.at || new Date().toISOString(), by: meta.by || '', ...clean };
    state.fbAssessments.push(row);
    return row;
  }

  function saveGoal(state, mid, goal, meta = {}) {
    const text = String(goal.text || '').trim();
    if (text.length < 4) throw Error('اكتب الهدف بوضوح');
    if (!CORNERS[goal.corner]) throw Error('اختار المحور');
    state.fbIdp = state.fbIdp || {};
    const plan = state.fbIdp[mid] = state.fbIdp[mid] || { goals: [] };
    const existing = goal.id && plan.goals.find(g => g.id === goal.id);
    if (!existing && plan.goals.filter(g => g.status === 'active').length >= 4) throw Error('الخطة فيها 4 أهداف جارية؛ خلّص أو الغي هدف الأول');
    const row = { id: goal.id || 'goal-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), corner: goal.corner, text, measure: String(goal.measure || '').trim(), due: goal.due || '', status: GOAL_STATUS[goal.status] ? goal.status : 'active', progress: Math.max(0, Math.min(100, Math.round(Number(goal.progress) || 0))), createdAt: existing?.createdAt || meta.at || new Date().toISOString() };
    if (row.status === 'achieved') row.progress = 100;
    if (existing) Object.assign(existing, row); else plan.goals.push(row);
    return row;
  }

  function review(state, mid, input, meta = {}) {
    state.fbIdp = state.fbIdp || {};
    const plan = state.fbIdp[mid] = state.fbIdp[mid] || { goals: [] };
    plan.reviews = plan.reviews || [];
    plan.reviews.push({ at: meta.at || new Date().toISOString(), withParent: !!input.withParent, note: String(input.note || '').trim(), by: meta.by || '' });
    return plan;
  }

  /* Birth-quarter spread of a squad. Selection that favours players born early in the
     year (relative age effect) shows as a heavy first quarter and a thin last one. */
  function rae(players) {
    const q = [0, 0, 0, 0];
    players.forEach(p => { const k = quarter(p.dob); if (k) q[k - 1]++; });
    const total = q.reduce((a, b) => a + b, 0);
    return { q, total, skewed: total >= 8 && q[0] / total >= 0.4 && q[3] / total <= 0.15 };
  }
  function depth(players) {
    const out = { gk: 0, def: 0, mid: 0, att: 0 };
    players.forEach(p => { const l = POSITIONS[p.fb?.position]?.line; if (l) out[l]++; });
    return out;
  }

  function squadSummary(state, g, now = new Date()) {
    const players = playersOf(state, g.id), scored = players.map(p => cornerScores(latest(state, p.id))).filter(Boolean);
    const avg = k => { const xs = scored.map(s => s[k]).filter(v => v != null); return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null; };
    const u = uOf(g.fb.birthYear, now);
    return { group: g, u, phase: phaseOf(u), name: squadName(g.fb.birthYear, now), players, due: players.filter(p => due(state, p.id, now)).length, goals: players.reduce((n, p) => n + idp(state, p.id).goals.filter(x => x.status === 'active').length, 0), corners: Object.fromEntries([...Object.keys(CORNERS), 'overall'].map(k => [k, avg(k)])), rae: rae(players), depth: depth(players) };
  }

  /* ---------- physical tests and growth ---------- */
  const TESTS = {
    sprint10: { name: 'سرعة 10 متر', unit: 'ث', better: 'lower', min: 1.4, max: 3.6 },
    sprint30: { name: 'سرعة 30 متر', unit: 'ث', better: 'lower', min: 3.6, max: 7.5 },
    agility: { name: 'رشاقة 5-10-5', unit: 'ث', better: 'lower', min: 3.8, max: 8 },
    jump: { name: 'الوثب العمودي', unit: 'سم', better: 'higher', min: 8, max: 85 },
    yoyo: { name: 'تحمل Yo-Yo', unit: 'م', better: 'higher', min: 40, max: 3200 }
  };
  const BODY = { height: { name: 'الطول', unit: 'سم', min: 95, max: 215 }, weight: { name: 'الوزن', unit: 'كجم', min: 14, max: 140 }, sitting: { name: 'طول الجلوس', unit: 'سم', min: 45, max: 115 } };
  const tests = (state, mid) => (state.fbTests || []).filter(t => t.memberId === mid).sort((a, b) => new Date(a.at) - new Date(b.at));
  const lastValue = (rows, key) => { for (let i = rows.length - 1; i >= 0; i--) { const v = rows[i].values?.[key] ?? rows[i][key]; if (v != null) return { value: v, at: rows[i].at, index: i }; } return null; };
  const prevValue = (rows, key) => { const l = lastValue(rows, key); return l ? lastValue(rows.slice(0, l.index), key) : null; };
  const improved = (key, now, before) => now == null || before == null ? 0 : (TESTS[key]?.better === 'lower' ? before - now : now - before);

  /* One measuring session for a squad: each entry may carry any tests and body measures. */
  function recordTests(state, entries, meta = {}) {
    const at = meta.at || new Date().toISOString(), rows = [];
    entries.forEach(e => {
      const values = {}, body = {};
      Object.entries(TESTS).forEach(([k, t]) => { const raw = e.values?.[k]; if (raw === '' || raw == null) return; const v = Number(raw); if (!Number.isFinite(v) || v < t.min || v > t.max) throw Error(`${t.name}: قيمة غير منطقية (${raw})`); values[k] = Math.round(v * 100) / 100; });
      Object.entries(BODY).forEach(([k, t]) => { const raw = e[k]; if (raw === '' || raw == null) return; const v = Number(raw); if (!Number.isFinite(v) || v < t.min || v > t.max) throw Error(`${t.name}: قيمة غير منطقية (${raw})`); body[k] = Math.round(v * 10) / 10; });
      if (body.sitting && body.height && body.sitting >= body.height * 0.65) throw Error('طول الجلوس لازم يكون أقل بكتير من الطول');
      if (!Object.keys(values).length && !Object.keys(body).length) return;
      rows.push({ id: meta.newId ? meta.newId() : 'fbt-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), memberId: e.memberId, at, by: meta.by || '', values, ...body });
    });
    if (!rows.length) throw Error('اكتب قياس واحد على الأقل');
    state.fbTests = state.fbTests || [];
    state.fbTests.push(...rows);
    return rows;
  }

  const ageYears = (dob, at) => (new Date(at) - new Date(dob + 'T12:00:00')) / (365.25 * DAY);
  /* Growth from the measurements: growth velocity (cm a year between the last two
     heights at least two months apart), maturity offset from sitting height (Mirwald),
     the age at peak height velocity, and the expected adult height from the parents. */
  function growth(state, m, now = new Date()) {
    const rows = tests(state, m.id).filter(r => r.height), last = rows[rows.length - 1];
    if (!last) return null;
    const before = rows.slice(0, -1).reverse().find(r => new Date(last.at) - new Date(r.at) >= 60 * DAY);
    const velocity = before ? Math.round((last.height - before.height) / ((new Date(last.at) - new Date(before.at)) / (365.25 * DAY)) * 10) / 10 : null;
    const girl = m.gender === 'f', age = m.dob ? ageYears(m.dob, last.at) : null;
    let offset = null;
    if (age && last.sitting && last.weight) {
      const leg = last.height - last.sitting, s = last.sitting, w = last.weight, h = last.height;
      offset = girl ? -9.376 + 0.0001882 * leg * s + 0.0022 * age * leg + 0.005841 * age * s - 0.002658 * age * w + 0.07693 * (w / h * 100)
        : -9.236 + 0.0002708 * leg * s - 0.001663 * age * leg + 0.007216 * age * s + 0.02292 * (w / h * 100);
      offset = Math.round(offset * 10) / 10;
    }
    const phvAge = offset != null ? Math.round((age - offset) * 10) / 10 : null, mean = girl ? 11.8 : 13.8;
    const timing = phvAge == null ? null : phvAge < mean - 1 ? 'early' : phvAge > mean + 1 ? 'late' : 'ontime';
    const p = m.fb?.parents, adult = p?.father && p?.mother ? Math.round((p.father + p.mother + (girl ? -13 : 13)) / 2) : null;
    const spurt = (velocity != null && velocity >= (girl ? 6 : 7)) || (offset != null && Math.abs(offset) <= 0.5);
    return { height: last.height, weight: last.weight, sitting: last.sitting, at: last.at, velocity, offset, phvAge, timing, adult, pctAdult: adult ? Math.round(last.height / adult * 100) : null, spurt, series: rows.map(r => ({ at: r.at, height: r.height, weight: r.weight })) };
  }
  const TIMING = { early: 'نضج مبكر', ontime: 'نضج في المعدل', late: 'نضج متأخر' };

  /* Where a player's latest value sits in the squad: 1 is best. */
  function squadRank(state, players, mid, key) {
    const vals = players.map(p => ({ id: p.id, v: lastValue(tests(state, p.id), key)?.value })).filter(x => x.v != null);
    vals.sort((a, b) => TESTS[key].better === 'lower' ? a.v - b.v : b.v - a.v);
    const i = vals.findIndex(x => x.id === mid);
    return i < 0 ? null : { rank: i + 1, of: vals.length, third: i < vals.length / 3 ? 'top' : i >= vals.length * 2 / 3 ? 'low' : 'mid' };
  }

  /* ---------- official matches and minutes ---------- */
  const COMPETITIONS = ['دوري المنطقة', 'بطولة', 'ودية'];
  /* Match length and players on the pitch grow with the age group. */
  const matchFormat = u => u <= 9 ? { players: 5, minutes: 40 } : u <= 11 ? { players: 7, minutes: 50 } : u <= 13 ? { players: 9, minutes: 60 } : u <= 15 ? { players: 11, minutes: 70 } : u <= 17 ? { players: 11, minutes: 80 } : { players: 11, minutes: 90 };
  /* Younger players are owed a fair share of the minutes; the share falls with age. */
  const MINUTES_TARGET = { foundation: 50, development: 40, professional: 0 };
  const matches = (state, gid) => (state.fbMatches || []).filter(x => x.squadId === gid).sort((a, b) => new Date(a.at) - new Date(b.at));

  function addMatch(state, gid, input, meta = {}) {
    const g = state.groups.find(x => x.id === gid);
    if (!isSquad(g)) throw Error('الماتشات الرسمية لفرق المسار بس');
    const opponent = String(input.opponent || '').trim();
    if (opponent.length < 3) throw Error('اكتب اسم الفريق المنافس');
    if (!COMPETITIONS.includes(input.competition)) throw Error('اختار نوع الماتش');
    if (!input.at || isNaN(new Date(input.at))) throw Error('اختار ميعاد الماتش');
    const f = matchFormat(uOf(g.fb.birthYear, new Date(input.at)));
    state.fbMatches = state.fbMatches || [];
    const row = { id: meta.id || 'fbm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), squadId: gid, opponent, competition: input.competition, home: input.home !== false && input.home !== 'false', venue: String(input.venue || '').trim(), at: new Date(input.at).toISOString(), format: f, status: 'scheduled', score: null, lineup: [] };
    state.fbMatches.push(row);
    return row;
  }

  /* The result: score, and for each player who played — starter or not, minutes,
     position, goals, assists and the coach's rating (1–10). */
  function recordResult(state, mid, input) {
    const x = (state.fbMatches || []).find(r => r.id === mid);
    if (!x) throw Error('الماتش مش موجود');
    const us = Number(input.us), them = Number(input.them);
    if (![us, them].every(v => Number.isInteger(v) && v >= 0 && v <= 30)) throw Error('اكتب النتيجة صح');
    const squad = new Set(playersOf(state, x.squadId).map(p => p.id)), lineup = [];
    (input.lineup || []).forEach(e => {
      const minutes = Number(e.minutes);
      if (!e.played) return;
      if (!squad.has(e.memberId)) throw Error('لاعب مش في الفريق');
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > x.format.minutes) throw Error(`الدقايق من 1 لـ ${x.format.minutes}`);
      const goals = Number(e.goals) || 0, assists = Number(e.assists) || 0, rating = e.rating === '' || e.rating == null ? null : Number(e.rating);
      if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 10)) throw Error('التقييم من 1 لـ 10');
      lineup.push({ memberId: e.memberId, start: !!e.start, position: e.position || '', minutes, goals, assists, rating });
    });
    if (!lineup.length) throw Error('حدد اللي لعبوا');
    if (lineup.filter(l => l.start).length > x.format.players) throw Error(`الأساسيين ${x.format.players} بالكتير`);
    if (lineup.reduce((n, l) => n + l.goals, 0) > us) throw Error('أهداف اللاعيبة أكتر من نتيجة الفريق');
    Object.assign(x, { status: 'played', score: { us, them }, lineup, note: String(input.note || '').trim() });
    return x;
  }

  /* Minutes over the matches played since `from`: share of the minutes the player could
     have played, appearances, starts, goals, assists and average rating. */
  function minutesTable(state, gid, from = null) {
    const g = state.groups.find(x => x.id === gid), played = matches(state, gid).filter(x => x.status === 'played' && (!from || new Date(x.at) >= new Date(from)));
    const possible = played.reduce((n, x) => n + x.format.minutes, 0), target = MINUTES_TARGET[phaseOf(uOf(g.fb.birthYear)).id];
    return playersOf(state, gid).map(p => {
      const rows = played.flatMap(x => x.lineup.filter(l => l.memberId === p.id)), mins = rows.reduce((n, l) => n + l.minutes, 0), rated = rows.filter(l => l.rating != null);
      const share = possible ? Math.round(mins / possible * 100) : 0;
      return { member: p, apps: rows.length, starts: rows.filter(l => l.start).length, minutes: mins, possible, share, goals: rows.reduce((n, l) => n + l.goals, 0), assists: rows.reduce((n, l) => n + l.assists, 0), rating: rated.length ? Math.round(rated.reduce((n, l) => n + l.rating, 0) / rated.length * 10) / 10 : null, under: !!target && played.length >= 3 && share < target, target };
    });
  }

  /* ---------- training load and injuries ---------- */
  /* Session load = effort (RPE 1–10, the player's own rating) × minutes. The acute:chronic
     ratio compares the last 7 days with the weekly average of the last 28. */
  function recordLoad(state, entries, meta = {}) {
    const at = meta.at || new Date().toISOString(), rows = [];
    entries.forEach(e => {
      if (e.rpe === '' || e.rpe == null) return;
      const rpe = Number(e.rpe), minutes = Number(e.minutes);
      if (!Number.isInteger(rpe) || rpe < 1 || rpe > 10) throw Error('المجهود من 1 لـ 10');
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 180) throw Error('مدة الحصة من 5 لـ 180 دقيقة');
      rows.push({ id: 'fbl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), memberId: e.memberId, at, rpe, minutes, kind: e.kind || meta.kind || 'تمرين', load: rpe * minutes });
    });
    if (!rows.length) throw Error('اكتب مجهود لاعب واحد على الأقل');
    state.fbLoad = state.fbLoad || [];
    state.fbLoad.push(...rows);
    return rows;
  }
  function workload(state, mid, now = new Date()) {
    const rows = (state.fbLoad || []).filter(r => r.memberId === mid && new Date(r.at) <= now), t = now.getTime();
    const sum = days => rows.filter(r => t - new Date(r.at).getTime() <= days * DAY + 3600000).reduce((n, r) => n + r.load, 0);
    const acute = sum(7), chronic = Math.round(sum(28) / 4), last = rows.sort((a, b) => new Date(b.at) - new Date(a.at))[0];
    const ratio = chronic ? Math.round(acute / chronic * 100) / 100 : null;
    return { acute, chronic, ratio, zone: ratio == null ? null : ratio > 1.5 ? 'high' : ratio < 0.8 ? 'low' : 'ok', last };
  }
  const INJURY = { active: 'مصاب', rehab: 'تأهيل', cleared: 'رجع للملعب' };
  function addInjury(state, mid, input, meta = {}) {
    if (!state.members.some(m => m.id === mid)) throw Error('اللاعب مش موجود');
    const part = String(input.part || '').trim();
    if (part.length < 2) throw Error('اكتب مكان الإصابة');
    state.fbInjuries = state.fbInjuries || [];
    const row = { id: 'fbi-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), memberId: mid, at: meta.at || new Date().toISOString(), part, kind: String(input.kind || '').trim(), expected: input.expected || '', status: 'active', note: String(input.note || '').trim() };
    state.fbInjuries.push(row);
    return row;
  }
  function setInjury(state, id, status) { const r = (state.fbInjuries || []).find(x => x.id === id); if (!r) throw Error('الإصابة مش موجودة'); if (!INJURY[status]) throw Error('حالة غير صحيحة'); r.status = status; if (status === 'cleared') r.clearedAt = new Date().toISOString(); return r; }
  const injured = (state, mid) => (state.fbInjuries || []).find(r => r.memberId === mid && r.status !== 'cleared') || null;

  /* ---------- scouting, trials and nominations ---------- */
  /* A candidate moves through the funnel: spotted → invited to a trial → on trial (scored
     on the four corners, 1–5) → offered a place → joined, or not accepted at any step.
     Football school players can be nominated by their coach; they enter the same funnel. */
  const SCOUT_STAGES = { spotted: 'مرصود', invited: 'مدعو للاختبار', trial: 'في الاختبار', offer: 'عرض انضمام', joined: 'انضم للمسار', rejected: 'لم يُقبل' };
  const SCOUT_SOURCES = ['كشاف', 'يوم اختبار مفتوح', 'ترشيح من مدرسة الكرة', 'تقديم ولي أمر', 'توصية مدرب'];
  const NEXT = { spotted: ['invited', 'rejected'], invited: ['trial', 'rejected'], trial: ['offer', 'rejected'], offer: ['joined', 'rejected'], joined: [], rejected: [] };
  const NEXT_OF = stage => NEXT[stage] || [];
  const candidates = state => (state.fbScouting || []).slice().sort((a, b) => new Date(b.updated || b.created) - new Date(a.updated || a.created));
  const candidate = (state, cid) => (state.fbScouting || []).find(c => c.id === cid) || null;
  const squadFor = (state, birthYear, branch) => squads(state).filter(g => g.fb.birthYear === Number(birthYear)).sort((a, b) => (b.branch === branch) - (a.branch === branch))[0] || null;
  function addCandidate(state, input, meta = {}) {
    const name = String(input.name || '').trim(), dob = String(input.dob || '');
    if (name.split(/\s+/).length < 2) throw Error('اكتب اسم اللاعب ثنائي على الأقل');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw Error('اختار تاريخ الميلاد');
    const u = uOf(Number(dob.slice(0, 4)), meta.now);
    if (u < 7 || u > 21) throw Error('السن خارج المراحل السنية');
    if (!POSITIONS[input.position]) throw Error('اختار المركز');
    if (!SCOUT_SOURCES.includes(input.source)) throw Error('اختار مصدر الترشيح');
    if (input.memberId && (state.fbScouting || []).some(c => c.memberId === input.memberId && !['joined', 'rejected'].includes(c.stage))) throw Error('اللاعب مرشح بالفعل');
    const phone = String(input.phone || '').trim();
    if (!input.memberId && !/^01[0125]\d{8}$/.test(phone)) throw Error('اكتب موبايل ولي الأمر صحيح');
    const at = (meta.now || new Date()).toISOString();
    const row = { id: meta.id || 'fbc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, dob, position: input.position, foot: input.foot || 'يمين', source: input.source, club: String(input.club || '').trim(), guardian: String(input.guardian || '').trim(), phone, memberId: input.memberId || '', branch: input.branch || '', note: String(input.note || '').trim(), by: meta.by || '', stage: 'spotted', created: at, updated: at, log: [{ at, stage: 'spotted', note: String(input.note || '').trim() }] };
    state.fbScouting = state.fbScouting || [];
    state.fbScouting.push(row);
    return row;
  }
  /* Nominating a school player: name, birth date and branch come from the member. */
  function nominate(state, mid, input = {}, meta = {}) {
    const m = state.members.find(x => x.id === mid), g = m && state.groups.find(x => x.id === m.group);
    if (!m) throw Error('اللاعب مش موجود');
    if (!g || g.sport !== 'football' || isSquad(g)) throw Error('الترشيح للاعبين مدرسة الكرة بس');
    if (!m.dob) throw Error('سجّل تاريخ ميلاد اللاعب الأول');
    return addCandidate(state, { name: m.name, dob: m.dob, position: input.position || m.fb?.position, foot: input.foot || m.fb?.foot, source: 'ترشيح من مدرسة الكرة', memberId: m.id, branch: g.branch, guardian: m.guardian?.name || '', phone: m.guardian?.phone || m.phone || '', note: input.note }, meta);
  }
  function move(state, cid, stage, input = {}, meta = {}) {
    const c = candidate(state, cid);
    if (!c) throw Error('المرشح مش موجود');
    if (!NEXT[c.stage].includes(stage)) throw Error(`مينفعش من «${SCOUT_STAGES[c.stage]}» لـ «${SCOUT_STAGES[stage] || stage}»`);
    const note = String(input.note || '').trim();
    if (stage === 'invited') { if (!input.at || isNaN(new Date(input.at))) throw Error('اختار ميعاد الاختبار'); c.trialAt = new Date(input.at).toISOString(); c.squadId = input.squadId || squadFor(state, c.dob.slice(0, 4), c.branch)?.id || ''; }
    if (stage === 'trial') {
      const scores = {};
      Object.keys(CORNERS).forEach(k => { const v = Number(input.scores?.[k]); if (!Number.isInteger(v) || v < 1 || v > 5) throw Error(`قيّم ${CORNERS[k].name} من 1 لـ 5`); scores[k] = v; });
      c.trial = { scores, avg: Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 4 * 10) / 10, sessions: Math.max(1, Number(input.sessions) || 1), by: meta.by || '', note };
    }
    if (stage === 'offer') { if (!FUNDING.includes(input.funding)) throw Error('اختار نوع التمويل'); c.offer = { funding: input.funding, pct: input.funding === 'منحة جزئية' ? Math.min(90, Math.max(10, Number(input.pct) || 50)) : null }; }
    if (stage === 'rejected' && !note) throw Error('اكتب سبب القرار عشان يتبلغ لولي الأمر بوضوح');
    if (stage === 'joined') {
      const g = state.groups.find(x => x.id === (input.squadId || c.squadId)) || squadFor(state, c.dob.slice(0, 4), c.branch);
      if (!g) throw Error('مفيش فريق مسار لمواليد ' + c.dob.slice(0, 4));
      c.squadId = g.id;
      if (c.memberId) { const m = state.members.find(x => x.id === c.memberId); if (m) { m.group = g.id; m.branch = g.branch; m.fb = { ...(m.fb || {}), track: 'pathway', position: c.position, foot: c.foot, funding: c.offer?.funding || 'اشتراك', ...(c.offer?.pct ? { pct: c.offer.pct } : {}) }; } }
    }
    const at = (meta.now || new Date()).toISOString();
    c.stage = stage; c.updated = at; c.log.push({ at, stage, note, by: meta.by || '' });
    return c;
  }
  function funnel(state, from = null) {
    const rows = (state.fbScouting || []).filter(c => !from || new Date(c.created) >= new Date(from));
    const reached = k => rows.filter(c => c.log.some(l => l.stage === k)).length;
    return { total: rows.length, stages: Object.keys(SCOUT_STAGES).map(k => ({ id: k, name: SCOUT_STAGES[k], now: rows.filter(c => c.stage === k).length, reached: reached(k) })), sources: SCOUT_SOURCES.map(s => ({ source: s, n: rows.filter(c => c.source === s).length, joined: rows.filter(c => c.source === s && c.stage === 'joined').length })), conversion: rows.length ? Math.round(reached('joined') / rows.length * 100) : null };
  }

  const api = { DAY, REVIEW_DAYS, PHASES, POSITIONS, LINES, CORNERS, TRACKS, FUNDING, GOAL_STATUS, season, uOf, phaseOf, squadName, quarter, isSquad, squads, playersOf, isPathway, itemsOf, cornerScores, history, latest, due, idp, validateAssessment, addAssessment, saveGoal, review, rae, depth, squadSummary, TESTS, BODY, TIMING, tests, lastValue, prevValue, improved, recordTests, growth, squadRank, ageYears, COMPETITIONS, matchFormat, MINUTES_TARGET, matches, addMatch, recordResult, minutesTable, recordLoad, workload, INJURY, addInjury, setInjury, injured, SCOUT_STAGES, SCOUT_SOURCES, NEXT_OF, candidates, candidate, squadFor, addCandidate, nominate, move, funnel };
  root.FootballCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

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

  const api = { DAY, REVIEW_DAYS, PHASES, POSITIONS, LINES, CORNERS, TRACKS, FUNDING, GOAL_STATUS, season, uOf, phaseOf, squadName, quarter, isSquad, squads, playersOf, isPathway, itemsOf, cornerScores, history, latest, due, idp, validateAssessment, addAssessment, saveGoal, review, rae, depth, squadSummary };
  root.FootballCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

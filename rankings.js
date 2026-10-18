/* Player rankings, pure so the tests can run it:
   - every player gets a score out of 100: 70% performance (the average of whatever the
     coaches recorded: the four-corner assessment, the skill card, quick session ratings and
     the general skill rating) and 30% attendance;
   - players are ranked inside their group and inside their category (the age group of a
     pathway squad, or the age band of a school group), only full ties sharing a rank;
   - a player with no performance record at all is listed as not rated, without a rank. */
(function (root) {
  'use strict';
  const FC = () => root.FootballCore || (typeof require === 'function' ? require('./football-core.js') : null);
  const FL = () => root.FootballLab || (typeof require === 'function' ? require('./football-lab.js') : null);
  const avg = xs => xs.length ? xs.reduce((n, x) => n + x, 0) / xs.length : null;
  const pct = v => (v - 1) / 4 * 100;
  const WEIGHT = { perf: .7, attendance: .3 };
  const PARTS = { assessment: 'تقييم المحاور', card: 'بطاقة المهارات', ratings: 'تقييم الحصص', skill: 'تقييم المستوى' };

  /* The category a group belongs to: pathway squads by age group, other groups by the age band
     of their sport's programs, then by their age range. */
  function category(state, g, bands) {
    if (!g) return { key: 'none', name: 'بدون مجموعة' };
    const fc = FC();
    if (g.fb?.birthYear && g.fb.tier === 'pathway' && fc) { const u = fc.uOf(g.fb.birthYear); return { key: `${g.sport}:u${u}`, name: `تحت ${u}`, track: 'pathway', order: u }; }
    const band = (bands?.[g.sport] || []).find(b => g.ageMin != null && g.ageMin >= b.ageMin && g.ageMin <= b.ageMax), track = g.sport === 'football' ? 'school' : '';
    if (band) return { key: `${g.sport}:${band.name}`, name: band.name, track, order: 100 + band.ageMin };
    if (g.ageMin != null) return { key: `${g.sport}:${g.ageMin}-${g.ageMax}`, name: `سن ${g.ageMin}–${g.ageMax}`, track, order: 100 + g.ageMin };
    return { key: `${g.sport}:${g.level || 'all'}`, name: g.level || 'كل الأعمار', track, order: 999 };
  }

  /* One player's score and what it was built from. */
  function score(state, m) {
    const fc = FC(), fl = FL(), parts = {};
    const a = fc && fc.latest(state, m.id); const corners = a && fc.cornerScores(a);
    if (corners?.overall != null) parts.assessment = corners.overall;
    if (fl && state.fbSkillRatings?.[m.id]?.length) { const c = fl.card(state, m.id); if (c.count) parts.card = c.overall; }
    const quick = (state.cardRatings?.[m.id] || []).slice(-3).flatMap(r => Object.values(r.values || {}).filter(v => v >= 1));
    if (quick.length) parts.ratings = pct(avg(quick));
    const skill = (m.skill || []).filter(v => v >= 1);
    if (skill.length) parts.skill = pct(avg(skill));
    const perf = avg(Object.values(parts));
    const attendance = typeof m.attendance === 'number' ? Math.max(0, Math.min(100, m.attendance)) : null;
    const total = perf == null ? null : Math.round(WEIGHT.perf * perf + WEIGHT.attendance * (attendance ?? perf));
    return { score: total, perf: perf == null ? null : Math.round(perf), attendance, parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v)])) };
  }

  /* Sort by score, then performance, then attendance; only a full tie shares a rank (1, 2, 2, 4). */
  function rank(rows) {
    const rated = rows.filter(r => r.score != null).sort((a, b) => b.score - a.score || (b.perf ?? 0) - (a.perf ?? 0) || (b.attendance ?? 0) - (a.attendance ?? 0) || String(a.name).localeCompare(String(b.name), 'ar'));
    const same = (a, b) => a.score === b.score && a.perf === b.perf && a.attendance === b.attendance;
    rated.forEach((r, i) => { r.rank = i && same(rated[i - 1], r) ? rated[i - 1].rank : i + 1; });
    return rated.concat(rows.filter(r => r.score == null).map(r => ({ ...r, rank: null })));
  }

  /* Everyone in a group, ranked in their group and their category. */
  function all(state, opts = {}) {
    const bands = {};
    (opts.sports || []).forEach(d => { bands[d.id] = (d.programs || []).filter(p => p.ageMin != null); });
    const groups = new Map(state.groups.map(g => [g.id, g]));
    const rows = state.members.filter(m => m.group && groups.has(m.group) && !m.left).map(m => {
      const g = groups.get(m.group), s = score(state, m);
      return { id: m.id, name: m.name, group: g.id, groupName: g.name, sport: g.sport, branch: g.branch || '', cat: category(state, g, bands), ...s };
    });
    const by = (key, field, sizeField) => {
      const sets = {};
      rows.forEach(r => { (sets[key(r)] = sets[key(r)] || []).push(r); });
      Object.values(sets).forEach(list => { const ranked = rank(list.map(r => ({ ...r }))), size = ranked.filter(r => r.rank != null).length; ranked.forEach(x => { const r = rows.find(y => y.id === x.id); r[field] = x.rank; r[sizeField] = size; }); });
    };
    by(r => r.group, 'groupRank', 'groupSize');
    by(r => r.cat.key, 'catRank', 'catSize');
    return rows;
  }

  /* The categories with their best players, youngest first. */
  function leaders(rows, n = 3) {
    const cats = new Map();
    rows.forEach(r => { if (!cats.has(r.cat.key)) cats.set(r.cat.key, { ...r.cat, players: [], groups: new Set() }); const c = cats.get(r.cat.key); c.players.push(r); c.groups.add(r.group); });
    return [...cats.values()].map(c => ({ ...c, groups: c.groups.size, size: c.players.filter(r => r.catRank != null).length, top: c.players.filter(r => r.catRank != null).sort((a, b) => a.catRank - b.catRank).slice(0, n) }))
      .filter(c => c.top.length).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name, 'ar'));
  }

  /* The rank filters every players list offers. */
  const FILTERS = [
    ['all', 'كل اللاعبين'], ['sorted', 'مرتبين بالترتيب'],
    ['cat3', 'أفضل 3 في كل فئة'], ['cat10', 'أفضل 10 في كل فئة'],
    ['group3', 'أفضل 3 في كل مجموعة'], ['group5', 'أفضل 5 في كل مجموعة'], ['unrated', 'غير مقيّمين']
  ];
  function keep(r, filter) {
    if (!r) return filter === 'all' || filter === 'sorted';
    const m = /^(cat|group)(\d+)$/.exec(filter);
    if (m) { const v = r[m[1] + 'Rank']; return v != null && v <= Number(m[2]); }
    if (filter === 'unrated') return r.score == null;
    return true;
  }
  /* Order for a filtered list: by category rank for category filters, by group rank otherwise. */
  const sortKey = (r, filter) => r?.score == null ? 1e6 : (filter.startsWith('cat') ? r.catRank : r.groupRank) * 1000 - r.score;

  const api = { WEIGHT, PARTS, FILTERS, category, score, rank, all, leaders, keep, sortKey };
  root.Rankings = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

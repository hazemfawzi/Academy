/* The coach's lab for football, pure so the tests can run it:
   - a library of football skills grouped like a coaching syllabus;
   - skill categories the academy can rename, colour, add or remove, each holding skills;
   - skill ratings (1–5) per player and the performance card computed from them;
   - ready session templates, and a session plan built from any one skill;
   - the tactical board: formations and the saved board model. */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const id = (p, meta) => meta?.id || p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const at = meta => (meta?.now || new Date()).toISOString();

  /* ---------- skills library ---------- */
  const LIBRARY = [
    ['فنية', 'technical', ['التمرير القصير', 'التمرير الطويل', 'استلام الكرة والتحكم', 'المراوغة والتحكم بالكرة', 'الضربات الرأسية']],
    ['هجومية', 'technical', ['التسديد على المرمى', 'العرضيات (Crosses)', 'المواجهات الفردية هجومياً', 'التحرك بدون كرة']],
    ['دفاعية', 'tactical', ['المواجهات الفردية دفاعياً', 'الاعتراض والالتحام (Tackling)', 'التغطية والتمركز الدفاعي', 'الضغط على حامل الكرة']],
    ['حراسة المرمى', 'technical', ['التمركز في المرمى', 'الإمساك والتصدي', 'اللعب بالقدم للحارس', 'الخروج للكرات العرضية']],
    ['بدنية', 'physical', ['السرعة', 'الرشاقة', 'التحمل', 'القوة والتوازن']],
    ['تكتيكية', 'tactical', ['البناء من الخلف', 'التحولات', 'الضغط العالي', 'الكرات الثابتة']],
    ['ذهنية', 'mental', ['التركيز', 'الثقة بالنفس', 'التعامل مع الضغط']],
    ['جماعية', 'team', ['التواصل في الملعب', 'الالتزام بالدور', 'روح الفريق']]
  ];
  const DEFAULT_CATEGORIES = [['physical', 'اللياقة البدنية', '#22c55e'], ['technical', 'المهارات الفنية', '#3b82f6'], ['tactical', 'التكتيك', '#a855f7'], ['mental', 'الجانب الذهني', '#f59e0b'], ['team', 'العمل الجماعي', '#ec4899'], ['general', 'عام', '#64748b']];
  const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#64748b', '#ef4444', '#14b8a6'];
  const library = () => LIBRARY.map(([group, cat, skills]) => ({ group, cat, skills }));

  /* The academy's own categories and skills; the first use seeds them from the library. */
  function setup(state) {
    if (!state.fbSkills) {
      const categories = DEFAULT_CATEGORIES.map(([k, name, color]) => ({ id: 'cat-' + k, name, color }));
      const skills = [];
      LIBRARY.forEach(([, cat, list]) => list.forEach((name, i) => { if (i < 3) skills.push({ id: 'sk-' + skills.length, cat: 'cat-' + cat, name }); }));
      state.fbSkills = { categories, skills };
    }
    return state.fbSkills;
  }
  function saveCategory(state, input) {
    const S = setup(state), name = String(input.name || '').trim();
    if (name.length < 2) throw Error('اكتب اسم التصنيف');
    if (S.categories.some(c => c.name === name && c.id !== input.id)) throw Error('التصنيف موجود بالفعل');
    const color = /^#[0-9a-f]{6}$/i.test(input.color || '') ? input.color : COLORS[S.categories.length % COLORS.length];
    if (input.id) { const c = S.categories.find(x => x.id === input.id); if (!c) throw Error('التصنيف مش موجود'); Object.assign(c, { name, color }); return c; }
    const c = { id: id('cat'), name, color }; S.categories.push(c); return c;
  }
  /* Removing a category keeps its skills: they move to «عام». */
  function removeCategory(state, cid) {
    const S = setup(state);
    if (S.categories.length <= 1) throw Error('لازم يفضل تصنيف واحد على الأقل');
    const c = S.categories.find(x => x.id === cid); if (!c) throw Error('التصنيف مش موجود');
    let general = S.categories.find(x => x.id !== cid && x.name === 'عام') || S.categories.find(x => x.id !== cid);
    S.skills.filter(s => s.cat === cid).forEach(s => { s.cat = general.id; });
    S.categories = S.categories.filter(x => x.id !== cid);
    return general;
  }
  function addSkill(state, cat, name) {
    const S = setup(state), n = String(name || '').trim();
    if (!S.categories.some(c => c.id === cat)) throw Error('اختار التصنيف');
    if (n.length < 2) throw Error('اكتب اسم المهارة');
    if (S.skills.some(s => s.name === n && s.cat === cat)) throw Error('المهارة موجودة في التصنيف ده');
    const s = { id: id('sk'), cat, name: n }; S.skills.push(s); return s;
  }
  function removeSkill(state, sid) { const S = setup(state); S.skills = S.skills.filter(s => s.id !== sid); }

  /* ---------- ratings and the performance card ---------- */
  function rate(state, mid, values, meta = {}) {
    const S = setup(state), clean = {};
    Object.entries(values || {}).forEach(([k, v]) => { if (v === '' || v == null) return; const n = Number(v); if (!S.skills.some(s => s.id === k)) return; if (!Number.isInteger(n) || n < 1 || n > 5) throw Error('التقييم من 1 لـ 5'); clean[k] = n; });
    if (!Object.keys(clean).length) throw Error('قيّم مهارة واحدة على الأقل');
    state.fbSkillRatings = state.fbSkillRatings || {};
    const list = state.fbSkillRatings[mid] = state.fbSkillRatings[mid] || [];
    const row = { at: at(meta), by: meta.by || '', values: clean }; list.push(row);
    return row;
  }
  const pct = v => Math.round((v - 1) / 4 * 100);
  /* The latest value of every skill, the category averages (in %), the overall and the change
     against the ratings before the last one. The radar needs three rated categories. */
  function card(state, mid) {
    const S = setup(state), rows = (state.fbSkillRatings || {})[mid] || [];
    const latest = {}, before = {};
    rows.forEach((r, i) => Object.entries(r.values).forEach(([k, v]) => { if (i < rows.length - 1) before[k] = v; latest[k] = v; }));
    const skills = S.skills.filter(s => latest[s.id] != null).map(s => ({ ...s, value: latest[s.id], pct: pct(latest[s.id]), prev: before[s.id] != null ? pct(before[s.id]) : null }));
    const cats = S.categories.map(c => { const xs = skills.filter(s => s.cat === c.id); return { ...c, count: xs.length, pct: xs.length ? Math.round(xs.reduce((n, s) => n + s.pct, 0) / xs.length) : null }; });
    const rated = cats.filter(c => c.pct != null), avg = xs => xs.length ? Math.round(xs.reduce((n, x) => n + x, 0) / xs.length) : null;
    const overall = avg(rated.map(c => c.pct)), prevOverall = avg(skills.filter(s => s.prev != null).map(s => s.prev));
    return { skills, cats, overall: overall ?? 0, trend: prevOverall == null || overall == null ? null : overall - prevOverall, radar: rated.length >= 3, at: rows.at(-1)?.at || null, count: skills.length };
  }

  /* ---------- session templates ---------- */
  const TEMPLATES = [
    { id: 'tp-pass', name: 'تدريب فني — تمرير واستلام', day: 0, from: '17:00', to: '18:30', tag: 'المهارات الأساسية', skills: ['التمرير القصير', 'استلام الكرة والتحكم'] },
    { id: 'tp-phys', name: 'تحضير بدني وسرعة', day: 1, from: '17:30', to: '19:00', tag: 'اللياقة البدنية', skills: ['السرعة', 'الرشاقة'] },
    { id: 'tp-press', name: 'تكتيك دفاعي — الضغط والتغطية', day: 3, from: '17:00', to: '18:30', tag: 'تكتيك', skills: ['الضغط على حامل الكرة', 'التغطية والتمركز الدفاعي'] },
    { id: 'tp-set', name: 'الكرات الثابتة والركلات الحرة', day: 2, from: '17:00', to: '18:30', tag: 'كرات ثابتة', skills: ['الكرات الثابتة', 'الضربات الرأسية'] },
    { id: 'tp-game', name: 'مباراة تطبيقية داخلية', day: 4, from: '18:00', to: '19:30', tag: 'تطبيق جماعي', skills: ['التحولات', 'التواصل في الملعب'] },
    { id: 'tp-gk', name: 'تدريب حراس المرمى', day: 5, from: '16:30', to: '18:00', tag: 'حراسة المرمى', skills: ['التمركز في المرمى', 'الإمساك والتصدي'] }
  ];
  const minutes = (a, b) => { const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number); return (h2 * 60 + m2) - (h1 * 60 + m1); };
  /* The plan inside a template: warm-up, two drills on the skills, a game, cool-down. */
  function blocks(t) {
    const total = minutes(t.from, t.to), main = Math.max(20, total - 15 - 10 - 20);
    const [a, b] = [t.skills[0], t.skills[1] || t.skills[0]];
    return [
      { name: 'إحماء', min: 15, text: 'جري خفيف وحركات مرونة، ثم روندو 4 ضد 1' },
      { name: a, min: Math.round(main / 2), text: `تمرين مركّز على ${a}: تكرار في مجموعات صغيرة مع تصحيح المدرب` },
      { name: b, min: main - Math.round(main / 2), text: `تمرين على ${b} تحت ضغط منافس` },
      { name: 'لعب مصغر', min: 20, text: `لعب مصغر بشرط يخدم ${a}` },
      { name: 'تهدئة', min: 10, text: 'إطالة ثابتة وملخص الحصة' }
    ];
  }
  function fromSkill(name) {
    const lib = LIBRARY.find(([, , list]) => list.includes(name));
    if (!lib) throw Error('المهارة مش في المكتبة');
    const mate = lib[2].find(x => x !== name) || name;
    return { id: 'tp-skill-' + LIBRARY.flatMap(x => x[2]).indexOf(name), name: `تدريب ${lib[0]} — ${name}`, day: 0, from: '17:00', to: '18:30', tag: lib[0], skills: [name, mate] };
  }
  /* The next date (from tomorrow) on the template's weekday, at its time. */
  function nextDate(t, now = new Date()) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    while (d.getDay() !== t.day) d.setDate(d.getDate() + 1);
    const [h, m] = t.from.split(':').map(Number); d.setHours(h, m, 0, 0);
    return d;
  }
  function toSession(state, t, gid, meta = {}) {
    const g = state.groups.find(x => x.id === gid);
    if (!g) throw Error('اختار الفريق أو المجموعة');
    if (!g.coach) throw Error('المجموعة من غير مدرب');
    const start = meta.start ? new Date(meta.start) : nextDate(t, meta.now);
    const s = { id: id('session', meta), group: gid, start: start.toISOString(), duration: minutes(t.from, t.to), coach: g.coach, resource: g.resource || '', status: 'scheduled', rsvp: {}, arrived: {}, present: {}, teams: null, record: null, history: [], template: { id: t.id, name: t.name, tag: t.tag, blocks: blocks(t) } };
    state.sessions.push(s);
    return s;
  }

  /* ---------- tactical board ---------- */
  /* Positions are fractions of the pitch: x along its length (own goal at 0), y across it. */
  const FORMATIONS = {
    '4-3-3': [[.05, .5], [.22, .15], [.2, .38], [.2, .62], [.22, .85], [.42, .3], [.38, .5], [.42, .7], [.62, .18], [.66, .5], [.62, .82]],
    '4-4-2': [[.05, .5], [.22, .15], [.2, .38], [.2, .62], [.22, .85], [.42, .15], [.4, .38], [.4, .62], [.42, .85], [.64, .38], [.64, .62]],
    '3-5-2': [[.05, .5], [.2, .28], [.19, .5], [.2, .72], [.4, .1], [.38, .32], [.36, .5], [.38, .68], [.4, .9], [.64, .38], [.64, .62]],
    '4-2-3-1': [[.05, .5], [.22, .15], [.2, .38], [.2, .62], [.22, .85], [.34, .38], [.34, .62], [.5, .2], [.5, .5], [.5, .8], [.67, .5]],
    '5-3-2': [[.05, .5], [.24, .08], [.2, .3], [.19, .5], [.2, .7], [.24, .92], [.42, .3], [.4, .5], [.42, .7], [.64, .38], [.64, .62]],
    '3-4-3': [[.05, .5], [.2, .28], [.19, .5], [.2, .72], [.4, .12], [.38, .38], [.38, .62], [.4, .88], [.62, .2], [.66, .5], [.62, .8]],
    '4-2-3-1 ': null
  };
  delete FORMATIONS['4-2-3-1 '];
  /* Team A attacks to the right; team B is the mirror image. */
  const formation = (name, team = 'a') => { const f = FORMATIONS[name]; if (!f) throw Error('تشكيلة غير معروفة'); return f.map(([x, y], i) => ({ t: 'player', team, n: i + 1, x: team === 'a' ? x : 1 - x, y: team === 'a' ? y : 1 - y })); };
  const FIELDS = { full: 'ملعب كامل', half: 'نص ملعب', small: 'ملعب خماسي' };
  function saveBoard(state, input, meta = {}) {
    const title = String(input.title || '').trim();
    if (title.length < 3) throw Error('اكتب اسم اللوحة');
    if (!FIELDS[input.field]) throw Error('اختار نوع الملعب');
    const items = (input.items || []).filter(x => x && x.t && [x.x, x.y].every(v => v == null || (v >= -0.05 && v <= 1.05)));
    state.fbBoards = state.fbBoards || [];
    const row = { id: input.id || id('board', meta), title, field: input.field, squad: input.squad || '', category: String(input.category || '').trim(), tags: String(input.tags || '').split(/[,،]/).map(s => s.trim()).filter(Boolean), session: input.session || '', notes: String(input.notes || '').trim(), items, frames: (input.frames || []).slice(0, 60), updated: at(meta), by: meta.by || '' };
    const i = state.fbBoards.findIndex(b => b.id === row.id);
    if (i >= 0) state.fbBoards[i] = { ...state.fbBoards[i], ...row }; else state.fbBoards.push({ ...row, created: row.updated });
    return row;
  }

  const api = { DAY, LIBRARY, library, DEFAULT_CATEGORIES, COLORS, setup, saveCategory, removeCategory, addSkill, removeSkill, rate, card, TEMPLATES, blocks, fromSkill, nextDate, toSession, minutes, FORMATIONS, formation, FIELDS, saveBoard };
  root.FootballLab = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Progress engine: one record of a player's sporting development, shared by every sport.
   Levels and their skills come from the sport definition (SportEngine). Assessments are
   dated attempts tied to a sport metric; skills are marked per player; promotions are
   written to the level history with a reason. Eligibility for the next level is derived
   from the sport's promotion rules, never typed by hand. */
(function (root) {
  'use strict';

  const DAY = 86400000;
  const fail = message => { throw Error(message); };

  function levelIndex(def, member) {
    const i = def.levels.findIndex(l => l.id === member.sportLevel);
    return i >= 0 ? i : -1;
  }

  function currentLevel(def, member) {
    const i = levelIndex(def, member);
    return i >= 0 ? def.levels[i] : null;
  }

  function nextLevel(def, member) {
    const i = levelIndex(def, member);
    return def.levels.slice(i + 1).find(l => l.active) || null;
  }

  function lastPromotion(state, member, sport) {
    return (state.levelHistory || []).filter(h => h.memberId === member.id && h.sport === sport).sort((a, b) => new Date(b.at) - new Date(a.at))[0] || null;
  }

  /* Ended sessions of the player's group since a date, and how many the player attended. */
  function attendance(state, member, since) {
    const from = since ? new Date(since).getTime() : 0;
    const sessions = (state.sessions || []).filter(s => s.group === member.group && s.status === 'ended' && new Date(s.start).getTime() >= from);
    const attended = sessions.filter(s => s.present && s.present[member.id]).length;
    return { held: sessions.length, attended, rate: sessions.length ? Math.round(attended / sessions.length * 100) : (member.attendance ?? 0) };
  }

  function skillMarks(state, memberId) {
    return (state.skillMarks && state.skillMarks[memberId]) || {};
  }

  function levelSkills(state, def, member, level) {
    const marks = skillMarks(state, member.id);
    const skills = (level || currentLevel(def, member) || def.levels[0]).skills || [];
    return { total: skills.length, done: skills.filter(s => marks[s.id]).length, skills: skills.map(s => ({ ...s, done: !!marks[s.id], at: marks[s.id]?.at || null })) };
  }

  function attempts(state, memberId, metricId) {
    return (state.sportProgress || []).filter(r => r.memberId === memberId && r.metricId === metricId).sort((a, b) => new Date(a.at) - new Date(b.at));
  }

  function best(state, memberId, metric) {
    const rows = attempts(state, memberId, metric.id);
    if (!rows.length) return null;
    return rows.reduce((b, r) => (metric.better === 'lower' ? r.value < b.value : r.value > b.value) ? r : b);
  }

  /* The checks a player must pass before moving to the next level. */
  function eligibility(state, def, member, now = new Date()) {
    const next = nextLevel(def, member);
    const rules = def.promotion || {};
    const promoted = lastPromotion(state, member, def.id);
    const since = promoted ? promoted.at : member.created;
    const att = attendance(state, member, since);
    const checks = [];
    const level = currentLevel(def, member);
    if (!level) return { next: def.levels.find(l => l.active) || null, level: null, checks: [{ label: 'تحديد المستوى الحالي', ok: false, detail: 'قيّم اللاعب وحدد مستواه أولًا' }], eligible: false, needsExam: false, unassigned: true };
    if (rules.skills && level.skills?.length) {
      const sk = levelSkills(state, def, member, level);
      checks.push({ label: 'مهارات المستوى', ok: sk.done === sk.total, detail: `${sk.done} من ${sk.total} مهارة` });
    }
    if (rules.minSessions) checks.push({ label: 'حصص منذ آخر ترقية', ok: att.attended >= rules.minSessions, detail: `${att.attended} من ${rules.minSessions} حصة` });
    if (rules.minAttendance) checks.push({ label: 'نسبة الحضور', ok: att.rate >= rules.minAttendance, detail: `${att.rate}% والمطلوب ${rules.minAttendance}%` });
    const needsExam = !!rules.exam;
    const passedExam = needsExam && (state.exams || []).some(e => e.sport === def.id && e.status === 'done' && e.candidates.some(c => c.memberId === member.id && c.result === 'pass' && c.levelId === next?.id));
    return { next, level, checks, needsExam, passedExam, eligible: !!next && checks.every(c => c.ok), unassigned: false, attendance: att };
  }

  function validateValue(metric, value) {
    const v = Number(value);
    if (!Number.isFinite(v)) fail('اكتب قيمة رقمية لـ ' + metric.name);
    if (metric.kind === 'rating' && (v < 1 || v > 5)) fail('التقييم من 1 إلى 5');
    if (metric.kind === 'score' && (v < 0 || v > 100)) fail('الدرجة من 0 إلى 100');
    if (metric.kind === 'time' && v <= 0) fail('الزمن لازم يكون أكبر من صفر');
    if (metric.kind === 'number' && v < 0) fail('القيمة لا تقل عن صفر');
    if (metric.kind === 'check' && v !== 0 && v !== 1) fail('اختر تم أو لم يتم');
    return v;
  }

  /* Parse "1:05.3" or "65.3" into seconds. */
  function parseTime(text) {
    const raw = String(text || '').trim().replace(',', '.');
    if (!raw) return NaN;
    if (raw.includes(':')) { const [m, s] = raw.split(':'); return Number(m) * 60 + Number(s); }
    return Number(raw);
  }

  function formatValue(metric, value) {
    if (metric.kind === 'time') {
      const m = Math.floor(value / 60), s = value - m * 60;
      return m ? `${m}:${s.toFixed(1).padStart(4, '0')} د` : `${s.toFixed(1)} ث`;
    }
    if (metric.kind === 'check') return value ? 'تم' : 'لم يتم';
    return `${value} ${metric.unit}`.trim();
  }

  /* Record one metric for several players at once (a whole lane or group). */
  function recordBatch(state, def, { metricId, sessionId = '', entries, at, newId }) {
    const metric = def.metrics.find(m => m.id === metricId) || fail('اختر عنصر التقييم');
    const rows = entries.filter(e => String(e.value ?? '').trim() !== '');
    if (!rows.length) fail('اكتب قيمة لاعب واحد على الأقل');
    const clean = rows.map(e => {
      const member = state.members.find(m => m.id === e.memberId) || fail('اللاعب غير موجود');
      const value = validateValue(metric, metric.kind === 'time' ? parseTime(e.value) : e.value);
      return { id: newId('progress'), memberId: member.id, sport: def.id, metricId: metric.id, kind: metric.kind, label: metric.name, value, unit: metric.unit, note: String(e.note || '').trim(), sessionId, at };
    });
    state.sportProgress = state.sportProgress || [];
    state.sportProgress.push(...clean);
    return clean;
  }

  function markSkill(state, memberId, skillId, done, meta) {
    state.skillMarks = state.skillMarks || {};
    const marks = state.skillMarks[memberId] = state.skillMarks[memberId] || {};
    if (done) marks[skillId] = { at: meta.at, by: meta.by || '', sessionId: meta.sessionId || '' };
    else delete marks[skillId];
  }

  function promote(state, def, member, levelId, reason, meta) {
    const level = def.levels.find(l => l.id === levelId && l.active) || fail('اختر مستوى متاحًا');
    if (!String(reason || '').trim()) fail('اكتب سبب التقييم أو الترقية');
    member.sportLevel = level.id;
    state.levelHistory = state.levelHistory || [];
    const row = { id: meta.newId('level'), memberId: member.id, sport: def.id, levelId: level.id, levelName: level.name, reason: String(reason).trim(), at: meta.at, by: meta.by || '' };
    state.levelHistory.push(row);
    return row;
  }

  /* Lane / court split: sort by level then best time (or rating), and deal into groups. */
  function split(state, def, members, size) {
    const metric = def.metrics.find(m => m.kind === 'time') || def.metrics[0];
    const score = m => {
      const lvl = levelIndex(def, m);
      const b = metric ? best(state, m.id, metric) : null;
      const perf = b ? (metric.better === 'lower' ? -b.value : b.value) : -Infinity;
      return [lvl, perf];
    };
    const sorted = members.slice().sort((a, b) => { const [la, pa] = score(a), [lb, pb] = score(b); return lb - la || pb - pa; });
    const out = [];
    for (let i = 0; i < sorted.length; i += size) out.push(sorted.slice(i, i + size));
    return out;
  }

  const api = { DAY, currentLevel, nextLevel, levelIndex, attendance, levelSkills, attempts, best, eligibility, recordBatch, markSkill, promote, split, parseTime, formatValue, validateValue };
  root.ProgressCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  /* Browser binding. */
  if (typeof window === 'undefined' || !window.V || !window.SportEngine) return;
  const db = V.db, SE = window.SportEngine;
  const sportOf = member => db.state.groups.find(g => g.id === member.group)?.sport;
  const defOf = member => SE.get(sportOf(member));
  const meta = (extra = {}) => ({ at: new Date().toISOString(), newId: db.id, ...extra });

  window.Progress = {
    ...api,
    def: defOf,
    level: m => { const d = defOf(m); return d ? currentLevel(d, m) : null; },
    eligibility: m => { const d = defOf(m); return d ? eligibility(db.state, d, m) : null; },
    skills: m => { const d = defOf(m); return d ? levelSkills(db.state, d, m) : { total: 0, done: 0, skills: [] }; },
    best: (m, metric) => best(db.state, m.id, metric),
    attempts: (m, metricId) => attempts(db.state, m.id, metricId),
    record(sport, payload) {
      const d = SE.get(sport);
      let rows = [];
      db.update(st => { rows = recordBatch(st, d, { ...payload, at: new Date().toISOString(), newId: db.id }); });
      return rows;
    },
    mark(memberId, skillId, done, by = '') { db.update(st => markSkill(st, memberId, skillId, done, meta({ by }))); },
    promote(memberId, levelId, reason, by = '') {
      const m = db.member(memberId), d = defOf(m);
      let row;
      db.update(st => { row = promote(st, d, st.members.find(x => x.id === memberId), levelId, reason, meta({ by })); });
      return row;
    },
    history: memberId => (db.state.levelHistory || []).filter(h => h.memberId === memberId).sort((a, b) => new Date(b.at) - new Date(a.at)),
    exams: sport => (db.state.exams || []).filter(e => e.sport === sport).sort((a, b) => a.date.localeCompare(b.date)),
    scheduleExam(sport, data) {
      const d = SE.get(sport);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || '') || data.date < db.day(new Date())) throw Error('اختر تاريخ اختبار من النهارده أو بعده');
      if (!String(data.examiner || '').trim()) throw Error('اكتب اسم المختبِر');
      let exam;
      db.update(st => {
        st.exams = st.exams || [];
        exam = { id: db.id('exam'), sport, date: data.date, time: data.time || '', place: String(data.place || '').trim(), examiner: String(data.examiner).trim(), status: 'scheduled', candidates: [] };
        st.exams.push(exam);
      });
      return exam;
    },
    addCandidate(examId, memberId) {
      db.update(st => {
        const e = st.exams.find(x => x.id === examId);
        if (!e || e.status !== 'scheduled') throw Error('الاختبار غير متاح');
        if (e.candidates.some(c => c.memberId === memberId)) throw Error('اللاعب مسجل في الاختبار بالفعل');
        const m = st.members.find(x => x.id === memberId), d = SE.get(e.sport), next = nextLevel(d, m);
        if (!next) throw Error('اللاعب في آخر مستوى');
        e.candidates.push({ memberId, levelId: next.id, result: null, score: null });
      });
    },
    examResult(examId, memberId, result, score) {
      if (!['pass', 'fail'].includes(result)) throw Error('اختر ناجح أو يعيد');
      const value = score === '' || score == null ? null : Number(score);
      if (value != null && (!Number.isFinite(value) || value < 0 || value > 100)) throw Error('الدرجة من 0 إلى 100');
      db.update(st => {
        const e = st.exams.find(x => x.id === examId), c = e?.candidates.find(x => x.memberId === memberId);
        if (!c) throw Error('المتقدم غير موجود');
        if (c.result) throw Error('النتيجة مسجلة بالفعل');
        c.result = result; c.score = value; c.at = new Date().toISOString();
        if (result === 'pass') promote(st, SE.get(e.sport), st.members.find(x => x.id === memberId), c.levelId, 'اجتاز اختبار الترقية' + (value != null ? ' بدرجة ' + value : ''), meta({ by: e.examiner }));
        if (e.candidates.every(x => x.result)) e.status = 'done';
      });
    },
    split: (sport, members, size) => split(db.state, SE.get(sport), members, size)
  };
})(typeof window !== 'undefined' ? window : globalThis);

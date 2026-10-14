/* Weekly schedules: a group meets on fixed weekdays at a fixed time with a coach and a
   training place. Sessions for the coming weeks are generated from that schedule, skip
   academy holidays, and never double-book the group, the coach or the place. */
(function (root) {
  'use strict';
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const ORDER = [6, 0, 1, 2, 3, 4, 5];
  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function timeLabel(hhmm) {
    if (!/^\d{2}:\d{2}$/.test(hhmm || '')) return '';
    let [h, m] = hhmm.split(':').map(Number);
    const suffix = h < 12 ? 'ص' : 'م';
    h = h % 12 || 12;
    return `${h}:${pad(m)} ${suffix}`;
  }

  function describe(group) {
    if (!group?.days?.length || !group.time) return 'بدون موعد ثابت';
    const names = ORDER.filter(d => group.days.includes(d)).map(d => DAYS[d]);
    const joined = names.length > 1 ? names.slice(0, -1).join('، ') + ' و' + names[names.length - 1] : names[0];
    return `${joined} · ${timeLabel(group.time)}`;
  }

  function validateSchedule(data) {
    const days = (data.days || []).map(Number).filter(d => d >= 0 && d <= 6);
    if (!days.length) throw Error('اختر يوم تدريب واحد على الأقل');
    if (!/^\d{2}:\d{2}$/.test(data.time || '')) throw Error('اختر ميعاد الحصة');
    if (!String(data.coach || '').trim()) throw Error('اختر المدرب المسؤول');
    if (!String(data.resource || '').trim()) throw Error('اختر مكان التدريب');
    const ageMin = Number(data.ageMin), ageMax = Number(data.ageMax);
    if (!Number.isInteger(ageMin) || !Number.isInteger(ageMax) || ageMin < 2 || ageMax > 90 || ageMin > ageMax) throw Error('راجع الفئة العمرية للجروب');
    return { days: [...new Set(days)], time: data.time, coach: String(data.coach).trim(), resource: String(data.resource).trim(), ageMin, ageMax };
  }

  function overlaps(a, b) {
    const as = new Date(a.start).getTime(), bs = new Date(b.start).getTime();
    return as < bs + b.duration * 60000 && bs < as + a.duration * 60000;
  }

  /* Missing sessions for one group between today and `days` ahead. */
  function plan(state, group, { from = new Date(), days = 14, duration = 60 } = {}) {
    if (!group.days?.length || !group.time) return { add: [], conflicts: [] };
    const holidays = new Set((state.holidays || []).map(h => h.date));
    const [h, m] = group.time.split(':').map(Number);
    const add = [], conflicts = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(from); d.setDate(d.getDate() + i); d.setHours(h, m, 0, 0);
      if (!group.days.includes(d.getDay()) || d < from || holidays.has(dayKey(d))) continue;
      const id = `auto-${group.id}-${dayKey(d)}`;
      const candidate = { id, group: group.id, start: d.toISOString(), duration, status: 'scheduled', rsvp: {}, arrived: {}, present: {}, teams: null, record: null, history: [], coach: group.coach || '', resource: group.resource || '', auto: true };
      if (state.sessions.some(s => s.id === id || (s.group === group.id && s.status !== 'cancelled' && overlaps(s, candidate)))) continue;
      const clash = [...state.sessions, ...add].find(s => s.status !== 'cancelled' && overlaps(s, candidate) && ((candidate.coach && s.coach === candidate.coach) || (candidate.resource && s.resource === candidate.resource && state.groups.find(g => g.id === s.group)?.branch === group.branch)));
      if (clash) { conflicts.push({ group: group.id, start: candidate.start, with: clash.id }); continue; }
      add.push(candidate);
    }
    return { add, conflicts };
  }

  const api = { DAYS, ORDER, describe, timeLabel, validateSchedule, plan, dayKey };
  root.ScheduleCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof window === 'undefined' || !window.V) return;
  const db = V.db;
  const durationOf = g => window.SportEngine?.get(g.sport)?.duration || 60;
  window.Schedule = {
    ...api,
    /* Keep two weeks of sessions ready for every scheduled group. */
    topUp(days = 14) {
      const plans = db.state.groups.map(g => ({ g, p: plan(db.state, g, { days, duration: durationOf(g) }) }));
      const total = plans.reduce((n, x) => n + x.p.add.length, 0);
      if (total) V.run(() => db.update(st => { plans.forEach(({ p }) => st.sessions.push(...p.add)); st.scheduleConflicts = plans.flatMap(x => x.p.conflicts); }));
      return total;
    },
    holidays: () => db.state.holidays || []
  };
  window.Schedule.topUp();
})(typeof window !== 'undefined' ? window : globalThis);

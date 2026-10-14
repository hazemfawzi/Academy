const test = require('node:test');
const assert = require('node:assert/strict');
const FC = require('./family-engine.js');
const SC = require('./schedule-engine.js');
const Core = require('./core.js');

const meta = () => { let n = 0; return { at: '2026-10-01T10:00:00Z', newId: p => p + '-' + (++n) }; };
const active = { remaining: 5, end: '2099-01-01T00:00:00Z' };

test('guardians become one family; the sibling discount starts with the second active player', () => {
  const st = { members: [{ id: 'a', guardian: { name: 'أحمد', phone: '01011112233' }, ...active }, { id: 'b', guardian: { name: 'أحمد', phone: '01011112233' }, remaining: 0, end: '2000-01-01' }, { id: 'c', phone: '01099998888', name: 'بالغ', ...active }], invoices: [{ memberId: 'b', total: 900, paid: 300 }], settings: {} };
  FC.migrate(st, meta());
  assert.equal(st.families.length, 2);
  assert.equal(st.members[0].familyId, st.members[1].familyId);
  assert.equal(FC.balance(st, st.members[0].familyId), 600);
  assert.equal(FC.discountFor(st, st.members[0].familyId, new Date('2026-10-01')), 10);
  st.members[0].remaining = 0;
  assert.equal(FC.discountFor(st, st.members[0].familyId, new Date('2026-10-01')), 0);
  assert.throws(() => FC.ensure(st, { name: 'x', phone: '123' }, meta()), /موبايل/);
  assert.equal(FC.age('2018-10-02', new Date('2026-10-01')), 7);
  assert.equal(FC.age('2018-10-01', new Date('2026-10-01')), 8);
});

test('weekly schedule generates sessions, skips holidays and does not double-book the coach', () => {
  const from = new Date('2026-10-04T08:00:00'); // Sunday
  const g = { id: 'g1', branch: 'زايد', days: [0, 2], time: '17:00', coach: 'كابتن', resource: 'حارة 1' };
  const other = { id: 'g2', branch: 'زايد', days: [2], time: '17:00', coach: 'كابتن', resource: 'حارة 2' };
  const st = { groups: [g, other], sessions: [], holidays: [{ date: '2026-10-11', name: 'إجازة' }] };
  const p = SC.plan(st, g, { from, days: 9, duration: 60 });
  assert.deepEqual(p.add.map(s => SC.dayKey(new Date(s.start))), ['2026-10-04', '2026-10-06', '2026-10-13']);
  st.sessions.push(...p.add);
  assert.equal(SC.plan(st, g, { from, days: 9 }).add.length, 0, 'running twice adds nothing');
  const q = SC.plan(st, other, { from, days: 9 });
  assert.equal(q.add.length, 0);
  assert.equal(q.conflicts.length, 2, 'same coach at the same time is reported, not booked');
  assert.equal(SC.describe(g), 'الأحد والثلاثاء · 5:00 م');
  assert.throws(() => SC.validateSchedule({ days: [], time: '17:00', coach: 'x', resource: 'y', ageMin: 5, ageMax: 9 }), /يوم/);
  assert.throws(() => SC.validateSchedule({ days: [1], time: '17:00', coach: 'x', resource: 'y', ageMin: 9, ageMax: 5 }), /العمرية/);
});

test('children register without their own phone, program prices activate their own sessions, statuses mark attendance', () => {
  let raw = null; const storage = { getItem: () => raw, setItem: (k, v) => { raw = v; } };
  let now = new Date('2026-10-02T10:00:00+03:00');
  const db = Core.create(storage, () => now);
  assert.throws(() => db.addMember({ name: 'طفل', phone: '', group: 'A' }), /موبايل/);
  const kid = db.addMember({ name: 'طفل', phone: '', group: 'A', guardian: { name: 'ولي', phone: '01011112233' }, dob: '2018-01-01' });
  assert.equal(kid.guardian.phone, '01011112233');
  const kid2 = db.addMember({ name: 'طفل 2', phone: '', group: 'A', guardian: { name: 'ولي', phone: '01011112233' } });
  assert.ok(kid2.id, 'two children may share a guardian phone');
  db.pay(kid.id, 'monthly', 'كاش', '', 10, null, { label: 'سباحة · أطفال', price: 1100, sessions: 8, days: 30, programId: 'p1' });
  const inv = db.state.invoices[0];
  assert.equal(inv.total, 990);
  assert.equal(db.member(kid.id).remaining, 8);
  assert.equal(db.member(kid.id).programId, 'p1');
  const r = db.request(kid.id, 'payment', { plan: 'monthly', method: 'إنستاباي', reference: 'REF-123', charge: { label: 'سباحة', price: 1100, sessions: 8, days: 30 } });
  db.decide(r.id, true);
  assert.equal(db.member(kid.id).remaining, 16);
  db.saveLead({ name: 'ولي', phone: '01011112233', owner: 'س', due: '2026-10-03' });
  db.moveLead(db.state.leads[0].id, 'won', '');
  assert.equal(db.state.leads[0].stage, 'won', 'a lead converts when a child registered with the guardian phone paid');
  db.update(s => { s.demoClock = true; });
  const sid = db.state.sessions[0].id;
  db.attend(sid, kid.id, false, 'late');
  assert.equal(db.session(sid).present[kid.id], true);
  db.attend(sid, kid2.id, true, 'excused');
  assert.equal(db.session(sid).present[kid2.id], false);
  assert.equal(db.session(sid).marks[kid2.id], 'excused');
  db.attend(sid, kid2.id, true);
  assert.equal(db.session(sid).marks[kid2.id], undefined);
});

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

test('automated messages pick the right people once, and the assistant answers from the records', () => {
  const MC = require('./messages-engine.js');
  const now = new Date('2026-10-14T12:00:00');
  const at = (d, h = 17) => { const x = new Date(now); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x.toISOString(); };
  const st = {
    settings: {}, families: [{ id: 'f1', name: 'منى علي', phone: '01011112233', relation: 'أم' }],
    groups: [{ id: 'g', name: 'سباحة 1', branch: 'فرع زايد', coach: 'كابتن سلمى', resource: 'الحمام الكبير' }],
    members: [
      { id: 'a', name: 'ليلى سامي', group: 'g', familyId: 'f1', end: at(3), remaining: 5, guardian: { name: 'منى علي', phone: '01011112233' } },
      { id: 'b', name: 'عمر سامي', group: 'g', familyId: 'f1', end: at(30), remaining: 8, guardian: { name: 'منى علي', phone: '01011112233' } },
      { id: 'c', name: 'كريم', group: 'g', end: at(-3), remaining: 0, phone: '01299998888' },
      { id: 'd', name: 'بدون رقم', group: 'g', end: at(2), remaining: 3 }
    ],
    sessions: [
      { id: 's1', group: 'g', status: 'ended', start: at(-1), present: { a: true }, marks: {}, rsvp: {} },
      { id: 's2', group: 'g', status: 'scheduled', start: at(1), rsvp: {} }
    ],
    holidays: [{ date: '2026-10-18', name: 'إجازة منتصف الترم' }],
    invoices: [{ memberId: 'b', total: 900, paid: 400 }], levelHistory: [], outbox: []
  };
  const due = MC.due(st, now);
  const kinds = id => due.filter(x => x.memberId === id).map(x => x.kind).sort();
  assert.deepEqual(kinds('a'), ['holiday', 'renewal']);
  assert.ok(kinds('b').includes('absence'));
  assert.deepEqual(kinds('c'), ['absence', 'expired', 'holiday']);
  assert.equal(kinds('d').length, 0, 'no phone, no message');
  assert.equal(due.filter(x => x.kind === 'holiday').length, 2, 'one holiday notice per phone, not per child');
  assert.ok(due.find(x => x.kind === 'renewal').text.includes('ليلى'));
  st.outbox.push({ id: due.find(x => x.kind === 'renewal').id });
  assert.ok(!MC.due(st, now).some(x => x.kind === 'renewal'), 'sent messages are not suggested again');
  st.settings.automation = { absence: false };
  assert.ok(!MC.due(st, now).some(x => x.kind === 'absence'));
  assert.equal(MC.waLink('01011112233', 'أهلًا'), 'https://wa.me/201011112233?text=%D8%A3%D9%87%D9%84%D9%8B%D8%A7');

  const a = st.members[0];
  assert.equal(MC.intentOf('امتى الحصة الجاية؟'), 'next');
  assert.equal(MC.intentOf('التمرين فين'), 'place');
  assert.equal(MC.intentOf('ليلى تعبانة ومش هتقدر تيجي'), 'excuse');
  assert.match(MC.answer(st, a, 'الحصة امتى', now).text, /الحمام الكبير/);
  assert.match(MC.answer(st, a, 'فيه اجازة؟', now).text, /منتصف الترم/);
  assert.match(MC.answer(st, a, 'الرصيد', now).text, /500/);
  assert.equal(MC.answer(st, a, 'اعتذار', now).confirm.sessionId, 's2');
  assert.equal(MC.answer(st, a, 'فيه باص؟', now).unknown, true);
});

test('player QR and six-digit codes identify the player and open the right session only', () => {
  const CK = require('./checkin.js');
  const members = [{ id: 'a', group: 'g' }, { id: 'b', group: 'h' }];
  assert.equal(CK.parse(CK.payload('a'), members).member.id, 'a');
  assert.equal(CK.parse(CK.shortCode('b'), members).member.id, 'b');
  assert.notEqual(CK.shortCode('a'), CK.shortCode('b'));
  assert.match(CK.parse(CK.payload('a').replace(/:[^:]+$/, ':zzz'), members).error, /متعدل/);
  assert.match(CK.parse('https://example.com', members).error, /مش كود/);
  assert.match(CK.parse('000000', members).error, /مش متسجل/);
  const now = new Date('2026-10-14T17:00:00');
  const at = min => new Date(now.getTime() + min * 60000).toISOString();
  const st = { sessions: [
    { id: 'early', group: 'g', status: 'scheduled', start: at(40), duration: 60 },
    { id: 'other', group: 'h', status: 'scheduled', start: at(10), duration: 60 },
    { id: 'gone', group: 'g', status: 'cancelled', start: at(5), duration: 60 }
  ] };
  assert.equal(CK.openSession(st, members[0], now).session, undefined, 'check-in opens 30 minutes before');
  assert.equal(CK.openSession(st, members[0], now).next.id, 'early');
  assert.equal(CK.openSession(st, members[0], new Date(now.getTime() + 15 * 60000)).session.id, 'early');
  assert.equal(CK.openSession(st, members[1], now).session.id, 'other');
});

test('a renewal can carry a receipt screenshot instead of the transfer number', () => {
  const KoraCore = require('./core.js');
  const store = new Map(), storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  const db = KoraCore.create(storage);
  const mid = db.state.members[0]?.id || db.addMember({ name: 'لاعب', phone: '01012345678', group: db.state.groups[0].id }).id;
  assert.throws(() => db.request(mid, 'payment', { plan: 'monthly', method: 'إنستاباي', reference: '' }), /صورة الإيصال/);
  const r = db.request(mid, 'payment', { plan: 'monthly', method: 'إنستاباي', reference: '', receipt: 'data:image/jpeg;base64,AAAA' });
  assert.equal(r.payload.receipt.startsWith('data:image'), true);
  db.decide(r.id, true);
  assert.equal(db.state.requests.find(x => x.id === r.id).status, 'approved');
});

test('coach pay counts ended sessions, pays substitutes, shares collected fees and keeps adjustments', () => {
  const PY = require('./payroll.js');
  const st = {
    settings: { payroll: { 'سلمى': { mode: 'session', perSession: 300 }, 'وليد': { mode: 'percent', percent: 40 }, 'دينا': { mode: 'mixed', base: 2000, perSession: 150 } } },
    groups: [{ id: 'g1', coach: 'سلمى' }, { id: 'g2', coach: 'وليد' }],
    members: [{ id: 'a', group: 'g1' }, { id: 'b', group: 'g2' }],
    sessions: [
      { id: 's1', group: 'g1', status: 'ended', start: '2026-09-03T17:00:00', duration: 60, present: { a: true } },
      { id: 's2', group: 'g1', status: 'ended', start: '2026-09-10T17:00:00', duration: 60, present: {} },
      { id: 's3', group: 'g1', status: 'cancelled', start: '2026-09-17T17:00:00', duration: 60 },
      { id: 's4', group: 'g1', status: 'ended', start: '2026-09-24T17:00:00', duration: 60, coach: 'دينا', present: { a: true } },
      { id: 's5', group: 'g1', status: 'ended', start: '2026-10-01T17:00:00', duration: 60 }
    ],
    transactions: [{ memberId: 'b', amount: 1000, kind: 'payment', at: '2026-09-05T10:00:00' }, { memberId: 'b', amount: 200, kind: 'refund', at: '2026-09-06T10:00:00' }, { memberId: 'b', amount: 900, kind: 'payment', at: '2026-10-05T10:00:00' }],
    payrollAdjust: [{ coach: 'سلمى', month: '2026-09', amount: -100, note: 'تأخير' }]
  };
  const salma = PY.statement(st, 'سلمى', '2026-09');
  assert.equal(salma.sessions.length, 2, 'cancelled and substituted sessions are not hers');
  assert.equal(salma.gross, 600);
  assert.equal(salma.total, 500);
  assert.equal(PY.statement(st, 'دينا', '2026-09').total, 2150, 'fixed plus the session she covered');
  assert.equal(PY.statement(st, 'وليد', '2026-09').total, 320, '40% of fees after refunds');
  assert.equal(PY.month(st, '2026-09').total, 500 + 2150 + 320);
  assert.equal(PY.shift('2026-01', -1), '2025-12');
  assert.throws(() => PY.validateTerms({ mode: 'session', perSession: 0 }), /أجر الحصة/);
  assert.throws(() => PY.validateTerms({ mode: 'percent', percent: 80 }), /60%/);
  assert.deepEqual(PY.validateTerms({ mode: 'fixed', base: '5000', perSession: 99 }), { mode: 'fixed', base: 5000, perSession: 0, percent: 0 });
});

test('weekly plans come from the right template, fill the session time and aim at missing skills', () => {
  const TC = require('./training.js');
  const SC = require('./sport-engine.js');
  const swim = SC.get({ members: [], groups: [], sessions: [], audit: [] }, { SPORTS: [{ id: 'swimming', name: 'سباحة', on: true }], CATALOG: [] }, 'swimming');
  const lvl = swim.levels[0];
  const st = {
    groups: [{ id: 'g', name: 'سباحة', sport: 'swimming', ageMin: 6, ageMax: 8 }],
    members: ['a', 'b', 'c'].map(id => ({ id, group: 'g', sportLevel: lvl.id })),
    skillMarks: { a: { [lvl.skills[0].id]: { at: '' } }, b: { [lvl.skills[0].id]: { at: '' } }, c: { [lvl.skills[0].id]: { at: '' } } },
    sessions: [
      { id: 's1', group: 'g', status: 'scheduled', start: '2026-10-17T17:00:00', duration: 60 },
      { id: 's2', group: 'g', status: 'scheduled', start: '2026-10-19T17:00:00', duration: 45 },
      { id: 's3', group: 'g', status: 'cancelled', start: '2026-10-21T17:00:00', duration: 60 },
      { id: 's4', group: 'g', status: 'scheduled', start: '2026-10-25T17:00:00', duration: 60 }
    ]
  };
  const w = TC.week(st, swim, st.groups[0], new Date('2026-10-18T10:00:00'));
  assert.deepEqual(w.sessions.map(x => x.session.id), ['s1', 's2'], 'Saturday-to-Friday week, cancelled sessions dropped');
  assert.equal(w.profile.band, 'kids');
  assert.equal(w.profile.stage, 'beginner');
  w.sessions.forEach(({ session, plan }) => assert.equal(plan.blocks.reduce((n, b) => n + b.min, 0), session.duration));
  assert.ok(!w.skills.some(s => s.id === lvl.skills[0].id), 'mastered skills are not the focus');
  assert.ok(w.sessions[0].plan.blocks.some(b => b.title.startsWith('مهارة المستوى')));
  st.trainingPlans = { s1: { theme: 'x', blocks: [{ part: 'main', title: 'خطة المدرب', desc: '', min: 60 }] } };
  assert.equal(TC.week(st, swim, st.groups[0], new Date('2026-10-18T10:00:00')).sessions[0].plan.blocks[0].title, 'خطة المدرب');
  assert.throws(() => TC.validatePlan([{ title: 'أ', min: 20 }], 60), /مجموع/);
  assert.equal(TC.ageBand(15), 'teens');
  assert.ok(TC.tips('timed', 'kids').length >= 5);
  for (const [type, T] of Object.entries(TC.TEMPLATES)) for (const k of ['beginner', 'intermediate', 'advanced']) assert.ok(T.main[k].length >= 2, type + ' ' + k);
});

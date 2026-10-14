const test = require('node:test');
const assert = require('node:assert/strict');
const SC = require('./sport-engine.js');
const PC = require('./progress-engine.js');

const config = () => ({
  SPORTS: [
    { id: 'swimming', name: 'سباحة', ico: '🏊', on: true, modules: ['levels', 'times'], levels: ['مستوى 1'] },
    { id: 'karate', name: 'كاراتيه', ico: '🥋', on: true, modules: ['belts'], levels: ['أبيض'] }
  ],
  CATALOG: [{ id: 'tennis', name: 'تنس', ico: '🎾', tpl: 'رياضات المضرب', modules: ['courts'] }]
});
const state = () => ({ members: [], groups: [], sessions: [], audit: [] });

test('known sports get complete definitions with levels, skills, metrics, programs and resources', () => {
  const swim = SC.get(state(), config(), 'swimming');
  assert.equal(swim.type, 'timed');
  assert.equal(swim.levels.length, 7);
  assert.ok(swim.levels[0].skills.length > 0);
  assert.ok(swim.metrics.some(m => m.kind === 'time' && m.better === 'lower'));
  assert.ok(swim.programs.every(p => p.ageMin <= p.ageMax && p.price > 0));
  assert.ok(swim.resources.length >= 1);
});

test('coach tools follow the switched-on modules only', () => {
  const swim = SC.get(state(), config(), 'swimming');
  assert.ok(SC.tools(swim).some(t => t.key === 'times'));
  swim.modules = swim.modules.filter(k => k !== 'times');
  assert.ok(!SC.tools(swim).some(t => t.key === 'times'));
  swim.modules.push('teams');
  assert.ok(!SC.tools(swim).some(t => t.key === 'teams'), 'team tools only exist for football in this preview');
  assert.equal(SC.moduleState(swim, 'teams'), 'limited');
  assert.equal(SC.moduleState(swim, 'horses'), 'planned');
});

test('validation keeps levels with players, rejects bad programs and needs a unit for numbers', () => {
  const swim = SC.get(state(), config(), 'swimming');
  const usage = { [swim.levels[0].id]: true };
  const removed = { ...swim, levels: swim.levels.slice(1) };
  assert.throws(() => SC.validate(removed, swim, [], usage), /عطّله/);
  const disabled = { ...swim, levels: swim.levels.map((l, i) => i === 0 ? { ...l, active: false } : l) };
  assert.equal(SC.validate(disabled, swim, [], usage).levels[0].active, false);
  assert.throws(() => SC.validate({ ...swim, programs: [{ name: 'أطفال', ageMin: 9, ageMax: 5, price: 100, sessions: 8 }] }, swim), /الفئة العمرية/);
  assert.throws(() => SC.validate({ ...swim, metrics: [{ name: 'وزن', kind: 'number', unit: '' }] }, swim), /وحدة/);
  assert.throws(() => SC.validate({ ...swim, name: 'كاراتيه' }, swim, [SC.get(state(), config(), 'karate')]), /بنفس الاسم/);
});

test('new sports come from the catalog or from a blank type and cannot be duplicated', () => {
  const st = state(), cfg = config();
  const tennis = SC.draft(st, cfg, { catalogId: 'tennis' });
  assert.equal(tennis.type, 'racket');
  st.sportDefs = { tennis }; st.sportOrder = ['swimming', 'karate', 'tennis'];
  assert.throws(() => SC.draft(st, cfg, { catalogId: 'tennis' }), /مضافة/);
  const custom = SC.draft(st, cfg, { name: 'تنس طاولة', type: 'racket', ico: '🏓' });
  assert.ok(custom.id.startsWith('custom-'));
  assert.equal(custom.custom, true);
  assert.throws(() => SC.draft(st, cfg, { name: 'سباحة' }), /بنفس الاسم/);
});

test('settings saved by the earlier screen are migrated, not lost', () => {
  const st = state();
  st.sportSettings = { swimming: { levels: [{ id: 'swimming-level-0', name: 'أمان', criteria: 'دخول الماء', active: true }], modules: ['levels'], duration: 45, capacity: 10, resourceLabel: 'الحمام الصغير', on: false } };
  const swim = SC.get(st, config(), 'swimming');
  assert.equal(swim.levels[0].name, 'أمان');
  assert.ok(swim.levels[0].skills.length > 0);
  assert.deepEqual(swim.modules, ['levels']);
  assert.equal(swim.duration, 45);
  assert.equal(swim.on, false);
  assert.equal(swim.resources[0].name, 'الحمام الصغير');
});

function progressSetup() {
  const def = SC.get(state(), config(), 'karate');
  const now = Date.now(), day = 86400000;
  const member = { id: 'k1', name: 'لاعب', group: 'g', created: new Date(now - 90 * day).toISOString(), sportLevel: def.levels[0].id };
  const sessions = Array.from({ length: 12 }, (_, i) => ({ id: 's' + i, group: 'g', status: 'ended', start: new Date(now - (i + 1) * 3 * day).toISOString(), present: { k1: i < 11 } }));
  const st = { members: [member], sessions, levelHistory: [], sportProgress: [], skillMarks: {}, exams: [] };
  let n = 0;
  return { def, member, st, newId: p => p + '-' + (++n) };
}

test('eligibility comes from skills, sessions and attendance; exams promote on pass', () => {
  const { def, member, st, newId } = progressSetup();
  let el = PC.eligibility(st, def, member);
  assert.equal(el.eligible, false);
  assert.equal(el.checks.find(c => c.label === 'مهارات المستوى').ok, false);
  def.levels[0].skills.forEach(s => PC.markSkill(st, member.id, s.id, true, { at: new Date().toISOString() }));
  el = PC.eligibility(st, def, member);
  assert.equal(el.eligible, true);
  assert.equal(el.needsExam, true);
  PC.promote(st, def, member, el.next.id, 'اجتاز الاختبار', { at: new Date().toISOString(), newId });
  assert.equal(member.sportLevel, def.levels[1].id);
  assert.equal(st.levelHistory.length, 1);
  assert.equal(PC.eligibility(st, def, member).checks.find(c => c.label === 'حصص منذ آخر ترقية').ok, false, 'sessions are counted again after a promotion');
});

test('group assessments validate each kind and keep every attempt; best respects lower-is-better', () => {
  const swim = SC.get(state(), config(), 'swimming');
  const metric = swim.metrics.find(m => m.kind === 'time');
  const st = { members: [{ id: 'a', group: 'g' }, { id: 'b', group: 'g' }], sportProgress: [] };
  let n = 0; const newId = p => p + (++n);
  PC.recordBatch(st, swim, { metricId: metric.id, entries: [{ memberId: 'a', value: '32.5' }, { memberId: 'b', value: '' }], at: '2026-10-01T10:00:00Z', newId });
  PC.recordBatch(st, swim, { metricId: metric.id, entries: [{ memberId: 'a', value: '0:30.1' }], at: '2026-10-08T10:00:00Z', newId });
  assert.equal(st.sportProgress.length, 2);
  assert.equal(PC.best(st, 'a', metric).value, 30.1);
  assert.throws(() => PC.recordBatch(st, swim, { metricId: metric.id, entries: [{ memberId: 'a', value: '-3' }], at: '', newId }), /أكبر من صفر/);
  assert.throws(() => PC.recordBatch(st, swim, { metricId: metric.id, entries: [{ memberId: 'b', value: '' }], at: '', newId }), /لاعب واحد/);
  const rating = { id: 'r', name: 'تقييم', kind: 'rating', unit: 'من 5', better: 'higher' };
  assert.throws(() => PC.validateValue(rating, 6), /1 إلى 5/);
  assert.equal(PC.formatValue(metric, 65.3), '1:05.3 د');
});

test('lane split groups players by level then best time', () => {
  const swim = SC.get(state(), config(), 'swimming');
  const t = swim.metrics.find(m => m.kind === 'time');
  const members = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, sportLevel: swim.levels[i < 2 ? 2 : 0].id }));
  const st = { sportProgress: [{ memberId: 'a', metricId: t.id, value: 30, at: '1' }, { memberId: 'b', metricId: t.id, value: 25, at: '1' }, { memberId: 'c', metricId: t.id, value: 40, at: '1' }] };
  const lanes = PC.split(st, swim, members, 2);
  assert.deepEqual(lanes.map(l => l.map(m => m.id)), [['b', 'a'], ['c', 'd']]);
});

test('player card scores coach ratings on a 40–99 scale with tiers and trend', () => {
  const PCC = require('./player-card.js');
  const def = SC.get(state(), config(), 'swimming');
  const names = PCC.attrsFor(def.type);
  const member = { id: 'p1' };
  const st = { cardRatings: { p1: [
    { at: '2026-09-01', values: Object.fromEntries(names.map(n => [n, 2])) },
    { at: '2026-10-01', values: Object.fromEntries(names.map(n => [n, 5])) }
  ] } };
  const c = PCC.card(st, def, member, { attendance: 95, levelIndex: 1 });
  assert.equal(PCC.toScore(1), 40);
  assert.equal(PCC.toScore(5), 99);
  assert.equal(c.attrs.length, 6);
  assert.ok(c.overall >= 80 && c.tier === 'gold');
  assert.ok(c.trend > 0, 'the newer rating raises the card');
  assert.equal(PCC.card({}, def, { id: 'x' }).empty, true);
  assert.throws(() => PCC.validateRating(def, { [names[0]]: 7 }), /1 إلى 5/);
  assert.throws(() => PCC.validateRating(def, {}), /عنصرًا/);
});

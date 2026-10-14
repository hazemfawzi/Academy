/* Families: one guardian account that holds children (and the guardian when they play
   too), pays for all of them and gets a sibling discount. Players keep their own record;
   the family links them by familyId. */
(function (root) {
  'use strict';
  const MOBILE = /^01[0125]\d{8}$/;
  const fail = m => { throw Error(m); };

  function age(dob, now = new Date()) {
    if (!dob) return null;
    const d = new Date(dob + 'T12:00:00');
    let a = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
    return a;
  }

  function list(state) { return state.families || []; }
  function byPhone(state, phone) { return list(state).find(f => f.phone === String(phone || '').trim()) || null; }
  function members(state, familyId) { return state.members.filter(m => m.familyId === familyId); }

  function active(member, now = new Date()) { return member.remaining > 0 && new Date(member.end) > now; }

  /* Discount for the next registration: the family policy applies from the second active player. */
  function discountFor(state, familyId, now = new Date()) {
    if (!familyId) return 0;
    const rate = Number(state.settings?.siblingDiscount ?? 10);
    return members(state, familyId).some(m => active(m, now)) ? rate : 0;
  }

  function balance(state, familyId) {
    const ids = new Set(members(state, familyId).map(m => m.id));
    return state.invoices.filter(i => ids.has(i.memberId)).reduce((n, i) => n + Math.max(0, i.total - i.paid), 0);
  }

  /* Find or create the family for a guardian; returns the family record. */
  function ensure(state, data, meta) {
    const phone = String(data.phone || '').trim(), name = String(data.name || '').trim();
    if (!name) fail('اكتب اسم ولي الأمر');
    if (!MOBILE.test(phone)) fail('اكتب رقم موبايل ولي الأمر صحيح');
    const found = byPhone(state, phone);
    if (found) return found;
    state.families = state.families || [];
    const fam = { id: meta.newId('family'), name, phone, relation: data.relation || 'ولي الأمر', created: meta.at };
    state.families.push(fam);
    return fam;
  }

  /* Link existing players to families from their guardian, or to themselves as adults. */
  function migrate(state, meta) {
    let changed = false;
    state.members.forEach(m => {
      if (m.familyId) return;
      const g = m.guardian;
      if (g && MOBILE.test(g.phone || '')) { m.familyId = ensure(state, g, meta).id; changed = true; }
      else if (MOBILE.test(m.phone || '')) { m.familyId = ensure(state, { name: m.name, phone: m.phone, relation: 'نفسه' }, meta).id; changed = true; }
    });
    return changed;
  }

  const api = { MOBILE, age, list, byPhone, members, active, discountFor, balance, ensure, migrate };
  root.FamilyCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof window === 'undefined' || !window.V) return;
  const db = V.db;
  const meta = () => ({ at: new Date().toISOString(), newId: db.id });
  window.Family = {
    ...api,
    all: () => list(db.state),
    get: id => list(db.state).find(f => f.id === id) || null,
    of: m => list(db.state).find(f => f.id === m.familyId) || null,
    members: id => members(db.state, id),
    balance: id => balance(db.state, id),
    discountFor: id => discountFor(db.state, id),
    byPhone: phone => byPhone(db.state, phone),
    age: dob => age(dob)
  };
  if (db.state.members.some(m => !m.familyId && ((m.guardian && MOBILE.test(m.guardian.phone || '')) || MOBILE.test(m.phone || '')))) V.run(() => db.update(st => migrate(st, meta())));
})(typeof window !== 'undefined' ? window : globalThis);

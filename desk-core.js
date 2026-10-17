/* Internal conversations and support tickets, pure so the tests can run them.
   People are named by a key: 'admin' (the academy office), 'coach:<name>' and
   'member:<id>' (the player, or the parent speaking for a child).
   - A group chat belongs to a training group or squad: the office, its coach and all
     its players are in it.
   - A direct chat joins two people.
   - A ticket is a request for help from a player, parent or coach, with a category,
     a status and the replies. */
(function (root) {
  'use strict';
  const MAX = 1000;
  const id = (p, meta) => meta?.id || p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const at = meta => (meta?.now || new Date()).toISOString();
  const groupOf = (state, gid) => state.groups.find(g => g.id === gid);
  const coachKey = name => 'coach:' + name;
  const memberKey = mid => 'member:' + mid;

  /* ---------- conversations ---------- */
  const threads = state => (state.chats = state.chats || []);
  function participants(state, t) {
    if (t.kind === 'direct') return t.members.slice();
    const g = groupOf(state, t.groupId);
    if (!g) return ['admin'];
    return ['admin', ...(g.coach ? [coachKey(g.coach)] : []), ...state.members.filter(m => m.group === g.id).map(m => memberKey(m.id))];
  }
  const canSee = (state, t, who) => who === 'admin' || participants(state, t).includes(who);
  function groupThread(state, gid, meta) {
    if (!groupOf(state, gid)) throw Error('المجموعة مش موجودة');
    let t = threads(state).find(x => x.kind === 'group' && x.groupId === gid);
    if (!t) { t = { id: 'g:' + gid, kind: 'group', groupId: gid, messages: [], reads: {}, at: at(meta) }; threads(state).push(t); }
    return t;
  }
  function directThread(state, a, b, meta) {
    if (!a || !b || a === b) throw Error('اختار الطرف التاني');
    const pair = [a, b].sort(), tid = 'd:' + pair.join('|');
    let t = threads(state).find(x => x.id === tid);
    if (!t) { t = { id: tid, kind: 'direct', members: pair, messages: [], reads: {}, at: at(meta) }; threads(state).push(t); }
    return t;
  }
  function send(state, tid, from, text, meta = {}) {
    const t = threads(state).find(x => x.id === tid);
    if (!t) throw Error('المحادثة مش موجودة');
    if (!canSee(state, t, from)) throw Error('مش من أعضاء المحادثة');
    const body = String(text || '').trim();
    if (!body) throw Error('اكتب الرسالة');
    if (body.length > MAX) throw Error(`الرسالة أطول من ${MAX} حرف`);
    const m = { id: id('msg', meta), from, text: body, at: at(meta) };
    t.messages.push(m); t.reads[from] = m.at; t.last = m.at;
    return m;
  }
  function threadsFor(state, who) {
    if (who === 'admin') {
      state.groups.forEach(g => groupThread(state, g.id, { now: new Date(0) }));
      return threads(state).filter(t => t.kind === 'group' || t.members.includes('admin'));
    }
    const mine = threads(state).filter(t => canSee(state, t, who));
    const gids = who.startsWith('coach:') ? state.groups.filter(g => coachKey(g.coach) === who).map(g => g.id) : state.members.filter(m => memberKey(m.id) === who).map(m => m.group);
    gids.forEach(gid => { if (!mine.some(t => t.groupId === gid)) mine.push(groupThread(state, gid, { now: new Date(0) })); });
    return mine;
  }
  const unread = (state, t, who) => t.messages.filter(m => m.from !== who && (!t.reads[who] || m.at > t.reads[who])).length;
  function markRead(state, tid, who, meta) { const t = threads(state).find(x => x.id === tid); if (t) t.reads[who] = at(meta); return t; }
  const sorted = list => list.slice().sort((a, b) => String(b.last || '').localeCompare(String(a.last || '')));

  /* ---------- support tickets ---------- */
  const CATEGORIES = { technical: 'مشكلة في التطبيق', billing: 'الاشتراكات والدفع', schedule: 'المواعيد والحصص', coach: 'المدرب والتدريب', other: 'استفسار تاني' };
  const STATUS = { open: 'جديدة', progress: 'جاري الحل', closed: 'اتقفلت' };
  const PRIORITY = { low: 'عادية', normal: 'متوسطة', high: 'عاجلة' };
  const tickets = state => (state.tickets = state.tickets || []);
  function openTicket(state, input, meta = {}) {
    const subject = String(input.subject || '').trim(), body = String(input.body || '').trim();
    if (!input.from) throw Error('مين صاحب الطلب؟');
    if (subject.length < 4) throw Error('اكتب عنوان واضح للمشكلة');
    if (body.length < 8) throw Error('اشرح المشكلة في سطر على الأقل');
    if (!CATEGORIES[input.category]) throw Error('اختار نوع الطلب');
    const t = { id: id('tk', meta), no: tickets(state).reduce((n, x) => Math.max(n, x.no || 0), 1000) + 1, from: input.from, subject, category: input.category, priority: PRIORITY[input.priority] ? input.priority : 'normal', status: 'open', assignee: '', at: at(meta), updated: at(meta), replies: [{ from: input.from, text: body, at: at(meta) }] };
    tickets(state).push(t);
    return t;
  }
  function replyTicket(state, tid, from, text, meta = {}) {
    const t = tickets(state).find(x => x.id === tid);
    if (!t) throw Error('الطلب مش موجود');
    if (t.status === 'closed') throw Error('الطلب مقفول، افتحه الأول');
    const body = String(text || '').trim();
    if (!body) throw Error('اكتب الرد');
    t.replies.push({ from, text: body, at: at(meta) });
    if (from === 'admin' && t.status === 'open') t.status = 'progress';
    t.updated = at(meta);
    return t;
  }
  function setTicket(state, tid, change, meta = {}) {
    const t = tickets(state).find(x => x.id === tid);
    if (!t) throw Error('الطلب مش موجود');
    if (change.status != null) { if (!STATUS[change.status]) throw Error('حالة غير صحيحة'); t.status = change.status; }
    if (change.priority != null) { if (!PRIORITY[change.priority]) throw Error('أولوية غير صحيحة'); t.priority = change.priority; }
    if (change.assignee != null) t.assignee = String(change.assignee);
    t.updated = at(meta);
    return t;
  }
  const ticketsFor = (state, who) => tickets(state).filter(t => who === 'admin' || t.from === who).sort((a, b) => (a.status === 'closed') - (b.status === 'closed') || String(b.updated).localeCompare(String(a.updated)));

  const api = { MAX, coachKey, memberKey, participants, canSee, groupThread, directThread, send, threadsFor, unread, markRead, sorted, CATEGORIES, STATUS, PRIORITY, openTicket, replyTicket, setTicket, ticketsFor };
  root.DeskCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Conversations, support tickets and the office assistant.
   Dashboard: «المحادثات» (every group chat and the office's direct chats), «تذاكر الدعم»,
   and a floating assistant that explains how the system works, answers from the records
   and opens the right screen. Apps: the coach and the player or parent get their group
   chat, direct chats and their own support requests. */
(function () {
  'use strict';
  const DC = window.DeskCore;
  if (!DC || typeof V === 'undefined') return;
  const db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  const when = v => { const d = new Date(v), now = new Date(); return d.toDateString() === now.toDateString() ? fmt(v, { hour: 'numeric', minute: '2-digit' }) : fmt(v, { day: 'numeric', month: 'short' }); };
  const group = gid => db.state.groups.find(g => g.id === gid);
  const FC = () => window.FootballCore;
  const groupName = g => g ? (FC()?.isSquad(g) ? FC().squadName(g.fb.birthYear) : g.name) : 'مجموعة';
  const DK = window.Desk = { tid: '', ticket: '', tfilter: 'open' };
  const edition = () => window.Edition?.sport || null;
  const inEdition = g => !edition() || g?.sport === edition();

  /* Who is who. */
  DK.name = who => {
    if (who === 'admin') return 'الإدارة';
    if (who.startsWith('coach:')) return who.slice(6);
    const m = db.state.members.find(x => 'member:' + x.id === who);
    return m ? m.name : 'لاعب';
  };
  DK.role = who => who === 'admin' ? 'الإدارة' : who.startsWith('coach:') ? 'مدرب' : (db.state.members.find(x => 'member:' + x.id === who)?.guardian ? 'لاعب · ولي الأمر' : 'لاعب');
  const initial = who => E(DK.name(who).replace(/^(كابتن|أ\.|د\.)\s*/, '').trim()[0] || '؟');
  const av = (who, n = 36) => `<span class="dk-av ${who === 'admin' ? 'office' : who.startsWith('coach:') ? 'coach' : ''}" style="width:${n}px;height:${n}px">${initial(who)}</span>`;
  DK.title = t => t.kind === 'group' ? groupName(group(t.groupId)) : null;
  const titleFor = (t, me) => t.kind === 'group' ? groupName(group(t.groupId)) : DK.name(t.members.find(x => x !== me) || me);
  const subFor = (t, me) => t.kind === 'group' ? `${DC.participants(db.state, t).length} عضو · ${E(group(t.groupId)?.coach || '')}` : DK.role(t.members.find(x => x !== me) || me);
  const visible = (list) => list.filter(t => t.kind !== 'group' || inEdition(group(t.groupId)));

  /* ---------- conversation pieces shared by both pages ---------- */
  const bubbles = (t, me) => {
    let last = '';
    return t.messages.map(m => { const day = fmt(m.at, { weekday: 'long', day: 'numeric', month: 'short' }), sep = day !== last ? `<div class="dk-day">${E(day)}</div>` : ''; last = day;
      return `${sep}<div class="dk-msg ${m.from === me ? 'mine' : ''}">${m.from === me ? '' : av(m.from, 30)}<div class="dk-bubble">${t.kind === 'group' && m.from !== me ? `<b>${E(DK.name(m.from))} <small>${E(DK.role(m.from))}</small></b>` : ''}<p>${E(m.text)}</p><time>${E(fmt(m.at, { hour: 'numeric', minute: '2-digit' }))}</time></div></div>`; }).join('') || '<p class="dk-empty">ابدأ المحادثة.</p>';
  };
  const composer = (tid, me) => `<form class="dk-compose" onsubmit="Desk.send(event,'${tid}','${me}')"><textarea id="dk-text" rows="1" maxlength="${DC.MAX}" placeholder="اكتب رسالة…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.form.requestSubmit()}"></textarea><button type="submit" class="dk-send" aria-label="إرسال">➤</button></form>`;
  const redraw = () => { if (typeof PAGES !== 'undefined' && typeof render === 'function' && document.getElementById('content')) render(); if (typeof APPS !== 'undefined' && typeof draw === 'function') draw(); setTimeout(() => { const box = document.querySelector('.dk-thread-body'); if (box) box.scrollTop = box.scrollHeight; document.getElementById('dk-text')?.focus(); }, 20); };
  DK.send = (e, tid, me) => { e.preventDefault(); const text = document.getElementById('dk-text')?.value || ''; V.run(() => db.update(st => { DC.send(st, tid, me, text); DC.markRead(st, tid, me); })); redraw(); };
  DK.open = (tid, me) => { DK.tid = tid; V.run(() => db.update(st => { const t = (st.chats || []).find(x => x.id === tid); if (!t && tid.startsWith('g:')) DC.groupThread(st, tid.slice(2)); DC.markRead(st, tid, me); })); };
  DK.direct = (me, other) => { let tid = ''; V.run(() => db.update(st => { tid = DC.directThread(st, me, other).id; })); DK.tid = tid; V.close && V.close(); if (typeof go === 'function') go(typeof PAGES !== 'undefined' && PAGES.chat ? 'chat' : 'chat1'); redraw(); };
  DK.unreadFor = me => visible(DC.threadsFor(db.state, me)).reduce((n, t) => n + DC.unread(db.state, t, me), 0);

  /* ---------- tickets, shared ---------- */
  const statusChip = s => `<span class="dk-st ${s}">${E(DC.STATUS[s])}</span>`;
  const prChip = p => p === 'high' ? `<span class="dk-st high">${E(DC.PRIORITY[p])}</span>` : '';
  const ticketBody = (t, me) => `<div class="dk-ticket"><div class="dk-ticket-head"><b>#${t.no} · ${E(t.subject)}</b><span>${statusChip(t.status)}${prChip(t.priority)}<span class="dk-st cat">${E(DC.CATEGORIES[t.category])}</span></span><small>${E(DK.name(t.from))} · ${E(DK.role(t.from))} · ${E(fmt(t.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}${t.assignee ? ' · مسؤول: ' + E(t.assignee) : ''}</small></div>
    <div class="dk-replies">${t.replies.map(r => `<div class="dk-msg ${r.from === me ? 'mine' : ''}">${r.from === me ? '' : av(r.from, 28)}<div class="dk-bubble"><b>${E(DK.name(r.from))}</b><p>${E(r.text)}</p><time>${E(when(r.at))}</time></div></div>`).join('')}</div></div>`;
  DK.reply = (tid, me) => { const text = document.getElementById('dk-reply')?.value || ''; V.run(() => db.update(st => DC.replyTicket(st, tid, me, text))); me === 'admin' ? DK.ticketView(tid) : redraw(); toast('اتبعت الرد'); };
  DK.setTicket = (tid, field, value) => { V.run(() => db.update(st => DC.setTicket(st, tid, { [field]: value }))); DK.ticketView(tid); toast(field === 'status' ? 'اتغيرت الحالة' : 'اتحفظ'); };
  const ticketForm = (from, fromPicker) => `<div class="ma-form fb-form"><h3>طلب دعم جديد</h3>${fromPicker || ''}
    <label>نوع الطلب<select id="dk-cat">${Object.entries(DC.CATEGORIES).map(([k, l]) => `<option value="${k}">${E(l)}</option>`).join('')}</select></label>
    <label>العنوان<input id="dk-subj" placeholder="مثلًا: الدفع مش ظاهر في التطبيق"></label>
    <label>التفاصيل<textarea id="dk-body" rows="4" placeholder="اكتب اللي حصل بالتفصيل"></textarea></label>
    <label>الأولوية<select id="dk-pr">${Object.entries(DC.PRIORITY).map(([k, l]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${E(l)}</option>`).join('')}</select></label>
    <button type="button" class="sb-btn primary ax-btn" onclick="Desk.saveTicket('${from}')">إرسال الطلب</button></div>`;
  DK.newTicket = from => V.open(ticketForm(from));
  DK.saveTicket = from => V.run(() => { const v = id => document.getElementById(id)?.value || ''; const who = v('dk-from') || from; let t; db.update(st => { t = DC.openTicket(st, { from: who, subject: v('dk-subj'), body: v('dk-body'), category: v('dk-cat'), priority: v('dk-pr') }); }); V.close(); redraw(); toast(`اتسجل الطلب رقم ${t.no}`); });

  /* =========================================================== dashboard */
  if (typeof PAGES !== 'undefined') {
    window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { chat: 'المحادثات', tickets: 'تذاكر الدعم' });
    const me = 'admin';
    PAGES.chat = () => {
      const list = DC.sorted(visible(DC.threadsFor(db.state, me)));
      if (!list.some(t => t.id === DK.tid)) DK.tid = list[0]?.id || '';
      const t = list.find(x => x.id === DK.tid);
      if (t && DC.unread(db.state, t, me)) setTimeout(() => { DK.open(t.id, me); render(); });
      const groups = list.filter(x => x.kind === 'group'), directs = list.filter(x => x.kind === 'direct');
      const row = x => { const last = x.messages.at(-1), n = DC.unread(db.state, x, me); return `<button type="button" class="dk-row ${x.id === DK.tid ? 'on' : ''}" onclick="Desk.open('${x.id}','admin');render()">${x.kind === 'group' ? `<span class="dk-av grp">👥</span>` : av(x.members.find(y => y !== me), 38)}<span class="dk-row-main"><b>${E(titleFor(x, me))}</b><small>${last ? E((last.from === me ? 'أنت: ' : '') + last.text.slice(0, 48)) : E(subFor(x, me).replace(/<[^>]+>/g, ''))}</small></span><span class="dk-row-side">${last ? `<time>${E(when(last.at))}</time>` : ''}${n ? `<em>${n}</em>` : ''}</span></button>`; };
      return `<div class="sb-page dk-page"><header class="sb-head"><div><small>التواصل والدعم</small><h1>المحادثات</h1><p>كل مجموعة وفريق ليه شات فيه الإدارة والمدرب وكل اللاعبين، وتقدر تكلم أي مدرب أو لاعب لوحده.</p></div><button type="button" class="sb-btn primary" onclick="Desk.newChat()">+ محادثة جديدة</button></header>
        <div class="dk-chat"><aside class="dk-list"><h4>الفرق والمجموعات</h4>${groups.map(row).join('')}<h4>محادثات خاصة</h4>${directs.map(row).join('') || '<p class="dk-empty">مفيش محادثات خاصة لسه.</p>'}</aside>
        <section class="dk-thread">${t ? `<header class="dk-thread-head">${t.kind === 'group' ? '<span class="dk-av grp">👥</span>' : av(t.members.find(y => y !== me), 40)}<div><b>${E(titleFor(t, me))}</b><small>${subFor(t, me)}</small></div></header><div class="dk-thread-body">${bubbles(t, me)}</div>${composer(t.id, me)}` : '<p class="dk-empty">اختار محادثة.</p>'}</section></div></div>`;
    };
    PAGES.chat_after = () => { const box = document.querySelector('.dk-thread-body'); if (box) box.scrollTop = box.scrollHeight; };
    DK.newChat = () => {
      const gs = db.state.groups.filter(inEdition), coaches = [...new Set(gs.map(g => g.coach).filter(Boolean))], players = db.state.members.filter(m => inEdition(group(m.group)));
      V.open(`<div class="ma-form fb-form"><h3>محادثة جديدة</h3><label>مع<select id="dk-to"><optgroup label="المدربين">${coaches.map(c => `<option value="coach:${E(c)}">${E(c)}</option>`).join('')}</optgroup><optgroup label="اللاعبين وأولياء الأمور">${players.map(m => `<option value="member:${m.id}">${E(m.name)} · ${E(groupName(group(m.group)))}</option>`).join('')}</optgroup></select></label>
        <button type="button" class="sb-btn primary ax-btn" onclick="Desk.direct('admin',document.getElementById('dk-to').value)">ابدأ المحادثة</button></div>`);
    };

    PAGES.tickets = () => {
      const all = DC.ticketsFor(db.state, me).filter(t => !t.from.startsWith('member:') || inEdition(group(db.state.members.find(m => 'member:' + m.id === t.from)?.group))), month = new Date(); month.setDate(1);
      const list = all.filter(t => DK.tfilter === 'all' || (DK.tfilter === 'open' ? t.status !== 'closed' : t.status === DK.tfilter));
      return `<div class="sb-page dk-page"><header class="sb-head"><div><small>التواصل والدعم</small><h1>تذاكر الدعم</h1><p>طلبات المساعدة من اللاعبين وأولياء الأمور والمدربين: كل طلب ليه رقم ونوع وحالة ومسؤول، والرد بيوصل لصاحبه في التطبيق.</p></div><button type="button" class="sb-btn primary" onclick="Desk.staffTicket()">+ تذكرة جديدة</button></header>
        <div class="pg-kpis"><div class="${all.some(t => t.status === 'open') ? 'warn' : 'ok'}"><small>جديدة</small><b>${all.filter(t => t.status === 'open').length}</b></div><div><small>جاري الحل</small><b>${all.filter(t => t.status === 'progress').length}</b></div><div class="${all.some(t => t.priority === 'high' && t.status !== 'closed') ? 'warn' : ''}"><small>عاجلة مفتوحة</small><b>${all.filter(t => t.priority === 'high' && t.status !== 'closed').length}</b></div><div class="ok"><small>اتقفلت الشهر ده</small><b>${all.filter(t => t.status === 'closed' && new Date(t.updated) >= month).length}</b></div></div>
        <nav class="tp-tabs fb-tabs">${[['open', 'المفتوحة'], ['progress', 'جاري الحل'], ['closed', 'المقفولة'], ['all', 'الكل']].map(([k, l]) => `<button type="button" class="${DK.tfilter === k ? 'selected' : ''}" onclick="Desk.tfilter='${k}';render()">${l}</button>`).join('')}</nav>
        <div class="dk-tickets">${list.map(t => `<button type="button" class="dk-trow" onclick="Desk.ticketView('${t.id}')">${av(t.from, 38)}<span class="dk-row-main"><b>#${t.no} · ${E(t.subject)}</b><small>${E(DK.name(t.from))} · ${E(DC.CATEGORIES[t.category])} · ${t.replies.length} ${t.replies.length > 1 ? 'رسائل' : 'رسالة'}</small></span><span class="dk-row-side">${prChip(t.priority)}${statusChip(t.status)}<time>${E(when(t.updated))}</time></span></button>`).join('') || '<p class="dk-empty">مفيش تذاكر هنا.</p>'}</div></div>`;
    };
    PAGES.tickets_after = () => {};
    DK.ticketView = tid => {
      const t = db.state.tickets.find(x => x.id === tid); if (!t) return;
      const staff = ['الإدارة', 'الاستقبال', 'الحسابات', ...new Set(db.state.groups.filter(inEdition).map(g => g.coach).filter(Boolean))];
      V.open(`<div class="ma-form fb-form">${ticketBody(t, me)}
        <div class="dk-ticket-tools"><label>الحالة<select onchange="Desk.setTicket('${t.id}','status',this.value)">${Object.entries(DC.STATUS).map(([k, l]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${E(l)}</option>`).join('')}</select></label><label>المسؤول<select onchange="Desk.setTicket('${t.id}','assignee',this.value)"><option value="">—</option>${staff.map(s => `<option ${t.assignee === s ? 'selected' : ''}>${E(s)}</option>`).join('')}</select></label></div>
        ${t.status === 'closed' ? '<p class="py-help">الطلب مقفول. غيّر الحالة عشان ترد.</p>' : `<label>ردك<textarea id="dk-reply" rows="3" placeholder="الرد بيوصل لصاحب الطلب في التطبيق"></textarea></label><button type="button" class="sb-btn primary ax-btn" onclick="Desk.reply('${t.id}','admin')">إرسال الرد</button>`}</div>`);
    };
    DK.staffTicket = () => { const players = db.state.members.filter(m => inEdition(group(m.group))), coaches = [...new Set(db.state.groups.filter(inEdition).map(g => g.coach).filter(Boolean))]; V.open(ticketForm('admin', `<label>صاحب الطلب<select id="dk-from"><optgroup label="اللاعبين وأولياء الأمور">${players.map(m => `<option value="member:${m.id}">${E(m.name)}</option>`).join('')}</optgroup><optgroup label="المدربين">${coaches.map(c => `<option value="coach:${E(c)}">${E(c)}</option>`).join('')}</optgroup></select></label>`)); };

    /* ---------- the office assistant ---------- */
    const norm = s => String(s || '').replace(/[ً-ْ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
    const has = (q, ...words) => words.some(w => q.includes(norm(w)));
    const money = v => new Intl.NumberFormat('en-US').format(Math.round(v)) + ' ج';
    const scope = () => { const gs = db.state.groups.filter(inEdition), ids = new Set(gs.map(g => g.id)); return { gs, ms: db.state.members.filter(m => ids.has(m.group)) }; };
    const HOW = [
      [['سجل', 'تسجيل', 'اضيف لاعب', 'اضافه لاعب', 'لاعب جديد'], () => ({ text: 'تسجيل لاعب بيتم على خطوات: ولي الأمر ← بيانات اللاعب (الجنسية والصورة) ← المسار والفريق ← المراجعة. اللاعب بيدخل فريق سنه أو مجموعة المدرسة على طول، والفاتورة بتتعمل لوحدها. ولو عندك لاعبين كتير استوردهم من ملف Excel.', actions: [['إضافة لاعبين', 'Registration.addPlayers()']] })],
      [['مجموعه جديده', 'فريق جديد', 'اعمل مجموعه', 'انشئ مجموعه', 'اعمل فريق'], () => ({ text: 'من «الفرق والمجموعات» ← مجموعة جديدة: تختار النوع (فريق مسار بسنة الميلاد أو مجموعة مدرسة)، الأيام والميعاد، **المدرب المسؤول (إجباري)**، والملعب. الحصص بتتعمل لوحدها من الجدول.', actions: [['مجموعة جديدة', "ProgramsUI.groupForm()"]] })],
      [['تحصيل', 'ادفع', 'دفع', 'تجديد'], () => ({ text: 'التحصيل من «الاشتراكات»: تختار اللاعب، الباقة، وطريقة الدفع، والإيصال بيتعمل. التحويلات اللي بيبعتها ولي الأمر من التطبيق بتظهر في «الطلبات» للموافقة.', actions: [['تحصيل اشتراك', 'AcademyUI.chooseMember()'], ['الفواتير', "go('billing')"]] })],
      [['ماتش', 'مباراه'], () => ({ text: 'الماتشات الرسمية لفرق المسار بس: من الفريق ← الماتشات والدقائق ← ماتش جديد (المنافس والنوع والميعاد)، وبعد الماتش تسجل النتيجة والتشكيل والدقائق والتقييم.', actions: [['ماتش رسمي', "FootballUI.quick('match')"]] })],
      [['قياس', 'اختبار بدني', 'سرعه', 'طول'], () => ({ text: 'القياسات البدنية للفريق كله مرة واحدة: سرعة 10 و30 متر، رشاقة، وثب، تحمل، والطول والوزن. النظام بيحسب النمو والطفرة.', actions: [['قياسات بدنية', "FootballUI.quick('tests')"]] })],
      [['خطه', 'تمرين', 'برنامج تدريب'], () => ({ text: 'خطط التدريب بتتعمل لوحدها لكل فريق من القالب المناسب للسن والمستوى، والمدرب يعدّل ويعتمد.', actions: [['خطط التدريب', "go('plans')"]] })],
      [['حضور', 'غياب'], () => ({ text: 'الحضور بيتسجل من تطبيق المدرب أو بمسح كود اللاعب. الغياب من غير اعتذار بيبعت رسالة لولي الأمر لو مفعّلة.', actions: [['الجدول والحضور', "go('attendance')"]] })],
      [['رساله', 'شات', 'محادثه', 'كلم'], () => ({ text: 'المحادثات: كل مجموعة ليها شات فيه الإدارة والمدرب واللاعبين، وتقدر تفتح محادثة خاصة مع أي مدرب أو لاعب.', actions: [['المحادثات', "go('chat')"], ['محادثة جديدة', 'Desk.newChat()']] })],
      [['تقرير', 'تقارير'], () => ({ text: 'التقارير فيها مقارنة فرق المسار، التمويل، مدرسة الكرة، والكشافة. وتحليل الأداء فيه التحصيل والحضور.', actions: [['التقارير', "go('reports')"], ['تحليل الأداء', "go('analytics')"]] })],
      [['صلاحي', 'موظف'], () => ({ text: 'الموظفين وصلاحياتهم من «الإعدادات والأدوات ← الفريق والصلاحيات».', actions: [['الفريق والصلاحيات', "go('users')"]] })],
      [['ملعب', 'ملاعب'], () => ({ text: 'الملاعب: إشغال كل ملعب الأسبوع ده والتعارضات.', actions: [['الملاعب', "go('resources')"]] })]
    ];
    const DATA = [
      [['كام لاعب', 'عدد اللاعبين', 'اللاعبين'], () => { const { gs, ms } = scope(), sq = gs.filter(g => FC()?.isSquad(g)), path = ms.filter(m => sq.some(g => g.id === m.group)); return { text: `عندك ${ms.length} لاعب: ${path.length} في مسار الاحتراف و${ms.length - path.length} في مدرسة الكرة.`, actions: [['ملفات اللاعبين', "go('members')"]] }; }],
      [['مدرب', 'مدربين'], () => { const { gs } = scope(), cs = [...new Set(gs.map(g => g.coach).filter(Boolean))], none = gs.filter(g => !g.coach); return { text: `عندك ${cs.length} مدرب: ${cs.join('، ')}.${none.length ? ` ⚠ ${none.length} مجموعة من غير مدرب.` : ' كل المجموعات ليها مدرب.'}`, actions: [['الجهاز الفني', "go('users')"]] }; }],
      [['مجموعات', 'فرق', 'جروب'], () => { const { gs } = scope(), sq = gs.filter(g => FC()?.isSquad(g)); return { text: `${gs.length} مجموعة: ${sq.length} فرق مسار و${gs.length - sq.length} مجموعات مدرسة.`, actions: [['الفرق والمجموعات', "go('groups')"]] }; }],
      [['فلوس', 'متاخر', 'متبقي', 'فواتير', 'مديونيه'], () => { const { ms } = scope(), ids = new Set(ms.map(m => m.id)), open = db.state.invoices.filter(i => ids.has(i.memberId) && i.total > i.paid); return { text: open.length ? `${open.length} فاتورة عليها ${money(open.reduce((n, i) => n + i.total - i.paid, 0))}: ${open.slice(0, 4).map(i => db.member(i.memberId).name).join('، ')}${open.length > 4 ? '…' : ''}.` : 'مفيش فلوس متأخرة. 👌', actions: [['الفواتير', "go('billing')"]] }; }],
      [['تقييم', 'مستحق'], () => { const list = (FC()?.squads(db.state) || []).flatMap(g => FC().playersOf(db.state, g.id)).filter(p => FC().due(db.state, p.id)); return { text: list.length ? `${list.length} لاعب محتاج تقييم الأركان الأربعة: ${list.slice(0, 5).map(p => p.name).join('، ')}${list.length > 5 ? '…' : ''}.` : 'كل التقييمات في ميعادها.', actions: [['تقييمات مستحقة', "FootballUI.quick('assess')"]] }; }],
      [['مصاب', 'اصابه', 'اصابات'], () => { const list = (FC()?.squads(db.state) || []).flatMap(g => FC().playersOf(db.state, g.id)).filter(p => FC().injured(db.state, p.id)); return { text: list.length ? `${list.length} مصاب: ${list.map(p => `${p.name} (${FC().injured(db.state, p.id).part})`).join('، ')}.` : 'مفيش مصابين.', actions: [['تسجيل إصابة', "FootballUI.quick('injury')"]] }; }],
      [['كشاف', 'مرشح', 'اختبارات'], () => { const c = db.state.fbScouting || [], soon = c.filter(x => x.stage === 'invited'); return { text: `${c.filter(x => !['joined', 'rejected'].includes(x.stage)).length} مرشح جاري: ${soon.length} مدعو للاختبار و${c.filter(x => x.stage === 'offer').length} عرض مستني رد.`, actions: [['الكشافة', "go('scouting')"], ['مرشح جديد', 'FootballUI.scoutForm()']] }; }],
      [['تذكر', 'دعم', 'شكوي', 'شكاوي'], () => { const open = (db.state.tickets || []).filter(t => t.status !== 'closed'); return { text: open.length ? `${open.length} تذكرة مفتوحة، منها ${open.filter(t => t.priority === 'high').length} عاجلة.` : 'مفيش تذاكر مفتوحة.', actions: [['تذاكر الدعم', "go('tickets')"]] }; }],
      [['النهارده', 'حصص'], () => { const { gs } = scope(), ids = new Set(gs.map(g => g.id)), today = new Date().toDateString(), list = db.state.sessions.filter(s => ids.has(s.group) && new Date(s.start).toDateString() === today && s.status !== 'cancelled'); return { text: list.length ? `${list.length} حصة النهارده: ${list.map(s => `${fmt(s.start, { hour: 'numeric', minute: '2-digit' })} ${groupName(group(s.group))}`).join(' · ')}.` : 'مفيش حصص النهارده.', actions: [['الجدول', "go('attendance')"]] }; }]
    ];
    const HELP = ['كام لاعب عندي؟', 'مين عليه فلوس؟', 'التقييمات المستحقة', 'إزاي أسجل لاعب؟', 'إزاي أعمل مجموعة جديدة؟', 'التذاكر المفتوحة'];
    DK.answer = text => {
      const q = norm(text);
      if (!q.trim()) return { text: 'اكتب سؤالك.', actions: [] };
      if (has(q, 'ازاي', 'كيف', 'طريقه', 'اعمل', 'افتح')) { const how = HOW.find(([w]) => has(q, ...w)); if (how) return how[1](); }
      const data = DATA.find(([w]) => has(q, ...w)); if (data) return data[1]();
      const how = HOW.find(([w]) => has(q, ...w)); if (how) return how[1]();
      const m = db.state.members.find(x => inEdition(group(x.group)) && q.includes(norm(x.name.split(' ')[0])) && q.includes(norm(x.name.split(' ')[1] || '')));
      if (m) { const inv = db.state.invoices.filter(i => i.memberId === m.id && i.total > i.paid); return { text: `${m.name} · ${groupName(group(m.group))}${m.fb?.position ? ' · ' + (FC()?.POSITIONS[m.fb.position]?.name || '') : ''}. ${inv.length ? `عليه ${money(inv.reduce((n, i) => n + i.total - i.paid, 0))}.` : 'مفيش عليه فلوس.'}`, actions: [['ملف اللاعب', `Refine.profile('${m.id}')`], ['كلّمه', `Desk.direct('admin','member:${m.id}')`]] }; }
      if (has(q, 'اهلا', 'السلام', 'مرحبا', 'هاي', 'مساعده', 'ساعدني')) return { text: 'أهلًا! أنا مساعد الأكاديمية. اسألني عن أي رقم في النظام أو إزاي تعمل أي حاجة، وأنا أفتحلك الشاشة.', actions: [] };
      return { text: 'مش متأكد قصدك. جرّب تسأل عن اللاعبين، المدربين، الفلوس، التقييمات، الإصابات، الكشافة، التذاكر، أو «إزاي أعمل …». وتقدر تكتب اسم لاعب.', actions: [] };
    };
    DK.chat = [{ from: 'bot', text: 'أهلًا! أنا مساعد الأكاديمية. أقدر أقولك الأرقام، أشرحلك إزاي تعمل أي حاجة، وأفتحلك الشاشة على طول.', actions: [] }];
    const assistHTML = () => `<div class="dk-assist-panel" role="dialog" aria-label="مساعد الأكاديمية"><header><span class="dk-av office">🤖</span><div><b>مساعد الأكاديمية</b><small>بيعرف النظام وبيرد من بياناتك</small></div><button type="button" onclick="Desk.toggleAssist()" aria-label="إغلاق">×</button></header>
      <div class="dk-assist-body">${DK.chat.map(m => `<div class="dk-msg ${m.from === 'me' ? 'mine' : ''}"><div class="dk-bubble"><p>${E(m.text).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')}</p>${m.actions?.length ? `<div class="dk-acts">${m.actions.map(([l, js]) => `<button type="button" onclick="${E(js)}">${E(l)}</button>`).join('')}</div>` : ''}</div></div>`).join('')}</div>
      <div class="dk-chips">${HELP.map(h => `<button type="button" onclick="Desk.ask(${E(JSON.stringify(h))})">${E(h)}</button>`).join('')}</div>
      <form class="dk-compose" onsubmit="event.preventDefault();Desk.ask(document.getElementById('dk-ask').value)"><input id="dk-ask" placeholder="اسأل أو اطلب أي حاجة…" autocomplete="off"><button type="submit" class="dk-send" aria-label="إرسال">➤</button></form></div>`;
    DK.paintAssist = () => { let box = document.getElementById('dk-assist'); if (!box) return; box.querySelector('.dk-assist-panel')?.remove(); if (box.classList.contains('open')) { box.insertAdjacentHTML('beforeend', assistHTML()); const b = box.querySelector('.dk-assist-body'); b.scrollTop = b.scrollHeight; document.getElementById('dk-ask')?.focus(); } };
    DK.toggleAssist = () => { document.getElementById('dk-assist')?.classList.toggle('open'); DK.paintAssist(); };
    DK.ask = text => { if (!String(text || '').trim()) return; DK.chat.push({ from: 'me', text }); DK.chat.push({ from: 'bot', ...DK.answer(text) }); DK.paintAssist(); };
    if (!document.getElementById('dk-assist')) document.body.insertAdjacentHTML('beforeend', `<div id="dk-assist" class="dk-assist"><button type="button" class="dk-assist-btn" onclick="Desk.toggleAssist()" aria-label="مساعد الأكاديمية">🤖<span>المساعد</span></button></div>`);
  }

  /* =========================================================== apps */
  if (typeof APPS !== 'undefined' && window.AcademyApps) {
    const AA = window.AcademyApps;
    const meOf = role => role === 'member' ? 'member:' + (AA.viewer ? AA.viewer().id : 'm0') : role === 'coach' ? 'coach:' + (AA.scope().groups[0]?.coach || '') : 'admin';
    const top = (title, sub, back = 'home') => `<header class="ax-top"><div class="ax-top-row"><button type="button" class="ax-icon-btn" aria-label="رجوع" onclick="go('${back}')">→</button><div style="flex:1"><small>${E(sub)}</small><h2>${E(title)}</h2></div></div></header>`;
    const list = role => () => {
      const me = meOf(role), ts = DC.sorted(visible(DC.threadsFor(db.state, me))), mine = (db.state.tickets || []).filter(t => t.from === me && t.status !== 'closed').length;
      const row = x => { const last = x.messages.at(-1), n = DC.unread(db.state, x, me); return `<button type="button" class="ax-card dk-row" onclick="Desk.open('${x.id}','${me}');go('chat1')">${x.kind === 'group' ? '<span class="dk-av grp">👥</span>' : av(x.members.find(y => y !== me), 40)}<span class="dk-row-main"><b>${E(titleFor(x, me))}</b><small>${last ? E((last.from === me ? 'أنت: ' : '') + last.text.slice(0, 40)) : x.kind === 'group' ? 'شات المجموعة' : ''}</small></span><span class="dk-row-side">${last ? `<time>${E(when(last.at))}</time>` : ''}${n ? `<em>${n}</em>` : ''}</span></button>`; };
      const office = me !== 'admin' ? `<button type="button" class="ax-card dk-row" onclick="Desk.direct('${me}','admin')"><span class="dk-av office">🏢</span><span class="dk-row-main"><b>كلّم الإدارة</b><small>استفسار أو طلب</small></span></button>` : '';
      const coachBtn = role === 'member' ? (() => { const g = group(AA.viewer?.()?.group); return g?.coach ? `<button type="button" class="ax-card dk-row" onclick="Desk.direct('${me}','coach:${E(g.coach)}')">${av('coach:' + g.coach, 40)}<span class="dk-row-main"><b>كلّم ${E(g.coach)}</b><small>المدرب</small></span></button>` : ''; })() : '';
      return `<div class="ax dk-app">${top('المحادثات', role === 'coach' ? 'الفرق والمجموعات واللاعبين' : 'المدرب والإدارة وزمايلك')}<div class="ax-body">${ts.map(row).join('')}${coachBtn}${office}
        <button type="button" class="ax-card dk-row dk-support-link" onclick="go('support')"><span class="dk-av office">🎧</span><span class="dk-row-main"><b>الدعم</b><small>${mine ? mine + ' طلب مفتوح' : 'عندك مشكلة؟ ابعت طلب'}</small></span></button></div></div>`;
    };
    const thread = role => () => {
      const me = meOf(role), t = (db.state.chats || []).find(x => x.id === DK.tid);
      if (!t) return list(role)();
      return `<div class="ax dk-app dk-app-thread">${top(titleFor(t, me), t.kind === 'group' ? `${DC.participants(db.state, t).length} عضو` : DK.role(t.members.find(y => y !== me) || me), 'chats')}<div class="dk-thread-body">${bubbles(t, me)}</div>${composer(t.id, me)}</div>`;
    };
    const support = role => () => {
      const me = meOf(role), mine = DC.ticketsFor(db.state, me), open = mine.find(t => t.id === DK.ticket);
      if (open) return `<div class="ax dk-app">${top('#' + open.no, 'طلب دعم', 'support')}<div class="ax-body">${ticketBody(open, me)}${open.status === 'closed' ? '<p class="ck-hint">الطلب اتقفل. لو المشكلة رجعت ابعت طلب جديد.</p>' : `<div class="ax-card dk-reply-box"><textarea id="dk-reply" rows="3" placeholder="اكتب ردك"></textarea><button type="button" class="ax-btn" onclick="Desk.reply('${open.id}','${me}')">إرسال</button></div>`}</div></div>`;
      return `<div class="ax dk-app">${top('الدعم', 'طلباتك والردود عليها', 'chats')}<div class="ax-body"><button type="button" class="ax-btn dk-new" onclick="Desk.newTicket('${me}')">+ طلب دعم جديد</button>
        ${mine.map(t => `<button type="button" class="ax-card dk-row" onclick="Desk.ticket='${t.id}';draw()"><span class="dk-av office">#</span><span class="dk-row-main"><b>${E(t.subject)}</b><small>#${t.no} · ${E(DC.CATEGORIES[t.category])} · ${t.replies.length} رسائل</small></span><span class="dk-row-side">${statusChip(t.status)}</span></button>`).join('') || '<p class="ck-hint">مفيش طلبات. لو عندك أي مشكلة ابعتلنا.</p>'}</div></div>`;
    };
    ['member', 'coach', 'manager'].forEach(role => { if (!APPS[role]) return; APPS[role].F.chats = list(role); APPS[role].F.chat1 = thread(role); APPS[role].F.support = support(role); APPS[role].sub = APPS[role].sub || {}; Object.assign(APPS[role].sub, { chats: 'home', chat1: 'home', support: 'home' }); });
    const base = window.draw;
    window.draw = function () { base(); if (document.querySelector('.dk-app-thread')) { const b = document.querySelector('.dk-app-thread .dk-thread-body'); if (b) b.scrollTop = b.scrollHeight; } };
  }
})();

/* Automated messages page in the dashboard and the academy assistant in the parent app.
   The dashboard shows who should get which message today and opens each one in WhatsApp
   ready to send; the assistant answers parents from the academy records and passes the
   questions it cannot answer to the dashboard. */
(function () {
  'use strict';
  if (!window.Messages || typeof V === 'undefined') return;
  const Msg = window.Messages, db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  const ago = v => { const m = Math.round((Date.now() - new Date(v)) / 60000); return m < 60 ? `من ${Math.max(1, m)} دقيقة` : m < 1440 ? `من ${Math.round(m / 60)} ساعة` : fmt(v, { day: 'numeric', month: 'short' }); };
  const MU = window.MessagesUI = { kind: 'all', chat: {} };

  /* =========================================================== dashboard */
  if (typeof PAGES !== 'undefined' && window.AcademyUI) {
    const U = window.AcademyUI;
    const btn = (label, action, cls = '') => `<button type="button" class="sb-btn ${cls}" onclick="${E(action)}">${E(label)}</button>`;
    window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { automation: 'الرسائل الآلية' });
    const inScope = () => { const ids = new Set(U.scope().members.map(m => m.id)); return x => ids.has(x.memberId); };

    /* A holiday notice goes to every family, so it is one broadcast card, not dozens of rows. */
    const broadcasts = list => {
      const by = {}; list.filter(x => x.kind === 'holiday').forEach(x => { const k = x.reason; (by[k] = by[k] || []).push(x); });
      return Object.entries(by).map(([name, xs]) => `<article class="mg-msg mg-broadcast" data-kind="holiday"><header><span class="mg-kind">قائمة بث · ${xs.length} رقم</span><b>${E(name)}</b><small>لكل العائلات مرة واحدة</small></header><p>${E(xs[0].text.replace(/^أهلًا [^،]+،\s*/, 'أهلًا، '))}</p><footer>${btn('نسخ النص والأرقام', `MessagesUI.copyBroadcast(${E(JSON.stringify(name))})`, 'primary')}${btn('تسجيل كمرسلة للكل', `MessagesUI.sendAll(${E(JSON.stringify(name))})`)}</footer></article>`).join('');
    };
    PAGES.automation = () => {
      const keep = inScope(), all = Msg.due().filter(keep), cfg = Msg.settings(), K = Msg.KINDS;
      const list = MU.kind === 'all' ? all : all.filter(x => x.kind === MU.kind);
      const week = Date.now() - 7 * 86400000, log = Msg.log(), sent = log.filter(o => o.status === 'sent' && new Date(o.at) > week).length;
      const questions = Msg.inbox();
      const count = k => all.filter(x => x.kind === k).length;
      return `<div class="sb-page mg-page"><header class="sb-head"><div><small>المبيعات والمتابعة</small><h1>الرسائل الآلية</h1><p>النظام بيحدد كل يوم مين محتاج رسالة: تجديد قرب، اشتراك خلص، غياب، إجازة، ترقية. كل رسالة جاهزة بالاسم والميعاد، وبتتفتح في واتساب بضغطة.</p></div>${btn('عناوين الفروع للمساعد', 'MessagesUI.branchForm()')}</header>
        <div class="pg-kpis"><div class="${all.length ? 'warn' : 'ok'}"><small>رسائل مستحقة النهارده</small><b>${all.length}</b></div><div class="ok"><small>اتبعتت آخر 7 أيام</small><b>${sent}</b></div><div class="${questions.length ? 'warn' : ''}"><small>أسئلة من المساعد</small><b>${questions.length}</b></div><div><small>أنواع شغالة</small><b>${Object.keys(K).filter(k => cfg[k]).length} من ${Object.keys(K).length}</b></div></div>
        <div class="mg-rules">${Object.entries(K).map(([k, d]) => `<article class="mg-rule ${cfg[k] ? 'on' : ''}"><label class="mg-switch"><input type="checkbox" ${cfg[k] ? 'checked' : ''} onchange="MessagesUI.toggle('${k}',this.checked)"><span aria-hidden="true"></span><b>${E(d.name)}</b></label><small>${k === 'renewal' ? `قبل الانتهاء بـ <input type="number" min="1" max="14" value="${cfg.renewalDays}" aria-label="عدد الأيام" onchange="MessagesUI.days(this.value)"> أيام أو عند بقاء حصتين` : E(d.desc)}</small>${cfg[k] ? `<button type="button" class="mg-count ${MU.kind === k ? 'on' : ''}" onclick="MessagesUI.filter('${k}')">${count(k)} مستحقة</button>` : '<em>متوقف</em>'}</article>`).join('')}</div>
        <div class="mg-cols"><section class="mg-queue"><header><h2>جاهزة للإرسال</h2><div class="mg-filter"><button type="button" class="${MU.kind === 'all' ? 'on' : ''}" onclick="MessagesUI.filter('all')">الكل ${all.length}</button>${Object.keys(K).filter(k => count(k)).map(k => `<button type="button" class="${MU.kind === k ? 'on' : ''}" onclick="MessagesUI.filter('${k}')">${E(K[k].name)} ${count(k)}</button>`).join('')}</div></header>
          ${broadcasts(list)}${list.filter(x => x.kind !== 'holiday').slice(0, MU.more ? 500 : 10).map(x => `<article class="mg-msg" data-kind="${x.kind}"><header><span class="mg-kind">${E(K[x.kind].name)}</span><b>${E(x.to.name)}</b><bdi>${E(x.to.phone)}</bdi><small>${E(x.reason)}</small></header><p>${E(x.text)}</p><footer>${btn('فتح في واتساب', `MessagesUI.send('${x.id}')`, 'primary')}${btn('تخطي', `MessagesUI.skip('${x.id}')`)}<button type="button" class="mg-link" onclick="Refine.profile('${x.memberId}')">ملف اللاعب</button></footer></article>`).join('')}${!MU.more && list.filter(x => x.kind !== 'holiday').length > 10 ? `<button type="button" class="mg-more" onclick="MessagesUI.more=true;render()">عرض الكل (${list.filter(x => x.kind !== 'holiday').length})</button>` : ''}${list.length ? '' : `<div class="ac-empty"><b>مفيش رسائل مستحقة</b><p>${MU.kind === 'all' ? 'كل الرسائل اتبعتت أو مفيش حالات النهارده.' : 'مفيش رسائل من النوع ده.'}</p></div>`}</section>
          <aside class="mg-side"><section><h2>أسئلة من مساعد ولي الأمر</h2>${questions.map(q => `<article class="mg-q"><b>${E(q.name)}</b><small>${E(ago(q.at))} · <bdi>${E(q.phone)}</bdi></small><p>«${E(q.text)}»</p><footer>${q.phone ? `<a class="sb-btn primary" target="_blank" rel="noopener" href="${E(Msg.waLink(q.phone, `أهلًا ${String(q.name).split(' ')[0]}، بخصوص سؤالك: «${q.text}» — `))}">رد على واتساب</a>` : ''}${btn('تم الرد', `MessagesUI.done('${q.id}')`)}</footer></article>`).join('') || '<p class="mg-muted">مفيش أسئلة مفتوحة. المساعد بيرد لوحده على المواعيد والأماكن والرصيد والإجازات والاعتذار.</p>'}</section>
          <section><h2>آخر الرسائل</h2>${log.slice(0, 10).map(o => `<div class="mg-log"><span class="sa-chip ${o.status === 'sent' ? 'ok' : ''}">${o.status === 'sent' ? 'اتبعتت' : 'اتخطت'}</span><b>${E(o.name)}</b><small>${E(K[o.kind]?.name || '')} · ${E(ago(o.at))}</small></div>`).join('') || '<p class="mg-muted">السجل فاضي.</p>'}</section>
          <p class="mg-note">في النسخة دي كل رسالة بتتفتح في واتساب جاهزة ويضغط الموظف إرسال. الإرسال من غير تدخل محتاج ربط WhatsApp Business API، وساعتها نفس القواعد دي هتشتغل لوحدها كل يوم.</p></aside></div></div>`;
    };
    PAGES.automation_after = () => {};

    const find = id => Msg.due().find(x => x.id === id);
    MU.send = id => { const x = find(id); if (!x) return; window.open(Msg.waLink(x.to.phone, x.text), '_blank', 'noopener'); V.run(() => Msg.mark(x, 'sent')); render(); toast('اتسجلت كمرسلة'); };
    const holidayOf = name => Msg.due().filter(x => x.kind === 'holiday' && x.reason === name);
    MU.copyBroadcast = name => { const xs = holidayOf(name); if (!xs.length) return; const text = xs[0].text.replace(/^أهلًا [^،]+،\s*/, 'أهلًا، ') + '\n\n' + xs.map(x => x.to.phone).join('\n'); (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => toast(`اتنسخ النص و${xs.length} رقم. الصقهم في قائمة بث واتساب`), () => toast('النسخ مش متاح في المتصفح ده')); };
    MU.sendAll = name => { const xs = holidayOf(name); V.run(() => xs.forEach(x => Msg.mark(x, 'sent'))); render(); toast(`اتسجلت ${xs.length} رسالة كمرسلة`); };
    MU.skip = id => { const x = find(id); if (!x) return; V.run(() => Msg.mark(x, 'skipped')); render(); };
    MU.filter = k => { MU.kind = MU.kind === k && k !== 'all' ? 'all' : k; render(); };
    MU.toggle = (k, on) => { V.run(() => Msg.setSetting(k, on)); render(); };
    MU.days = v => { const n = Math.max(1, Math.min(14, Number(v) || 5)); V.run(() => Msg.setSetting('renewalDays', n)); render(); };
    MU.done = id => { V.run(() => Msg.closeQuestion(id)); render(); toast('اتقفل السؤال'); };
    MU.branchForm = () => {
      const branches = [...new Set(db.state.groups.map(g => g.branch).filter(Boolean))], info = db.state.settings?.branchInfo || {};
      V.open(`<div class="ma-form mg-branches"><h3>عناوين الفروع</h3><p class="mg-muted">المساعد بيستخدمها لما ولي الأمر يسأل «التمرين فين؟».</p>${branches.map((b, i) => `<fieldset><legend>${E(b)}</legend><label>العنوان<input id="mg-a${i}" value="${E(info[b]?.address || '')}"></label><label>مواعيد الاستقبال<input id="mg-h${i}" value="${E(info[b]?.hours || '')}"></label><label>رابط الخريطة<input id="mg-m${i}" dir="ltr" value="${E(info[b]?.map || '')}"></label></fieldset>`).join('')}<button type="button" class="sb-btn primary" onclick="MessagesUI.saveBranches()">حفظ</button></div>`);
    };
    MU.saveBranches = () => {
      const branches = [...new Set(db.state.groups.map(g => g.branch).filter(Boolean))], v = id => document.getElementById(id)?.value.trim() || '';
      V.run(() => db.update(st => { st.settings.branchInfo = Object.fromEntries(branches.map((b, i) => [b, { address: v('mg-a' + i), hours: v('mg-h' + i), map: v('mg-m' + i) }])); }));
      V.close(); render(); toast('اتحفظت العناوين');
    };
  }

  /* =========================================================== parent app */
  if (typeof APPS !== 'undefined' && APPS.member && window.AcademyApps) {
    const AA = window.AcademyApps, P = window.Progress;
    const icon = (n, s = 20) => typeof ic === 'function' ? ic(n, s) : '';
    const viewer = () => AA.viewer ? AA.viewer() : db.member('m0');
    const QUICK = [['next', 'الحصة الجاية امتى؟'], ['place', 'التمرين فين؟'], ['balance', 'الرصيد والاشتراك'], ['excuse', 'اعتذار عن الحصة الجاية'], ['holiday', 'فيه إجازات؟'], ['level', 'المستوى وصل لفين؟']];
    const thread = m => (MU.chat[m.id] = MU.chat[m.id] || [{ from: 'bot', text: `أهلًا! أنا مساعد الأكاديمية. اسألني عن ${m.id === 'm0' ? 'حصصك' : 'حصص ' + m.name.split(' ')[0]} أو المكان أو الرصيد أو الإجازات، أو سجل اعتذار عن حصة.` }]);

    APPS.member.F.assistant = () => {
      const m = viewer(), list = thread(m);
      return `<div class="ax mg-chat"><header class="ax-top ax-top-family"><div class="ax-top-row"><button type="button" class="ax-icon-btn" aria-label="رجوع" onclick="go('home')">${icon('back', 20)}</button><div class="mg-bot-title"><span class="mg-bot-av">${icon('chat', 20)}</span><div><h2>مساعد الأكاديمية</h2><small>بيرد فورًا من بيانات ${E(m.id === 'm0' ? 'حسابك' : m.name.split(' ')[0])}</small></div></div></div>${AA.switcher ? AA.switcher() : ''}</header>
        <div class="ax-body mg-thread" id="mg-thread">${list.map((x, i) => `<div class="mg-bubble ${x.from}">${E(x.text)}${x.link ? `<a href="${E(x.link)}" target="_blank" rel="noopener">فتح الخريطة</a>` : ''}${x.confirm && !x.used ? `<span class="mg-actions"><button type="button" class="ax-btn small" onclick="MessagesUI.confirm(${i})">سجل الاعتذار</button><button type="button" class="ax-btn small light" onclick="MessagesUI.cancel(${i})">لا</button></span>` : ''}${x.action && !x.confirm ? `<button type="button" class="mg-go" onclick="go('${E(x.action)}')">فتح الصفحة ←</button>` : ''}</div>`).join('')}</div>
        <div class="mg-compose"><div class="mg-quick">${QUICK.map(([k, t]) => `<button type="button" onclick="MessagesUI.ask(${E(JSON.stringify(t))},'${k}')">${E(t)}</button>`).join('')}</div><form onsubmit="event.preventDefault();MessagesUI.ask(this.q.value);this.q.value=''"><input name="q" autocomplete="off" placeholder="اكتب سؤالك…" aria-label="سؤالك"><button type="submit" class="ax-btn" aria-label="إرسال">${icon('send', 18)}</button></form></div></div>`;
    };

    const redraw = () => { draw(); const t = document.getElementById('mg-thread'); if (t) t.lastElementChild?.scrollIntoView({ block: 'end' }); };
    MU.ask = (text, intent) => {
      text = String(text || '').trim(); if (!text) return;
      const m = viewer(), list = thread(m);
      list.push({ from: 'me', text });
      const r = Msg.answer(db.state, m, text, new Date(), { intent, self: m.id === 'm0', levelName: P?.level(m)?.name });
      if (r.unknown) V.run(() => Msg.ask(m, text));
      list.push({ from: 'bot', ...r });
      redraw();
    };
    MU.confirm = i => {
      const m = viewer(), list = thread(m), x = list[i]; if (!x?.confirm) return;
      x.used = true;
      try { db.rsvp(x.confirm.sessionId, m.id, 'excused'); list.push({ from: 'bot', text: 'تمام، اتسجل الاعتذار وبلغنا المدرب. ألف سلامة 🤍' }); }
      catch (e) { list.push({ from: 'bot', text: e.message }); }
      redraw();
    };
    MU.cancel = i => { const list = thread(viewer()); if (list[i]) list[i].used = true; list.push({ from: 'bot', text: 'تمام، الحصة زي ما هي.' }); redraw(); };
  }
})();

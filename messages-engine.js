/* Automated messages: the academy decides who should get which message today —
   renewal reminders, expiry notices, absence alerts, holiday notices, tomorrow's
   session, level-ups — and keeps a log of what was sent. Each message opens WhatsApp
   with the text ready; sending without a person needs the WhatsApp Business API. */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const KINDS = {
    renewal: { name: 'تذكير التجديد', desc: 'قبل انتهاء الاشتراك بأيام أو عند بقاء حصتين', icon: 'wallet' },
    expired: { name: 'اشتراك منتهي', desc: 'بعد انتهاء الاشتراك مباشرة', icon: 'clock' },
    absence: { name: 'تنبيه غياب', desc: 'عند غياب اللاعب عن حصة بدون اعتذار', icon: 'bell' },
    tomorrow: { name: 'تذكير حصة بكرة', desc: 'مساء اليوم السابق للحصة', icon: 'cal' },
    holiday: { name: 'إشعار إجازة', desc: 'قبل الإجازة بأسبوع', icon: 'cal' },
    levelup: { name: 'تهنئة بالترقية', desc: 'عند انتقال اللاعب لمستوى جديد', icon: 'trophy' }
  };
  const DEFAULTS = { renewal: true, expired: true, absence: true, tomorrow: false, holiday: true, levelup: true, renewalDays: 5 };

  const day = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  const first = n => String(n || '').split(' ')[0];

  function recipient(state, m) {
    const fam = (state.families || []).find(f => f.id === m.familyId);
    const phone = m.guardian?.phone || fam?.phone || m.phone || '';
    const name = m.guardian?.name || (fam && fam.relation !== 'نفسه' ? fam.name : '') || m.name;
    return /^01[0125]\d{8}$/.test(phone) ? { name, phone, isGuardian: !!(m.guardian || (fam && fam.relation !== 'نفسه')) } : null;
  }

  function waLink(phone, text) { return `https://wa.me/2${phone}?text=${encodeURIComponent(text)}`; }

  /* Every message that should go out now and has not been sent or skipped already. */
  function due(state, now = new Date(), opts = {}) {
    const cfg = { ...DEFAULTS, ...(state.settings?.automation || {}) };
    const done = new Set((state.outbox || []).map(o => o.id));
    const academy = opts.academy || 'أكاديمية النخبة';
    const groupOf = m => state.groups.find(g => g.id === m.group);
    const out = [];
    const push = (id, kind, m, text, reason) => { if (done.has(id)) return; const to = recipient(state, m); if (!to) return; out.push({ id, kind, memberId: m.id, to, text, reason }); };
    const today = day(now);

    state.members.forEach(m => {
      const g = groupOf(m); if (!g) return;
      const child = recipient(state, m)?.isGuardian;
      const who = child ? first(m.name) : '';
      const greet = r => `أهلًا ${first(r?.name || m.name)}،`;
      const end = new Date(m.end), left = Math.ceil((end - now) / DAY), frozen = (m.freezes || []).some(f => f.from <= today && f.to >= today);
      if (cfg.renewal && !frozen && left >= 0 && (left <= cfg.renewalDays || (m.remaining > 0 && m.remaining <= 2))) {
        push(`renewal-${m.id}-${day(m.end)}`, 'renewal', m, `${greet(recipient(state, m))} اشتراك ${who ? who + ' ' : ''}في ${g.name} ${left <= cfg.renewalDays ? `بينتهي يوم ${fmt(m.end, { weekday: 'long', day: 'numeric', month: 'long' })}` : `فاضل فيه ${m.remaining === 1 ? 'حصة واحدة' : 'حصتين'}`}. تقدر تجدد من تطبيق الأكاديمية أو بتحويل إنستاباي وتبعت صورة الإيصال هنا. ${academy}`, left <= cfg.renewalDays ? `ينتهي بعد ${left} يوم` : `${m.remaining} حصص متبقية`);
      }
      if (cfg.expired && left < 0 && left >= -7) {
        push(`expired-${m.id}-${day(m.end)}`, 'expired', m, `${greet(recipient(state, m))} اشتراك ${who ? who + ' ' : ''}في ${g.name} انتهى يوم ${fmt(m.end, { day: 'numeric', month: 'long' })}. علشان ${who || 'تكمل'} ${who ? 'يكمل' : ''} تدريبه بدون انقطاع، جدد من التطبيق أو كلمنا. ${academy}`.replace('  ', ' '), `انتهى منذ ${-left} يوم`);
      }
      if (cfg.absence) {
        state.sessions.filter(s => s.group === m.group && s.status === 'ended' && now - new Date(s.start) < 2 * DAY && !s.present?.[m.id] && s.marks?.[m.id] !== 'excused' && s.rsvp?.[m.id] !== 'excused').forEach(s => {
          push(`absence-${m.id}-${s.id}`, 'absence', m, `${greet(recipient(state, m))} ${who || 'حضرتك'} ${who ? 'غاب' : 'غبت'} عن حصة ${fmt(s.start, { weekday: 'long', hour: 'numeric', minute: '2-digit' })} في ${g.name}. نتمنى يكون كله تمام 🤍 لو فيه ظرف ابعتلنا، وتقدر تحجز حصة تعويض من التطبيق. ${academy}`, 'غياب بدون اعتذار');
        });
      }
      if (cfg.tomorrow) {
        const tmr = new Date(now); tmr.setDate(tmr.getDate() + 1);
        state.sessions.filter(s => s.group === m.group && s.status === 'scheduled' && day(s.start) === day(tmr)).forEach(s => {
          push(`tomorrow-${m.id}-${s.id}`, 'tomorrow', m, `${greet(recipient(state, m))} تذكير بحصة ${who ? who + ' ' : ''}بكرة ${fmt(s.start, { hour: 'numeric', minute: '2-digit' })} في ${s.resource || g.resource || g.branch}. أكد الحضور من التطبيق. ${academy}`, 'حصة بكرة');
        });
      }
      if (cfg.levelup) {
        (state.levelHistory || []).filter(h => h.memberId === m.id && now - new Date(h.at) < 3 * DAY && !/البداية/.test(h.reason)).forEach(h => {
          push(`levelup-${h.id}`, 'levelup', m, `مبروك 🎉 ${who || first(m.name)} اترقى لـ «${h.levelName}» في ${g.name}. فخورين بمجهوده، وتقدر تشوف بطاقته الجديدة في التطبيق. ${academy}`, 'ترقية جديدة');
        });
      }
    });

    if (cfg.holiday) {
      (state.holidays || []).filter(h => h.date >= today && new Date(h.date + 'T12:00:00') - now <= 7 * DAY).forEach(h => {
        const seen = new Set();
        state.members.forEach(m => { const r = recipient(state, m); if (!r || seen.has(r.phone)) return; seen.add(r.phone);
          push(`holiday-${h.date}-${r.phone}`, 'holiday', m, `أهلًا ${first(r.name)}، الأكاديمية إجازة يوم ${fmt(h.date + 'T12:00:00', { weekday: 'long', day: 'numeric', month: 'long' })} بمناسبة ${h.name}، ومفيش حصص في اليوم ده ولا خصم من الرصيد. كل سنة وانتم طيبين. ${academy}`, h.name); });
      });
    }
    return out;
  }

  /* ---------- parent assistant: rule-based answers from the academy records ---------- */
  const norm = t => String(t || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '').toLowerCase();
  const INTENTS = [
    ['excuse', /(اعتذر|اعتذار|عذر|مش هيحضر|مش هحضر|مش هقدر|غياب|هيغيب|هغيب|تعبان|عيان)/],
    ['holiday', /(اجاز|عطل|العيد|قفل)/],
    ['place', /(فين|مكان|عنوان|لوكيشن|موقع|الفرع|اروح)/],
    ['balance', /(رصيد|اشتراك|متبقي|باقي|فلوس|ادفع|دفع|تجديد|جدد|فاتور|حساب)/],
    ['level', /(مستوي|ترقي|بطاق|تقييم|اختبار|حزام|مستواه)/],
    ['coach', /(مدرب|كابتن|الكوتش)/],
    ['next', /(حصه|حصص|ميعاد|معاد|امتي|موعد|التمرين|بكره|النهارده|الجدول)/]
  ];
  const intentOf = text => { const t = norm(text); return (INTENTS.find(([, re]) => re.test(t)) || [null])[0]; };

  function answer(state, m, text, now = new Date(), opts = {}) {
    const intent = opts.intent || intentOf(text);
    const g = state.groups.find(x => x.id === m.group) || {};
    const who = opts.self ? 'حصتك' : 'حصة ' + first(m.name);
    const upcoming = state.sessions.filter(s => s.group === m.group && s.status === 'scheduled' && new Date(s.start) > now).sort((a, b) => new Date(a.start) - new Date(b.start));
    const when = s => fmt(s.start, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
    if (intent === 'next') {
      const s = upcoming[0];
      return { intent, text: s ? `${who} الجاية ${when(s)} في ${s.resource || g.resource || g.branch}${s.coach || g.coach ? ' مع ' + (s.coach || g.coach) : ''}.${upcoming[1] ? ` وبعدها ${fmt(upcoming[1].start, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}.` : ''}` : 'مفيش حصص متسجلة الأيام الجاية. هبلغ الإدارة تتواصل معاك.' };
    }
    if (intent === 'place') {
      const info = state.settings?.branchInfo?.[g.branch];
      return { intent, text: `التمرين في ${g.branch || 'الأكاديمية'}${g.resource ? '، ' + g.resource : ''}.${info?.address ? ' العنوان: ' + info.address + '.' : ''}${info?.hours ? ' مواعيد الاستقبال: ' + info.hours + '.' : ''}`, link: info?.map || '' };
    }
    if (intent === 'holiday') {
      const today = day(now), list = (state.holidays || []).filter(h => h.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
      return { intent, text: list.length ? 'الإجازات الجاية: ' + list.map(h => `${h.name} يوم ${fmt(h.date + 'T12:00:00', { weekday: 'long', day: 'numeric', month: 'long' })}`).join('، ') + '. الحصص في الأيام دي مش بتتخصم من الرصيد.' : 'مفيش إجازات متسجلة الفترة الجاية، والتمرين ماشي في مواعيده.' };
    }
    if (intent === 'balance') {
      const left = Math.ceil((new Date(m.end) - now) / DAY);
      const fam = state.families?.find(f => f.id === m.familyId);
      const ids = fam ? state.members.filter(x => x.familyId === fam.id).map(x => x.id) : [m.id];
      const owe = (state.invoices || []).filter(i => ids.includes(i.memberId)).reduce((n, i) => n + Math.max(0, (i.total || 0) - (i.paid || 0)), 0);
      return { intent, text: `${opts.self ? 'اشتراكك' : 'اشتراك ' + first(m.name)} ${left >= 0 ? `ساري لحد ${fmt(m.end, { day: 'numeric', month: 'long' })} وفاضل ${m.remaining} حصة` : `انتهى من ${-left} يوم`}.${owe ? ` وعلى ${fam ? 'العيلة' : 'الحساب'} متبقي ${new Intl.NumberFormat('en-US').format(owe)} ج.` : ' ومفيش مبالغ متأخرة.'}${left <= 5 ? ' تقدر تجدد من صفحة الاشتراك.' : ''}`, action: left <= 5 || owe ? 'account' : '' };
    }
    if (intent === 'level') {
      const h = (state.levelHistory || []).filter(x => x.memberId === m.id).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
      return { intent, text: `${opts.levelName || h?.levelName ? `${opts.self ? 'مستواك' : 'مستوى ' + first(m.name)} دلوقتي «${opts.levelName || h.levelName}»` : 'المستوى بيتحدد بعد أول تقييم من المدرب'}. تفاصيل المهارات والنتايج والبطاقة في صفحة التقدم.`, action: 'progress' };
    }
    if (intent === 'coach') return { intent, text: `مدرب الجروب ${g.coach || 'هيتحدد قريب'}. تقدر تبعتله رسالة من صفحة الرسائل.`, action: 'msgs' };
    if (intent === 'excuse') {
      const s = upcoming.find(x => x.rsvp?.[m.id] !== 'excused');
      return { intent, text: s ? `تحب أسجل اعتذار عن ${who} ${when(s)}؟ الاعتذار قبل الحصة بيحافظ على حقك في حصة تعويض.` : 'مفيش حصة جاية أسجل عليها اعتذار.', confirm: s ? { type: 'excuse', sessionId: s.id } : null };
    }
    return { intent: null, text: 'السؤال ده هبعته للإدارة وهيردوا عليك على واتساب في أقرب وقت.', unknown: true };
  }

  const api = { KINDS, DEFAULTS, due, recipient, waLink, day, norm, intentOf, answer };
  root.MessagesCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof window === 'undefined' || !window.V) return;
  const db = V.db;
  window.Messages = {
    ...api,
    due: () => due(db.state, new Date()),
    settings: () => ({ ...DEFAULTS, ...(db.state.settings?.automation || {}) }),
    setSetting(key, value) { db.update(st => { st.settings.automation = { ...DEFAULTS, ...(st.settings.automation || {}), [key]: value }; }); },
    log: () => (db.state.outbox || []).slice().sort((a, b) => new Date(b.at) - new Date(a.at)),
    ask(m, text) { db.update(st => { st.botInbox = st.botInbox || []; const to = recipient(st, m) || { name: m.name, phone: m.phone || '' }; st.botInbox.push({ id: 'q-' + Date.now().toString(36), memberId: m.id, name: to.name, phone: to.phone, text, status: 'open', at: new Date().toISOString() }); }); },
    inbox: () => (db.state.botInbox || []).filter(q => q.status === 'open').sort((a, b) => new Date(b.at) - new Date(a.at)),
    closeQuestion(id) { db.update(st => { const q = (st.botInbox || []).find(x => x.id === id); if (q) { q.status = 'done'; q.doneAt = new Date().toISOString(); } }); },
    mark(msg, status) {
      db.update(st => { st.outbox = st.outbox || []; if (!st.outbox.some(o => o.id === msg.id)) st.outbox.push({ id: msg.id, kind: msg.kind, memberId: msg.memberId, phone: msg.to.phone, name: msg.to.name, text: msg.text, status, channel: 'whatsapp', at: new Date().toISOString() }); });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

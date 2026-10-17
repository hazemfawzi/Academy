/* Shared sample academy, loaded by the dashboard and the apps so both show the same
   records. Runs once per saved record (sportDemoVersion) and only adds what is missing:
   players and guardians for every sport, weekly group schedules, held and upcoming
   sessions, levels, skills, assessments, a belt exam and a few payments. */
(function () {
  'use strict';
  if (!window.V || !window.SportEngine) return;
  const db = V.db, VERSION = 12;
  if ((db.state.sportDemoVersion || 0) >= VERSION) return;
  const firstRun = (db.state.sportDemoVersion || 0) < 1;

  const now = new Date();
  const dayMs = 86400000;
  const iso = d => new Date(d).toISOString();
  const daysFrom = n => new Date(now.getTime() + n * dayMs);
  const birth = age => { const d = daysFrom(-age * 365 - 40); return db.day(d); };
  const hash = text => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

  /* Weekly schedule and staff for every group. Days use JavaScript numbering (0 = Sunday). */
  const GROUPS = {
    A: { coach: 'كابتن محمود', resource: 'ملعب خماسي 1', days: [6, 1, 3], time: '07:00', ageMin: 16, ageMax: 45 },
    B: { coach: 'كابتن رامي', resource: 'ملعب خماسي 2', days: [0, 2, 4], time: '19:00', ageMin: 16, ageMax: 45 },
    C: { coach: 'كابتن محمود', resource: 'ملعب خماسي 1', days: [0, 2], time: '17:30', ageMin: 9, ageMax: 14 },
    'sport-8': { coach: 'كابتن سلمى', resource: 'حارة 2', days: [6, 1], time: '17:00', ageMin: 6, ageMax: 9 },
    'sport-9': { coach: 'سنسي وليد', resource: 'صالة الأرضيات', days: [0, 2], time: '17:00', ageMin: 7, ageMax: 13 },
    'sport-10': { coach: 'كابتن ندى', resource: 'صالة الجمباز', days: [0, 2, 4], time: '16:00', ageMin: 6, ageMax: 9 },
    'sport-11': { coach: 'كابتن كريم', resource: 'ملعب 1', days: [6, 3], time: '17:00', ageMin: 16, ageMax: 60 },
    'sport-12': { coach: 'كوتش دينا', resource: 'صالة اللياقة', days: [6, 1, 3], time: '08:00', ageMin: 18, ageMax: 60 },
    'branch-4': { coach: 'كابتن هشام', resource: 'ملعب أكتوبر 1', days: [6, 2], time: '08:00', ageMin: 16, ageMax: 45 },
    'branch-5': { coach: 'كابتن هشام', resource: 'ملعب أكتوبر 1', days: [0, 3], time: '18:00', ageMin: 10, ageMax: 15 },
    'branch-6': { coach: 'كابتن عادل', resource: 'ملعب المهندسين', days: [1, 4], time: '20:00', ageMin: 16, ageMax: 45 },
    'branch-7': { coach: 'كابتن عادل', resource: 'ملعب المهندسين', days: [6, 2], time: '16:00', ageMin: 8, ageMax: 12 }
  };

  /* name, age, guardian, guardian phone, level index, gender */
  const PLAYERS = {
    'sport-8': [['ليلى سامي', 7, 'أحمد سامي', '01011112233', 1, 'f'], ['جنى محمود', 8, 'محمود رأفت', '01022223344', 1, 'f'], ['نور هشام', 7, 'هشام فؤاد', '01223034455', 1, 'f'],
      ['تيا كريم', 8, 'كريم عادل', '01005551122', 2, 'f'], ['سارة إيهاب', 6, 'إيهاب منير', '01033334455', 0, 'f'], ['فرح عمرو', 9, 'عمرو نبيل', '01044445566', 2, 'f'],
      ['مالك حسام', 7, 'حسام الدين علي', '01055556677', 1, 'm'], ['ياسين شريف', 8, 'شريف يسري', '01066667788', 1, 'm'], ['حبيبة طارق', 6, 'طارق جمال', '01077778899', 0, 'f']],
    'sport-9': [['عمر سامي', 9, 'أحمد سامي', '01011112233', 2, 'm'], ['يوسف مجدي', 10, 'مجدي فؤاد', '01119092233', 2, 'm'], ['آدم حسن', 8, 'حسن علي', '01088889900', 1, 'm'],
      ['سليم وائل', 11, 'وائل نبيل', '01099990011', 3, 'm'], ['مريم خالد', 9, 'خالد عمر', '01100001122', 1, 'f'], ['زين طارق', 12, 'طارق سعيد', '01111112233', 4, 'm'],
      ['كنزي أيمن', 8, 'أيمن وليد', '01122223344', 0, 'f'], ['علي حسام', 10, 'حسام الدين علي', '01055556677', 2, 'm']],
    'sport-10': [['هنا سامح', 7, 'سامح عبد الله', '01133334455', 1, 'f'], ['ملك أحمد', 8, 'أحمد فاروق', '01144445566', 1, 'f'], ['جودي ياسر', 6, 'ياسر كمال', '01155556677', 0, 'f'],
      ['ريتال محمد', 9, 'محمد منير', '01166667788', 2, 'f'], ['لارا شريف', 7, 'شريف يسري', '01066667788', 1, 'f'], ['نادين عمرو', 8, 'عمرو حلمي', '01177778899', 1, 'f'],
      ['ليان مصطفى', 6, 'مصطفى شادي', '01188889900', 0, 'f']],
    'sport-11': [['مازن رضا', 28, '', '01211112233', 2, 'm'], ['يوسف حسن', 33, '', '01222223344', 1, 'm'], ['أحمد فاروق', 41, '', '01144445566', 1, 'm'],
      ['نهى سمير', 30, '', '01233334455', 2, 'f'], ['رنا خالد', 26, '', '01244445566', 0, 'f'], ['طارق زكي', 37, '', '01255556677', 3, 'm']],
    'sport-12': [['منة حسام', 27, '', '01266667788', 1, 'f'], ['سيف علاء', 31, '', '01277778899', 2, 'm'], ['عمر خليل', 29, '', '01288889900', 1, 'm'],
      ['دينا مراد', 35, '', '01299990011', 0, 'f'], ['شيماء حسن', 40, '', '01500001122', 1, 'f'], ['ياسمين فؤاد', 24, '', '01511112233', 0, 'f'], ['محمد عصام', 45, '', '01522223344', 2, 'm']]
  };

  /* Evening football roster, shared with the coach app so both pages count the same players. */
  const FOOTBALL_B = [['عمر خالد', 2, 'حارس', 3], ['خالد منير', 3, 'دفاع'], ['رامي فتحي', 3, 'دفاع'], ['وليد سمير', 4, 'وسط'], ['أمير شوقي', 3, 'هجوم'], ['شادي كمال', 5, 'هجوم'], ['مروان عزت', 2, 'وسط'],
    ['حسن عاطف', 2, 'دفاع'], ['كريم الشاذلي', 2, 'هجوم'], ['محمود ناجي', 4, 'حارس', 4], ['عمرو حلمي', 3, 'وسط'], ['أنس زكي', 3, 'دفاع'], ['معاذ صبري', 4, 'وسط'], ['جمال رأفت', 2, 'هجوم'], ['سليم مجدي', 3, 'دفاع']];

  const atTime = (date, hhmm) => { const d = new Date(date); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d; };

  function weeklyStarts(cfg, fromDay, toDay) {
    const out = [];
    for (let i = fromDay; i <= toDay; i++) {
      const d = daysFrom(i);
      if (cfg.days.includes(d.getDay())) out.push(atTime(d, cfg.time));
    }
    return out;
  }

  if (firstRun) V.run(() => db.update(s => {
    const def = id => SportEngine.get(id);
    const ids = new Set(s.members.map(m => m.id));
    s.sportProgress = s.sportProgress || [];
    s.skillMarks = s.skillMarks || {};
    s.levelHistory = s.levelHistory || [];
    s.exams = s.exams || [];

    /* Group schedule, coach and age range. */
    s.groups.forEach(g => {
      const cfg = GROUPS[g.id];
      if (!cfg) return;
      ['coach', 'resource', 'days', 'time', 'ageMin', 'ageMax'].forEach(k => { if (g[k] == null) g[k] = cfg[k]; });
    });

    /* Fill missing coach and place on existing sessions from their group. */
    s.sessions.forEach(x => {
      const g = s.groups.find(g => g.id === x.group);
      if (!g) return;
      if (!x.coach) x.coach = g.coach || '';
      if (!x.resource) x.resource = g.resource || '';
    });

    /* Evening football players. */
    if (!s.members.some(m => m.group === 'B')) {
      FOOTBALL_B.forEach(([n, lvl, pos, gk], i) => s.members.push({
        id: 'demo-coach-b-' + i, name: n, phone: '', group: 'B', plan: 'monthly', end: iso(daysFrom(8 + i)), remaining: 4 + i % 7,
        freezeBalance: 10, freezes: [], makeupCredits: 1, makeupExpiry: iso(daysFrom(30)), attendance: 70 + i % 25,
        skill: Array(5).fill(lvl), previousSkill: Array(5).fill(Math.max(1, lvl - 1)), position: pos, keeperSkill: gk || 0, notes: [], created: iso(daysFrom(-120)), demo: true
      }));
    }

    /* Players of the other sports, with guardians, levels and history. */
    Object.entries(PLAYERS).forEach(([groupId, rows]) => {
      const g = s.groups.find(x => x.id === groupId);
      if (!g) return;
      const d = def(g.sport);
      rows.forEach(([name, age, guardian, phone, lvl, gender], i) => {
        const id = 'demo-' + g.sport + '-' + i;
        if (ids.has(id)) return;
        const level = d.levels[Math.min(lvl, d.levels.length - 1)];
        const created = iso(daysFrom(-150 + i * 7));
        const end = i === rows.length - 1 ? iso(daysFrom(-2)) : iso(daysFrom(6 + (i * 5) % 24));
        s.members.push({
          id, name, phone: guardian ? '' : phone, group: groupId, plan: 'monthly', end, remaining: i === rows.length - 1 ? 0 : 3 + (i * 3) % 9,
          freezeBalance: 10, freezes: [], makeupCredits: 1, makeupExpiry: iso(daysFrom(30)), attendance: 0, skill: [3, 3, 3, 3, 3], previousSkill: [3, 3, 3, 3, 3],
          created, dob: birth(age), gender, sportLevel: level.id, medical: g.sport === 'swimming' && i === 2 ? 'حساسية من الكلور الخفيف' : '',
          guardian: guardian ? { name: guardian, phone, relation: 'والد' } : null, emergency: guardian ? { name: guardian, phone } : { name: '', phone: '' }, demo: true
        });
        ids.add(id);
        s.levelHistory.push({ id: 'demo-lh-' + id + '-0', memberId: id, sport: g.sport, levelId: d.levels[0].id, levelName: d.levels[0].name, reason: 'تقييم البداية', at: created, by: g.coach });
        if (lvl > 0) s.levelHistory.push({ id: 'demo-lh-' + id + '-1', memberId: id, sport: g.sport, levelId: level.id, levelName: level.name, reason: 'اجتاز متطلبات المستوى السابق', at: iso(daysFrom(-45 + i)), by: g.coach });
        /* Mark most skills of the current level; every third player has all of them. */
        const marks = s.skillMarks[id] = s.skillMarks[id] || {};
        (level.skills || []).forEach((sk, j) => { if (i % 3 === 0 || j < level.skills.length - 1) marks[sk.id] = { at: iso(daysFrom(-20 + j)), by: g.coach, sessionId: '' }; });
        /* Dated assessments that improve over time. */
        d.metrics.slice(0, 2).forEach((mt, k) => {
          [-42, -28, -14, -3].forEach((offset, step) => {
            const seed = hash(id + mt.id);
            let value;
            if (mt.kind === 'time') value = Math.round(((mt.name.includes('50') ? 62 : 33) - lvl * 2.2 - step * 0.9 + (seed % 20) / 10) * 10) / 10;
            else if (mt.kind === 'score') value = Math.min(100, 55 + lvl * 5 + step * 6 + seed % 10);
            else if (mt.kind === 'number') value = 30 + lvl * 15 + step * 5 + seed % 10;
            else value = Math.min(5, 2 + Math.floor((lvl + step + seed % 2) / 2));
            s.sportProgress.push({ id: `demo-pr-${id}-${k}-${step}`, memberId: id, sport: g.sport, metricId: mt.id, kind: mt.kind, label: mt.name, value, unit: mt.unit, note: step === 3 ? 'تحسن واضح في التكنيك' : '', sessionId: '', at: iso(daysFrom(offset)), demo: true });
          });
        });
      });
    });

    /* Held and upcoming sessions for every non-football group (football keeps its own). */
    Object.keys(PLAYERS).forEach(groupId => {
      const g = s.groups.find(x => x.id === groupId), cfg = GROUPS[groupId];
      if (!g || s.sessions.some(x => x.group === groupId)) return;
      const roster = s.members.filter(m => m.group === groupId);
      weeklyStarts(cfg, -42, -1).forEach((start, k) => {
        const present = Object.fromEntries(roster.filter((m, i) => (hash(m.id + k) % 10) < 8 || i % 4 === 0).map(m => [m.id, true]));
        s.sessions.push({ id: `demo-${groupId}-past-${k}`, group: groupId, start: iso(start), duration: def(g.sport).duration, status: 'ended', rsvp: {}, arrived: {}, present, teams: null, record: null, history: [], coach: cfg.coach, resource: cfg.resource, demo: true });
      });
      weeklyStarts(cfg, 0, 14).forEach((start, k) => {
        s.sessions.push({ id: `demo-${groupId}-next-${k}`, group: groupId, start: iso(start), duration: def(g.sport).duration, status: 'scheduled', rsvp: k === 0 ? Object.fromEntries(roster.slice(0, 5).map(m => [m.id, 'confirmed'])) : {}, arrived: {}, present: {}, teams: null, record: null, history: [], coach: cfg.coach, resource: cfg.resource, demo: true });
      });
    });

    /* Attendance rate stored on the player for older screens. */
    s.members.filter(m => m.demo && m.sportLevel).forEach(m => {
      const held = s.sessions.filter(x => x.group === m.group && x.status === 'ended');
      m.attendance = held.length ? Math.round(held.filter(x => x.present[m.id]).length / held.length * 100) : 0;
    });

    /* Belt exam in ten days with the karate players who are ready. */
    if (!s.exams.some(e => e.sport === 'karate')) {
      const d = def('karate'), roster = s.members.filter(m => m.group === 'sport-9');
      s.exams.push({
        id: 'demo-exam-karate', sport: 'karate', date: db.day(daysFrom(10)), time: '11:00', place: 'صالة الأرضيات · أكتوبر', examiner: 'سنسي وليد', status: 'scheduled', demo: true,
        candidates: roster.filter((m, i) => i % 3 === 0).map(m => { const i = d.levels.findIndex(l => l.id === m.sportLevel); return { memberId: m.id, levelId: d.levels[Math.min(i + 1, d.levels.length - 1)].id, result: null, score: null }; })
      });
    }

    /* A few payments in other sports so their dashboards show real money. */
    const pay = (memberId, amount, method, plan, minutesAgo, total) => {
      if (s.transactions.some(t => t.id === 'demo-sport-tx-' + memberId)) return;
      const inv = { id: 'demo-sport-inv-' + memberId, memberId, plan, planLabel: 'شهري', subtotal: total, discount: 0, total, paid: amount, activated: amount >= total, created: iso(now.getTime() - minutesAgo * 60000), demo: true };
      s.invoices.unshift(inv);
      s.transactions.unshift({ id: 'demo-sport-tx-' + memberId, memberId, plan, method, reference: method === 'كاش' ? '' : String(40000000 + hash(memberId) % 9999999), amount, kind: 'payment', at: inv.created, invoiceId: inv.id, demo: true });
    };
    pay('demo-swimming-3', 1100, 'إنستاباي', 'monthly', 50, 1100);
    pay('demo-karate-1', 850, 'كاش', 'monthly', 120, 850);
    pay('demo-padel-4', 700, 'فودافون كاش', 'monthly', 200, 1400);
    pay('demo-fitness-0', 700, 'كاش', 'monthly', 30, 700);

    s.sportDemoVersion = 1;
  }));

  /* Version 2: the preview member is also the father of two players, so the parent app
     has a real family to switch between. */
  V.run(() => db.update(s => {
    const me = s.members.find(m => m.id === 'm0');
    if (me && !me.phone && !s.members.some(m => m.phone === '01011112233')) { me.phone = '01011112233'; me.dob = me.dob || birth(34); }
    /* Each demo player follows the program that fits their age. */
    const ageOf = dob => Math.floor((now - new Date(dob + 'T12:00:00')) / (365.25 * dayMs));
    s.members.forEach(m => {
      const g = s.groups.find(x => x.id === m.group), d = g && SportEngine.get(g.sport);
      if (!d || m.programId) return;
      const age = m.dob ? ageOf(m.dob) : 25;
      m.programId = (d.programs.find(p => age >= p.ageMin && age <= p.ageMax) || d.programs[d.programs.length - 1]).id;
    });
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 2);
  }));

  /* Version 3: two or three coach ratings per player so player cards start filled, and
     one certificate of excellence this month. */
  if ((db.state.sportDemoVersion || 0) < 3 && window.PlayerCardCore) V.run(() => db.update(s => {
    s.cardRatings = s.cardRatings || {};
    s.members.forEach((m, i) => {
      const g = s.groups.find(x => x.id === m.group), d = g && SportEngine.get(g.sport);
      if (!d || s.cardRatings[m.id] || (d.id === 'football' && !m.demo && i % 2)) return;
      const names = PlayerCardCore.attrsFor(d.type), seed = hash(m.id), rounds = 2 + seed % 2;
      s.cardRatings[m.id] = Array.from({ length: rounds }, (_, r) => ({
        id: `demo-rating-${m.id}-${r}`, at: iso(daysFrom(-28 + r * 12)), by: g.coach || '', sessionId: '',
        values: Object.fromEntries(names.map((n, k) => [n, Math.max(1, Math.min(5, 2 + ((seed >>> (k * 3)) % 3) + (r ? 1 : 0) * ((seed >>> k) % 2)))])),
        note: r === rounds - 1 ? ['تحسن واضح في التركيز', 'مجهود ممتاز النهارده', 'محتاج يشتغل على التحمل', 'روح جميلة مع زمايله'][seed % 4] : ''
      }));
    });
    const laila = s.members.find(m => m.name === 'ليلى سامي');
    s.certificates = s.certificates || [];
    if (laila && !s.certificates.length) s.certificates.push({ id: 'demo-cert-1', memberId: laila.id, month: 'شهر ' + new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' }).format(now), reason: 'التزام كامل بالحضور', by: 'كابتن سلمى', at: iso(daysFrom(-1)) });
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 3);
  }));

  /* Version 4: branch addresses for the assistant, a holiday next week, one question the
     assistant passed to the desk and two messages already sent. */
  if ((db.state.sportDemoVersion || 0) < 4) V.run(() => db.update(s => {
    const addresses = ['شارع 26 يوليو، بجوار مول العرب', 'التجمع الخامس، شارع التسعين الجنوبي', 'مدينة نصر، شارع عباس العقاد', 'المعادي، شارع 9'];
    s.settings.branchInfo = s.settings.branchInfo || Object.fromEntries([...new Set(s.groups.map(g => g.branch).filter(Boolean))].map((b, i) => [b, { address: addresses[i % addresses.length], hours: 'يوميًا من 3 العصر لـ 10 بالليل', map: '' }]));
    const off = new Date(daysFrom(5)), key = `${off.getFullYear()}-${String(off.getMonth() + 1).padStart(2, '0')}-${String(off.getDate()).padStart(2, '0')}`;
    s.holidays = s.holidays || [];
    if (!s.holidays.length) {
      s.holidays.push({ date: key, name: 'إجازة منتصف الترم' });
      s.sessions.forEach(x => { if (x.status === 'scheduled' && db.day(x.start) === key) { x.status = 'cancelled'; x.scheduleReason = 'إجازة: إجازة منتصف الترم'; } });
    }
    const kid = s.members.find(m => m.guardian) || s.members[1];
    s.botInbox = s.botInbox || [];
    if (kid && !s.botInbox.length) s.botInbox.push({ id: 'demo-q-1', memberId: kid.id, name: kid.guardian?.name || kid.name, phone: kid.guardian?.phone || kid.phone || '', text: 'هل فيه باص بيوصل من المعادي؟', status: 'open', at: iso(daysFrom(-0.1)) });
    s.outbox = s.outbox || [];
    if (!s.outbox.length) s.members.slice(2, 4).forEach((m, i) => s.outbox.push({ id: `demo-sent-${m.id}`, kind: i ? 'absence' : 'renewal', memberId: m.id, phone: m.phone || '', name: m.name, text: '', status: 'sent', channel: 'whatsapp', at: iso(daysFrom(-1 - i)) }));
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 4);
  }));

  /* Version 5: one renewal waiting for review with a transfer screenshot attached. */
  if ((db.state.sportDemoVersion || 0) < 5) V.run(() => db.update(s => {
    const kid = s.members.find(m => m.name === 'عمر سامي') || s.members.find(m => m.guardian);
    const g = kid && s.groups.find(x => x.id === kid.group), d = g && SportEngine.get(g.sport), p = d && (d.programs.find(x => x.id === kid.programId) || d.programs[0]);
    if (p && !s.requests.some(r => r.memberId === kid.id && r.type === 'payment' && r.status === 'pending')) {
      const amount = Math.round(p.price * 0.9), when = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(daysFrom(-0.05));
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="560" viewBox="0 0 360 560" font-family="Arial"><rect width="360" height="560" fill="#f4f6f8"/><rect x="20" y="24" width="320" height="512" rx="22" fill="#fff"/><circle cx="180" cy="104" r="36" fill="#e3f4ea"/><path d="M163 104l12 12 24-26" stroke="#1f8a4c" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="180" y="176" text-anchor="middle" font-size="20" font-weight="700" fill="#1d2b24">تم التحويل بنجاح</text><text x="180" y="226" text-anchor="middle" font-size="34" font-weight="700" fill="#1d2b24">${amount} EGP</text><g font-size="14" fill="#6b7a72"><text x="316" y="286" text-anchor="end">إلى</text><text x="316" y="336" text-anchor="end">من</text><text x="316" y="386" text-anchor="end">رقم العملية</text><text x="316" y="436" text-anchor="end">التاريخ</text></g><g font-size="15" font-weight="700" fill="#1d2b24"><text x="44" y="286">academy@bank</text><text x="44" y="336">${kid.guardian?.phone || '01011112233'}</text><text x="44" y="386">TX884213907</text></g><text x="44" y="436" font-size="13" font-weight="700" fill="#1d2b24">${when}</text><text x="180" y="506" text-anchor="middle" font-size="11" fill="#9aa59f">صورة توضيحية لبيانات العرض</text></svg>`;
      s.requests.unshift({ id: 'demo-req-receipt', memberId: kid.id, type: 'payment', status: 'pending', created: iso(daysFrom(-0.05)), payload: { plan: 'monthly', method: 'إنستاباي', reference: '', receipt: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), discount: 10, charge: { label: `${d.name} · ${p.name}`, price: p.price, sessions: p.sessions, days: 30, programId: p.id } } });
    }
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 5);
  }));

  /* Version 6: pay terms for every coach, last month already paid, one bonus this month. */
  if ((db.state.sportDemoVersion || 0) < 6) V.run(() => db.update(s => {
    const terms = { 'كابتن محمود': { mode: 'fixed', base: 6000 }, 'كابتن سلمى': { mode: 'session', perSession: 300 }, 'سنسي وليد': { mode: 'percent', percent: 40 }, 'كابتن ندى': { mode: 'session', perSession: 280 }, 'كابتن كريم': { mode: 'percent', percent: 35 }, 'كوتش دينا': { mode: 'mixed', base: 2000, perSession: 150 }, 'كابتن رامي': { mode: 'session', perSession: 250 }, 'كابتن هشام': { mode: 'session', perSession: 250 } };
    s.settings.payroll = s.settings.payroll || Object.fromEntries(Object.entries(terms).map(([k, t]) => [k, { base: 0, perSession: 0, percent: 0, ...t }]));
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 15), month = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
    s.payrollRuns = s.payrollRuns || [];
    if (!s.payrollRuns.length && window.PayrollCore) PayrollCore.coaches(s).forEach((c, i) => { const st = PayrollCore.statement(s, c, month); if (st.terms && st.sessions.length) s.payrollRuns.push({ id: 'demo-pay-' + i, coach: c, month, total: st.total, sessions: st.sessions.length, method: i % 2 ? 'إنستاباي' : 'تحويل بنكي', at: iso(new Date(now.getFullYear(), now.getMonth(), 2, 13)) }); });
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    s.payrollAdjust = s.payrollAdjust || [];
    if (!s.payrollAdjust.length) s.payrollAdjust.push({ id: 'demo-adj-1', coach: 'كابتن سلمى', month: cur, amount: 300, note: 'حصة تقييم إضافية للمستوى 2', at: iso(daysFrom(-2)) });
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 6);
  }));

  /* Version 7: football players get a level so the levels screen and training plans
     have a starting point (most beginners, some intermediate, a few advanced). */
  if ((db.state.sportDemoVersion || 0) < 7) V.run(() => db.update(s => {
    const d = SportEngine.get('football'), levels = (d?.levels || []).filter(l => l.active !== false);
    if (levels.length) s.members.forEach(m => {
      const g = s.groups.find(x => x.id === m.group);
      if (g?.sport !== 'football' || m.sportLevel) return;
      const r = hash(m.id) % 10, i = Math.min(levels.length - 1, r < 6 ? 0 : r < 9 ? 1 : 2);
      m.sportLevel = levels[i].id;
      s.levelHistory = s.levelHistory || [];
      s.levelHistory.push({ id: 'demo-fl-' + m.id, memberId: m.id, sport: 'football', levelId: levels[i].id, levelName: levels[i].name, reason: 'تحديد المستوى في البداية', at: iso(daysFrom(-60)) });
    });
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 7);
  }));

  /* Version 8: the football pathway — five age-group squads by birth year with players,
     positions, assessments every eight weeks and individual development plans. The
     existing football groups become the football school. */
  if ((db.state.sportDemoVersion || 0) < 8 && window.FootballCore) V.run(() => db.update(s => {
    const FC = window.FootballCore, H = t => hash('fb' + t);
    s.groups.filter(g => g.sport === 'football' && !g.fb).forEach(g => { g.fb = { tier: 'school' }; });
    const SQUADS = [
      { id: 'fb-u10', by: 2017, coach: 'كابتن هاني', branch: 'الشيخ زايد', resource: 'ملعب 7 ضد 7', days: [0, 2, 4], time: '16:00', n: 10 },
      { id: 'fb-u12', by: 2015, coach: 'كابتن طارق', branch: 'الشيخ زايد', resource: 'ملعب 7 ضد 7', days: [6, 1, 3], time: '16:30', n: 12 },
      { id: 'fb-u14', by: 2013, coach: 'كابتن عمرو', branch: 'أكتوبر', resource: 'الملعب القانوني', days: [0, 2, 4], time: '17:30', n: 13 },
      { id: 'fb-u16', by: 2011, coach: 'كابتن شريف', branch: 'الشيخ زايد', resource: 'الملعب القانوني', days: [6, 1, 3], time: '18:30', n: 13 },
      { id: 'fb-u18', by: 2009, coach: 'كابتن نادر', branch: 'أكتوبر', resource: 'الملعب القانوني', days: [6, 1, 3, 4], time: '19:30', n: 12 }
    ];
    const FIRST = ['يوسف', 'عمر', 'آدم', 'مالك', 'زياد', 'سيف', 'حمزة', 'علي', 'مروان', 'كريم', 'ياسين', 'أنس', 'بلال', 'تميم', 'عبدالله', 'مازن', 'هشام', 'فارس', 'نور', 'إياد', 'جاسر', 'رامي', 'مهند', 'سليم', 'معاذ', 'أدهم', 'قاسم', 'شهاب', 'حازم', 'وليد'];
    const FATHER = ['محمد', 'أحمد', 'محمود', 'خالد', 'طارق', 'حسن', 'إبراهيم', 'مصطفى', 'عادل', 'سامح', 'وائل', 'عماد', 'هاني', 'شريف', 'ياسر', 'أشرف', 'جمال', 'رضا', 'ماجد', 'نبيل'];
    const SHAPE = ['GK', 'CB', 'FB', 'FB', 'DM', 'CM', 'AM', 'W', 'W', 'ST', 'CB', 'GK', 'CM'];
    const NUM = { GK: [1, 23], CB: [4, 5], FB: [2, 3], DM: [6], CM: [8, 16], AM: [10], W: [7, 11], ST: [9, 19] };
    const GOALS = {
      technical: [['الاستلام بالقدم البعيدة والالتفاف للأمام', '8 من 10 في تمرين الاستلام تحت الضغط'], ['التمرير بالقدم الضعيفة', '20 تمريرة صحيحة متتالية من 10 متر'], ['التسديد في الزوايا', '6 من 10 أهداف في تمرين الإنهاء']],
      tactical: [['التمركز وقت فقدان الكورة', 'المدرب يقيّمها 4 من 5 في الماتشات'], ['التحرك لاستلام الكورة بين الخطوط', 'مرتين في كل شوط على الأقل'], ['الضغط المنظم مع الزملاء', 'استخلاص الكورة خلال 6 ثواني']],
      physical: [['تحسين زمن 30 متر', 'أقل من 4.9 ثانية'], ['الرشاقة وتغيير الاتجاه', 'تحسن 0.3 ثانية في اختبار T'], ['التحمل', 'مستوى 15 في اختبار Yo-Yo']],
      psychosocial: [['التواصل مع الزملاء في الملعب', 'المدرب يقيّمها 4 من 5'], ['الثقة بعد الغلط', 'يكمل الماتش بنفس التركيز بعد أي غلطة'], ['الالتزام بالمواعيد', 'حضور 95% بدون تأخير']]
    };
    const GK_GOALS = [['الخروج للكرات العرضية', '7 من 10 كرات عرضية في التمرين'], ['التوزيع السريع بالإيد', 'بدء الهجمة خلال 4 ثواني']];
    const iso2 = d => new Date(d).toISOString().slice(0, 10);
    let k = 0;
    SQUADS.forEach((q, si) => {
      if (s.groups.some(g => g.id === q.id)) return;
      const u = FC.uOf(q.by, now);
      s.groups.push({ id: q.id, name: FC.squadName(q.by, now), sport: 'football', branch: q.branch, coach: q.coach, resource: q.resource, capacity: 22, days: q.days, time: q.time, ageMin: u - 1, ageMax: u, fb: { tier: 'pathway', birthYear: q.by } });
      for (let i = 0; i < q.n; i++, k++) {
        const h = H(q.id + i), pos = SHAPE[i % SHAPE.length], r = h % 100;
        const skew = q.id === 'fb-u14' ? [50, 78, 93] : [33, 60, 84];
        const month = (r < skew[0] ? 1 : r < skew[1] ? 4 : r < skew[2] ? 7 : 10) + (h >>> 7) % 3;
        const first = FIRST[(k * 7 + si) % FIRST.length], father = FATHER[(k * 3 + i) % FATHER.length];
        const id = `fb-p-${q.id}-${i}`;
        s.members.push({ id, name: `${first} ${father}`, phone: '', group: q.id, plan: 'monthly', end: iso(daysFrom(18 + h % 20)), remaining: 6 + h % 6, freezeBalance: 10, freezes: [], makeupCredits: 0, makeupExpiry: iso(daysFrom(30)), attendance: 84 + h % 15, created: iso(daysFrom(-200 - h % 300)), dob: `${q.by}-${String(month).padStart(2, '0')}-${String(1 + (h >>> 3) % 28).padStart(2, '0')}`, gender: 'm', medical: h % 17 === 0 ? 'ربو خفيف — البخاخ مع المدرب' : '', guardian: { name: `${father} ${FATHER[(h >>> 5) % FATHER.length]}`, phone: '010' + String(10000000 + h % 89999999).padStart(8, '0'), relation: 'والد' }, demo: true,
          fb: { track: 'pathway', position: pos, foot: h % 5 === 0 ? 'شمال' : h % 11 === 0 ? 'الاتنين' : 'يمين', number: (NUM[pos][i % NUM[pos].length]) + (i >= SHAPE.length ? 10 : 0), funding: FC.FUNDING[h % 10 < 3 ? 0 : h % 10 < 6 ? 1 : 2], registration: 'EFA-' + (q.by % 100) + String(1000 + h % 9000), joined: iso2(daysFrom(-200 - h % 600)) } });
        /* Three assessments eight weeks apart; one in five players is due for the next. */
        const base = 2.1 + (u - 10) * 0.12 + (h % 7) / 10, rounds = h % 5 === 0 ? 2 : 3;
        s.fbAssessments = s.fbAssessments || [];
        for (let rd = 0; rd < rounds; rd++) {
          const at = daysFrom(-(rounds === 2 ? 64 : 8) - (rounds - 1 - rd) * 56 - h % 5);
          const scores = Object.fromEntries(Object.keys(FC.CORNERS).map((c, ci) => [c, FC.itemsOf(c, pos).map((_, ii) => Math.max(1, Math.min(5, Math.round(base + rd * 0.35 + (((h >>> (ci * 3 + ii)) % 5) - 2) * 0.35 + (c === 'physical' && pos === 'W' ? 0.5 : 0)))))]));
          s.fbAssessments.push({ id: `fba-${id}-${rd}`, memberId: id, at: iso(at), by: q.coach, scores, note: rd === rounds - 1 ? ['تطور واضح في قراءة اللعب', 'محتاج يشتغل على القدم الضعيفة', 'قائد في الملعب ومحبوب من زمايله', 'أداء ثابت، يحتاج ثقة أكتر في المواجهات'][h % 4] : '', strengths: '', focus: '' });
        }
        /* Development plan: goals in the two weakest corners. */
        const last = FC.cornerScores(s.fbAssessments.filter(a => a.memberId === id).slice(-1)[0]);
        const weak = Object.keys(FC.CORNERS).sort((a, b) => last[a] - last[b]).slice(0, 2);
        s.fbIdp = s.fbIdp || {};
        const goals = weak.map((c, gi) => { const pool = pos === 'GK' && c === 'technical' ? GK_GOALS : GOALS[c], g = pool[(h >>> gi) % pool.length]; return { id: `goal-${id}-${gi}`, corner: c, text: g[0], measure: g[1], due: iso2(daysFrom(30 + gi * 20)), status: 'active', progress: 20 + (h >>> (gi + 2)) % 60, createdAt: iso(daysFrom(-56)) }; });
        const done = GOALS[Object.keys(GOALS).find(c => !weak.includes(c))][h % 3];
        goals.push({ id: `goal-${id}-done`, corner: Object.keys(GOALS).find(c => !weak.includes(c)), text: done[0], measure: done[1], due: iso2(daysFrom(-20)), status: 'achieved', progress: 100, createdAt: iso(daysFrom(-112)) });
        s.fbIdp[id] = { goals, reviews: [{ at: iso(daysFrom(-50 - h % 6)), withParent: h % 3 !== 0, note: 'اتفقنا على أهداف الفترة دي مع ولي الأمر', by: q.coach }] };
      }
    });
    /* One pathway player in the demo parent's family, so the parent app shows the plan. */
    if (!s.members.some(m => m.id === 'fb-p-youssef')) {
      const pos = 'AM', id = 'fb-p-youssef';
      s.members.push({ id, name: 'يوسف أحمد سامي', phone: '', group: 'fb-u14', plan: 'monthly', end: iso(daysFrom(26)), remaining: 9, freezeBalance: 10, freezes: [], makeupCredits: 0, makeupExpiry: iso(daysFrom(30)), attendance: 96, created: iso(daysFrom(-400)), dob: '2013-11-04', gender: 'm', medical: '', guardian: { name: 'أحمد سامي', phone: '01011112233', relation: 'والد' }, emergency: { name: 'أحمد سامي', phone: '01011112233' }, demo: true, fb: { track: 'pathway', position: pos, foot: 'شمال', number: 10, funding: 'منحة جزئية', registration: 'EFA-131874', joined: '2025-08-20' } });
      [[3, 3, 2, 3, 2], [3, 4, 3, 4, 3]].forEach((t, rd) => s.fbAssessments.push({ id: `fba-${id}-${rd}`, memberId: id, at: iso(daysFrom(-62 + rd * 56)), by: 'كابتن عمرو', scores: { technical: t, tactical: [3, 3 + rd, 3, 3], physical: [2, 3, 2 + rd, 3], psychosocial: [4, 3 + rd, 4, 4] }, note: rd ? 'رؤية ممتازة للملعب؛ محتاج قوة بدنية أكتر في الالتحامات' : '', strengths: rd ? 'الرؤية والتمريرة الأخيرة' : '', focus: rd ? 'القوة البدنية والقدم اليمين' : '' }));
      s.fbIdp[id] = { goals: [
        { id: 'goal-y-1', corner: 'physical', text: 'القوة في الالتحامات', measure: 'يكسب 50% من الالتحامات في الماتشات', due: iso2(daysFrom(40)), status: 'active', progress: 35, createdAt: iso(daysFrom(-6)) },
        { id: 'goal-y-2', corner: 'technical', text: 'التمرير بالقدم اليمين', measure: '20 تمريرة صحيحة متتالية من 10 متر', due: iso2(daysFrom(55)), status: 'active', progress: 50, createdAt: iso(daysFrom(-6)) },
        { id: 'goal-y-3', corner: 'tactical', text: 'التحرك لاستلام الكورة بين الخطوط', measure: 'مرتين في كل شوط', due: iso2(daysFrom(-10)), status: 'achieved', progress: 100, createdAt: iso(daysFrom(-62)) }
      ], reviews: [{ at: iso(daysFrom(-6)), withParent: true, note: 'مراجعة الخطة مع الوالد بعد تقييم أكتوبر', by: 'كابتن عمرو' }] };
    }
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 8);
  }));

  /* Version 9: football school groups are named as school groups, never as "جروب". */
  if ((db.state.sportDemoVersion || 0) < 9) V.run(() => db.update(s => {
    s.groups.filter(g => g.sport === 'football' && g.fb?.tier === 'school').forEach(g => { g.name = g.name.replace(/^جروب\s+/, 'مدرسة الكرة · '); });
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 9);
  }));

  /* Version 10: three measuring sessions for every pathway player — tests improving with
     age and training, heights following a growth curve (some in their growth spurt), and
     the parents' heights for the expected adult height. */
  if ((db.state.sportDemoVersion || 0) < 10 && window.FootballCore) V.run(() => db.update(s => {
    const FC = window.FootballCore, H = t => hash('ph' + t), r2 = v => Math.round(v * 100) / 100, r1 = v => Math.round(v * 10) / 10;
    const meanH = a => a < 9 ? 128 + (a - 8) * 5 : a < 12 ? 133 + (a - 9) * 5.2 : a < 15 ? 148.6 + (a - 12) * 6.6 : Math.min(176, 168.4 + (a - 15) * 2.8);
    s.fbTests = s.fbTests || [];
    if (s.fbTests.length) { s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 10); return; }
    s.members.filter(m => FC.isPathway(s, m) && m.dob).forEach(m => {
      const h = H(m.id), talent = ((h % 9) - 4) / 10, father = 168 + h % 17, mother = 154 + (h >>> 4) % 15;
      m.fb.parents = m.fb.parents || { father, mother };
      const ageNow = FC.ageYears(m.dob, now), early = h % 4 === 0, velocity = ageNow >= 12.5 && ageNow <= 14.8 && (h % 3 === 0 || m.id === 'fb-p-youssef') ? 8.5 + (h % 3) / 2 : 5 + (h % 4) / 2;
      const hNow = meanH(ageNow) + ((father + mother) / 2 - 168) * 0.5 + (early ? 4 : 0);
      [-150, -75, -7].forEach((off, k) => {
        const at = daysFrom(off - h % 4), age = FC.ageYears(m.dob, at), height = r1(hNow - velocity * ((-off) / 365.25)), bmi = 16.4 + (age - 9) * 0.38 + (h % 5) / 5, x0 = age - 9 + k * 0.15 + talent * 3, x = t => x0 + (((h >>> (t * 3)) % 7) - 3) * 0.35;
        s.fbTests.push({ id: `fbt-${m.id}-${k}`, memberId: m.id, at: iso(at), by: s.groups.find(g => g.id === m.group)?.coach || '', height, weight: r1(bmi * (height / 100) ** 2), sitting: r1(height * (0.515 + (early ? 0.008 : 0))),
          values: { sprint10: r2(Math.max(1.6, 2.32 - x(1) * 0.065)), sprint30: r2(Math.max(4, 5.55 - x(2) * 0.19)), agility: r2(Math.max(4.3, 6.05 - x(3) * 0.16)), jump: Math.round(Math.min(70, 22 + x(4) * 3.1)), yoyo: Math.round(Math.max(120, 320 + x(5) * 130) / 40) * 40 } });
      });
    });
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 10);
  }));

  /* Version 11: official matches against other academies (six played, two coming) with
     line-ups and minutes, five weeks of session effort, and a few injuries. */
  if ((db.state.sportDemoVersion || 0) < 11 && window.FootballCore) V.run(() => db.update(s => {
    const FC = window.FootballCore, H = t => hash('mt' + t);
    if ((s.fbMatches || []).length) { s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 11); return; }
    const OPP = ['أكاديمية الشروق', 'نادي النصر الرياضي', 'أكاديمية النجوم', 'نادي الصفوة', 'أكاديمية المستقبل', 'نادي الرواد', 'أكاديمية الأبطال', 'نادي الجزيرة الرياضي'];
    s.fbMatches = []; s.fbLoad = []; s.fbInjuries = [];
    FC.squads(s).forEach((g, gi) => {
      const players = s.members.filter(m => m.group === g.id), f = FC.matchFormat(FC.uOf(g.fb.birthYear, now));
      const bench = new Set(players.filter((p, i) => H(p.id) % 6 === 0 && p.fb?.position !== 'GK').slice(0, 2).map(p => p.id));
      for (let k = -6; k <= 1; k++) {
        if (k === 0) continue;
        const at = daysFrom(k * 7 - ((now.getDay() + 2) % 7) + 6); at.setHours(10 + (gi % 3), 0, 0, 0);
        const h = H(g.id + k), x = { id: `fbm-${g.id}-${k}`, squadId: g.id, opponent: OPP[(gi * 3 + k + 8) % OPP.length], competition: k % 3 === 0 ? 'ودية' : 'دوري المنطقة', home: h % 2 === 0, venue: h % 2 === 0 ? g.resource : '', at: iso(at), format: f, status: 'scheduled', score: null, lineup: [] };
        if (k < 0) {
          const pool = players.slice().sort((a, b) => (bench.has(a.id) - bench.has(b.id)) || (H(a.id + k) % 13) - (H(b.id + k) % 13));
          const gk = pool.find(p => p.fb?.position === 'GK'), starters = [gk, ...pool.filter(p => p !== gk)].filter(Boolean).slice(0, f.players), subs = pool.filter(p => !starters.includes(p) && !bench.has(p.id)).slice(0, 4);
          const us = h % 4, them = (h >>> 3) % 3;
          x.lineup = [...starters.map((p, i) => ({ memberId: p.id, start: true, position: p.fb?.position || '', minutes: i > f.players - 4 && subs.length ? f.minutes - 15 - (h % 10) : f.minutes, goals: 0, assists: 0, rating: 5 + (H(p.id + k) % 5) })),
            ...subs.map(p => ({ memberId: p.id, start: false, position: p.fb?.position || '', minutes: 10 + (H(p.id + k) % 20), goals: 0, assists: 0, rating: 5 + (H(p.id + k) % 4) }))];
          for (let gl = 0; gl < us; gl++) { const sc = x.lineup.filter(l => ['ST', 'W', 'AM', 'CM'].includes(l.position)); const who = sc[(h >>> gl) % (sc.length || 1)] || x.lineup[0]; who.goals++; const ast = x.lineup.filter(l => l !== who)[(h >>> (gl + 4)) % (x.lineup.length - 1)]; if (ast && gl % 2 === 0) ast.assists++; }
          x.status = 'played'; x.score = { us, them };
        }
        s.fbMatches.push(x);
      }
      /* Session effort for five weeks on the squad's training days; a few players had a
         sudden jump this week. */
      players.forEach(p => {
        const h = H(p.id), spike = h % 9 === 0;
        for (let d = 35; d >= 1; d--) {
          const day = daysFrom(-d); if (!g.days.includes(day.getDay())) continue;
          const rpe = Math.max(2, Math.min(10, 5 + (H(p.id + d) % 4) - 1 + (spike && d <= 7 ? 3 : 0)));
          s.fbLoad.push({ id: `fbl-${p.id}-${d}`, memberId: p.id, at: iso(day), rpe, minutes: spike && d <= 7 ? 110 : 90, kind: 'تمرين', load: rpe * (spike && d <= 7 ? 110 : 90) });
        }
      });
      const hurt = players.filter(p => H(p.id) % 11 === 5).slice(0, 1);
      hurt.forEach((p, i) => s.fbInjuries.push({ id: `fbi-${p.id}`, memberId: p.id, at: iso(daysFrom(-9 - gi)), part: ['الكاحل الشمال', 'العضلة الخلفية', 'الركبة اليمين'][gi % 3], kind: ['التواء درجة أولى', 'شد عضلي', 'التهاب أوتار (أوسجود)'][gi % 3], expected: iso(daysFrom(6 + gi)).slice(0, 10), status: gi % 2 ? 'rehab' : 'active', note: '' }));
    });
    s.sportDemoVersion = Math.max(s.sportDemoVersion || 0, 11);
  }));

  /* Version 12: scouting — candidates spotted, invited, on trial, offered and decided, and
     two football school players nominated by their coaches. */
  if ((db.state.sportDemoVersion || 0) < 12 && window.FootballCore) V.run(() => db.update(s => {
    const FC = window.FootballCore;
    if ((s.fbScouting || []).length) { s.sportDemoVersion = VERSION; return; }
    s.fbScouting = [];
    const y = FC.season(now).end, at = d => ({ now: daysFrom(d) }), branch = FC.squads(s)[0]?.branch || '';
    const add = (d, input, steps) => { const c = FC.addCandidate(s, { branch, phone: '010' + String(10000000 + hash(input.name) % 89999999).padStart(8, '0'), ...input }, { ...at(d), id: 'fbc-' + hash(input.name).toString(36), by: 'الكشاف' }); steps.forEach(([k, v, dd]) => FC.move(s, c.id, k, v, { ...at(dd), by: 'الإدارة الفنية' })); return c; };
    const trialAt = d => { const t = daysFrom(d); t.setHours(17, 0, 0, 0); return t.toISOString(); };
    add(-40, { name: 'آدم شريف', dob: `${y - 12}-02-11`, position: 'ST', source: 'كشاف', club: 'مركز شباب الحي', guardian: 'شريف سامح', note: 'بيسجل كتير في دوري المدارس' }, [['invited', { at: trialAt(-30) }, -35], ['trial', { scores: { technical: 4, tactical: 4, physical: 5, psychosocial: 4 }, sessions: 2 }, -28], ['offer', { funding: 'منحة جزئية', pct: 50 }, -25], ['joined', {}, -20]]);
    add(-30, { name: 'مالك حسام', dob: `${y - 14}-09-03`, position: 'CB', source: 'يوم اختبار مفتوح', guardian: 'حسام علي', note: 'طويل وقوي في الكرات العالية' }, [['invited', { at: trialAt(-21) }, -27], ['trial', { scores: { technical: 2, tactical: 3, physical: 4, psychosocial: 3 }, sessions: 2 }, -20], ['rejected', { note: 'المستوى الفني محتاج شغل؛ ننصح بمدرسة الكرة سنة ونعيد التقييم' }, -18]]);
    add(-12, { name: 'عمر الشناوي', dob: `${y - 10}-05-20`, position: 'GK', source: 'توصية مدرب', club: 'أكاديمية النجوم', guardian: 'أحمد الشناوي', note: 'رد فعل سريع وشجاع' }, [['invited', { at: trialAt(-5) }, -10], ['trial', { scores: { technical: 4, tactical: 3, physical: 4, psychosocial: 5 }, sessions: 2 }, -3], ['offer', { funding: 'منحة كاملة' }, -1]]);
    add(-8, { name: 'زين ياسر', dob: `${y - 16}-01-15`, position: 'W', source: 'كشاف', club: 'نادي الرواد', guardian: 'ياسر كمال', note: 'سرعة عالية في المساحات' }, [['invited', { at: trialAt(-2) }, -6], ['trial', { scores: { technical: 4, tactical: 3, physical: 5, psychosocial: 3 }, sessions: 1 }, -1]]);
    add(-6, { name: 'يحيى منصور', dob: `${y - 12}-10-28`, position: 'CM', source: 'تقديم ولي أمر', guardian: 'منصور فتحي', note: 'مواليد آخر السنة، ذكي في التمرير' }, [['invited', { at: trialAt(3) }, -4]]);
    add(-3, { name: 'سليم عادل', dob: `${y - 14}-04-07`, position: 'AM', source: 'تقديم ولي أمر', guardian: 'عادل رمزي', note: 'لاعب في نادي الحي' }, [['invited', { at: trialAt(5) }, -2]]);
    add(-2, { name: 'مازن رفعت', dob: `${y - 11}-07-30`, position: 'FB', source: 'كشاف', club: 'دوري المدارس', guardian: 'رفعت حسن', note: 'شافه الكشاف في بطولة المدارس' }, []);
    /* School players nominated by their coaches (they need a birth date). */
    const school = s.members.filter(m => { const g = s.groups.find(x => x.id === m.group); return g?.sport === 'football' && !FC.isSquad(g); });
    const young = m => m.dob && FC.uOf(Number(m.dob.slice(0, 4)), now) >= 8 && FC.uOf(Number(m.dob.slice(0, 4)), now) <= 17;
    school.filter(young).concat(school.filter(m => !young(m))).slice(0, 2).forEach((m, i) => {
      if (!young(m)) m.dob = `${y - 11 - i}-0${3 + i}-12`;
      const c = FC.nominate(s, m.id, { position: i ? 'DM' : 'W', note: i ? 'أهدى لاعب في المجموعة وبيقرأ اللعب' : 'أسرع لاعب في مجموعته ومهاري' }, { now: daysFrom(-9 + i * 4), id: 'fbc-nom-' + i, by: s.groups.find(x => x.id === m.group)?.coach || 'المدرب' });
      if (!i) FC.move(s, c.id, 'invited', { at: trialAt(2) }, { now: daysFrom(-7), by: 'الإدارة الفنية' });
    });
    s.sportDemoVersion = VERSION;
  }));
})();

/* Shared sample academy, loaded by the dashboard and the apps so both show the same
   records. Runs once per saved record (sportDemoVersion) and only adds what is missing:
   players and guardians for every sport, weekly group schedules, held and upcoming
   sessions, levels, skills, assessments, a belt exam and a few payments. */
(function () {
  'use strict';
  if (!window.V || !window.SportEngine) return;
  const db = V.db, VERSION = 4;
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
    s.sportDemoVersion = VERSION;
  }));
})();

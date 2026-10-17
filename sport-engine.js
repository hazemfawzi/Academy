/* Sport engine: the single, persisted definition of every sport the academy runs.
   A sport is built from a type (team, levels, ranks, timed, racket, classes) and the
   modules it switches on. Modules decide which tools appear in the dashboard and the
   apps, so a switched-off module really disappears. Pure functions are exported for
   tests; the browser binding persists through the shared record (V.db). */
(function (root) {
  'use strict';

  const TYPES = {
    team: {
      name: 'رياضة جماعية', desc: 'فرق وتقسيمات وماتشات ودوري بين الجروبات',
      modules: ['teams', 'matches', 'league', 'ratings', 'parents'],
      metrics: [['التمرير', 'rating'], ['التسديد', 'rating'], ['اللياقة', 'rating']],
      levels: ['مبتدئ', 'متوسط', 'متقدم'],
      terms: { coach: 'كابتن', player: 'لاعب', players: 'اللاعبون' }
    },
    levels: {
      name: 'مستويات ومهارات', desc: 'كل مستوى له قائمة مهارات، والترقية عند إتقانها',
      modules: ['levels', 'skills', 'parents'],
      metrics: [['إتقان المهارة', 'rating']],
      levels: ['مستوى 1', 'مستوى 2', 'مستوى 3'],
      terms: { coach: 'كابتن', player: 'لاعب', players: 'اللاعبون' }
    },
    ranks: {
      name: 'أحزمة ورتب', desc: 'مسار أحزمة، وشروط أهلية، واختبارات ترقية',
      modules: ['belts', 'skills', 'exams', 'tournaments', 'parents'],
      metrics: [['درجة الاختبار', 'score']],
      levels: ['أبيض', 'أصفر', 'برتقالي', 'أخضر', 'أزرق', 'بني', 'أسود'],
      terms: { coach: 'سنسي', player: 'لاعب', players: 'اللاعبون' }
    },
    timed: {
      name: 'أزمنة وأرقام', desc: 'مستويات مع تسجيل الأزمنة والأرقام الشخصية',
      modules: ['levels', 'skills', 'times', 'lanes', 'parents'],
      metrics: [['25 متر حرة', 'time']],
      levels: ['مستوى 1', 'مستوى 2', 'مستوى 3'],
      terms: { coach: 'كابتن', player: 'سبّاح', players: 'السبّاحون' }
    },
    racket: {
      name: 'رياضات المضرب', desc: 'مستويات وملاعب وأزواج متقاربة',
      modules: ['levels', 'ratings', 'courts', 'pairs'],
      metrics: [['الإرسال', 'rating'], ['الضربة الأمامية', 'rating']],
      levels: ['مبتدئ', 'متوسط', 'متقدم'],
      terms: { coach: 'كابتن', player: 'لاعب', players: 'اللاعبون' }
    },
    classes: {
      name: 'كلاسات', desc: 'كلاسات بسعة محدودة وأرقام شخصية',
      modules: ['classes', 'pr'],
      metrics: [['أقصى وزن', 'number', 'كجم']],
      levels: ['أساسي', 'متوسط', 'متقدم'],
      terms: { coach: 'كوتش', player: 'مشترك', players: 'المشتركون' }
    }
  };

  /* Every module the builder can switch on. `tool` is what the coach sees; `admin` is
     what the dashboard opens; `ready` marks modules whose screens exist in this preview. */
  const MODULES = {
    teams: { name: 'تقسيم فرق متوازن', desc: 'تقسيمة بالمستوى والمركز لأي عدد حاضرين', ready: 'football', tool: ['التقسيمة', 'فرق متوازنة من الحاضرين', "go('teams')"] },
    matches: { name: 'تسجيل الماتشات', desc: 'أهداف وأسيست وأفضل لاعب ونتيجة كل ماتش', ready: 'football', tool: ['إدارة الماتش', 'الأهداف والنتائج', "go('record')"] },
    league: { name: 'دوري بين الجروبات', desc: 'جدول دوري ونقاط وبطل كل شهر', ready: 'football', admin: ['الماتشات والدوري', "go('matches')"] },
    ratings: { name: 'تقييم المهارات', desc: 'تقييم المدرب من 1 إلى 5 لعناصر التقييم', ready: true, tool: ['تقييم المهارات', 'تقييم الجروب كله من 1 إلى 5', "AcademyApps.assess('rating')"] },
    levels: { name: 'مستويات وترقيات', desc: 'كل لاعب في مستوى، والترقية بشروط واضحة', ready: true, tool: ['المستويات والترقية', 'المؤهلون للترقية وتعيين المستوى', "go('levels')"] },
    skills: { name: 'قائمة مهارات لكل مستوى', desc: 'المدرب يعلّم المهارة لما اللاعب يتقنها', ready: true, tool: ['مهارات المستوى', 'علّم المهارات المتقنة للجروب', "AcademyApps.skillsBoard()"] },
    times: { name: 'أزمنة وأرقام شخصية', desc: 'كل محاولة محفوظة، وأفضل زمن وتطوره', ready: true, tool: ['تسجيل الأزمنة', 'زمن كل لاعب في الحصة', "AcademyApps.assess('time')"] },
    lanes: { name: 'توزيع الحارات', desc: 'السبّاحين على الحارات حسب المستوى', ready: true, tool: ['توزيع الحارات', 'حسب المستوى وأفضل زمن', "AcademyApps.lanes()"] },
    belts: { name: 'الأحزمة', desc: 'مسار الأحزمة لكل لاعب وتاريخه', ready: true, tool: ['الأحزمة والأهلية', 'من مؤهل لاختبار الحزام التالي', "go('levels')"] },
    exams: { name: 'اختبارات الترقية', desc: 'ميعاد الاختبار والمتقدمون والنتيجة والشهادة', ready: true, tool: ['اختبار الترقية', 'سجّل نتائج المتقدمين', "AcademyApps.assess('score')"] },
    tournaments: { name: 'بطولات خروج المغلوب', desc: 'قرعة وأدوار ونتائج', ready: false },
    courts: { name: 'حجز الملاعب', desc: 'جدول الملاعب والحجوزات والإيراد', ready: 'padel', admin: ['الملاعب والحجوزات', "go('resources')"] },
    pairs: { name: 'تقسيم أزواج متوازن', desc: 'أزواج متقاربة في المستوى', ready: true, tool: ['تقسيم أزواج', 'أزواج متقاربة من الحاضرين', "AcademyApps.pairs()"] },
    americano: { name: 'بطولات أمريكانو', desc: 'كل لاعب يلعب مع الكل والنقاط فردية', ready: false },
    classes: { name: 'حجز كلاس بعدد محدود', desc: 'الكلاس يقفل عند اكتمال السعة', ready: true },
    pr: { name: 'أرقام قياسية شخصية', desc: 'أقصى وزن وأحسن زمن لكل تمرين', ready: true, tool: ['رقم شخصي', 'سجّل رقم كل مشترك', "AcademyApps.assess('number')"] },
    parents: { name: 'حساب ولي الأمر', desc: 'ولي الأمر يتابع أولاده ويدفع من حساب واحد', ready: true },
    horses: { name: 'إدارة الخيل', desc: 'جدول كل حصان وراحته ومواعيد البيطري', ready: false }
  };

  const KINDS = {
    rating: { name: 'تقييم من 1 إلى 5', unit: 'من 5', better: 'higher', min: 1, max: 5 },
    score: { name: 'درجة من 100', unit: 'من 100', better: 'higher', min: 0, max: 100 },
    time: { name: 'زمن', unit: 'ثانية', better: 'lower', min: 0.1, max: 3600 },
    number: { name: 'رقم بوحدة', unit: '', better: 'higher', min: 0, max: 100000 },
    check: { name: 'تم أو لم يتم', unit: '', better: 'higher', min: 0, max: 1 }
  };

  /* The six sports this preview academy runs, described in full. */
  const PRESETS = {
    football: { type: 'team', color: '#4c8c6e', modules: ['teams', 'ratings', 'levels', 'parents'], levels: [['مبتدئ'], ['متوسط'], ['متقدم']],
      metrics: [['التحكم', 'rating'], ['التمرير', 'rating'], ['التسديد', 'rating'], ['الدفاع والتمركز', 'rating'], ['اللياقة', 'rating']],
      programs: [['براعم', 5, 8, 900], ['أشبال', 9, 12, 1000], ['ناشئين', 13, 17, 1100]] },
    swimming: { type: 'timed', color: '#3f84a8', modules: ['levels', 'skills', 'times', 'lanes', 'parents'],
      levels: [
        ['مستوى 1 · الأمان', ['دخول الماء بأمان', 'الطفو على البطن بمساعدة', 'نفخ الفقاعات']],
        ['مستوى 2 · الطفو', ['الطفو على الظهر 10 ثوانٍ', 'الانزلاق 5 أمتار', 'ضربات الرجلين بلوح']],
        ['مستوى 3 · كرول', ['كرول 15 متر', 'التنفس الجانبي', 'القفز من الحافة']],
        ['مستوى 4 · ظهر', ['ظهر 25 متر', 'دوران الحائط']],
        ['مستوى 5 · صدر', ['صدر 25 متر', 'غطسة البداية']],
        ['مستوى 6 · فراشة', ['فراشة 15 متر', 'سباحة متنوعة 50 متر']],
        ['فريق المنافسات', ['100 متر متنوع', 'زمن تأهيل 50 متر']]
      ],
      metrics: [['25 متر حرة', 'time'], ['50 متر حرة', 'time'], ['25 متر ظهر', 'time']],
      programs: [['أطفال', 4, 7, 1100], ['ناشئين', 8, 14, 1200], ['كبار', 15, 70, 1000]],
      resources: ['حارة 1', 'حارة 2', 'حارة 3', 'حارة 4'] },
    karate: { type: 'ranks', color: '#b48952', modules: ['belts', 'skills', 'exams', 'ratings', 'parents'],
      levels: [
        ['أبيض', ['الوقفات الأساسية', 'اللكمة المستقيمة', 'الصد العلوي']],
        ['أصفر', ['كاتا هيآن شودان', 'الركلة الأمامية']],
        ['برتقالي', ['كاتا هيآن نيدان', 'الركلة الجانبية']],
        ['أخضر', ['كاتا هيآن ساندان', 'كوميتيه أساسي']],
        ['أزرق', ['كاتا هيآن يوندان', 'كوميتيه حر']],
        ['بني', ['كاتا باساي داي']],
        ['أسود', ['كاتا متقدم', 'تحكيم ودعم المبتدئين']]
      ],
      metrics: [['الكاتا', 'score'], ['الكوميتيه', 'score'], ['الانضباط', 'rating']],
      promotion: { minSessions: 10, minAttendance: 75, skills: true, exam: true },
      programs: [['أطفال', 5, 9, 800], ['ناشئين', 10, 15, 850]],
      resources: ['صالة الأرضيات'] },
    gymnastics: { type: 'levels', color: '#9772ac', modules: ['levels', 'skills', 'ratings', 'parents'],
      levels: [
        ['مستوى 1', ['الدحرجة الأمامية', 'الوقوف على الكتفين', 'التوازن على قدم']],
        ['مستوى 2', ['الدحرجة الخلفية', 'العجلة', 'الكوبري من الرقود']],
        ['مستوى 3', ['الوقوف على اليدين بمساعدة', 'العجلة بيد واحدة']],
        ['مستوى 4', ['الوقوف على اليدين', 'الشقلبة الأمامية']],
        ['مستوى 5', ['الشقلبة الخلفية', 'سلسلة حركات أرضية']]
      ],
      metrics: [['إتقان المهارة', 'rating'], ['المرونة', 'rating']],
      programs: [['بنات 4 لـ 6 سنين', 4, 6, 950], ['بنات 6 لـ 9 سنين', 6, 9, 1000], ['أولاد 6 لـ 10 سنين', 6, 10, 1000]],
      resources: ['صالة الجمباز'] },
    padel: { type: 'racket', color: '#c08079', modules: ['levels', 'ratings', 'courts', 'pairs'], levels: [['مبتدئ'], ['D'], ['C'], ['B']],
      metrics: [['الإرسال', 'rating'], ['الضربة الأمامية', 'rating'], ['الضربة الخلفية', 'rating'], ['الحائط', 'rating']],
      programs: [['كبار', 16, 70, 1400]],
      resources: ['ملعب 1', 'ملعب 2', 'ملعب 3'] },
    fitness: { type: 'classes', color: '#879c54', modules: ['classes', 'pr', 'levels'], levels: [['أساسي'], ['متوسط'], ['متقدم']],
      metrics: [['سكوات', 'number', 'كجم'], ['بلانك', 'time'], ['جري 1 كم', 'time']],
      programs: [['كبار', 16, 70, 700]],
      resources: ['صالة اللياقة'] },
    equestrian: { type: 'levels', color: '#8d6b4f', levels: [['مبتدئ · مشي'], ['خبب'], ['جالوب'], ['حواجز صغيرة'], ['منافسات']] },
    tennis: { type: 'racket', color: '#6f9a3f' },
    basketball: { type: 'team', color: '#c7783f' },
    yoga: { type: 'classes', color: '#7d8fb3' },
    taekwondo: { type: 'ranks', color: '#a24d4d', levels: [['أبيض'], ['أصفر'], ['أخضر'], ['أزرق'], ['أحمر'], ['أسود']] }
  };

  const slug = text => String(text || '').trim();
  const uid = (prefix, i) => prefix + '-' + i;
  const clone = value => JSON.parse(JSON.stringify(value));
  const unique = list => [...new Set(list)];

  function metric(sportId, [name, kind, unit], i) {
    const k = KINDS[kind] || KINDS.rating;
    return { id: uid(sportId + '-metric', i), name, kind, unit: unit ?? k.unit, better: k.better };
  }

  /* Build a complete definition for a known sport (preset or catalog) or a blank type. */
  function blueprint(source) {
    const preset = PRESETS[source.id] || {};
    const typeId = source.type || preset.type || 'levels';
    const type = TYPES[typeId] || TYPES.levels;
    const id = source.id;
    const levelRows = preset.levels || (source.levels || type.levels).map(name => [name]);
    return {
      id, name: source.name, ico: source.ico || '🏅', color: preset.color || '#5d8a6f', type: typeId,
      on: source.on !== false, custom: !!source.custom,
      modules: unique(preset.modules || source.modules || type.modules),
      terms: { ...type.terms, coach: source.coach || type.terms.coach },
      levels: levelRows.map(([name, skills = []], i) => ({
        id: uid(id + '-level', i), name, criteria: '', active: true,
        skills: skills.map((s, j) => ({ id: uid(id + '-l' + i + '-skill', j), name: s }))
      })),
      metrics: (preset.metrics || type.metrics).map((m, i) => metric(id, m, i)),
      promotion: { minSessions: 8, minAttendance: 70, skills: true, exam: typeId === 'ranks', ...(preset.promotion || {}) },
      programs: (preset.programs || [['كل الأعمار', 5, 70, 900]]).map(([name, ageMin, ageMax, price], i) => ({
        id: uid(id + '-program', i), name, ageMin, ageMax, price, sessions: 12, active: true
      })),
      resources: (preset.resources || ['مساحة التدريب']).map((name, i) => ({ id: uid(id + '-resource', i), name, capacity: 0 })),
      duration: 60, capacity: typeId === 'racket' ? 8 : 16,
      registration: { medical: typeId === 'timed', consent: true, note: '' }
    };
  }

  /* Merge settings saved by the earlier settings screen into a full definition. */
  function fromLegacy(base, saved) {
    if (!saved) return base;
    const def = clone(base);
    if (Array.isArray(saved.levels) && saved.levels.length) {
      def.levels = saved.levels.map((l, i) => ({
        id: l.id, name: l.name, criteria: l.criteria || '', active: l.active !== false,
        skills: (base.levels.find(x => x.id === l.id) || base.levels[i] || { skills: [] }).skills
      }));
    }
    if (Array.isArray(saved.modules) && saved.modules.length) def.modules = unique(saved.modules);
    if (saved.on === false) def.on = false;
    if (Number.isInteger(saved.duration)) def.duration = saved.duration;
    if (Number.isInteger(saved.capacity)) def.capacity = saved.capacity;
    if (saved.resourceLabel) def.resources = [{ id: def.id + '-resource-0', name: saved.resourceLabel, capacity: 0 }];
    if (Array.isArray(saved.skills) && saved.skills.length) {
      const known = new Set(def.metrics.map(m => m.name));
      saved.skills.filter(s => !known.has(s)).forEach((name, i) => def.metrics.push({ id: def.id + '-metric-extra-' + i, name, kind: 'rating', unit: 'من 5', better: 'higher' }));
    }
    return def;
  }

  /* Read every sport from the record; missing ones are built from the config. */
  function list(state, config) {
    const defs = state.sportDefs || {};
    const order = state.sportOrder || config.SPORTS.map(s => s.id);
    const ids = unique([...order, ...Object.keys(defs)]);
    return ids.map(id => defs[id] || fromLegacy(blueprint(config.SPORTS.find(s => s.id === id) || { id, name: id }), state.sportSettings?.[id]));
  }

  function get(state, config, id) {
    return list(state, config).find(s => s.id === id) || null;
  }

  function fail(message) { throw Error(message); }

  /* Validate a definition before saving; returns a normalised copy. */
  function validate(def, previous, others = [], usage = {}) {
    const d = clone(def);
    d.name = slug(d.name);
    if (!d.name) fail('اكتب اسم الرياضة');
    if (others.some(o => o.id !== d.id && o.name.trim() === d.name)) fail('فيه رياضة بنفس الاسم');
    if (!TYPES[d.type]) fail('اختر نوع الرياضة');
    if (!Number.isInteger(d.duration) || d.duration < 15 || d.duration > 240) fail('مدة الحصة من 15 إلى 240 دقيقة');
    if (!Number.isInteger(d.capacity) || d.capacity < 1 || d.capacity > 100) fail('سعة الجروب من 1 إلى 100');
    d.modules = unique((d.modules || []).filter(k => MODULES[k]));
    d.levels = (d.levels || []).map(l => ({ ...l, name: slug(l.name), criteria: slug(l.criteria), skills: (l.skills || []).map(s => ({ ...s, name: slug(s.name) })).filter(s => s.name) }));
    if (!d.levels.length || !d.levels.some(l => l.active)) fail('أضف مستوى متاحًا واحدًا على الأقل');
    if (d.levels.some(l => !l.name)) fail('كل مستوى يحتاج اسمًا');
    if (new Set(d.levels.map(l => l.name)).size !== d.levels.length) fail('أسماء المستويات لازم تكون مختلفة');
    if (previous) {
      const removed = previous.levels.filter(l => !d.levels.some(x => x.id === l.id));
      if (removed.some(l => usage[l.id])) fail('المستوى عليه لاعبون أو سجل ترقية؛ عطّله بدل حذفه');
    }
    d.metrics = (d.metrics || []).map(m => ({ ...m, name: slug(m.name), unit: slug(m.unit) })).filter(m => m.name);
    if (d.metrics.some(m => !KINDS[m.kind])) fail('اختر نوع كل عنصر تقييم');
    if (d.metrics.some(m => m.kind === 'number' && !m.unit)) fail('اكتب وحدة القياس للأرقام (مثل كجم أو متر)');
    if (new Set(d.metrics.map(m => m.name)).size !== d.metrics.length) fail('عناصر التقييم لازم تكون مختلفة');
    d.metrics.forEach(m => { m.better = KINDS[m.kind].better; if (m.kind !== 'number') m.unit = KINDS[m.kind].unit; });
    d.programs = (d.programs || []).map(p => ({ ...p, name: slug(p.name), ageMin: Number(p.ageMin), ageMax: Number(p.ageMax), price: Number(p.price), sessions: Number(p.sessions) }));
    if (d.programs.some(p => !p.name)) fail('كل برنامج يحتاج اسمًا');
    if (d.programs.some(p => !Number.isInteger(p.ageMin) || !Number.isInteger(p.ageMax) || p.ageMin < 2 || p.ageMax > 90 || p.ageMin > p.ageMax)) fail('راجع الفئة العمرية لكل برنامج');
    if (d.programs.some(p => !Number.isFinite(p.price) || p.price < 0 || !Number.isInteger(p.sessions) || p.sessions < 1 || p.sessions > 60)) fail('راجع سعر البرنامج وعدد حصصه الشهرية');
    d.resources = (d.resources || []).map(r => ({ ...r, name: slug(r.name), capacity: Number(r.capacity) || 0 })).filter(r => r.name);
    if (!d.resources.length) fail('أضف مكان تدريب واحدًا على الأقل');
    const p = d.promotion || {};
    d.promotion = { minSessions: Math.max(0, Number(p.minSessions) || 0), minAttendance: Math.min(100, Math.max(0, Number(p.minAttendance) || 0)), skills: !!p.skills, exam: !!p.exam };
    d.terms = { coach: slug(d.terms?.coach) || 'كابتن', player: slug(d.terms?.player) || 'لاعب', players: slug(d.terms?.players) || 'اللاعبون' };
    return d;
  }

  /* A new sport from the catalog or from a blank type. */
  function draft(state, config, source) {
    const existing = list(state, config);
    if (source.catalogId) {
      const c = config.CATALOG.find(x => x.id === source.catalogId) || fail('الرياضة غير موجودة في الكتالوج');
      if (existing.some(s => s.id === c.id)) fail('الرياضة مضافة بالفعل');
      return blueprint({ ...c, type: PRESETS[c.id]?.type || typeFromTemplate(c.tpl) });
    }
    const name = slug(source.name) || fail('اكتب اسم الرياضة');
    if (existing.some(s => s.name === name)) fail('فيه رياضة بنفس الاسم');
    const id = 'custom-' + Date.now().toString(36);
    return blueprint({ id, name, ico: source.ico || '🏅', type: source.type || 'levels', custom: true });
  }

  function typeFromTemplate(tpl) {
    return ({ 'رياضة جماعية': 'team', 'سباحة': 'timed', 'فنون قتالية': 'ranks', 'مهارات بمستويات': 'levels', 'رياضات المضرب': 'racket', 'كلاسات': 'classes', 'فروسية': 'levels' })[tpl] || 'levels';
  }

  /* Tools a coach sees for this sport, built only from switched-on modules. */
  function tools(def) {
    return def.modules.map(k => ({ key: k, ...MODULES[k] }))
      .filter(m => m.tool && (m.ready === true || m.ready === def.id))
      .map(m => ({ key: m.key, title: m.tool[0], desc: m.tool[1], action: m.tool[2] }));
  }

  /* Dashboard screens unlocked by modules (league, courts…). */
  function adminTools(def) {
    return def.modules.map(k => ({ key: k, ...MODULES[k] }))
      .filter(m => m.admin && (m.ready === true || m.ready === def.id))
      .map(m => ({ key: m.key, title: m.admin[0], action: m.admin[1] }));
  }

  function has(def, key) { return !!def && def.on !== false && def.modules.includes(key); }

  function moduleState(def, key) {
    const m = MODULES[key];
    if (m.ready === true) return 'ready';
    if (m.ready === def.id) return 'ready';
    if (typeof m.ready === 'string') return 'limited';
    return 'planned';
  }

  /* Keep the legacy sport list (used by older screens) in step with the record. */
  function sync(state, config) {
    const defs = list(state, config);
    defs.forEach(def => {
      let s = config.SPORTS.find(x => x.id === def.id);
      if (!s) { s = { id: def.id, members: 0, tpl: TYPES[def.type].name }; config.SPORTS.push(s); }
      Object.assign(s, { name: def.name, ico: def.ico, on: def.on !== false, coach: def.terms.coach, modules: def.modules.slice(), levels: def.levels.map(l => l.name), type: def.type, color: def.color });
    });
    return defs;
  }

  function levelUsage(state, def) {
    const usage = {};
    (state.members || []).forEach(m => { if (m.sportLevel) usage[m.sportLevel] = true; });
    (state.levelHistory || []).forEach(h => { if (h.sport === def.id) usage[h.levelId] = true; });
    return usage;
  }

  const api = { TYPES, MODULES, KINDS, PRESETS, blueprint, fromLegacy, list, get, validate, draft, tools, adminTools, has, moduleState, sync, levelUsage };
  root.SportCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  /* Browser binding. */
  if (typeof window === 'undefined' || !window.V || !window.MS) return;
  const db = V.db, config = MS;
  Object.keys(MODULES).forEach(k => { config.MODULES[k] = { ...(config.MODULES[k] || {}), name: MODULES[k].name, desc: MODULES[k].desc }; });

  const save = def => {
    const all = list(db.state, config);
    const previous = all.find(s => s.id === def.id);
    const clean = validate(def, previous, all, levelUsage(db.state, def));
    db.update(st => {
      st.sportDefs = st.sportDefs || {};
      st.sportOrder = st.sportOrder || config.SPORTS.map(s => s.id);
      st.sportDefs[clean.id] = clean;
      if (!st.sportOrder.includes(clean.id)) st.sportOrder.push(clean.id);
      st.audit.unshift({ id: db.id('audit'), at: new Date().toISOString(), action: previous ? 'تعديل رياضة' : 'إضافة رياضة', details: clean.name });
    });
    sync(db.state, config);
    return clean;
  };

  const SE = window.SportEngine = {
    TYPES, MODULES, KINDS,
    list: () => list(db.state, config),
    get: id => get(db.state, config, id),
    save,
    draft: source => draft(db.state, config, source),
    tools: id => { const d = get(db.state, config, id); return d && d.on !== false ? tools(d) : []; },
    adminTools: id => { const d = get(db.state, config, id); return d ? adminTools(d) : []; },
    has: (id, key) => has(get(db.state, config, id), key),
    moduleState: (id, key) => moduleState(get(db.state, config, id) || { id }, key),
    toggle(id, on) { const d = get(db.state, config, id); d.on = on; return save(d); },
    toggleModule(id, key) { const d = get(db.state, config, id); d.modules = d.modules.includes(key) ? d.modules.filter(k => k !== key) : [...d.modules, key]; return save(d); },
    level(member) {
      const g = db.state.groups.find(x => x.id === member.group), d = g && get(db.state, config, g.sport);
      return d?.levels.find(l => l.id === member.sportLevel) || null;
    },
    term(id, key) { return get(db.state, config, id)?.terms[key] || TYPES.levels.terms[key]; },
    sync: () => sync(db.state, config)
  };

  /* Compatibility facade for screens written against the earlier settings module. */
  window.SportSettings = {
    get: id => { const d = SE.get(id); return d ? { ...clone(d), skills: d.metrics.map(m => m.name), resourceLabel: d.resources[0]?.name || 'مساحة التدريب' } : null; },
    apply: () => SE.sync(),
    save(id, config) { const d = SE.get(id); return save({ ...d, ...config, levels: config.levels.map(l => ({ skills: d.levels.find(x => x.id === l.id)?.skills || [], ...l })) }); },
    assign(mid, levelId, reason) {
      const m = db.member(mid), g = db.state.groups.find(x => x.id === m.group), d = g && SE.get(g.sport);
      const l = d?.levels.find(x => x.id === levelId && x.active);
      if (!l || !String(reason || '').trim()) throw Error('اختر مستوى متاحًا واكتب سبب التقييم أو الترقية');
      db.update(st => {
        st.members.find(x => x.id === mid).sportLevel = levelId;
        st.levelHistory = st.levelHistory || [];
        st.levelHistory.push({ id: db.id('level'), memberId: mid, sport: g.sport, levelId, levelName: l.name, reason: reason.trim(), at: new Date().toISOString() });
      });
    },
    label: m => SE.level(m)?.name || 'المستوى لم يحدد'
  };

  sync(db.state, config);
})(typeof window !== 'undefined' ? window : globalThis);

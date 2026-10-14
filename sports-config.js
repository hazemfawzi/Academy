/* Multi-sport configuration: which sports the academy runs, which modules each one opens,
   and demo data for the sport-specific screens. Shared by the dashboard and the mobile apps. */
(function (root) {
  'use strict';
  const ACADEMY = { name: 'أكاديمية النخبة الرياضية', short: 'النخبة', latin: 'ELITE ACADEMY' };

  const MODULES = {
    teams:       { name: 'تقسيم فرق متوازن',        desc: 'تقسيمة بالمستوى والمركز لأي عدد حاضرين' },
    matches:     { name: 'تسجيل الماتشات',           desc: 'أهداف وأسيست وأفضل لاعب ونتيجة كل ماتش' },
    league:      { name: 'دوري بين الجروبات',        desc: 'جدول دوري ونقاط وبطل كل شهر' },
    ratings:     { name: 'تقييم المهارات',           desc: 'تقييم المدرب والأداء الفعلي وتصويت الزملاء' },
    levels:      { name: 'مستويات وترقيات',          desc: 'كل لاعب في مستوى، والترقية باختبار' },
    times:       { name: 'أزمنة وأرقام شخصية',       desc: 'أحسن زمن لكل مسافة وتطوره' },
    lanes:       { name: 'توزيع الحارات',            desc: 'السبّاحين على الحارات حسب السرعة' },
    belts:       { name: 'الأحزمة',                  desc: 'مسار الأحزمة لكل لاعب' },
    exams:       { name: 'اختبارات الترقية',         desc: 'ميعاد الاختبار وبنوده ونتيجته' },
    tournaments: { name: 'بطولات خروج المغلوب',      desc: 'قرعة وأدوار ونتايج' },
    skills:      { name: 'قايمة مهارات لكل مستوى',   desc: 'المدرب يعلّم المهارة لما اللاعب يتقنها' },
    courts:      { name: 'حجز الملاعب',              desc: 'جدول الملاعب والحجوزات والإيراد' },
    pairs:       { name: 'تقسيم أزواج متوازن',       desc: 'أزواج متقاربة في المستوى' },
    americano:   { name: 'بطولات أمريكانو',          desc: 'كل لاعب يلعب مع الكل والنقاط فردية' },
    classes:     { name: 'حجز كلاس بعدد محدود',      desc: 'الكلاس بيتقفل لما يكمل' },
    pr:          { name: 'أرقام قياسية شخصية',       desc: 'أقصى وزن وأحسن زمن لكل تمرين' },
    parents:     { name: 'حساب ولي الأمر',           desc: 'الأب يتابع أولاده ويدفع لهم من حساب واحد' },
    horses:      { name: 'إدارة الخيل',              desc: 'جدول كل حصان وراحته ومواعيد البيطري' }
  };

  const SPORTS = [
    { id: 'football', name: 'كورة', ico: '⚽', on: true, tpl: 'رياضة جماعية', coach: 'كابتن', members: 110,
      levels: ['مبتدئ', 'متوسط', 'متقدم'], modules: ['teams', 'matches', 'league', 'ratings'] },
    { id: 'swimming', name: 'سباحة', ico: '🏊', on: true, tpl: 'سباحة', coach: 'كابتن', members: 64,
      levels: ['مستوى 1 · الأمان', 'مستوى 2 · الطفو', 'مستوى 3 · كرول', 'مستوى 4 · ظهر', 'مستوى 5 · صدر', 'مستوى 6 · فراشة', 'فريق المنافسات'],
      modules: ['levels', 'times', 'lanes', 'parents'] },
    { id: 'karate', name: 'كاراتيه', ico: '🥋', on: true, tpl: 'فنون قتالية', coach: 'سنسي', members: 41,
      levels: ['أبيض', 'أصفر', 'برتقالي', 'أخضر', 'أزرق', 'بني', 'أسود'], modules: ['belts', 'exams', 'tournaments', 'parents'] },
    { id: 'gymnastics', name: 'جمباز', ico: '🤸', on: true, tpl: 'مهارات بمستويات', coach: 'كابتن', members: 38,
      levels: ['مستوى 1', 'مستوى 2', 'مستوى 3', 'مستوى 4', 'مستوى 5'], modules: ['levels', 'skills', 'parents'] },
    { id: 'padel', name: 'بادل', ico: '🎾', on: true, tpl: 'رياضات المضرب', coach: 'كابتن', members: 27,
      levels: ['مبتدئ', 'D', 'C', 'B'], modules: ['courts', 'pairs', 'americano'] },
    { id: 'fitness', name: 'لياقة', ico: '💪', on: true, tpl: 'كلاسات', coach: 'كوتش', members: 52,
      levels: ['أساسي', 'متوسط', 'متقدم'], modules: ['classes', 'pr'] }
  ];

  /* Sports the academy can add later from the catalog. */
  const CATALOG = [
    { id: 'equestrian', name: 'فروسية', ico: '🐎', tpl: 'فروسية', modules: ['horses', 'levels', 'tournaments', 'parents'] },
    { id: 'tennis', name: 'تنس', ico: '🎾', tpl: 'رياضات المضرب', modules: ['courts', 'pairs', 'tournaments'] },
    { id: 'basketball', name: 'باسكت', ico: '🏀', tpl: 'رياضة جماعية', modules: ['teams', 'matches', 'league'] },
    { id: 'yoga', name: 'يوجا', ico: '🧘', tpl: 'كلاسات', modules: ['classes'] },
    { id: 'taekwondo', name: 'تايكوندو', ico: '🥋', tpl: 'فنون قتالية', modules: ['belts', 'exams', 'tournaments', 'parents'] }
  ];

  /* Which demo group runs which sport. Groups 1–7 are the original football groups; 8–12 are added by ms-dash.js. */
  const GROUP_SPORT = { 1: 'football', 2: 'football', 3: 'football', 4: 'football', 5: 'football', 6: 'football', 7: 'football',
    8: 'swimming', 9: 'karate', 10: 'gymnastics', 11: 'padel', 12: 'fitness' };
  const NEW_GROUPS = [
    { id: 8, name: 'سباحة أطفال · مستوى 2', br: 'الشيخ زايد', coaches: [['كابتن سلمى', 'رئيسي'], ['كابتن هاني', 'مساعد']], cap: 12, n: 10, lvl: 'مستوى 2', days: [0, 2], time: '5:00 م', cls: '' },
    { id: 9, name: 'كاراتيه · أحزمة ملونة', br: 'أكتوبر', coaches: [['سنسي وليد', 'رئيسي']], cap: 16, n: 14, lvl: 'أصفر لأخضر', days: [1, 3], time: '5:00 م', cls: 'b2' },
    { id: 10, name: 'جمباز بنات · 6 لـ 9 سنين', br: 'الشيخ زايد', coaches: [['كابتن ندى', 'رئيسي']], cap: 14, n: 12, lvl: 'مستوى 2', days: [1, 3, 5], time: '4:00 م', cls: 'b3' },
    { id: 11, name: 'بادل · مستوى C', br: 'المهندسين', coaches: [['كابتن كريم', 'رئيسي']], cap: 8, n: 6, lvl: 'C', days: [0, 4], time: '5:00 م', cls: 'b2' },
    { id: 12, name: 'لياقة كروس', br: 'المهندسين', coaches: [['كوتش دينا', 'رئيسي']], cap: 16, n: 13, lvl: 'متوسط', days: [0, 2, 4], time: '8:00 ص', cls: '' }
  ];

  const KARATE = [
    { n: 'عمر سامي', age: 9, belt: 2, ready: 85, parent: 'أحمد سامي' },
    { n: 'يوسف مجدي', age: 10, belt: 2, ready: 60, parent: 'مجدي فؤاد' },
    { n: 'آدم حسن', age: 8, belt: 1, ready: 90, parent: 'حسن علي' },
    { n: 'سليم وائل', age: 11, belt: 3, ready: 40, parent: 'وائل نبيل' },
    { n: 'مريم خالد', age: 9, belt: 1, ready: 75, parent: 'خالد عمر' },
    { n: 'زين طارق', age: 12, belt: 4, ready: 55, parent: 'طارق سعيد' }
  ];
  const KARATE_EXAM = { date: '25 أكتوبر', items: ['الأساسيات (كيهون)', 'الكاتا', 'القتال (كوميتيه)', 'الانضباط والحضور'] };

  const SWIM = [
    { n: 'ليلى سامي', age: 7, level: 1, free25: 31.4, prev: 34.2, parent: 'أحمد سامي' },
    { n: 'جنى محمود', age: 8, level: 1, free25: 29.8, prev: 30.5, parent: 'محمود رأفت' },
    { n: 'نور هشام', age: 7, level: 1, free25: 33.1, prev: 35.0, parent: 'هشام فؤاد' },
    { n: 'تيا كريم', age: 8, level: 2, free25: 26.7, prev: 28.1, parent: 'كريم عادل' },
    { n: 'سارة إيهاب', age: 6, level: 0, free25: 38.9, prev: 41.2, parent: 'إيهاب منير' },
    { n: 'فرح عمرو', age: 9, level: 2, free25: 24.9, prev: 25.6, parent: 'عمرو نبيل' }
  ];

  const GYM_SKILLS = ['شقلبة أمامية', 'وقوف على اليدين بمساعدة', 'عجلة', 'توازن على العارضة 10 ثواني', 'قفزة نجمة'];
  const GYM = [
    { n: 'هنا سامح', age: 7, done: [1, 1, 1, 0, 1] },
    { n: 'ملك أحمد', age: 8, done: [1, 1, 1, 1, 1] },
    { n: 'جودي ياسر', age: 6, done: [1, 0, 1, 0, 0] },
    { n: 'ريتال محمد', age: 9, done: [1, 1, 0, 1, 1] },
    { n: 'لارا شريف', age: 7, done: [1, 0, 0, 0, 1] }
  ];

  const COURTS = ['ملعب 1', 'ملعب 2', 'ملعب 3'];
  const SLOTS = ['5:00 م', '6:30 م', '8:00 م', '9:30 م', '11:00 م'];
  /* [court index, slot index, label, kind] kind: group | booking */
  const BOOKINGS = [
    [0, 0, 'جروب بادل C', 'group'], [0, 1, 'كريم عادل + 3', 'booking'], [0, 3, 'مازن رضا + 3', 'booking'],
    [1, 1, 'جروب بادل مبتدئ', 'group'], [1, 2, 'أمريكانو الخميس', 'event'], [1, 3, 'أمريكانو الخميس', 'event'],
    [2, 2, 'يوسف حسن + 3', 'booking'], [2, 4, 'هشام فؤاد + 1', 'booking']
  ];

  const FAMILIES = [
    { parent: 'أحمد سامي', phone: '0101 234 5678', kids: [
      { n: 'أحمد سامي (هو نفسه)', sport: 'football', group: 'جروب الصبح A', status: 'نشط' },
      { n: 'ليلى سامي', age: 7, sport: 'swimming', group: 'سباحة أطفال · مستوى 2', status: 'نشط' },
      { n: 'عمر سامي', age: 9, sport: 'karate', group: 'كاراتيه · أحزمة ملونة', status: 'نشط' }], monthly: 2430, discount: 10, due: 0 },
    { parent: 'كريم عادل', phone: '0100 555 1122', kids: [
      { n: 'كريم عادل (هو نفسه)', sport: 'padel', group: 'بادل · مستوى C', status: 'نشط' },
      { n: 'تيا كريم', age: 8, sport: 'swimming', group: 'سباحة أطفال · مستوى 2', status: 'نشط' }], monthly: 1710, discount: 10, due: 0 },
    { parent: 'هشام فؤاد', phone: '0122 303 4455', kids: [
      { n: 'نور هشام', age: 7, sport: 'swimming', group: 'سباحة أطفال · مستوى 2', status: 'ينتهي قريباً' },
      { n: 'آدم هشام', age: 10, sport: 'gymnastics', group: 'جمباز بنات · 6 لـ 9 سنين', status: 'متأخر' }], monthly: 1620, discount: 10, due: 810 },
    { parent: 'مجدي فؤاد', phone: '0111 909 2233', kids: [
      { n: 'يوسف مجدي', age: 10, sport: 'karate', group: 'كاراتيه · أحزمة ملونة', status: 'نشط' }], monthly: 800, discount: 0, due: 0 }
  ];

  const sport = id => SPORTS.find(s => s.id === id) || CATALOG.find(s => s.id === id);
  const has = (id, mod) => { const s = sport(id); return !!(s && s.on !== false && s.modules.includes(mod)); };

  root.MS = { ACADEMY, MODULES, SPORTS, CATALOG, GROUP_SPORT, NEW_GROUPS, KARATE, KARATE_EXAM, SWIM, GYM_SKILLS, GYM, COURTS, SLOTS, BOOKINGS, FAMILIES, sport, has,
    state: { sportFilter: 'all', progSport: 'karate', kid: 1, coachSport: 'karate' } };
})(typeof window !== 'undefined' ? window : globalThis);

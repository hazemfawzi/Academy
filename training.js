/* Weekly training plans built from templates by sport type, age group and level stage,
   plus nutrition tips by age and sport. A coach gets a ready plan for every session of
   the week (warm-up, main work, game, cool-down) aimed at the level skills the group has
   not mastered yet; the coach can adjust and approve it. Parents see the week's focus,
   exercises for home and a nutrition tip. */
(function (root) {
  'use strict';
  const AGES = { kids: { name: 'صغار', range: 'حتى 8 سنين' }, juniors: { name: 'ناشئين', range: '9 – 13' }, teens: { name: 'شباب', range: '14 – 17' }, adults: { name: 'كبار', range: '18+' } };
  const STAGES = { beginner: 'تأسيس', intermediate: 'تطوير', advanced: 'متقدم' };

  /* b = [title, details]. Each type: warm-ups, main drills per stage, games, cool-downs,
     weekly themes and exercises for home. */
  const TEMPLATES = {
    timed: {
      warmup: [['إحماء على الحافة', 'دوران الذراعين والكتفين، ثم دخول الماء بهدوء وطفو حر'], ['سباحة خفيفة', '4 × 25م بأي طريقة بهدوء مع تنفس منتظم'], ['ركلات بالبورد', '4 × 25م ركل بالبورد مع النفخ في الماء']],
      main: {
        beginner: [['الطفو والانزلاق', 'طفو نجمة على البطن والظهر ثم انزلاق من الحائط 5 مرات'], ['التنفس الإيقاعي', 'نفخ فقاعات تحت الماء 10 مرات ثم 10 مع لف الرأس'], ['ركل الحرة', '6 × 12م ركل بالبورد مع ركبة مستقيمة'], ['حركة الذراعين', 'وقوف في المياه الضحلة وتقليد سحبة الحرة 3 × 10']],
        intermediate: [['تكنيك الحرة', '6 × 25م مع التركيز على مد الذراع والتنفس كل 3 ضربات'], ['الظهر', '6 × 25م ظهر مع ثبات الرأس'], ['الدورانات', '8 دورانات عند الحائط والدفع تحت الماء'], ['تحمل هوائي', '4 × 50م براحة 30 ثانية']],
        advanced: [['مجموعة سرعة', '8 × 25م بأقصى سرعة براحة 40 ثانية'], ['تحمل', '3 × 200م بوتيرة ثابتة'], ['البدايات', '6 بدايات من المكعب مع انزلاق أطول مسافة'], ['تكنيك الفراشة', '6 × 25م تموج الجسم وتوقيت الذراعين']]
      },
      games: [['سباق تتابع', 'فريقين، كل لاعب 12م بالبورد'], ['جمع الحلقات', 'غطس لجمع حلقات من القاع'], ['المطاردة في الماء', 'لعبة مسك في المياه الضحلة']],
      cooldown: [['سباحة استرخاء', '100م ظهر بهدوء'], ['إطالة', 'إطالة الكتفين والفخذ على الحافة']],
      themes: ['التنفس والإيقاع', 'وضع الجسم والانسيابية', 'الركل القوي', 'السحب والدفع بالذراعين'],
      home: [['تمرين التنفس', 'نفخ فقاعات في طبق مياه 10 مرات بعد شهيق عميق'], ['تقوية الكتف', 'دوران الذراعين للأمام والخلف 3 × 15'], ['السوبرمان', 'نوم على البطن ورفع الذراعين والرجلين 3 × 20 ثانية'], ['ركل في الهوا', 'نوم على الظهر وركل منتظم 3 × 30 ثانية']]
    },
    team: {
      warmup: [['جري خفيف ومرونة', 'دورتين حول الملعب ثم إطالة حركية'], ['سلم التوافق', 'خطوات سريعة على سلم الرشاقة 6 مرات'], ['روندو 4×1', 'تمرير في دائرة ولاعب في النص يقطع']],
      main: {
        beginner: [['التحكم في الكورة', 'لمسات بباطن القدم ووجه القدم 3 × 1 دقيقة'], ['التمرير القصير', 'ثنائيات على مسافة 8 متر، 30 تمريرة لكل رجل'], ['الجري بالكورة', 'مسار أقماع متعرج ذهاب وعودة'], ['التسديد البسيط', 'تسديد من ثبات على مرمى صغير']],
        intermediate: [['تمرير تحت الضغط', '3 ضد 1 في مربع 10 × 10'], ['الاستلام والدوران', 'استلام بالقدم البعيدة والالتفاف للأمام'], ['المراوغة 1 ضد 1', 'مواجهات في ممر ضيق'], ['التسديد بعد الحركة', 'استلام وتسديد في لمستين']],
        advanced: [['البناء من الخلف', 'خروج بالكورة 6 ضد 4 من منطقة الجزاء'], ['الضغط العالي', 'استخلاص الكورة في 6 ثواني بعد فقدها'], ['الكرات العرضية', 'عرضيات وإنهاء من الجناحين'], ['التحولات', 'هجمة مرتدة سريعة 4 ضد 3']]
      },
      games: [['لعب مصغر 4 ضد 4', 'ملعب صغير ومرمى صغير بدون حارس'], ['لعب مصغر بلمستين', 'كل لاعب يلمس مرتين بالحد الأقصى'], ['مباراة تدريبية بشرط التمرير', 'الهدف بيتحسب بعد 5 تمريرات']],
      cooldown: [['جري خفيف', 'دورة واحدة هادية'], ['إطالة ثابتة', 'الفخذ الأمامي والخلفي والسمانة 20 ثانية لكل عضلة']],
      themes: ['التمرير والاستلام', 'المراوغة واللعب الفردي', 'التسديد والإنهاء', 'اللعب الجماعي والتمركز'],
      home: [['تنطيط الكورة', 'حاول تزود الرقم كل يوم، سجّل أحسن رقم'], ['حائط التمرير', 'تمرير على الحيطة بالقدمين 50 مرة'], ['الرشاقة', 'قفز جانبي فوق خط 3 × 20 ثانية'], ['البلانك', '3 × 20 ثانية']]
    },
    ranks: {
      warmup: [['إحماء حركي', 'جري خفيف، دوران المفاصل، قفز بالحبل دقيقتين'], ['الوقفات', 'تبديل الوقفات مع العدّ 3 مجموعات'], ['تحية وتركيز', 'وقفة الاستعداد والتنفس العميق']],
      main: {
        beginner: [['الكيهون الأساسي', 'لكمة مستقيمة وصدّ علوي في خط ذهاب وعودة'], ['الركلة الأمامية', 'ماي جيري 3 × 10 لكل رجل ببطء'], ['التوازن', 'وقوف على رجل واحدة 20 ثانية مع رفع الركبة'], ['أول كاتا', 'تعلّم أول 8 حركات من كاتا الحزام']],
        intermediate: [['تركيبات', 'صد + لكمة عكسية + ركلة 3 × 10'], ['الكاتا كاملة', 'أداء الكاتا 5 مرات مع التركيز على القوة والتوقيت'], ['العمل على الوسادة', 'ركلات دائرية على الوسادة 3 × 12'], ['كوميتي محكوم', 'تبادل هجوم ودفاع متفق عليه مع زميل']],
        advanced: [['كوميتي حر', 'جولات 1.5 دقيقة مع حكم'], ['سرعة الانطلاق', 'هجوم من مسافة على إشارة المدرب'], ['كاتا متقدمة', 'تفاصيل الإيقاع والكيمي'], ['تجهيز للاختبار', 'أداء متطلبات الحزام القادم كاملة']]
      },
      games: [['لعبة الإشارات', 'المدرب يرفع لون ولكل لون حركة'], ['مسك الشريط', 'كل لاعب يحمي الشريط اللي في وسطه'], ['تحدي التوازن', 'آخر واحد ثابت على رجل واحدة يكسب']],
      cooldown: [['إطالة', 'إطالة الحوض والفخذ والكتف'], ['تأمل', 'جلسة سيزا ودقيقة تنفس هادي']],
      themes: ['الوقفات والتوازن', 'اللكمات والصدود', 'الركلات', 'الكاتا والتجهيز للحزام'],
      home: [['الوقفات', 'وقفة كيبا داتشي 3 × 30 ثانية'], ['الكاتا', 'كرر الكاتا مرتين قدام المراية'], ['المرونة', 'إطالة الفخذ الجانبية 3 × 30 ثانية'], ['تمارين ضغط', 'ضغط على الركب 3 × 10']]
    },
    levels: {
      warmup: [['إحماء ومرونة', 'جري خفيف ثم دوران المفاصل'], ['الإطالة الحركية', 'رفع الرجل للأمام والجانب 10 مرات'], ['تقوية الجذع', 'هولو هولد 3 × 15 ثانية']],
      main: {
        beginner: [['الدحرجة', 'دحرجة أمامية على منحدر 6 مرات'], ['الوقوف على الكتفين', 'مع مساعدة المدرب 3 × 10 ثانية'], ['التوازن على العارضة المنخفضة', 'مشي أمامي وجانبي'], ['القفز', 'قفزة نجمة وقفزة مستقيمة على الترامبولين']],
        intermediate: [['الوقوف على اليدين', 'على الحائط 3 × 20 ثانية'], ['العجلة', 'عجلة على خط مستقيم 8 مرات'], ['الجسر', 'من النوم 3 × 10 ثانية'], ['روتين أرضي قصير', 'ربط 3 مهارات بسلاسة']],
        advanced: [['الشقلبة الخلفية', 'تدريب بالمساعدة والحزام'], ['الراوند أوف', 'من جري قصير'], ['الروتين الكامل', 'روتين أرضي بموسيقى'], ['المتوازي', 'تأرجح وكيب']]
      },
      games: [['تقليد الحيوانات', 'مشية الدب والسلطعون والضفدع'], ['المحطات', 'دائرة 4 محطات بدقيقة لكل محطة'], ['تحدي التجميد', 'وقفة توازن عند وقف الموسيقى']],
      cooldown: [['إطالة', 'وضع الطفل والفراشة والإطالة الأمامية'], ['تنفس', 'نوم على الظهر دقيقة']],
      themes: ['المرونة', 'القوة والتحكم', 'التوازن', 'ربط المهارات في روتين'],
      home: [['الإطالة الأمامية', 'جلوس ومد الرجلين ولمس الصوابع 3 × 20 ثانية'], ['هولو هولد', '3 × 15 ثانية'], ['الوقوف على رجل', '30 ثانية لكل رجل وعينك مقفولة'], ['الجسر', '3 × 10 ثانية']]
    },
    racket: {
      warmup: [['جري جانبي', 'خطوات جانبية وتقاطع على عرض الملعب'], ['تبادل خفيف', 'ضربات خفيفة قريب من الشبكة دقيقتين'], ['ظل الضربات', 'تقليد الفورهاند والباكهاند بدون كورة']],
      main: {
        beginner: [['المسكة والوقفة', 'المسكة الصح ووضع الجسم قبل الضربة'], ['الفورهاند', 'تغذية من المدرب 3 × 15 ضربة'], ['الباكهاند', 'تغذية من المدرب 3 × 15 ضربة'], ['الإرسال', 'إرسال تحت الوسط 20 مرة']],
        intermediate: [['الفولي', 'تبادل فولي على الشبكة 3 × 2 دقيقة'], ['الضربة من الحائط', 'خروج الكورة من الحائط الخلفي'], ['اللوب', 'لوب دفاعي من الخلف 3 × 10'], ['التمركز الثنائي', 'تحرك الثنائي مع بعض']],
        advanced: [['الباندخا', 'باندخا على الزوايا 3 × 12'], ['السماش', 'سماش وخروج الكورة 3 × 10'], ['تكتيك النقطة', 'بناء النقطة والانتقال للشبكة'], ['الضغط على الشبكة', 'سيناريوهات 2 ضد 2']]
      },
      games: [['نقاط مختصرة', 'لعب من نقطة 7 بإرسال بالتبادل'], ['الملك على الملعب', 'الثنائي الكسبان يفضل'], ['تحدي الدقة', 'إصابة أهداف على الأرض']],
      cooldown: [['إطالة', 'الكتف والساعد والسمانة'], ['مراجعة', 'دقيقتين مراجعة لأهم ملاحظة']],
      themes: ['الضربات الأرضية', 'الشبكة والفولي', 'الحيطان', 'التكتيك والتمركز'],
      home: [['تقوية الساعد', 'عصر كورة تنس 3 × 20'], ['خطوات القدم', 'خطوات جانبية سريعة 3 × 30 ثانية'], ['الضربة في الظل', 'فورهاند وباكهاند قدام المراية 20 مرة'], ['البلانك الجانبي', '3 × 20 ثانية لكل جنب']]
    },
    classes: {
      warmup: [['إحماء كارديو', 'جري في المكان وجامبنج جاك 4 دقايق'], ['حركية المفاصل', 'دوران الحوض والكتف والكاحل'], ['تنشيط', 'سكوات بوزن الجسم 2 × 15']],
      main: {
        beginner: [['دائرة أساسية', 'سكوات، ضغط على الركب، تجديف بالأستك، بلانك: 40 ثانية شغل و20 راحة × 3'], ['أسلوب الحركة', 'تعليم الطريقة الصح للهينج والسكوات'], ['كارديو خفيف', 'مشي سريع أو دراجة 8 دقايق'], ['الجذع', 'ديد بج وبيرد دوج 3 × 10']],
        intermediate: [['إيمراب', 'كل دقيقة: 10 كيتل بل سوينج + 8 ضغط × 10'], ['قوة', 'سكوات بالدمبل 4 × 10'], ['HIIT', '30 ثانية شغل و30 راحة × 10'], ['الجذع', 'بلانك بأشكال 3 × 30 ثانية']],
        advanced: [['أمراب 15 دقيقة', 'بيربي، ثراستر، بول أب'], ['قوة', 'ديدليفت 5 × 5'], ['تحمل', 'روئنج 5 × 500م'], ['مهارة', 'دابل أندر وهاند ستاند']]
      },
      games: [['تحدي الفريق', 'فريقين وعدد تكرارات أكتر في 5 دقايق'], ['سلم التكرارات', '1-2-3... لحد 10 بيربي وسكوات'], ['ريلاي', 'تتابع بالكيتل بل']],
      cooldown: [['إطالة', 'إطالة كل الجسم 5 دقايق'], ['تنفس', 'تنفس بطني دقيقتين']],
      themes: ['الأساس والحركة الصح', 'القوة', 'التحمل', 'السرعة والقدرة'],
      home: [['مشي', '30 دقيقة مشي سريع في الأيام اللي مفيهاش تمرين'], ['سكوات', '3 × 15'], ['بلانك', '3 × 30 ثانية'], ['إطالة', '10 دقايق قبل النوم']]
    }
  };

  const NUTRITION = {
    all: [['الميه', 'اشرب قبل التمرين بساعة، وكل 15–20 دقيقة جوه التمرين رشفات صغيرة'], ['قبل التمرين', 'وجبة خفيفة قبلها بساعة ونص لساعتين: سندوتش جبنة، موزة، أو زبادي بالشوفان'], ['بعد التمرين', 'خلال ساعة: بروتين ونشويات زي بيض وعيش أو فراخ ورز أو لبن وتمر'], ['الفطار', 'ماتروحش التمرين الصبح على معدة فاضية: فول أو بيض وعيش بلدي وخضار'], ['النوم', 'النوم الكويس جزء من التمرين: 9–11 ساعة للأطفال و8–10 للمراهقين']],
    kids: [['السناكس', 'بدل الشيبسي والحلويات: فاكهة، فشار في البيت، أو جبنة وخيار'], ['الكالسيوم', 'كوباية لبن أو زبادي في اليوم علشان العضم'], ['الميه', 'الطفل محتاج 1 – 1.5 لتر في اليوم، وأكتر في أيام التمرين والحر']],
    juniors: [['الطاقة', 'متصغرش الوجبات علشان الوزن؛ الجسم بيكبر ومحتاج طاقة'], ['الحديد', 'عدس وكبدة وسبانخ مع عصير برتقال يساعد على امتصاص الحديد'], ['الميه', '1.5 – 2 لتر في اليوم وزجاجة كاملة في التمرين']],
    teens: [['البروتين', 'بروتين في كل وجبة: بيض، فول، فراخ، سمك، لبن'], ['المكملات', 'مفيش داعي لمكملات أو بروتين باودر في السن ده من غير دكتور'], ['مشروبات الطاقة', 'ممنوعة؛ بتأثر على القلب والنوم']],
    adults: [['البروتين', '1.4 – 2 جرام لكل كيلو من وزنك في اليوم موزعين على الوجبات'], ['النشويات', 'زودها في أيام التمرين وقللها في أيام الراحة'], ['الكافيين', 'قهوة قبل التمرين بنص ساعة ممكن تساعد، وبلاش بعد العصر']],
    timed: [['قبل السباحة', 'متاكلش وجبة تقيلة قبل الحمام بأقل من ساعتين'], ['بعد الحمام', 'السباحة بتفتح النفس؛ جهز سناك صحي بدل الحلويات']],
    team: [['يوم المباراة', 'نشويات سهلة الهضم قبلها بـ 3 ساعات زي مكرونة أو رز'], ['الأملاح', 'في الحر اشرب ميه بشوية ملح وليمون أو عصير طبيعي']],
    ranks: [['الوزن', 'متحاولش تنزل وزن بسرعة قبل بطولة؛ ده خطر وبيضعف الأداء']],
    levels: [['الطاقة والوزن', 'الجمباز محتاج طاقة؛ التركيز على أكل متوازن مش على الريجيم']],
    racket: [['الماتشات الطويلة', 'خد موزة أو تمر بين الأشواط'], ['الأملاح', 'العرق الكتير محتاج ميه وأملاح']],
    classes: [['هدفك', 'لو هدفك تنزيل وزن: عجز بسيط في السعرات مع بروتين عالي، مش حرمان']]
  };

  const ageBand = a => a == null ? 'adults' : a <= 8 ? 'kids' : a <= 13 ? 'juniors' : a <= 17 ? 'teens' : 'adults';
  const ageOf = (dob, now = new Date()) => { if (!dob) return null; const d = new Date(dob + 'T12:00:00'); let a = now.getFullYear() - d.getFullYear(); if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
  const median = xs => { const s = xs.filter(x => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const pick = (list, i) => list[((i % list.length) + list.length) % list.length];
  const weekStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 1) % 7)); return x; }; /* weeks start on Saturday */
  const dayKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const weekNo = d => Math.floor(weekStart(d).getTime() / (7 * 86400000));

  /* Who is in the group: age band from the group range or the players' ages, and the
     stage from where most players are on the level ladder. */
  function profile(state, def, group, now = new Date()) {
    const members = state.members.filter(m => m.group === group.id);
    const age = group.ageMin != null ? Math.round((group.ageMin + group.ageMax) / 2) : median(members.map(m => ageOf(m.dob, now)));
    const levels = (def?.levels || []).filter(l => l.active !== false), idx = median(members.map(m => levels.findIndex(l => l.id === m.sportLevel)).filter(i => i >= 0));
    const ratio = idx == null || levels.length < 2 ? (/متقدم|advanced/i.test(group.name) ? 0.9 : /متوسط/.test(group.name) ? 0.5 : 0) : idx / (levels.length - 1);
    const level = idx != null ? levels[idx] : null;
    return { members, age, band: ageBand(age), stage: ratio < 0.34 ? 'beginner' : ratio < 0.67 ? 'intermediate' : 'advanced', level };
  }

  /* Level skills most of the group has not mastered yet, most needed first. */
  function focusSkills(state, prof) {
    if (!prof.level?.skills?.length) return [];
    const marks = state.skillMarks || {}, on = prof.members.filter(m => m.sportLevel === prof.level.id);
    return prof.level.skills.map(s => ({ ...s, missing: on.filter(m => !marks[m.id]?.[s.id]).length }))
      .filter(s => s.missing > 0).sort((a, b) => b.missing - a.missing).slice(0, 2);
  }

  /* A plan for one session from the template. */
  function generate(state, def, group, session, opts = {}) {
    const T = TEMPLATES[def?.type] || TEMPLATES.classes, prof = opts.profile || profile(state, def, group);
    const dur = session.duration || def?.duration || 60, w = weekNo(session.start), n = opts.index || 0, seed = w * 3 + n;
    const kids = prof.band === 'kids';
    const split = kids ? [0.17, 0.43, 0.3, 0.1] : prof.band === 'adults' ? [0.15, 0.6, 0.15, 0.1] : [0.15, 0.55, 0.2, 0.1];
    const mins = split.map(x => Math.max(5, Math.round(dur * x / 5) * 5)); mins[1] += dur - mins.reduce((a, b) => a + b, 0);
    const drills = T.main[prof.stage], skills = opts.skills || focusSkills(state, prof);
    const main = [pick(drills, seed), pick(drills, seed + 1)];
    if (skills[n % Math.max(1, skills.length)]) main[1] = ['مهارة المستوى: ' + skills[n % skills.length].name, `${skills[n % skills.length].missing} لاعب لسه محتاجين يتقنوها؛ تكرار بتغذية راجعة فردية`];
    const half = Math.round(mins[1] / 2 / 5) * 5;
    const blocks = [
      { part: 'warmup', title: pick(T.warmup, seed)[0], desc: pick(T.warmup, seed)[1], min: mins[0] },
      { part: 'main', title: main[0][0], desc: main[0][1], min: half },
      { part: 'main', title: main[1][0], desc: main[1][1], min: mins[1] - half },
      { part: 'game', title: pick(T.games, seed)[0], desc: pick(T.games, seed)[1], min: mins[2] },
      { part: 'cooldown', title: pick(T.cooldown, seed)[0], desc: pick(T.cooldown, seed)[1], min: mins[3] }
    ];
    if (def?.type === 'timed' && new Date(session.start).getDate() > 21 && n === 0) blocks[3] = { part: 'game', title: 'قياس زمن شهري', desc: 'سجّل زمن كل لاعب في 25م من شاشة القياس', min: mins[2] };
    return { theme: pick(T.themes, w), stage: prof.stage, band: prof.band, blocks, generated: true };
  }

  /* Plans for the group's sessions in the week of `day`; saved plans win over templates. */
  function week(state, def, group, day = new Date()) {
    const from = weekStart(day), to = new Date(from); to.setDate(to.getDate() + 7);
    const prof = profile(state, def, group), skills = focusSkills(state, prof);
    const sessions = state.sessions.filter(s => s.group === group.id && s.status !== 'cancelled' && new Date(s.start) >= from && new Date(s.start) < to).sort((a, b) => new Date(a.start) - new Date(b.start));
    return { from, to, profile: prof, skills, theme: pick((TEMPLATES[def?.type] || TEMPLATES.classes).themes, weekNo(from)),
      sessions: sessions.map((s, i) => ({ session: s, plan: state.trainingPlans?.[s.id] || generate(state, def, group, s, { index: i, profile: prof, skills }) })) };
  }

  function homework(def, prof, day = new Date()) { const T = TEMPLATES[def?.type] || TEMPLATES.classes, w = weekNo(day); return [pick(T.home, w), pick(T.home, w + 1)]; }
  function tips(type, band) { return [...(NUTRITION[band] || []), ...(NUTRITION[type] || []), ...NUTRITION.all]; }
  function tipOfDay(type, band, day = new Date()) { const list = tips(type, band); return pick(list, Math.floor(new Date(day).getTime() / 86400000)); }

  function validatePlan(blocks, duration) {
    const list = blocks.map(b => ({ part: b.part || 'main', title: String(b.title || '').trim(), desc: String(b.desc || '').trim(), min: Math.round(Number(b.min) || 0) })).filter(b => b.title);
    if (!list.length) throw Error('الخطة لازم يكون فيها جزء واحد على الأقل');
    if (list.some(b => b.min < 1)) throw Error('كل جزء محتاج مدة بالدقايق');
    const total = list.reduce((n, b) => n + b.min, 0);
    if (duration && Math.abs(total - duration) > 10) throw Error(`مجموع الأجزاء ${total} دقيقة والحصة ${duration} دقيقة`);
    return list;
  }

  const api = { AGES, STAGES, TEMPLATES, NUTRITION, ageBand, profile, focusSkills, generate, week, homework, tips, tipOfDay, validatePlan, weekStart, dayKey };
  root.TrainingCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined' || typeof V === 'undefined') return;

  /* =========================================================== browser */
  const db = V.db, SE = () => window.SportEngine;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  const PART = { warmup: 'إحماء', main: 'أساسي', game: 'تطبيق ولعب', cooldown: 'تهدئة' };
  const groupOf = id => db.state.groups.find(g => g.id === id);
  const defOf = g => g && SE()?.get(g.sport);
  const TR = window.Training = { ...api, groupId: '', day: new Date(), view: 'week' };
  TR.planFor = sid => { const s = db.session(sid), g = groupOf(s.group), d = defOf(g); return db.state.trainingPlans?.[sid] || week(db.state, d, g, s.start).sessions.find(x => x.session.id === sid)?.plan; };
  TR.save = (sid, blocks, note = '') => db.update(st => { const s = st.sessions.find(x => x.id === sid); if (!s) throw Error('الحصة مش موجودة'); const cur = TR.planFor(sid); st.trainingPlans = st.trainingPlans || {}; st.trainingPlans[sid] = { theme: cur?.theme || '', stage: cur?.stage, band: cur?.band, blocks: validatePlan(blocks, s.duration), note, by: 'المدرب', at: new Date().toISOString() }; });
  TR.approveWeek = groupId => db.update(st => { const g = st.groups.find(x => x.id === groupId), w = week(st, defOf(g), g, TR.day); st.trainingPlans = st.trainingPlans || {}; w.sessions.forEach(x => { if (!st.trainingPlans[x.session.id]) st.trainingPlans[x.session.id] = { ...x.plan, generated: false, by: 'اعتماد القالب', at: new Date().toISOString() }; }); });
  TR.reset = sid => db.update(st => { if (st.trainingPlans) delete st.trainingPlans[sid]; });
  const blocksHTML = plan => `<ol class="tp-blocks">${plan.blocks.map(b => `<li data-part="${E(b.part)}"><span class="tp-min">${b.min}<small>د</small></span><div><small>${E(PART[b.part] || '')}</small><b>${E(b.title)}</b><p>${E(b.desc)}</p></div></li>`).join('')}</ol>`;

  /* ---------- dashboard ---------- */
  if (typeof PAGES !== 'undefined') {
    const btn = (label, action, cls = '') => `<button type="button" class="sb-btn ${cls}" onclick="${E(action)}">${E(label)}</button>`;
    window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { plans: 'خطط التدريب' });
    PAGES.plans = () => {
      const U = window.AcademyUI || { branch: 'all', sport: 'all' };
      const groups = db.state.groups.filter(g => (U.branch === 'all' || g.branch === U.branch) && (U.sport === 'all' || g.sport === U.sport) && defOf(g));
      if (!groups.some(g => g.id === TR.groupId)) TR.groupId = groups[0]?.id || '';
      const tabs = `<div class="ac-tabs tp-tabs">${[['week', 'خطة الأسبوع'], ['library', 'مكتبة القوالب'], ['food', 'نصايح التغذية']].map(([k, l]) => `<button type="button" class="${TR.view === k ? 'selected' : ''}" onclick="Training.view='${k}';render()">${l}</button>`).join('')}</div>`;
      const head = `<header class="sb-head"><div><small>البرامج والجدول</small><h1>خطط التدريب</h1><p>كل حصة ليها خطة جاهزة من القالب المناسب للرياضة والسن والمستوى، ومركزة على مهارات المستوى اللي الجروب لسه ما أتقنهاش. المدرب يعدّل ويعتمد، وولي الأمر بيشوف هدف الأسبوع وتمارين البيت.</p></div></header>`;
      if (TR.view === 'library') return `<div class="sb-page tp-page">${head}${tabs}${library()}</div>`;
      if (TR.view === 'food') return `<div class="sb-page tp-page">${head}${tabs}${foodPage()}</div>`;
      const g = groupOf(TR.groupId), d = defOf(g);
      if (!g) return `<div class="sb-page tp-page">${head}${tabs}<div class="ac-empty"><b>مفيش جروبات</b><p>غيّر الفرع أو الرياضة.</p></div></div>`;
      const w = week(db.state, d, g, TR.day), approved = w.sessions.filter(x => !x.plan.generated).length;
      return `<div class="sb-page tp-page">${head}${tabs}
        <div class="tp-bar"><label><span>الجروب</span><select onchange="Training.groupId=this.value;render()">${groups.map(x => `<option value="${x.id}" ${x.id === g.id ? 'selected' : ''}>${E(defOf(x)?.ico || '')} ${E(x.name)} · ${E(x.branch)}</option>`).join('')}</select></label>
          <div class="py-month"><button type="button" class="sb-btn" aria-label="الأسبوع اللي فات" onclick="Training.day=new Date(Training.day.getTime()-7*864e5);render()">→</button><b>${E(fmt(w.from, { day: 'numeric', month: 'short' }))} – ${E(fmt(new Date(w.to.getTime() - 864e5), { day: 'numeric', month: 'short' }))}</b><button type="button" class="sb-btn" aria-label="الأسبوع الجاي" onclick="Training.day=new Date(Training.day.getTime()+7*864e5);render()">←</button></div>
          ${w.sessions.length && approved < w.sessions.length ? btn('اعتماد خطة الأسبوع', `Training.approve('${g.id}')`, 'primary') : ''}</div>
        <div class="tp-profile"><span><small>هدف الأسبوع</small><b>${E(w.theme)}</b></span><span><small>الفئة</small><b>${E(AGES[w.profile.band].name)} · ${E(AGES[w.profile.band].range)}</b></span><span><small>المرحلة</small><b>${E(STAGES[w.profile.stage])}${w.profile.level ? ' · ' + E(w.profile.level.name) : ''}</b></span><span><small>تركيز المهارات</small><b>${w.skills.map(s => E(s.name)).join('، ') || 'حسب القالب'}</b></span><span><small>اتعتمد</small><b>${approved} من ${w.sessions.length}</b></span></div>
        <div class="tp-week">${w.sessions.map(({ session: s, plan }) => `<article class="tp-session ${plan.generated ? '' : 'saved'}"><header><div><b>${E(fmt(s.start, { weekday: 'long', day: 'numeric', month: 'short' }))}</b><small>${E(fmt(s.start, { hour: 'numeric', minute: '2-digit' }))} · ${s.duration} دقيقة · ${E(s.coach || g.coach || '')}</small></div><span class="sa-chip ${plan.generated ? '' : 'ok'}">${plan.generated ? 'من القالب' : 'معتمدة'}</span></header>${blocksHTML(plan)}${plan.note ? `<p class="tp-note">${E(plan.note)}</p>` : ''}<footer>${btn('تعديل', `Training.edit('${s.id}')`)}${plan.generated ? '' : btn('رجوع للقالب', `Training.resetPlan('${s.id}')`)}</footer></article>`).join('') || '<div class="ac-empty"><b>مفيش حصص في الأسبوع ده</b><p>غيّر الأسبوع أو الجروب.</p></div>'}</div></div>`;
    };
    PAGES.plans_after = () => {};
    const library = () => `<div class="tp-lib">${Object.entries(TEMPLATES).filter(([type]) => !window.Edition?.single || window.Edition.def?.type === type).map(([type, T]) => { const sports = (SE()?.list() || []).filter(d => d.type === type).map(d => d.ico + ' ' + d.name).join('، ');
      return `<details class="tp-type"><summary><b>${E(SE()?.TYPES?.[type]?.name || type)}</b><small>${E(sports || 'مفيش رياضة من النوع ده')}</small></summary><p class="tp-themes">محاور الشهر: ${T.themes.map(E).join(' ← ')}</p><div class="tp-stages">${Object.entries(STAGES).map(([k, l]) => `<section><h4>${E(l)}</h4><ul>${T.main[k].map(([t, d]) => `<li><b>${E(t)}</b><small>${E(d)}</small></li>`).join('')}</ul></section>`).join('')}</div><div class="tp-stages"><section><h4>إحماء</h4><ul>${T.warmup.map(([t]) => `<li>${E(t)}</li>`).join('')}</ul></section><section><h4>ألعاب</h4><ul>${T.games.map(([t]) => `<li>${E(t)}</li>`).join('')}</ul></section><section><h4>تمارين البيت</h4><ul>${T.home.map(([t]) => `<li>${E(t)}</li>`).join('')}</ul></section></div></details>`; }).join('')}
      <p class="py-help">توزيع وقت الحصة: الصغار 17% إحماء و43% أساسي و30% لعب، والكبار 15% و60% و15%، والتهدئة 10% دايمًا.</p></div>`;
    const foodPage = () => `<div class="tp-food">${Object.entries(AGES).map(([k, a]) => `<section><h3>${E(a.name)} <small>${E(a.range)}</small></h3><ul>${(NUTRITION[k] || []).map(([t, d]) => `<li><b>${E(t)}</b><span>${E(d)}</span></li>`).join('')}</ul></section>`).join('')}<section><h3>للكل</h3><ul>${NUTRITION.all.map(([t, d]) => `<li><b>${E(t)}</b><span>${E(d)}</span></li>`).join('')}</ul></section></div><p class="tp-disclaimer">دي نصايح عامة بتظهر لأولياء الأمور في التطبيق حسب السن والرياضة، ومش بديل عن أخصائي تغذية. اللاعب اللي عنده ملاحظة صحية بيظهر له تنبيه يرجع للدكتور.</p>`;
    TR.approve = gid => V.run(() => { TR.approveWeek(gid); render(); toast('اتعتمدت خطة الأسبوع'); });
    TR.resetPlan = sid => V.run(() => { TR.reset(sid); render(); });
    TR.edit = sid => {
      const plan = TR.planFor(sid), s = db.session(sid);
      V.open(`<div class="ma-form tp-edit"><h3>خطة حصة ${E(fmt(s.start, { weekday: 'long', day: 'numeric', month: 'short' }))}</h3><p class="py-help">${s.duration} دقيقة · المجموع لازم يقرب من مدة الحصة (فرق 10 دقايق بالكتير)</p>
        <div id="tp-rows">${plan.blocks.map(b => row(b)).join('')}</div><button type="button" class="sb-btn" onclick="document.getElementById('tp-rows').insertAdjacentHTML('beforeend',Training.row({part:'main',title:'',desc:'',min:10}))">+ جزء</button>
        <label>ملاحظة للمدرب<textarea id="tp-note" rows="2">${E(plan.note || '')}</textarea></label><button type="button" class="sb-btn primary" onclick="Training.saveEdit('${sid}')">حفظ واعتماد</button></div>`);
    };
    const row = b => `<fieldset class="tp-row"><select aria-label="الجزء">${Object.entries(PART).map(([k, l]) => `<option value="${k}" ${b.part === k ? 'selected' : ''}>${l}</option>`).join('')}</select><input aria-label="العنوان" value="${E(b.title)}" placeholder="العنوان"><input aria-label="الدقايق" type="number" min="1" value="${b.min}"><textarea aria-label="التفاصيل" rows="2" placeholder="التفاصيل">${E(b.desc)}</textarea><button type="button" aria-label="حذف" onclick="this.parentElement.remove()">×</button></fieldset>`;
    TR.row = row;
    TR.saveEdit = sid => V.run(() => { const blocks = [...document.querySelectorAll('#tp-rows .tp-row')].map(f => { const [part, title, min, desc] = [f.querySelector('select').value, ...[...f.querySelectorAll('input')].map(i => i.value), f.querySelector('textarea').value]; return { part, title, min, desc }; }); TR.save(sid, blocks, document.getElementById('tp-note').value.trim()); V.close(); render(); toast('اتحفظت خطة الحصة'); });
  }

  /* ---------- apps ---------- */
  if (typeof APPS === 'undefined' || !APPS.member) return;
  const icon = (n, s = 20) => typeof ic === 'function' ? ic(n, s) : '';
  const back = `<button type="button" class="ax-icon-btn" aria-label="رجوع" onclick="go('home')">${icon('back', 20)}</button>`;

  /* Coach: the plan of a session in a sheet. */
  TR.sheet = sid => { const plan = TR.planFor(sid), s = db.session(sid), g = groupOf(s.group); V.open(`<div class="tp-sheet"><small>${E(g?.name || '')} · ${E(fmt(s.start, { weekday: 'long', hour: 'numeric', minute: '2-digit' }))}</small><h3>خطة الحصة · ${E(plan.theme)}</h3>${blocksHTML(plan)}${plan.note ? `<p class="tp-note">${E(plan.note)}</p>` : ''}<p class="ck-hint">${plan.generated ? 'خطة مقترحة من القالب. الإدارة أو المدرب الرئيسي يقدروا يعدلوها من الداشبورد.' : 'خطة معتمدة.'}</p></div>`); };

  /* Parent: the week's focus, sessions, home exercises and nutrition. */
  APPS.member.F.weekplan = () => {
    const AA = window.AcademyApps, m = AA?.viewer ? AA.viewer() : db.member('m0'), g = groupOf(m.group), d = defOf(g);
    if (!g || !d) return `<div class="ax"><header class="ax-top"><div class="ax-top-row">${back}<h2>خطة الأسبوع</h2></div></header></div>`;
    const w = week(db.state, d, g), band = ageBand(ageOf(m.dob)), self = m.id === 'm0', hw = homework(d, w.profile), list = tips(d.type, band).slice(0, 6);
    return `<div class="ax tp-app"><header class="ax-top ax-top-family"><div class="ax-top-row">${back}<div style="flex:1"><small>${E(d.ico)} ${E(g.name)}</small><h2>خطة الأسبوع</h2></div></div>${AA?.switcher ? AA.switcher() : ''}</header>
      <div class="ax-body"><section class="ax-hero" style="--c:${E(d.color || '#2d604c')}"><small>هدف الأسبوع</small><h3>${E(w.theme)}</h3><p>${w.skills.length ? 'الكابتن مركز على: ' + w.skills.map(s => E(s.name)).join(' و') : E(STAGES[w.profile.stage]) + ' · ' + E(AGES[w.profile.band].name)}</p></section>
        <div class="ax-section"><h3>حصص الأسبوع</h3></div>${w.sessions.map(({ session: s, plan }) => `<div class="ax-card tp-app-session"><div class="ax-date"><small>${E(fmt(s.start, { weekday: 'short' }))}</small><b>${new Date(s.start).getDate()}</b></div><div><b>${E(plan.blocks.filter(b => b.part === 'main').map(b => b.title).join(' · '))}</b><small>${E(fmt(s.start, { hour: 'numeric', minute: '2-digit' }))} · ${E(plan.blocks.find(b => b.part === 'game')?.title || '')}</small></div></div>`).join('') || '<p class="ck-hint">مفيش حصص الأسبوع ده.</p>'}
        <div class="ax-section"><h3>تمارين في البيت</h3></div><div class="ax-card tp-home">${hw.map(([t, x]) => `<div><span>${icon('bolt', 18)}</span><b>${E(t)}</b><small>${E(x)}</small></div>`).join('')}<p class="ck-hint">10 دقايق ${self ? '' : 'مع ' + E(m.name.split(' ')[0]) + ' '}في الأيام اللي مفيهاش تمرين كفاية.</p></div>
        <div class="ax-section"><h3>التغذية</h3></div>${m.medical ? `<div class="ax-banner warn">${icon('bell', 20)}<span><b>فيه ملاحظة صحية مسجلة</b><small>النصايح دي عامة؛ راجع الدكتور قبل أي تغيير في الأكل</small></span></div>` : ''}<div class="ax-card tp-tips">${list.map(([t, x]) => `<div><b>${E(t)}</b><small>${E(x)}</small></div>`).join('')}</div>
        <p class="ck-hint">نصايح عامة حسب السن والرياضة، مش بديل عن أخصائي تغذية.</p></div></div>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);

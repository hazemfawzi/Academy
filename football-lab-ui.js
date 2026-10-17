/* Football lab screens: «المهارات والقوالب» (session templates, skill categories, performance
   cards) and «اللوحة التكتيكية» (draw on a pitch, formations, record and replay moves, export).
   The coach app gets the performance cards and the saved boards. */
(function () {
  'use strict';
  const L = window.FootballLab;
  if (!L || typeof V === 'undefined') return;
  const db = V.db, FC = window.FootballCore;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  const DAYN = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const group = gid => db.state.groups.find(g => g.id === gid);
  const gName = g => g ? (FC?.isSquad(g) ? FC.squadName(g.fb.birthYear) : g.name) : '';
  const fbGroups = () => db.state.groups.filter(g => g.sport === 'football');
  const btn = (l, js, cls = '') => `<button type="button" class="sb-btn ${cls}" onclick="${E(js)}">${l}</button>`;
  const av = (name, n = 40) => window.KoraAvatars ? KoraAvatars.render(name, 'lb-av', n) : '';
  const skillsState = () => { if (!db.state.fbSkills) V.run(() => db.update(st => L.setup(st))); return db.state.fbSkills; };
  const after = () => { V.close && V.close(); if (typeof render === 'function' && typeof PAGES !== 'undefined') render(); if (typeof draw === 'function' && typeof APPS !== 'undefined') draw(); };
  const LB = window.FootballLabUI = { tab: 'templates', group: '', hidden: [], extra: [], cardGroup: '', board: null, tool: 'move', team: 'a', color: '#ef4444', width: 4, rec: false, speed: 1 };

  /* Short guides at the top of the pages: what the page is for and how to use it. */
  const guide = (title, steps) => `<details class="lb-guide"><summary>💡 ${title}</summary><ol>${steps.map(x => `<li>${x}</li>`).join('')}</ol></details>`;
  LB.GUIDES = {
    tactics: guide('الهدف من اللوحة التكتيكية وإزاي بتشتغل', ['<b>الهدف:</b> المدرب يشرح الفكرة للاعيبة بالصورة بدل الكلام: تمرين، تحرك، خطة ماتش، أو كرة ثابتة. ويتحفظ عشان يتعاد كل موسم.', 'اعمل لوحة جديدة، واختار الملعب (كامل، نص ملعب، خماسي) وفريق المرحلة اللي هتشرحله.', 'حط التشكيلة للفريقين (الأحمر فريقنا والأزرق المنافس)، واسحب أي لاعب لمكانه.', 'ارسم: ➜ سهم لمسار الكورة، ⇢ متقطع لتحرك لاعب من غير كورة، ⋯➜ منقّط للتمريرة، ◯ و▢ لتحديد منطقة ضغط أو مساحة.', '● سجّل الحركة وحرّك اللاعيبة خطوة خطوة (مثلًا الضغط بعد فقد الكورة)، وبعدين ▶ شغّلها قدام اللاعيبة.', 'احفظ واربطها بحصة جاية؛ المدرب بيلاقيها في تطبيقه، وتقدر تصدّرها صورة أو PDF وتبعتها في شات الفريق.']),
    skills: guide('إزاي المهارات والقوالب والتصنيفات بيشتغلوا مع بعض', ['<b>التصنيفات</b> هي المحاور اللي بنقيّم عليها اللاعب (بدني، فني، تكتيك، ذهني، جماعي). تقدر تغيّر اسمها ولونها أو تضيف تصنيف زي «الكرات الثابتة».', '<b>المهارات</b> هي البنود جوه كل تصنيف (مثلًا «التمرير القصير» جوه الفني). بتضيفها من مكتبة الكورة الجاهزة أو تكتبها بنفسك.', '<b>بطاقة الأداء:</b> المدرب يقيّم كل مهارة من 1 لـ 5 (من البطاقة أو من تطبيقه)، والنظام بيحسب نسبة كل تصنيف والمعدل العام والتحسن، ويرسم الشكل العنكبوتي لما يبقى فيه 3 تصنيفات متقيّمة. مناسبة أكتر لمدرسة الكرة؛ لاعيبة المسار ليهم كمان تقييم الأركان الأربعة.', '<b>القوالب:</b> حصة جاهزة بخطتها (إحماء، تمرينين على مهارات، لعب مصغر، تهدئة). «إضافة للجدول» بتعمل حصة حقيقية للفريق اللي تختاره في أقرب يوم مناسب.', 'الحصة المضافة من قالب بتظهر في «الجدول والحصص»، وخطتها في «خطط التدريب»، وعند المدرب في التطبيق، وولي الأمر بيشوف هدف الأسبوع.']),
    plans: guide('مين بيعمل خطة الأسبوع وبتظهر فين', ['<b>النظام بيعملها لوحده</b> لكل فريق ومجموعة: بيختار قالب مناسب لنوع الرياضة وسن اللاعيبة ومستواهم، ويركّز على المهارات اللي لسه أغلب الفريق ما أتقنهاش.', 'لو الحصة اتضافت من «المهارات والقوالب»، خطتها بتبقى خطة القالب نفسه.', '<b>المدرب بيراجع:</b> يعدّل أي حصة أو يرجّعها للمقترح، وبعدين «اعتماد خطة الأسبوع». الحالة بتبان على كل حصة: مقترحة تلقائيًا، قالب، أو معتمدة من المدرب.', '<b>بتظهر فين:</b> هنا للإدارة، في تطبيق المدرب (زرار «خطة الحصة» على الحصة الجاية)، وفي تطبيق ولي الأمر (كارت «هدف الأسبوع» وتمارين البيت ونصيحة التغذية).'])
  };

  /* =========================================================== performance card */
  const ring = (p, size = 120) => { const r = size / 2 - 9, c = 2 * Math.PI * r; return `<svg class="lb-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="10"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#2d604c" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c * p / 100} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="48%" text-anchor="middle" font-size="${size / 5}" font-weight="800" fill="#13261d">${p}%</text><text x="50%" y="66%" text-anchor="middle" font-size="${size / 11}" fill="#6b7c73">المعدل العام</text></svg>`; };
  const radar = cats => {
    const xs = cats.filter(c => c.pct != null), n = xs.length, R = 110, cx = 160, cy = 140, pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
    const grid = [.25, .5, .75, 1].map(f => `<polygon points="${xs.map((_, i) => pt(i, f).join(',')).join(' ')}" fill="none" stroke="#e3eae5"/>`).join('');
    const shape = xs.map((c, i) => pt(i, c.pct / 100).join(',')).join(' ');
    return `<svg class="lb-radar" viewBox="0 0 320 290">${grid}${xs.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}" stroke="#e3eae5"/>`).join('')}<polygon points="${shape}" fill="rgba(45,96,76,.22)" stroke="#2d604c" stroke-width="2"/>${xs.map((c, i) => { const [x, y] = pt(i, 1.2); return `<circle cx="${pt(i, c.pct / 100)[0]}" cy="${pt(i, c.pct / 100)[1]}" r="4" fill="${c.color}"/><text x="${x}" y="${y}" text-anchor="middle" font-size="11" fill="#29362f">${E(c.name)} ${c.pct}%</text>`; }).join('')}</svg>`;
  };
  LB.card = mid => {
    skillsState();
    const m = db.member(mid), g = group(m.group), k = L.card(db.state, mid), mates = db.state.members.filter(x => x.group === m.group), i = mates.findIndex(x => x.id === mid);
    const nav = mates.length > 1 ? `<span class="lb-nav"><button type="button" onclick="FootballLabUI.card('${mates[(i - 1 + mates.length) % mates.length].id}')">›</button>${i + 1} / ${mates.length}<button type="button" onclick="FootballLabUI.card('${mates[(i + 1) % mates.length].id}')">‹</button></span>` : '';
    V.open(`<div class="lb-card"><header class="lb-card-top"><b>بطاقة أداء — ${E(m.name)}</b>${nav}</header>
      <section class="lb-hero"><div class="lb-who">${av(m.name, 64)}<div><b>${E(m.name)}</b><small>${E(gName(g) || 'بدون فريق')}</small></div></div><small class="lb-date">${k.at ? E(fmt(k.at, { day: 'numeric', month: 'numeric', year: 'numeric' })) : 'لسه متقيّمش'}</small></section>
      <div class="lb-grid"><div class="lb-box lb-ringbox">${ring(k.overall)}<small>${k.count} مهارة مُقيّمة${k.trend != null ? ` · <b class="${k.trend >= 0 ? 'up' : 'down'}">${k.trend >= 0 ? '▲' : '▼'} ${Math.abs(k.trend)}%</b>` : ''}</small></div>
        <div class="lb-box">${k.radar ? radar(k.cats) : '<p class="lb-hint">قيّم مهارات في ٣ تصنيفات على الأقل عشان يظهر الرسم العنكبوتي.</p>'}</div></div>
      <div class="lb-box lb-skills">${k.skills.length ? k.cats.filter(c => c.count).map(c => `<h4><i style="background:${c.color}"></i>${E(c.name)} <small>${c.pct}%</small></h4>${k.skills.filter(s => s.cat === c.id).map(s => `<div class="lb-bar"><span>${E(s.name)}</span><i><em style="width:${s.pct}%;background:${c.color}"></em></i><b>${s.value}/5</b></div>`).join('')}`).join('') : '<p class="lb-hint">لسه مفيش مهارات مُقيّمة. ابدأ بالزرار تحت.</p>'}</div>
      <footer class="lb-foot">${btn('تقييم المهارات', `FootballLabUI.rateForm('${mid}')`, 'primary')}${btn('إغلاق', 'V.close()')}</footer></div>`);
  };
  LB.rateForm = mid => {
    const S = skillsState(), m = db.member(mid), last = {}; ((db.state.fbSkillRatings || {})[mid] || []).forEach(r => Object.assign(last, r.values));
    V.open(`<div class="ma-form fb-form"><h3>تقييم مهارات ${E(m.name)}</h3><p class="py-help">من 1 (محتاج شغل كتير) لـ 5 (ممتاز). سيب المهارة فاضية لو مش هتقيّمها النهارده.</p>
      ${S.categories.filter(c => S.skills.some(s => s.cat === c.id)).map(c => `<fieldset class="fb-fs"><legend style="color:${c.color}">${E(c.name)}</legend>${S.skills.filter(s => s.cat === c.id).map(s => `<div class="fb-rate"><span>${E(s.name)}</span><span class="fb-seg">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="lr-${s.id}" value="${v}" ${last[s.id] === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</span></div>`).join('')}</fieldset>`).join('')}
      <button type="button" class="sb-btn primary ax-btn" onclick="FootballLabUI.saveRate('${mid}')">حفظ التقييم</button></div>`);
  };
  LB.saveRate = mid => V.run(() => { const S = db.state.fbSkills, values = {}; S.skills.forEach(s => { const v = document.querySelector(`[name="lr-${s.id}"]:checked`)?.value; if (v) values[s.id] = v; }); db.update(st => L.rate(st, mid, values, { by: group(db.member(mid).group)?.coach || 'المدرب' })); toast('اتحفظ التقييم'); LB.card(mid); });

  /* =========================================================== tactical board drawing */
  const SIZE = { full: [1050, 680], half: [560, 680], small: [700, 440] };
  const TEAM = { a: '#ef4444', b: '#3b82f6' };
  const pitch = (field, W, H) => {
    const L1 = `fill="none" stroke="#fff" stroke-width="3"`;
    if (field === 'half') return `<rect width="${W}" height="${H}" fill="#15803d"/>${[0, 1, 2, 3, 4, 5, 6].map(i => i % 2 ? `<rect x="${i * W / 7}" width="${W / 7}" height="${H}" fill="#16a34a" opacity=".35"/>` : '').join('')}<rect x="10" y="10" width="${W - 20}" height="${H - 20}" ${L1}/><path d="M10 ${H / 2 - 92} a92 92 0 0 1 0 184" ${L1}/><rect x="${W - 175}" y="${H / 2 - 165}" width="165" height="330" ${L1}/><rect x="${W - 65}" y="${H / 2 - 75}" width="55" height="150" ${L1}/><circle cx="${W - 120}" cy="${H / 2}" r="3" fill="#fff"/>`;
    return `<rect width="${W}" height="${H}" fill="#15803d"/>${[...Array(10)].map((_, i) => i % 2 ? `<rect x="${i * W / 10}" width="${W / 10}" height="${H}" fill="#16a34a" opacity=".35"/>` : '').join('')}<rect x="10" y="10" width="${W - 20}" height="${H - 20}" ${L1}/><line x1="${W / 2}" y1="10" x2="${W / 2}" y2="${H - 10}" stroke="#fff" stroke-width="3"/><circle cx="${W / 2}" cy="${H / 2}" r="${H * .135}" ${L1}/><circle cx="${W / 2}" cy="${H / 2}" r="3" fill="#fff"/>
      ${[0, 1].map(s => { const x = s ? W - 10 : 10, d = s ? -1 : 1, bw = W * .157, bh = H * .6, sw = W * .052, sh = H * .27; return `<rect x="${s ? x - bw : x}" y="${(H - bh) / 2}" width="${bw}" height="${bh}" ${L1}/><rect x="${s ? x - sw : x}" y="${(H - sh) / 2}" width="${sw}" height="${sh}" ${L1}/><circle cx="${x + d * W * .105}" cy="${H / 2}" r="3" fill="#fff"/>`; }).join('')}`;
  };
  const markers = `<defs>${['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#111827', '#ffffff'].map(c => `<marker id="ar${c.slice(1)}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs>`;
  const drawItem = (x, W, H, i) => {
    const P = p => `${p[0] * W},${p[1] * H}`;
    if (x.t === 'player') return `<g class="lb-it lb-pl" data-i="${i}" transform="translate(${x.x * W} ${x.y * H})"><circle r="17" fill="${TEAM[x.team] || '#ef4444'}" stroke="#fff" stroke-width="3"/><text y="5" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">${x.n ?? ''}</text></g>`;
    if (x.t === 'ball') return `<g class="lb-it lb-ball" data-i="${i}" transform="translate(${x.x * W} ${x.y * H})"><circle r="9" fill="#fff" stroke="#111" stroke-width="2"/><path d="M-4 -3l4-3 4 3-2 5h-4z" fill="#111"/></g>`;
    const style = `stroke="${x.color}" stroke-width="${x.w || 4}" fill="none" stroke-linecap="round"`, mk = `marker-end="url(#ar${(x.color || '#111').slice(1)})"`;
    if (x.t === 'line') return `<line class="lb-it" data-i="${i}" x1="${x.a[0] * W}" y1="${x.a[1] * H}" x2="${x.b[0] * W}" y2="${x.b[1] * H}" ${style} ${x.kind !== 'line' ? mk : ''} ${x.kind === 'run' ? 'stroke-dasharray="12 9"' : x.kind === 'pass' ? 'stroke-dasharray="2 9"' : ''}/>`;
    if (x.t === 'free') return `<polyline class="lb-it" data-i="${i}" points="${x.pts.map(P).join(' ')}" ${style}/>`;
    if (x.t === 'circle') return `<ellipse class="lb-it" data-i="${i}" cx="${(x.a[0] + x.b[0]) / 2 * W}" cy="${(x.a[1] + x.b[1]) / 2 * H}" rx="${Math.abs(x.b[0] - x.a[0]) / 2 * W}" ry="${Math.abs(x.b[1] - x.a[1]) / 2 * H}" ${style} fill-opacity=".15" fill="${x.color}"/>`;
    if (x.t === 'rect') return `<rect class="lb-it" data-i="${i}" x="${Math.min(x.a[0], x.b[0]) * W}" y="${Math.min(x.a[1], x.b[1]) * H}" width="${Math.abs(x.b[0] - x.a[0]) * W}" height="${Math.abs(x.b[1] - x.a[1]) * H}" ${style} fill-opacity=".15" fill="${x.color}"/>`;
    return '';
  };
  /* Drawings first, players and the ball on top. */
  const itemsHTML = b => { const [W, H] = SIZE[b.field] || SIZE.full; return b.items.map((x, i) => x.t === 'player' || x.t === 'ball' ? '' : drawItem(x, W, H, i)).join('') + b.items.map((x, i) => x.t === 'player' || x.t === 'ball' ? drawItem(x, W, H, i) : '').join(''); };
  LB.svg = (b, cls = '') => { const [W, H] = SIZE[b.field] || SIZE.full; return `<svg class="lb-pitch ${cls}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${markers}${pitch(b.field, W, H)}<g class="lb-items">${itemsHTML(b)}</g></svg>`; };

  /* =========================================================== dashboard */
  if (typeof PAGES !== 'undefined') {
    window.PAGE_TITLES = Object.assign(window.PAGE_TITLES || {}, { skills: 'المهارات والقوالب', tactics: 'اللوحة التكتيكية' });

    /* ---------- skills, categories, templates, cards ---------- */
    PAGES.skills = () => {
      const S = skillsState(), gs = fbGroups();
      if (!gs.some(g => g.id === LB.group)) LB.group = gs[0]?.id || '';
      const tabs = `<nav class="tp-tabs fb-tabs">${[['templates', 'قوالب الحصص'], ['cats', 'التصنيفات والمهارات'], ['cards', 'بطاقات الأداء']].map(([k, l]) => `<button type="button" class="${LB.tab === k ? 'selected' : ''}" onclick="FootballLabUI.tab='${k}';render()">${l}</button>`).join('')}</nav>`;
      const head = `<header class="sb-head"><div><small>البرامج والجدول</small><h1>المهارات والقوالب</h1><p>مكتبة مهارات الكورة، تصنيفاتها، قوالب حصص جاهزة تضيفها للجدول بضغطة، وبطاقة أداء لكل لاعب.</p></div></header>`;
      let body = '';
      if (LB.tab === 'templates') {
        const list = [...L.TEMPLATES, ...LB.extra].filter(t => !LB.hidden.includes(t.id));
        body = `<div class="lb-toolbar"><label class="lb-for">للفريق أو المجموعة<select onchange="FootballLabUI.group=this.value">${gs.map(g => `<option value="${g.id}" ${LB.group === g.id ? 'selected' : ''}>${E(gName(g))}</option>`).join('')}</select></label>
          <details class="lb-drop"><summary>✨ من مهارة كرة قدم</summary><div>${L.library().map(x => `<h5>${E(x.group)}</h5>${x.skills.map(s => `<button type="button" onclick="FootballLabUI.fromSkill(${E(JSON.stringify(s))})">${E(s)}</button>`).join('')}`).join('')}</div></details>
          ${btn('➕ إضافة كل القوالب للجدول', 'FootballLabUI.addAll()')}${LB.hidden.length ? btn('إظهار المخفي', 'FootballLabUI.hidden=[];render()', 'quiet') : ''}</div>
          <section class="lb-templates"><h3>✨ قوالب جلسات جاهزة من مختص كرة قدم</h3><p class="py-help">اضغط «إضافة للجدول» عشان القالب يتحط كحصة في أقرب يوم مناسب للفريق المختار، بخطته (إحماء، تمرينين، لعب مصغر، تهدئة). أو اخفيه لو مش محتاجه.</p>
          <div class="lb-tgrid">${list.map(t => `<article class="lb-tcard"><button type="button" class="lb-x" aria-label="إخفاء" onclick="FootballLabUI.hidden.push('${t.id}');render()">×</button><b>${E(t.name)}</b><small>${DAYN[t.day]} • ${t.from} - ${t.to}</small><span class="lb-chip">${E(t.tag)}</span><button type="button" class="lb-plan" onclick="FootballLabUI.plan('${t.id}')">الخطة</button><button type="button" class="lb-add" onclick="FootballLabUI.toSchedule('${t.id}')">＋ إضافة للجدول</button></article>`).join('')}</div></section>`;
      } else if (LB.tab === 'cats') {
        body = `<div class="lb-toolbar">${btn('+ تصنيف جديد', 'FootballLabUI.catForm()', 'primary')}<details class="lb-drop"><summary>📚 إضافة من مكتبة المهارات</summary><div>${L.library().map(x => `<h5>${E(x.group)}</h5>${x.skills.map(s => `<button type="button" onclick="FootballLabUI.fromLibrary(${E(JSON.stringify(s))},'${x.cat}')">${E(s)}${S.skills.some(k => k.name === s) ? ' ✓' : ''}</button>`).join('')}`).join('')}</div></details></div>
          <div class="lb-cats">${S.categories.map(c => { const sk = S.skills.filter(s => s.cat === c.id); return `<section class="lb-cat"><header><i style="background:${c.color}"></i><b>${E(c.name)}</b><span class="lb-chip">${sk.length} مهارة</span><span class="lb-icons"><button type="button" title="تعديل" onclick="FootballLabUI.catForm('${c.id}')">✎</button><button type="button" title="حذف" class="del" onclick="FootballLabUI.delCat('${c.id}')">🗑</button></span></header>
            <div class="lb-skilllist">${sk.map(s => `<span class="lb-skill">${E(s.name)}<button type="button" aria-label="حذف" onclick="FootballLabUI.delSkill('${s.id}')">×</button></span>`).join('')}<form class="lb-addskill" onsubmit="event.preventDefault();FootballLabUI.addSkill('${c.id}',this.elements[0].value)"><input placeholder="+ مهارة جديدة"><button type="submit">إضافة</button></form></div></section>`; }).join('')}</div>`;
      } else {
        if (!gs.some(g => g.id === LB.cardGroup)) LB.cardGroup = gs.find(g => db.state.members.some(m => m.group === g.id))?.id || '';
        const ms = db.state.members.filter(m => m.group === LB.cardGroup);
        body = `<div class="lb-toolbar"><label class="lb-for">الفريق أو المجموعة<select onchange="FootballLabUI.cardGroup=this.value;render()">${gs.map(g => `<option value="${g.id}" ${LB.cardGroup === g.id ? 'selected' : ''}>${E(gName(g))}</option>`).join('')}</select></label></div>
          <div class="lb-players">${ms.map(m => { const k = L.card(db.state, m.id); return `<button type="button" class="lb-pcard" onclick="FootballLabUI.card('${m.id}')">${av(m.name, 44)}<span><b>${E(m.name)}</b><small>${k.count ? k.count + ' مهارة مُقيّمة' : 'لسه متقيّمش'}</small></span><em class="${k.count ? '' : 'none'}">${k.count ? k.overall + '%' : '—'}</em></button>`; }).join('') || '<p class="fb-empty">مفيش لاعيبة في الاختيار ده.</p>'}</div>`;
      }
      return `<div class="sb-page lb-page">${head}${LB.GUIDES.skills}${tabs}${body}</div>`;
    };
    PAGES.skills_after = () => {};
    { const basePlans = PAGES.plans; if (basePlans) PAGES.plans = function () { const html = basePlans.apply(this, arguments), at = html.indexOf('</header>'); return at < 0 ? html : html.slice(0, at + 9) + LB.GUIDES.plans + html.slice(at + 9); }; }
    const findT = tid => [...L.TEMPLATES, ...LB.extra].find(t => t.id === tid);
    LB.fromSkill = name => { const t = L.fromSkill(name); if (!LB.extra.some(x => x.id === t.id)) LB.extra.unshift(t); LB.hidden = LB.hidden.filter(x => x !== t.id); document.querySelectorAll('.lb-drop[open]').forEach(d => d.open = false); render(); toast('اتعمل قالب: ' + t.name); };
    LB.plan = tid => { const t = findT(tid); V.open(`<div class="ma-form fb-form"><h3>${E(t.name)}</h3><p class="py-help">${DAYN[t.day]} · ${t.from}–${t.to} · ${E(t.tag)}</p><ol class="lb-blocks">${L.blocks(t).map(b => `<li><b>${E(b.name)}</b><span>${b.min} دقيقة</span><p>${E(b.text)}</p></li>`).join('')}</ol>${btn('＋ إضافة للجدول', `FootballLabUI.toSchedule('${t.id}')`, 'primary ax-btn')}</div>`); };
    LB.toSchedule = tid => V.run(() => { const t = findT(tid); let s; db.update(st => { s = L.toSession(st, t, LB.group); }); V.close && V.close(); render(); toast(`اتضافت ${t.name} لـ ${gName(group(LB.group))} يوم ${fmt(s.start, { weekday: 'long', day: 'numeric', month: 'short' })}`); });
    LB.addAll = () => V.run(() => { const list = [...L.TEMPLATES, ...LB.extra].filter(t => !LB.hidden.includes(t.id)); db.update(st => list.forEach(t => L.toSession(st, t, LB.group))); render(); toast(`اتضافت ${list.length} حصص لـ ${gName(group(LB.group))}`); });
    LB.catForm = (cid = '') => { const S = skillsState(), c = S.categories.find(x => x.id === cid); V.open(`<div class="ma-form fb-form"><h3>${c ? 'تعديل التصنيف' : 'تصنيف جديد'}</h3><label>الاسم<input id="lb-cn" value="${E(c?.name || '')}" placeholder="مثلًا: الكرات الثابتة"></label><label>اللون<span class="lb-colors">${L.COLORS.map((x, i) => `<label><input type="radio" name="lb-cc" value="${x}" ${(c?.color || L.COLORS[S.categories.length % L.COLORS.length]) === x ? 'checked' : ''}><i style="background:${x}"></i></label>`).join('')}</span></label>${btn('حفظ', `FootballLabUI.saveCat('${cid}')`, 'primary ax-btn')}</div>`); };
    LB.saveCat = cid => V.run(() => { db.update(st => L.saveCategory(st, { id: cid || undefined, name: document.getElementById('lb-cn').value, color: document.querySelector('[name=lb-cc]:checked')?.value })); after(); toast('اتحفظ التصنيف'); });
    LB.delCat = cid => { const S = skillsState(), c = S.categories.find(x => x.id === cid), n = S.skills.filter(s => s.cat === cid).length; if (!confirm(`حذف «${c.name}»؟${n ? ` مهاراته (${n}) هتتنقل لـ «عام».` : ''}`)) return; V.run(() => db.update(st => L.removeCategory(st, cid))); render(); toast('اتحذف التصنيف'); };
    LB.addSkill = (cid, name) => V.run(() => { db.update(st => L.addSkill(st, cid, name)); render(); });
    LB.fromLibrary = (name, cat) => V.run(() => { db.update(st => { const S = L.setup(st), c = S.categories.find(x => x.id === 'cat-' + cat) || S.categories[0]; L.addSkill(st, c.id, name); }); render(); toast('اتضافت ' + name); });
    LB.delSkill = sid => { V.run(() => db.update(st => L.removeSkill(st, sid))); render(); };

    /* ---------- tactical board ---------- */
    const blank = () => ({ id: '', title: 'لوحة تكتيكية جديدة', field: 'full', squad: '', category: '', tags: '', session: '', notes: '', items: [...L.formation('4-3-3', 'a'), { t: 'ball', x: .5, y: .5 }], frames: [] });
    let hist = [], fut = [];
    const snap = () => JSON.stringify(LB.board.items);
    const push = () => { hist.push(snap()); if (hist.length > 80) hist.shift(); fut = []; };
    PAGES.tactics = () => {
      if (!LB.board) {
        const list = (db.state.fbBoards || []).slice().sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
        return `<div class="sb-page lb-page"><header class="sb-head"><div><small>البرامج والجدول</small><h1>اللوحة التكتيكية</h1><p>ارسم التمرين أو خطة الماتش على الملعب: تشكيلات جاهزة، أسهم وتحركات، تسجيل الحركة وتشغيلها، وتصدير صورة أو PDF للاعيبة.</p></div>${btn('+ لوحة جديدة', 'FootballLabUI.edit()', 'primary')}</header>
          ${LB.GUIDES.tactics}<div class="lb-boards">${list.map(b => `<button type="button" class="lb-bcard" onclick="FootballLabUI.edit('${b.id}')">${LB.svg(b, 'mini')}<span><b>${E(b.title)}</b><small>${E(L.FIELDS[b.field])}${b.squad ? ' · ' + E(gName(group(b.squad))) : ''}${b.category ? ' · ' + E(b.category) : ''}</small>${b.tags.length ? `<span class="lb-tags">${b.tags.map(t => `<i>${E(t)}</i>`).join('')}</span>` : ''}</span></button>`).join('') || '<p class="fb-empty">مفيش لوحات لسه. ابدأ بلوحة جديدة.</p>'}</div></div>`;
      }
      const b = LB.board, squads = fbGroups(), sessions = b.squad ? db.state.sessions.filter(s => s.group === b.squad && s.status === 'scheduled' && new Date(s.start) > new Date()).slice(0, 8) : [];
      const tool = (k, ico, t) => `<button type="button" class="lb-tool ${LB.tool === k ? 'on' : ''}" title="${t}" onclick="FootballLabUI.setTool('${k}')">${ico}</button>`;
      return `<div class="sb-page lb-page lb-editor"><div class="lb-edhead"><button type="button" class="sb-btn quiet" onclick="FootballLabUI.board=null;render()">→</button><input class="lb-title" value="${E(b.title)}" oninput="FootballLabUI.board.title=this.value">${btn('💾 حفظ', 'FootballLabUI.save()', 'primary')}</div>
        <div class="lb-edgrid"><aside class="lb-side">
          <label>الملعب<select onchange="FootballLabUI.board.field=this.value;FootballLabUI.paint()">${Object.entries(L.FIELDS).map(([k, v]) => `<option value="${k}" ${b.field === k ? 'selected' : ''}>كرة قدم — ${v}</option>`).join('')}</select></label>
          <label>الفئة العمرية / الفريق<select onchange="FootballLabUI.board.squad=this.value;render()"><option value="">—</option>${squads.map(g => `<option value="${g.id}" ${b.squad === g.id ? 'selected' : ''}>${E(gName(g))}</option>`).join('')}</select></label>
          <label>التصنيف<input value="${E(b.category)}" placeholder="هجومي، دفاعي، كرات ثابتة…" oninput="FootballLabUI.board.category=this.value"></label>
          <label>الوسوم (مفصولة بفواصل)<input value="${E(Array.isArray(b.tags) ? b.tags.join('، ') : b.tags)}" placeholder="ضغط عالي، تمرير قصير" oninput="FootballLabUI.board.tags=this.value"></label>
          <label>جلسة الحضور (اختياري)<select onchange="FootballLabUI.board.session=this.value"><option value="">— بدون ربط —</option>${sessions.map(s => `<option value="${s.id}" ${b.session === s.id ? 'selected' : ''}>${E(fmt(s.start, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}</option>`).join('')}</select></label>
          <label>ملاحظات المدرب (خاصة)<textarea rows="5" placeholder="ملاحظات لا يراها اللاعبون…" oninput="FootballLabUI.board.notes=this.value">${E(b.notes)}</textarea></label>
          ${b.id ? `<button type="button" class="lb-delb" onclick="FootballLabUI.remove()">حذف اللوحة</button>` : ''}</aside>
        <section class="lb-main"><div class="lb-tools">
          <div class="lb-row">${tool('move', '✥', 'تحريك')}${tool('pen', '✎', 'رسم حر')}${tool('line', '—', 'خط')}${tool('arrow', '➜', 'سهم')}${tool('run', '⇢', 'تحرك (متقطع)')}${tool('pass', '⋯➜', 'تمريرة')}${tool('circle', '◯', 'دائرة')}${tool('rect', '▢', 'مستطيل')}${tool('erase', '⌫', 'ممحاة')}${tool('ball', '⚽', 'مكان الكورة')}</div>
          <div class="lb-row"><span class="lb-colorset">${['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#111827', '#ffffff'].map(c => `<button type="button" class="${LB.color === c ? 'on' : ''}" style="background:${c}" onclick="FootballLabUI.color='${c}';render()" aria-label="لون"></button>`).join('')}</span><input type="range" min="2" max="10" value="${LB.width}" oninput="FootballLabUI.width=Number(this.value)" aria-label="سُمك الخط"><button type="button" class="sb-btn quiet small" onclick="FootballLabUI.undo()">↶</button><button type="button" class="sb-btn quiet small" onclick="FootballLabUI.redo()">↷</button><button type="button" class="sb-btn quiet small" onclick="FootballLabUI.clearDraw()">🗑 مسح الرسم</button></div>
          <div class="lb-row"><span class="lb-lbl">الفريق:</span>${['a', 'b'].map(t => `<button type="button" class="lb-team ${LB.team === t ? 'on' : ''}" style="background:${TEAM[t]}" onclick="FootballLabUI.team='${t}';render()"></button>`).join('')}${btn('+ لاعب', 'FootballLabUI.addPlayer()', 'quiet small')}${btn('حذف الفريق', 'FootballLabUI.dropTeam()', 'quiet small')}<span class="lb-lbl">تشكيلة:</span>${Object.keys(L.FORMATIONS).map(f => `<button type="button" class="lb-form" onclick="FootballLabUI.formation('${f}')">${f}</button>`).join('')}</div>
          <div class="lb-row">${btn(LB.rec ? '⏹ إيقاف التسجيل' : '● تسجيل الحركة', 'FootballLabUI.record()', LB.rec ? 'primary small' : 'quiet small')}${btn('▶ تشغيل', 'FootballLabUI.play()', 'quiet small')}<select onchange="FootballLabUI.speed=Number(this.value)" aria-label="السرعة">${[0.5, 1, 2].map(s => `<option value="${s}" ${LB.speed === s ? 'selected' : ''}>${s}x</option>`).join('')}</select><small class="lb-lbl">${b.frames.length ? b.frames.length + ' حركة مسجلة' : 'حرّك اللاعيبة وانت بتسجّل'}</small>${b.frames.length ? btn('حذف التسجيل', 'FootballLabUI.board.frames=[];render()', 'quiet small') : ''}<span class="lb-exp">${btn('⤓ PNG', "FootballLabUI.export('png')", 'quiet small')}${btn('JPEG', "FootballLabUI.export('jpeg')", 'quiet small')}${btn('PDF', "FootballLabUI.export('pdf')", 'quiet small')}</span></div></div>
          <div id="lb-stage" class="lb-stage">${LB.svg(b)}</div></section></div></div>`;
    };
    PAGES.tactics_after = () => LB.bind();
    LB.edit = (bid = '') => { const b = (db.state.fbBoards || []).find(x => x.id === bid); LB.board = b ? JSON.parse(JSON.stringify({ ...b, tags: b.tags.join('، ') })) : blank(); hist = []; fut = []; LB.rec = false; go('tactics'); render(); };
    /* The pitch is redrawn when the field changes; drags and drawings only redraw the items. */
    LB.paint = () => { const g = document.querySelector('#lb-stage .lb-items'), svg = document.querySelector('#lb-stage svg'), [W, H] = SIZE[LB.board.field] || SIZE.full; if (g && svg && svg.getAttribute('viewBox') === `0 0 ${W} ${H}`) { g.innerHTML = itemsHTML(LB.board); return; } const st = document.getElementById('lb-stage'); if (st) { st.innerHTML = LB.svg(LB.board); LB.bind(); } };
    LB.setTool = k => { LB.tool = k; render(); };
    LB.undo = () => { if (!hist.length) return; fut.push(snap()); LB.board.items = JSON.parse(hist.pop()); LB.paint(); };
    LB.redo = () => { if (!fut.length) return; hist.push(snap()); LB.board.items = JSON.parse(fut.pop()); LB.paint(); };
    LB.clearDraw = () => { push(); LB.board.items = LB.board.items.filter(x => x.t === 'player' || x.t === 'ball'); LB.paint(); };
    LB.addPlayer = () => { push(); const n = LB.board.items.filter(x => x.t === 'player' && x.team === LB.team).length + 1; LB.board.items.push({ t: 'player', team: LB.team, n, x: LB.team === 'a' ? .3 : .7, y: .5 }); LB.paint(); };
    LB.dropTeam = () => { push(); LB.board.items = LB.board.items.filter(x => !(x.t === 'player' && x.team === LB.team)); LB.paint(); };
    LB.formation = f => { push(); LB.board.items = LB.board.items.filter(x => !(x.t === 'player' && x.team === LB.team)).concat(L.formation(f, LB.team)); LB.paint(); };
    const positions = () => LB.board.items.map(x => x.t === 'player' || x.t === 'ball' ? [x.x, x.y] : null);
    LB.record = () => { LB.rec = !LB.rec; if (LB.rec) LB.board.frames = [positions()]; render(); toast(LB.rec ? 'التسجيل شغال: حرّك اللاعيبة' : `اتسجلت ${LB.board.frames.length} حركة`); };
    LB.play = () => {
      const fr = LB.board.frames; if (fr.length < 2) return toast('سجّل حركة الأول');
      const keep = positions(), step = 900 / LB.speed; let k = 0;
      const tick = () => { if (k >= fr.length - 1) { LB.board.items.forEach((x, i) => { if (keep[i]) [x.x, x.y] = keep[i]; }); return LB.paint(); } const A = fr[k], B = fr[k + 1], t0 = performance.now();
        const anim = now => { const p = Math.min(1, (now - t0) / step); LB.board.items.forEach((x, i) => { if (A[i] && B[i]) { x.x = A[i][0] + (B[i][0] - A[i][0]) * p; x.y = A[i][1] + (B[i][1] - A[i][1]) * p; } }); LB.paint(); if (p < 1) requestAnimationFrame(anim); else { k++; tick(); } }; requestAnimationFrame(anim); };
      tick();
    };
    LB.bind = () => {
      const svg = document.querySelector('#lb-stage svg'); if (!svg || !LB.board) return;
      const [W, H] = SIZE[LB.board.field] || SIZE.full;
      const at = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.max(0, Math.min(1, q.x / W)), Math.max(0, Math.min(1, q.y / H))]; };
      let drag = null, draft = null;
      svg.onpointerdown = e => {
        const it = e.target.closest('.lb-it'), i = it ? Number(it.dataset.i) : -1, p = at(e);
        if (LB.tool === 'erase') { if (i >= 0) { push(); LB.board.items.splice(i, 1); LB.paint(); } return; }
        if (LB.tool === 'ball') { push(); LB.board.items = LB.board.items.filter(x => x.t !== 'ball'); LB.board.items.push({ t: 'ball', x: p[0], y: p[1] }); return LB.paint(); }
        if (LB.tool === 'move') { if (i >= 0 && (LB.board.items[i].t === 'player' || LB.board.items[i].t === 'ball')) { push(); drag = i; svg.setPointerCapture(e.pointerId); } return; }
        push(); svg.setPointerCapture(e.pointerId);
        const base = { color: LB.color, w: LB.width };
        draft = LB.tool === 'pen' ? { t: 'free', pts: [p], ...base } : ['line', 'arrow', 'run', 'pass'].includes(LB.tool) ? { t: 'line', kind: LB.tool, a: p, b: p, ...base } : { t: LB.tool, a: p, b: p, ...base };
        LB.board.items.push(draft);
      };
      svg.onpointermove = e => { const p = at(e); if (drag != null) { const x = LB.board.items[drag]; [x.x, x.y] = p; LB.paint(); return; } if (draft) { if (draft.t === 'free') draft.pts.push(p); else draft.b = p; LB.paint(); } };
      svg.onpointerup = () => { if (drag != null && LB.rec) LB.board.frames.push(positions()); if (draft && draft.t !== 'free' && Math.hypot(draft.b[0] - draft.a[0], draft.b[1] - draft.a[1]) < .01) { LB.board.items.pop(); hist.pop(); } drag = null; draft = null; LB.paint(); };
    };
    LB.save = () => V.run(() => { let row; db.update(st => { row = L.saveBoard(st, LB.board, { by: 'الإدارة الفنية' }); }); LB.board.id = row.id; toast('اتحفظت اللوحة'); render(); });
    LB.remove = () => { if (!confirm('حذف اللوحة؟')) return; V.run(() => db.update(st => { st.fbBoards = (st.fbBoards || []).filter(b => b.id !== LB.board.id); })); LB.board = null; render(); };
    LB.export = kind => {
      const svg = document.querySelector('#lb-stage svg'); if (!svg) return;
      const [W, H] = SIZE[LB.board.field] || SIZE.full, xml = new XMLSerializer().serializeToString(svg), img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); const url = c.toDataURL(kind === 'jpeg' ? 'image/jpeg' : 'image/png', .92), name = (LB.board.title || 'لوحة').replace(/[\\/:*?"<>|]/g, '');
        if (kind === 'pdf') { const w = window.open('', '_blank'); if (!w) return toast('اسمح بالنوافذ المنبثقة'); w.document.write(`<html dir="rtl"><head><title>${E(name)}</title><style>body{font-family:sans-serif;margin:24px}img{width:100%}</style></head><body><h2>${E(name)}</h2><img src="${url}"><p>${E(LB.board.notes || '')}</p><script>onload=()=>print()<\/script></body></html>`); w.document.close(); return; }
        const a = document.createElement('a'); a.href = url; a.download = `${name}.${kind === 'jpeg' ? 'jpg' : 'png'}`; a.click(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    };
  }

  /* =========================================================== coach app */
  if (typeof APPS !== 'undefined' && APPS.coach) {
    const AA = window.AcademyApps, top = (t, s) => `<header class="ax-top"><div class="ax-top-row"><button type="button" class="ax-icon-btn" aria-label="رجوع" onclick="go('home')">→</button><div style="flex:1"><small>${E(s)}</small><h2>${E(t)}</h2></div></div></header>`;
    APPS.coach.F.perf = () => { const gs = AA.scope().groups.filter(g => g.sport === 'football'); if (!gs.some(g => g.id === LB.cardGroup)) LB.cardGroup = gs[0]?.id || ''; const ms = db.state.members.filter(m => m.group === LB.cardGroup);
      return `<div class="ax lb-app">${top('بطاقات الأداء', 'تقييم المهارات لكل لاعب')}<div class="ax-body"><div class="ax-sports">${gs.map(g => `<button type="button" class="${g.id === LB.cardGroup ? 'on' : ''}" onclick="FootballLabUI.cardGroup='${g.id}';draw()">${E(gName(g))}</button>`).join('')}</div>${ms.map(m => { const k = L.card(db.state, m.id); return `<button type="button" class="ax-card lb-pcard" onclick="FootballLabUI.card('${m.id}')">${av(m.name, 42)}<span><b>${E(m.name)}</b><small>${k.count ? k.count + ' مهارة' : 'لسه متقيّمش'}</small></span><em class="${k.count ? '' : 'none'}">${k.count ? k.overall + '%' : '—'}</em></button>`; }).join('')}</div></div>`; };
    APPS.coach.F.boards = () => { const list = (db.state.fbBoards || []); return `<div class="ax lb-app">${top('اللوحة التكتيكية', 'لوحات الإدارة الفنية')}<div class="ax-body">${list.map(b => `<div class="ax-card lb-appboard">${LB.svg(b, 'mini')}<b>${E(b.title)}</b><small>${E(L.FIELDS[b.field])}${b.squad ? ' · ' + E(gName(group(b.squad))) : ''}</small>${b.notes ? `<p>${E(b.notes)}</p>` : ''}</div>`).join('') || '<p class="ck-hint">مفيش لوحات لسه.</p>'}</div></div>`; };
    APPS.coach.sub = APPS.coach.sub || {}; Object.assign(APPS.coach.sub, { perf: 'home', boards: 'home' });
  }
})();

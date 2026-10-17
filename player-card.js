/* Player card: a FIFA-style card for every player built from the coach's quick ratings.
   Each sport type has six attributes rated 1–5 after a session; the card shows them on a
   40–99 scale with an overall rating, a bronze/silver/gold tier and the trend since the
   previous rating. Cards download as PNG and share through the device share sheet.
   Coaches can also award a monthly certificate of excellence. */
(function (root) {
  'use strict';

  const ATTRS = {
    team: ['السرعة', 'التمرير', 'التسديد', 'الدفاع', 'التركيز', 'الروح الرياضية'],
    timed: ['التقنية', 'السرعة', 'التحمل', 'التنفس', 'التركيز', 'الروح الرياضية'],
    ranks: ['التقنية', 'القوة', 'المرونة', 'الانضباط', 'التركيز', 'الروح الرياضية'],
    levels: ['المرونة', 'التوازن', 'القوة', 'التقنية', 'التركيز', 'الروح الرياضية'],
    racket: ['الإرسال', 'الضربات', 'الحركة', 'التكتيك', 'التركيز', 'الروح الرياضية'],
    classes: ['القوة', 'التحمل', 'المرونة', 'الالتزام', 'التركيز', 'الروح الرياضية']
  };
  const SHORT = { 'الروح الرياضية': 'الروح', 'التركيز': 'التركيز' };
  const attrsFor = type => ATTRS[type] || ATTRS.levels;
  const toScore = v => Math.round(40 + (Math.max(1, Math.min(5, v)) - 1) * 14.75);

  function ratingsOf(state, memberId) {
    return ((state.cardRatings || {})[memberId] || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at));
  }

  /* Average of the last three ratings per attribute; football falls back to the older skill bars. */
  function values(state, def, member, upTo = Infinity) {
    const names = attrsFor(def?.type);
    const rows = ratingsOf(state, member.id).slice(0, upTo === Infinity ? undefined : upTo);
    if (!rows.length && Array.isArray(member.skill) && def?.id === 'football') {
      const s = member.skill;
      return names.map((n, i) => ({ name: n, value: toScore(i < 5 ? s[i] : (s[3] + s[4]) / 2) }));
    }
    if (!rows.length) return null;
    const last = rows.slice(-3);
    return names.map(n => {
      const v = last.map(r => r.values[n]).filter(x => x != null);
      return { name: n, value: v.length ? toScore(v.reduce((a, b) => a + b, 0) / v.length) : 40 };
    });
  }

  function overallOf(attrs, bonus = 0) {
    return Math.min(99, Math.round(attrs.reduce((n, a) => n + a.value, 0) / attrs.length + bonus));
  }

  function card(state, def, member, extra = {}) {
    const attrs = values(state, def, member);
    if (!attrs) return { empty: true, attrs: attrsFor(def?.type).map(name => ({ name, value: null })) };
    const bonus = (extra.attendance >= 90 ? 2 : 0) + Math.min(3, extra.levelIndex > 0 ? extra.levelIndex : 0);
    const overall = overallOf(attrs, bonus);
    const rows = ratingsOf(state, member.id);
    const previous = rows.length > 1 ? values(state, def, member, rows.length - 1) : null;
    const before = previous ? overallOf(previous, bonus) : null;
    const tier = overall >= 80 ? 'gold' : overall >= 65 ? 'silver' : 'bronze';
    return { empty: false, attrs, overall, tier, trend: before == null ? 0 : overall - before, count: rows.length, last: rows[rows.length - 1] || null };
  }

  function validateRating(def, values) {
    const names = attrsFor(def?.type);
    const clean = {};
    names.forEach(n => {
      const v = Number(values[n]);
      if (values[n] == null || values[n] === '') return;
      if (!Number.isInteger(v) || v < 1 || v > 5) throw Error('التقييم من 1 إلى 5');
      clean[n] = v;
    });
    if (!Object.keys(clean).length) throw Error('قيّم عنصرًا واحدًا على الأقل');
    return clean;
  }

  const api = { ATTRS, attrsFor, toScore, ratingsOf, values, card, validateRating, overallOf };
  root.PlayerCardCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  /* ---------------- browser ---------------- */
  if (typeof window === 'undefined' || !window.V || !window.SportEngine) return;
  const db = V.db, SE = window.SportEngine;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const group = id => db.state.groups.find(g => g.id === id);
  const defOf = m => SE.get(group(m.group)?.sport);
  const monthName = (d = new Date()) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' }).format(d);
  const TIERS = { gold: ['#f6e3a1', '#c9a14a', '#6b4e14', 'ذهبية'], silver: ['#eef2f4', '#a9b4bb', '#3d4a52', 'فضية'], bronze: ['#f0d2b5', '#b07a4d', '#5a361a', 'برونزية'] };

  const extraOf = m => {
    const d = defOf(m), att = window.Progress ? Progress.attendance(db.state, m) : { rate: m.attendance || 0, held: 0 };
    return { attendance: att.held >= 4 ? att.rate : (m.attendance || att.rate), levelIndex: d ? d.levels.findIndex(l => l.id === m.sportLevel) : 0 };
  };
  /* Pathway footballers: the card shows the four development corners from the latest assessment. */
  const pathwayCard = m => {
    const FC = window.FootballCore; if (!FC || !FC.isPathway(db.state, m)) return null;
    const h = FC.history(db.state, m.id); if (!h.length) return null;
    const now = FC.cornerScores(h[h.length - 1]), prev = h.length > 1 ? FC.cornerScores(h[h.length - 2]) : null, overall = now.overall;
    return { empty: false, attrs: Object.keys(FC.CORNERS).map(k => ({ name: FC.CORNERS[k].name, value: now[k] })), overall, tier: overall >= 80 ? 'gold' : overall >= 65 ? 'silver' : 'bronze', trend: prev ? overall - prev.overall : 0, count: h.length, last: null, pathway: true };
  };
  const cardOf = m => pathwayCard(m) || card(db.state, defOf(m), m, extraOf(m));

  /* The card as a standalone SVG (also used for the PNG export). */
  function svg(m, opts = {}) {
    const d = defOf(m), c = cardOf(m), t = TIERS[c.tier || 'bronze'], lvl = c.pathway ? { name: window.FootballCore.POSITIONS[m.fb?.position]?.name || 'مسار الاحتراف' } : window.Progress?.level(m);
    const portrait = window.KoraAvatars ? KoraAvatars.portrait(m.name).replace('<svg ', '<svg x="88" y="78" width="124" height="124" style="width:124px;height:124px;max-width:none" ') : '';
    const attrs = c.attrs.map((a, i) => { const col = i % 2, row = Math.floor(i / 2), x = col ? 136 : 262, y = 310 + row * 28;
      return `<text x="${x}" y="${y}" text-anchor="end" font-size="20" font-weight="700" fill="${t[2]}">${a.value ?? '—'}</text><text x="${x - 34}" y="${y}" text-anchor="end" font-size="14" fill="${t[2]}" opacity=".85">${E(SHORT[a.name] || a.name)}</text>`; }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="${opts.width || 300}" height="${(opts.width || 300) * 1.4}" font-family="AcademyPlex, Tahoma, Arial, sans-serif" direction="ltr" style="direction:ltr" role="img" aria-label="بطاقة ${E(m.name)}">
      <defs><linearGradient id="g-${E(m.id)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient><clipPath id="p-${E(m.id)}"><circle cx="150" cy="140" r="62"/></clipPath><clipPath id="c-${E(m.id)}"><path d="M150 6 L282 40 V330 Q282 380 150 414 Q18 380 18 330 V40 Z"/></clipPath></defs>
      <path d="M150 6 L282 40 V330 Q282 380 150 414 Q18 380 18 330 V40 Z" fill="url(#g-${E(m.id)})" stroke="${t[2]}" stroke-opacity=".35" stroke-width="2"/>
      <g clip-path="url(#c-${E(m.id)})"><circle cx="250" cy="70" r="90" fill="#fff" opacity=".18"/><path d="M18 250 Q150 210 282 250 V420 H18 Z" fill="#fff" opacity=".12"/></g>
      <text x="250" y="86" text-anchor="middle" font-size="46" font-weight="700" fill="${t[2]}">${c.empty ? '—' : c.overall}</text>
      <text x="250" y="110" text-anchor="middle" font-size="12" font-weight="700" fill="${t[2]}">${E(d?.name || '')}</text>
      <text x="250" y="140" text-anchor="middle" font-size="26">${E(d?.ico || '')}</text>
      <text x="56" y="70" text-anchor="middle" font-size="11" font-weight="700" fill="${t[2]}" letter-spacing="1">ELITE</text>
      <text x="56" y="84" text-anchor="middle" font-size="9" fill="${t[2]}" letter-spacing="1">ACADEMY</text>
      <circle cx="150" cy="140" r="66" fill="#fff" opacity=".45"/><g clip-path="url(#p-${E(m.id)})">${portrait}</g>
      <text x="150" y="238" text-anchor="middle" font-size="22" font-weight="700" fill="${t[2]}">${E(m.name)}</text>
      <text x="150" y="262" text-anchor="middle" font-size="13" fill="${t[2]}" opacity=".85">${E(lvl?.name || 'لاعب الأكاديمية')}</text>
      <line x1="40" x2="260" y1="282" y2="282" stroke="${t[2]}" stroke-opacity=".3"/>${attrs}
      <text x="150" y="398" text-anchor="middle" font-size="10" fill="${t[2]}" opacity=".8">${E(monthName())} · بطاقة ${t[3]}</text></svg>`;
  }

  function download(svgText, name) {
    return new Promise(resolve => {
      const img = new Image(), url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      img.onload = () => {
        const canvas = document.createElement('canvas'); canvas.width = img.width * 3; canvas.height = img.height * 3;
        const ctx = canvas.getContext('2d'); ctx.scale(3, 3); ctx.fillStyle = '#f3f6f4'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url);
        canvas.toBlob(async blob => {
          const file = new File([blob], name + '.png', { type: 'image/png' });
          try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return resolve('shared'); } } catch (e) { /* fall back to download */ }
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); resolve('downloaded');
        }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve('failed'); };
      img.src = url;
    });
  }

  function certificateSvg(cert) {
    const m = db.member(cert.memberId), d = defOf(m);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420" font-family="AcademyPlex, Tahoma, Arial, sans-serif" direction="ltr" style="direction:ltr">
      <rect width="600" height="420" rx="18" fill="#fbf8f0"/><rect x="14" y="14" width="572" height="392" rx="12" fill="none" stroke="#b8954f" stroke-width="3"/><rect x="24" y="24" width="552" height="372" rx="8" fill="none" stroke="#2d604c" stroke-width="1"/>
      <text x="300" y="78" text-anchor="middle" font-size="15" letter-spacing="3" fill="#2d604c" font-weight="700">ELITE ACADEMY · أكاديمية النخبة</text>
      <text x="300" y="130" text-anchor="middle" font-size="34" font-weight="700" fill="#1d3127">شهادة تميز</text>
      <text x="300" y="164" text-anchor="middle" font-size="15" fill="#5f7368">${E(cert.month)}</text>
      <text x="300" y="215" text-anchor="middle" font-size="16" fill="#3b5146">تُمنح هذه الشهادة إلى</text>
      <text x="300" y="258" text-anchor="middle" font-size="32" font-weight="700" fill="#2d604c">${E(m.name)}</text>
      <text x="300" y="296" text-anchor="middle" font-size="16" fill="#3b5146">${E(cert.reason)} · ${E(d?.name || '')}</text>
      <text x="460" y="360" text-anchor="middle" font-size="14" fill="#1d3127">${E(cert.by)}</text><line x1="400" x2="520" y1="368" y2="368" stroke="#b8954f"/>
      <text x="140" y="360" text-anchor="middle" font-size="26">${E(d?.ico || '🏅')}</text></svg>`;
  }

  const PC = window.PlayerCard = {
    ...api,
    of: cardOf, svg, certificateSvg,
    attrs: m => attrsFor(defOf(m)?.type),
    rate(mid, values, meta = {}) {
      const m = db.member(mid), clean = validateRating(defOf(m), values);
      db.update(st => {
        st.cardRatings = st.cardRatings || {};
        (st.cardRatings[mid] = st.cardRatings[mid] || []).push({ id: db.id('rating'), at: new Date().toISOString(), by: meta.by || '', sessionId: meta.sessionId || '', values: clean, note: String(meta.note || '').trim() });
      });
    },
    award(mid, reason, by) {
      if (!String(reason || '').trim()) throw Error('اكتب سبب الشهادة');
      const month = 'شهر ' + monthName();
      let cert;
      db.update(st => {
        st.certificates = st.certificates || [];
        if (st.certificates.some(c => c.memberId === mid && c.month === month)) throw Error('اللاعب حصل على شهادة هذا الشهر بالفعل');
        cert = { id: db.id('cert'), memberId: mid, month, reason: String(reason).trim(), by: by || 'الأكاديمية', at: new Date().toISOString() };
        st.certificates.push(cert);
      });
      return cert;
    },
    certificates: mid => (db.state.certificates || []).filter(c => c.memberId === mid).sort((a, b) => new Date(b.at) - new Date(a.at)),
    download: mid => download(svg(db.member(mid), { width: 300 }), 'بطاقة ' + db.member(mid).name),
    downloadCertificate: id => { const c = (db.state.certificates || []).find(x => x.id === id); return download(certificateSvg(c), 'شهادة ' + db.member(c.memberId).name); },

    /* Card sheet shared by the apps and the dashboard. */
    open(mid) {
      const m = db.member(mid), c = cardOf(m), last = c.last, certs = PC.certificates(mid);
      V.open(`<div class="pc-sheet"><div class="pc-card">${svg(m)}</div>
        ${c.empty ? '<p class="pc-note">البطاقة تكتمل بعد أول تقييم من المدرب.</p>' : `<p class="pc-note">${c.count} تقييمات${c.trend ? ` · ${c.trend > 0 ? '▲ +' + c.trend : '▼ ' + c.trend} منذ التقييم السابق` : ''}${last?.note ? `<br>«${E(last.note)}» — ${E(last.by)}` : ''}</p>`}
        <div class="pc-actions"><button type="button" class="pc-btn primary" onclick="PlayerCard.download('${mid}').then(r=>toast(r==='shared'?'اتشاركت البطاقة':r==='downloaded'?'اتحملت البطاقة':'تعذر إنشاء الصورة'))">مشاركة البطاقة</button>${typeof S !== 'undefined' && S.app === 'coach' || document.getElementById('content') ? `<button type="button" class="pc-btn" onclick="PlayerCard.awardForm('${mid}')">منح شهادة تميز</button>` : ''}</div>
        ${certs.map(x => `<button type="button" class="pc-cert" onclick="PlayerCard.downloadCertificate('${x.id}')"><b>🏅 شهادة تميز · ${E(x.month)}</b><small>${E(x.reason)} · تحميل</small></button>`).join('')}</div>`);
    },

    /* Coach: rate the players of a session in one sheet, prefilled with their last rating. */
    rateSession(sid) {
      const s = db.session(sid), g = group(s.group), d = SE.get(g.sport), names = attrsFor(d.type);
      const roster = db.state.members.filter(m => m.group === s.group && (s.present[m.id] || !Object.values(s.present).some(Boolean)));
      PC.sessionId = sid;
      V.open(`<div class="pc-rate"><h3>تقييم نهاية الحصة</h3><p class="pc-note">${E(g.name)} · اضغط الرقم من 1 إلى 5. التقييم السابق ظاهر كبداية.</p>
        ${roster.map(m => { const prev = ratingsOf(db.state, m.id).slice(-1)[0]?.values || {};
          return `<details class="pc-player"><summary>${window.KoraAvatars ? KoraAvatars.render(m.name, 'pc-av', 34) : ''}<b>${E(m.name)}</b><small>${cardOf(m).empty ? 'أول تقييم' : 'الحالي ' + cardOf(m).overall}</small></summary>
            ${names.map(n => `<div class="pc-attr"><span>${E(n)}</span><div role="radiogroup" aria-label="${E(n)} ${E(m.name)}">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="pc-${m.id}-${n}" value="${v}" ${prev[n] === v ? 'checked' : ''}><i>${v}</i></label>`).join('')}</div></div>`).join('')}
            <input class="pc-note-input" data-pc-note="${m.id}" placeholder="ملاحظة لولي الأمر (اختياري)"></details>`; }).join('')}
        <button type="button" class="pc-btn primary" onclick="PlayerCard.saveSession()">حفظ التقييمات</button></div>`);
    },
    saveSession() {
      V.run(() => {
        const s = db.session(PC.sessionId), d = SE.get(group(s.group).sport), names = attrsFor(d.type);
        let saved = 0;
        document.querySelectorAll('.pc-player').forEach(box => {
          const mid = box.querySelector('[data-pc-note]').dataset.pcNote, values = {};
          names.forEach(n => { const el = box.querySelector(`input[name="pc-${mid}-${n}"]:checked`); if (el) values[n] = Number(el.value); });
          const note = box.querySelector('[data-pc-note]').value;
          const changed = box.open || note.trim();
          if (Object.keys(values).length && changed) { PC.rate(mid, values, { by: s.coach || group(s.group).coach, sessionId: s.id, note }); saved++; }
        });
        if (!saved) throw Error('افتح لاعبًا وقيّمه قبل الحفظ');
        V.close(); if (typeof draw === 'function') draw(); if (typeof render === 'function' && document.getElementById('content')) render();
        toast(`اتحفظ تقييم ${saved} لاعب واتحدثت بطاقاتهم`);
      });
    },
    awardForm(mid) {
      const m = db.member(mid);
      V.open(`<div class="pc-rate"><h3>شهادة تميز · ${E(m.name)}</h3><label class="pc-field">السبب<select id="pc-reason"><option>أفضل تطور هذا الشهر</option><option>التزام كامل بالحضور</option><option>روح رياضية مميزة</option><option>اجتياز مستوى جديد</option></select></label>
        <button type="button" class="pc-btn primary" onclick="V.run(()=>{const c=PlayerCard.award('${mid}',document.getElementById('pc-reason').value,'${E(group(m.group)?.coach || 'الأكاديمية')}');V.close();toast('اتمنحت الشهادة وظهرت في تطبيق ولي الأمر');})">منح الشهادة</button></div>`);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

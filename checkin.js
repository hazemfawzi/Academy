/* Player QR codes for check-in, and transfer receipts attached to renewal requests.
   Every player has a personal QR (and a six-digit code for when the camera is not
   available); the coach scans it and the player is marked present in the session that is
   open for check-in. Parents attach a screenshot of the transfer to the renewal request
   and the desk sees it while reviewing. */
(function (root) {
  'use strict';
  const PREFIX = 'ELITE1';
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const sign = mid => (hash('elite-checkin:' + mid) % 46656).toString(36).padStart(3, '0');
  const payload = mid => `${PREFIX}:${mid}:${sign(mid)}`;
  const shortCode = mid => String(100000 + hash('elite-short:' + mid) % 900000);

  /* Accepts a scanned QR text or a typed six-digit code; returns the member or an error. */
  function parse(text, members) {
    const t = String(text || '').trim();
    if (/^\d{6}$/.test(t)) { const m = members.find(x => shortCode(x.id) === t); return m ? { member: m } : { error: 'الكود ده مش متسجل لأي لاعب' }; }
    const [p, mid, sig] = t.split(':');
    if (p !== PREFIX || !mid) return { error: 'الكود ده مش كود حضور الأكاديمية' };
    if (sig !== sign(mid)) return { error: 'الكود متعدل أو منسوخ غلط' };
    const m = members.find(x => x.id === mid);
    return m ? { member: m } : { error: 'اللاعب مش موجود' };
  }

  /* The session of the player's group that is open for check-in now: from 30 minutes before
     the start until the end. */
  function openSession(state, m, now = new Date()) {
    const t = now.getTime(), own = state.sessions.filter(s => s.group === m.group && s.status === 'scheduled');
    const s = own.find(x => { const a = new Date(x.start).getTime(); return t >= a - 30 * 60000 && t <= a + (x.duration || 60) * 60000; });
    if (s) return { session: s };
    const next = own.filter(x => new Date(x.start).getTime() > t).sort((a, b) => new Date(a.start) - new Date(b.start))[0];
    return { error: 'مفيش حصة مفتوحة للحضور دلوقتي', next };
  }

  const api = { PREFIX, payload, shortCode, parse, openSession, sign };
  root.CheckinCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined' || typeof V === 'undefined') return;

  const db = V.db;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, o) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(new Date(v));
  const icon = (n, s = 20) => typeof ic === 'function' ? ic(n, s) : '';

  /* Real QR as SVG (qrcode-generator, error correction M). */
  const qr = (text, size = 200) => {
    if (typeof qrcode !== 'function') return '';
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), quiet = 3, total = n + quiet * 2; let path = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    return `<svg class="ck-qr" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="كود الحضور"><rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#13261d"/></svg>`;
  };

  /* Shrinks a photo or screenshot so it fits in the prototype's local storage. */
  const compress = (file, max = 900, quality = 0.62) => new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(Error('اختار صورة (JPG أو PNG)'));
    if (file.size > 15 * 1024 * 1024) return reject(Error('الصورة كبيرة جدًا'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', quality)); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(Error('مش قادر أقرا الصورة')); };
    img.src = url;
  });

  const CK = window.Checkin = { ...api, qr, compress, drafts: {}, scans: [] };

  /* ---------- dashboard: receipt in the payment review ---------- */
  if (typeof PAGES !== 'undefined') {
    const review = V.review;
    V.review = rid => {
      review(rid);
      const r = db.state.requests.find(x => x.id === rid), box = document.getElementById('modal'), c = r?.payload?.charge;
      /* Renewals at a program price show that price after the sibling discount, not the old plan price. */
      if (r?.type === 'payment' && c && box?.querySelector('.v-note')) box.querySelector('.v-note').textContent = `${c.label} · ${c.sessions} حصة · ${new Intl.NumberFormat('en-US').format(Math.round(c.price * (1 - (r.payload.discount || 0) / 100)))} ج${r.payload.discount ? ` بعد خصم ${r.payload.discount}%` : ''} · ${r.payload.method}${r.payload.reference ? ' · رقم ' + r.payload.reference : ''}`;
      if (!r?.payload?.receipt || !box) return;
      box.querySelector('.v-note')?.insertAdjacentHTML('afterend', `<figure class="ck-receipt"><button type="button" onclick="this.parentElement.classList.toggle('big')" aria-label="تكبير صورة الإيصال"><img src="${E(r.payload.receipt)}" alt="صورة إيصال التحويل"></button><figcaption>صورة الإيصال اللي رفعها ولي الأمر${r.payload.reference ? ' · رقم العملية ' + E(r.payload.reference) : ''}. قارن المبلغ والتاريخ ورقم العملية بكشف حساب الأكاديمية قبل التأكيد.</figcaption></figure>`);
    };
    /* A paperclip next to requests that have a receipt. */
    const after = window.render;
    window.render = function () { after(); if (state.page !== 'vrequests') return; document.querySelectorAll('[onclick^="V.review("]').forEach(b => { const id = b.getAttribute('onclick').match(/V\.review\('([^']+)'\)/)?.[1], r = db.state.requests.find(x => x.id === id); if (r?.payload?.receipt && !b.parentElement.querySelector('.ck-clip')) b.insertAdjacentHTML('beforebegin', '<span class="ck-clip" title="مرفق صورة إيصال">📎 إيصال</span>'); }); };
  }

  /* ---------- apps ---------- */
  if (typeof APPS === 'undefined' || !window.AcademyApps) return;
  const AA = window.AcademyApps;
  const viewer = () => AA.viewer ? AA.viewer() : db.member('m0');
  const groupOf = m => db.state.groups.find(g => g.id === m.group);

  /* Player's own code. */
  APPS.member.F.mycode = () => {
    const m = viewer(), g = groupOf(m), d = window.SportEngine?.get(g?.sport), o = openSession(db.state, m), here = o.session?.present?.[m.id];
    return `<div class="ax ck-page"><header class="ax-top ax-top-family"><div class="ax-top-row"><button type="button" class="ax-icon-btn" aria-label="رجوع" onclick="go('home')">${icon('back', 20)}</button><div style="flex:1"><small>${E(d?.ico || '')} ${E(g?.name || '')}</small><h2>كود الحضور</h2></div></div>${AA.switcher ? AA.switcher() : ''}</header>
      <div class="ax-body"><section class="ck-card"><div class="ck-code">${qr(payload(m.id), 230)}</div><b>${E(m.name)}</b><small>${E(g?.branch || '')} · ${E(g?.name || '')}</small><div class="ck-short" aria-label="الكود اليدوي"><span>الكود اليدوي</span><bdi>${shortCode(m.id).replace(/(\d{3})(\d{3})/, '$1 $2')}</bdi></div></section>
      ${here ? `<div class="ax-banner ok">${icon('check', 20)}<span><b>اتسجل الحضور</b><small>حصة ${E(fmt(o.session.start, { hour: 'numeric', minute: '2-digit' }))}</small></span></div>` : o.session ? `<div class="ax-banner">${icon('clock', 20)}<span><b>الحضور مفتوح دلوقتي</b><small>اعرض الكود للمدرب أول ما توصل</small></span></div>` : `<div class="ax-banner">${icon('cal', 20)}<span><b>${o.next ? 'الحصة الجاية ' + E(fmt(o.next.start, { weekday: 'long', hour: 'numeric', minute: '2-digit' })) : 'مفيش حصص قادمة'}</b><small>الحضور بيفتح قبل الحصة بنص ساعة</small></span></div>`}
      <p class="ck-hint">علّي إضاءة الشاشة لو المدرب مش عارف يمسح الكود، أو قوله الكود اليدوي.</p></div></div>`;
  };

  /* Coach scanner: camera with BarcodeDetector, or jsQR when the browser has no detector,
     plus the six-digit code typed by hand. */
  let stream = null, loop = 0, detector = null, busy = false, last = '';
  const stop = () => { cancelAnimationFrame(loop); loop = 0; if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
  const loadJsQR = () => window.jsQR ? Promise.resolve() : new Promise((ok, fail) => { const s = document.createElement('script'); s.src = 'assets/vendor/jsQR.js'; s.onload = ok; s.onerror = () => fail(Error('مش قادر أحمّل قارئ الكود')); document.head.appendChild(s); });

  APPS.coach.F.scan = () => {
    const recent = CK.scans.slice(-8).reverse();
    return `<div class="ax ck-page"><header class="ax-top"><div class="ax-top-row"><button type="button" class="ax-icon-btn" aria-label="رجوع" onclick="Checkin.stop();go('home')">${icon('back', 20)}</button><div style="flex:1"><small>اللاعب يعرض كوده من التطبيق</small><h2>مسح الحضور</h2></div></div></header>
      <div class="ax-body"><div class="ck-cam" id="ck-cam"><video id="ck-video" playsinline muted></video><span class="ck-frame" aria-hidden="true"></span><div class="ck-cam-msg" id="ck-msg"><button type="button" class="ax-btn light" onclick="Checkin.start()">${icon('camera', 18)} تشغيل الكاميرا</button></div></div>
      <form class="ck-manual" onsubmit="event.preventDefault();Checkin.handle(this.c.value.replace(/\\s/g,''));this.c.value=''"><input name="c" inputmode="numeric" maxlength="7" placeholder="أو اكتب الكود اليدوي (6 أرقام)" aria-label="الكود اليدوي"><button type="submit" class="ax-btn">تسجيل</button></form>
      <div id="ck-result" class="ck-result" role="status" aria-live="polite"></div>
      ${recent.length ? `<div class="ax-section"><h3>اتسجلوا دلوقتي</h3></div>${recent.map(x => `<div class="ck-log ${x.ok ? 'ok' : 'bad'}">${icon(x.ok ? 'check' : 'x', 16)}<b>${E(x.name)}</b><small>${E(x.text)}</small></div>`).join('')}` : ''}</div></div>`;
  };

  CK.stop = stop;
  CK.start = async () => {
    const msg = document.getElementById('ck-msg'), video = document.getElementById('ck-video');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error('الكاميرا مش متاحة في المتصفح ده. استخدم الكود اليدوي.');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream; await video.play(); msg.hidden = true;
      if ('BarcodeDetector' in window) { try { detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch { detector = null; } }
      if (!detector) await loadJsQR();
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
      let t0 = 0;
      const tick = async ts => {
        if (!document.getElementById('ck-video')) return stop();
        loop = requestAnimationFrame(tick);
        if (busy || ts - t0 < 220 || video.readyState < 2) return; t0 = ts; busy = true;
        try {
          let text = '';
          if (detector) text = (await detector.detect(video))[0]?.rawValue || '';
          else { canvas.width = video.videoWidth; canvas.height = video.videoHeight; ctx.drawImage(video, 0, 0); text = window.jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' })?.data || ''; }
          if (text && text !== last) { last = text; CK.handle(text); setTimeout(() => { if (last === text) last = ''; }, 2500); }
        } finally { busy = false; }
      };
      loop = requestAnimationFrame(tick);
    } catch (e) { stop(); msg.hidden = false; msg.innerHTML = `<p>${E(e.name === 'NotAllowedError' ? 'محتاج إذن الكاميرا. اسمح بيها من إعدادات المتصفح، أو استخدم الكود اليدوي.' : e.message)}</p>`; }
  };

  CK.handle = text => {
    const out = document.getElementById('ck-result'), say = (ok, name, msgText) => { CK.scans.push({ ok, name, text: msgText, at: Date.now() }); if (out) { out.className = 'ck-result ' + (ok ? 'ok' : 'bad'); out.innerHTML = `${icon(ok ? 'check' : 'x', 22)}<span><b>${E(name)}</b><small>${E(msgText)}</small></span>`; } if (navigator.vibrate) navigator.vibrate(ok ? 60 : [40, 60, 40]); };
    const p = parse(text, db.state.members);
    if (p.error) return say(false, 'كود غير صالح', p.error);
    const m = p.member, g = groupOf(m), o = openSession(db.state, m);
    if(S.app==='coach'&&window.AcademyApps&&!AcademyApps.scope().members.some(x=>x.id===m.id))return say(false,'خارج نطاقك','اللاعب غير مسند إلى مجموعاتك الحالية');
    if (o.error) return say(false, m.name, o.next ? `${o.error}. حصة ${g?.name || ''} الجاية ${fmt(o.next.start, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}` : o.error);
    if (o.session.present?.[m.id]) return say(true, m.name, 'متسجل حاضر بالفعل');
    const late = Date.now() > new Date(o.session.start).getTime() + 10 * 60000;
    try { db.attend(o.session.id, m.id, true, late ? 'late' : undefined); } catch (e) { return say(false, m.name, e.message); }
    const unpaid = !(m.remaining > 0 && new Date(m.end) >= new Date());
    say(true, m.name, `${late ? 'متأخر · ' : ''}حاضر في ${g?.name || ''}${unpaid ? ' · ⚠ الاشتراك محتاج تجديد' : ''}`);
    const list = document.querySelector('.ck-page .ax-body'); if (list) { const keep = out?.outerHTML; draw(); const n = document.getElementById('ck-result'); if (n && keep) n.outerHTML = keep; if (stream) { const v = document.getElementById('ck-video'); v.srcObject = stream; v.play(); document.getElementById('ck-msg').hidden = true; } }
  };

  /* ---------- receipt with the renewal request ---------- */
  CK.pick = async (mid, input) => {
    const box = document.getElementById('ck-receipt-' + mid);
    try { CK.drafts[mid] = await compress(input.files[0]); if (box) box.innerHTML = `<img src="${CK.drafts[mid]}" alt="صورة الإيصال"><button type="button" class="ck-remove" onclick="Checkin.unpick('${mid}')" aria-label="شيل الصورة">${icon('x', 16)}</button>`; }
    catch (e) { toast(e.message); input.value = ''; }
  };
  CK.unpick = mid => { delete CK.drafts[mid]; draw(); };
  const renew = AA.renew;
  AA.renew = (mid, disc) => {
    const receipt = CK.drafts[mid];
    if (!receipt) return renew(mid, disc);
    V.run(() => {
      const m = db.member(mid), g = groupOf(m), d = window.SportEngine.get(g.sport), p = d.programs.find(x => x.id === m.programId) || d.programs[0];
      const method = document.getElementById('pa-method').value;
      if (method === 'كاش في الفرع') throw Error('صورة الإيصال للتحويل بس. للكاش ادفع في الفرع.');
      db.request(mid, 'payment', { plan: 'monthly', method, reference: document.getElementById('pa-ref').value.trim(), receipt, discount: disc, charge: { label: `${d.name} · ${p.name}`, price: p.price, sessions: p.sessions, days: 30, programId: p.id } });
      delete CK.drafts[mid]; draw(); toast('اتبعت طلب التجديد مع صورة الإيصال');
    });
  };
  CK.receiptField = mid => `<div class="ck-upload"><label class="ck-upload-btn">${icon('camera', 18)}<span><b>صورة إيصال التحويل</b><small>سكرين شوت من إنستاباي أو فودافون كاش</small></span><input type="file" accept="image/*" onchange="Checkin.pick('${mid}',this)"></label><div class="ck-preview" id="ck-receipt-${mid}">${CK.drafts[mid] ? `<img src="${CK.drafts[mid]}" alt="صورة الإيصال"><button type="button" class="ck-remove" onclick="Checkin.unpick('${mid}')" aria-label="شيل الصورة">${icon('x', 16)}</button>` : ''}</div></div>`;
})(typeof window !== 'undefined' ? window : globalThis);

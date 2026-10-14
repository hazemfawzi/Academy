/* Local prototype domain model. No payments or messages leave this device. */
(function (root) {
  'use strict';
  const KEY = 'elite-academy-v1';
  const plans = {
    monthly: { label: 'شهري', price: 900, days: 30, sessions: 12 },
    quarterly: { label: '3 شهور', price: 2400, days: 90, sessions: 36 },
    half: { label: '6 شهور', price: 4500, days: 180, sessions: 72 },
    trial: { label: 'حصة تجربة', price: 120, days: 7, sessions: 1 }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const day = value => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const addDays = (value, n) => { const d = new Date(value); d.setDate(d.getDate()+n); return d.toISOString(); };
  function seed(now = new Date()) {
    const next = new Date(now); next.setDate(next.getDate()+1); next.setHours(7,0,0,0);
    const names = ['أحمد سامي','كريم عادل','إسلام وليد','حمزة سعيد','يوسف رضا','مروان البنا','تامر ماهر','زياد نبيل','شريف يسري','هشام جمال','محمد منير','أيمن وليد','طارق جمال','باسم حمدي','نادر سعيد','علي ماهر','فارس جلال','سيف كمال'];
    return {
      version: 2, revision: 0, demoClock: false,
      members: names.map((name,i) => ({ id:'m'+i,name,phone:'',group:'A',plan:'monthly',end:addDays(now,i===12?-2:[26,12,31,5,19,3,22,15,8,27,11,24,-2,17,9,29,6,20,14,25,4,18][i%22]),remaining:[9,6,11,4,8,2,10,7,5,12,3,9,1,8,6,10,4,11,7,9,5,3][i%22],freezeBalance:10,freezes:[],makeupCredits:2,makeupExpiry:addDays(now,30),attendance:i===6?52:i===10?48:[88,92,76,95,81,67,52,90,73,84,48,97,62,79,86,71,93,58,80,89,75,83][i%22],skill:[3,4,4,4,3],previousSkill:[2,3,3,4,2],created:now.toISOString() })),
      groups: [{id:'A',name:'جروب الصبح A',capacity:20},{id:'B',name:'جروب الليل B',capacity:22},{id:'C',name:'جروب المغرب A',capacity:20}],
      sessions: [0,2,4].map((offset,i)=>({id:'s'+i,group:'A',start:addDays(next,offset),duration:90,status:'scheduled',rsvp:i===0?{'m0':'confirmed'}:{},arrived:{},present:{},teams:null,record:null,history:[]})),
      requests: [], transactions: [], invoices: [], leads: [], followups: [], waitlist: [], shifts: [], audit: [], settings:{openingCash:0},
      memberExtras:{}, coachExtras:{}, legacy:{}
    };
  }
  function create(storage, now = () => new Date()) {
    let state, storageError = '', conflict = false;
    try { const raw=storage && storage.getItem(KEY); state=raw?JSON.parse(raw):seed(now()); if(state.version!==2)throw Error('نسخة بيانات غير مدعومة'); }
    catch(e) { state=seed(now()); storageError='تعذر قراءة الحفظ السابق. لم يتم استبداله. صدّر بياناتك قبل المتابعة.'; conflict=true; }
    const id = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,9);
    const assert = (condition,message) => { if(!condition)throw Error(message); };
    const member = mid => { const m=state.members.find(m=>m.id===mid); assert(m,'العضو غير موجود'); return m; };
    const session = sid => { const s=state.sessions.find(s=>s.id===sid); assert(s,'الحصة غير موجودة'); return s; };
    const clock = () => state.demoClock ? new Date(new Date((state.sessions.find(s=>s.id===state.demoSessionId)||state.sessions[0]).start).getTime()-10*60000) : now();
    const audit = (action,details) => state.audit.unshift({id:id('a'),at:now().toISOString(),action,details});
    function persist() {
      try {
        assert(!conflict,'فيه تعارض أو مشكلة في الحفظ. افتح أحدث نسخة من البيانات أولًا.');
        if(storage){ const raw=storage.getItem(KEY); if(raw && JSON.parse(raw).revision>state.revision){conflict=true;throw Error('البيانات اتغيرت في صفحة تانية. افتح أحدث نسخة قبل التعديل.');} }
        const previous=state.revision; state.revision++;
        try { if(storage)storage.setItem(KEY,JSON.stringify(state)); } catch(e){state.revision=previous;throw e;}
        storageError=''; return true;
      } catch(e){ storageError=e.message || 'تعذر الحفظ على الجهاز'; return false; }
    }
    function transact(fn) {
      const before=clone(state);
      try { const result=fn(); assert(persist(),storageError); return result; }
      catch(e){state=before;throw e;}
    }
    function phase(sid) {
      const s=session(sid),delta=(new Date(s.start)-clock())/60000;
      return ['ended','cancelled'].includes(s.status)?'ended':delta>30?'upcoming':delta>=-s.duration?'checkin':'closed';
    }
    function request(mid,type,payload) {return transact(()=>{
      const m=member(mid); assert(!state.requests.some(r=>r.memberId===mid&&r.type===type&&r.status==='pending'),'عندك طلب من نفس النوع قيد المراجعة بالفعل');
      if(type==='freeze'){
        assert(Number.isInteger(payload.days)&&payload.days>0&&payload.days<=m.freezeBalance,'مدة التجميد أكبر من الرصيد المتاح');
        assert(/^\d{4}-\d{2}-\d{2}$/.test(payload.from)&&payload.from>=day(now())&&payload.from<=day(m.end),'اختار تاريخ داخل مدة الاشتراك ومن النهارده أو بعده');
        const until=day(addDays(payload.from+'T12:00:00',payload.days-1));
        assert(!m.freezes.some(f=>payload.from<=f.to&&until>=f.from),'فترة التجميد متداخلة مع فترة سابقة');
      } else if(type==='payment'){
        if(payload.charge)chargeOf('monthly',payload.charge);else assert(plans[payload.plan],'اختار الباقة'); assert(['إنستاباي','فودافون كاش','كاش في الفرع'].includes(payload.method),'اختار طريقة الدفع');
        assert(payload.method==='كاش في الفرع'||String(payload.reference||'').trim().length>=4,'اكتب رقم عملية التحويل (4 أحرف على الأقل)');
        if(payload.method!=='كاش في الفرع')assert(!state.requests.some(r=>r.type==='payment'&&r.status!=='rejected'&&r.payload.reference===payload.reference),'رقم التحويل موجود في طلب سابق');
      } else if(type==='makeup'){
        assert(m.makeupCredits>0&&new Date(m.makeupExpiry)>=now(),'رصيد التعويض غير متاح أو منتهي');
        assert(state.sessions.some(s=>s.id===payload.sessionId&&s.status==='scheduled'&&new Date(s.start)>now()),'اختار حصة قادمة متاحة');
        assert(session(payload.sessionId).rsvp[mid]!=='confirmed','الحصة محجوزة بالفعل');
      } else throw Error('نوع الطلب غير مدعوم');
      const r={id:id('req'),memberId:mid,type,payload:clone(payload),status:'pending',created:now().toISOString()}; state.requests.unshift(r);audit('طلب جديد',r.id);return r;
    });}
    function chargeOf(plan,charge){if(!charge)return plans[plan];assert(String(charge.label||'').trim(),'اختر البرنامج');const price=Number(charge.price),sessions=Number(charge.sessions),days=Number(charge.days||30);assert(Number.isFinite(price)&&price>0,'سعر البرنامج غير صحيح');assert(Number.isInteger(sessions)&&sessions>0&&sessions<=200,'عدد الحصص غير صحيح');assert(Number.isInteger(days)&&days>0&&days<=400,'مدة الاشتراك غير صحيحة');return {label:String(charge.label).trim(),price,sessions,days,programId:charge.programId||''};}
    function postPayment(mid,plan,method,reference,discount=0,requestId=null,paid=null,charge=null) {
      const m=member(mid),p=chargeOf(plan,charge); assert(p,'الباقة غير موجودة');if(charge)plan='monthly';
      assert(['كاش','إنستاباي','فودافون كاش'].includes(method),'طريقة الدفع غير صحيحة');
      assert(Number.isFinite(discount)&&discount>=0&&discount<=10,'الخصم المتاح من 0 إلى 10%');
      assert(method==='كاش'||String(reference||'').trim().length>=4,'رقم التحويل مطلوب');
      assert(!requestId||!state.transactions.some(t=>t.requestId===requestId),'تم تسجيل الطلب قبل كده');
      assert(method==='كاش'||!state.transactions.some(t=>t.reference===reference&&t.kind==='payment'),'رقم التحويل مسجل بالفعل');
      const due=Math.round(p.price*(1-discount/100)); paid=paid==null?due:Number(paid);
      assert(Number.isFinite(paid)&&paid>0&&paid<=due,'المبلغ لازم يكون أكبر من صفر وفي حدود قيمة الاشتراك');
      const inv={id:id('inv'),memberId:mid,plan,planLabel:p.label,subtotal:p.price,discount:Math.round(p.price-due),total:due,paid,activated:false,created:now().toISOString(),...(charge?{days:p.days,sessions:p.sessions,programId:p.programId}:{})};state.invoices.unshift(inv);
      const tx={id:id('rcpt'),memberId:mid,plan,method,reference:reference||'',amount:paid,kind:'payment',at:now().toISOString(),requestId,invoiceId:inv.id};state.transactions.unshift(tx);
      activate(inv,m);tx.memberName=m.name;tx.memberPhone=m.phone;tx.subscriptionEnd=inv.activated?m.end:null; audit('تحصيل',tx.id);return tx;
    }
    function activate(inv,m){if(inv.paid>=inv.total&&!inv.activated){const p=inv.days?{days:inv.days,sessions:inv.sessions}:plans[inv.plan];if(inv.programId)m.programId=inv.programId;m.end=addDays(new Date(m.end)>now()?m.end:now(),p.days);m.remaining+=p.sessions;m.plan=inv.plan;inv.activated=true;}}
    function decide(rid,approved,reason='') {return transact(()=>{
      const r=state.requests.find(r=>r.id===rid);assert(r&&r.status==='pending','الطلب مش قيد المراجعة');assert(approved||reason.trim(),'اكتب سبب الرفض');
      const m=member(r.memberId),p=r.payload;
      if(approved&&r.type==='freeze'){
        assert(p.days<=m.freezeBalance,'رصيد التجميد اتغير؛ راجع الطلب');
        assert(p.from>=day(now()),'تاريخ التجميد فات؛ اطلب من العضو تاريخًا جديدًا');
        m.freezes.push({from:p.from,to:day(addDays(p.from+'T12:00:00',p.days-1))});m.freezeBalance-=p.days;m.end=addDays(m.end,p.days);
      }
      if(approved&&r.type==='payment') postPayment(m.id,p.plan,p.method==='كاش في الفرع'?'كاش':p.method,p.reference,p.discount||0,r.id,null,p.charge||null);
      if(approved&&r.type==='makeup'){
        const s=session(p.sessionId),g=state.groups.find(g=>g.id===s.group);
        assert(m.makeupCredits>0&&new Date(m.makeupExpiry)>=now(),'رصيد التعويض غير متاح');
        assert(s.status==='scheduled'&&new Date(s.start)>now(),'الحصة لم تعد متاحة');
        assert(s.rsvp[m.id]!=='confirmed','الحصة اتأكدت بالفعل؛ لا تخصم تعويض مرتين');
        assert(Object.values(s.rsvp).filter(v=>v==='confirmed').length<g.capacity,'الحصة كاملة؛ اختار حصة بديلة');
        s.rsvp[m.id]='confirmed';m.makeupCredits--;
      }
      r.status=approved?'approved':'rejected';r.reason=reason.trim();r.decided=now().toISOString();audit(approved?'قبول طلب':'رفض طلب',r.id);return r;
    });}
    return {
      get state(){return state;},plans,day,addDays,id,clock,phase,member,session,request,decide,persist,
      get error(){return storageError;},get conflict(){return conflict;},
      externalChange(raw){try{if(JSON.parse(raw).revision>state.revision){conflict=true;storageError='فيه تحديث من الصفحة التانية. حمّل أحدث نسخة قبل التعديل.';}}catch(e){conflict=true;storageError='تعذر قراءة تحديث من صفحة تانية.';}},
      reload(){const raw=storage&&storage.getItem(KEY);assert(raw,'مفيش نسخة محفوظة');const incoming=JSON.parse(raw);assert(incoming.version===2,'النسخة غير مدعومة');state=incoming;conflict=false;storageError='';},
      update(fn){return transact(()=>fn(state));},
      pay(mid,plan,method,reference,discount,paid,charge){return transact(()=>postPayment(mid,plan,method,reference,discount,null,paid,charge));},
      settle(invoiceId,amount,method,reference){return transact(()=>{
        const inv=state.invoices.find(i=>i.id===invoiceId);assert(inv,'الفاتورة غير موجودة');amount=Number(amount);
        assert(Number.isFinite(amount)&&amount>0&&amount<=inv.total-inv.paid,'راجع المبلغ المتبقي');
        assert(['كاش','إنستاباي','فودافون كاش'].includes(method),'اختار طريقة الدفع');
        assert(method==='كاش'||String(reference||'').trim().length>=4,'رقم التحويل مطلوب');
        assert(method==='كاش'||!state.transactions.some(t=>t.reference===reference),'رقم التحويل مسجل بالفعل');
        const tx={id:id('rcpt'),memberId:inv.memberId,plan:inv.plan,method,reference:reference||'',amount,kind:'payment',at:now().toISOString(),invoiceId};
        inv.paid+=amount;state.transactions.unshift(tx);const m=member(inv.memberId);activate(inv,m);tx.memberName=m.name;tx.memberPhone=m.phone;tx.subscriptionEnd=inv.activated?m.end:null;audit('استكمال تحصيل',tx.id);return tx;
      });},
      refund(tid,amount,reason){return transact(()=>{
        const t=state.transactions.find(t=>t.id===tid);amount=Number(amount);assert(t&&t.kind==='payment','اختار عملية تحصيل');
        const returned=state.transactions.filter(r=>r.originalId===tid).reduce((s,r)=>s+r.amount,0);
        assert(Number.isFinite(amount)&&amount>0&&amount<=t.amount-returned,'قيمة الاسترداد أكبر من المتاح');assert(reason.trim(),'اكتب سبب الاسترداد');
        state.transactions.unshift({id:id('refund'),originalId:tid,memberId:t.memberId,method:t.method,amount,reason,kind:'refund',at:now().toISOString()});audit('استرداد',tid);
      });},
      rsvp(sid,mid,value){return transact(()=>{const s=session(sid);member(mid);assert(phase(sid)!=='ended'&&phase(sid)!=='closed','الحصة انتهت');assert(['confirmed','excused'].includes(value),'حالة غير صحيحة');assert(!s.present[mid]||value!=='excused','العضو حاضر بالفعل؛ راجع المدرب');if(value==='confirmed'&&s.rsvp[mid]!=='confirmed'){const held=state.waitlist.filter(w=>w.sessionId===sid&&w.memberId!==mid&&w.status==='offered'&&new Date(w.expires)>now()).length;assert(Object.values(s.rsvp).filter(v=>v==='confirmed').length+held<state.groups.find(g=>g.id===s.group).capacity,'الحصة كاملة؛ انضم لقائمة الانتظار');}s.rsvp[mid]=value;});},
      arrive(sid,mid){return transact(()=>{const s=session(sid),m=member(mid);assert(phase(sid)==='checkin','تسجيل الوصول متاح من 30 دقيقة قبل الحصة وحتى نهايتها');assert(new Date(m.end)>=clock()&&m.remaining>0,'راجع الاستقبال لتجديد الاشتراك');assert(!m.freezes.some(f=>day(clock())>=f.from&&day(clock())<=f.to),'الاشتراك مجمد في التاريخ ده');s.arrived[mid]=clock().toISOString();s.rsvp[mid]='confirmed';});},
      attend(sid,mid,present,mark){return transact(()=>{const s=session(sid);assert(!['ended','cancelled'].includes(s.status),'الحصة مقفولة');assert(phase(sid)==='checkin'||phase(sid)==='closed','الحضور الفعلي يبدأ قبل الحصة بـ30 دقيقة');assert(!s.record?.ev?.length,'احفظ الماتش الجاري قبل تعديل الحضور عشان الأهداف ما تضيعش');member(mid);assert(!mark||['late','excused','absent'].includes(mark),'حالة حضور غير صحيحة');s.marks=s.marks||{};if(mark){s.marks[mid]=mark;present=mark==='late';}else delete s.marks[mid];s.present[mid]=!!present;s.teams=null;s.record=null;audit('تعديل حضور',mid);});},
      finish(sid){return transact(()=>{const s=session(sid);assert(!['ended','cancelled'].includes(s.status),'الحصة مقفولة بالفعل');assert(phase(sid)!=='upcoming','الحصة لسه مبدأتش');assert(!s.record?.ev?.length,'احفظ نتيجة الماتش الجاري قبل إنهاء الحصة');assert(Object.values(s.present).some(Boolean),'راجع الحضور قبل إنهاء الحصة');const unpaid=[];Object.entries(s.present).forEach(([mid,p])=>{if(!p)return;const m=member(mid),covered=m.remaining>0&&new Date(m.end)>=clock();if(covered)m.remaining--;else{unpaid.push(mid);if(!state.followups.some(f=>f.memberId===mid&&f.status==='open'&&f.kind==='unpaid-attendance'))state.followups.unshift({id:id('task'),memberId:mid,kind:'unpaid-attendance',owner:'الاستقبال',due:day(now()),status:'open',note:'حضر حصة بدون اشتراك ساري؛ حصّل الاشتراك أو التجديد',created:now().toISOString()});}});s.unpaidAttendance=unpaid;s.status='ended';audit('إنهاء حصة',sid);});},
      addMember(data){return transact(()=>{assert(String(data.name||'').trim(),'اكتب الاسم');const mobile=/^01[0125]\d{8}$/,phone=String(data.phone||'').trim(),guardian=data.guardian&&String(data.guardian.name||'').trim()?{name:String(data.guardian.name).trim(),phone:String(data.guardian.phone||'').trim(),relation:data.guardian.relation||'ولي الأمر'}:null;if(guardian){assert(mobile.test(guardian.phone),'اكتب رقم موبايل ولي الأمر صحيح');assert(!phone||mobile.test(phone),'رقم موبايل اللاعب غير صحيح');}else assert(mobile.test(phone),'اكتب رقم موبايل مصري صحيح');assert(!phone||!state.members.some(m=>m.phone===phone),'الرقم مسجل بالفعل');if(data.dob)assert(/^\d{4}-\d{2}-\d{2}$/.test(data.dob)&&data.dob<day(now())&&data.dob>'1930-01-01','تاريخ الميلاد غير صحيح');assert(state.groups.some(g=>g.id===data.group),'اختار جروب صحيح');const skill=data.skill??3;assert(Number.isInteger(skill)&&skill>=1&&skill<=5,'المستوى من 1 إلى 5');const m={id:id('m'),name:data.name.trim(),phone,guardian,dob:data.dob||'',gender:data.gender||'',medical:String(data.medical||'').trim(),emergency:data.emergency||(guardian?{name:guardian.name,phone:guardian.phone}:{name:'',phone:''}),familyId:data.familyId||'',programId:data.programId||'',sportLevel:data.sportLevel||'',consent:!!data.consent,group:data.group,branch:state.groups.find(g=>g.id===data.group).branch||'',sport:state.groups.find(g=>g.id===data.group).sport||'',plan:'monthly',remaining:0,end:now().toISOString(),created:now().toISOString(),freezes:[],freezeBalance:10,makeupCredits:0,makeupExpiry:addDays(now(),30),attendance:0,skill:Array(5).fill(skill),previousSkill:Array(5).fill(skill),notes:[],source:data.source||''};state.members.push(m);return m;});},
      saveLead(data){return transact(()=>{assert(data.name.trim(),'اكتب الاسم');assert(/^01[0125]\d{8}$/.test(data.phone),'اكتب رقم موبايل صحيح');assert(!state.leads.some(l=>l.phone===data.phone),'العميل موجود بالفعل');state.leads.unshift({...data,id:id('lead'),stage:'inquiry',created:now().toISOString(),history:[]});});},
      moveLead(lid,stage,note){return transact(()=>{const l=state.leads.find(l=>l.id===lid);assert(l,'العميل غير موجود');assert(['inquiry','booked','attended','followup','won','lost'].includes(stage),'مرحلة غير صحيحة');assert(stage!=='lost'||note.trim(),'اكتب سبب عدم الاشتراك');assert(stage!=='won'||state.members.some(m=>(m.phone===l.phone||m.guardian?.phone===l.phone)&&state.transactions.some(t=>t.memberId===m.id&&t.kind==='payment')),'سجّل العضو وحصّل اشتراكه الأول');l.stage=stage;l.note=note;l.history.push({stage,note,at:now().toISOString()});});},
      shiftSummary(){const last=state.shifts[0],closed=new Set(last?.transactionIds||[]),rows=state.transactions.filter(t=>!closed.has(t.id)),total=(method,kind)=>rows.filter(t=>t.method===method&&t.kind===kind).reduce((n,t)=>n+t.amount,0),cashIn=total('كاش','payment'),cashOut=total('كاش','refund'),opening=Number(state.settings.openingCash||0);return {opening,cashIn,cashOut,expected:opening+cashIn-cashOut,count:rows.length,currentTransactionIds:rows.map(t=>t.id),methods:['كاش','إنستاباي','فودافون كاش'].map(method=>({method,paid:total(method,'payment'),refund:total(method,'refund')})),from:last?.at||null};},
      cashExpected(){return this.shiftSummary().expected;},
      closeShift(actual,note,details={}){return transact(()=>{actual=Number(actual);assert(Number.isFinite(actual)&&actual>=0,'اكتب الكاش الفعلي');const summary=this.shiftSummary(),expected=summary.expected;assert(Math.abs(actual-expected)<0.005||note.trim(),'اشرح سبب فرق الوردية');if(details.denominations){const counted=Object.entries(details.denominations).reduce((n,[value,count])=>{assert([200,100,50,20,10,5,1].includes(+value)&&Number.isInteger(count)&&count>=0,'راجع فئات النقد');return n+Number(value)*count;},0);assert(Math.abs(counted-actual)<0.005,'إجمالي فئات النقد لا يطابق المبلغ الفعلي');}const sh={...summary,id:id('shift'),at:now().toISOString(),expected,actual,difference:Math.round((actual-expected)*100)/100,note,operator:details.operator||'',receiver:details.receiver||'',denominations:details.denominations||null,transactionIds:state.transactions.map(t=>t.id)};state.shifts.unshift(sh);state.settings.openingCash=0;audit('تسليم وردية',sh.id);return sh;});},
      offerNext(sid){return transact(()=>{const s=session(sid),g=state.groups.find(g=>g.id===s.group);assert(new Date(s.start)>now()&&s.status==='scheduled','الحصة غير متاحة');state.waitlist.filter(w=>w.sessionId===sid&&w.status==='offered'&&new Date(w.expires)<=now()).forEach(w=>w.status='expired');assert(!state.waitlist.some(w=>w.sessionId===sid&&w.status==='offered'),'فيه عرض مفتوح بالفعل');assert(Object.values(s.rsvp).filter(v=>v==='confirmed').length<g.capacity,'الحصة كاملة');const w=state.waitlist.find(w=>w.sessionId===sid&&w.status==='waiting');assert(w,'مفيش أعضاء في الانتظار');w.status='offered';w.expires=new Date(Math.min(now().getTime()+2*3600000,new Date(s.start).getTime())).toISOString();return w;});},
      acceptOffer(wid){return transact(()=>{const w=state.waitlist.find(w=>w.id===wid);assert(w&&w.status==='offered'&&new Date(w.expires)>now(),'العرض انتهى أو غير متاح');const s=session(w.sessionId),g=state.groups.find(g=>g.id===s.group);assert(s.status==='scheduled'&&new Date(s.start)>now(),'الحصة لم تعد متاحة');assert(Object.values(s.rsvp).filter(v=>v==='confirmed').length<g.capacity,'المكان لم يعد متاحًا');s.rsvp[w.memberId]='confirmed';w.status='accepted';});}
    };
  }
  root.KoraCore={create,seed,plans,KEY};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.KoraCore;
})(typeof globalThis!=='undefined'?globalThis:this);


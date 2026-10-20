/* Additive, one-time sample fixtures. Existing records are never replaced. */
(function(root){
  function populate(db,now=new Date()){
    if(db.state.demoDataVersion===1)return false;
    const ago=n=>db.addDays(now,-n),later=n=>db.addDays(now,n),at=mins=>new Date(now.getTime()+mins*60000).toISOString();
    db.update(s=>{
      const add=(key,rows)=>{const ids=new Set(s[key].map(r=>r.id));s[key].push(...rows.filter(r=>!ids.has(r.id)).map(r=>({...r,demo:true})));};
      const template={group:'A',plan:'monthly',end:later(23),remaining:8,freezeBalance:10,freezes:[],makeupCredits:2,makeupExpiry:later(30),attendance:86,skill:[3,4,3,4,3],previousSkill:[2,3,3,3,2],created:ago(14)};
      add('members',[
        {...template,id:'demo-member-1',name:'عمر منصور',phone:'01000000881',plan:'quarterly',remaining:32,end:later(78),attendance:94},
        {...template,id:'demo-member-2',name:'مصطفى شادي',phone:'01000000882',end:ago(3),remaining:0,attendance:45},
        {...template,id:'demo-member-3',name:'علي ناصر',phone:'01000000883',freezes:[{from:db.day(ago(2)),to:db.day(later(3))}],freezeBalance:4,attendance:30},
        {...template,id:'demo-member-4',name:'مروان طارق',phone:'01000000884',remaining:2,end:later(3),attendance:72}
      ]);
      const mids=['m0','m1','m2','m3','m4','m5','m6','m7'];
      const names=id=>s.members.find(m=>m.id===id).name;
      const player=(mid,i)=>({mid,n:names(mid),lvl:i%3+3,pos:i%4===0?'حارس':i%4===1?'دفاع':i%4===2?'وسط':'هجوم',gk:i%4===0?4:0});
      const teams=[{bib:['الأحمر','#e01f26','#fff'],pl:mids.slice(0,4).map(player),gk:'m0'},{bib:['الأسود','#151515','#fff'],pl:mids.slice(4).map(player),gk:'m4'}];
      add('sessions',[
        {id:'demo-live',group:'A',start:at(-20),duration:90,status:'scheduled',rsvp:Object.fromEntries(mids.map(m=>[m,'confirmed'])),arrived:Object.fromEntries(mids.map((m,i)=>[m,at(-30+i)])),present:Object.fromEntries(mids.map(m=>[m,true])),teams,record:{a:0,b:1,ev:[{s:0,n:names('m3'),a:names('m2')},{s:1,n:names('m7'),a:null}],mvp:names('m3'),pend:null,done:['الأحمر 2 — 1 الأسود'],q:[]},history:[{label:'الأحمر 2 — 1 الأسود',events:[{s:0,n:names('m3'),a:names('m2')},{s:0,n:names('m1'),a:null},{s:1,n:names('m7'),a:names('m6')}],mvp:names('m3'),at:at(-10)}]},
        {id:'demo-finished',group:'A',start:ago(2),duration:90,status:'ended',rsvp:Object.fromEntries(mids.map(m=>[m,'confirmed'])),arrived:Object.fromEntries(mids.map(m=>[m,ago(2)])),present:Object.fromEntries(mids.map(m=>[m,true])),teams,record:null,history:[{label:'الأحمر 3 — 2 الأسود',events:[],mvp:names('m3'),at:ago(2)}]}
      ]);
      // Fresh demos open the populated live session; any existing active session stays intact.
      if(!s.sessions.some(x=>!x.demo&&(x.record||Object.values(x.present).some(Boolean))))s.demoPreferredSession='demo-live';
      add('requests',[
        {id:'demo-req-1',memberId:'m1',type:'freeze',payload:{days:3,from:db.day(later(2)),reason:'سفر لمدة قصيرة'},status:'pending',created:at(-45)},
        {id:'demo-req-2',memberId:'m2',type:'payment',payload:{plan:'quarterly',method:'إنستاباي',reference:'48291037'},status:'pending',created:at(-90)},
        {id:'demo-req-3',memberId:'m3',type:'makeup',payload:{sessionId:'s1'},status:'pending',created:at(-120)},
        {id:'demo-req-4',memberId:'m0',type:'freeze',payload:{days:3,from:db.day(ago(10)),reason:'سفر'},status:'approved',created:ago(12),decided:ago(11),reason:'اتوافق على التجميد، والمدة اتضافت لاشتراكك'},
        {id:'demo-req-5',memberId:'m0',type:'payment',payload:{plan:'monthly',method:'إنستاباي',reference:'30177245'},status:'approved',created:ago(5),decided:ago(5),reason:'التحويل وصل والإيصال اتبعتلك'},
        {id:'demo-req-6',memberId:'m0',type:'makeup',payload:{sessionId:'demo-finished'},status:'rejected',created:ago(4),decided:ago(3),reason:'الحصة كانت كاملة؛ تقدر تختار موعد بديل من حصصي'}
      ]);
      if(!s.requests.some(r=>r.memberId==='m0'&&r.type==='makeup'&&r.status==='pending'))add('requests',[
        {id:'demo-req-7',memberId:'m0',type:'makeup',payload:{sessionId:'s1'},status:'pending',created:at(-15)}
      ]);
      add('invoices',[
        {id:'demo-inv-1',memberId:'m0',plan:'monthly',total:900,paid:900,activated:true,created:ago(5)},
        {id:'demo-inv-2',memberId:'demo-member-1',plan:'quarterly',total:2400,paid:2400,activated:true,created:ago(1)},
        {id:'demo-inv-3',memberId:'demo-member-2',plan:'monthly',total:900,paid:300,activated:false,created:at(-60)},
        {id:'demo-inv-4',memberId:'demo-member-4',plan:'monthly',total:900,paid:900,activated:true,created:at(-90)}
      ]);
      add('transactions',[
        {id:'demo-tx-1',memberId:'m0',plan:'monthly',method:'إنستاباي',reference:'30177245',amount:900,kind:'payment',at:ago(5),invoiceId:'demo-inv-1',requestId:'demo-req-5'},
        {id:'demo-tx-2',memberId:'demo-member-1',plan:'quarterly',method:'كاش',reference:'',amount:2400,kind:'payment',at:ago(1),invoiceId:'demo-inv-2'},
        {id:'demo-tx-3',memberId:'demo-member-2',plan:'monthly',method:'كاش',reference:'',amount:300,kind:'payment',at:at(-60),invoiceId:'demo-inv-3'},
        {id:'demo-tx-4',memberId:'demo-member-4',plan:'monthly',method:'فودافون كاش',reference:'66591820',amount:900,kind:'payment',at:at(-90),invoiceId:'demo-inv-4'},
        {id:'demo-refund-1',originalId:'demo-tx-2',memberId:'demo-member-1',method:'كاش',amount:100,kind:'refund',reason:'رجوع فرق حصة اتلغت',at:at(-30)}
      ]);
      add('leads',[
        {id:'demo-lead-1',name:'حسن عادل',phone:'01000000991',stage:'inquiry',source:'فيسبوك',owner:'سارة — الاستقبال',due:db.day(now),note:'عايز يعرف مواعيد جروب المساء'},
        {id:'demo-lead-2',name:'أدهم مجدي',phone:'01000000992',stage:'booked',source:'ترشيح عضو',owner:'كابتن محمود',due:db.day(later(1)),note:'حصة تجربة بكرة؛ يحضر بدري 15 دقيقة'},
        {id:'demo-lead-3',name:'يوسف مؤمن',phone:'01000000993',stage:'attended',source:'زيارة الفرع',owner:'سارة — الاستقبال',due:db.day(now),note:'حضر التجربة ومستواه متوسط؛ محتاج اختيار باقة'},
        {id:'demo-lead-4',name:'عمرو نبيل',phone:'01000000994',stage:'followup',source:'مدرب',owner:'أ. رامي',due:db.day(ago(1)),note:'مناسب له مرتين أسبوعيًا؛ اتفقوا على الجروب'},
        {id:'demo-lead-5',name:'عمر منصور',phone:'01000000881',stage:'won',source:'ترشيح عضو',owner:'سارة — الاستقبال',due:db.day(ago(1)),note:'اشترك 3 شهور بعد التجربة؛ إيصال 2400 EGP'},
        {id:'demo-lead-6',name:'خالد سامح',phone:'01000000996',stage:'lost',source:'فيسبوك',owner:'سارة — الاستقبال',due:db.day(ago(2)),note:'مواعيد الشغل متعارضة مع الحصص'}
      ].map(l=>({...l,created:ago(7),history:[{stage:l.stage,note:l.note,at:ago(1)}]})));
      add('followups',[
        {id:'demo-task-1',memberId:'m6',owner:'كابتن محمود',due:db.day(now),status:'open',note:'غياب آخر حصتين؛ اتفقنا نراجع ميعاد جروب المساء'},
        {id:'demo-task-2',memberId:'m10',owner:'أ. رامي',due:db.day(later(1)),status:'open',note:'انخفاض الحضور — محتاج تواصل لمعرفة السبب'},
        {id:'demo-task-3',memberId:'demo-member-4',owner:'سارة — الاستقبال',due:db.day(ago(1)),status:'done',note:'تمت المتابعة وتجديد الاشتراك بفودافون كاش'}
      ]);
      add('waitlist',[
        {id:'demo-wait-1',memberId:'m0',sessionId:'s2',status:'offered',created:ago(1),expires:at(120)},
        {id:'demo-wait-2',memberId:'m7',sessionId:'s2',status:'waiting',created:at(-60)},
        {id:'demo-wait-3',memberId:'m9',sessionId:'demo-finished',status:'expired',created:ago(4),expires:ago(3)}
      ]);
      add('shifts',[{id:'demo-shift-1',at:ago(1),expected:2400,actual:2400,difference:0,note:'الوردية اتسلمت لأ. رامي من غير فروق',transactionIds:['demo-tx-1','demo-tx-2']}]);
      add('audit',[
        {id:'demo-audit-1',at:at(-60),action:'تحصيل جزئي',details:'مصطفى شادي · 300 من 900 EGP'},
        {id:'demo-audit-2',at:at(-30),action:'استرداد',details:'عمر منصور · 100 EGP'},
        {id:'demo-audit-3',at:ago(1),action:'إقفال وردية',details:'الكاش مطابق — 2400 EGP'},
        {id:'demo-audit-4',at:ago(5),action:'قبول تجديد',details:'أحمد سامي · شهري · إنستاباي'}
      ]);
      s.transactions.sort((a,b)=>new Date(b.at)-new Date(a.at));
      s.demoDataVersion=1;
    });return true;
  }
  root.KoraDemo={populate};if(typeof module!=='undefined')module.exports=root.KoraDemo;
})(typeof globalThis!=='undefined'?globalThis:this);


/* Club foundation: separate people, read-only membership snapshots and enrollments.
   This browser demo is not authentication, a membership authority or a live ledger. */
(function(root){
'use strict';
const KEY='club-sports-foundation-v1',clone=x=>JSON.parse(JSON.stringify(x));
const fail=(ok,message)=>{if(!ok)throw Error(message);};
const day=x=>{const d=new Date(x);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const plus=(date,n)=>{const d=new Date(date);d.setDate(d.getDate()+n);return day(d);};
function seed(now=new Date()){
 const today=day(now),end=plus(now,60),at=now.toISOString();
 const initial={version:1,revision:0,source:'demo',created:at,
 branches:[{id:'main',name:'الفرع الرئيسي'},{id:'east',name:'فرع الشرق'}],
 sports:[{id:'swim',name:'السباحة',icon:'≈',color:'#23778b'},{id:'football',name:'كرة القدم',icon:'⚽',color:'#36765b'},{id:'gym',name:'الجمباز',icon:'◇',color:'#886d43'}],
 households:[{id:'h1',name:'أسرة سامي',membershipId:'cm1'},{id:'h2',name:'أسرة عادل',membershipId:'cm2'}],
 people:[{id:'p1',name:'أحمد سامي',householdId:'h1',guardianId:null,dob:'1987-04-12'},{id:'p2',name:'ليلى سامي',householdId:'h1',guardianId:'p1',dob:'2016-05-10'},{id:'p3',name:'يوسف سامي',householdId:'h1',guardianId:'p1',dob:'2015-02-18'},{id:'p4',name:'سيف عادل',householdId:'h2',guardianId:null,dob:'2004-09-07'},{id:'p5',name:'عمر حسن',householdId:null,guardianId:null,dob:'2000-01-15'}],
 memberships:[{id:'cm1',number:'1042',householdId:'h1',status:'active',validUntil:end,updatedAt:at,source:'demo'},{id:'cm2',number:'2086',householdId:'h2',status:'expired',validUntil:plus(now,-3),updatedAt:at,source:'demo'}],
 groups:[{id:'gs',name:'تعليم سباحة · المستوى الثاني',branchId:'main',sportId:'swim',capacity:12,coach:'كابتن هالة'},{id:'gf',name:'مدرسة الكرة · تحت 12',branchId:'main',sportId:'football',capacity:20,coach:'كابتن محمود'},{id:'gg',name:'جمباز · تأسيسي',branchId:'main',sportId:'gym',capacity:10,coach:'كابتن منى'},{id:'ge',name:'سباحة · فرع الشرق',branchId:'east',sportId:'swim',capacity:8,coach:'كابتن علي'}],
 programs:[{id:'ps',name:'تعليم السباحة',branchId:'main',sportId:'swim',groupIds:['gs'],credits:12,days:30},{id:'pf',name:'مدرسة كرة القدم',branchId:'main',sportId:'football',groupIds:['gf'],credits:8,days:30},{id:'pg',name:'أساسيات الجمباز',branchId:'main',sportId:'gym',groupIds:['gg'],credits:8,days:30},{id:'pe',name:'سباحة الشرق',branchId:'east',sportId:'swim',groupIds:['ge'],credits:12,days:30}],
 enrollments:[{id:'e1',personId:'p2',programId:'ps',groupId:'gs',status:'active',start:today,end,credits:9},{id:'e2',personId:'p2',programId:'pg',groupId:'gg',status:'active',start:today,end,credits:6},{id:'e3',personId:'p3',programId:'pf',groupId:'gf',status:'active',start:today,end,credits:7},{id:'e4',personId:'p4',programId:'ps',groupId:'gs',status:'active',start:today,end,credits:4}],
 sessions:[{id:'s1',groupId:'gs',date:today,time:'16:00',duration:60},{id:'s2',groupId:'gf',date:today,time:'17:00',duration:90},{id:'s3',groupId:'gg',date:today,time:'18:00',duration:60}],
 resources:[{id:'pool',name:'المسبح الرئيسي',branchId:'main',parts:['الحارة 1','الحارة 2','الحارة 3'],type:'pool'},{id:'pitch',name:'ملعب كرة القدم',branchId:'main',parts:['نصف أ','نصف ب'],type:'pitch'},{id:'hall',name:'صالة الجمباز',branchId:'main',parts:[],type:'hall'}],
 attendance:[],creditLedger:[],audit:[]};
 return prepareResources(initial);
}
function membership(state,personId,now=new Date()){
 const p=state.people.find(x=>x.id===personId);fail(p,'الشخص غير موجود');
 const h=state.households.find(x=>x.id===p.householdId),m=state.memberships.find(x=>x.id===h?.membershipId);
 if(!m)return{status:'nonmember',label:'غير عضو',record:null,stale:false};
 const age=new Date(now)-new Date(m.updatedAt),stale=!Number.isFinite(age)||age<0||age>86400000;
 const status=m.status==='active'&&m.validUntil<day(now)?'expired':m.status;
 return {status,label:({active:'عضوية سارية',expired:'عضوية منتهية',suspended:'عضوية موقوفة'})[status]||'تحتاج مراجعة',record:clone(m),stale};
}
function eligibility(state,personId,now=new Date()){
 const m=membership(state,personId,now);
 if(m.stale)return{allowed:false,reason:'بيانات العضوية أقدم من 24 ساعة أو تاريخها غير صالح؛ يلزم تحديث المصدر',membership:m};
 if(m.status!=='active')return{allowed:false,reason:m.status==='nonmember'?'سياسة قبول غير الأعضاء لم تعتمد بعد':'حالة العضوية تحتاج مراجعة المسؤول',membership:m};
 return{allowed:true,reason:'مؤهل للتسجيل التجريبي وفق العضوية المعروضة',membership:m};
}
function enroll(state,data,now=new Date()){
 fail(state.people.some(p=>p.id===data.personId),'اختر شخصًا مسجلًا');
 const group=state.groups.find(g=>g.id===data.groupId),program=state.programs.find(p=>p.id===data.programId);
 fail(group&&program,'اختر البرنامج والمجموعة');
 fail(program.groupIds.includes(group.id)&&program.branchId===group.branchId&&program.sportId===group.sportId,'المجموعة لا تتبع الفرع والرياضة والبرنامج المختارين');
 const check=eligibility(state,data.personId,now);fail(check.allowed,check.reason);
 const active=e=>e.status==='active'&&e.end>=day(now);
 fail(!state.enrollments.some(e=>e.personId===data.personId&&e.programId===program.id&&active(e)),'للشخص تسجيل سارٍ في هذا البرنامج بالفعل');
 fail(state.enrollments.filter(e=>e.groupId===group.id&&active(e)).length<group.capacity,'المجموعة مكتملة السعة');
 fail(!state.enrollments.some(e=>e.id===data.id),'معرف التسجيل مستخدم');
 const e={id:data.id,personId:data.personId,programId:program.id,groupId:group.id,status:'active',start:day(now),end:plus(now,program.days),credits:program.credits};
 fail(typeof e.id==='string'&&e.id.length>0,'معرف التسجيل مطلوب');
 state.enrollments.push(e);state.audit.push({action:'demo-enrollment',enrollmentId:e.id,at:now.toISOString()});return clone(e);
}
function attend(state,sessionId,enrollmentId,now=new Date()){
 const session=state.sessions.find(s=>s.id===sessionId),e=state.enrollments.find(x=>x.id===enrollmentId);
 fail(session&&e,'الحصة أو التسجيل غير موجود');
 fail(session.groupId===e.groupId,'التسجيل لا يتبع مجموعة الحصة');
 if(state.attendance.some(a=>a.sessionId===sessionId&&a.enrollmentId===enrollmentId))return false;
 fail(e.status==='active'&&session.date>=e.start&&session.date<=e.end,'التسجيل غير سارٍ في موعد الحصة');
 fail(eligibility(state,e.personId,now).allowed,'يلزم مراجعة الأهلية قبل تسجيل الحضور');
 fail(e.credits>0,'لا يوجد رصيد حصص لهذا التسجيل');
 e.credits--;const at=now.toISOString();state.attendance.push({sessionId,enrollmentId,at});state.creditLedger.push({sessionId,enrollmentId,delta:-1,at});state.audit.push({action:'demo-attendance',sessionId,enrollmentId,at});return true;
}
/* Additive resource schema for this demo. Never replaces saved enrollments or history. */
function prepareResources(state){
 if(state.resourceSchema===1)return state;
 state.resources.forEach(r=>{r.units=r.units||r.parts.map((name,i)=>({id:r.id+'-'+(i+1),name,capacity:r.type==='pool'?6:10}));r.capacity=r.capacity||(r.type==='pool'?18:r.type==='pitch'?20:15);r.opens=r.opens||'07:00';r.closes=r.closes||'22:00';r.bufferMinutes=r.bufferMinutes??0;});
 state.bookings=state.bookings||[];
 // Only the fixed demo groups have a known resource mapping; never infer other allocations.
 const mapped={gs:['pool','pool-1'],gf:['pitch',null],gg:['hall',null]};
 if(state.source==='demo')state.sessions.forEach(s=>{const m=mapped[s.groupId];if(!m||!state.resources.some(r=>r.id===m[0])||state.bookings.some(b=>b.sessionId===s.id))return;const start=new Date(cairoInstant(s.date,s.time));state.bookings.push({id:'training-'+s.id,resourceId:m[0],unitId:m[1],kind:'training',sessionId:s.id,groupId:s.groupId,start:start.toISOString(),end:new Date(start.getTime()+s.duration*60000).toISOString(),status:'reserved',title:state.groups.find(g=>g.id===s.groupId)?.name||'حصة تدريب',created:state.created});});
 state.resourceSchema=1;return state;
}
const cairoParts=value=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
function cairoInstant(date,time){
 fail(/^\d{4}-\d{2}-\d{2}$/.test(date)&&/^\d{2}:\d{2}$/.test(time),'حدد تاريخًا ووقتًا صحيحين');
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number),target=Date.UTC(y,m-1,d,h,min);let guess=target;
 for(let i=0;i<3;i++){const p=cairoParts(guess);guess+=target-Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute));}
 const p=cairoParts(guess);fail(p.year+'-'+p.month+'-'+p.day===date&&p.hour+':'+p.minute===time,'الوقت غير صالح بتوقيت القاهرة');
 return new Date(guess).toISOString();
}
const cairoDay=value=>{const p=cairoParts(value);return p.year+'-'+p.month+'-'+p.day;};
const minutes=time=>{const [h,m]=time.split(':').map(Number);return h*60+m;};
function resourceConflicts(state,data,ignoreId){
 const r=state.resources.find(r=>r.id===data.resourceId);if(!r)return [];
 const gap=(r.bufferMinutes||0)*60000,from=new Date(data.start).getTime(),to=new Date(data.end).getTime();
 return (state.bookings||[]).filter(b=>b.id!==ignoreId&&b.status==='reserved'&&b.resourceId===data.resourceId&&(!b.unitId||!data.unitId||b.unitId===data.unitId)&&from<new Date(b.end).getTime()+gap&&to+gap>new Date(b.start).getTime());
}
function reserve(state,data,now=new Date()){
 const r=state.resources.find(r=>r.id===data.resourceId);fail(r,'اختر منشأة مسجلة');
 const unit=data.unitId?r.units.find(u=>u.id===data.unitId):null;fail(!data.unitId||unit,'الجزء لا يتبع المنشأة المختارة');
 fail(['free','maintenance'].includes(data.kind),'اختر حجزًا حرًا أو إغلاق صيانة');
 fail(typeof data.id==='string'&&data.id.length&&!state.bookings.some(b=>b.id===data.id),'معرف الحجز مستخدم أو غير صالح');
 const from=new Date(data.start).getTime(),duration=Number(data.duration);
 fail(Number.isFinite(from)&&from>=now.getTime(),'حدد موعدًا صحيحًا في المستقبل');
 fail(Number.isInteger(duration)&&duration>=15&&duration<=240,'مدة الحجز من 15 إلى 240 دقيقة');
 const to=from+duration*60000,start=new Date(from).toISOString(),end=new Date(to).toISOString();
 const a=cairoParts(start),b=cairoParts(end),open=minutes(r.opens),close=minutes(r.closes);
 fail(cairoDay(start)===cairoDay(end)&&minutes(a.hour+':'+a.minute)>=open&&minutes(b.hour+':'+b.minute)<=close,'الموعد خارج ساعات تشغيل المنشأة بتوقيت القاهرة');
 const title=String(data.title||'').trim();fail(title.length>=3&&title.length<=140,'اكتب وصفًا من 3 إلى 140 حرفًا');
 let personId=null,participants=0;
 if(data.kind==='free'){
  fail(state.people.some(p=>p.id===data.personId),'اختر مستفيدًا مسجلًا');
  const check=eligibility(state,data.personId,now);fail(check.allowed,check.reason);
  personId=data.personId;participants=Number(data.participants);
  fail(Number.isInteger(participants)&&participants>=1&&participants<=(unit?.capacity||r.capacity),'عدد المشاركين يتجاوز سعة الجزء المختار أو غير صحيح');
 }
 const entry={id:data.id,resourceId:r.id,unitId:unit?.id||null,kind:data.kind,personId,participants,start,end,title,status:'reserved',created:now.toISOString()};
 const conflicts=resourceConflicts(state,entry);fail(!conflicts.length,'الموعد متعارض مع '+conflicts.map(b=>b.kind==='maintenance'?'إغلاق صيانة':b.kind==='training'?'حصة تدريب':'حجز قائم').join('، ')+'؛ اختر جزءًا آخر أو موعدًا آخر');
 state.bookings.push(entry);state.audit.push({action:data.kind==='maintenance'?'demo-maintenance':'demo-booking',bookingId:entry.id,at:now.toISOString()});return clone(entry);
}
function cancelBooking(state,id,reason,now=new Date()){
 const b=state.bookings.find(b=>b.id===id);fail(b,'الحجز غير موجود');fail(b.kind!=='training','الحصة مرتبطة بجدول التدريب؛ لا تلغى من الحجز الحر');
 fail(b.status==='reserved','الحجز ملغى بالفعل');const text=String(reason||'').trim();fail(text.length>=3&&text.length<=300,'اكتب سبب إلغاء من 3 إلى 300 حرف');
 b.status='cancelled';b.cancelReason=text;b.cancelledAt=now.toISOString();state.audit.push({action:'demo-booking-cancel',bookingId:b.id,reason:text,at:now.toISOString()});return clone(b);
}
function create(storage,now=()=>new Date()){
 let state,conflict=false;const raw=storage?.getItem(KEY);
 if(raw){try{state=JSON.parse(raw);fail(state.version===1&&Array.isArray(state.people)&&Array.isArray(state.enrollments),'نسخة بيانات غير مدعومة');}catch{throw Error('تعذر قراءة بيانات نسخة النادي؛ لم يتم استبدالها. احفظ نسخة منها قبل المتابعة.');}}
 else state=seed(now());
 prepareResources(state);
 function mutate(fn){
  fail(!conflict,'بيانات النادي اتغيرت في نافذة أخرى؛ أعد تحميل الصفحة');
  if(storage){const latest=storage.getItem(KEY);if(latest&&JSON.parse(latest).revision!==state.revision){conflict=true;throw Error('بيانات النادي اتغيرت في نافذة أخرى؛ أعد تحميل الصفحة');}}
  const next=clone(state),result=fn(next);next.revision++;storage?.setItem(KEY,JSON.stringify(next));state=next;return result;
 }
 return {get state(){return clone(state);},membership:id=>membership(state,id,now()),eligibility:id=>eligibility(state,id,now()),enroll:data=>mutate(s=>enroll(s,data,now())),attend:(sid,eid)=>mutate(s=>attend(s,sid,eid,now())),reserve:data=>mutate(s=>reserve(s,data,now())),cancelBooking:(id,reason)=>mutate(s=>cancelBooking(s,id,reason,now())),export:()=>JSON.stringify(state,null,2)};
}
const api={KEY,seed,membership,eligibility,enroll,attend,prepareResources,resourceConflicts,reserve,cancelBooking,cairoDay,cairoInstant,create};root.ClubModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

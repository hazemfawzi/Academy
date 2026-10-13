const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Core=require('./core.js');
function setup(){let raw=null;const storage={getItem:()=>raw,setItem:(k,v)=>{raw=v;}};let now=new Date('2026-10-02T10:00:00+03:00');return {storage,db:Core.create(storage,()=>now),setNow:d=>now=new Date(d)};}
test('RSVP is separate from arrival and actual attendance; finish consumes once',()=>{
 const {db,setNow}=setup();const s=db.state.sessions[0];assert.deepEqual(s.present,{});db.rsvp(s.id,'m0','confirmed');assert.deepEqual(s.present,{});assert.throws(()=>db.arrive(s.id,'m0'),/30/);
 setNow(new Date(new Date(s.start).getTime()-10*60000));db.arrive(s.id,'m0');assert.equal(db.session(s.id).present.m0,undefined);db.attend(s.id,'m0',true);const remaining=db.member('m0').remaining;db.finish(s.id);assert.equal(db.member('m0').remaining,remaining-1);assert.throws(()=>db.finish(s.id),/مقفولة/);assert.equal(db.member('m0').remaining,remaining-1);
});
test('freeze records selected duration/date; approval updates balance/end; duplicate decisions fail',()=>{
 const {db}=setup();const before=db.member('m0').end;const r=db.request('m0','freeze',{days:3,from:'2026-10-05',reason:'سفر'});assert.equal(r.payload.days,3);assert.throws(()=>db.request('m0','freeze',{days:7,from:'2026-10-06'}),/قيد المراجعة/);db.decide(r.id,true);assert.equal(db.member('m0').freezeBalance,7);assert.equal(db.member('m0').end,db.addDays(before,3));assert.throws(()=>db.decide(r.id,true),/مش قيد/);
});
test('rejection requires reason and does not change subscription',()=>{
 const {db}=setup();const before=db.member('m0').end;const r=db.request('m0','freeze',{days:7,from:'2026-10-06'});assert.throws(()=>db.decide(r.id,false,''),/سبب/);db.decide(r.id,false,'راجع موعد البداية');assert.equal(db.member('m0').end,before);assert.equal(db.state.requests[0].reason,'راجع موعد البداية');
});
test('selected payment plan/method recorded; no activation before approval',()=>{
 const {db}=setup();const before=db.member('m0').end;const r=db.request('m0','payment',{plan:'quarterly',method:'فودافون كاش',reference:'TEST-73'});assert.equal(db.member('m0').end,before);db.decide(r.id,true);assert.equal(db.state.transactions[0].amount,2400);assert.equal(db.state.transactions[0].method,'فودافون كاش');assert.equal(db.member('m0').remaining,45);assert.equal(db.member('m0').end,db.addDays(before,90));assert.throws(()=>db.pay('m0','monthly','فودافون كاش','TEST-73',0),/مسجل/);
});
test('partial payment activates exactly once, refund cannot exceed paid, shift reconciles only new cash',()=>{
 const {db}=setup();const before=db.member('m0').remaining;const tx=db.pay('m0','monthly','كاش','',0,300),inv=db.state.invoices[0];assert.equal(db.member('m0').remaining,before);db.settle(inv.id,600,'كاش','');assert.equal(db.member('m0').remaining,before+12);assert.throws(()=>db.settle(inv.id,1,'كاش',''),/المتبقي/);db.refund(tx.id,100,'تصحيح');assert.equal(db.cashExpected(),800);assert.throws(()=>db.refund(tx.id,201,'تصحيح'),/أكبر/);assert.throws(()=>db.closeShift(790,''),/سبب/);db.closeShift(800,'');assert.equal(db.cashExpected(),0);db.pay('m1','trial','كاش','',0);assert.equal(db.cashExpected(),120);
});
test('makeup approval consumes credit once and confirms selected session',()=>{
 const {db}=setup();const sid=db.state.sessions[1].id;const r=db.request('m0','makeup',{sessionId:sid});assert.equal(db.member('m0').makeupCredits,2);db.decide(r.id,true);assert.equal(db.member('m0').makeupCredits,1);assert.equal(db.session(sid).rsvp.m0,'confirmed');
});
test('lead conversion requires a paid member with matching phone',()=>{
 const {db}=setup();db.saveLead({name:'عميل تجربة',phone:'01012345678',owner:'الاستقبال',due:'2026-10-04'});const l=db.state.leads[0];assert.throws(()=>db.moveLead(l.id,'won',''),/حصّل/);const m=db.addMember({name:l.name,phone:l.phone,group:'A'});db.pay(m.id,'monthly','كاش','',0);db.moveLead(l.id,'won','اشترك بعد التجربة');assert.equal(db.state.leads[0].stage,'won');
});
test('waitlist offers expire and pass to next member; acceptance reserves a spot',()=>{
 const {db,setNow}=setup();const sid=db.state.sessions[1].id;db.update(s=>s.waitlist.push({id:'w1',sessionId:sid,memberId:'m1',status:'waiting'},{id:'w2',sessionId:sid,memberId:'m2',status:'waiting'}));db.offerNext(sid);assert.throws(()=>db.offerNext(sid),/مفتوح/);setNow('2026-10-02T14:00:00+03:00');assert.throws(()=>db.acceptOffer('w1'),/انتهى/);db.offerNext(sid);db.acceptOffer('w2');assert.equal(db.session(sid).rsvp.m2,'confirmed');
});
test('persistent reload and stale tab conflict prevent overwriting changes',()=>{
 const {db,storage}=setup();db.persist();const other=Core.create(storage);db.pay('m0','trial','كاش','',0);assert.throws(()=>other.pay('m1','trial','كاش','',0),/صفحة تانية/);assert.equal(other.state.transactions.length,0);other.reload();assert.equal(other.state.transactions.length,1);other.pay('m1','trial','كاش','',0);assert.equal(Core.create(storage).state.transactions.length,2);
});
test('failed local storage rolls back domain changes and preserves corrupt storage',()=>{
 const {db,storage}=setup();db.persist();storage.setItem=()=>{throw Error('quota');};const before=db.member('m0').remaining;assert.throws(()=>db.pay('m0','monthly','كاش','',0),/quota/);assert.equal(db.member('m0').remaining,before);assert.equal(db.state.transactions.length,0);let corrupt='{bad';const broken=Core.create({getItem:()=>corrupt,setItem:(k,v)=>corrupt=v});assert.equal(broken.persist(),false);assert.equal(corrupt,'{bad');
});

// Source-level integration harness: evaluates scripts and generated markup without a browser.
function harness(filename,withDemo=false){
 const elements=new Map();class Element{constructor(){this.innerHTML='';this.textContent='';this.style={};this.value='';this.dataset={};this.hidden=false;this.classList={add(){},remove(){},toggle(){},contains(){return false;}};}setAttribute(){}prepend(){}appendChild(){}querySelector(){return null;}querySelectorAll(){return [];}focus(){}scrollIntoView(){}click(){}addEventListener(){}remove(){}}
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};const listeners={};const errors=[];let raw=null;
 const document={getElementById:get,createElement:()=>new Element(),body:new Element(),querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(n,f)=>{listeners[n]=f;}};
 const ctx={console,Date,Math,JSON,Set,Map,Number,String,Array,Object,RegExp,Error,Boolean,Intl,document,navigator:{onLine:true},localStorage:{_data:new Map(),getItem(k){return this._data.get(k)||null;},setItem(k,v){this._data.set(k,v);}},setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},queueMicrotask:fn=>{try{fn();}catch(e){errors.push(e);}},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},removeEventListener(){},scrollTo(){},Blob,URL,innerHeight:900};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'avatars.js'),'utf8'),ctx,{filename:'avatars.js'});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'core.js'),'utf8'),ctx,{filename:'core.js'});
 if(withDemo)vm.runInContext(fs.readFileSync(path.join(__dirname,'demo-data.js'),'utf8'),ctx,{filename:'demo-data.js'});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'team-cards.js'),'utf8'),ctx,{filename:'team-cards.js'});
 const html=fs.readFileSync(path.join(__dirname,filename),'utf8');for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(m[1].trim())vm.runInContext(m[1],ctx,{filename});}
 vm.runInContext(fs.readFileSync(path.join(__dirname,'enhancements.js'),'utf8'),ctx,{filename:'enhancements.js'});
 for(const script of ['dashboard.js','finance.js',...(filename.includes('apps')?['member-home.js']:[]),'refinements.js',...(filename.includes('apps')?['mobile-suite.js','coach-complete.js','mobile-parity.js']:[]),'prototype-flow.js',...(filename.includes('apps')?['community-core.js','community.js']:[])])vm.runInContext(fs.readFileSync(path.join(__dirname,script),'utf8'),ctx,{filename:script});
 return {ctx,get,errors,eval:code=>vm.runInContext(code,ctx),listeners};
}
function validateHandlers(html){for(const m of html.matchAll(/\bon(?:click|change|input|keydown)="([^"]*)"/g)){const js=m[1].replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');assert.doesNotThrow(()=>new vm.Script('(function(event){'+js+'})'));}}
test('mobile enhanced routes render, form selections reach domain, coach workflow survives role switch',()=>{
 const h=harness('apps.html');for(const [role,routes] of Object.entries({member:['home','sessions','account','myrequests','progress','more'],coach:['home','attend','teams','record','finish'],manager:['home','collect','members','newm','requests','gmore','leads','followups','shifts','waitlist']})){h.eval(`setApp('${role}')`);for(const route of routes){assert.doesNotThrow(()=>h.eval(`go('${route}')`));validateHandlers(h.get('view').innerHTML);}}
 h.eval("setApp('member');V.open(V.freezeForm())");h.get('vf-days').value='3';h.get('vf-from').value=h.ctx.V.db.day(new Date());h.get('vf-reason').value='اختبار';h.eval('V.freezeSave()');assert.equal(h.ctx.V.db.state.requests[0].payload.days,3);
 h.eval("V.demo();setApp('coach');V.attend('m0',true);V.attend('m1',true);V.attend('m2',true);V.attend('m3',true);go('teams')");assert.equal(h.ctx.V.db.state.sessions[0].teams.length,2);h.eval("setApp('member');setApp('coach');go('record')");assert.match(h.get('view').innerHTML,/إنهاء الماتش/);h.eval("C.rec.pend={s:0,n:C.teams[C.rec.a].pl[0].n};c_goal(null);c_save()");assert.equal(h.ctx.V.db.state.sessions[0].history.length,1);assert.equal(h.errors.length,0);
});
test('dashboard enhanced routes and markup initialize without runtime errors',()=>{
 const h=harness('dashboard.html');for(const route of ['dash','members','billing','attendance','reports','vrequests','vleads','vfollowups','vshifts','vwaitlist']){assert.doesNotThrow(()=>h.eval(`go('${route}')`));validateHandlers(h.get('content').innerHTML);assert.ok(h.get('content').innerHTML.length>30);}
 const V=h.ctx.V;for(const html of [V.freezeForm(),V.paymentForm(),V.collectForm('m0'),V.newMemberForm(),V.shiftForm(),V.makeupForm()])validateHandlers(html);assert.equal(h.errors.length,0);
});
test('payment UI submits chosen plan and transfer reference rather than fixed defaults',()=>{
 const h=harness('apps.html');h.eval('V.open(V.paymentForm())');h.get('vp-plan').value='half';h.get('vp-method').value='فودافون كاش';h.get('vp-reference').value='REF-956';h.eval('V.paymentSave()');const r=h.ctx.V.db.state.requests[0];assert.equal(r.payload.plan,'half');assert.equal(r.payload.method,'فودافون كاش');assert.equal(r.payload.reference,'REF-956');h.eval(`V.approve('${r.id}')`);assert.equal(h.ctx.V.db.state.transactions[0].amount,4500);
});
test('coach edits after loading a saved record persist; special characters stay text in new screens',()=>{
 const h=harness('apps.html');h.eval("V.demo();setApp('coach');V.attend('m0',true);V.attend('m1',true);V.attend('m2',true);V.attend('m3',true);go('teams');V.reload();go('record')");h.eval("C.rec.pend={s:0,n:C.teams[C.rec.a].pl[0].n};c_goal(null)");assert.equal(h.ctx.V.db.state.sessions[0].record.ev.length,1);h.ctx.V.db.reload();assert.equal(h.ctx.V.db.state.sessions[0].record.ev.length,1);
 h.eval('V.sync();c_save()');const m=h.ctx.V.db.addMember({name:'لاعب <img src=x onerror=alert(1)>',phone:'01098765432',group:'A'});h.ctx.V.db.attend(h.ctx.V.sessionId,m.id,true);h.eval("V.sync();go('teams')");assert.ok(h.get('view').innerHTML.includes('&lt;img'));assert.ok(!h.get('view').innerHTML.includes('<img src=x'));validateHandlers(h.get('view').innerHTML);
});
test('offered waitlist seat cannot be taken by a separate confirmation',()=>{
 const {db}=setup();const sid=db.state.sessions[1].id;db.update(s=>{s.groups[0].capacity=1;s.waitlist.push({id:'w',sessionId:sid,memberId:'m1',status:'waiting'});});db.offerNext(sid);assert.throws(()=>db.rsvp(sid,'m2','confirmed'),/كاملة/);db.acceptOffer('w');assert.equal(db.session(sid).rsvp.m1,'confirmed');
});
test('unsaved match events cannot be silently erased by attendance changes or finishing session',()=>{
 const {db}=setup();db.update(s=>{s.demoClock=true;s.sessions[0].present.m0=true;s.sessions[0].record={ev:[{s:0,n:'أحمد سامي'}]};});const sid=db.state.sessions[0].id;assert.throws(()=>db.attend(sid,'m1',true),/احفظ الماتش/);assert.throws(()=>db.finish(sid),/احفظ نتيجة/);assert.equal(db.session(sid).record.ev.length,1);assert.equal(db.member('m0').remaining,9);
});
test('already confirmed session cannot consume a makeup credit again',()=>{
 const {db}=setup();assert.throws(()=>db.request('m0','makeup',{sessionId:'s0'}),/محجوزة/);assert.equal(db.member('m0').makeupCredits,2);
});
test('demo data covers new screens, links correctly and never replaces existing work',()=>{
 const {db}=setup(),Demo=require('./demo-data.js');const tx=db.pay('m1','trial','كاش','',0);const existingEnd=db.member('m1').end;Demo.populate(db,new Date('2026-10-02T10:00:00+03:00'));
 for(const key of ['members','sessions','requests','invoices','transactions','leads','followups','waitlist','shifts','audit'])assert.ok(db.state[key].length>0,key);
 assert.equal(db.member('m1').end,existingEnd);assert.ok(db.state.transactions.some(t=>t.id===tx.id));for(const key of ['requests','transactions','invoices','followups','waitlist'])for(const row of db.state[key])assert.ok(db.state.members.some(m=>m.id===row.memberId),key);
 const rev=db.state.revision;assert.equal(Demo.populate(db),false);assert.equal(db.state.revision,rev);
});
test('demo mobile and dashboard routes show populated data including teams and match events',()=>{
 const h=harness('apps.html',true);for(const [role,routes] of Object.entries({member:['home','sessions','account','myrequests','progress'],coach:['home','attend','teams','record','finish','players'],manager:['home','collect','requests','leads','followups','shifts','waitlist','reports','gsess']})){h.eval(`setApp('${role}')`);for(const route of routes){h.eval(`go('${route}')`);const html=h.get('view').innerHTML;assert.ok(html.length>100,route);assert.ok(!html.includes('class="v-empty"'),route);validateHandlers(html);}}
 const d=harness('dashboard.html',true);for(const route of ['dash','members','billing','attendance','reports','vrequests','vleads','vfollowups','vshifts','vwaitlist']){d.eval(`go('${route}')`);const html=d.get('content').innerHTML;assert.ok(!html.includes('class="v-empty"'),route);validateHandlers(html);}
});
test('unchanged coach renders reuse chrome and do not write local storage',()=>{
 const h=harness('apps.html',true);h.eval("setApp('coach');go('record')");const rev=h.ctx.V.db.state.revision;const chrome=['sw','tab','guide','v-save'];let writes=0;
 for(const id of chrome){const el=h.get(id);let html=el.innerHTML;Object.defineProperty(el,'innerHTML',{get:()=>html,set:v=>{writes++;html=v;}});}
 for(let i=0;i<40;i++)h.eval('draw()');assert.equal(writes,0);assert.equal(h.ctx.V.db.state.revision,rev);
 h.eval("C.rec.pend={s:0,n:C.teams[C.rec.a].pl[0].n};c_goal(null)");assert.equal(writes,0);assert.equal(h.ctx.V.db.state.revision,rev+1);
});
test('dashboard analytics reconcile with ledger, filter periods, and exclude open sessions',()=>{
 const {db}=setup(),Demo=require('./demo-data.js'),Dashboard=require('./dashboard.js'),now=new Date('2026-10-02T10:00:00+03:00');Demo.populate(db,now);
 const a=Dashboard.analyze(db.state,30,now),today=Dashboard.analyze(db.state,1,now);
 assert.equal(a.cash.paid,4500);assert.equal(a.cash.refund,100);assert.equal(a.cash.net,4400);assert.equal(today.cash.paid,1200);assert.equal(today.cash.net,1100);
 assert.equal(a.series.reduce((n,b)=>n+b.paid,0),a.cash.paid);assert.equal(a.methods.reduce((n,b)=>n+b.net,0),a.cash.net);assert.equal(a.outstanding,600);assert.equal(today.outstanding,600);
 assert.equal(a.closed,1);assert.equal(a.attended,8);assert.equal(a.expected,8);assert.equal(a.attendance,100);assert.equal(today.attendance,null);
 assert.equal(a.cohort,6);assert.equal(a.won,1);assert.equal(a.members.frozen.length,1);assert.ok(!a.risk.some(m=>m.id==='demo-member-3'));assert.equal(a.members.active.length+a.members.frozen.length+a.members.expired.length,db.state.members.length);
});
test('dashboard statistics handle no data and compare equal preceding date windows',()=>{
 const {db}=setup(),Dashboard=require('./dashboard.js'),now=new Date('2026-10-02T10:00:00+03:00');let a=Dashboard.analyze(db.state,7,now);assert.equal(a.attendance,null);assert.equal(a.conversion,null);assert.equal(a.delta,null);assert.equal(a.cash.net,0);
 db.update(s=>{s.transactions.push({id:'p',kind:'payment',amount:100,method:'كاش',at:'2026-09-24T09:00:00+03:00'},{id:'c',kind:'payment',amount:150,method:'كاش',at:'2026-10-01T09:00:00+03:00'});});a=Dashboard.analyze(db.state,7,now);assert.equal(a.previous.net,100);assert.equal(a.cash.net,150);assert.equal(a.delta,50);
});
test('dashboard period filters, charts, drilldowns and group filter render safely',()=>{
 const h=harness('dashboard.html',true);
 for(const days of [1,7,30,90]){h.eval(`Dashboard.change(${days})`);const html=h.get('content').innerHTML;assert.ok(html.includes('kd-chart'));assert.ok(html.includes('جدول النهارده'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));validateHandlers(html);}
 for(const kind of ['cash','dues','attendance','leads','renewals','tasks','active','expired','frozen']){h.eval(`Dashboard.detail('${kind}')`);validateHandlers(h.get('modal').innerHTML);}
 h.eval("Dashboard.group='B';render()");assert.ok(h.get('content').innerHTML.includes('مفيش حصص مسجلة النهارده للاختيار ده'));
});




test('finance screens and receipts use Latin digits and preserve invoice details',()=>{
 const h=harness('dashboard.html',true),F=h.ctx.Finance;
 for(const tab of ['subscriptions','transactions','plans']){F.tab=tab;const html=F.billing();validateHandlers(html);assert.ok(!/[٠-٩۰-۹]/.test(html));assert.ok(!html.includes('NaN'));}
 F.filter='partial';F.query='';assert.match(F.invoiceRows(),/600/);
 F.query='no matching name';assert.match(F.invoiceRows(),/مفيش اشتراكات/);
 for(const tx of h.ctx.V.db.state.transactions){const html=F.receiptDocument(tx.id);assert.match(html,/window.print/);assert.match(html,/ELITE/);assert.ok(!/[٠-٩۰-۹]/.test(html));validateHandlers(html);}
 for(const days of [1,7,30,90]){F.range=days;assert.ok(!/NaN|Infinity|[٠-٩۰-۹]/.test(F.report()));}
});
test('shift snapshot separates transfers, validates denominations, and retains handover details',()=>{
 const {db}=setup();db.pay('m0','monthly','كاش','',0,300);db.pay('m1','trial','إنستاباي','BANK-1',0);const s=db.shiftSummary();assert.equal(s.expected,300);assert.equal(s.cashIn,300);assert.equal(s.count,2);
 assert.throws(()=>db.closeShift(300,'',{denominations:{200:1,100:0}}));
 const sh=db.closeShift(300,'تسليم كامل',{operator:'سارة',receiver:'رامي',denominations:{200:1,100:1}});assert.equal(sh.operator,'سارة');assert.equal(sh.receiver,'رامي');assert.equal(sh.cashIn,300);assert.equal(sh.methods.reduce((n,m)=>n+m.paid,0),420);assert.equal(db.cashExpected(),0);
});
test('member home exposes services and updates sporting statistics from saved matches',()=>{
 const h=harness('apps.html',true),H=h.ctx.MemberHome;
 for(const route of ['sessions','account','progress','food','feedback','myrequests','msgs','more'])assert.ok(H.render().includes("go('"+route+"')"),route);
 h.ctx.V.db.update(s=>s.sessions[0].history.push({events:[{n:s.members[0].name,a:s.members[0].name}],mvp:s.members[0].name}));
 assert.equal(H.progress().goals,1);assert.equal(H.progress().assists,1);assert.equal(H.progress().mvp,1);assert.ok(!/[٠-٩۰-۹]/.test(H.render()));validateHandlers(H.render());
});



test('member directory filters, sorts, and opens safe detailed profiles',()=>{
 const h=harness('dashboard.html',true),R=h.ctx.Refine;
 R.filter='dues';assert.ok(R.list().length>0);assert.ok(R.list().every(m=>h.ctx.V.db.state.invoices.some(i=>i.memberId===m.id&&i.total>i.paid)));
 R.filter='frozen';assert.ok(R.list().every(m=>R.status(m)==='frozen'));R.filter='all';R.query='not-found';assert.equal(R.list().length,0);assert.match(R.rows(),/مفيش أعضاء/);
 R.query='';R.sort='end';const rows=R.list();assert.ok(rows.every((m,i)=>!i||new Date(rows[i-1].end)<=new Date(m.end)));
 R.profile('m0');assert.match(h.get('modal').innerHTML,/آخر العمليات المالية/);validateHandlers(h.get('modal').innerHTML);
 const m=h.ctx.V.db.addMember({name:'<img src=x onerror=alert(1)>',phone:'01076543210',group:'A'});R.profile(m.id);assert.ok(!h.get('modal').innerHTML.includes('<img src=x'));assert.ok(h.get('modal').innerHTML.includes('&lt;img'));validateHandlers(R.members());
});
test('coach home exposes group sessions and team swaps retain keeper identity and persistence',()=>{
 const h=harness('apps.html',true),R=h.ctx.Refine;h.eval("setApp('coach');go('home')");assert.match(h.get('view').innerHTML,/حصصك الجاية والجارية/);validateHandlers(h.get('view').innerHTML);
 h.eval("go('teams')");assert.match(h.get('view').innerHTML,/rf-team/);R.playerMenu(0,0);validateHandlers(h.get('sheet').innerHTML);
 const before=h.eval('C.teams[0].pl[0].mid');R.move(0,0,1);assert.equal(h.eval('C.teams[0].pl[0].mid'),before,'unsaved goals prevent moves');
 h.eval('C.rec.ev=[];C.teams[0].gk=C.teams[0].pl[0].mid;C.teams[1].gk=C.teams[1].pl[0].mid');const a=h.eval('C.teams[0].pl[0].mid'),b=h.eval('C.teams[1].pl[0].mid');R.swap(0,0,1,0);assert.equal(h.eval('C.teams[0].gk'),b);assert.equal(h.eval('C.teams[1].gk'),a);
 h.ctx.V.db.reload();assert.equal(h.ctx.V.db.session(h.ctx.V.sessionId).teams[0].gk,b);R.move(0,0,1);assert.equal(h.eval('C.teams[0].gk'),null);assert.ok(!/[٠-٩۰-۹]/.test(R.teams()));
});



test('every screen in all three apps renders with working route targets and English digits',()=>{
 const h=harness('apps.html',true);h.eval('S.chat=Object.keys(TH)[0]');let count=0;
 for(const role of ['member','coach','manager']){h.eval(`setApp('${role}')`);const routes=h.eval(`Object.keys(APPS.${role}.F)`);for(const route of routes){h.eval(`go('${route}')`);const html=h.get('view').innerHTML;assert.ok(html.length>50,role+'/'+route);assert.ok(!/NaN|Infinity/.test(html),role+'/'+route);assert.ok(!/[٠-٩۰-۹]/.test(html),role+'/'+route);validateHandlers(html);for(const m of html.matchAll(/go\('([^']+)'\)/g))assert.ok(routes.includes(m[1]),role+'/'+route+' links to '+m[1]);count++;}}
 assert.ok(count>=40);assert.equal(h.errors.length,0);
});
test('manager mobile pages use cards instead of wide data tables; all filters and detail paths work',()=>{
 const h=harness('apps.html',true),M=h.ctx.MobileSuite;h.eval("setApp('manager')");for(const route of ['home','collect','members','requests','leads','followups','shifts','reports','gsess','gteams','waitlist']){h.eval(`go('${route}')`);assert.ok(!h.get('view').innerHTML.includes('<table'),route);}
 for(const tab of ['invoices','transactions','plans']){M.billingTab=tab;validateHandlers(M.collect());}M.memberStatus='dues';assert.match(M.memberRows(),/استكمال|متبقي/);M.memberQuery='not existing';assert.match(M.memberRows(),/مفيش نتائج/);M.session('demo-live');assert.match(h.get('view').innerHTML,/التقسيمة/);assert.match(h.get('view').innerHTML,/النتائج المحفوظة/);
});
test('restored coach features save arrival, goalkeeper ratings, notes, guest files and published teams',()=>{
 const h=harness('apps.html',true),P=h.ctx.CoachComplete;h.eval("setApp('coach')");P.arrival();assert.ok(h.ctx.V.db.session(h.ctx.V.sessionId).coachArrival);
 P.rate('m0');for(let i=0;i<5;i++)h.get('vk-'+i).value='4';h.get('cc-keeper').value='5';h.get('cc-position').value='حارس';h.get('vk-note').value='راجع التمركز';P.saveRate('m0');assert.equal(h.ctx.V.db.member('m0').keeperSkill,5);assert.equal(h.ctx.V.db.member('m0').notes[0].text,'راجع التمركز');
 P.share();h.eval("setApp('member');go('football')");assert.match(h.get('view').innerHTML,/تقسيمة شاركها الكابتن/);h.eval("go('feedback')");assert.match(h.get('view').innerHTML,/راجع التمركز/);
 h.eval("setApp('coach')");P.guestForm();h.get('cc-guest-name').value='ضيف اختبار';h.get('cc-guest-phone').value='01087654321';h.get('cc-guest-skill').value='3';P.addGuest();const guest=h.ctx.V.db.state.members.find(m=>m.phone==='01087654321');assert.ok(guest.guest);assert.equal(h.ctx.V.db.session(h.ctx.V.sessionId).rsvp[guest.id],'confirmed');assert.equal(guest.remaining,0);assert.equal(h.ctx.V.db.session(h.ctx.V.sessionId).present[guest.id],undefined);
});
test('session cancellation preserves credits exactly once and blocks further attendance or booking',()=>{
 const h=harness('apps.html',true),db=h.ctx.V.db,P=h.ctx.MobileParity;h.eval("setApp('manager');go('gsess')");const s=db.session('s0'),before=db.member('m0').makeupCredits;P.sessionForm('s0');h.get('mp-action').value='cancel-credit';h.get('mp-reason').value='صيانة الملعب';P.sessionSave('s0');assert.equal(db.session('s0').status,'cancelled');assert.equal(db.member('m0').makeupCredits,before+1);P.sessionSave('s0');assert.equal(db.member('m0').makeupCredits,before+1);assert.throws(()=>db.rsvp('s0','m0','confirmed'));assert.throws(()=>db.attend('s0','m0',true));assert.throws(()=>db.finish('s0'));h.eval("setApp('member');go('sessions')");assert.match(h.get('view').innerHTML,/الحصة ملغاة/);
});

test('new-member registration preserves source and initial skill without inheriting another member notes',()=>{
 const h=harness('apps.html',true);h.eval("setApp('manager');go('newm')");assert.match(h.get('view').innerHTML,/جه عن طريق/);h.get('vn-name').value='عضو جديد مستقل';h.get('vn-phone').value='01033334444';h.get('vn-group').value='B';h.get('mp-source').value='كابتن محمود';h.get('mp-skill').value='5';h.get('mp-plan').value='quarterly';h.ctx.V.newMemberSave();const m=h.ctx.V.db.state.members.find(m=>m.phone==='01033334444');assert.equal(m.source,'كابتن محمود');assert.equal(m.skill[0],5);assert.equal(m.notes.length,0);assert.equal(m.remaining,0);assert.equal(h.get('vc-plan').value,'quarterly');
});
test('group messages persist locally and appear in member threads with escaped content',()=>{
 const h=harness('apps.html',true);h.eval("setApp('manager')");h.get('mp-audience').value='A';h.get('mp-message').value='موعد جديد <img src=x onerror=alert(1)>';h.ctx.MobileParity.broadcast('manager');const threads=h.eval('Object.values(TH)');assert.ok(threads.some(t=>t.a==='أحمد سامي'&&t.m.some(m=>m[1].includes('&lt;img'))));const saved=h.ctx.V.db.state.legacy.mobile.TH;assert.ok(Object.values(saved).some(t=>t.a==='أحمد سامي'&&t.ua>0));
});
test('rescheduling and group transfer preserve unrelated records and enforce started-session guard',()=>{
 const h=harness('apps.html',true),P=h.ctx.MobileParity,db=h.ctx.V.db;h.eval("setApp('manager')");h.get('mp-action').value='move';h.get('mp-reason').value='تغيير الموعد';const next=new Date(Date.now()+10*86400000).toISOString().slice(0,16);h.get('mp-date').value=next;P.sessionSave('s1');assert.equal(db.session('s1').start,new Date(next).toISOString());const live=db.session('demo-live').start;P.sessionSave('demo-live');assert.equal(db.session('demo-live').start,live);h.get('mp-group').value='B';P.move('m0');assert.equal(db.member('m0').group,'B');assert.equal(db.session('s0').rsvp.m0,'confirmed');
});

test('payment review keeps inputs on back, validates before confirmation and commits once',()=>{
 const h=harness('apps.html'),db=h.ctx.V.db,F=h.ctx.PrototypeFlow;h.eval("setApp('manager');V.open(V.collectForm('m0'))");h.get('vc-plan').value='monthly';h.get('vc-discount').value='0';h.get('vc-paid').value='300';h.get('vc-method').value='كاش';h.get('vc-ref').value='';h.ctx.V.collectSave('m0');assert.equal(db.state.transactions.length,0);assert.match(h.get('sheet').innerHTML,/600/);F.cancel();assert.equal(h.get('vc-paid').value,'300');assert.equal(db.state.transactions.length,0);h.ctx.V.collectSave('m0');F.confirm();F.confirm();assert.equal(db.state.transactions.length,1);assert.equal(db.state.invoices[0].paid,300);assert.match(h.get('sheet').innerHTML,/إيصال تحصيل/);
 h.get('vc-paid').value='99999';h.ctx.V.collectSave('m0');assert.equal(F.pending,null);assert.equal(db.state.transactions.length,1);
});
test('complete prototype journey: register, partial pay, settle, freeze, attend, match, finish and hand over shift',()=>{
 const h=harness('apps.html'),db=h.ctx.V.db,F=h.ctx.PrototypeFlow;h.eval("setApp('manager');go('newm')");for(const [id,value] of Object.entries({'vn-name':'لاعب رحلة كاملة','vn-phone':'01055556666','vn-group':'A','mp-source':'زيارة الفرع','mp-skill':'3','mp-plan':'monthly'}))h.get(id).value=value;h.ctx.V.newMemberSave();const member=db.state.members.at(-1);h.get('vc-paid').value='400';h.get('vc-method').value='كاش';h.ctx.V.collectSave(member.id);F.confirm();assert.equal(member.remaining,0);const invoice=db.state.invoices.find(i=>i.memberId===member.id);h.ctx.V.settleForm(invoice.id);h.get('vs-amount').value='500';h.get('vs-method').value='كاش';h.get('vs-ref').value='';h.ctx.V.settleSave(invoice.id);F.confirm();assert.equal(member.remaining,12);
 const freeze=db.request(member.id,'freeze',{days:2,from:db.day(db.addDays(new Date(),8)),reason:'سفر'});h.ctx.V.approve(freeze.id);assert.equal(member.freezeBalance,8);
 h.eval("V.demo();setApp('coach')");for(const id of [member.id,'m0','m1','m2'])h.ctx.V.attend(id,true);h.eval("go('teams');C.rec.pend={s:0,n:C.teams[C.rec.a].pl[0].n};c_goal(null);c_save()");assert.equal(db.session(h.ctx.V.sessionId).history.length,1);h.ctx.V.finishSession();assert.notEqual(db.session(h.ctx.V.sessionId).status,'ended');F.confirm();assert.equal(db.session(h.ctx.V.sessionId).status,'ended');assert.equal(member.remaining,11);
 h.eval("setApp('manager');V.open(V.shiftForm())");for(const [id,value] of Object.entries({'fs-operator':'رامي','fs-receiver':'سارة','vx-actual':'900','vx-note':''}))h.get(id).value=value;h.get('fs-confirm').checked=true;h.ctx.Finance.closeShift();assert.equal(db.state.shifts.length,0);F.confirm();F.confirm();assert.equal(db.state.shifts.length,1);assert.equal(db.cashExpected(),0);assert.match(h.get('sheet').innerHTML,/تقرير تسليم الوردية/);
});
test('failed attendance stays open with feedback, and weight validation rejects empty or invalid values',()=>{
 const h=harness('apps.html'),F=h.ctx.PrototypeFlow;h.eval("setApp('coach');CoachComplete.scan()");h.get('cc-scan-member').value='m0';assert.equal(F.scanSave(),false);assert.match(h.get('v-error').textContent,/30/);const before=h.eval('M.weight');h.get('wt').value='';assert.equal(F.weight(),false);assert.equal(h.eval('M.weight'),before);h.get('wt').value='82.5';F.weight();assert.equal(h.eval('M.weight'),82.5);
});

test('community supports posts, likes, comments, public approval, reports and owner deletion',()=>{
 const Social=require('./community-core.js'),storage={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}},db=Social.create(storage),member={id:'m0',name:'أحمد',group:'A'},manager={id:'manager',manager:true,group:'A'};
 const p=db.publish(member,{body:'إنجاز جديد',audience:'club',nominate:true,art:'assets/team.svg'});assert.ok(!db.gallery().some(x=>x.id===p.id));db.like(p.id,member);assert.equal(p.likes.length,1);db.like(p.id,member);assert.equal(p.likes.length,0);db.comment(p.id,member,'تجربة جميلة');assert.equal(p.comments.length,1);assert.throws(()=>db.moderate(p.id,member,true));db.moderate(p.id,manager,true);assert.ok(db.gallery().some(x=>x.id===p.id));db.report(p.id,member,'مراجعة الصورة');assert.throws(()=>db.report(p.id,member,'بلاغ مكرر'));db.resolve(db.state.reports[0].id,manager,true);assert.ok(!db.gallery().some(x=>x.id===p.id));assert.ok(!db.feed(member).some(x=>x.id===p.id));
 const privatePost=db.publish(member,{body:'للجروب',audience:'A'});assert.ok(!db.feed({id:'m9',group:'B'}).some(x=>x.id===privatePost.id));assert.throws(()=>db.publish(member,{body:'ترشيح خاص',audience:'A',nominate:true,art:'assets/team.svg'}));assert.throws(()=>db.remove(privatePost.id,{id:'other'}));db.remove(privatePost.id,member);assert.ok(!db.state.posts.some(x=>x.id===privatePost.id));assert.equal(Social.create(storage).state.posts.length,db.state.posts.length);
});
test('community UI publishes safely, opens comments and manages gallery review',()=>{
 const h=harness('apps.html',true),Q=h.ctx.Social;h.eval("setApp('member');go('community')");assert.match(h.get('view').innerHTML,/الحكاية بتكمّل/);Q.compose();h.get('sc-body').value='<img src=x onerror=alert(1)> إنجاز';h.get('sc-audience').value='club';h.get('sc-kind').value='achievement';h.get('sc-nominate').checked=false;Q.publish();const p=Q.db.state.posts[0];assert.ok(h.get('view').innerHTML.includes('&lt;img'));assert.ok(!h.get('view').innerHTML.includes('<img src=x'));Q.comments(p.id);h.get('sc-comment').value='تعليق جديد';Q.comment(p.id);assert.equal(p.comments.length,1);validateHandlers(h.get('sheet').innerHTML);h.eval("setApp('manager');go('moderation')");assert.match(h.get('view').innerHTML,/ترشيحات صور النادي/);Q.moderate('post-training',true);assert.ok(Q.db.gallery().some(p=>p.id==='post-training'));
});
test('community storage failure rolls back updates and corrupt data is preserved',()=>{
 const Social=require('./community-core.js'),db=Social.create({getItem:()=>null,setItem(){throw Error('quota')}}),count=db.state.posts.length;assert.throws(()=>db.publish({id:'m0',name:'أحمد',group:'A'},{body:'نص',audience:'club'}));assert.equal(db.state.posts.length,count);let raw='{invalid';const broken=Social.create({getItem:()=>raw,setItem:(k,v)=>raw=v});assert.throws(()=>broken.like('post-team',{id:'m0'}));assert.equal(raw,'{invalid');
});
test('landing booking validates contact and consent; full booking flow keeps selections and confirms once',()=>{
 const api=require('./landing.js');assert.throws(()=>api.validate({plan:'trial',program:'football',branch:'zayed',slot:'موعد',name:'أحمد',phone:'123',consent:true}));
 const h=harness('apps.html',true);h.get('site-dialog').showModal=function(){this.open=true;};h.get('site-dialog').close=function(){this.open=false;};h.eval(fs.readFileSync(path.join(__dirname,'landing.js'),'utf8'));const L=h.ctx.Landing;L.book('quarterly');h.get('book-program').value='football';h.get('book-level').value='beginner';h.get('book-plan').value='quarterly';L.next();assert.equal(L.step,1);h.get('book-branch').value='zayed';h.get('book-slot').value=L.slots()[0];L.next();assert.equal(L.step,2);h.get('book-name').value='أحمد اختبار';h.get('book-phone').value='01022223333';h.get('book-consent').checked=false;L.next();assert.equal(L.saved,null);h.get('book-consent').checked=true;L.next();assert.ok(L.saved);L.next();const bookings=JSON.parse(h.ctx.localStorage.getItem('elite-bookings-v1'));assert.equal(bookings.length,1);assert.equal(bookings[0].plan,'quarterly');assert.match(h.get('dialog-body').innerHTML,/تنزيل ملخص الحجز/);validateHandlers(h.get('dialog-body').innerHTML);
});

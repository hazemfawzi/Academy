/* Shared projections and validation. This module does not mutate stored records. */
(function(root){
 'use strict';
 const day=v=>{const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const status=(m,now=new Date())=>m.freezes.some(f=>f.from<=day(now)&&f.to>=day(now))?'frozen':new Date(m.end)>now&&m.remaining>0?'active':'expired';
 function scope(state,filter={}){
  const groups=state.groups.filter(g=>(!filter.branch||filter.branch==='all'||g.branch===filter.branch)&&(!filter.sport||filter.sport==='all'||g.sport===filter.sport));
  const gids=new Set(groups.map(g=>g.id)),members=state.members.filter(m=>gids.has(m.group)),mids=new Set(members.map(m=>m.id));
  const match=rows=>rows.filter(row=>mids.has(row.memberId));
  return {groups,members,sessions:state.sessions.filter(s=>gids.has(s.group)),transactions:match(state.transactions),invoices:match(state.invoices),requests:match(state.requests),followups:match(state.followups),waitlist:match(state.waitlist)};
 }
 function summary(state,filter={},now=new Date()){
  const s=scope(state,filter),today=day(now),transactions=s.transactions.filter(t=>day(t.at)===today);
  const paid=transactions.filter(t=>t.kind==='payment').reduce((n,t)=>n+t.amount,0),refund=transactions.filter(t=>t.kind==='refund').reduce((n,t)=>n+t.amount,0);
  return {...s,paid,refund,net:paid-refund,todaySessions:s.sessions.filter(x=>day(x.start)===today).sort((a,b)=>new Date(a.start)-new Date(b.start)),upcoming:s.sessions.filter(x=>x.status==='scheduled'&&new Date(x.start).getTime()+x.duration*60000>=now.getTime()).sort((a,b)=>new Date(a.start)-new Date(b.start)),pending:s.requests.filter(r=>r.status==='pending'),openInvoices:s.invoices.filter(i=>i.paid<i.total),outstanding:s.invoices.reduce((n,i)=>n+Math.max(0,i.total-i.paid),0),overdue:s.followups.filter(f=>f.status==='open'&&f.due<=today),renewals:s.members.filter(m=>status(m,now)==='active'&&(m.remaining<=2||new Date(m.end)<=new Date(now.getTime()+7*86400000))),active:s.members.filter(m=>status(m,now)==='active').length};
 }
 function validateSession(state,data){
  const fail=message=>{throw Error(message);},group=state.groups.find(g=>g.id===data.group);
  if(!group)fail('اختر جروبًا مسجلًا');
  const start=new Date(data.start).getTime(),duration=Number(data.duration);
  if(!Number.isFinite(start))fail('حدد تاريخ ووقت صحيحين');
  if(!Number.isInteger(duration)||duration<15||duration>240)fail('مدة الحصة من 15 إلى 240 دقيقة');
  if(!String(data.coach||'').trim())fail('حدد المدرب المسؤول');
  if(!String(data.resource||'').trim())fail('حدد الملعب أو مساحة التدريب');
  const end=start+duration*60000;
  for(const s of state.sessions){
   if(s.id===data.id||s.status==='cancelled')continue;
   const gs=state.groups.find(g=>g.id===s.group),overlap=start<new Date(s.start).getTime()+s.duration*60000&&end>new Date(s.start).getTime();
   if(!overlap)continue;
   if(s.group===data.group)fail('الجروب لديه حصة متعارضة في هذا الوقت');
   if(s.coach&&s.coach.trim()===data.coach.trim())fail('المدرب لديه حصة أخرى في هذا الوقت');
   if(gs?.branch===group.branch&&s.resource&&s.resource.trim()===data.resource.trim())fail('مساحة التدريب محجوزة في هذا الوقت');
  }
  return {...data,start:new Date(start).toISOString(),duration,coach:data.coach.trim(),resource:data.resource.trim()};
 }
 const api={day,status,scope,summary,validateSession};root.AcademyModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

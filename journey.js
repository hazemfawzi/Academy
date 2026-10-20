/* Registration and collection presentation; domain rules remain in core.js. */
(function(){
 'use strict';
 if(!window.V)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>new Intl.NumberFormat('en-US').format(n)+' EGP';
 const steps=active=>`<ol class="journey-steps" aria-label="مراحل التسجيل">${['ملف اللاعب','الباقة والتحصيل','المراجعة والإيصال'].map((label,i)=>`<li ${i===active?'aria-current="step"':''} class="${i===active?'current':i<active?'done':''}"><span>${i<active?'✓':i+1}</span><b>${label}</b></li>`).join('')}</ol>`;
 const originalForm=V.newMemberForm;
 V.newMemberForm=lead=>`<section class="journey">${steps(0)}<header class="journey-heading"><small>تسجيل لاعب · الخطوة الأولى</small><h2>ابدأ بملف واضح للاعب</h2><p>سجّل بيانات التواصل والجروب، ثم اختر الباقة وسجّل المبلغ المستلم.</p></header><div class="journey-fields">${originalForm(lead).replace('<h3>عضو جديد</h3>','').replace('حفظ العضو والانتقال للتحصيل','حفظ الملف واختيار الباقة ←')}</div><p class="journey-footnote">حفظ الملف لا يفعّل الاشتراك. يمكنك استكمال التحصيل لاحقًا من ملف اللاعب.</p></section>`;
 const originalCollect=V.collectForm;
 V.collectForm=id=>`<section class="journey">${steps(1)}<header class="journey-heading"><small>الباقة والتحصيل · الخطوة الثانية</small><h2>${esc(V.db.member(id).name)}</h2><p>اختر الباقة وأدخل المبلغ الذي استلمته بالفعل. ستراجع التفاصيل قبل حفظ العملية.</p></header><div class="journey-fields">${originalCollect(id).replace(/<h3>.*?<\/h3>/,'').replace('تسجيل المبلغ المستلم','مراجعة المبلغ قبل التأكيد ←')}</div><div class="journey-payment" id="journey-payment" aria-live="polite"></div></section>`;
 const summary=()=>{
  const out=document.getElementById('journey-payment');if(!out)return;
  const plan=V.db.plans[document.getElementById('vc-plan')?.value];
  const discount=Number(document.getElementById('vc-discount')?.value),raw=document.getElementById('vc-paid')?.value,paid=Number(raw);
  if(!plan||!Number.isFinite(discount)||discount<0||discount>10||raw===''||!Number.isFinite(paid)||paid<=0){out.innerHTML='<p>أدخل مبلغًا صحيحًا وخصمًا من 0 إلى 10% لعرض الملخص.</p>';return;}
  const total=Math.round(plan.price*(1-discount/100));
  if(paid>total){out.innerHTML='<p>المبلغ المستلم أكبر من قيمة الباقة. راجع المبلغ قبل المتابعة.</p>';return;}
  out.innerHTML=`<div><span>قيمة الباقة بعد الخصم</span><b>${money(total)}</b></div><div><span>المستلم الآن</span><b>${money(paid)}</b></div><div><span>المتبقي</span><b>${money(total-paid)}</b></div><p>${paid===total?'✓ دفع كامل: تتفعّل حصص الباقة بعد التأكيد.':'دفعة جزئية: يبقى الاشتراك غير مفعّل حتى استكمال المتبقي.'}</p>`;
 };
 for(const name of ['collectAmount','collectMethod']){const fn=V[name];V[name]=function(...args){const result=fn.apply(this,args);summary();return result;};}
 document.addEventListener('input',e=>{if(e.target.id?.startsWith('vc-'))summary();});
 document.addEventListener('change',e=>{if(e.target.id?.startsWith('vc-'))summary();});
 const open=V.open;V.open=function(html){const result=open.call(this,html);const box=document.getElementById(typeof APPS==='undefined'?'modal':'sheet');if(box){box.classList.toggle('journey-dialog',!!box.querySelector('.journey'));summary();const phone=box.querySelector('#vn-phone');if(phone){phone.setAttribute('inputmode','tel');phone.setAttribute('maxlength','11');phone.setAttribute('placeholder','01012345678');}const name=box.querySelector('#vn-name');if(name)name.setAttribute('autocomplete','name');}return result;};
 if(typeof PAGES!=='undefined'){
  const home=PAGES.dash;
  PAGES.dash=()=>`<section class="journey-entry"><div><small>استقبال الأكاديمية</small><h2>لاعب جديد؟ ابدأ من هنا.</h2><p>ملف اللاعب، ثم الباقة والتحصيل، ثم إيصال محفوظ.</p></div><button class="btn" onclick="V.open(V.newMemberForm())">+ تسجيل لاعب</button></section>`+home();
  render();
 }
})();

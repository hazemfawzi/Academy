(function(){
'use strict';
const store=KoraCommunity.create((()=>{try{return window.localStorage}catch(e){return null}})()),actor={id:'site-visitor',name:'زائر الموقع'},el=id=>document.getElementById(id),E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let category='all',query='',order='latest',opened=null;
const all=()=>store.gallery(),find=id=>all().find(p=>p.id===id),arg=id=>E(JSON.stringify(id)),stamp=value=>new Intl.DateTimeFormat('ar-EG-u-nu-latn',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
window.SiteCommunity={
filter(value){category=value;this.render();},search(value){query=value.trim();this.render();},sort(value){order=value;this.render();},
render(){
const posts=all().filter(p=>(category==='all'||p.kind===category)&&(!query||(p.body+' '+p.author).includes(query))).sort((a,b)=>order==='popular'?b.likes.length-a.likes.length:new Date(b.at)-new Date(a.at));
document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));
el('site-community').innerHTML=posts.map(p=>`<article class="site-post"><header>${KoraAvatars.render(p.author,'',42)}<div><b>${E(p.author)}</b><small>${stamp(p.at)} · منشور عام</small></div></header><p>${E(p.body)}</p>${p.art?`<img src="${E(p.art)}" alt="لحظة من النادي" loading="lazy">`:p.media?'<p>معاينة الملف غير متاحة في الجلسة الحالية.</p>':''}<footer><button aria-pressed="${p.likes.includes(actor.id)}" onclick="SiteCommunity.like(${arg(p.id)})">${p.likes.includes(actor.id)?'♥':'♡'} تشجيع · ${p.likes.length}</button><button aria-expanded="${opened===p.id}" onclick="SiteCommunity.comments(${arg(p.id)})">التعليقات · ${p.comments.length}</button></footer>${opened===p.id?`<div class="feed-comments">${p.comments.map(c=>`<div class="site-comment"><b>${E(c.author)}</b><p>${E(c.text)}</p></div>`).join('')||'<p>خليك أول واحد يشجّع الفريق بتعليق.</p>'}<form onsubmit="event.preventDefault();SiteCommunity.comment(${arg(p.id)})"><label for="feed-comment">شارك بتعليق</label><textarea id="feed-comment" maxlength="500" required placeholder="اكتب تعليقك…"></textarea><p class="feed-comment-error" id="feed-comment-error" role="alert"></p><button class="primary" type="submit">إضافة تعليق كزائر</button></form></div>`:''}</article>`).join('')||'<div class="feed-empty">مفيش منشورات مطابقة. جرّب كلمة تانية أو اختار كل المنشورات.</div>';
},
like(id){if(!find(id))return;const draft=el('feed-comment')?.value;try{store.like(id,actor);this.render();if(draft&&el('feed-comment'))el('feed-comment').value=draft;el('community-status').textContent='';}catch(e){el('community-status').textContent=e.message;}},
comments(id){if(!find(id))return;opened=opened===id?null:id;this.render();},
comment(id){if(!find(id))return;try{store.comment(id,actor,el('feed-comment').value);this.render();el('community-status').textContent='تعليقك اتضاف';}catch(e){el('feed-comment-error').textContent=e.message;}}
};SiteCommunity.render();
})();

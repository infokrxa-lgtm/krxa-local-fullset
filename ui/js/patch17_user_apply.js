/* PATCH17 User Apply */
(function(){
let DATA=null, heroIdx=0, timer=null;
async function load(){
 try{
  const r=await fetch('/api/patch17/control-first?ts='+Date.now(),{cache:'no-store'});
  const d=await r.json(); DATA=d.data; applyVisibility(); applyHero();
 }catch(e){console.log('[PATCH17]',e)}
}
function q(id){return document.querySelectorAll('[data-admin-id="'+id+'"],[data-component="'+id+'"]');}
function applyVisibility(){
 if(!DATA)return;
 (DATA.pages||[]).forEach(p=>(p.items||[]).forEach(it=>{
   q(it.id).forEach(el=>el.style.display=it.enabled===false?'none':'');
 }));
}
function heroGroups(){
 const h=DATA&&DATA.components&&DATA.components.hero;
 if(!h)return[];
 return (h.groups||[]).filter(g=>g.enabled!==false).sort((a,b)=>(a.order||0)-(b.order||0));
}
function renderHero(g){
 const title=document.getElementById('discoveryHeroTitle')||document.getElementById('travelHeroPlace');
 const sub=document.getElementById('discoveryHeroSub')||document.getElementById('travelHeroText');
 if(title) title.textContent=g.title;
 if(sub) sub.textContent=(g.items||[]).filter(x=>x.enabled!==false).length+'개 추천 · 클릭해서 보기';
}
function applyHero(){
 const h=DATA&&DATA.components&&DATA.components.hero; if(!h)return;
 const groups=heroGroups(); if(!groups.length)return;
 renderHero(groups[heroIdx%groups.length]);
 if(timer)clearInterval(timer);
 if(h.rotation&&h.rotation.enabled!==false){
   timer=setInterval(()=>{const gs=heroGroups(); if(!gs.length)return; heroIdx=(heroIdx+1)%gs.length; renderHero(gs[heroIdx]);}, h.rotation.interval_ms||5000);
 }
}
function openHero(){
 const gs=heroGroups(); if(!gs.length){alert('Hero 데이터가 없습니다.');return;}
 const g=gs[heroIdx%gs.length];
 const items=(g.items||[]).filter(x=>x.enabled!==false);
 const html=items.map(x=>`<div style="padding:10px;border-bottom:1px solid #e5e7eb"><b>${x.name}</b><br><small>${x.area||''} · ${x.category||''}</small><br><button onclick="window.open('https://www.google.com/maps/search/${encodeURIComponent(x.address||x.name)}','_blank')">지도 열기</button></div>`).join('');
 if(window.KRXA_App&&KRXA_App.openModal) KRXA_App.openModal(g.title, html||'표시할 장소가 없습니다.');
 else alert(items.map(x=>x.name).join('\n'));
}
window.KRXA_HeroRotation={load,openCurrent:openHero};
document.addEventListener('DOMContentLoaded',()=>{load();setInterval(load,3000);});
})();
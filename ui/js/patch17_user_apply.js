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

/* PATCH17-6 User Execution Rules Helper */
(function(){
  async function getCurrentPositionText(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation) return reject(new Error("geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        p=>resolve(p.coords.latitude+","+p.coords.longitude),
        reject,
        {enableHighAccuracy:true,timeout:8000,maximumAge:60000}
      );
    });
  }

  function destinationOf(x){
    if(!x) return "";
    if(x.destination_type==="manual") return x.destination_value || x.address || x.map_query || x.name || "";
    if(x.destination_type==="address") return x.address || x.map_query || x.name || "";
    if(x.destination_type==="map_query") return x.map_query || x.address || x.name || "";
    return x.name || x.address || x.map_query || "";
  }

  async function runItem(x){
    if(!x || x.enabled===false) return;

    const action = x.action_type || (x.url ? "url" : x.phone ? "phone" : "map_dir");

    if(action==="url"){
      if(x.url) window.open(x.url,"_blank");
      return;
    }
    if(action==="phone"){
      if(x.phone) location.href="tel:"+x.phone;
      return;
    }
    if(action==="map_search"){
      const q=x.map_query||x.address||x.name;
      if(q) window.open("https://www.google.com/maps/search/"+encodeURIComponent(q),"_blank");
      return;
    }
    if(action==="map_dir"){
      const dest=destinationOf(x);
      if(!dest) return;
      let url="https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(dest)+"&travelmode="+encodeURIComponent(x.travel_mode||"driving");
      if((x.origin_type||"current_location")==="current_location"){
        try{
          const origin=await getCurrentPositionText();
          url="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(dest)+"&travelmode="+encodeURIComponent(x.travel_mode||"driving");
        }catch(e){}
      }
      window.open(url,"_blank");
      return;
    }
  }

  window.KRXA_Patch17_RunItem = runItem;
})();
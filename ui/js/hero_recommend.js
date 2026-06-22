// KRXA Travel V1 - Hero Recommend + Memory
(function(){
  window.KRXA_HeroRecommend=window.KRXA_HeroRecommend||{};
  let cards=[],index=0,timer=null;
  async function recordEvent(action,card){try{const ctx=window.KRXA_DeviceContext&&window.KRXA_DeviceContext.get?window.KRXA_DeviceContext.get():{};await fetch('/api/travel-memory/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,branch_id:card?card.branch_id:'',branch_title:card?card.branch_title:'',place_id:card?card.place_id:'',place_name:card?card.name:'',destination:card?card.destination:'',lat:ctx.lat||'',lng:ctx.lng||'',source:'hero_recommend'})});}catch(e){console.log('travel memory record failed',e)}}
  async function loadCards(){try{const data=await (await fetch('/api/travel-recommend')).json();cards=data.cards||[];if(!cards.length){renderEmpty();return;}index=0;renderCurrent();if(timer)clearInterval(timer);timer=setInterval(nextCard,5000);}catch(e){renderError(e.message)}}
  function renderCurrent(){const card=cards[index],place=document.getElementById('travelHeroPlace'),text=document.getElementById('travelHeroText');if(!card||!place||!text)return;place.textContent='📍 '+(card.name||card.title||'추천 장소');text.textContent=(card.branch_title||'추천')+' · '+(card.region||'')+' · '+(card.source||'');recordEvent('hero_exposed',card)}
  function nextCard(){if(!cards.length)return;index=(index+1)%cards.length;renderCurrent()}
  function renderEmpty(){const p=document.getElementById('travelHeroPlace'),t=document.getElementById('travelHeroText');if(p)p.textContent='🌍 추천 데이터 없음';if(t)t.textContent='CONTROL에서 활성화된 추천 장소를 등록하세요'}
  function renderError(msg){const p=document.getElementById('travelHeroPlace'),t=document.getElementById('travelHeroText');if(p)p.textContent='⚠ 추천 불러오기 실패';if(t)t.textContent=msg||'API 확인 필요'}
  window.KRXA_HeroRecommend.openCurrent=function(){const card=cards[index];if(!card){window.open('/travel-branch?branch=branch-heo-baekban','_blank');return;}recordEvent('hero_route_open',card);if(window.KRXA_DeviceContext&&window.KRXA_DeviceContext.openRouteTo){window.KRXA_DeviceContext.openRouteTo(card.destination||card.map_keyword||card.name);return;}window.open('https://www.google.com/maps/search/'+encodeURIComponent(card.destination||card.map_keyword||card.name),'_blank')};
  window.KRXA_HeroRecommend.openList=function(){const card=cards[index];const branchId=card&&card.branch_id?card.branch_id:'branch-heo-baekban';recordEvent('list_open',card);window.open('/travel-list?branch='+encodeURIComponent(branchId),'_blank')};
  document.addEventListener('DOMContentLoaded',loadCards);
})();


/* Hero Rotation Result Manager v1 */
window.KRXA_HeroRotation = (function(){
  let groups = [];
  let places = [];
  let idx = 0;
  let timer = null;
  let current = null;

  async function load(){
    try{
      const res = await fetch("/api/travel-hero-rotation?ts="+Date.now(), {cache:"no-store"});
      const data = await res.json();
      groups = ((data.groups && data.groups.groups) || []).filter(g => g.enabled !== false).sort((a,b)=>(a.order||0)-(b.order||0));
      places = (data.places && data.places.places) || [];
      if(groups.length) render(groups[0]);
      start();
    }catch(e){
      console.log("[HeroRotation]", e);
    }
  }

  function render(group){
    current = group;
    const title = document.getElementById("discoveryHeroTitle") || document.getElementById("travelHeroPlace");
    const sub = document.getElementById("discoveryHeroSub") || document.getElementById("travelHeroText");
    if(title) title.textContent = group.title || "추천";
    if(sub) sub.textContent = group.subtitle || "현재 위치 기준 추천";
  }

  function start(){
    if(timer) clearInterval(timer);
    if(!groups.length) return;
    timer = setInterval(()=>{
      idx = (idx + 1) % groups.length;
      render(groups[idx]);
    }, 5000);
  }

  function openCurrent(){
    if(!current){
      alert("추천 준비 중입니다.");
      return;
    }
    const list = places.filter(p => p.group_id === current.id && p.enabled !== false);
    if(!list.length){
      alert(current.title + " 목록이 없습니다.");
      return;
    }
    const html = list.map(p => `
      <div style="border-bottom:1px solid #e5e7eb;padding:10px 0">
        <b>${p.name}</b><br>
        <small>${p.area || ""} · ${p.category || ""}</small><br>
        <button onclick="window.open('https://www.google.com/maps/search/${encodeURIComponent(p.address || p.name)}','_blank')">지도 열기</button>
      </div>
    `).join("");
    if(window.KRXA_App && KRXA_App.openModal){
      KRXA_App.openModal(current.title, html);
    }else{
      alert(list.map(p=>p.name).join("\\n"));
    }
  }

  document.addEventListener("DOMContentLoaded", load);
  return {load, openCurrent};
})();

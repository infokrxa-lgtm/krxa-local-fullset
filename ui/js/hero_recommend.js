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

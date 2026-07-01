/* page5_m2m_state_machine.js - TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4F */
(function(){
  if(window.KRXA_PAGE5_M2M_STATE_V4F_LOADED){return;}
  window.KRXA_PAGE5_M2M_STATE_V4F_LOADED=true;
  var state={mode:"translate",listening:false,busy:false,lastError:null};
  function text(el){try{return(el&&(el.innerText||el.textContent||""))||"";}catch(e){return"";}}
  function isPage5(){try{return text(document.body).indexOf("말대말 통역")>=0;}catch(e){return false;}}
  function toggleEl(){try{return document.getElementById("autoToggle");}catch(e){return null;}}
  function visual(on){try{var el=toggleEl();if(!el)return;el.classList.toggle("active",!!on);el.classList.toggle("on",!!on);el.setAttribute("data-ai",on?"on":"off");el.setAttribute("aria-checked",on?"true":"false");}catch(e){}}
  function setStatus(msg){try{var nodes=Array.from(document.querySelectorAll("div,span,p,small"));var target=null;nodes.forEach(function(n){var t=text(n).trim();if(t.length<120&&(t.indexOf("다음 말")>=0||t.indexOf("말하기 버튼")>=0||t.indexOf("AI대화")>=0||t.indexOf("마이크")>=0||t.indexOf("통역")>=0)){if(!n.querySelector||n.querySelectorAll("button,input,select").length===0)target=n;}});if(target)target.textContent=msg;}catch(e){}}
  function setMode(mode){mode=(mode==="ai"||mode==="ai_dialogue")?"ai_dialogue":"translate";state.mode=mode;window.KRXA_PAGE5_MODE=mode==="ai_dialogue"?"ai":"translate";window.KRXA_M2M_MODE=window.KRXA_PAGE5_MODE;window.KRXA_PAGE5_AI_DIALOGUE_ENABLED=mode==="ai_dialogue";window.KRXA_AI_DIALOGUE_ENABLED=mode==="ai_dialogue";visual(mode==="ai_dialogue");setStatus(mode==="ai_dialogue"?"AI대화 준비 완료 · 말하기를 눌러 시작하세요":"마이크를 누르면 통역을 시작합니다");return state.mode;}
  function syncFromToggle(){var el=toggleEl();var on=false;try{on=!!(el&&(el.classList.contains("active")||el.classList.contains("on")||el.getAttribute("data-ai")==="on"||el.getAttribute("aria-checked")==="true"));}catch(e){}return setMode(on?"ai_dialogue":"translate");}
  function bindToggle(){var el=toggleEl();if(el){el.setAttribute("data-flow","page5.ai.toggle");el.removeAttribute("onclick");}}
  function init(){if(!isPage5())return;bindToggle();syncFromToggle();}
  document.addEventListener("DOMContentLoaded",init);setTimeout(init,300);setTimeout(init,1000);setInterval(function(){if(isPage5())bindToggle();},1000);
  window.KRXA_PAGE5_M2M_STATE_MACHINE={init:init,sync:syncFromToggle,setMode:setMode,getMode:function(){return state.mode;},runTranslate:function(){return setMode("translate");},runAI:function(){return setMode("ai_dialogue");},routeMic:function(){return false;},state:function(){return state;}};
})();

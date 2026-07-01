/* page5_m2m_state_machine.js - TRAVEL_V1_FULL_FLOW_STABLE_SET_V1
 * 상태만 관리한다. 마이크/AI 자동실행 없음.
 */
(function(){
  if(window.KRXA_PAGE5_M2M_STATE_STABLE_V1_LOADED){ return; }
  window.KRXA_PAGE5_M2M_STATE_STABLE_V1_LOADED=true;
  var state={mode:"translate",listening:false,busy:false,lastError:null};

  function text(el){ try{return (el&&(el.innerText||el.textContent||""))||"";}catch(e){return "";} }
  function isPage5(){ try{return text(document.body).indexOf("말대말 통역")>=0;}catch(e){return false;} }

  function findAiToggle(){
    try{
      var inputs=Array.from(document.querySelectorAll("input[type='checkbox']"));
      for(var i=0;i<inputs.length;i++){
        var around=text(inputs[i].parentElement||inputs[i].closest("label")||document.body);
        if(around.indexOf("AI대화")>=0){ return inputs[i]; }
      }
    }catch(e){}
    return null;
  }

  function setStatus(msg){
    try{
      var el=document.getElementById("flow")||document.getElementById("status");
      if(el){ el.innerText=msg; }
    }catch(e){}
  }

  function setMode(mode){
    mode=(mode==="ai"||mode==="ai_dialogue")?"ai_dialogue":"translate";
    state.mode=mode;
    window.KRXA_PAGE5_MODE=mode==="ai_dialogue"?"ai":"translate";
    window.KRXA_M2M_MODE=window.KRXA_PAGE5_MODE;
    window.KRXA_PAGE5_AI_DIALOGUE_ENABLED=mode==="ai_dialogue";
    window.KRXA_AI_DIALOGUE_ENABLED=mode==="ai_dialogue";
    if(mode==="ai_dialogue"){ setStatus("AI대화 준비 완료 · 말하기를 눌러 시작하세요"); }
    else{ setStatus("말하기 버튼을 눌러 통역을 시작하세요"); }
    return state.mode;
  }

  function syncFromToggle(){
    var t=findAiToggle();
    return setMode(t&&t.checked?"ai_dialogue":"translate");
  }

  function bindToggle(){
    var t=findAiToggle();
    if(t&&t.getAttribute("data-stable-page5-bound")!=="1"){
      t.setAttribute("data-stable-page5-bound","1");
      t.addEventListener("change",syncFromToggle,true);
      t.addEventListener("click",function(){setTimeout(syncFromToggle,30);},true);
    }
  }

  function init(){ if(!isPage5()){return;} bindToggle(); syncFromToggle(); }
  document.addEventListener("DOMContentLoaded",init);
  setTimeout(init,300);
  setTimeout(init,1000);

  window.KRXA_PAGE5_M2M_STATE_MACHINE={
    init:init,
    sync:syncFromToggle,
    setMode:setMode,
    getMode:function(){return state.mode;},
    runTranslate:function(){return setMode("translate");},
    runAI:function(){return setMode("ai_dialogue");},
    routeMic:function(){return false;},
    state:function(){return state;}
  };
})();

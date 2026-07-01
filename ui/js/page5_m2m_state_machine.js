/* page5_m2m_state_machine.js - TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4
 * 5페이지 모드 상태만 관리한다.
 * 자동 마이크 / 자동 AI 실행 없음.
 */
(function(){
  if(window.KRXA_PAGE5_M2M_STATE_V4_LOADED){ return; }
  window.KRXA_PAGE5_M2M_STATE_V4_LOADED = true;

  var state = { mode:"translate", listening:false, busy:false, lastError:null };

  function text(el){ try{return (el&&(el.innerText||el.textContent||""))||"";}catch(e){return "";} }
  function isPage5(){ try{return text(document.body).indexOf("말대말 통역")>=0;}catch(e){return false;} }

  function findAiToggle(){
    try{
      var inputs = Array.from(document.querySelectorAll("input[type='checkbox']"));
      for(var i=0;i<inputs.length;i++){
        var block = inputs[i];
        for(var j=0;j<7 && block && block!==document.body;j++){
          if(text(block).indexOf("AI대화")>=0){ return inputs[i]; }
          block = block.parentElement;
        }
      }
    }catch(e){}
    return null;
  }

  function setStatus(msg){
    try{
      var nodes = Array.from(document.querySelectorAll("div,span,p,small"));
      var target = null;
      nodes.forEach(function(n){
        var t = text(n).trim();
        if(t.length < 120 && (
          t.indexOf("다음 말") >= 0 ||
          t.indexOf("말하기 버튼") >= 0 ||
          t.indexOf("AI대화") >= 0 ||
          t.indexOf("음성") >= 0 ||
          t.indexOf("STT") >= 0 ||
          t.indexOf("통역") >= 0
        )){
          if(!n.querySelector || n.querySelectorAll("button,input,select").length===0){ target = n; }
        }
      });
      if(target){ target.textContent = msg; }
    }catch(e){}
  }

  function setMode(mode){
    mode = (mode==="ai" || mode==="ai_dialogue") ? "ai_dialogue" : "translate";
    state.mode = mode;

    window.KRXA_PAGE5_MODE = mode==="ai_dialogue" ? "ai" : "translate";
    window.KRXA_M2M_MODE = window.KRXA_PAGE5_MODE;
    window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = mode==="ai_dialogue";
    window.KRXA_AI_DIALOGUE_ENABLED = mode==="ai_dialogue";
    window.KRXA_AI_DIALOGUE_FREE_MODE = mode==="ai_dialogue";

    if(mode==="ai_dialogue"){ setStatus("AI대화 준비 완료 · 말하기를 눌러 시작하세요"); }
    else{ setStatus("말하기 버튼을 눌러 통역을 시작하세요"); }

    return state.mode;
  }

  function syncFromToggle(){
    var t = findAiToggle();
    return setMode(t && t.checked ? "ai_dialogue" : "translate");
  }

  function bindToggle(){
    var t = findAiToggle();
    if(t && t.getAttribute("data-v4-page5-bound")!=="1"){
      t.setAttribute("data-v4-page5-bound","1");
      t.addEventListener("change", syncFromToggle, true);
      t.addEventListener("click", function(){ setTimeout(syncFromToggle,30); }, true);
    }
  }

  function init(){
    if(!isPage5()){ return; }
    bindToggle();
    syncFromToggle();
  }

  document.addEventListener("DOMContentLoaded", init);
  setTimeout(init,300);
  setTimeout(init,1000);
  setInterval(function(){ if(isPage5()){ syncFromToggle(); } },1500);

  window.KRXA_PAGE5_M2M_STATE_MACHINE = {
    init:init,
    sync:syncFromToggle,
    setMode:setMode,
    getMode:function(){ return state.mode; },
    runTranslate:function(){ return setMode("translate"); },
    runAI:function(){ return setMode("ai_dialogue"); },
    routeMic:function(){ return false; },
    state:function(){ return state; }
  };
})();

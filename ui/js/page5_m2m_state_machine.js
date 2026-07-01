/* PATCH90_NO_PERMISSION_CONTROL: no mic permission or overlay control here. Buttons go through recordVoice path. */
/* page5_m2m_state_machine.js - PATCH80
 * 5페이지 말대말 전용 상태머신.
 * AI대화 OFF = translate / AI대화 ON = ai_dialogue
 */
(function(){
  if(window.KRXA_PAGE5_M2M_STATE_MACHINE_PATCH80_LOADED){ return; }
  window.KRXA_PAGE5_M2M_STATE_MACHINE_PATCH80_LOADED = true;

  var state = { mode:"translate", listening:false, busy:false, lastError:null };

  function text(el){ try{ return (el && (el.innerText || el.textContent || "")) || ""; }catch(e){ return ""; } }
  function isPage5(){ try{ return text(document.body).indexOf("말대말 통역") >= 0; }catch(e){ return false; } }

  function findAiToggle(){
    try{
      var inputs = Array.from(document.querySelectorAll("input[type='checkbox']"));
      for(var i=0;i<inputs.length;i++){
        var wrap = inputs[i].closest ? inputs[i].closest("label,div,section") : null;
        if(text(wrap).indexOf("AI대화") >= 0){ return inputs[i]; }
      }
    }catch(e){}
    return null;
  }

  function protectAiLabel(){
    try{
      var nodes = Array.from(document.querySelectorAll("div,span,label,p"));
      nodes.forEach(function(n){
        var t = text(n).trim();
        if(t === "AI대화 종료" || t === "AI 세션을 준비 중입니다" || t === "AI가 듣기 준비되었습니다"){
          var hasSwitch = n.querySelector && n.querySelector("input[type='checkbox']");
          var parentHasSwitch = n.parentElement && n.parentElement.querySelector && n.parentElement.querySelector("input[type='checkbox']");
          if(hasSwitch || parentHasSwitch || t.indexOf("AI") === 0){
            if(n.childNodes.length === 1){ n.textContent = "AI대화"; }
          }
        }
      });
    }catch(e){}
  }

  function findStatusEl(){
    try{
      var nodes = Array.from(document.querySelectorAll("div,span,p,small"));
      var best = null;
      nodes.forEach(function(n){
        var t = text(n).trim();
        if(t.length < 80 && (t.indexOf("다음 말")>=0 || t.indexOf("말하기 버튼")>=0 || t.indexOf("마이크")>=0 || t.indexOf("듣는")>=0 || t.indexOf("AI가")>=0)){
          if(!n.querySelector || n.querySelectorAll("button,input,select").length === 0){ best = n; }
        }
      });
      return best;
    }catch(e){}
    return null;
  }

  function setStatus(msg){
    protectAiLabel();
    var el = findStatusEl();
    if(el){ el.textContent = msg; }
    protectAiLabel();
  }

  function setMode(mode){
    mode = (mode === "ai" || mode === "ai_dialogue") ? "ai_dialogue" : "translate";
    state.mode = mode;
    window.KRXA_PAGE5_MODE = mode === "ai_dialogue" ? "ai" : "translate";
    window.KRXA_M2M_MODE = window.KRXA_PAGE5_MODE;

    if(window.KRXA_FLOW_LOCK){ window.KRXA_FLOW_LOCK.setFlow(mode, {source:"page5_m2m_state_machine"}); }

    if(mode === "ai_dialogue"){
      window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = true;
      window.KRXA_AI_DIALOGUE_ENABLED = true;
      window.KRXA_AI_DIALOGUE_FREE_MODE = true;
      window.KRXA_MINI_M2M_FORCE_TRANSLATE = false;
      try{ if(window.KRXA_Translate && window.KRXA_Translate.stopAuto){ window.KRXA_Translate.stopAuto(); } }catch(e){}
      try{ if(typeof window.stopAuto === "function"){ window.stopAuto(); } }catch(e){}
      try{ if(window.KRXA_AI_DIALOGUE_SESSION && window.KRXA_AI_DIALOGUE_SESSION.start){ window.KRXA_AI_DIALOGUE_SESSION.start(); } }catch(e){}
      setStatus("AI가 듣기 준비되었습니다");
    }else{
      window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = false;
      window.KRXA_AI_DIALOGUE_ENABLED = false;
      window.KRXA_AI_DIALOGUE_FREE_MODE = false;
      window.KRXA_PAGE5_AI_SESSION_ACTIVE = false;
      try{ if(window.KRXA_AI_DIALOGUE_TRUE_AUTO && window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop){ window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop(); } }catch(e){}
      try{ if(window.KRXA_AI_DIALOGUE_AUTO_LOOP && window.KRXA_AI_DIALOGUE_AUTO_LOOP.stop){ window.KRXA_AI_DIALOGUE_AUTO_LOOP.stop(); } }catch(e){}
      try{ if(window.KRXA_AI_DIALOGUE_SESSION && window.KRXA_AI_DIALOGUE_SESSION.stop){ window.KRXA_AI_DIALOGUE_SESSION.stop(); } }catch(e){}
      setStatus("말하기 버튼을 눌러 시작하세요");
    }
    protectAiLabel();
    return state.mode;
  }

  function syncFromToggle(){
    var t = findAiToggle();
    return setMode(t && t.checked ? "ai_dialogue" : "translate");
  }

  function bindToggle(){
    var t = findAiToggle();
    if(t && t.getAttribute("data-patch80-state-bound") !== "1"){
      t.setAttribute("data-patch80-state-bound","1");
      t.addEventListener("change", syncFromToggle, true);
      t.addEventListener("click", function(){ setTimeout(syncFromToggle, 30); }, true);
    }
  }

  function findMicButtons(){
    try{
      return Array.from(document.querySelectorAll("button,div")).filter(function(n){
        var t = text(n).trim();
        var cls = String(n.className||"");
        return t.indexOf("말하기")>=0 || t.indexOf("🎙")>=0 || t.indexOf("🎤")>=0 || cls.indexOf("listenCircle")>=0 || cls.indexOf("mic")>=0;
      });
    }catch(e){}
    return [];
  }

  function runTranslate(){
    setMode("translate");
    setStatus("듣는 중입니다. 말하세요.");
    try{
      if(window.KRXA_Translate && window.KRXA_Translate.requestMicAndStart){
        window.KRXA_Translate.requestMicAndStart({forceTranslate:true, source:"page5_state_machine"});
        return true;
      }
      if(typeof window.recordVoice === "function"){ window.recordVoice(); return true; }
    }catch(e){ state.lastError = String(e && e.message || e); setStatus("통역 시작 오류"); }
    return false;
  }

  async function runAI(){
    setMode("ai_dialogue");
    setStatus("AI가 듣는 중입니다. 자유롭게 말하세요.");
    try{ if(window.KRXA_AI_DIALOGUE_SESSION && window.KRXA_AI_DIALOGUE_SESSION.ensure){ await window.KRXA_AI_DIALOGUE_SESSION.ensure(); } }catch(e){}
    try{
      if(window.KRXA_AI_DIALOGUE_TRUE_AUTO && window.KRXA_AI_DIALOGUE_TRUE_AUTO.start){ window.KRXA_AI_DIALOGUE_TRUE_AUTO.start(); return true; }
      if(window.KRXA_AI_DIALOGUE_AUTO_LOOP && window.KRXA_AI_DIALOGUE_AUTO_LOOP.start){ window.KRXA_AI_DIALOGUE_AUTO_LOOP.start(); return true; }
    }catch(e){ state.lastError = String(e && e.message || e); setStatus("AI대화 시작 오류"); }
    return false;
  }

  function routeMic(e){
    if(!isPage5()){ return; }
    if(e){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation){ e.stopImmediatePropagation(); } }
    syncFromToggle();
    if(state.mode === "ai_dialogue"){ runAI(); } else { runTranslate(); }
    return false;
  }

  function bindMic(){
    findMicButtons().forEach(function(btn){
      if(btn.getAttribute("data-patch80-mic-bound") === "1"){ return; }
      btn.setAttribute("data-patch80-mic-bound","1");
      btn.addEventListener("click", routeMic, true);
    });
  }

  function init(){
    if(!isPage5()){ return; }
    protectAiLabel();
    bindToggle();
    bindMic();
    syncFromToggle();
    protectAiLabel();
  }

  document.addEventListener("DOMContentLoaded", init);
  setTimeout(init,300); setTimeout(init,1000); setTimeout(init,2500);
  setInterval(function(){ if(isPage5()){ protectAiLabel(); bindToggle(); bindMic(); } },1500);

  window.KRXA_PAGE5_M2M_STATE_MACHINE = {
    init:init, sync:syncFromToggle, setMode:setMode,
    getMode:function(){ return state.mode; },
    runTranslate:runTranslate, runAI:runAI, routeMic:routeMic,
    state:function(){ return state; }
  };
})();

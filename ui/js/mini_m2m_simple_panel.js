/* mini_m2m_simple_panel.js - PATCH76
 * Mini = 기존 하단 UI 유지 + 빠른 통역만 실행
 * 새 패널 생성 금지 / AI대화 없음
 */
(function(){
  if(window.KRXA_MINI_M2M_PATCH76_LOADED){ return; }
  window.KRXA_MINI_M2M_PATCH76_LOADED = true;

  function setMiniTranslateOnly(){
    window.KRXA_MINI_M2M_MODE = "translate";
    window.KRXA_MINI_M2M_AI_DIALOGUE_ENABLED = false;
    window.KRXA_MINI_M2M_FORCE_TRANSLATE = true;
  }

  function stopAI(){
    try{
      if(window.KRXA_AI_DIALOGUE_TRUE_AUTO && window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop){ window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop(); }
      if(window.KRXA_AI_DIALOGUE_AUTO_LOOP && window.KRXA_AI_DIALOGUE_AUTO_LOOP.stop){ window.KRXA_AI_DIALOGUE_AUTO_LOOP.stop(); }
    }catch(e){}
  }

  function quickTranslate(){
    setMiniTranslateOnly();
    stopAI();
    try{
      if(window.KRXA_Translate && window.KRXA_Translate.requestMicAndStart){
        window.KRXA_Translate.requestMicAndStart({forceTranslate:true, source:"mini_quick_translate"});
        return true;
      }
      if(typeof window.recordVoice === "function"){ window.recordVoice(); return true; }
      if(typeof window.toggleAuto === "function"){ window.toggleAuto(); return true; }
    }catch(e){ console.warn("[PATCH76] mini quick translate failed", e); }
    return false;
  }

  function bindExistingMini(){
    try{
      var nodes = Array.from(document.querySelectorAll("[data-admin-id='mini_talk'], .homeMicDock"));
      nodes.forEach(function(n){
        if(n.getAttribute("data-patch76-mini-bound")==="1"){ return; }
        n.setAttribute("data-patch76-mini-bound","1");
        n.onclick=function(e){
          if(e){ e.preventDefault(); e.stopPropagation(); }
          quickTranslate();
          return false;
        };
      });
      var old=document.getElementById("krxa-mini-m2m-simple-panel");
      if(old && old.parentNode){ old.parentNode.removeChild(old); }
    }catch(e){}
  }

  function open(){ bindExistingMini(); return quickTranslate(); }
  function init(){ setMiniTranslateOnly(); bindExistingMini(); }

  document.addEventListener("DOMContentLoaded", init);
  setTimeout(init,300); setTimeout(init,1000); setTimeout(init,2500);

  window.KRXA_MINI_M2M_SIMPLE_PANEL={
    open:open, init:init, runMic:quickTranslate,
    setMode:setMiniTranslateOnly,
    getMode:function(){return "translate";}
  };
})();

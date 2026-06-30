/* page5_mode_router.js - PATCH77
 * 5페이지 AI대화 ON/OFF 토글이 실행 엔진을 결정한다.
 */
(function(){
  if(window.KRXA_PAGE5_MODE_ROUTER_PATCH77_LOADED){ return; }
  window.KRXA_PAGE5_MODE_ROUTER_PATCH77_LOADED = true;

  function text(el){ try{return (el&&(el.innerText||el.textContent||''))||'';}catch(e){return '';} }

  function findAiToggle(){
    try{
      var inputs=Array.from(document.querySelectorAll("input[type='checkbox']"));
      for(var i=0;i<inputs.length;i++){
        var wrap=inputs[i].closest ? inputs[i].closest("label,div,section") : null;
        if(text(wrap).indexOf("AI대화")>=0){ return inputs[i]; }
      }
    }catch(e){}
    return null;
  }

  function stopAI(){
    try{
      if(window.KRXA_AI_DIALOGUE_TRUE_AUTO&&window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop){window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop();}
      if(window.KRXA_AI_DIALOGUE_AUTO_LOOP&&window.KRXA_AI_DIALOGUE_AUTO_LOOP.stop){window.KRXA_AI_DIALOGUE_AUTO_LOOP.stop();}
    }catch(e){}
    window.KRXA_AI_DIALOGUE_ENABLED=false;
    window.KRXA_PAGE5_AI_DIALOGUE_ENABLED=false;
    window.KRXA_AI_DIALOGUE_FREE_MODE=false;
    window.KRXA_PAGE5_AI_SESSION_ACTIVE=false;
  }

  function stopTranslate(){
    try{
      if(window.KRXA_Translate&&window.KRXA_Translate.stopAuto){window.KRXA_Translate.stopAuto();}
      if(typeof window.stopAuto==="function"){window.stopAuto();}
    }catch(e){}
  }

  function setMode(mode){
    /* PATCH80_DELEGATE_TO_PAGE5_STATE_MACHINE */
    try{
      if(window.KRXA_PAGE5_M2M_STATE_MACHINE && window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode){
        return window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode(mode==="ai" ? "ai_dialogue" : "translate");
      }
    }catch(e){}

    mode = mode==="ai" ? "ai" : "translate";
    window.KRXA_PAGE5_MODE=mode;
    /* PATCH79_PAGE5_FLOW_LOCK_MODE_SET */
    try{
      if(window.KRXA_FLOW_LOCK){
        window.KRXA_FLOW_LOCK.setFlow(mode==="ai" ? "ai_dialogue" : "translate", {source:"page5_mode_router"});
      }
    }catch(e){}
    window.KRXA_M2M_MODE=mode;

    if(mode==="ai"){
      window.KRXA_MINI_M2M_FORCE_TRANSLATE=false;
      window.KRXA_PAGE5_AI_SESSION_ACTIVE=true;
      window.KRXA_AI_DIALOGUE_ENABLED=true;
      window.KRXA_PAGE5_AI_DIALOGUE_ENABLED=true;
      window.KRXA_AI_DIALOGUE_FREE_MODE=true;
      stopTranslate();
      /* PATCH78_AI_SESSION_PRESTART_ON */
      try{ if(window.KRXA_AI_DIALOGUE_SESSION&&window.KRXA_AI_DIALOGUE_SESSION.start){ window.KRXA_AI_DIALOGUE_SESSION.start(); } }catch(e){}
    }else{
      stopAI();
      /* PATCH78_AI_SESSION_STOP_OFF */
      try{ if(window.KRXA_AI_DIALOGUE_SESSION&&window.KRXA_AI_DIALOGUE_SESSION.stop){ window.KRXA_AI_DIALOGUE_SESSION.stop(); } }catch(e){}
      window.KRXA_MINI_M2M_FORCE_TRANSLATE=false;
    }
    return mode;
  }

  function sync(){
    var t=findAiToggle();
    var on=t ? !!t.checked : false;
    return setMode(on ? "ai" : "translate");
  }

  function bind(){
    var t=findAiToggle();
    if(t && t.getAttribute("data-patch77-bound")!=="1"){
      t.setAttribute("data-patch77-bound","1");
      t.addEventListener("change",function(){ sync(); });
      t.addEventListener("click",function(){ setTimeout(sync,50); });
    }
    sync();
  }

  function isAi(){ return window.KRXA_PAGE5_MODE==="ai"; }
  function isTranslate(){ return window.KRXA_PAGE5_MODE!=="ai"; }

  document.addEventListener("DOMContentLoaded",bind);
  setTimeout(bind,300); setTimeout(bind,1000); setTimeout(bind,2500);

  window.KRXA_PAGE5_MODE_ROUTER={
    bind:bind, sync:sync, setMode:setMode,
    isAi:isAi, isTranslate:isTranslate,
    stopAI:stopAI, stopTranslate:stopTranslate
  };
})();

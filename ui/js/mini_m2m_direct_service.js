
/* mini_m2m_direct_service.js - PATCH69 */
(function(){
  if(window.KRXA_MINI_M2M_DIRECT_SERVICE_LOADED){ return; }
  window.KRXA_MINI_M2M_DIRECT_SERVICE_LOADED = true;

  function txt(el){
    try{ return (el && (el.innerText || el.textContent || '')) || ''; }catch(e){ return ''; }
  }

  function isMiniM2MElement(el){
    try{
      var cur = el;
      for(var i=0; i<6 && cur; i++, cur=cur.parentElement){
        var t = txt(cur);
        if(t.indexOf('말대말') >= 0 && (t.indexOf('통역') >= 0 || t.indexOf('말하면 바로') >= 0 || t.indexOf('AI대화') >= 0)){
          return true;
        }
      }
    }catch(e){}
    return false;
  }

  function isAiOn(){
    try{
      if(window.KRXA_MINI_M2M_AI_DIALOGUE && window.KRXA_MINI_M2M_AI_DIALOGUE.isOn && window.KRXA_MINI_M2M_AI_DIALOGUE.isOn()){ return true; }
      if(window.KRXA_MINI_M2M_AI_DIALOGUE_ENABLED === true){ return true; }
    }catch(e){}
    return false;
  }

  function startMiniService(){
    try{
      if(isAiOn()){
        window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = true;
        window.KRXA_AI_DIALOGUE_ENABLED = true;
        window.KRXA_AI_DIALOGUE_FREE_MODE = true;

        if(window.KRXA_AI_DIALOGUE_TRUE_AUTO && window.KRXA_AI_DIALOGUE_TRUE_AUTO.start){
          window.KRXA_AI_DIALOGUE_TRUE_AUTO.start();
          return true;
        }
        if(window.KRXA_AI_DIALOGUE_AUTO_LOOP && window.KRXA_AI_DIALOGUE_AUTO_LOOP.start){
          window.KRXA_AI_DIALOGUE_AUTO_LOOP.start();
          return true;
        }
      }

      if(typeof window.toggleAuto === 'function'){
        window.toggleAuto();
        return true;
      }
      if(typeof window.recordVoice === 'function'){
        window.recordVoice();
        return true;
      }
    }catch(e){
      console.warn('[PATCH69] mini direct service failed', e);
    }
    return false;
  }

  document.addEventListener('click', function(e){
    try{
      if(!isMiniM2MElement(e.target)){ return; }
      if(e.target && e.target.id === 'krxa-mini-ai-dialogue-check'){ return; }

      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation){ e.stopImmediatePropagation(); }

      startMiniService();
    }catch(err){}
  }, true);

  window.KRXA_MINI_M2M_DIRECT_SERVICE = {
    start: startMiniService,
    isAiOn: isAiOn
  };
})();

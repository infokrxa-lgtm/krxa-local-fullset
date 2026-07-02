/* mini_m2m_simple_panel.js - TRAVEL_V1_M2M_CONTROLLER_FULLFILES_V1
 * Mini panel calls only KRXA_FLOW.go(). It never calls requestMicAndStart directly.
 */
(function(){
  'use strict';
  if(window.KRXA_MINI_M2M_SIMPLE_PANEL_FULLFILES_V1_LOADED){ return; }
  window.KRXA_MINI_M2M_SIMPLE_PANEL_FULLFILES_V1_LOADED = true;

  function go(flow){
    try{
      if(window.KRXA_FLOW && typeof window.KRXA_FLOW.go === 'function'){
        return window.KRXA_FLOW.go(flow, {source:'mini_panel'});
      }
    }catch(e){ try{ console.warn('[MINI_M2M_FULLFILES_V1] flow failed', flow, e); }catch(_){} }
    return false;
  }

  function open(){
    return go('mini.m2m.speak');
  }

  function speak(){
    return go('mini.m2m.speak');
  }

  function toggleAI(){
    return go('mini.ai.toggle');
  }

  function stop(){
    return go('m2m.stop');
  }

  window.KRXA_MINI_M2M_SIMPLE_PANEL = {
    open:open,
    speak:speak,
    toggleAI:toggleAI,
    stop:stop
  };
})();

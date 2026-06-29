
/* mini_m2m_direct_service.js - PATCH70
 * 미니말대말은 현재 화면에서 기능 수행.
 * 단, 사용자 UI 1~8페이지 클릭바/카드/네비게이션 클릭은 절대 막지 않는다.
 */
(function(){
  if(window.KRXA_MINI_M2M_DIRECT_SERVICE_PATCH70_LOADED){ return; }
  window.KRXA_MINI_M2M_DIRECT_SERVICE_PATCH70_LOADED = true;

  function txt(el){
    try{ return (el && (el.innerText || el.textContent || '')) || ''; }catch(e){ return ''; }
  }

  function closest(el, selector){
    try{ return el && el.closest ? el.closest(selector) : null; }catch(e){ return null; }
  }

  function isNavigationOrCard(el){
    try{
      if(!el){ return false; }
      var nav = closest(el, 'a, button, [onclick], .card, .hub-card, .service-card, .tab, .nav, .page-dot, .bottom-nav, .quick-card, .menu-card');
      if(!nav){ return false; }

      var t = txt(nav);
      var cls = String(nav.className || '').toLowerCase();
      var id = String(nav.id || '').toLowerCase();
      var oc = String(nav.getAttribute && nav.getAttribute('onclick') || '').toLowerCase();

      // 미니말대말 전용 버튼이면 차단 대상, 그 외는 사용자 UI 클릭 허용
      if(cls.indexOf('mini-m2m') >= 0 || id.indexOf('mini-m2m') >= 0){ return false; }
      if(t.indexOf('말하기') >= 0 || t.indexOf('🎙') >= 0 || t.indexOf('AI대화') >= 0){ return false; }

      // 페이지 이동/서비스 이동/카드 이동은 허용
      if(oc.indexOf('gopage') >= 0 || oc.indexOf('gouserpage') >= 0 || oc.indexOf('open') >= 0){ return true; }
      if(cls.indexOf('card') >= 0 || cls.indexOf('nav') >= 0 || cls.indexOf('tab') >= 0){ return true; }
      return true;
    }catch(e){ return false; }
  }

  function isMiniActionElement(el){
    try{
      var t = txt(el);
      var cls = String((el && el.className) || '').toLowerCase();
      var id = String((el && el.id) || '').toLowerCase();

      // 체크박스 자체는 상태 변경 허용
      if(id === 'krxa-mini-ai-dialogue-check'){ return false; }

      // 명확한 미니 말대말 기능 버튼만 가로챔
      if(id.indexOf('mini') >= 0 && (t.indexOf('말하기') >= 0 || t.indexOf('통역') >= 0 || t.indexOf('AI대화') >= 0)){ return true; }
      if(cls.indexOf('mini-m2m') >= 0 && (t.indexOf('말하기') >= 0 || t.indexOf('통역') >= 0 || t.indexOf('AI대화') >= 0)){ return true; }
      if(t.trim() === '말하기' || t.indexOf('🎙') >= 0){ 
        var p = closest(el, '#krxa-mini-ai-dialogue-toggle, .mini-m2m, [data-mini-m2m="true"]');
        if(p){ return true; }
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
      console.warn('[PATCH70] mini direct service failed', e);
    }
    return false;
  }

  document.addEventListener('click', function(e){
    try{
      // 사용자 UI 클릭바/카드/페이지 이동은 먼저 통과
      if(isNavigationOrCard(e.target)){ return; }

      // 미니말대말의 명확한 기능 버튼만 가로챔
      if(!isMiniActionElement(e.target)){ return; }

      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation){ e.stopImmediatePropagation(); }

      startMiniService();
    }catch(err){}
  }, true);

  window.KRXA_MINI_M2M_DIRECT_SERVICE = {
    start: startMiniService,
    isAiOn: isAiOn,
    patch: 'PATCH70_LIMITED_CAPTURE'
  };
})();

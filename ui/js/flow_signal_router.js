/* flow_signal_router.js - PATCH92 FULL VERSION
 * 원칙:
 * 1) 자동 태깅 금지
 * 2) data-flow가 명시된 클릭바만 처리
 * 3) 클릭바는 Flow ID 하나만 전달
 * 4) 실행은 KRXA_FLOW.go(flow_id)가 담당
 * 5) 1차 범위: modal.close, page.back, m2m.speak, m2m.stop
 */
(function(){
  if(window.KRXA_FLOW_SIGNAL_ROUTER_PATCH92_LOADED){ return; }
  window.KRXA_FLOW_SIGNAL_ROUTER_PATCH92_LOADED = true;

  var state = window.KRXA_FLOW_STATE || {
    lastFlow: null,
    currentFlow: null,
    currentPage: null,
    modalActive: false
  };
  window.KRXA_FLOW_STATE = state;

  function log(flowId, detail){
    try{ console.log("[PATCH92 FLOW]", flowId, detail || ""); }catch(e){}
  }

  function app(){
    return window.KRXA_App || null;
  }

  function flowModalClose(){
    var a = app();
    try{
      if(a && typeof a.closeModal === "function"){
        a.closeModal();
        state.modalActive = false;
        return true;
      }
    }catch(e){}

    try{
      var candidates = [
        "#modalBack",
        "#modal",
        "#appModal",
        "#commonModal",
        ".modalBack",
        ".modalOverlay",
        ".modal"
      ];
      candidates.forEach(function(sel){
        document.querySelectorAll(sel).forEach(function(el){
          el.style.display = "none";
          el.classList.remove("show","active","open");
        });
      });
      state.modalActive = false;
      return true;
    }catch(e){}
    return false;
  }

  function flowPageBack(){
    var a = app();
    try{
      if(a && typeof a.goUserPage === "function"){
        a.goUserPage(2);
        return true;
      }
      if(a && typeof a.goPage === "function"){
        a.goPage(1);
        return true;
      }
    }catch(e){}
    return false;
  }

  function flowM2MSpeak(){
    try{
      if(window.KRXA_Translate && typeof window.KRXA_Translate.requestMicAndStart === "function"){
        return window.KRXA_Translate.requestMicAndStart({
          source: "PATCH92_FLOW_ROUTER",
          flow_id: "m2m.speak"
        });
      }
    }catch(e){
      try{ console.warn("[PATCH92] KRXA_Translate.requestMicAndStart failed", e); }catch(_){}
    }

    try{
      if(typeof window.recordVoice === "function"){
        return window.recordVoice();
      }
    }catch(e){
      try{ console.warn("[PATCH92] recordVoice failed", e); }catch(_){}
    }

    return false;
  }

  function flowM2MStop(){
    try{
      if(window.KRXA_Translate && typeof window.KRXA_Translate.stopAuto === "function"){
        return window.KRXA_Translate.stopAuto();
      }
    }catch(e){}
    try{
      if(typeof window.stopAuto === "function"){
        return window.stopAuto();
      }
    }catch(e){}
    state.currentFlow = null;
    return true;
  }

  function go(flowId, payload){
    if(!flowId){ return false; }

    state.lastFlow = flowId;
    state.currentFlow = flowId;
    log(flowId, payload);

    switch(flowId){
      case "modal.close":
        return flowModalClose();

      case "page.back":
        return flowPageBack();

      case "m2m.speak":
        return flowM2MSpeak();

      case "m2m.stop":
        return flowM2MStop();

      default:
        log("unhandled", flowId);
        return false;
    }
  }

  function bind(root){
    root = root || document;
    try{
      root.querySelectorAll("[data-flow]").forEach(function(el){
        if(el.__KRXA_PATCH92_FLOW_BOUND){ return; }
        el.__KRXA_PATCH92_FLOW_BOUND = true;

        el.addEventListener("click", function(e){
          var flowId = el.getAttribute("data-flow");
          if(!flowId){ return; }

          e.preventDefault();
          e.stopPropagation();
          if(e.stopImmediatePropagation){ e.stopImmediatePropagation(); }

          go(flowId, {
            target: el,
            text: (el.innerText || el.textContent || "").trim()
          });

          return false;
        }, true);
      });
    }catch(e){
      try{ console.warn("[PATCH92] bind failed", e); }catch(_){}
    }
  }

  function init(){
    bind(document);
  }

  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(init, 100);
    setTimeout(init, 600);
  });

  window.KRXA_FLOW = {
    go: go,
    bind: bind,
    init: init,
    state: state
  };
})();

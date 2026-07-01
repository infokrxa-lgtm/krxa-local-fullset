/* flow_signal_router.js - PATCH91
 * 클릭바는 실행하지 않는다.
 * 클릭바는 flow_id만 KRXA_FLOW.go(flow_id)로 전달한다.
 * 실행은 각 Controller가 담당한다.
 */
(function(){
  if(window.KRXA_FLOW_SIGNAL_ROUTER_PATCH91_LOADED){ return; }
  window.KRXA_FLOW_SIGNAL_ROUTER_PATCH91_LOADED = true;

  var state = window.KRXA_FLOW_STATE || {
    lastFlow: null,
    previousPage: null,
    currentPage: null,
    modalActive: false
  };
  window.KRXA_FLOW_STATE = state;

  function log(flowId, detail){
    try{
      console.log("[PATCH91 FLOW]", flowId, detail || "");
    }catch(e){}
  }

  function getApp(){
    return window.KRXA_App || null;
  }

  function modalClose(){
    var app = getApp();
    try{
      if(app && typeof app.closeModal === "function"){
        app.closeModal();
        state.modalActive = false;
        return true;
      }
    }catch(e){}
    try{
      var modal = document.querySelector(".modal,.modalBack,.modalOverlay,#modal,#appModal,#commonModal");
      if(modal){ modal.style.display = "none"; }
      state.modalActive = false;
      return true;
    }catch(e){}
    return false;
  }

  function pageBack(){
    var app = getApp();
    try{
      if(app && typeof app.goUserPage === "function"){
        app.goUserPage(2);
        return true;
      }
      if(app && typeof app.goPage === "function"){
        app.goPage(1);
        return true;
      }
    }catch(e){}
    return false;
  }

  function m2mSpeak(){
    try{
      if(window.KRXA_Translate && typeof window.KRXA_Translate.requestMicAndStart === "function"){
        return window.KRXA_Translate.requestMicAndStart({ source:"flow_router", flow_id:"m2m.speak" });
      }
    }catch(e){
      try{ console.warn("[PATCH91] m2m.speak failed", e); }catch(_){}
    }
    try{
      if(typeof window.recordVoice === "function"){
        return window.recordVoice();
      }
    }catch(e){}
    return false;
  }

  function m2mStop(){
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
    return true;
  }

  function go(flowId, payload){
    state.lastFlow = flowId;
    log(flowId, payload);

    switch(flowId){
      case "modal.close":
        return modalClose();

      case "page.back":
        return pageBack();

      case "m2m.speak":
        return m2mSpeak();

      case "m2m.stop":
        return m2mStop();

      default:
        log("unknown", flowId);
        return false;
    }
  }

  function bindDataFlowClicks(root){
    root = root || document;
    try{
      root.querySelectorAll("[data-flow]").forEach(function(el){
        if(el.__KRXA_PATCH91_BOUND){ return; }
        el.__KRXA_PATCH91_BOUND = true;
        el.addEventListener("click", function(e){
          var flowId = el.getAttribute("data-flow");
          if(!flowId){ return; }
          e.preventDefault();
          e.stopPropagation();
          if(e.stopImmediatePropagation){ e.stopImmediatePropagation(); }
          go(flowId, { target: el });
          return false;
        }, true);
      });
    }catch(e){}
  }

  function autoTagCommonButtons(){
    try{
      // 닫기 버튼: 기존 onclick이 있어도 Flow Router가 capture 단계에서 먼저 처리
      document.querySelectorAll("button,.closeBtn,[class*='close']").forEach(function(el){
        var txt = (el.innerText || el.textContent || "").trim();
        if(!el.getAttribute("data-flow") && (txt === "닫기" || txt === "×" || txt === "X")){
          el.setAttribute("data-flow", "modal.close");
        }
      });

      // 5페이지/말대말 말하기 버튼 후보
      document.querySelectorAll("button,.listenCircle,.micCircle,[class*='mic'],[class*='listen']").forEach(function(el){
        var txt = (el.innerText || el.textContent || "").trim();
        if(!el.getAttribute("data-flow") && (txt.indexOf("말하기") >= 0 || txt.indexOf("🎙") >= 0 || txt.indexOf("마이크") >= 0)){
          el.setAttribute("data-flow", "m2m.speak");
        }
      });

      // 뒤로가기
      document.querySelectorAll("button,.back,[class*='back']").forEach(function(el){
        var txt = (el.innerText || el.textContent || "").trim();
        if(!el.getAttribute("data-flow") && (txt === "‹" || txt === "<" || txt.indexOf("뒤로") >= 0)){
          el.setAttribute("data-flow", "page.back");
        }
      });

      // 종료
      document.querySelectorAll("button").forEach(function(el){
        var txt = (el.innerText || el.textContent || "").trim();
        if(!el.getAttribute("data-flow") && txt === "종료"){
          el.setAttribute("data-flow", "m2m.stop");
        }
      });
    }catch(e){}
  }

  function init(){
    autoTagCommonButtons();
    bindDataFlowClicks(document);
  }

  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(init, 300);
    setTimeout(init, 1000);
  });

  window.KRXA_FLOW = {
    go: go,
    init: init,
    bind: bindDataFlowClicks,
    autoTag: autoTagCommonButtons,
    state: state
  };
})();

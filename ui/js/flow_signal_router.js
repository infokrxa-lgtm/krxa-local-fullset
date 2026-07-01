/* flow_signal_router.js - TRAVEL_V1_FULL_FLOW_STABLE_SET_V1
 * 명시 data-flow만 처리한다. 자동 태깅 없음.
 */
(function(){
  if(window.KRXA_FLOW_STABLE_V1_LOADED){ return; }
  window.KRXA_FLOW_STABLE_V1_LOADED = true;

  var state = window.KRXA_FLOW_STATE || { lastFlow:null, currentFlow:null, modalActive:false };
  window.KRXA_FLOW_STATE = state;

  function log(flowId, payload){ try{ console.log("[TRAVEL_V1_FLOW]", flowId, payload || ""); }catch(e){} }
  function app(){ return window.KRXA_App || null; }

  function closeModal(){
    try{ if(app() && typeof app().closeModal === "function"){ app().closeModal(); } }catch(e){}
    try{
      ["#modalBack","#modal","#appModal","#commonModal",".modalBack",".modalOverlay",".modal"].forEach(function(sel){
        document.querySelectorAll(sel).forEach(function(el){
          el.style.display="none"; el.classList.remove("show","active","open");
        });
      });
    }catch(e){}
    state.modalActive=false;
    return true;
  }

  function pageBack(){
    try{
      if(app() && typeof app().goUserPage === "function"){ app().goUserPage(2); return true; }
      if(app() && typeof app().goPage === "function"){ app().goPage(1); return true; }
    }catch(e){}
    return false;
  }

  function enterM2M(){
    try{
      if(app() && typeof app().goUserPage === "function"){ app().goUserPage(5); return true; }
      if(app() && typeof app().goPage === "function"){ app().goPage(5); return true; }
    }catch(e){}
    return false;
  }

  function m2mSpeak(){
    try{
      if(window.KRXA_Translate && typeof window.KRXA_Translate.requestMicAndStart === "function"){
        return window.KRXA_Translate.requestMicAndStart({source:"TRAVEL_V1_FLOW_STABLE", flow_id:"m2m.speak", userTriggered:true});
      }
    }catch(e){ try{ console.warn("[TRAVEL_V1_FLOW] m2m.speak failed", e); }catch(_){} }
    return false;
  }

  function m2mStop(){
    try{ window.KRXA_M2M_USER_TRIGGERED = false; }catch(e){}
    try{ if(window.KRXA_Translate && typeof window.KRXA_Translate.stopAuto === "function"){ window.KRXA_Translate.stopAuto(); } }catch(e){}
    try{ if(typeof window.stopAuto === "function"){ window.stopAuto(); } }catch(e){}
    return true;
  }

  function m2mTextOpen(){
    try{ if(window.KRXA_Translate && typeof window.KRXA_Translate.openQuickInput === "function"){ window.KRXA_Translate.openQuickInput(); return true; } }catch(e){}
    return false;
  }

  function m2mReplay(){
    try{ if(window.KRXA_Translate && typeof window.KRXA_Translate.replayTTS === "function"){ window.KRXA_Translate.replayTTS(); return true; } }catch(e){}
    return false;
  }

  function linkManage(){
    try{ if(app() && typeof app().openLinkManager === "function"){ app().openLinkManager(); return true; } }catch(e){}
    return false;
  }

  function go(flowId, payload){
    if(!flowId){ return false; }
    state.lastFlow=flowId; state.currentFlow=flowId; log(flowId,payload);
    switch(flowId){
      case "modal.close": return closeModal();
      case "page.back": return pageBack();
      case "m2m.enter": return enterM2M();
      case "m2m.speak": return m2mSpeak();
      case "m2m.stop": return m2mStop();
      case "m2m.text.open": return m2mTextOpen();
      case "m2m.replay": return m2mReplay();
      case "user.link.manage": return linkManage();
      default: log("unhandled", flowId); return false;
    }
  }

  function onClick(e){
    var el=null;
    try{ el=e.target && e.target.closest ? e.target.closest("[data-flow]") : null; }catch(err){}
    if(!el){ return; }
    var flowId=el.getAttribute("data-flow");
    if(!flowId){ return; }
    e.preventDefault(); e.stopPropagation();
    if(e.stopImmediatePropagation){ e.stopImmediatePropagation(); }
    go(flowId,{target:el,text:(el.innerText||el.textContent||"").trim()});
    return false;
  }

  function init(){
    if(window.__KRXA_FLOW_STABLE_V1_BOUND){ return; }
    window.__KRXA_FLOW_STABLE_V1_BOUND=true;
    document.addEventListener("click", onClick, true);
  }

  document.addEventListener("DOMContentLoaded", function(){ setTimeout(init,30); });
  setTimeout(init,200);
  window.KRXA_FLOW={go:go,init:init,state:state};
})();

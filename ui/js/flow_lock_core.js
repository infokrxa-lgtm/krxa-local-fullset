/* flow_lock_core.js - PATCH79
 * 각 기능이 자기 영역만 수정하게 하는 공통 보호막.
 */
(function(){
  if(window.KRXA_FLOW_LOCK_PATCH79_LOADED){ return; }
  window.KRXA_FLOW_LOCK_PATCH79_LOADED = true;

  var state = {
    currentFlow: "idle",
    history: [],
    protectedText: ["AI대화", "말대말 통역", "통역", "호텔", "식당", "관광", "지도", "길찾기"],
    flows: ["idle","translate","ai_dialogue","food","hotel","map","travel_search","status"]
  };

  function now(){ return new Date().toISOString(); }
  function text(el){ try{ return (el && (el.innerText || el.textContent || "")) || ""; }catch(e){ return ""; } }

  function isRootLike(el){
    try{
      if(!el){ return true; }
      if(el===document.body || el===document.documentElement){ return true; }
      var id=String(el.id||"").toLowerCase();
      var cls=String(el.className||"").toLowerCase();
      if(id==="app" || id==="root"){ return true; }
      if(cls.indexOf("phone")>=0 || cls.indexOf("screen")>=0 || cls.indexOf("page")>=0 || cls.indexOf("container")>=0){ return true; }
      if(el.querySelectorAll && el.querySelectorAll("button,input,select,textarea").length>3){ return true; }
    }catch(e){}
    return false;
  }

  function isProtectedLabel(el){
    try{
      var t=text(el).trim();
      if(!t || t.length>40){ return false; }
      return state.protectedText.some(function(p){ return t===p || t.indexOf(p)>=0; });
    }catch(e){}
    return false;
  }

  function allowed(flow, target){
    if(!target || isRootLike(target)){ return false; }
    if(isProtectedLabel(target)){ return false; }

    var id=String(target.id||"").toLowerCase();
    var cls=String(target.className||"").toLowerCase();
    var tx=text(target);

    if(flow==="translate"){
      return tx.indexOf("원문")>=0 || tx.indexOf("번역")>=0 || id.indexOf("source")>=0 || id.indexOf("target")>=0 || cls.indexOf("translate")>=0 || cls.indexOf("result")>=0;
    }
    if(flow==="ai_dialogue"){
      return tx.indexOf("원문")>=0 || tx.indexOf("번역")>=0 || id.indexOf("ai")>=0 || cls.indexOf("ai")>=0 || cls.indexOf("result")>=0;
    }
    if(flow==="food" || flow==="hotel" || flow==="map" || flow==="travel_search"){
      return id.indexOf("result")>=0 || id.indexOf("map")>=0 || id.indexOf("search")>=0 || cls.indexOf("result")>=0 || cls.indexOf("card")>=0 || cls.indexOf("modal")>=0;
    }
    if(flow==="status"){
      return cls.indexOf("status")>=0 || id.indexOf("status")>=0 || (tx.length<80 && (tx.indexOf("듣는")>=0 || tx.indexOf("기다")>=0 || tx.indexOf("준비")>=0 || tx.indexOf("종료")>=0));
    }
    return false;
  }

  function setFlow(flow, meta){
    if(state.flows.indexOf(flow)<0){ flow="idle"; }
    state.currentFlow=flow;
    state.history.push({at:now(),flow:flow,meta:meta||{}});
    if(state.history.length>80){ state.history.shift(); }
    window.KRXA_CURRENT_FLOW=flow;
    return flow;
  }

  function getFlow(){ return state.currentFlow || "idle"; }

  function safeTextSet(flow, el, value){
    if(!allowed(flow, el)){
      console.warn("[PATCH79 FLOW LOCK] blocked text write", flow, el);
      return false;
    }
    try{ el.textContent=value||""; return true; }catch(e){ return false; }
  }

  function safeHTMLSet(flow, el, html){
    if(!allowed(flow, el)){
      console.warn("[PATCH79 FLOW LOCK] blocked html write", flow, el);
      return false;
    }
    try{ el.innerHTML=html||""; return true; }catch(e){ return false; }
  }

  window.KRXA_FLOW_LOCK = {
    setFlow:setFlow,
    getFlow:getFlow,
    allowed:allowed,
    safeText:safeTextSet,
    safeHTML:safeHTMLSet,
    isRootLike:isRootLike,
    isProtectedLabel:isProtectedLabel,
    state:function(){ return state; }
  };

  window.KRXA_SAFE_SET_TEXT = function(el,value,flow){ return safeTextSet(flow || getFlow(), el, value); };
  window.KRXA_SAFE_SET_HTML = function(el,value,flow){ return safeHTMLSet(flow || getFlow(), el, value); };
})();

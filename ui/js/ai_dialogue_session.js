/* ai_dialogue_session.js - PATCH78
 * AI대화 ON 순간 LLM 대화 세션을 먼저 깨운다.
 */
(function(){
  if(window.KRXA_AI_DIALOGUE_SESSION_PATCH78_LOADED){ return; }
  window.KRXA_AI_DIALOGUE_SESSION_PATCH78_LOADED = true;

  var state={active:false,starting:false,session_id:null,started_at:null,last_error:null};

  function setStatus(msg){
    /* PATCH80_SESSION_STATUS_SAFE */
    try{ if(window.KRXA_PAGE5_M2M_STATE_MACHINE){ return; } }catch(e){}
    try{
      var nodes=Array.from(document.querySelectorAll("p,span,small,div"));
      var n=nodes.find(function(x){
        var t=(x.innerText||x.textContent||"").trim();
        return t.length<80 && (t.indexOf("다음 말")>=0 || t.indexOf("AI")>=0 || t.indexOf("마이크")>=0 || t.indexOf("듣는")>=0);
      });
      if(n && n.querySelectorAll("button,input,select").length===0){ n.textContent=msg; }
    }catch(e){}
  }

  async function start(){
    if(state.active||state.starting){ return state; }
    state.starting=true; state.last_error=null;
    setStatus("AI 세션을 준비 중입니다");
    try{
      var res=await fetch("/api/travel-v1/ai-dialogue/session/start",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mode:"page5_ai_dialogue",call_phrase:"KRXA_TRAVEL_AI_COMPANION_V1",stt_owner:"llm",tts_owner:"krxa"})
      });
      var data={}; try{data=await res.json();}catch(e){}
      state.session_id=data.session_id||data.id||("local_"+Date.now());
    }catch(e){
      state.session_id="local_"+Date.now();
      state.last_error=String(e&&e.message||e);
    }
    state.active=true; state.starting=false; state.started_at=new Date().toISOString();
    window.KRXA_AI_DIALOGUE_SESSION_ID=state.session_id;
    window.KRXA_AI_DIALOGUE_SESSION_ACTIVE=true;
    setStatus("AI가 듣기 준비되었습니다");
    return state;
  }

  async function stop(){
    var sid=state.session_id;
    state.active=false; state.starting=false; state.session_id=null;
    window.KRXA_AI_DIALOGUE_SESSION_ACTIVE=false;
    window.KRXA_AI_DIALOGUE_SESSION_ID=null;
    try{
      if(sid){
        fetch("/api/travel-v1/ai-dialogue/session/stop",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sid})}).catch(function(){});
      }
      if(window.KRXA_AI_DIALOGUE_TRUE_AUTO&&window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop){window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop();}
    }catch(e){}
    setStatus("AI대화 종료");
  }

  async function ensure(){ if(!state.active){ await start(); } return state; }

  window.KRXA_AI_DIALOGUE_SESSION={start:start,stop:stop,ensure:ensure,state:function(){return state;},isActive:function(){return !!state.active;}};
})();

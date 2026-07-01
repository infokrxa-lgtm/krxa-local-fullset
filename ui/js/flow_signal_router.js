/* flow_signal_router.js - TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4F
 * Common engines, separated UI states:
 * - page5.ai.toggle / page5.m2m.speak
 * - mini.ai.toggle  / mini.m2m.speak
 */
(function(){
  if(window.KRXA_FLOW_V4F_LOADED){return;}
  window.KRXA_FLOW_V4F_LOADED=true;

  var state=window.KRXA_FLOW_STATE||{lastFlow:null,currentFlow:null,modalActive:false};
  window.KRXA_FLOW_STATE=state;
  if(typeof window.KRXA_MINI_AI_DIALOGUE_ENABLED!=="boolean"){window.KRXA_MINI_AI_DIALOGUE_ENABLED=false;}

  function log(id,p){try{console.log("[TRAVEL_V1_FLOW_V4F]",id,p||"");}catch(e){}}
  function app(){return window.KRXA_App||null;}
  function text(el){try{return(el&&(el.innerText||el.textContent||""))||"";}catch(e){return"";}}

  function setToggleVisual(el,on){
    try{
      if(!el)return;
      el.classList.toggle("active",!!on);
      el.classList.toggle("on",!!on);
      el.setAttribute("data-ai",on?"on":"off");
      el.setAttribute("aria-checked",on?"true":"false");
    }catch(e){}
  }

  function closeModal(){
    try{if(app()&&typeof app().closeModal==="function"){app().closeModal();}}catch(e){}
    try{["#modalBack","#modal","#appModal","#commonModal",".modalBack",".modalOverlay",".modal"].forEach(function(s){document.querySelectorAll(s).forEach(function(el){el.style.display="none";el.classList.remove("show","active","open");});});}catch(e){}
    state.modalActive=false;return true;
  }

  function pageBack(){
    try{if(app()&&typeof app().goUserPage==="function"){app().goUserPage(2);return true;}if(app()&&typeof app().goPage==="function"){app().goPage(1);return true;}}catch(e){}
    return false;
  }

  function enterM2M(){
    try{if(app()&&typeof app().goUserPage==="function"){app().goUserPage(5);return true;}if(app()&&typeof app().goPage==="function"){app().goPage(5);return true;}}catch(e){}
    return false;
  }

  function page5AiToggle(payload){
    var el=(payload&&payload.target)||document.getElementById("autoToggle");
    var cur=false;
    try{
      if(window.KRXA_PAGE5_M2M_STATE_MACHINE&&typeof window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode==="function"){
        cur=window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode()==="ai_dialogue";
      }else{
        cur=window.KRXA_PAGE5_AI_DIALOGUE_ENABLED===true;
      }
    }catch(e){}
    var next=!cur;
    try{
      if(window.KRXA_PAGE5_M2M_STATE_MACHINE&&typeof window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode==="function"){
        window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode(next?"ai_dialogue":"translate");
      }
    }catch(e){}
    window.KRXA_PAGE5_AI_DIALOGUE_ENABLED=next;
    window.KRXA_AI_DIALOGUE_ENABLED=next;
    window.KRXA_PAGE5_MODE=next?"ai":"translate";
    window.KRXA_M2M_MODE=window.KRXA_PAGE5_MODE;
    setToggleVisual(el,next);
    return true;
  }

  function miniAiToggle(payload){
    var el=(payload&&payload.target)||document.querySelector("[data-flow='mini.ai.toggle']");
    var next=!window.KRXA_MINI_AI_DIALOGUE_ENABLED;
    window.KRXA_MINI_AI_DIALOGUE_ENABLED=next;
    setToggleVisual(el,next);
    return true;
  }

  function isPage5AiOn(){
    try{
      if(window.KRXA_PAGE5_M2M_STATE_MACHINE&&typeof window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode==="function"){
        var m=window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode();
        if(m==="ai_dialogue"||m==="ai")return true;
      }
    }catch(e){}
    try{
      var el=document.getElementById("autoToggle");
      if(el&&(el.classList.contains("active")||el.classList.contains("on")||el.getAttribute("data-ai")==="on"||el.getAttribute("aria-checked")==="true"))return true;
    }catch(e){}
    return window.KRXA_PAGE5_AI_DIALOGUE_ENABLED===true;
  }

  function speakTranslate(source,flowId){
    try{
      if(window.KRXA_Translate&&typeof window.KRXA_Translate.requestMicAndStart==="function"){
        return window.KRXA_Translate.requestMicAndStart({
          source:source,flow_id:flowId,userTriggered:true,mode:"translate",forceTranslate:true
        });
      }
    }catch(e){try{console.warn("[FLOW_V4F] translate failed",e);}catch(_){}}
    return false;
  }

  function speakAI(source,flowId){
    try{
      if(window.KRXA_AI_DIALOGUE&&typeof window.KRXA_AI_DIALOGUE.speakOnce==="function"){
        return window.KRXA_AI_DIALOGUE.speakOnce({source:source,flow_id:flowId,userTriggered:true});
      }
    }catch(e){try{console.warn("[FLOW_V4F] ai failed",e);}catch(_){}}
    return false;
  }

  function page5Speak(){
    if(isPage5AiOn())return speakAI("TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4F_PAGE5_AI","page5.m2m.speak");
    return speakTranslate("TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4F_PAGE5_TRANSLATE","page5.m2m.speak");
  }

  function miniSpeak(){
    if(window.KRXA_MINI_AI_DIALOGUE_ENABLED===true)return speakAI("TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4F_MINI_AI","mini.m2m.speak");
    return speakTranslate("TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4F_MINI_TRANSLATE","mini.m2m.speak");
  }

  function legacySpeak(){
    try{if(text(document.body).indexOf("말대말 통역")>=0)return page5Speak();}catch(e){}
    return miniSpeak();
  }

  function m2mStop(){
    try{if(window.KRXA_AI_DIALOGUE&&typeof window.KRXA_AI_DIALOGUE.stop==="function")window.KRXA_AI_DIALOGUE.stop();}catch(e){}
    try{if(window.KRXA_Translate&&typeof window.KRXA_Translate.stopAuto==="function")window.KRXA_Translate.stopAuto();}catch(e){}
    return true;
  }

  function m2mTextOpen(){try{if(window.KRXA_Translate&&typeof window.KRXA_Translate.openQuickInput==="function"){window.KRXA_Translate.openQuickInput();return true;}}catch(e){}return false;}
  function m2mReplay(){try{if(window.KRXA_Translate&&typeof window.KRXA_Translate.replayTTS==="function"){window.KRXA_Translate.replayTTS();return true;}}catch(e){}return false;}
  function linkManage(){try{if(app()&&typeof app().openLinkManager==="function"){app().openLinkManager();return true;}}catch(e){}return false;}

  function go(id,p){
    if(!id)return false;state.lastFlow=id;state.currentFlow=id;log(id,p);
    switch(id){
      case"modal.close":return closeModal();
      case"page.back":return pageBack();
      case"m2m.enter":return enterM2M();
      case"m2m.speak":return legacySpeak();
      case"page5.m2m.speak":return page5Speak();
      case"mini.m2m.speak":return miniSpeak();
      case"page5.ai.toggle":return page5AiToggle(p);
      case"mini.ai.toggle":return miniAiToggle(p);
      case"m2m.stop":return m2mStop();
      case"m2m.text.open":return m2mTextOpen();
      case"m2m.replay":return m2mReplay();
      case"user.link.manage":return linkManage();
      default:log("unhandled",id);return false;
    }
  }

  function onClick(e){
    var el=null;try{el=e.target&&e.target.closest?e.target.closest("[data-flow]"):null;}catch(err){}
    if(!el)return;
    var id=el.getAttribute("data-flow");if(!id)return;
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    go(id,{target:el,text:(el.innerText||el.textContent||"").trim()});
    return false;
  }

  function init(){if(window.__KRXA_FLOW_V4F_BOUND)return;window.__KRXA_FLOW_V4F_BOUND=true;document.addEventListener("click",onClick,true);}
  document.addEventListener("DOMContentLoaded",function(){setTimeout(init,30);});setTimeout(init,200);
  window.KRXA_FLOW={go:go,init:init,state:state,isPage5AiOn:isPage5AiOn};
})();


/* TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4G_FIXED_OVERRIDE */
(function(){
 if(window.KRXA_FLOW_V4G_FIXED_LOADED){return;} window.KRXA_FLOW_V4G_FIXED_LOADED=true;
 if(typeof window.KRXA_PAGE5_AI_DIALOGUE_ENABLED!=='boolean'){window.KRXA_PAGE5_AI_DIALOGUE_ENABLED=false;}
 if(typeof window.KRXA_MINI_AI_DIALOGUE_ENABLED!=='boolean'){window.KRXA_MINI_AI_DIALOGUE_ENABLED=false;}
 function t(el){try{return(el&&(el.innerText||el.textContent||''))||'';}catch(e){return'';}}
 function release(){try{window.KRXA_M2M_BUSY=false;window.KRXA_AI_DIALOGUE_BUSY=false;window.KRXA_AI_DIALOGUE_LISTENING=false;document.body.classList.remove('busy','listening','locked','modal-open');document.querySelectorAll('[disabled]').forEach(function(el){if(el.getAttribute('data-keep-disabled')!=='1')el.removeAttribute('disabled');});}catch(e){}}
 function unlock(){try{window.KRXA_TTS_UNLOCKED=true;if(window.speechSynthesis){var u=new SpeechSynthesisUtterance(' ');u.volume=.01;window.speechSynthesis.speak(u);setTimeout(function(){try{window.speechSynthesis.cancel();}catch(e){}},50);}}catch(e){}}
 function visual(el,on){try{if(!el)return;el.classList.toggle('active',!!on);el.classList.toggle('on',!!on);el.setAttribute('data-ai',on?'on':'off');el.setAttribute('aria-checked',on?'true':'false');if(t(el).indexOf('AI')>=0)el.textContent=on?'AI ON':'AI OFF';}catch(e){}}
 function page5On(){try{if(window.KRXA_PAGE5_M2M_STATE_MACHINE&&typeof window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode==='function'){var m=window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode();if(m==='ai_dialogue'||m==='ai')return true;}}catch(e){}try{var el=document.getElementById('autoToggle');if(el&&(el.classList.contains('active')||el.classList.contains('on')||el.getAttribute('data-ai')==='on'||el.getAttribute('aria-checked')==='true'))return true;}catch(e){}return window.KRXA_PAGE5_AI_DIALOGUE_ENABLED===true;}
 function miniOn(){try{var el=document.querySelector('[data-flow="mini.ai.toggle"]');if(el&&(el.classList.contains('active')||el.classList.contains('on')||el.getAttribute('data-ai')==='on'||el.getAttribute('aria-checked')==='true'))return true;}catch(e){}return window.KRXA_MINI_AI_DIALOGUE_ENABLED===true;}
 function page5Toggle(p){var n=!page5On();window.KRXA_PAGE5_AI_DIALOGUE_ENABLED=n;window.KRXA_AI_DIALOGUE_ENABLED=n;window.KRXA_PAGE5_MODE=n?'ai':'translate';window.KRXA_M2M_MODE=window.KRXA_PAGE5_MODE;try{if(window.KRXA_PAGE5_M2M_STATE_MACHINE&&window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode)window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode(n?'ai_dialogue':'translate');}catch(e){}visual((p&&p.target)||document.getElementById('autoToggle'),n);return true;}
 function miniToggle(p){var n=!miniOn();window.KRXA_MINI_AI_DIALOGUE_ENABLED=n;visual((p&&p.target)||document.querySelector('[data-flow="mini.ai.toggle"]'),n);return true;}
 function runT(src,flow){unlock();release();try{return window.KRXA_Translate.requestMicAndStart({source:src,flow_id:flow,userTriggered:true,forceTranslate:true,mode:'translate'});}catch(e){console.warn('[V4G translate failed]',e);return false;}}
 function runA(src,flow){unlock();release();try{return window.KRXA_AI_DIALOGUE.speakOnce({source:src,flow_id:flow,userTriggered:true});}catch(e){console.warn('[V4G ai failed]',e);return false;}}
 function page5Speak(){return page5On()?runA('TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4G_PAGE5_AI','page5.m2m.speak'):runT('TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4G_PAGE5_TRANSLATE','page5.m2m.speak');}
 function miniSpeak(){return miniOn()?runA('TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4G_MINI_AI','mini.m2m.speak'):runT('TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4G_MINI_TRANSLATE','mini.m2m.speak');}
 function stopAll(){try{if(window.KRXA_AI_DIALOGUE&&window.KRXA_AI_DIALOGUE.stop)window.KRXA_AI_DIALOGUE.stop();}catch(e){}try{if(window.KRXA_Translate&&window.KRXA_Translate.stopAuto)window.KRXA_Translate.stopAuto();}catch(e){}try{if(window.speechSynthesis)window.speechSynthesis.cancel();}catch(e){}release();return true;}
 function ensureMini(){try{if(document.querySelector('[data-flow="mini.ai.toggle"]'))return;if(t(document.body).indexOf('말대말 통역')>=0)return;var bars=Array.from(document.querySelectorAll('button,div,a')).filter(function(el){var x=t(el);return x.indexOf('말대말')>=0||x.indexOf('말하면 바로 통역')>=0;});var bar=bars[bars.length-1];if(!bar)return;bar.setAttribute('data-flow','mini.m2m.speak');if(getComputedStyle(bar).position==='static')bar.style.position='relative';var sp=document.createElement('span');sp.setAttribute('data-flow','mini.ai.toggle');sp.setAttribute('data-ai','off');sp.setAttribute('aria-checked','false');sp.textContent='AI OFF';sp.style.cssText='position:absolute;right:12px;top:6px;font-size:11px;padding:2px 7px;border-radius:999px;background:#dbe3ef;color:#0f172a;font-weight:800;z-index:9;';sp.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();miniToggle({target:sp});sp.textContent=window.KRXA_MINI_AI_DIALOGUE_ENABLED?'AI ON':'AI OFF';sp.style.background=window.KRXA_MINI_AI_DIALOGUE_ENABLED?'#2563eb':'#dbe3ef';sp.style.color=window.KRXA_MINI_AI_DIALOGUE_ENABLED?'#fff':'#0f172a';return false;},true);bar.appendChild(sp);}catch(e){}}
 function go(id,p){if(id==='page5.ai.toggle')return page5Toggle(p);if(id==='mini.ai.toggle')return miniToggle(p);if(id==='page5.m2m.speak')return page5Speak();if(id==='mini.m2m.speak')return miniSpeak();if(id==='m2m.speak')return t(document.body).indexOf('말대말 통역')>=0?page5Speak():miniSpeak();if(id==='m2m.stop')return stopAll();if(window.KRXA_FLOW&&window.KRXA_FLOW.__oldGo)return window.KRXA_FLOW.__oldGo(id,p);return false;}
 function bind(){window.KRXA_FLOW=window.KRXA_FLOW||{};if(!window.KRXA_FLOW.__oldGo&&typeof window.KRXA_FLOW.go==='function')window.KRXA_FLOW.__oldGo=window.KRXA_FLOW.go;window.KRXA_FLOW.go=go;window.KRXA_FLOW.page5AiOn=page5On;window.KRXA_FLOW.miniAiOn=miniOn;window.KRXA_FLOW.forceReleaseUI=release;window.KRXA_FLOW.unlockMobileTTS=unlock;ensureMini();}
 setTimeout(bind,50);setTimeout(bind,300);setInterval(ensureMini,2500);
})();


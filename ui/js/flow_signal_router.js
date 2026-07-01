/* flow_signal_router.js - TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4D */
(function(){
  if(window.KRXA_FLOW_V4D_LOADED){return;}
  window.KRXA_FLOW_V4D_LOADED=true;
  var state=window.KRXA_FLOW_STATE||{lastFlow:null,currentFlow:null,modalActive:false};
  window.KRXA_FLOW_STATE=state;
  window.KRXA_MINI_AI_DIALOGUE_ENABLED=window.KRXA_MINI_AI_DIALOGUE_ENABLED||false;
  function log(id,p){try{console.log("[TRAVEL_V1_FLOW_V4D]",id,p||"");}catch(e){}}
  function app(){return window.KRXA_App||null;}
  function text(el){try{return(el&&(el.innerText||el.textContent||""))||"";}catch(e){return"";}}
  function closeModal(){try{if(app()&&typeof app().closeModal==="function"){app().closeModal();}}catch(e){};try{["#modalBack","#modal","#appModal","#commonModal",".modalBack",".modalOverlay",".modal"].forEach(function(s){document.querySelectorAll(s).forEach(function(el){el.style.display="none";el.classList.remove("show","active","open");});});}catch(e){}state.modalActive=false;return true;}
  function pageBack(){try{if(app()&&typeof app().goUserPage==="function"){app().goUserPage(2);return true;}if(app()&&typeof app().goPage==="function"){app().goPage(1);return true;}}catch(e){}return false;}
  function enterM2M(){try{if(app()&&typeof app().goUserPage==="function"){app().goUserPage(5);return true;}if(app()&&typeof app().goPage==="function"){app().goPage(5);return true;}}catch(e){}return false;}
  function setToggleVisual(el,on){try{if(!el)return;el.classList.toggle("active",!!on);el.classList.toggle("on",!!on);el.setAttribute("data-ai",on?"on":"off");el.setAttribute("aria-checked",on?"true":"false");}catch(e){}}
  function page5AiToggle(){try{var el=document.getElementById("autoToggle");var cur=false;if(window.KRXA_PAGE5_M2M_STATE_MACHINE&&typeof window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode==="function"){cur=window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode()==="ai_dialogue";}var next=!cur;if(window.KRXA_PAGE5_M2M_STATE_MACHINE&&typeof window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode==="function"){window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode(next?"ai_dialogue":"translate");}setToggleVisual(el,next);return true;}catch(e){return false;}}
  function miniAiToggle(payload){var next=!window.KRXA_MINI_AI_DIALOGUE_ENABLED;window.KRXA_MINI_AI_DIALOGUE_ENABLED=next;setToggleVisual(payload&&payload.target?payload.target:null,next);return true;}
  function isPage5AiOn(){try{if(window.KRXA_PAGE5_M2M_STATE_MACHINE&&typeof window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode==="function"){var m=window.KRXA_PAGE5_M2M_STATE_MACHINE.getMode();if(m==="ai_dialogue"||m==="ai")return true;}}catch(e){}try{var el=document.getElementById("autoToggle");if(el&&(el.classList.contains("active")||el.classList.contains("on")||el.getAttribute("data-ai")==="on"||el.getAttribute("aria-checked")==="true"))return true;}catch(e){}return false;}
  function speakTranslate(src){try{if(window.KRXA_Translate&&typeof window.KRXA_Translate.requestMicAndStart==="function"){return window.KRXA_Translate.requestMicAndStart({source:src,flow_id:src.indexOf("MINI")>=0?"mini.m2m.speak":"page5.m2m.speak",userTriggered:true,mode:"translate",forceTranslate:true});}}catch(e){try{console.warn("[FLOW_V4D] translate failed",e);}catch(_){}}return false;}
  function speakAI(src){try{if(window.KRXA_AI_DIALOGUE&&typeof window.KRXA_AI_DIALOGUE.speakOnce==="function"){return window.KRXA_AI_DIALOGUE.speakOnce({source:src,flow_id:src.indexOf("MINI")>=0?"mini.m2m.speak":"page5.m2m.speak",userTriggered:true});}}catch(e){try{console.warn("[FLOW_V4D] ai failed",e);}catch(_){}}return false;}
  function page5Speak(){return isPage5AiOn()?speakAI("TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4D_PAGE5_AI"):speakTranslate("TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4D_PAGE5_TRANSLATE");}
  function miniSpeak(){return window.KRXA_MINI_AI_DIALOGUE_ENABLED===true?speakAI("TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4D_MINI_AI"):speakTranslate("TRAVEL_V1_AI_DIALOGUE_FULL_SET_V4D_MINI_TRANSLATE");}
  function m2mSpeak(){try{if(text(document.body).indexOf("말대말 통역")>=0)return page5Speak();}catch(e){}return miniSpeak();}
  function m2mStop(){try{if(window.KRXA_AI_DIALOGUE&&typeof window.KRXA_AI_DIALOGUE.stop==="function")window.KRXA_AI_DIALOGUE.stop();}catch(e){}try{if(window.KRXA_Translate&&typeof window.KRXA_Translate.stopAuto==="function")window.KRXA_Translate.stopAuto();}catch(e){}return true;}
  function m2mTextOpen(){try{if(window.KRXA_Translate&&typeof window.KRXA_Translate.openQuickInput==="function"){window.KRXA_Translate.openQuickInput();return true;}}catch(e){}return false;}
  function m2mReplay(){try{if(window.KRXA_Translate&&typeof window.KRXA_Translate.replayTTS==="function"){window.KRXA_Translate.replayTTS();return true;}}catch(e){}return false;}
  function linkManage(){try{if(app()&&typeof app().openLinkManager==="function"){app().openLinkManager();return true;}}catch(e){}return false;}
  function go(id,p){if(!id)return false;state.lastFlow=id;state.currentFlow=id;log(id,p);switch(id){case"modal.close":return closeModal();case"page.back":return pageBack();case"m2m.enter":return enterM2M();case"m2m.speak":return m2mSpeak();case"page5.m2m.speak":return page5Speak();case"mini.m2m.speak":return miniSpeak();case"page5.ai.toggle":return page5AiToggle();case"mini.ai.toggle":return miniAiToggle(p);case"m2m.stop":return m2mStop();case"m2m.text.open":return m2mTextOpen();case"m2m.replay":return m2mReplay();case"user.link.manage":return linkManage();default:log("unhandled",id);return false;}}
  function onClick(e){var el=null;try{el=e.target&&e.target.closest?e.target.closest("[data-flow]"):null;}catch(err){}if(!el)return;var id=el.getAttribute("data-flow");if(!id)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();go(id,{target:el,text:(el.innerText||el.textContent||"").trim()});return false;}
  function init(){if(window.__KRXA_FLOW_V4D_BOUND)return;window.__KRXA_FLOW_V4D_BOUND=true;document.addEventListener("click",onClick,true);}
  document.addEventListener("DOMContentLoaded",function(){setTimeout(init,30);});setTimeout(init,200);
  window.KRXA_FLOW={go:go,init:init,state:state,isPage5AiOn:isPage5AiOn};
})();

/* mini_m2m_simple_panel.js - PATCH75
 * Mini 말대말 = 통역 전용
 * AI대화 없음. 5페이지 이동 없음.
 */
(function(){
  if(window.KRXA_MINI_M2M_SIMPLE_PANEL_PATCH75_LOADED){ return; }
  window.KRXA_MINI_M2M_SIMPLE_PANEL_PATCH75_LOADED = true;

  function safeText(el){
    try{ return (el && (el.innerText || el.textContent || "")) || ""; }catch(e){ return ""; }
  }

  function findMiniAnchor(){
    try{
      var nodes = Array.from(document.querySelectorAll("div, section, footer, button"));
      return nodes.find(function(n){
        var t = safeText(n);
        return t.indexOf("말대말") >= 0 && (t.indexOf("통역") >= 0 || t.indexOf("말하면 바로") >= 0);
      }) || null;
    }catch(e){ return null; }
  }

  function setMiniTranslateMode(){
    window.KRXA_MINI_M2M_MODE = "translate";
    window.KRXA_MINI_M2M_AI_DIALOGUE_ENABLED = false;
  }

  function runTranslateMic(){
    setMiniTranslateMode();
    try{
      window.KRXA_MINI_M2M_FORCE_TRANSLATE = true;
      if(window.KRXA_AI_DIALOGUE_TRUE_AUTO && window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop){ window.KRXA_AI_DIALOGUE_TRUE_AUTO.stop(); }
      if(window.KRXA_AI_DIALOGUE_AUTO_LOOP && window.KRXA_AI_DIALOGUE_AUTO_LOOP.stop){ window.KRXA_AI_DIALOGUE_AUTO_LOOP.stop(); }
    }catch(e){}

    try{
      if(window.KRXA_Translate && window.KRXA_Translate.requestMicAndStart){
        window.KRXA_Translate.requestMicAndStart({forceTranslate:true, source:"mini_m2m"});
        return true;
      }
      if(typeof window.recordVoice === "function"){ window.recordVoice(); return true; }
      if(typeof window.toggleAuto === "function"){ window.toggleAuto(); return true; }
    }catch(e){
      console.warn("[PATCH75] mini translate mic failed", e);
    }
    return false;
  }

  function createPanel(anchor){
    if(document.getElementById("krxa-mini-m2m-simple-panel")){ return; }

    var panel = document.createElement("div");
    panel.id = "krxa-mini-m2m-simple-panel";
    panel.style.marginTop = "10px";
    panel.style.padding = "12px";
    panel.style.borderRadius = "18px";
    panel.style.background = "rgba(255,255,255,0.96)";
    panel.style.color = "#111827";
    panel.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
    panel.style.textAlign = "center";
    panel.style.fontWeight = "800";

    panel.innerHTML = ""
      + "<div style='font-size:14px;margin-bottom:8px;'>미니 말대말</div>"
      + "<div style='border-radius:12px;padding:10px;background:#2563eb;color:white;margin-bottom:10px;'>통역</div>"
      + "<button id='krxa-mini-m2m-mic' type='button' style='width:76px;height:76px;border:0;border-radius:50%;background:#16a34a;color:white;font-size:34px;font-weight:900;'>🎙</button>"
      + "<div id='krxa-mini-m2m-status' style='margin-top:8px;font-size:12px;color:#475569;'>통역 전용</div>";

    anchor.appendChild(panel);

    var mic = document.getElementById("krxa-mini-m2m-mic");
    if(mic){
      mic.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        runTranslateMic();
      });
    }

    setMiniTranslateMode();
  }

  function neutralizeMiniNavigation(){
    try{
      var nodes = Array.from(document.querySelectorAll("[data-admin-id='mini_talk']"));
      nodes.forEach(function(n){
        n.onclick = function(e){
          if(e){ e.preventDefault(); e.stopPropagation(); }
          open();
          return false;
        };
      });
    }catch(e){}
  }

  function open(){
    setMiniTranslateMode();
    neutralizeMiniNavigation();
    var anchor = findMiniAnchor();
    if(anchor){ createPanel(anchor); }
    var p = document.getElementById("krxa-mini-m2m-simple-panel");
    if(p){ p.scrollIntoView({block:"nearest", behavior:"smooth"}); }
  }

  function init(){
    neutralizeMiniNavigation();
    var anchor = findMiniAnchor();
    if(anchor){ createPanel(anchor); }
  }

  document.addEventListener("DOMContentLoaded", init);
  setTimeout(init, 300);
  setTimeout(init, 1000);
  setTimeout(init, 2500);

  window.KRXA_MINI_M2M_SIMPLE_PANEL = {
    open: open,
    init: init,
    runMic: runTranslateMic,
    setMode: setMiniTranslateMode,
    getMode: function(){ return "translate"; }
  };
})();

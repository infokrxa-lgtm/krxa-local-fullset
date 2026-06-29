
/* mini_m2m_simple_panel.js - PATCH72
 * 미니말대말 단순 기능 패널
 * [통역] [AI대화]
 *      [마이크]
 *
 * 원칙:
 * - 미니말대말 클릭은 5페이지 이동하지 않는다.
 * - 전체 document click capture 금지.
 * - 미니 패널 내부 버튼만 이벤트 처리.
 * - 기존 말하기/마이크 기능을 먼저 살린다.
 */
(function(){
  if(window.KRXA_MINI_M2M_SIMPLE_PANEL_LOADED){ return; }
  window.KRXA_MINI_M2M_SIMPLE_PANEL_LOADED = true;

  var mode = "translate"; // translate | ai

  function el(id){ return document.getElementById(id); }

  function safeText(node){
    try{ return (node && (node.innerText || node.textContent || "")) || ""; }catch(e){ return ""; }
  }

  function findMiniAnchor(){
    try{
      var nodes = Array.from(document.querySelectorAll("div, section, footer, button"));
      return nodes.find(function(n){
        var t = safeText(n);
        return t.indexOf("말대말") >= 0 && (t.indexOf("말하면 바로 통역") >= 0 || t.indexOf("통역") >= 0);
      }) || null;
    }catch(e){ return null; }
  }

  function setMode(next){
    mode = next === "ai" ? "ai" : "translate";
    window.KRXA_MINI_M2M_MODE = mode;
    window.KRXA_MINI_M2M_AI_DIALOGUE_ENABLED = mode === "ai";
    window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = mode === "ai";
    window.KRXA_AI_DIALOGUE_ENABLED = mode === "ai";
    window.KRXA_AI_DIALOGUE_FREE_MODE = mode === "ai";

    var t = el("krxa-mini-m2m-tab-translate");
    var a = el("krxa-mini-m2m-tab-ai");
    if(t && a){
      t.style.background = mode === "translate" ? "#2563eb" : "#e5e7eb";
      t.style.color = mode === "translate" ? "white" : "#111827";
      a.style.background = mode === "ai" ? "#2563eb" : "#e5e7eb";
      a.style.color = mode === "ai" ? "white" : "#111827";
    }
    var label = el("krxa-mini-m2m-status");
    if(label){
      label.textContent = mode === "ai" ? "AI대화 모드" : "통역 모드";
    }
  }

  function runMic(){
    try{
      if(mode === "ai"){
        if(window.KRXA_AI_DIALOGUE_TRUE_AUTO && window.KRXA_AI_DIALOGUE_TRUE_AUTO.start){
          window.KRXA_AI_DIALOGUE_TRUE_AUTO.start();
          return;
        }
        if(window.KRXA_AI_DIALOGUE && window.KRXA_AI_DIALOGUE.start){
          window.KRXA_AI_DIALOGUE.start();
          return;
        }
      }

      // 통역 모드: 기존 말대말 마이크/말하기 함수 호출
      if(typeof window.recordVoice === "function"){
        window.recordVoice();
        return;
      }
      if(typeof window.toggleAuto === "function"){
        window.toggleAuto();
        return;
      }

      // 기존 함수가 전역이 아니면 5페이지의 말하기 버튼만 찾아 클릭
      var candidates = Array.from(document.querySelectorAll("button"));
      var btn = candidates.find(function(b){
        var t = safeText(b);
        return t.indexOf("말하기") >= 0 || t.indexOf("🎙") >= 0;
      });
      if(btn){ btn.click(); return; }

      alert("말대말 마이크 함수를 찾지 못했습니다.");
    }catch(e){
      console.warn("[PATCH72] mini m2m mic failed", e);
      alert("미니말대말 실행 오류: " + e.message);
    }
  }

  function createPanel(anchor){
    if(el("krxa-mini-m2m-simple-panel")){ return; }

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

    panel.innerHTML = ''
      + '<div style="font-size:14px;margin-bottom:8px;">미니 말대말</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">'
      + '  <button id="krxa-mini-m2m-tab-translate" type="button" style="border:0;border-radius:12px;padding:10px;font-weight:900;">통역</button>'
      + '  <button id="krxa-mini-m2m-tab-ai" type="button" style="border:0;border-radius:12px;padding:10px;font-weight:900;">AI대화</button>'
      + '</div>'
      + '<button id="krxa-mini-m2m-mic" type="button" style="width:76px;height:76px;border:0;border-radius:50%;background:#16a34a;color:white;font-size:34px;font-weight:900;">🎙</button>'
      + '<div id="krxa-mini-m2m-status" style="margin-top:8px;font-size:12px;color:#475569;">통역 모드</div>';

    anchor.appendChild(panel);

    el("krxa-mini-m2m-tab-translate").addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      setMode("translate");
    });
    el("krxa-mini-m2m-tab-ai").addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      setMode("ai");
    });
    el("krxa-mini-m2m-mic").addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      runMic();
    });

    setMode("translate");
  }

  function neutralizeOldMiniLinks(){
    // 5페이지 이동을 유발하는 말대말 앵커/버튼만 중립화하되 전체 클릭바는 건드리지 않음
    try{
      var nodes = Array.from(document.querySelectorAll("a, button, div"));
      nodes.forEach(function(n){
        var t = safeText(n);
        var onclick = String(n.getAttribute && n.getAttribute("onclick") || "");
        if(t.indexOf("말대말") >= 0 && onclick.indexOf("goPage(5") >= 0){
          n.setAttribute("data-old-onclick", onclick);
          n.removeAttribute("onclick");
        }
      });
    }catch(e){}
  }

  function init(){
    neutralizeOldMiniLinks();
    var anchor = findMiniAnchor();
    if(anchor){ createPanel(anchor); }
  }

  document.addEventListener("DOMContentLoaded", init);
  setTimeout(init, 300);
  setTimeout(init, 1000);
  setTimeout(init, 2500);

  window.KRXA_MINI_M2M_SIMPLE_PANEL = {
    /* PATCH74_OPEN_ALIAS */ open: init,
    init: init,
    runMic: runMic,
    setMode: setMode,
    getMode: function(){ return mode; }
  };
})();

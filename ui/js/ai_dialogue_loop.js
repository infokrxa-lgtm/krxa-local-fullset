/* ai_dialogue_loop.js - PATCH73 SAFE FULL REPLACE
 * 목적:
 * - AI대화/미니말대말이 화면 전체를 지우지 않게 한다.
 * - PATCH59/PATCH65 중복 자동루프를 단일 안전 루프로 통합한다.
 * - 상태/원문/답변 박스만 좁게 갱신한다.
 * - 5페이지 이동 없이 미니말대말에서도 기능 수행 가능하게 한다.
 */
(function(){
  if(window.KRXA_AI_DIALOGUE_PATCH73_LOADED){ return; }
  window.KRXA_AI_DIALOGUE_PATCH73_LOADED = true;

  var ROUTE = "/api/travel-v1/ai-dialogue/turn";
  var recognition = null;
  var autoOn = false;
  var listening = false;
  var speaking = false;
  var lastText = "";

  function textOf(el){
    try{ return (el && (el.innerText || el.textContent || "")) || ""; }catch(e){ return ""; }
  }

  function isRootLike(el){
    try{
      if(!el){ return true; }
      if(el === document.body || el === document.documentElement){ return true; }
      var id = String(el.id || "").toLowerCase();
      var cls = String(el.className || "").toLowerCase();
      if(id === "app" || id === "root"){ return true; }
      if(cls.indexOf("phone") >= 0 || cls.indexOf("page-wrap") >= 0 || cls.indexOf("screen") >= 0){ return true; }
      if(el.querySelectorAll && el.querySelectorAll("button,input,select,textarea").length > 2){ return true; }
    }catch(e){}
    return false;
  }

  function safeSetText(el, value){
    try{
      if(!el || isRootLike(el)){ return false; }
      el.textContent = value || "";
      return true;
    }catch(e){ return false; }
  }

  function safeSetHTML(el, html){
    try{
      if(!el || isRootLike(el)){ return false; }
      el.innerHTML = html || "";
      return true;
    }catch(e){ return false; }
  }

  window.KRXA_SAFE_SET_TEXT = safeSetText;
  window.KRXA_SAFE_SET_HTML = safeSetHTML;
  window.KRXA_AI_DIALOGUE_UI_MODE = "service_only_patch73";
/* PATCH76_PAGE5_AI_SESSION_MARKER */
window.KRXA_PAGE5_AI_SESSION_ACTIVE = false;

  function esc(v){
    return String(v || "").replace(/[<>&]/g, function(c){
      return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c];
    });
  }

  function findAiToggle(){
    try{
      var inputs = Array.from(document.querySelectorAll("input[type='checkbox']"));
      for(var i=0;i<inputs.length;i++){
        var p = inputs[i].closest ? inputs[i].closest("label, div, section") : null;
        if(textOf(p).indexOf("AI대화") >= 0 || textOf(p).indexOf("자동대화") >= 0){ return inputs[i]; }
      }
    }catch(e){}
    return null;
  }

  function isBlueOn(el){
    try{
      if(!el){ return false; }
      if(el.checked === true){ return true; }
      if(el.getAttribute && (el.getAttribute("aria-checked") === "true" || el.getAttribute("data-on") === "true")){ return true; }
      var cls = String(el.className || "").toLowerCase();
      if(cls.indexOf("active") >= 0 || cls.indexOf("checked") >= 0 || cls.indexOf("on") >= 0){ return true; }
      var st = window.getComputedStyle ? window.getComputedStyle(el) : null;
      var bg = st ? String(st.backgroundColor || "") : "";
      if(bg.indexOf("37, 99, 235") >= 0 || bg.indexOf("59, 130, 246") >= 0 || bg.indexOf("0, 122, 255") >= 0){ return true; }
    }catch(e){}
    return false;
  }

  function isAiOn(){
    /* PATCH75_AI_PAGE5_ONLY_GUARD */
    try{
      if(window.KRXA_MINI_M2M_FORCE_TRANSLATE === true || window.KRXA_MINI_M2M_MODE === "translate"){
        return false;
      }
    }catch(e){}

    try{
      if(window.KRXA_MINI_M2M_MODE === "ai"){ return true; }
      if(window.KRXA_MINI_M2M_AI_DIALOGUE_ENABLED === true){ return true; }
      if(window.KRXA_PAGE5_AI_DIALOGUE_ENABLED === true){ return true; }
      if(window.KRXA_AI_DIALOGUE_ENABLED === true){ return true; }

      var t = findAiToggle();
      if(t){ return !!t.checked; }

      var boxes = Array.from(document.querySelectorAll("label,div,section,span"));
      var box = boxes.find(function(n){ return textOf(n).indexOf("AI대화") >= 0; });
      if(box){
        var check = Array.from(box.querySelectorAll("input[type='checkbox']")).some(function(i){ return i.checked; });
        if(check){ return true; }
        if(Array.from(box.querySelectorAll("*")).some(isBlueOn)){ return true; }
        if(isBlueOn(box)){ return true; }
      }
    }catch(e){}
    return false;
  }

  function syncAiState(){
    var on = isAiOn();
    window.KRXA_AI_DIALOGUE_ENABLED = on;
    window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = on;
    window.KRXA_AI_DIALOGUE_FREE_MODE = on;
    return on;
  }

  function speechLang(){
    try{
      var buttons = Array.from(document.querySelectorAll("button"));
      var active = buttons.find(function(b){ return isBlueOn(b); });
      var t = textOf(active);
      if(t.indexOf("일본") >= 0){ return "ja-JP"; }
      if(t.indexOf("중국") >= 0){ return "zh-CN"; }
      if(t.indexOf("영어") >= 0){ return "en-US"; }
      if(t.toLowerCase().indexOf("thai") >= 0 || t.indexOf("태국") >= 0){ return "th-TH"; }

      var sel = document.querySelector("select");
      if(sel){
        var sv = String(sel.value || (sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].text) || "").toLowerCase();
        if(sv.indexOf("thai") >= 0 || sv.indexOf("태국") >= 0){ return "th-TH"; }
        if(sv.indexOf("japan") >= 0 || sv.indexOf("일본") >= 0){ return "ja-JP"; }
        if(sv.indexOf("china") >= 0 || sv.indexOf("중국") >= 0){ return "zh-CN"; }
        if(sv.indexOf("english") >= 0 || sv.indexOf("영어") >= 0){ return "en-US"; }
      }
    }catch(e){}
    return "ko-KR";
  }

  function langCode(sr){
    sr = String(sr || "ko-KR");
    if(sr.indexOf("ja") === 0){ return "ja"; }
    if(sr.indexOf("zh") === 0){ return "zh"; }
    if(sr.indexOf("en") === 0){ return "en"; }
    if(sr.indexOf("th") === 0){ return "th"; }
    return "ko";
  }

  function findBox(label){
    try{
      var nodes = Array.from(document.querySelectorAll("b,strong,label,div,span"));
      var labelNode = nodes.find(function(n){
        return textOf(n).trim() === label && !isRootLike(n);
      });
      if(!labelNode){ return null; }
      var p = labelNode.parentElement;
      if(!p || isRootLike(p)){ return null; }
      return p;
    }catch(e){}
    return null;
  }

  function setBox(label, value){
    var b = findBox(label);
    if(!b){ return false; }
    return safeSetHTML(b, "<b>"+label+"</b><br>"+esc(value));
  }

  function findStatusNode(){
    try{
      var phrases = ["마이크를 누르면", "말하기 버튼", "다음 말", "듣는 중", "기다립니다", "시작하세요"];
      var nodes = Array.from(document.querySelectorAll("p,span,small,div"));
      var candidates = nodes.filter(function(n){
        if(isRootLike(n)){ return false; }
        var t = textOf(n).trim();
        if(!t || t.length > 80){ return false; }
        if(n.querySelectorAll && n.querySelectorAll("button,input,select").length){ return false; }
        return phrases.some(function(p){ return t.indexOf(p) >= 0; });
      });
      if(candidates.length){
        candidates.sort(function(a,b){ return textOf(a).length - textOf(b).length; });
        return candidates[0];
      }
    }catch(e){}
    return null;
  }

  function setStatus(value){
    var n = findStatusNode();
    if(n){ safeSetText(n, value); }
  }

  async function callAiDialogue(inputText, opt){
    opt = opt || {};
    var srLang = opt.speechLang || speechLang();
    var lc = opt.sourceLang || langCode(srLang);
    var payload = {
      text: inputText || "",
      message: inputText || "",
      prompt: inputText || "",
      detected_lang: lc,
      source_lang: lc,
      target_lang: lc,
      mode: "krxa_travel_ai_companion",
      call_phrase: "KRXA_TRAVEL_AI_COMPANION_V1",
      allow_free_dialogue: true,
      allow_short_utterance: true,
      same_language_reply: true,
      translator_role: false,
      context: { page: "travel_v1", route: "ai_dialogue_safe_patch73" }
    };

    var res = await fetch(ROUTE, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    var data = {};
    try{ data = await res.json(); }catch(e){ data = {}; }
    var out = data.reply || data.response || data.answer || data.text || data.result || data.translated || "";
    data.reply = out;
    data.text = out;
    data.translated = out;
    data.route = ROUTE;
    return data;
  }

  window.KRXA_AI_DIALOGUE_ROUTE = ROUTE;
  window.KRXA_AI_DIALOGUE = {
    isOn: syncAiState,
    call: callAiDialogue,
    route: ROUTE
  };

  function speak(out, srLang){
    try{
      if(!out || !window.speechSynthesis){
        if(autoOn){ setTimeout(startListen, 450); }
        return;
      }
      speaking = true;
      var u = new SpeechSynthesisUtterance(out);
      u.lang = srLang || speechLang();
      u.onend = function(){
        speaking = false;
        if(autoOn && isAiOn()){ setTimeout(startListen, 500); }
      };
      u.onerror = function(){
        speaking = false;
        if(autoOn && isAiOn()){ setTimeout(startListen, 700); }
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }catch(e){
      speaking = false;
      if(autoOn){ setTimeout(startListen, 700); }
    }
  }

  async function sendToAi(inputText, srLang){
    if(!inputText || !isAiOn()){ return; }
    lastText = inputText;
    setBox("원문", inputText);
    setStatus("AI가 응답 중입니다");
    try{
      var data = await callAiDialogue(inputText, {speechLang: srLang});
      var out = data.reply || "";
      setBox("번역", out);
      setStatus("다음 말을 자동으로 듣고 있습니다");
      speak(out, srLang);
    }catch(e){
      setBox("번역", "AI대화 오류: " + (e && e.message ? e.message : e));
      setStatus("AI대화 오류");
      if(autoOn){ setTimeout(startListen, 900); }
    }
  }

  function createRecognition(){
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ return null; }
    var r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.lang = speechLang();

    r.onstart = function(){
      listening = true;
      setStatus("듣는 중입니다. 자유롭게 말하세요.");
    };
    r.onerror = function(){
      listening = false;
      if(autoOn && isAiOn() && !speaking){ setTimeout(startListen, 800); }
    };
    r.onend = function(){
      listening = false;
      if(autoOn && isAiOn() && !speaking){ setTimeout(startListen, 650); }
    };
    r.onresult = function(ev){
      var finalText = "";
      var interim = "";
      for(var i=ev.resultIndex; i<ev.results.length; i++){
        var tx = ev.results[i][0].transcript;
        if(ev.results[i].isFinal){ finalText += tx; }
        else{ interim += tx; }
      }
      if(interim){ setBox("원문", interim); }
      if(finalText.trim()){
        try{ r.stop(); }catch(e){}
        sendToAi(finalText.trim(), r.lang);
      }
    };
    return r;
  }

  function startListen(){
    if(!autoOn || !isAiOn() || listening || speaking){ return false; }
    if(!recognition){ recognition = createRecognition(); }
    if(!recognition){
      setStatus("이 브라우저는 자동 음성인식을 지원하지 않습니다");
      return false;
    }
    recognition.lang = speechLang();
    try{ recognition.start(); return true; }catch(e){ return false; }
  }

  function startAuto(){
    if(!syncAiState()){ return false; }
    autoOn = true;
    window.KRXA_AI_DIALOGUE_AUTO_LISTENING = true;
    setStatus("듣는 중입니다. 자유롭게 말하세요.");
    return startListen();
  }

  function stopAuto(){
    autoOn = false;
    window.KRXA_AI_DIALOGUE_AUTO_LISTENING = false;
    try{ if(recognition){ recognition.stop(); } }catch(e){}
    setStatus("AI대화 자동듣기 종료");
  }

  function toggleAuto(){
    if(autoOn){ stopAuto(); return false; }
    return startAuto();
  }

  window.KRXA_AI_DIALOGUE_TRUE_AUTO = {
    start: startAuto,
    stop: stopAuto,
    toggle: toggleAuto,
    isOn: function(){ return autoOn; }
  };
  window.KRXA_AI_DIALOGUE_AUTO_LOOP = window.KRXA_AI_DIALOGUE_TRUE_AUTO;

  function isMicOrSpeakButton(target){
    try{
      if(!target){ return false; }
      var btn = target.closest ? target.closest("button, [role='button'], .mic, .voice, .krxa-mic, #krxa-mini-m2m-mic") : target;
      if(!btn){ return false; }
      var t = textOf(btn);
      var cls = String(btn.className || "").toLowerCase();
      var id = String(btn.id || "").toLowerCase();
      if(id === "krxa-mini-m2m-mic"){ return true; }
      if(t.indexOf("말하기") >= 0 || t.indexOf("🎙") >= 0){ return true; }
      if(cls.indexOf("mic") >= 0 || cls.indexOf("voice") >= 0){ return true; }
    }catch(e){}
    return false;
  }

  document.addEventListener("click", function(e){
    try{
      if(!isAiOn()){ return; }
      if(!isMicOrSpeakButton(e.target)){ return; }
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation){ e.stopImmediatePropagation(); }
      /* PATCH76_CLEAR_MINI_FORCE_ON_PAGE5_AI_MIC */
      window.KRXA_MINI_M2M_FORCE_TRANSLATE = false;
      window.KRXA_PAGE5_AI_SESSION_ACTIVE = true;
      toggleAuto();
    }catch(err){}
  }, true);

  document.addEventListener("change", function(e){
    try{
      if(e && e.target && e.target.type === "checkbox"){
        setTimeout(function(){
          if(syncAiState()){
            startAuto();
          }else{
            stopAuto();
          }
        }, 120);
      }
    }catch(err){}
  });

  document.addEventListener("DOMContentLoaded", function(){ setTimeout(syncAiState, 200); });

})();

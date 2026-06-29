
/* PATCH67_V2_AI_DIALOGUE_UI_SAFE_GUARD_START */
(function(){
  if(window.KRXA_PATCH67_V2_UI_SAFE_GUARD){ return; }
  window.KRXA_PATCH67_V2_UI_SAFE_GUARD = true;

  function isRootLike(el){
    try{
      if(!el){ return false; }
      if(el === document.body || el === document.documentElement){ return true; }
      var id = String(el.id || '').toLowerCase();
      var cls = String(el.className || '').toLowerCase();
      if(id === 'app' || id === 'root'){ return true; }
      if(cls.indexOf('page-wrap') >= 0 || cls.indexOf('phone') >= 0){ return true; }
    }catch(e){}
    return false;
  }

  window.KRXA_SAFE_SET_TEXT = function(el, text){
    try{
      if(!el || isRootLike(el)){ return false; }
      el.textContent = text || '';
      return true;
    }catch(e){ return false; }
  };

  window.KRXA_SAFE_SET_HTML = function(el, html){
    try{
      if(!el || isRootLike(el)){ return false; }
      el.innerHTML = html || '';
      return true;
    }catch(e){ return false; }
  };

  window.KRXA_AI_DIALOGUE_UI_MODE = 'service_only';
})();
/* PATCH67_V2_AI_DIALOGUE_UI_SAFE_GUARD_END */

/* ai_dialogue_loop.js - Travel V1 Page5 AI대화 별도 루프 */
(function(){
  if(window.KRXA_AI_DIALOGUE_LOOP_LOADED){ return; }
  window.KRXA_AI_DIALOGUE_LOOP_LOADED = true;
  window.KRXA_AI_DIALOGUE_ROUTE = '/api/travel-v1/ai-dialogue/turn';
  window.KRXA_AI_DIALOGUE_ENABLED = false;
  function findAiDialogueToggle(){
    try{
      const candidates = Array.from(document.querySelectorAll("input[type='checkbox']"));
      for(const c of candidates){
        let txt = '';
        const p = c.closest('label, div, section');
        if(p){ txt = p.innerText || ''; }
        if(txt.includes('AI대화') || txt.includes('자동대화')){ return c; }
      }
    }catch(e){}
    return null;
  }
  function syncAiDialogueState(){
    try{
      const t = findAiDialogueToggle();
      window.KRXA_AI_DIALOGUE_ENABLED = !!(t && t.checked);
      window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = window.KRXA_AI_DIALOGUE_ENABLED;
      window.KRXA_AI_DIALOGUE_FREE_MODE = window.KRXA_AI_DIALOGUE_ENABLED;
    }catch(e){}
    return window.KRXA_AI_DIALOGUE_ENABLED === true;
  }
  async function callAiDialogue(text, opt){
    opt = opt || {};
    const payload = {
      text: text || '',
      message: text || '',
      prompt: text || '',
      source_lang: opt.sourceLang || window.KRXA_SOURCE_LANG || 'auto',
      target_lang: opt.targetLang || window.KRXA_TARGET_LANG || 'ko',
      mode: 'ai_dialogue_free',
      allow_free_dialogue: true,
      bypass_translation_only_limit: true,
      allow_short_utterance: true,
      relax_background_filter: true,
      context: { page: 'travel_v1_page5', route: 'ai_dialogue_separate' }
    };
    const res = await fetch(window.KRXA_AI_DIALOGUE_ROUTE, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    let data = {};
    try{ data = await res.json(); }catch(e){ data = {}; }
    const out = data.reply || data.response || data.answer || data.text || data.result || '';
    data.translated = out; data.text = out; data.route = window.KRXA_AI_DIALOGUE_ROUTE; data.mode = 'ai_dialogue_free';
    return data;
  }
  window.KRXA_AI_DIALOGUE = { isOn: syncAiDialogueState, call: callAiDialogue, route: window.KRXA_AI_DIALOGUE_ROUTE };
  document.addEventListener('change', function(e){ try{ if(e.target && e.target.type === 'checkbox'){ syncAiDialogueState(); } }catch(err){} });
  document.addEventListener('DOMContentLoaded', syncAiDialogueState);
})();

/* PATCH59_AI_DIALOGUE_AUTO_VOICE_LOOP_START */
(function(){
  if(window.KRXA_AI_DIALOGUE_AUTO_LOOP_PATCH59){ return; }
  window.KRXA_AI_DIALOGUE_AUTO_LOOP_PATCH59 = true;

  let recognition = null;
  let autoLoopOn = false;
  let listening = false;
  let speaking = false;
  let lastFinalText = "";

  function isAiOn(){
    try{
      if(window.KRXA_AI_DIALOGUE && window.KRXA_AI_DIALOGUE.isOn && window.KRXA_AI_DIALOGUE.isOn()){ return true; }
      if(window.KRXA_PAGE5_AI_DIALOGUE_ENABLED === true){ return true; }
      if(window.KRXA_AI_DIALOGUE_ENABLED === true){ return true; }
    }catch(e){}
    return false;
  }

  function setStatus(text){
    try{
      const nodes = Array.from(document.querySelectorAll("p, div, span"));
      const target = nodes.find(n => (n.innerText || "").includes("마이크를 누르면") || (n.innerText || "").includes("다음 말을 기다립니다") || (n.innerText || "").includes("듣는 중"));
      if(target){ target.innerText = text; }
    }catch(e){}
  }

  function getInputBox(){
    try{
      const labels = Array.from(document.querySelectorAll("b, strong, label, div"));
      const originLabel = labels.find(n => (n.innerText || "").trim() === "원문");
      if(originLabel){
        const box = originLabel.parentElement;
        if(box){ return box; }
      }
    }catch(e){}
    return null;
  }

  function getOutputBox(){
    try{
      const labels = Array.from(document.querySelectorAll("b, strong, label, div"));
      const transLabel = labels.find(n => (n.innerText || "").trim() === "번역");
      if(transLabel){
        const box = transLabel.parentElement;
        if(box){ return box; }
      }
    }catch(e){}
    return null;
  }

  function writeBox(box, label, text){
    try{
      if(!box){ return; }
      box.innerHTML = "<b>"+label+"</b><br>" + String(text || "").replace(/[<>&]/g, function(c){ return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c]; });
    }catch(e){}
  }

  function speak(text){
    try{
      if(!text || !window.speechSynthesis){ return; }
      speaking = true;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.onend = function(){
        speaking = false;
        if(autoLoopOn && isAiOn()){
          setTimeout(startListen, 350);
        }
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }catch(e){
      speaking = false;
    }
  }

  async function sendToAi(text){
    if(!text || !isAiOn()){ return; }
    lastFinalText = text;
    writeBox(getInputBox(), "원문", text);
    setStatus("AI가 응답 중입니다");
    try{
      const data = await window.KRXA_AI_DIALOGUE.call(text, {sourceLang:"auto", targetLang:"ko"});
      const out = data.reply || data.response || data.answer || data.text || data.translated || "";
      writeBox(getOutputBox(), "번역", out);
      setStatus("다음 말을 기다립니다");
      speak(out);
    }catch(e){
      writeBox(getOutputBox(), "번역", "AI대화 오류: " + e.message);
      setStatus("AI대화 오류");
      if(autoLoopOn){ setTimeout(startListen, 800); }
    }
  }

  function createRecognition(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ return null; }
    const r = new SR();
    r.lang = "ko-KR";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = function(){
      listening = true;
      setStatus("듣는 중입니다. 자유롭게 말하세요.");
    };

    r.onerror = function(){
      listening = false;
      if(autoLoopOn && isAiOn() && !speaking){
        setTimeout(startListen, 800);
      }
    };

    r.onend = function(){
      listening = false;
      if(autoLoopOn && isAiOn() && !speaking){
        setTimeout(startListen, 500);
      }
    };

    r.onresult = function(ev){
      let finalText = "";
      let interim = "";
      for(let i=ev.resultIndex; i<ev.results.length; i++){
        const txt = ev.results[i][0].transcript;
        if(ev.results[i].isFinal){ finalText += txt; }
        else{ interim += txt; }
      }
      if(interim){ writeBox(getInputBox(), "원문", interim); }
      if(finalText.trim()){
        try{ r.stop(); }catch(e){}
        sendToAi(finalText.trim());
      }
    };
    return r;
  }

  function startListen(){
    if(!autoLoopOn || !isAiOn() || speaking || listening){ return; }
    if(!recognition){ recognition = createRecognition(); }
    if(!recognition){
      setStatus("이 브라우저는 자동 음성인식을 지원하지 않습니다");
      return;
    }
    try{ recognition.start(); }catch(e){}
  }

  function stopLoop(){
    autoLoopOn = false;
    try{ if(recognition){ recognition.stop(); } }catch(e){}
    setStatus("AI대화 자동듣기 종료");
  }

  function startLoop(){
    if(!isAiOn()){ return; }
    autoLoopOn = true;
    window.KRXA_AI_DIALOGUE_AUTO_LISTENING = true;
    startListen();
  }

  window.KRXA_AI_DIALOGUE_AUTO_LOOP = {
    start: startLoop,
    stop: stopLoop,
    isOn: function(){ return autoLoopOn; }
  };

  document.addEventListener("change", function(e){
    try{
      const t = e.target;
      if(!t || t.type !== "checkbox"){ return; }
      let near = "";
      const p = t.closest ? t.closest("label, div, section") : null;
      if(p){ near = p.innerText || ""; }
      if(near.includes("AI대화") || near.includes("자동대화")){
        if(t.checked){ startLoop(); }
        else{ stopLoop(); }
      }
    }catch(err){}
  });

  document.addEventListener("click", function(e){
    try{
      if(!isAiOn()){ return; }
      const txt = (e.target && (e.target.innerText || e.target.textContent || "")) || "";
      const cls = (e.target && e.target.className) ? String(e.target.className) : "";
      if(txt.includes("말하기") || txt.includes("🎙") || cls.includes("mic")){
        e.preventDefault();
        e.stopPropagation();
        if(autoLoopOn){ stopLoop(); }
        else{ startLoop(); }
      }
    }catch(err){}
  }, true);
})();
/* PATCH59_AI_DIALOGUE_AUTO_VOICE_LOOP_END */


/* PATCH65_AI_DIALOGUE_TRUE_AUTO_SAME_LANGUAGE_START */
(function(){
  if(window.KRXA_PATCH65_AI_DIALOGUE_TRUE_AUTO){ return; }
  window.KRXA_PATCH65_AI_DIALOGUE_TRUE_AUTO = true;

  function txt(el){ try{return (el && (el.innerText||el.textContent||''))||'';}catch(e){return '';} }
  function isOnStyle(el){
    try{
      if(!el){return false;}
      if(el.checked===true){return true;}
      if(el.getAttribute && (el.getAttribute('aria-checked')==='true' || el.getAttribute('data-on')==='true')){return true;}
      const cls=String(el.className||'').toLowerCase();
      if(cls.includes('on')||cls.includes('active')||cls.includes('checked')){return true;}
      const st=window.getComputedStyle?window.getComputedStyle(el):null;
      const bg=st?(st.backgroundColor||''):'';
      if(bg.includes('37, 99, 235')||bg.includes('59, 130, 246')||bg.includes('0, 122, 255')){return true;}
    }catch(e){}
    return false;
  }
  function aiToggleBox(){
    try{return Array.from(document.querySelectorAll('label, div, section, span')).find(n=>txt(n).includes('AI대화'))||null;}catch(e){return null;}
  }
  function isAiOn(){
    try{
      if(window.KRXA_PAGE5_AI_DIALOGUE_ENABLED===true||window.KRXA_AI_DIALOGUE_ENABLED===true){return true;}
      const box=aiToggleBox();
      if(!box){return false;}
      if(Array.from(box.querySelectorAll("input[type='checkbox']")).some(i=>i.checked)){return true;}
      if(Array.from(box.querySelectorAll('*')).some(isOnStyle)){return true;}
      return isOnStyle(box);
    }catch(e){return false;}
  }
  function speechLang(){
    try{
      const buttons=Array.from(document.querySelectorAll('button'));
      const active=buttons.find(b=>isOnStyle(b));
      const t=txt(active);
      if(t.includes('일본')) return 'ja-JP';
      if(t.includes('중국')) return 'zh-CN';
      if(t.includes('영어')) return 'en-US';
      if(t.toLowerCase().includes('thai')||t.includes('태국')) return 'th-TH';
      const sel=document.querySelector('select');
      const sv=sel?String(sel.value||sel.options[sel.selectedIndex]?.text||'').toLowerCase():'';
      if(sv.includes('thai')||sv.includes('태국')) return 'th-TH';
      if(sv.includes('japan')||sv.includes('일본')) return 'ja-JP';
      if(sv.includes('china')||sv.includes('중국')) return 'zh-CN';
      if(sv.includes('english')||sv.includes('영어')) return 'en-US';
    }catch(e){}
    return 'ko-KR';
  }
  function langCode(sr){
    if(sr.startsWith('ja')) return 'ja';
    if(sr.startsWith('zh')) return 'zh';
    if(sr.startsWith('en')) return 'en';
    if(sr.startsWith('th')) return 'th';
    return 'ko';
  }
  function box(label){
    try{
      const n=Array.from(document.querySelectorAll('b,strong,label,div')).find(x=>txt(x).trim()===label);
      return n?n.parentElement:null;
    }catch(e){return null;}
  }
  function setBox(label,val){
    try{
      const b=box(label); if(!b)return;
      const esc=String(val||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
      /* PATCH67_V2_SAFE_BOX_WRITE */ if(window.KRXA_SAFE_SET_HTML){ window.KRXA_SAFE_SET_HTML(b, '<b>'+label+'</b><br>'+esc); } else { b.innerHTML='<b>'+label+'</b><br>'+esc; }
    }catch(e){}
  }
  function status(s){
    try{
      const n=Array.from(document.querySelectorAll('p,div,span')).find(x=>{
        const t=txt(x); return t.includes('말하기 버튼')||t.includes('다음 말')||t.includes('듣는 중')||t.includes('기다립니다');
      });
      /* PATCH67_V2_SAFE_STATUS_WRITE */ if(n && (!window.KRXA_SAFE_SET_TEXT || window.KRXA_SAFE_SET_TEXT(n,s)===false)){ try{ if(n!==document.body) n.innerText=s; }catch(e){} }
    }catch(e){}
  }

  let rec=null, auto=false, listening=false, speaking=false;

  function speak(out,srLang){
    try{
      if(!out||!window.speechSynthesis){ if(auto)setTimeout(startListen,400); return; }
      speaking=true;
      const u=new SpeechSynthesisUtterance(out);
      u.lang=srLang||speechLang();
      u.onend=function(){ speaking=false; if(auto&&isAiOn())setTimeout(startListen,450); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }catch(e){ speaking=false; if(auto)setTimeout(startListen,500); }
  }
  async function send(text,srLang){
    setBox('원문',text);
    status('AI가 응답 중입니다');
    try{
      const lc=langCode(srLang);
      let data;
      const payload={sourceLang:lc,targetLang:lc};
      if(window.KRXA_AI_DIALOGUE&&window.KRXA_AI_DIALOGUE.call){
        data=await window.KRXA_AI_DIALOGUE.call(text,payload);
      }else{
        const res=await fetch('/api/travel-v1/ai-dialogue/turn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text,detected_lang:lc,source_lang:lc,target_lang:lc,call_phrase:'AI_DIALOGUE_FREE_SAME_LANGUAGE_V1',mode:'ai_dialogue_free_same_language'})});
        data=await res.json();
      }
      const out=data.reply||data.response||data.answer||data.text||data.translated||'';
      setBox('번역',out);
      status('다음 말을 자동으로 듣고 있습니다');
      speak(out,srLang);
    }catch(e){
      setBox('번역','AI대화 오류: '+e.message);
      status('AI대화 오류');
      if(auto)setTimeout(startListen,800);
    }
  }
  function makeRec(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return null;
    const r=new SR();
    r.continuous=false; r.interimResults=true; r.maxAlternatives=1; r.lang=speechLang();
    r.onstart=function(){listening=true; status('듣는 중입니다. 자유롭게 말하세요.');};
    r.onerror=function(){listening=false; if(auto&&!speaking)setTimeout(startListen,700);};
    r.onend=function(){listening=false; if(auto&&!speaking&&isAiOn())setTimeout(startListen,600);};
    r.onresult=function(ev){
      let f='',inter='';
      for(let i=ev.resultIndex;i<ev.results.length;i++){
        const tx=ev.results[i][0].transcript;
        if(ev.results[i].isFinal)f+=tx; else inter+=tx;
      }
      if(inter)setBox('원문',inter);
      if(f.trim()){try{r.stop();}catch(e){} send(f.trim(),r.lang);}
    };
    return r;
  }
  function startListen(){
    if(!auto||!isAiOn()||listening||speaking)return;
    if(!rec)rec=makeRec();
    if(!rec){status('이 브라우저는 자동 음성인식을 지원하지 않습니다'); return;}
    rec.lang=speechLang();
    try{rec.start();}catch(e){}
  }
  function startAuto(){
    if(!isAiOn())return false;
    auto=true;
    window.KRXA_AI_DIALOGUE_AUTO_LISTENING=true;
    status('듣는 중입니다. 자유롭게 말하세요.');
    startListen();
    return true;
  }
  function stopAuto(){
    auto=false;
    window.KRXA_AI_DIALOGUE_AUTO_LISTENING=false;
    try{if(rec)rec.stop();}catch(e){}
    status('AI대화 자동듣기 종료');
  }
  window.KRXA_AI_DIALOGUE_TRUE_AUTO={start:startAuto,stop:stopAuto,isOn:function(){return auto;}};

  document.addEventListener('click',function(e){
    try{
      if(!isAiOn())return;
      const t=txt(e.target), cls=String(e.target&&e.target.className||'');
      if(t.includes('말하기')||t.includes('🎙')||cls.includes('mic')||cls.includes('voice')){
        e.preventDefault(); e.stopPropagation();
        if(!auto)startAuto(); else stopAuto();
      }
    }catch(err){}
  },true);
  document.addEventListener('change',function(){
    setTimeout(function(){
      if(isAiOn()){
        window.KRXA_PAGE5_AI_DIALOGUE_ENABLED=true;
        window.KRXA_AI_DIALOGUE_ENABLED=true;
      }else{
        stopAuto();
      }
    },100);
  });
})();
/* PATCH65_AI_DIALOGUE_TRUE_AUTO_SAME_LANGUAGE_END */

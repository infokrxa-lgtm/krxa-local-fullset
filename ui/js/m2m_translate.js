/* m2m_translate.js - TRAVEL_V1_M2M_CONTROLLER_FULLFILES_V1
 * Translate engine only.
 * Controller decides AI vs Translate. This file does STT -> translate -> TTS.
 */
(function(){
  'use strict';
  if(window.KRXA_TRANSLATE_FULLFILES_V1_LOADED){ return; }
  window.KRXA_TRANSLATE_FULLFILES_V1_LOADED = true;

  var LANGS = [
    {code:'auto', label:'자동'},
    {code:'en', label:'영어'},
    {code:'ja', label:'일본어'},
    {code:'zh', label:'중국어'},
    {code:'vi', label:'베트남어'},
    {code:'th', label:'태국어'},
    {code:'fr', label:'프랑스어'},
    {code:'de', label:'독일어'},
    {code:'es', label:'스페인어'},
    {code:'ru', label:'러시아어'},
    {code:'ar', label:'아랍어'}
  ];

  var targetLanguage = 'en';
  var lastTTS = '';
  var recognition = null;
  var isRecording = false;

  function $(id){ return document.getElementById(id); }
  function text(el){ try{ return (el && (el.innerText || el.textContent || '')) || ''; }catch(e){ return ''; } }
  function esc(v){ return String(v||'').replace(/[<>&]/g,function(c){ return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c]; }); }

  function setStatus(msg){
    try{
      var nodes = Array.from(document.querySelectorAll('div,span,p,small'));
      var target = null;
      nodes.forEach(function(n){
        var t = text(n).trim();
        if(t.length < 160 && (t.indexOf('마이크')>=0 || t.indexOf('통역')>=0 || t.indexOf('AI대화')>=0 || t.indexOf('다음 말')>=0 || t.indexOf('응답')>=0)){
          if(!n.querySelector || n.querySelectorAll('button,input,select').length === 0) target = n;
        }
      });
      if(target) target.textContent = msg;
    }catch(e){}
  }

  function setBox(label, value){
    try{
      var ids = label === '원문' ? ['sourceText','srcText','inputText'] : ['targetText','translatedText','resultText'];
      for(var i=0;i<ids.length;i++){
        var el = $(ids[i]);
        if(el){ el.innerText = value || ''; return; }
      }
      var nodes = Array.from(document.querySelectorAll('b,strong,label,div,span'));
      var tag = nodes.find(function(x){ return text(x).trim() === label; });
      if(tag && tag.parentElement){ tag.parentElement.innerHTML = '<b>'+label+'</b><br>'+esc(value||'-'); }
    }catch(e){}
  }

  function setLang(value){
    targetLanguage = value || 'auto';
    try{
      document.querySelectorAll('.lang button').forEach(function(b){ b.classList.toggle('active', b.id === 'l_' + targetLanguage); });
    }catch(e){}
    updateOtherLanguageLabel();
    return targetLanguage;
  }

  function updateOtherLanguageLabel(){
    try{
      Array.from(document.querySelectorAll('select')).forEach(function(sel){
        var opt = sel.options[sel.selectedIndex];
        var name = opt ? (opt.text || opt.label || opt.value || '').trim() : '';
        if(!name || name.indexOf('기타') >= 0) return;
        var holder = document.getElementById('otherLangLabel');
        if(!holder){
          holder = document.createElement('div');
          holder.id = 'otherLangLabel';
          holder.style.cssText = 'font-size:12px;color:#2563eb;font-weight:800;margin-top:4px;';
          sel.parentElement.appendChild(holder);
        }
        holder.textContent = '선택 언어: ' + name;
        sel.setAttribute('data-selected-label', name);
      });
    }catch(e){}
  }

  function guessLangByText(v){
    var t = String(v||'');
    if(/[가-힣]/.test(t)) return 'ko';
    if(/[\u3040-\u30ff]/.test(t)) return 'ja';
    if(/[\u4e00-\u9fff]/.test(t)) return 'zh';
    if(/[a-zA-Z]/.test(t)) return 'en';
    return 'auto';
  }

  function resolveTarget(src){
    if(targetLanguage && targetLanguage !== 'auto') return targetLanguage;
    if(src === 'ko') return 'en';
    return 'ko';
  }

async function fetchFirst(urls, payload){
  var lastErr = null;

  var fd = new FormData();
  fd.append('text', payload.text || payload.message || '');
  fd.append('service', 'travel');
  fd.append('session_id', payload.session_id || '');
  fd.append('source', payload.source || 'voice');
  fd.append('device_locale', navigator.language || '');
  fd.append('location_text', '');
  fd.append('lat', '');
  fd.append('lng', '');
  fd.append('target_language', payload.target_language || payload.target_lang || 'auto');

  for(var i=0;i<urls.length;i++){
    try{
      var res = await fetch(urls[i], {method:'POST', body:fd});
      if(!res.ok){ lastErr = new Error('HTTP '+res.status+' '+urls[i]); continue; }
      var data = await res.json().catch(function(){ return {}; });
      data.__url = urls[i];
      return data;
    }catch(e){ lastErr = e; }
  }
  throw lastErr || new Error('No translate endpoint');
}

  async function translateText(input, source){
    var src = guessLangByText(input);
    var tgt = resolveTarget(src);
    var payload = {
      text:input,
      message:input,
      source:source || 'voice',
      source_lang:src,
      source_language:src,
      target_lang:tgt,
      target_language:tgt,
      mode:'translate',
      service:'travel_v1_m2m'
    };
 var data = await fetchFirst([
  '/api/translate'
], payload);

var out = data.translated_text || data.translation || data.output || data.reply || data.response || data.text || data.result || '';
return out || input;
    var out = data.translated_text || data.translation || data.output || data.reply || data.response || data.text || data.result || '';
    return out || input;
  }

  function ttsLang(){
    var t = targetLanguage || 'ko';
    if(t === 'zh') return 'zh-CN';
    if(t === 'ja') return 'ja-JP';
    if(t === 'en') return 'en-US';
    if(t === 'vi') return 'vi-VN';
    return 'ko-KR';
  }

  async function playTTS(v){
    lastTTS = v || '';
    if(!lastTTS) return;
    try{ if(window.KRXA_FLOW && window.KRXA_FLOW.unlockMobileTTS) window.KRXA_FLOW.unlockMobileTTS(); }catch(e){}
    try{
      if(window.KRXA_TTS && typeof window.KRXA_TTS.speak === 'function'){
        window.KRXA_TTS.speak(lastTTS,{lang:ttsLang(),source:'m2m_translate'});
        return;
      }
    }catch(e){}
    try{
      if(window.speechSynthesis){
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(lastTTS);
        u.lang = ttsLang();
        u.volume = 1; u.rate = 1; u.pitch = 1;
        window.speechSynthesis.speak(u);
      }
    }catch(e){}
  }

  function replayTTS(){ playTTS(lastTTS); }

  function browserSTT(callback){
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return false;
    try{
      recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'ko-KR';
      recognition.onstart = function(){ isRecording = true; setStatus('통역 듣는 중입니다'); };
      recognition.onerror = function(){ isRecording = false; setStatus('음성 인식 오류'); };
      recognition.onend = function(){ isRecording = false; };
      recognition.onresult = function(ev){
        var finalText = '';
        var interim = '';
        for(var i=ev.resultIndex;i<ev.results.length;i++){
          var tx = ev.results[i][0] && ev.results[i][0].transcript || '';
          if(ev.results[i].isFinal) finalText += tx; else interim += tx;
        }
        if(interim) setBox('원문', interim);
        if(finalText) callback(finalText);
      };
      recognition.start();
      return true;
    }catch(e){ isRecording=false; return false; }
  }

  async function handleInput(input, source){
    input = String(input||'').trim();
    if(!input){ setStatus('통역 입력이 없습니다'); return false; }
    setBox('원문', input);
    setStatus('통역 중입니다');
    try{
      var out = await translateText(input, source || 'voice');
      setBox('번역', out);
      setStatus('다음 말을 기다립니다');
      await playTTS(out);
      try{ if(window.KRXA_FLOW && window.KRXA_FLOW.forceReleaseUI) window.KRXA_FLOW.forceReleaseUI(); }catch(e){}
      return true;
    }catch(e){
      setBox('번역','통역 오류: '+(e && e.message ? e.message : e));
      setStatus('통역 오류');
      try{ if(window.KRXA_FLOW && window.KRXA_FLOW.forceReleaseUI) window.KRXA_FLOW.forceReleaseUI(); }catch(_e){}
      return false;
    }
  }

  function recordVoice(){
    if(isRecording) return false;
    var ok = browserSTT(function(finalText){ handleInput(finalText, 'voice'); });
    if(!ok){
      openQuickInput();
      setStatus('브라우저 음성인식 미지원 · 텍스트 입력으로 진행하세요');
    }
    return ok;
  }

  function requestMicAndStart(opt){
    opt = opt || {};
    var src = String(opt.source || '');
    var allowed = [
      'M2M_CONTROLLER_FULLFILES_V1_PAGE5_TRANSLATE',
      'M2M_CONTROLLER_FULLFILES_V1_MINI_TRANSLATE'
    ];
    var ok = opt.userTriggered === true && allowed.indexOf(src) >= 0;
    if(!ok){
      console.warn('[M2M_TRANSLATE_FULLFILES_V1] blocked non-controller translate request', src);
      return false;
    }
    return recordVoice();
  }

  function openQuickInput(){
    try{
      var html = ''+
        '<div style="display:flex;flex-direction:column;gap:8px">'+
        '<textarea id="quickM2MInput" style="width:100%;min-height:90px;border-radius:12px;padding:10px" placeholder="번역할 말을 입력하세요"></textarea>'+
        '<button type="button" class="btn green" style="width:100%" onclick="KRXA_Translate.sendQuickText()">보내기</button>'+
        '<button type="button" class="btn green" style="width:100%" data-flow="page5.m2m.speak">🎙 음성 입력</button>'+
        '</div>';
      if(window.KRXA_App && typeof window.KRXA_App.openModal === 'function'){
        window.KRXA_App.openModal('텍스트 입력', html);
        return true;
      }
    }catch(e){}
    var v = prompt('번역할 말을 입력하세요');
    if(v) handleInput(v,'text');
    return true;
  }

  function sendQuickText(){
    var el = document.getElementById('quickM2MInput');
    var v = el ? el.value : '';
    if(v) handleInput(v,'text');
    try{ if(window.KRXA_App && window.KRXA_App.closeModal) window.KRXA_App.closeModal(); }catch(e){}
  }

  function stopAuto(){
    try{ if(recognition) recognition.stop(); }catch(e){}
    try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(e){}
    isRecording = false;
    setStatus('종료되었습니다');
    try{ if(window.KRXA_FLOW && window.KRXA_FLOW.forceReleaseUI) window.KRXA_FLOW.forceReleaseUI(); }catch(e){}
    return true;
  }

  function toggleAuto(){
    try{
      var next = !(window.KRXA_PAGE5_AI_DIALOGUE_ENABLED === true);
      window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = next;
      if(window.KRXA_PAGE5_M2M_STATE_MACHINE && window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode){
        window.KRXA_PAGE5_M2M_STATE_MACHINE.setMode(next ? 'ai_dialogue' : 'translate');
      }
      return next;
    }catch(e){ return false; }
  }

  function init(){ updateOtherLanguageLabel(); }
  document.addEventListener('DOMContentLoaded', init);

  window.KRXA_Translate = {
    setLang:setLang,
    requestMicAndStart:requestMicAndStart,
    recordVoice:recordVoice,
    openQuickInput:openQuickInput,
    sendQuickText:sendQuickText,
    replayTTS:replayTTS,
    stopAuto:stopAuto,
    toggleAuto:toggleAuto,
    handleInput:handleInput,
    translateText:translateText,
    playTTS:playTTS
  };

  if(!window.recordVoice) window.recordVoice = recordVoice;
  if(!window.stopAuto) window.stopAuto = stopAuto;
  if(!window.toggleAuto) window.toggleAuto = toggleAuto;
})();

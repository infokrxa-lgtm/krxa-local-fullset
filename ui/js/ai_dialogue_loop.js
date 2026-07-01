/* ai_dialogue_loop.js - TRAVEL_V1_FULL_FLOW_STABLE_SET_V3B
 * 기존 파일 재작성.
 * 자동 실행 없음.
 * speakOnce()만 공개하고, flow_signal_router가 AI대화 모드에서만 호출.
 */
(function(){
  if(window.KRXA_AI_DIALOGUE_STABLE_V3B_LOADED){ return; }
  window.KRXA_AI_DIALOGUE_STABLE_V3B_LOADED=true;

  var ROUTE="/api/travel-v1/ai-dialogue/turn";
  var recognition=null;
  var listening=false;

  function text(el){ try{return (el&&(el.innerText||el.textContent||""))||"";}catch(e){return "";} }
  function esc(v){ return String(v||"").replace(/[<>&]/g,function(c){return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c];}); }

  function findBox(label){
    try{
      var nodes=Array.from(document.querySelectorAll("b,strong,label,div,span"));
      var n=nodes.find(function(x){return text(x).trim()===label;});
      if(!n){return null;}
      var p=n.parentElement;
      if(!p||p===document.body||p===document.documentElement){return null;}
      return p;
    }catch(e){}
    return null;
  }

  function setBox(label,value){
    var b=findBox(label);
    if(b){ b.innerHTML="<b>"+label+"</b><br>"+esc(value||"-"); }
  }

  function setStatus(msg){
    try{
      var nodes=Array.from(document.querySelectorAll("div,span,p,small"));
      var target=null;
      nodes.forEach(function(n){
        var t=text(n).trim();
        if(t.length<120 && (
          t.indexOf("다음 말")>=0 ||
          t.indexOf("말하기 버튼")>=0 ||
          t.indexOf("AI대화")>=0 ||
          t.indexOf("듣는")>=0 ||
          t.indexOf("음성")>=0 ||
          t.indexOf("통역")>=0
        )){
          if(!n.querySelector || n.querySelectorAll("button,input,select").length===0){ target=n; }
        }
      });
      if(target){ target.textContent=msg; }
    }catch(e){}
  }

  function speechLang(){
    try{
      var buttons=Array.from(document.querySelectorAll("button"));
      var active=buttons.find(function(b){
        var cls=String(b.className||"").toLowerCase();
        return cls.indexOf("active")>=0 || b.getAttribute("aria-pressed")==="true";
      });
      var t=text(active);
      if(t.indexOf("중국")>=0){return "zh-CN";}
      if(t.indexOf("일본")>=0){return "ja-JP";}
      if(t.indexOf("영어")>=0){return "en-US";}
    }catch(e){}
    return "ko-KR";
  }

  function langCode(sr){
    sr=String(sr||"ko-KR");
    if(sr.indexOf("zh")===0){return "zh";}
    if(sr.indexOf("ja")===0){return "ja";}
    if(sr.indexOf("en")===0){return "en";}
    return "ko";
  }

  async function callAi(inputText,srLang){
    var lc=langCode(srLang||speechLang());
    var payload={
      text:inputText||"",
      message:inputText||"",
      prompt:inputText||"",
      user_text:inputText||"",
      mode:"ai_dialogue",
      service:"travel_ai_dialogue",
      call_phrase:"KRXA_TRAVEL_AI_DIALOGUE_STABLE_V3B",
      source_lang:lc,
      target_lang:lc,
      detected_lang:lc,
      same_language_reply:true,
      translator_role:false,
      force_dialogue:true,
      allow_free_dialogue:true,
      context:{
        page:"travel_v1",
        engine:"ai_dialogue_loop_v3b",
        instruction:"Do not translate. Reply naturally in the same language as the user."
      }
    };

    var res=await fetch(ROUTE,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    var data={};
    try{data=await res.json();}catch(e){}
    var out=data.reply||data.response||data.answer||data.dialogue||data.text||data.result||"";
    data.reply=out;
    return data;
  }

  function speakTTS(out,lang){
    try{
      if(!out||!window.speechSynthesis){return;}
      var u=new SpeechSynthesisUtterance(out);
      u.lang=lang||speechLang();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }catch(e){}
  }

  async function handleText(inputText,srLang){
    inputText=String(inputText||"").trim();
    if(!inputText){setStatus("AI대화 입력이 없습니다");return false;}

    setBox("원문",inputText);
    setStatus("AI가 응답 중입니다");

    try{
      var data=await callAi(inputText,srLang||speechLang());
      var out=data.reply||"";
      if(!out){out="좋아요. 조금 더 자세히 말해 주세요.";}
      setBox("번역",out);
      setStatus("다음 말을 기다립니다");
      speakTTS(out,srLang||speechLang());
      return true;
    }catch(e){
      setBox("번역","AI대화 오류: "+(e&&e.message?e.message:e));
      setStatus("AI대화 오류");
      return false;
    }
  }

  function createRecognition(){
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){return null;}

    var r=new SR();
    r.continuous=false;
    r.interimResults=true;
    r.maxAlternatives=1;
    r.lang=speechLang();

    r.onstart=function(){listening=true;setStatus("AI대화 듣는 중입니다");};
    r.onerror=function(){listening=false;setStatus("AI대화 음성인식 오류");};
    r.onend=function(){listening=false;};
    r.onresult=function(ev){
      var finalText="";
      var interim="";
      for(var i=ev.resultIndex;i<ev.results.length;i++){
        var tx=ev.results[i][0]&&ev.results[i][0].transcript||"";
        if(ev.results[i].isFinal){finalText+=tx;}else{interim+=tx;}
      }
      if(interim){setBox("원문",interim);}
      if(finalText){handleText(finalText,r.lang);}
    };
    return r;
  }

  function speakOnce(opt){
    opt=opt||{};
    if(opt.userTriggered!==true){
      console.warn("[AI_DIALOGUE_V3B] blocked non-user-triggered speakOnce");
      return false;
    }
    if(listening){return false;}

    try{
      recognition=createRecognition();
      if(!recognition){
        setStatus("이 브라우저는 AI 음성인식을 지원하지 않습니다");
        return false;
      }
      recognition.lang=speechLang();
      recognition.start();
      return true;
    }catch(e){
      setStatus("AI대화 시작 오류");
      return false;
    }
  }

  function stop(){
    try{if(recognition){recognition.stop();}}catch(e){}
    listening=false;
    return true;
  }

  window.KRXA_AI_DIALOGUE={
    route:ROUTE,
    speakOnce:speakOnce,
    handleText:handleText,
    callAi:callAi,
    stop:stop,
    isListening:function(){return listening;}
  };
})();

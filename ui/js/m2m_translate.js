/* KRXA Travel V1 - M2M Translate Engine
   역할:
   - 말대말 통역 전용 프론트 엔진
   - STT / 번역 / TTS API 연결
   - 자동대화 ON/OFF
   - Flow Heart 상태 표시
   - 현재 페이지 유지형 Quick Input 지원
*/

(function () {
 let autoConversation = false;
let autoRunning = false;
let isTtsPlaying = false;
let isRecording = false;
let micPermissionReady = false;
let autoRestartTimer = null;
  let targetLanguage = localStorage.getItem("krxa_language_mode") || "auto";
  let lastAudioText = "";
  let sessionId =
    localStorage.getItem("krxa_session_id") ||
    "session-" + Math.random().toString(16).slice(2, 10);

  localStorage.setItem("krxa_session_id", sessionId);

const LANGS = [
  ["auto","자동"],["af","Afrikaans"],["sq","Albanian"],["am","Amharic"],["ar","Arabic"],["hy","Armenian"],
  ["az","Azerbaijani"],["eu","Basque"],["be","Belarusian"],["bn","Bengali"],["bs","Bosnian"],["bg","Bulgarian"],
  ["ca","Catalan"],["ceb","Cebuano"],["zh","Chinese"],["co","Corsican"],["hr","Croatian"],["cs","Czech"],
  ["da","Danish"],["nl","Dutch"],["en","English"],["eo","Esperanto"],["et","Estonian"],["fi","Finnish"],
  ["fr","French"],["fy","Frisian"],["gl","Galician"],["ka","Georgian"],["de","German"],["el","Greek"],
  ["gu","Gujarati"],["ht","Haitian Creole"],["ha","Hausa"],["haw","Hawaiian"],["he","Hebrew"],["hi","Hindi"],
  ["hmn","Hmong"],["hu","Hungarian"],["is","Icelandic"],["ig","Igbo"],["id","Indonesian"],["ga","Irish"],
  ["it","Italian"],["ja","Japanese"],["jv","Javanese"],["kn","Kannada"],["kk","Kazakh"],["km","Khmer"],
  ["ko","Korean"],["ku","Kurdish"],["ky","Kyrgyz"],["lo","Lao"],["la","Latin"],["lv","Latvian"],
  ["lt","Lithuanian"],["lb","Luxembourgish"],["mk","Macedonian"],["mg","Malagasy"],["ms","Malay"],
  ["ml","Malayalam"],["mt","Maltese"],["mi","Maori"],["mr","Marathi"],["mn","Mongolian"],["my","Myanmar"],
  ["ne","Nepali"],["no","Norwegian"],["ny","Nyanja"],["or","Odia"],["ps","Pashto"],["fa","Persian"],
  ["pl","Polish"],["pt","Portuguese"],["pa","Punjabi"],["ro","Romanian"],["ru","Russian"],["sm","Samoan"],
  ["gd","Scots Gaelic"],["sr","Serbian"],["st","Sesotho"],["sn","Shona"],["sd","Sindhi"],["si","Sinhala"],
  ["sk","Slovak"],["sl","Slovenian"],["so","Somali"],["es","Spanish"],["su","Sundanese"],["sw","Swahili"],
  ["sv","Swedish"],["tg","Tajik"],["ta","Tamil"],["te","Telugu"],["th","Thai"],["tr","Turkish"],
  ["uk","Ukrainian"],["ur","Urdu"],["ug","Uyghur"],["uz","Uzbek"],["vi","Vietnamese"],["cy","Welsh"],
  ["xh","Xhosa"],["yi","Yiddish"],["yo","Yoruba"],["zu","Zulu"]
];

  function setFlowState(state, message) {
    const dot = document.getElementById("flowDot");
    if (dot) dot.className = "flowDot " + (state || "");

    const flow = document.getElementById("flow");
    if (flow && message) flow.innerText = message;
  }

  function setStatus(text) {
    const el = document.getElementById("status");
    if (el) el.innerText = text;
  }

  function setLang(value) {
    if (!value) return;

    targetLanguage = value;
    localStorage.setItem("krxa_language_mode", value);

    document.querySelectorAll(".lang button").forEach(function (b) {
      b.classList.remove("active");
    });

    const active = document.getElementById("l_" + value);
    if (active) active.classList.add("active");
  }

  function initLanguages() {
    const select = document.getElementById("langMore");
    if (!select) return;

    const exists = select.options.length > 1;
    if (exists) return;

    LANGS.forEach(function (item) {
      if (item[0] === "auto" || item[0] === "en" || item[0] === "ja" || item[0] === "zh") {
        return;
      }

      const opt = document.createElement("option");
      opt.value = item[0];
      opt.textContent = item[1];
      select.appendChild(opt);
    });

    setLang(targetLanguage);
  }

function toggleAuto() {
  autoConversation = !autoConversation;

  const toggle = document.getElementById("autoToggle");
  if (toggle) {
    toggle.className = "toggle" + (autoConversation ? " on" : "");
  }

  if (autoConversation) {
    autoRunning = true;
    setFlowState("", "자동대화 ON");
    setStatus("자동대화 준비 중...");

    clearTimeout(autoRestartTimer);
    autoRestartTimer = setTimeout(function () {
      recordVoice();
    }, 700);
  } else {
    stopAuto();
  }
}
  function stopAuto() {
  autoConversation = false;
  autoRunning = false;
  isRecording = false;

  clearTimeout(autoRestartTimer);

  const toggle = document.getElementById("autoToggle");
  if (toggle) {
    toggle.className = "toggle";
  }

  setStatus("대기 중");
  setFlowState("", "자동대화 종료");
}

  function getDeviceContext() {
    if (window.KRXA_DeviceContext && window.KRXA_DeviceContext.get) {
      return window.KRXA_DeviceContext.get();
    }

    return {
      locale: navigator.language || "",
      lat: "",
      lng: "",
      gpsReady: false
    };
  }

  async function translateText(text, source) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;

    const sourceEl = document.getElementById("sourceText");
    const resultEl = document.getElementById("resultText");

    if (sourceEl) sourceEl.innerText = cleanText;

    setStatus("통역 처리 중...");
    setFlowState("translate", "번역 중");

    const ctx = getDeviceContext();

    const fd = new FormData();
    fd.append("text", cleanText);
    fd.append("service", "travel");
    fd.append("session_id", sessionId);
    fd.append("source", source || "text");
    fd.append("target_language", targetLanguage);
    fd.append("lat", ctx.lat || "");
    fd.append("lng", ctx.lng || "");
    fd.append("device_locale", ctx.locale || navigator.language || "");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        body: fd
      });

      const data = await res.json();

      const result = data.result || data.text || "";

      if (resultEl) resultEl.innerText = result || "-";

      lastAudioText = result;

      setStatus("통역 완료");
      setFlowState("speak", "음성 출력 중");

      await playTTS(result);

      setFlowState("", "대기 중");

if (autoConversation && autoRunning) {
  clearTimeout(autoRestartTimer);
  autoRestartTimer = setTimeout(function () {
    if (autoConversation && autoRunning && !isTtsPlaying && !isRecording) {
      recordVoice();
    }
  }, 1200);
}
    } catch (e) {
      setStatus("통역 연결 오류");
      setFlowState("error", "API 연결 확인 필요");

      if (resultEl) {
        resultEl.innerText = "통역 API 연결 오류: " + e.message;
      }
    }
  }

async function playTTS(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return;

  isTtsPlaying = true;

  try {
    const fd = new FormData();
    fd.append("text", cleanText);
    fd.append("session_id", sessionId);

    const res = await fetch("/api/tts", {
      method: "POST",
      body: fd
    });

    const blob = await res.blob();

    if (blob.size > 100) {
      const audio = new Audio(URL.createObjectURL(blob));

      await new Promise(function (resolve) {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
    }
  } catch (e) {
    // TTS 실패해도 화면 번역은 유지
  } finally {
    isTtsPlaying = false;
  }
}

  function replayTTS() {
    playTTS(lastAudioText);
  }

async function recordVoice() {
    if (isRecording || isTtsPlaying) {
      if (autoConversation && autoRunning) {
        clearTimeout(autoRestartTimer);
        autoRestartTimer = setTimeout(function () {
          recordVoice();
        }, 900);
      }
      return;
    }

    isRecording = true;
    autoRunning = true;

    setStatus("말씀하세요");
    setFlowState("listen", "듣는 중");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      let speechStarted = false;
      let lastVoiceTime = Date.now();
      let startedAt = Date.now();

      recorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        try { audioContext.close(); } catch (e) {}
isRecording = false;

        const blob = new Blob(chunks, { type: "audio/webm" });
        const ctx = getDeviceContext();

        setStatus("음성 인식 중...");
        setFlowState("translate", "STT 처리 중");

        const fd = new FormData();
        fd.append("file", blob, "voice.webm");
        fd.append("session_id", sessionId);
        fd.append("duration", String(Math.round((Date.now() - startedAt) / 1000)));
        fd.append("user_language_mode", "auto");
        fd.append("target_language", targetLanguage);
        fd.append("lat", ctx.lat || "");
        fd.append("lng", ctx.lng || "");
        fd.append("device_locale", ctx.locale || navigator.language || "");

        try {
          const res = await fetch("/api/stt", {
            method: "POST",
            body: fd
          });

          const data = await res.json();

          if (data.ok && data.text) {
            await translateText(data.text, "voice");
          } else {
            setStatus("음성 인식 실패");
            setFlowState("error", "다시 말해주세요");

            if (autoConversation && autoRunning) {
              setTimeout(recordVoice, 1000);
            }
          }
        } catch (e) {
          setStatus("STT 연결 오류");
          setFlowState("error", "STT API 확인 필요");
        }
      };

      recorder.start(250);

      function detect() {
        analyser.getByteTimeDomainData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += Math.abs(data[i] - 128);
        }

        const volume = sum / data.length;
        const now = Date.now();

       if (volume > 24) {
          speechStarted = true;
          lastVoiceTime = now;
        }

        if (
          speechStarted &&
          now - startedAt > 900 &&
          now - lastVoiceTime > 1300
        ) {
          if (recorder.state !== "inactive") recorder.stop();
          return;
        }

        if (recorder.state !== "inactive") {
          requestAnimationFrame(detect);
        }
      }

      detect();
    } catch (e) {
      setStatus("마이크 권한 필요");
      setFlowState("error", "마이크 오류");
    }
  }

  function openQuickInput() {
  const text = prompt("통역할 내용을 입력하세요.");
  if (text && text.trim()) {
    translateText(text.trim(), "quick_text");
  }
}

    window.KRXA_App.openModal(
      "말하기 / 텍스트 입력",
      "<textarea id='quickTranslateText' placeholder='통역할 내용을 입력하세요'></textarea>" +
      "<button class='btn blue' style='width:100%;margin-top:6px' onclick='KRXA_Translate.sendQuickText()'>전송</button>" +
      "<button class='btn green' style='width:100%;margin-top:6px' onclick='KRXA_Translate.recordVoice()'>🎙 음성 입력</button>"
    );
  }

  function sendQuickText() {
    const el = document.getElementById("quickTranslateText");
    const text = el ? el.value : "";
    translateText(text, "quick_text");
  }

  function init() {
    initLanguages();
    setFlowState("", "마이크를 누르면 통역을 시작합니다");
  }

  window.KRXA_Translate = {
    init: init,
    setLang: setLang,
    toggleAuto: toggleAuto,
    stopAuto: stopAuto,
    recordVoice: recordVoice,
    translateText: translateText,
    playTTS: playTTS,
    replayTTS: replayTTS,
    openQuickInput: openQuickInput,
    sendQuickText: sendQuickText
  };
})();
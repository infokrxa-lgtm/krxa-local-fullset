/* KRXA Travel V1 - M2M Translate Engine */

(function () {
  let autoConversation = false;
  let autoRunning = false;
  let isTtsPlaying = false;
  let isRecording = false;
// KRXA Truth First Mode
const TRUTH_MODE = true;

// 최소 음성 길이
const MIN_STT_LENGTH = 2;

// STT 결과 없으면 번역 금지
const BLOCK_EMPTY_TRANSLATION = true;

// 이전 문장 재사용 금지
const BLOCK_PREVIOUS_TEXT_REUSE = true;

let lastSttText = "";
  let autoRestartTimer = null;
let micStream = null;
let micReady = false;

let currentListenMode = localStorage.getItem("krxa_listen_mode") || "conversation";

const LISTEN_PRESETS = {
  conversation: {
    name: "대화 모드",
    volumeThreshold: 20,
    minSpeechMs: 700,
    endSilenceMs: 1200,
    maxSilenceMs: 5000,
    minBlobSize: 900,
    blockBackgroundCaption: true
  },
  restaurant: {
    name: "식당 모드",
    volumeThreshold: 20,
    minSpeechMs: 800,
    endSilenceMs: 1500,
    maxSilenceMs: 7000,
    minBlobSize: 900,
    blockBackgroundCaption: true
  },
  call: {
    name: "통화 모드",
    volumeThreshold: 18,
    minSpeechMs: 900,
    endSilenceMs: 1600,
    maxSilenceMs: 8000,
    minBlobSize: 1000,
    blockBackgroundCaption: false
  },

function getListenPreset() {
  return LISTEN_PRESETS[currentListenMode] || LISTEN_PRESETS.conversation;
}

function setListenMode(mode) {
  currentListenMode = mode || "conversation";
  localStorage.setItem("krxa_listen_mode", currentListenMode);
  const preset = getListenPreset();
  setStatus(preset.name);
  setFlowState("", preset.name + " 적용");
}


  let targetLanguage = localStorage.getItem("krxa_language_mode") || "auto";
  let lastAudioText = "";
  let sessionId = localStorage.getItem("krxa_session_id") || "session-" + Math.random().toString(16).slice(2, 10);
  localStorage.setItem("krxa_session_id", sessionId);

  const LANGS = [
    ["auto","자동"],["en","English"],["ja","Japanese"],["zh","Chinese"],["ko","Korean"],
    ["es","Spanish"],["fr","French"],["de","German"],["it","Italian"],["pt","Portuguese"],
    ["ru","Russian"],["vi","Vietnamese"],["th","Thai"],["id","Indonesian"],["ms","Malay"],
    ["ar","Arabic"],["hi","Hindi"],["bn","Bengali"],["tr","Turkish"],["nl","Dutch"],
    ["sv","Swedish"],["pl","Polish"],["uk","Ukrainian"],["fa","Persian"],["he","Hebrew"],
    ["el","Greek"],["cs","Czech"],["da","Danish"],["fi","Finnish"],["no","Norwegian"]
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

    while (select.options.length > 1) select.remove(1);

    LANGS.forEach(function (item) {
      if (item[0] === "auto" || item[0] === "en" || item[0] === "ja" || item[0] === "zh") return;
      const opt = document.createElement("option");
      opt.value = item[0];
      opt.textContent = item[1];
      select.appendChild(opt);
    });

    setLang(targetLanguage);
  }

  function getDeviceContext() {
    if (window.KRXA_DeviceContext && window.KRXA_DeviceContext.get) {
      return window.KRXA_DeviceContext.get();
    }
    return { locale: navigator.language || "", lat: "", lng: "" };
  }

  function toggleAuto() {
    autoConversation = !autoConversation;
    const toggle = document.getElementById("autoToggle");
    if (toggle) toggle.className = "toggle" + (autoConversation ? " on" : "");

    if (autoConversation) {
      autoRunning = true;
      setStatus("자동대화 준비 중...");
      setFlowState("", "자동대화 ON");
      clearTimeout(autoRestartTimer);
setStatus("자동대화 준비 완료 - 말하기를 눌러 시작");
setFlowState("", "말하기 버튼 대기");
    } else {
      stopAuto();
    }
  }
  async function saveMemoryEvent(type, status, input, output, message) {
    try {
      await fetch("/api/krxai-memory/event", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          type: type || "unknown",
          source: "m2m_translate",
          status: status || "",
          input: input || "",
          output: output || "",
          message: message || ""
        })
      });
    } catch (e) {
      // 기억 저장 실패는 통역 흐름을 막지 않는다.
    }
  }
  async function acquireMic() {
    if (micStream) {
      micReady = true;
      return micStream;
    }

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    micReady = true;
    return micStream;
  }

  function releaseMic() {
    if (micStream) {
      micStream.getTracks().forEach(function (t) {
        t.stop();
      });
    }

    micStream = null;
    micReady = false;
  }
  function stopAuto() {
    autoConversation = false;
    autoRunning = false;
    isRecording = false;
    clearTimeout(autoRestartTimer);
releaseMic();
    const toggle = document.getElementById("autoToggle");
    if (toggle) toggle.className = "toggle";

    saveMemoryEvent("user_stop", "ok", "", "", "사용자 종료");
    setStatus("대기 중");
    setFlowState("", "자동대화 종료");
  }
function isLikelyBackgroundCaption(text) {
  const t = String(text || "").trim();

  if (!t) return true;

  const blocked = [
    "시청해 주셔서 감사합니다",
    "시청해주셔서 감사합니다",
    "구독",
    "좋아요",
    "알림 설정",
    "유료광고",
    "광고를 포함",
    "이 영상",
    "자막",
    "다음 영상",
    "thank you for watching",
    "subscribe",
    "like and subscribe"
  ];

  return blocked.some(function (x) {
    return t.toLowerCase().includes(x.toLowerCase());
  });
}
async function translateText(text, source) {

    const cleanText = String(text || "").trim();

    if (!cleanText) return;

    // ===== KRXA Truth First Mode =====
    if (TRUTH_MODE) {
      if (cleanText === "-") {
        setStatus("원문 없음");
        return;
      }
    }

    // ===== End Truth Mode =====

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
fd.append("source_language", "auto");
    fd.append("target_language", targetLanguage);
    fd.append("lat", ctx.lat || "");
    fd.append("lng", ctx.lng || "");
    fd.append("device_locale", ctx.locale || navigator.language || "");

    try {
      const res = await fetch("/api/translate", { method: "POST", body: fd });
      const data = await res.json();
      const result = data.result || data.text || "";

      if (resultEl) resultEl.innerText = result || "-";
      lastAudioText = result;
      saveMemoryEvent("translate_success", "ok", cleanText, result, "번역 성공");

      setStatus("통역 완료");
      setFlowState("speak", "음성 출력 중");

      await playTTS(result);

      setFlowState("", "대기 중");

      if (autoConversation && autoRunning) {
        clearTimeout(autoRestartTimer);
        autoRestartTimer = setTimeout(function () {
          if (autoConversation && autoRunning && !isTtsPlaying && !isRecording) recordVoice();
        }, 1200);
      }
    } catch (e) {
      saveMemoryEvent("translate_error", "error", cleanText, "", e.message);
      setStatus("통역 연결 오류");
      setFlowState("error", "API 확인 필요");
      if (resultEl) resultEl.innerText = "통역 API 오류: " + e.message;
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

      const res = await fetch("/api/tts", { method: "POST", body: fd });
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
    } finally {
      isTtsPlaying = false;
    }
  }

  function replayTTS() {
    playTTS(lastAudioText);
  }
function shouldSendToSTT(blob, meta) {
  if (!blob || blob.size < 900) {
    return {
      ok: false,
      reason: "음성 데이터가 너무 짧음"
    };
  }

  if (!meta || !meta.speechStarted) {
    return {
      ok: false,
      reason: "발화 시작 감지 안됨"
    };
  }

  if (meta.durationMs < 800) {
    return {
      ok: false,
      reason: "발화 시간이 너무 짧음"
    };
  }

  return {
    ok: true,
    reason: "STT 전송 가능"
  };
}
  async function recordVoice() {
    if (isRecording || isTtsPlaying) {
      if (autoConversation && autoRunning) {
        clearTimeout(autoRestartTimer);
        autoRestartTimer = setTimeout(recordVoice, 900);
      }
      return;
    }

    isRecording = true;
    autoRunning = true;

    setStatus("말씀하세요");
    setFlowState("listen", "듣는 중");

    let stream = null;
    let audioContext = null;

    try {
stream = await acquireMic();

      audioContext = new AudioContext();
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
      let stopped = false;

      function safeStop() {
        if (stopped) return;
        stopped = true;
        if (recorder.state !== "inactive") recorder.stop();
      }

      recorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async function () {
       try {
  if (audioContext && audioContext.state !== "closed") {
    audioContext.close();
  }
} catch (e) {}

        isRecording = false;

        const blob = new Blob(chunks, { type: "audio/webm" });
        const ctx = getDeviceContext();

        const preset = getListenPreset();

if (!blob || blob.size < preset.minBlobSize) {
  saveMemoryEvent("pre_stt_hold", "hold", "", "", "음성 없음 또는 blob 부족: " + (blob ? blob.size : 0));
  setStatus("음성 없음");
          setFlowState("", "다시 말씀해주세요");
          if (autoConversation && autoRunning) {
            clearTimeout(autoRestartTimer);
            autoRestartTimer = setTimeout(recordVoice, 1200);
          }
          return;
        }
const gate = shouldSendToSTT(blob, {
  speechStarted: speechStarted,
  durationMs: Date.now() - startedAt
});

if (!gate.ok) {
  setStatus("STT 전 보류");
  setFlowState("", gate.reason);

  if (autoConversation && autoRunning) {
    clearTimeout(autoRestartTimer);
    autoRestartTimer = setTimeout(recordVoice, 1200);
  }

  return;
}
        setStatus("음성 인식 중...");
        setFlowState("translate", "STT 처리 중");

        const fd = new FormData();
        fd.append("file", blob, "voice.webm");
        fd.append("session_id", sessionId);
        fd.append("duration", String(Math.round((Date.now() - startedAt) / 1000)));
        fd.append("user_language_mode", "auto");
fd.append("source_language", "auto");
        fd.append("target_language", targetLanguage);
        fd.append("lat", ctx.lat || "");
        fd.append("lng", ctx.lng || "");
        fd.append("device_locale", ctx.locale || navigator.language || "");

        try {
          const res = await fetch("/api/stt", { method: "POST", body: fd });
          const sttData = await res.json();

       if (sttData.ok && sttData.text) {

    const currentText = String(sttData.text).trim();

    // Truth First Filter
if (!currentText || currentText === "-") {
  setStatus("음성 없음");
  setFlowState("error", "인식 문장 없음");

  if (autoConversation && autoRunning) {
    clearTimeout(autoRestartTimer);
    autoRestartTimer = setTimeout(recordVoice, 1200);
  }

  return;
}
if (autoConversation && getListenPreset().blockBackgroundCaption && isLikelyBackgroundCaption(currentText)) {
  setStatus("배경음 차단");
  setFlowState("error", "사용자 발화 아님");

  if (autoConversation && autoRunning) {
    clearTimeout(autoRestartTimer);
    autoRestartTimer = setTimeout(recordVoice, 1200);
  }

  return;
}
lastSttText = currentText;
saveMemoryEvent("stt_success", "ok", currentText, "", "STT 성공");
await translateText(currentText, "voice");
} else {
            saveMemoryEvent("stt_fail", "fail", "", "", "음성 인식 실패");
            setStatus("음성 인식 실패");
            setFlowState("error", "다시 말해주세요");
            if (autoConversation && autoRunning) {
              clearTimeout(autoRestartTimer);
              autoRestartTimer = setTimeout(recordVoice, 1200);
            }
          }
        } catch (e) {
          saveMemoryEvent("stt_error", "error", "", "", e.message);
          setStatus("STT 연결 오류");
          setFlowState("error", "STT API 확인 필요");
        }
      };

      recorder.start(250);

      function detect() {
        analyser.getByteTimeDomainData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);

        const volume = sum / data.length;
        const now = Date.now();

        if (volume > preset.volumeThreshold) {
          speechStarted = true;
          lastVoiceTime = now;
        }

        if (speechStarted && now - startedAt > preset.minSpeechMs && now - lastVoiceTime > preset.endSilenceMs) {
          safeStop();
          return;
        }

        if (!speechStarted && now - startedAt > preset.maxSilenceMs) {
          safeStop();
          return;
        }

        if (recorder.state !== "inactive") requestAnimationFrame(detect);
      }

      detect();
    } catch (e) {
isRecording = false;
// if (stream) stream.getTracks().forEach(function (t) { t.stop(); });

try {
  if (audioContext && audioContext.state !== "closed") {
    audioContext.close();
  }
} catch (err) {}

setStatus("마이크 권한 필요");
setFlowState("error", "마이크 오류");
    }
  }

   function openQuickInput() {
    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal(
        "말하기 / 텍스트 입력",
        "<textarea id='quickTranslateText' placeholder='통역할 내용을 입력하세요'></textarea>" +
        "<button class='btn blue' style='width:100%;margin-top:6px' onclick='KRXA_Translate.sendQuickText()'>전송</button>" +
        "<button class='btn green' style='width:100%;margin-top:6px' onclick='KRXA_Translate.recordVoice()'>🎙 음성 입력</button>"
      );
      return;
    }

    const text = prompt("통역할 내용을 입력하세요.");
    if (text && text.trim()) translateText(text.trim(), "quick_text");
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
  function requestMicAndStart() {
    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal(
        "마이크 사용 안내",
        "<p>통역을 시작하려면 마이크 권한이 필요합니다.</p>" +
        "<button class='btn green' style='width:100%;margin-top:8px' onclick='window.krxaMicStart();KRXA_App.closeModal()'>🎙 마이크 허용하고 시작</button>"
      );
      return;
    }

    recordVoice();
  }
 window.krxaMicStart = function () {
  if (window.KRXA_App && window.KRXA_App.closeModal) {
    window.KRXA_App.closeModal();
  }
  recordVoice();
};
// =====================================================
// KRXA MIC GLOBAL INIT
// recognition is not defined 오류 방지
// =====================================================

let recognition = null;

function createKRXARecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용하세요.");
    return null;
  }

  const rec = new SpeechRecognition();
  rec.lang = "ko-KR";
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  return rec;
}
  window.KRXA_Translate = {
    init: init,
    setLang: setLang,
    toggleAuto: toggleAuto,
    stopAuto: stopAuto,
    recordVoice: recordVoice,
    requestMicAndStart: requestMicAndStart,
    translateText: translateText,
    playTTS: playTTS,
    replayTTS: replayTTS,
    openQuickInput: openQuickInput,
    sendQuickText: sendQuickText,
    setListenMode: setListenMode,
    getListenPreset: getListenPreset
  };
})();

// KRXA MIC GLOBAL EXPORT
window.createKRXARecognition = createKRXARecognition;

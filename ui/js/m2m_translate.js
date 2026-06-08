/* KRXA Travel V1 - M2M Translate Engine FINAL
   사람처럼 자연스러운 말대말 대화 전용
   TV시청은 여기서 처리하지 않음: 2페이지 TV 클릭 → 별도 새창 구조
*/

(function () {
  let autoConversation = false;
  let autoRunning = false;
  let isTtsPlaying = false;
  let isRecording = false;
  let autoRestartTimer = null;

  let micStream = null;
  let targetLanguage = localStorage.getItem("krxa_language_mode") || "auto";
  let lastAudioText = "";

  const sessionId =
    localStorage.getItem("krxa_session_id") ||
    "session-" + Math.random().toString(16).slice(2, 10);

  localStorage.setItem("krxa_session_id", sessionId);

  const LISTEN_PRESETS = {
    conversation: {
      name: "대화 모드",
      volumeThreshold: 6,
      minSpeechMs: 200,
      endSilenceMs: 420,
      maxSilenceMs: 1400,
      minBlobSize: 220,
      blockBackgroundCaption: true
    },
    restaurant: {
      name: "식당 모드",
      volumeThreshold: 6,
      minSpeechMs: 200,
      endSilenceMs: 420,
      maxSilenceMs: 1400,
      minBlobSize: 220,
      blockBackgroundCaption: true
    },
    call: {
      name: "통화 모드",
      volumeThreshold: 6,
      minSpeechMs: 200,
      endSilenceMs: 420,
      maxSilenceMs: 1400,
      minBlobSize: 220,
      blockBackgroundCaption: false
    }
  };

  let currentListenMode =
    localStorage.getItem("krxa_listen_mode") || "conversation";

  const LANGS = [
    ["auto", "자동"],
    ["en", "English"],
    ["ja", "Japanese"],
    ["zh", "Chinese"],
    ["ko", "Korean"],
    ["es", "Spanish"],
    ["fr", "French"],
    ["de", "German"],
    ["it", "Italian"],
    ["pt", "Portuguese"],
    ["ru", "Russian"],
    ["vi", "Vietnamese"],
    ["th", "Thai"],
    ["id", "Indonesian"],
    ["ms", "Malay"],
    ["ar", "Arabic"],
    ["hi", "Hindi"],
    ["bn", "Bengali"],
    ["tr", "Turkish"],
    ["nl", "Dutch"],
    ["sv", "Swedish"],
    ["pl", "Polish"],
    ["uk", "Ukrainian"],
    ["fa", "Persian"],
    ["he", "Hebrew"],
    ["el", "Greek"],
    ["cs", "Czech"],
    ["da", "Danish"],
    ["fi", "Finnish"],
    ["no", "Norwegian"]
  ];

  function getListenPreset() {
    return LISTEN_PRESETS[currentListenMode] || LISTEN_PRESETS.conversation;
  }

  function setListenMode(mode) {
    if (!LISTEN_PRESETS[mode]) mode = "conversation";

    currentListenMode = mode;
    localStorage.setItem("krxa_listen_mode", currentListenMode);

    const preset = getListenPreset();
    setStatus(preset.name);
    setFlowState("", preset.name + " 적용");
  }

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

    const more = document.getElementById("langMore");
    if (
      more &&
      value !== "auto" &&
      value !== "en" &&
      value !== "ja" &&
      value !== "zh"
    ) {
      more.value = value;
    }
  }

  function initLanguages() {
    const select = document.getElementById("langMore");
    if (!select) return;

    while (select.options.length > 1) select.remove(1);

    LANGS.forEach(function (item) {
      if (
        item[0] === "auto" ||
        item[0] === "en" ||
        item[0] === "ja" ||
        item[0] === "zh"
      ) {
        return;
      }

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

    return {
      locale: navigator.language || "",
      lat: "",
      lng: "",
      gpsReady: false
    };
  }

  function guessLangByText(text) {
    const t = String(text || "");

    if (/[가-힣]/.test(t)) return "ko";
    if (/[\u4e00-\u9fff]/.test(t)) return "zh";
    if (/[\u3040-\u30ff]/.test(t)) return "ja";
    if (/[a-zA-Z]/.test(t)) return "en";

    return "auto";
  }

  function resolveTargetLanguageByText(text) {
    const src = guessLangByText(text);

    if (targetLanguage === "zh") return src === "zh" ? "ko" : "zh";
    if (targetLanguage === "ja") return src === "ja" ? "ko" : "ja";
    if (targetLanguage === "en") return src === "en" ? "ko" : "en";

    return targetLanguage;
  }
  async function saveMemoryEvent(type, status, input, output, message) {
    try {
      await fetch("/api/krxai-memory/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type || "unknown",
          source: "m2m_translate",
          status: status || "",
          input: input || "",
          output: output || "",
          message: message || ""
        })
      });
    } catch (e) {}
  }

  async function acquireMic() {
    if (micStream) return micStream;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("이 브라우저는 마이크를 지원하지 않습니다.");
    }

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    return micStream;
  }

  function releaseMic() {
    if (micStream) {
      micStream.getTracks().forEach(function (track) {
        try {
          track.stop();
        } catch (e) {}
      });
    }
    micStream = null;
  }

  function toggleAuto() {
    autoConversation = !autoConversation;

    const toggle = document.getElementById("autoToggle");
    if (toggle) toggle.className = "toggle" + (autoConversation ? " on" : "");

    if (autoConversation) {
  autoRunning = true;
  acquireMic().catch(function () {});
      clearTimeout(autoRestartTimer);
      setStatus("자동대화 준비 완료");
      setFlowState("", "말하기 버튼을 눌러 시작하세요");
      saveMemoryEvent("auto_on", "ok", "", "", "자동대화 ON");
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
    if (toggle) toggle.className = "toggle";

    saveMemoryEvent("user_stop", "ok", "", "", "사용자 종료");
    setStatus("대기 중");
    setFlowState("", "자동대화 종료");
  }

  function isLikelyBackgroundCaption(text) {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return true;

    const blocked = [
      "시청해 주셔서 감사합니다",
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
      return t.includes(x.toLowerCase());
    });
  }

function shouldSendToSTT(blob, meta) {
  const preset = getListenPreset();
  const size = blob ? blob.size : 0;
  const duration = meta ? meta.durationMs : 0;

  if (!blob || size < preset.minBlobSize) {
    return {
      ok: false,
      reason: "음성 데이터가 너무 짧음"
    };
  }

  if (!meta || !meta.speechStarted) {
    if (size >= preset.minBlobSize * 2 && duration >= 600) {
      return {
        ok: true,
        reason: "약한 발화 STT 전송"
      };
    }

    return {
      ok: false,
      reason: "발화 시작 감지 안됨"
    };
  }

  if (duration < 500) {
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

  async function translateText(text, source) {
    const cleanText = String(text || "").trim();
    if (!cleanText || cleanText === "-") {
      setStatus("원문 없음");
      return;
    }

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
    fd.append("target_language", resolveTargetLanguageByText(cleanText));
    fd.append("lat", ctx.lat || "");
    fd.append("lng", ctx.lng || "");
    fd.append("device_locale", ctx.locale || navigator.language || "");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        body: fd
      });

      const raw = await res.text();

let data = null;
try {
  data = JSON.parse(raw);
} catch (jsonErr) {
  throw new Error(
    "번역 API가 JSON이 아닌 응답을 반환했습니다: " +
    raw.slice(0, 80)
  );
}
      const result = data.result || data.text || "";

      if (resultEl) resultEl.innerText = result || "-";

      lastAudioText = result;

      saveMemoryEvent("translate_success", "ok", cleanText, result, "번역 성공");

      setStatus("통역 완료");
      setFlowState("speak", "음성 출력 중");

      await playTTS(result);

      setFlowState("", "다음 말을 기다립니다");
      setStatus(autoConversation ? "자동대화 대기 중" : "대기 중");

      if (autoConversation && autoRunning) {
        clearTimeout(autoRestartTimer);
        autoRestartTimer = setTimeout(function () {
          if (!isTtsPlaying && !isRecording) recordVoice();
        }, 400);
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
    } finally {
      isTtsPlaying = false;
    }
  }

  function replayTTS() {
    playTTS(lastAudioText);
  }

    async function recordVoice() {
    saveMemoryEvent(
      "record_voice_called",
      "debug",
      "",
      "",
      "autoConversation=" + autoConversation + ", autoRunning=" + autoRunning
    );

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

      const preset = getListenPreset();

      let speechStarted = false;
      let lastVoiceTime = Date.now();
      let startedAt = Date.now();
      let stopped = false;

      function safeStop() {
        if (stopped) return;
        stopped = true;

        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      }

      recorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async function () {
        try {
          if (audioContext && audioContext.state !== "closed") {
            await audioContext.close();
          }
        } catch (e) {}

        isRecording = false;

        const blob = new Blob(chunks, { type: "audio/webm" });
        const durationMs = Date.now() - startedAt;

        const gate = shouldSendToSTT(blob, {
          speechStarted: speechStarted,
          durationMs: durationMs
        });

        if (!gate.ok) {
          saveMemoryEvent("pre_stt_hold", "hold", "", "", gate.reason);
          setStatus("STT 전 보류");
          setFlowState("", gate.reason);

          if (autoConversation && autoRunning) {
            clearTimeout(autoRestartTimer);
            autoRestartTimer = setTimeout(recordVoice, 1000);
          }

          return;
        }

        setStatus("음성 인식 중...");
        setFlowState("translate", "STT 처리 중");

        const ctx = getDeviceContext();

        const fd = new FormData();
        fd.append("file", blob, "voice.webm");
        fd.append("session_id", sessionId);
        fd.append("duration", String(Math.round(durationMs / 1000)));
        fd.append("user_language_mode", "auto");
        fd.append("source_language", "auto");
        fd.append("target_language", targetLanguage);
        fd.append("lat", ctx.lat || "");
        fd.append("lng", ctx.lng || "");
        fd.append("device_locale", ctx.locale || navigator.language || "");

        try {
          const res = await fetch("/api/stt", {
            method: "POST",
            body: fd
          });

          const sttData = await res.json();

          if (sttData.ok && sttData.text) {
            const currentText = String(sttData.text || "").trim();
            if (currentText.length < 1) {
              saveMemoryEvent("stt_too_short", "hold", currentText, "", "STT 결과 너무 짧음");
              setStatus("음성 없음");
              setFlowState("", "인식 문장이 너무 짧음");

              if (autoConversation && autoRunning) {
                clearTimeout(autoRestartTimer);
                autoRestartTimer = setTimeout(recordVoice, 1000);
              }

              return;
            }
            if (!currentText || currentText === "-") {
              saveMemoryEvent("stt_empty", "hold", "", "", "인식 문장 없음");
              setStatus("음성 없음");
              setFlowState("", "인식 문장 없음");

              if (autoConversation && autoRunning) {
                clearTimeout(autoRestartTimer);
                autoRestartTimer = setTimeout(recordVoice, 1000);
              }

              return;
            }

            if (
              autoConversation &&
              getListenPreset().blockBackgroundCaption &&
              isLikelyBackgroundCaption(currentText)
            ) {
              saveMemoryEvent("background_block", "hold", currentText, "", "배경 자막성 문구 차단");
              setStatus("배경음 차단");
              setFlowState("", "사용자 발화 아님");

              if (autoConversation && autoRunning) {
                clearTimeout(autoRestartTimer);
                autoRestartTimer = setTimeout(recordVoice, 1000);
              }

              return;
            }

saveMemoryEvent("stt_success", "ok", currentText, "", "STT 성공");

try {
  await translateText(currentText, "voice");
} catch (translateErr) {
  saveMemoryEvent(
    "after_stt_translate_error",
    "error",
    currentText,
    "",
    translateErr.message
  );

  setStatus("번역 연결 오류");
  setFlowState("error", "STT 성공 · 번역 단계 확인 필요");

  const resultEl = document.getElementById("resultText");
  if (resultEl) {
    resultEl.innerText = "STT 성공 / 번역 오류: " + translateErr.message;
  }

  if (autoConversation && autoRunning) {
    clearTimeout(autoRestartTimer);
    autoRestartTimer = setTimeout(recordVoice, 1200);
  }
}
          } else {
            saveMemoryEvent("stt_fail", "fail", "", "", "음성 인식 실패");
            setStatus("음성 인식 실패");
            setFlowState("error", "다시 말해주세요");

            if (autoConversation && autoRunning) {
              clearTimeout(autoRestartTimer);
              autoRestartTimer = setTimeout(recordVoice, 1000);
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
        if (!recorder || recorder.state === "inactive") return;

        analyser.getByteTimeDomainData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += Math.abs(data[i] - 128);
        }

        const volume = sum / data.length;
        const now = Date.now();

        if (volume > preset.volumeThreshold) {
          speechStarted = true;
          lastVoiceTime = now;
        }

        if (
          speechStarted &&
          now - startedAt > preset.minSpeechMs &&
          now - lastVoiceTime > preset.endSilenceMs
        ) {
          safeStop();
          return;
        }

        if (!speechStarted && now - startedAt > preset.maxSilenceMs) {
          safeStop();
          return;
        }

        requestAnimationFrame(detect);
      }

      detect();
    } catch (e) {
      isRecording = false;

      try {
        if (audioContext && audioContext.state !== "closed") {
          await audioContext.close();
        }
      } catch (err) {}

      saveMemoryEvent("mic_error", "error", "", "", e.message);
      setStatus("마이크 권한 필요");
      setFlowState("error", "마이크 오류");
    }
  }
   function requestMicAndStart() {
    if (micStream) {
      recordVoice();
      return;
    }

    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal(
        "마이크 사용 안내",
        "<p>통역을 시작하려면 마이크 권한이 필요합니다.</p>" +
          "<p style='font-size:13px;color:#64748b'>브라우저 권한창이 뜨면 허용을 눌러주세요.</p>" +
          "<button class='btn green' style='width:100%;margin-top:8px' onclick='window.krxaMicStart()'>🎙 마이크 허용하고 시작</button>"
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

  function openQuickInput() {
    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal(
        "말하기 / 텍스트 입력",
        "<textarea id='quickTranslateText' placeholder='통역할 내용을 입력하세요'></textarea>" +
          "<button class='btn blue' style='width:100%;margin-top:6px' onclick='KRXA_Translate.sendQuickText()'>전송</button>" +
          "<button class='btn green' style='width:100%;margin-top:6px' onclick='KRXA_Translate.requestMicAndStart()'>🎙 음성 입력</button>"
      );
      return;
    }

    const text = prompt("통역할 내용을 입력하세요.");
    if (text && text.trim()) translateText(text.trim(), "quick_text");
  }

  function sendQuickText() {
    const el = document.getElementById("quickTranslateText");
    const text = el ? el.value : "";

    autoConversation = false;
    autoRunning = false;
    isRecording = false;
    clearTimeout(autoRestartTimer);

    const toggle = document.getElementById("autoToggle");
    if (toggle) toggle.className = "toggle";

    if (window.KRXA_App && window.KRXA_App.closeModal) {
      window.KRXA_App.closeModal();
    }

    translateText(text, "quick_text");
  }

  function init() {
    initLanguages();
    setListenMode("conversation");
    setStatus("대기 중");
    setFlowState("", "마이크를 누르면 통역을 시작합니다");
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
    getListenPreset: getListenPreset,
    releaseMic: releaseMic
  };
})();
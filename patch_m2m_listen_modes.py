from pathlib import Path

p = Path("ui/js/m2m_translate.js")
text = p.read_text(encoding="utf-8")

# 1. 모드 프리셋 추가
insert_after = 'let autoRestartTimer = null;'
preset = '''
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
  tv: {
    name: "TV 시청 모드",
    volumeThreshold: 18,
    minSpeechMs: 1000,
    endSilenceMs: 1800,
    maxSilenceMs: 9000,
    minBlobSize: 1200,
    blockBackgroundCaption: false
  }
};

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
'''
if "const LISTEN_PRESETS" not in text:
    text = text.replace(insert_after, insert_after + "\n" + preset)

# 2. blob.size 기준을 프리셋으로
text = text.replace("if (!blob || blob.size < 500) {", "const preset = getListenPreset();\n\n        if (!blob || blob.size < preset.minBlobSize) {")

# 3. volume 기준 프리셋 적용
text = text.replace("if (volume > 24) {", "if (volume > preset.volumeThreshold) {")
text = text.replace("if (volume > 20) {", "if (volume > preset.volumeThreshold) {")

# 4. 발화 종료 기준 프리셋 적용
text = text.replace("now - startedAt > 900 && now - lastVoiceTime > 1300", "now - startedAt > preset.minSpeechMs && now - lastVoiceTime > preset.endSilenceMs")
text = text.replace("now - startedAt > 500 && now - lastVoiceTime > 800", "now - startedAt > preset.minSpeechMs && now - lastVoiceTime > preset.endSilenceMs")
text = text.replace("now - startedAt > 700 && now - lastVoiceTime > 1100", "now - startedAt > preset.minSpeechMs && now - lastVoiceTime > preset.endSilenceMs")

# 5. 무음 최대 대기 프리셋 적용
text = text.replace("now - startedAt > 6000", "now - startedAt > preset.maxSilenceMs")
text = text.replace("now - startedAt > 3500", "now - startedAt > preset.maxSilenceMs")
text = text.replace("now - startedAt > 5000", "now - startedAt > preset.maxSilenceMs")

# 6. 배경문구 차단을 대화모드에서만 적용
text = text.replace(
    "if (autoConversation && isLikelyBackgroundCaption(currentText)) {",
    "if (autoConversation && getListenPreset().blockBackgroundCaption && isLikelyBackgroundCaption(currentText)) {"
)

# 7. 외부 공개 객체에 setListenMode 추가
text = text.replace(
    "sendQuickText: sendQuickText",
    "sendQuickText: sendQuickText,\n    setListenMode: setListenMode,\n    getListenPreset: getListenPreset"
)

p.write_text(text, encoding="utf-8")
print("m2m listen modes patched")
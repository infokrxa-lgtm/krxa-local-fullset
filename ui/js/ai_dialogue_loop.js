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
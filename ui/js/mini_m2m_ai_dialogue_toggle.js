
/* mini_m2m_ai_dialogue_toggle.js - PATCH67 v2 */
(function(){
  if(window.KRXA_MINI_M2M_AI_DIALOGUE_TOGGLE_LOADED){ return; }
  window.KRXA_MINI_M2M_AI_DIALOGUE_TOGGLE_LOADED = true;

  function txt(el){
    try{ return (el && (el.innerText || el.textContent || '')) || ''; }catch(e){ return ''; }
  }

  function findMiniBar(){
    try{
      var nodes = Array.from(document.querySelectorAll('div, section, footer, aside'));
      return nodes.find(function(n){
        var t = txt(n);
        return t.indexOf('말대말') >= 0 && (t.indexOf('통역') >= 0 || t.indexOf('말하면 바로') >= 0);
      }) || null;
    }catch(e){ return null; }
  }

  function ensureToggle(){
    try{
      if(document.getElementById('krxa-mini-ai-dialogue-toggle')){ return; }
      var bar = findMiniBar();
      if(!bar){ return; }

      var wrap = document.createElement('div');
      wrap.id = 'krxa-mini-ai-dialogue-toggle';
      wrap.style.marginTop = '8px';
      wrap.style.display = 'flex';
      wrap.style.alignItems = 'center';
      wrap.style.justifyContent = 'space-between';
      wrap.style.gap = '8px';
      wrap.style.padding = '8px 12px';
      wrap.style.borderRadius = '14px';
      wrap.style.background = 'rgba(255,255,255,0.12)';
      wrap.style.color = 'white';
      wrap.style.fontWeight = '700';
      wrap.innerHTML = '<span>AI대화</span><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="krxa-mini-ai-dialogue-check"><span>ON</span></label>';

      bar.appendChild(wrap);

      var chk = wrap.querySelector('#krxa-mini-ai-dialogue-check');
      chk.addEventListener('change', function(){
        var on = !!chk.checked;
        window.KRXA_MINI_M2M_AI_DIALOGUE_ENABLED = on;
        window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = on;
        window.KRXA_AI_DIALOGUE_ENABLED = on;
        window.KRXA_AI_DIALOGUE_FREE_MODE = on;
      });
    }catch(e){}
  }

  document.addEventListener('DOMContentLoaded', ensureToggle);
  setTimeout(ensureToggle, 500);
  setTimeout(ensureToggle, 1500);
  setTimeout(ensureToggle, 3000);

  window.KRXA_MINI_M2M_AI_DIALOGUE = {
    ensureToggle: ensureToggle,
    isOn: function(){ return window.KRXA_MINI_M2M_AI_DIALOGUE_ENABLED === true; }
  };
})();

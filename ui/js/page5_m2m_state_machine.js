/* page5_m2m_state_machine.js - TRAVEL_V1_M2M_CONTROLLER_FULLFILES_V1
 * State only. No mic execution here.
 */
(function(){
  'use strict';
  if(window.KRXA_PAGE5_STATE_FULLFILES_V1_LOADED){ return; }
  window.KRXA_PAGE5_STATE_FULLFILES_V1_LOADED = true;

  var state = { mode:'translate', otherLangLabel:'' };

  function text(el){ try{ return (el && (el.innerText || el.textContent || '')) || ''; }catch(e){ return ''; } }
  function isPage5(){ return text(document.body).indexOf('말대말 통역') >= 0; }
  function toggleEl(){ return document.getElementById('autoToggle'); }

  function visual(on){
    try{
      var el = toggleEl();
      if(!el) return;
      el.classList.toggle('active', !!on);
      el.classList.toggle('on', !!on);
      el.setAttribute('data-ai', on ? 'on' : 'off');
      el.setAttribute('aria-checked', on ? 'true' : 'false');
      el.setAttribute('data-flow','page5.ai.toggle');
      el.removeAttribute('onclick');
    }catch(e){}
  }

  function setMode(mode){
    mode = (mode === 'ai' || mode === 'ai_dialogue') ? 'ai_dialogue' : 'translate';
    state.mode = mode;
    window.KRXA_PAGE5_AI_DIALOGUE_ENABLED = mode === 'ai_dialogue';
    window.KRXA_AI_DIALOGUE_ENABLED = mode === 'ai_dialogue';
    window.KRXA_PAGE5_MODE = mode === 'ai_dialogue' ? 'ai' : 'translate';
    window.KRXA_M2M_MODE = window.KRXA_PAGE5_MODE;
    visual(mode === 'ai_dialogue');
    return state.mode;
  }

  function sync(){
    var on = false;
    try{
      var el = toggleEl();
      on = !!(el && (el.classList.contains('active') || el.classList.contains('on') || el.getAttribute('data-ai') === 'on' || el.getAttribute('aria-checked') === 'true'));
    }catch(e){}
    return setMode(on ? 'ai_dialogue' : 'translate');
  }

  function updateOtherLanguageDisplay(){
    try{
      Array.from(document.querySelectorAll('select')).forEach(function(sel){
        var html = sel.innerHTML || '';
        var parentText = text(sel.parentElement);
        if(html.indexOf('기타') < 0 && parentText.indexOf('기타') < 0) return;
        var opt = sel.options[sel.selectedIndex];
        var name = opt ? (opt.text || opt.label || opt.value || '').trim() : '';
        if(!name || name.indexOf('기타') >= 0) return;
        state.otherLangLabel = name;
        var holder = document.getElementById('otherLangLabel');
        if(!holder){
          holder = document.createElement('div');
          holder.id = 'otherLangLabel';
          holder.style.cssText = 'font-size:12px;color:#2563eb;font-weight:800;margin-top:4px;';
          sel.parentElement.appendChild(holder);
        }
        holder.textContent = '선택 언어: ' + name;
        sel.setAttribute('data-selected-label', name);
        sel.title = name;
      });
    }catch(e){}
  }

  function init(){
    if(!isPage5()) return;
    var el = toggleEl();
    if(el){ el.setAttribute('data-flow','page5.ai.toggle'); el.removeAttribute('onclick'); }
    sync();
    updateOtherLanguageDisplay();
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('change', function(e){ if(e.target && e.target.tagName === 'SELECT') setTimeout(updateOtherLanguageDisplay,20); }, true);
  setTimeout(init,300);
  setTimeout(init,1000);
  setInterval(function(){ if(isPage5()) updateOtherLanguageDisplay(); },1500);

  window.KRXA_PAGE5_M2M_STATE_MACHINE = {
    init:init,
    sync:sync,
    setMode:setMode,
    getMode:function(){ return state.mode; },
    runTranslate:function(){ return setMode('translate'); },
    runAI:function(){ return setMode('ai_dialogue'); },
    routeMic:function(){ return false; },
    state:function(){ return state; },
    updateOtherLanguageDisplay:updateOtherLanguageDisplay
  };
})();

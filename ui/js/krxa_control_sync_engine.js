/* KRXA CONTROL SYNC ENGINE v1
   USER UI 기본 구조는 유지한다.
   CONTROL/DEV 완료 결과만 sync_state로 읽어서 show/hide 등 최소 반영한다.
*/
(function(){
  let lastUpdated = "";

  async function loadSync(){
    try{
      const res = await fetch("/api/control-sync-state?ts=" + Date.now());
      const data = await res.json();
      const cfg = data.config || data;
      if(!cfg || !cfg.rules) return;
      if(cfg.updatedAt && cfg.updatedAt === lastUpdated) return;
      lastUpdated = cfg.updatedAt || "";
      applyRules(cfg.rules || []);
      window.KRXA_CONTROL_SYNC_STATE = cfg;
    }catch(e){
      console.log("[KRXA SYNC] load failed", e);
    }
  }

  function applyRules(rules){
    rules.forEach(function(rule){
      if(rule.action !== "show_hide") return;
      const show = rule.enabled !== false;
      const selectors = rule.selectors || [];
      selectors.forEach(function(sel){
        try{
          document.querySelectorAll(sel).forEach(function(el){
            el.style.display = show ? "" : "none";
            el.setAttribute("data-krxa-sync", show ? "on" : "off");
          });
        }catch(e){}
      });
    });
  }

  window.KRXA_CONTROL_SYNC_RELOAD = loadSync;

  document.addEventListener("DOMContentLoaded", function(){
    loadSync();
    setInterval(loadSync, 2500);
  });
})();

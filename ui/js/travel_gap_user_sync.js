/* Travel GAP Patch 01 - CONTROL -> USER Sync */
(function(){
  async function loadConfig(){
    try{
      const res = await fetch("/api/travel-ui-components?ts=" + Date.now());
      const data = await res.json();
      const cfg = data.config || data;
      applyConfig(cfg);
    }catch(e){
      console.log("[Travel GAP01] config load failed", e);
    }
  }

  function applyConfig(cfg){
    if(!cfg || !cfg.pages) return;

    cfg.pages.forEach(function(page, pageIndex){
      const pageEl = document.querySelectorAll("#pages > .page")[pageIndex];
      if(!pageEl) return;

      pageEl.style.display = page.enabled === false ? "none" : "";

      (page.items || []).forEach(function(item){
        const id = item.id;
        const show = item.enabled !== false;

        const selectors = [
          '[data-component="' + id + '"]',
          '[data-kx-id="' + id + '"]',
          '[data-travel-id="' + id + '"]',
          '[data-item-id="' + id + '"]'
        ];

        selectors.forEach(function(sel){
          document.querySelectorAll(sel).forEach(function(el){
            el.style.display = show ? "" : "none";
          });
        });
      });
    });

    window.KRXA_TRAVEL_UI_COMPONENTS = cfg;
  }

  window.KRXA_TRAVEL_GAP01_SYNC = loadConfig;
  document.addEventListener("DOMContentLoaded", loadConfig);
  setInterval(loadConfig, 3000);
})();

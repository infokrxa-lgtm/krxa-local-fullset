/* KRXA Travel Page Layout Live v3 */
(function(){
  let last = "";

  async function loadLayout(){
    try{
      const res = await fetch("/api/travel-page-layout-config?ts=" + Date.now(), {cache:"no-store"});
      const data = await res.json();
      if(!data || !data.ok || !data.config) return;
      const sig = JSON.stringify(data.config);
      if(sig !== last){
        last = sig;
        applyLayout(data.config);
      }
    }catch(e){ console.log("layout config failed", e); }
  }

  function applyLayout(cfg){
    const wrap = document.getElementById("pages");
    if(!wrap) return;

    const pageEls = Array.from(document.querySelectorAll("#pages > .page"));
    const enabledPages = (cfg.pages || []).filter(p => p.enabled !== false);
    const count = enabledPages.length || pageEls.length || 1;

    wrap.style.width = (count * 100) + "%";

    pageEls.forEach(function(el, idx){
      const p = (cfg.pages || []).find(x => Number(x.index) === idx);
      el.style.display = (p && p.enabled === false) ? "none" : "";
    });

    if(window.KRXA_SET_TOTAL_PAGES){
      window.KRXA_SET_TOTAL_PAGES(count);
    }

    window.KRXA_PAGE_LAYOUT = cfg;
  }

  window.KRXA_PageLayout = {load:loadLayout, apply:applyLayout};

  document.addEventListener("DOMContentLoaded", function(){
    loadLayout();
    setInterval(loadLayout, 3000);
  });
})();

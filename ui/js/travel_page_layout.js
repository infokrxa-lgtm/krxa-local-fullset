/* KRXA Travel Page Layout Live v2 */
/* CONTROL 값 변경 → USER 자동 반영 */

(function(){
  let lastSignature = "";

  async function loadLayout(){
    try{
      const res = await fetch("/api/travel-page-layout-config?t=" + Date.now());
      const data = await res.json();
      if(data && data.ok && data.config){
        const sig = JSON.stringify(data.config);
        if(sig !== lastSignature){
          lastSignature = sig;
          applyLayout(data.config);
        }
      }
    }catch(e){
      console.log("layout config load failed", e);
    }
  }

  function activePages(cfg){
    return (cfg.pages || []).filter(function(p){
      return p.enabled !== false;
    });
  }

  function applyLayout(cfg){
    const pagesWrap = document.getElementById("pages");
    if(!pagesWrap) return;

    const pageEls = Array.from(document.querySelectorAll("#pages > .page"));
    const active = activePages(cfg);
    const activeCount = active.length || pageEls.length || 1;

    pagesWrap.style.width = (activeCount * 100) + "%";

    pageEls.forEach(function(el, idx){
      const p = (cfg.pages || []).find(function(x){
        return Number(x.index) === idx;
      });

      if(p && p.enabled === false){
        el.style.display = "none";
      }else{
        el.style.display = "";
      }
    });

    if(window.KRXA_SET_TOTAL_PAGES){
      window.KRXA_SET_TOTAL_PAGES(activeCount);
    }

    window.KRXA_PAGE_LAYOUT = cfg;
  }

  window.KRXA_PageLayout = {
    load: loadLayout,
    apply: applyLayout
  };

  document.addEventListener("DOMContentLoaded", function(){
    loadLayout();
    setInterval(loadLayout, 3000);
  });
})();
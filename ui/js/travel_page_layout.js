/* KRXA Travel Page Layout Live v1 */
(function(){
  async function loadLayout(){
    try{
      const res = await fetch("/api/travel-page-layout-config");
      const data = await res.json();
      if(data && data.ok && data.config){
        applyLayout(data.config);
      }
    }catch(e){
      console.log("layout config load failed", e);
    }
  }

  function applyLayout(cfg){
    const pagesWrap = document.getElementById("pages");
    if(!pagesWrap) return;

    const count = Number(cfg.page_count || 8);
    const width = Number(cfg.page_width_percent || (count * 100));

    pagesWrap.style.width = width + "%";

    const pageEls = document.querySelectorAll("#pages > .page");
    pageEls.forEach(function(el, idx){
      const p = (cfg.pages || []).find(function(x){ return Number(x.index) === idx; });
      if(p && p.enabled === false){
        el.style.display = "none";
      }else{
        el.style.display = "";
      }
    });

    if(window.KRXA_SET_TOTAL_PAGES){
      window.KRXA_SET_TOTAL_PAGES(count);
    }

    window.KRXA_PAGE_LAYOUT = cfg;
  }

  window.KRXA_PageLayout = {
    load: loadLayout,
    apply: applyLayout
  };

  document.addEventListener("DOMContentLoaded", loadLayout);
})();

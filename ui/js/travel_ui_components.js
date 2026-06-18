/* KRXA Travel UI Components Live v1 */
/* CONTROL page1 gps/hero/mic ON-OFF → USER 반영 */

(function(){
  let lastSig = "";

  async function loadComponents(){
    try{
      const res = await fetch("/api/travel-ui-components?ts=" + Date.now(), {cache:"no-store"});
      const data = await res.json();
      if(!data || !data.ok || !data.config) return;

      const sig = JSON.stringify(data.config);
      if(sig !== lastSig){
        lastSig = sig;
        applyComponents(data.config);
      }
    }catch(e){
      console.log("KRXA UI components load failed", e);
    }
  }

  function setVisible(selector, show){
    document.querySelectorAll(selector).forEach(function(el){
      el.style.display = show ? "" : "none";
    });
  }

  function applyComponents(cfg){
    const p1 = cfg.page1 || {};

    setVisible(".deviceContextBar", p1.gps !== false);

    document.querySelectorAll(".hubHero, .hero, .marketHero, .heroCard").forEach(function(el){
      const txt = (el.innerText || el.textContent || "");
      if(txt.includes("허영만") || txt.includes("관광") || txt.includes("추천")){
        el.style.display = p1.hero === false ? "none" : "";
      }
    });

    document.querySelectorAll(".homeMicDock, .homeMicBtn").forEach(function(el){
      el.style.display = p1.mic === false ? "none" : "";
    });

    window.KRXA_UI_COMPONENTS = cfg;
  }

  window.KRXA_UIComponents = {
    load: loadComponents,
    apply: applyComponents
  };

  document.addEventListener("DOMContentLoaded", function(){
    loadComponents();
    setInterval(loadComponents, 3000);
  });
})();

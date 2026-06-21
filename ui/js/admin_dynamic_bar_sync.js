/* Admin Dynamic Bar Sync v1 */
(function(){
  let last = "";

  async function load(){
    try{
      const res = await fetch("/api/admin-dynamic-bars?ts="+Date.now(), {cache:"no-store"});
      const data = await res.json();
      const cfg = data.config || data;
      if(!cfg || !cfg.pages) return;
      if(cfg.updatedAt === last) return;
      last = cfg.updatedAt || "";
      apply(cfg);
    }catch(e){
      console.log("[DynamicBarSync]", e);
    }
  }

  function pageEls(){
    return document.querySelectorAll("#pages > .page");
  }

  function apply(cfg){
    const pages = pageEls();

    cfg.pages.forEach(function(page, idx){
      const pageEl = pages[idx];
      if(!pageEl) return;

      pageEl.setAttribute("data-admin-page", page.id || ("page"+(idx+1)));
      pageEl.style.display = page.enabled === false ? "none" : "";

      ensureDynamicZone(pageEl);

      (page.items || []).forEach(function(item){
        bindExisting(pageEl, item);
        renderDynamic(pageEl, page, item);
      });
    });
  }

  function ensureDynamicZone(pageEl){
    let zone = pageEl.querySelector("[data-admin-dynamic-zone='true']");
    if(!zone){
      zone = document.createElement("div");
      zone.setAttribute("data-admin-dynamic-zone","true");
      zone.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px;";
      pageEl.appendChild(zone);
    }
    return zone;
  }

  function bindExisting(pageEl, item){
    const id = item.id;
    const keys = [id, item.title].filter(Boolean);

    const selectors = [
      '[data-admin-id="'+id+'"]',
      '[data-component="'+id+'"]',
      '[data-item-id="'+id+'"]',
      '[data-travel-id="'+id+'"]',
      '#'+id,
      '.krxa-'+id
    ];

    let found = false;

    selectors.forEach(function(sel){
      try{
        pageEl.querySelectorAll(sel).forEach(function(el){
          found = true;
          el.setAttribute("data-admin-id", id);
          el.style.display = item.enabled === false ? "none" : "";
        });
      }catch(e){}
    });

    if(!found){
      pageEl.querySelectorAll("button,.quickCard,.card,.serviceCard,.contact,.btn").forEach(function(el){
        const txt = (el.innerText || el.textContent || "").trim();
        if(!txt) return;
        for(const k of keys){
          if(k && txt.indexOf(k) >= 0){
            found = true;
            el.setAttribute("data-admin-id", id);
            el.style.display = item.enabled === false ? "none" : "";
          }
        }
      });
    }
  }

  function renderDynamic(pageEl, page, item){
    if(item.dynamic !== true) return;

    const zone = ensureDynamicZone(pageEl);
    let el = zone.querySelector('[data-admin-id="'+item.id+'"]');

    if(item.enabled === false){
      if(el) el.style.display = "none";
      return;
    }

    if(!el){
      el = document.createElement("button");
      el.setAttribute("data-admin-id", item.id);
      el.style.cssText = "border:0;border-radius:16px;padding:14px;background:#fff;border:1px solid #dbe3ee;font-weight:900;box-shadow:0 2px 8px rgba(0,0,0,.08);";
      zone.appendChild(el);
    }

    el.style.display = "";
    el.innerHTML = (item.icon || "🔹") + " " + (item.title || item.id);
    el.onclick = function(){
      runAction(item);
    };
  }

  function runAction(item){
    const a = item.action || {};
    if(a.kind === "url" && a.url){
      window.open(a.url, "_blank");
      return;
    }
    if(a.kind === "page" && typeof window.KRXA_App !== "undefined"){
      window.KRXA_App.goPage(Number(a.page || 1));
      return;
    }
    if(a.kind === "map" && item.title){
      if(window.KRXA_MapApps && window.KRXA_MapApps.openSearch){
        window.KRXA_MapApps.openSearch(item.title);
      }else{
        window.open("https://www.google.com/maps/search/"+encodeURIComponent(item.title), "_blank");
      }
      return;
    }
    alert((item.title || item.id) + " 실행 설정이 필요합니다.");
  }

  window.KRXA_DYNAMIC_BAR_RELOAD = load;
  document.addEventListener("DOMContentLoaded", function(){
    load();
    setInterval(load, 2000);
  });
})();

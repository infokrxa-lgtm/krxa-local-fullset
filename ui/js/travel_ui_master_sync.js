/* Travel UI Master Sync v1
   USER 1~8페이지 현재 구조 유지.
   travel_ui_config.json 기준으로 ON/OFF만 자동 반영.
*/
(function(){
  let lastUpdated = "";

  const alias = {
    gps:["gps","GPS"],
    hero:["hero","travelHero","discoveryHero"],
    mini_talk:["mini_talk","miniBar","m2m"],
    food:["food","맛집"],
    restaurant:["restaurant","식당"],
    transport:["transport","교통"],
    route:["route","길찾기"],
    sos:["sos","SOS"],
    airport:["airport","공항"],
    hotel:["hotel","호텔"],
    tour:["tour","관광"],
    shopping:["shopping","쇼핑"],
    music:["music","음악"],
    tv:["tv","TV"],
    call:["call","통화"],
    photo:["photo","사진"],
    video:["video","동영상"],
    m2m:["m2m","말대말"],
    phone:["phone","전화"],
    whatsapp:["whatsapp","WhatsApp"],
    wechat:["wechat","WeChat"]
  };

  async function load(){
    try{
      const res = await fetch("/api/travel-ui-master-config?ts="+Date.now());
      const data = await res.json();
      const cfg = data.config || data;
      if(!cfg || !cfg.pages) return;
      if(cfg.updatedAt && cfg.updatedAt === lastUpdated) return;
      lastUpdated = cfg.updatedAt || "";
      apply(cfg);
      window.KRXA_TRAVEL_UI_MASTER = cfg;
    }catch(e){
      console.log("[MASTER SYNC] failed", e);
    }
  }

  function apply(cfg){
    const pageEls = document.querySelectorAll("#pages > .page");

    cfg.pages.forEach(function(page, pageIndex){
      const pageEl = pageEls[pageIndex];
      if(!pageEl) return;

      pageEl.style.display = page.enabled === false ? "none" : "";

      (page.items || []).forEach(function(item){
        const show = item.enabled !== false;
        applyItem(pageEl, item.id, show);
      });
    });
  }

  function applyItem(pageEl, id, show){
    const keys = alias[id] || [id];

    const selectors = [
      '[data-component="'+id+'"]',
      '[data-kx-id="'+id+'"]',
      '[data-travel-id="'+id+'"]',
      '[data-item-id="'+id+'"]',
      '.krxa-'+id,
      '#'+id
    ];

    selectors.forEach(function(sel){
      try{
        document.querySelectorAll(sel).forEach(function(el){
          el.style.display = show ? "" : "none";
          el.setAttribute("data-master-sync", show ? "on" : "off");
        });
      }catch(e){}
    });

    // 식별자가 없는 기존 버튼/카드도 텍스트 기준으로 최소 반영
    keys.forEach(function(k){
      if(!k) return;
      try{
        pageEl.querySelectorAll("button, .card, .chip, .service, div").forEach(function(el){
          const txt = (el.innerText || "").trim();
          if(!txt) return;
          if(txt.indexOf(k) >= 0){
            el.style.display = show ? "" : "none";
            el.setAttribute("data-master-sync", show ? "on" : "off");
          }
        });
      }catch(e){}
    });
  }

  window.KRXA_TRAVEL_MASTER_RELOAD = load;
  document.addEventListener("DOMContentLoaded", function(){
    load();
    setInterval(load, 2500);
  });
})();

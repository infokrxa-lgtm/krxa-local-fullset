/* Admin User Screen Sync v1
   관리자 travel_ui_config.json 기준으로 USER /travel-v1에 즉시 반영
*/
(function(){
  let lastUpdated = "";

  const alias = {
    gps:["GPS","위치","날짜","시간"],
    hero:["Hero","LIVE TRAVEL DISCOVERY","둘러보기","추천"],
    mini_talk:["미니말하기","말하기","통역"],
    home:["홈"],
    food:["맛집"],
    restaurant:["식당"],
    transport:["교통"],
    route:["길찾기"],
    sos:["SOS"],
    airport:["공항"],
    hotel:["호텔"],
    tour:["관광"],
    shopping:["쇼핑"],
    music:["음악"],
    tv:["TV"],
    call:["통화"],
    photo:["사진"],
    video:["동영상"],
    m2m:["말대말","말대말통역"],
    auto:["자동"],
    english:["영어"],
    japanese:["일본어"],
    chinese:["중국어"],
    mic:["마이크","🎙"],
    text_input:["텍스트 입력"],
    replay:["다시듣기"],
    speak:["말하기"],
    exit:["종료"],
    phone:["전화"],
    whatsapp:["WhatsApp"],
    wechat:["WeChat"],
    hotel_call:["호텔 전화"],
    restaurant_call:["식당 전화"],
    taxi_call:["택시 전화"],
    dial:["전화 걸기"],
    recent_translate:["최근통역"],
    recent_travel:["최근여행"],
    memory_loop:["KRXA기억루프"],
    continue_translate:["통역 계속하기"],
    travel_menu:["여행 메뉴"],
    clear_history:["사용내역 초기화"],
    emergency_contact:["긴급연락"],
    local_help:["현지 도움"],
    embassy:["대사관"],
    police:["경찰"],
    hospital:["병원"],
    insurance:["보험"],
    location_share:["위치공유"]
  };

  async function load(){
    try{
      const res = await fetch("/api/admin-user-screen-config?ts="+Date.now(), {cache:"no-store"});
      const data = await res.json();
      const cfg = data.config || data;
      if(!cfg || !cfg.pages) return;
      if(cfg.updatedAt === lastUpdated) return;
      lastUpdated = cfg.updatedAt || "";
      apply(cfg);
      window.KRXA_ADMIN_USER_SCREEN_CONFIG = cfg;
    }catch(e){
      console.log("[AdminUserSync] failed", e);
    }
  }

  function apply(cfg){
    const pages = document.querySelectorAll("#pages > .page");

    (cfg.pages || []).forEach(function(page, idx){
      const pageEl = pages[idx];
      if(!pageEl) return;

      pageEl.style.display = page.enabled === false ? "none" : "";

      (page.items || []).forEach(function(item){
        applyItem(pageEl, item.id, item.enabled !== false);
      });
    });
  }

  function applyItem(pageEl, id, show){
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
        pageEl.querySelectorAll(sel).forEach(function(el){
          el.style.display = show ? "" : "none";
          el.setAttribute("data-admin-sync", show ? "on" : "off");
        });
      }catch(e){}
    });

    const keys = alias[id] || [id];
    keys.forEach(function(key){
      try{
        pageEl.querySelectorAll("button,.card,.quickCard,.serviceCard,.contact,.phrase,.tabs button,.btn,div").forEach(function(el){
          const txt = (el.innerText || el.textContent || "").trim();
          if(!txt) return;
          if(txt.indexOf(key) >= 0){
            el.style.display = show ? "" : "none";
            el.setAttribute("data-admin-sync", show ? "on" : "off");
          }
        });
      }catch(e){}
    });
  }

  window.KRXA_ADMIN_USER_SCREEN_RELOAD = load;
  document.addEventListener("DOMContentLoaded", function(){
    load();
    setInterval(load, 2000);
  });
})();

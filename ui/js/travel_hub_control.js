/* Travel GAP Patch 02 - Hub Control / Recommend / Map */
(function(){
  let hubCfg=null;
  let currentPos=null;

  async function loadCfg(){
    const res = await fetch("/api/travel-hub-control-config?ts="+Date.now());
    const data = await res.json();
    hubCfg = data.config || data;
    renderHub();
  }

  function getLocation(){
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => { currentPos = {lat:pos.coords.latitude, lng:pos.coords.longitude}; },
      err => { console.log("gps failed", err); },
      {enableHighAccuracy:true, timeout:8000}
    );
  }

  function renderHub(){
    if(!hubCfg || hubCfg.enabled === false) return;
    const pages = document.querySelectorAll("#pages > .page");
    const target = pages[2] || pages[0];
    if(!target) return;

    let box = document.getElementById("krxaTravelHubPanel");
    if(!box){
      box = document.createElement("div");
      box.id = "krxaTravelHubPanel";
      box.style.cssText = "margin:12px;padding:12px;border-radius:16px;background:rgba(15,23,42,.08);border:1px solid rgba(148,163,184,.5)";
      target.appendChild(box);
    }

    const cats = (hubCfg.categories||[]).filter(c=>c.enabled!==false);
    box.innerHTML = `
      <div style="font-weight:900;font-size:16px;margin-bottom:8px">${hubCfg.title||"여행허브 추천"}</div>
      ${hubCfg.input_enabled!==false ? `<input id="krxaHubQuery" placeholder="${hubCfg.placeholder||"목적지 입력"}" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;margin-bottom:8px">` : ""}
      <div id="krxaHubCats" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
        ${cats.map(c=>`<button data-cat="${c.id}" style="border:0;border-radius:999px;padding:8px 10px;background:#2563eb;color:#fff;font-weight:bold">${c.name}</button>`).join("")}
      </div>
      <button id="krxaHubRecommendBtn" style="border:0;border-radius:12px;padding:10px;width:100%;background:#16a34a;color:#fff;font-weight:900">추천 리스트 보기</button>
      <div id="krxaHubResults" style="margin-top:10px"></div>
    `;

    let selectedCat = cats[0] ? cats[0].id : "food";
    box.querySelectorAll("[data-cat]").forEach(btn=>{
      btn.onclick = function(){
        selectedCat = this.getAttribute("data-cat");
        box.querySelectorAll("[data-cat]").forEach(b=>b.style.background="#2563eb");
        this.style.background="#f97316";
      }
    });

    const first = box.querySelector("[data-cat]");
    if(first) first.style.background="#f97316";

    document.getElementById("krxaHubRecommendBtn").onclick = async function(){
      const q = document.getElementById("krxaHubQuery") ? document.getElementById("krxaHubQuery").value.trim() : "";
      await recommend(selectedCat, q);
    };
  }

  async function recommend(category, query){
    const lat = currentPos ? currentPos.lat : "";
    const lng = currentPos ? currentPos.lng : "";
    const url = `/api/travel-hub-recommend?category=${encodeURIComponent(category)}&query=${encodeURIComponent(query)}&lat=${lat}&lng=${lng}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = data.items || [];
    const resultBox = document.getElementById("krxaHubResults");
    resultBox.innerHTML = list.map((it, idx)=>`
      <div data-dest="${encodeURIComponent(it.destination||it.title)}" style="padding:10px;margin:6px 0;border-radius:12px;background:white;border:1px solid #e2e8f0;cursor:pointer">
        <b>${idx+1}. ${it.title}</b><br>
        <small>${it.memo||""}</small>
      </div>
    `).join("");

    resultBox.querySelectorAll("[data-dest]").forEach(el=>{
      el.onclick = function(){
        openMap(decodeURIComponent(this.getAttribute("data-dest")));
      }
    });
  }

  function openMap(destination){
    let origin = "Current Location";
    if(currentPos) origin = currentPos.lat + "," + currentPos.lng;
    const url = "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(origin) + "&destination=" + encodeURIComponent(destination);
    if(hubCfg && hubCfg.open_new_window === false){
      location.href = url;
    }else{
      window.open(url, "_blank");
    }
  }

  window.KRXA_TRAVEL_HUB_RELOAD = loadCfg;
  document.addEventListener("DOMContentLoaded", function(){
    getLocation();
    loadCfg();
    setInterval(loadCfg, 5000);
  });
})();

/* PATCH17-7 Admin Map App Template Manager v1 */
(function(){
  async function getCurrentPositionText(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation) return reject(new Error("geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        p=>resolve(p.coords.latitude + "," + p.coords.longitude),
        reject,
        {enableHighAccuracy:true, timeout:8000, maximumAge:60000}
      );
    });
  }

  async function loadConfig(){
    const r = await fetch("/api/patch17/control-first?ts=" + Date.now(), {cache:"no-store"});
    const d = await r.json();
    return d.data || {};
  }

  function clean(v){ return String(v || "").trim(); }

  function destinationOf(item){
    if(!item) return "";
    if(item.destination_type === "manual") return clean(item.destination_value || item.address || item.map_query || item.name);
    if(item.destination_type === "address") return clean(item.address || item.map_query || item.name);
    if(item.destination_type === "map_query") return clean(item.map_query || item.address || item.name);
    return clean(item.address || item.map_query || item.name || item.title);
  }

  function fillTemplate(tpl, origin, destination, item){
    return String(tpl || "")
      .replaceAll("{origin}", encodeURIComponent(origin || ""))
      .replaceAll("{destination}", encodeURIComponent(destination || ""))
      .replaceAll("{name}", encodeURIComponent(item && item.name || ""))
      .replaceAll("{address}", encodeURIComponent(item && item.address || ""))
      .replaceAll("{map_query}", encodeURIComponent(item && item.map_query || ""))
      .replaceAll("{travelmode}", encodeURIComponent(item && item.travel_mode || ""));
  }

  function getDefaultMapApp(cfg){
    const map = cfg.map_apps || {};
    const apps = map.apps || [];
    return apps.find(a=>a.enabled !== false && a.id === map.default_app)
        || apps.find(a=>a.enabled !== false && a.is_default)
        || apps.find(a=>a.enabled !== false);
  }

  async function openDir(item, options){
    options = options || {};
    const cfg = options.config || await loadConfig();
    const app = options.mapApp || getDefaultMapApp(cfg);

    const destination = destinationOf(item);
    if(!destination){
      alert("목적지/주소/지도검색어가 없습니다.");
      return;
    }

    let origin = "";
    if(!item || (item.origin_type || "current_location") === "current_location"){
      try { origin = await getCurrentPositionText(); } catch(e) {}
    } else if(item.origin_type === "manual") {
      origin = item.origin_value || "";
    }

    if(!app || app.id === "google_maps" || app.mode === "google_dir_recommend"){
      const url =
        "https://www.google.com/maps/dir/" +
        encodeURIComponent(origin || "") + "/" +
        encodeURIComponent(destination);
      window.open(url, "_blank");
      return;
    }

    const url = fillTemplate(app.url_template, origin, destination, item);
    window.open(url, "_blank");
  }

  async function openSearch(item){
    const q = destinationOf(item);
    if(!q){ alert("검색어가 없습니다."); return; }
    window.open("https://www.google.com/maps/search/" + encodeURIComponent(q), "_blank");
  }

  function openUrl(url){
    if(!url){ alert("URL이 없습니다."); return; }
    window.open(url, "_blank");
  }

  function call(phone){
    if(!phone){ alert("전화번호가 없습니다."); return; }
    location.href = "tel:" + phone;
  }

  window.KRXA_MapEngine = {
    getCurrentPositionText,
    loadConfig,
    openDir,
    openSearch,
    openUrl,
    call,
    fillTemplate,
    getDefaultMapApp
  };
})();
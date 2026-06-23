/* PATCH17-5 Common Map Execution Engine v1 */
(function(){
  function getCurrentPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){
        reject(new Error("geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos=>resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }),
        err=>reject(err),
        {enableHighAccuracy:true, timeout:8000, maximumAge:60000}
      );
    });
  }

  function clean(v){
    return String(v || "").trim();
  }

  function destinationOf(input){
    if(typeof input === "string") return clean(input);
    return clean(
      input.address ||
      input.map_query ||
      input.destination ||
      input.name ||
      input.title
    );
  }

  async function openDir(input, opt){
    opt = opt || {};
    const dest = destinationOf(input);
    if(!dest){
      alert("목적지/주소/지도검색어가 없습니다.");
      return;
    }

    try{
      const pos = await getCurrentPosition();
      const origin = pos.lat + "," + pos.lng;
      const url =
        "https://www.google.com/maps/dir/?api=1" +
        "&origin=" + encodeURIComponent(origin) +
        "&destination=" + encodeURIComponent(dest) +
        "&travelmode=" + encodeURIComponent(opt.travelmode || "driving");
      window.open(url, "_blank");
    }catch(e){
      const url =
        "https://www.google.com/maps/dir/?api=1" +
        "&destination=" + encodeURIComponent(dest) +
        "&travelmode=" + encodeURIComponent(opt.travelmode || "driving");
      window.open(url, "_blank");
    }
  }

  function openSearch(input){
    const q = destinationOf(input);
    if(!q){
      alert("검색어가 없습니다.");
      return;
    }
    window.open(
      "https://www.google.com/maps/search/" + encodeURIComponent(q),
      "_blank"
    );
  }

  function openCategory(category, nearText){
    const q = clean(nearText || category);
    openSearch(q);
  }

  function openUrl(url){
    if(!url){
      alert("URL이 없습니다.");
      return;
    }
    window.open(url, "_blank");
  }

  function call(phone){
    if(!phone){
      alert("전화번호가 없습니다.");
      return;
    }
    location.href = "tel:" + phone;
  }

  window.KRXA_MapEngine = {
    openDir,
    openSearch,
    openCategory,
    openUrl,
    call,
    getCurrentPosition
  };
})();
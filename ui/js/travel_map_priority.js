
/* travel_map_priority.js */
(function(){
  if(window.KRXA_TRAVEL_MAP_PRIORITY_LOADED){ return; }
  window.KRXA_TRAVEL_MAP_PRIORITY_LOADED = true;

  async function getCurrentPosition(){
    return new Promise(function(resolve){
      if(!navigator.geolocation){
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function(pos){ resolve({lat: pos.coords.latitude, lng: pos.coords.longitude}); },
        function(){ resolve(null); },
        {enableHighAccuracy:true, timeout:8000, maximumAge:30000}
      );
    });
  }

  async function openDirections(place, countryCode){
    place = place || {};
    countryCode = countryCode || place.country_code || place.country || "KR";
    var start = await getCurrentPosition();
    var params = new URLSearchParams();
    params.set("country_code", countryCode);
    params.set("start_lat", start ? start.lat : "");
    params.set("start_lng", start ? start.lng : "");
    params.set("dest_lat", place.lat || place.latitude || "");
    params.set("dest_lng", place.lng || place.longitude || "");
    params.set("dest_name", place.name || place.title || "목적지");

    var res = await fetch("/api/travel-v2/map-priority/direction-url?" + params.toString());
    var data = await res.json();
    var urls = data.urls || [];
    if(urls.length && urls[0].url){
      window.open(urls[0].url, "_blank");
      return data;
    }

    var q = encodeURIComponent(place.name || place.title || "목적지");
    window.open("https://www.google.com/maps/search/?api=1&query=" + q, "_blank");
    return data;
  }

  window.KRXA_TRAVEL_MAP_PRIORITY = {
    openDirections: openDirections,
    getCurrentPosition: getCurrentPosition
  };
})();

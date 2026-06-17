/* KRXA Travel V1 - Device Context Engine */

 (function () { window.KRXA_CONTEXT = {
    dateText: "",
    timeText: "",
    locale: navigator.language || "unknown",
    language: "ko",
    lat: "",
    lng: "",
    gpsReady: false,

    gpsStatus: "위치 확인 중",
    online: navigator.onLine,
    updatedAt: ""
  };

  function formatDateTime() {
    const now = new Date();

    window.KRXA_CONTEXT.dateText = now.toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      weekday: "short"
    });

    window.KRXA_CONTEXT.timeText = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit"
    });

    window.KRXA_CONTEXT.updatedAt = now.toISOString();
  }

  function renderContextBar() {
    const ctx = window.KRXA_CONTEXT;
    const el = document.getElementById("deviceContextBar");

    if (!el) return;

    const locationText = ctx.gpsReady
      ? "위치 확인됨"
      : (ctx.gpsStatus || "위치 확인 중");

    const dateText = ctx.dateText || "";
    const timeText = ctx.timeText || "";
    const langText = ctx.language || "ko";

    el.innerText =
      "📍 " + locationText +
      " · " + dateText +
      " · " + timeText +
      " · " + langText;
  }

  function requestLocationPermission() {
    if (!navigator.geolocation) {
      alert("이 기기는 위치 기능을 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        window.KRXA_CONTEXT.lat = pos.coords.latitude;
        window.KRXA_CONTEXT.lng = pos.coords.longitude;
        window.KRXA_CONTEXT.gpsReady = true;
       window.KRXA_CONTEXT.gpsStatus = "위치 확인됨";
        renderContextBar();
        alert("위치 확인이 완료되었습니다.");
      },
      function () {
        window.KRXA_CONTEXT.gpsReady = false;
        window.KRXA_CONTEXT.gpsStatus = "위치 권한 없음";
        renderContextBar();
        alert("위치 권한이 필요합니다. 브라우저 사이트 설정에서 위치를 허용해 주세요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  function initGPS() {
    requestLocationPermission();
  }

function buildGoogleMapsSearchUrl(keyword) {
  const ctx = window.KRXA_CONTEXT;
  const q = keyword || "tourist attractions near me";

  if (ctx.gpsReady && ctx.lat && ctx.lng) {
    const point = ctx.lat + "," + ctx.lng;
    return (
      "https://www.google.com/maps/search/" +
      encodeURIComponent(q + " near " + point) +
      "/@" +
      point +
      ",15z"
    );
  }

  return "https://www.google.com/maps/search/" + encodeURIComponent(q);
}

  function buildGoogleMapsRouteUrl(destination) {
    const ctx = window.KRXA_CONTEXT;

    if (ctx.gpsReady && ctx.lat && ctx.lng) {
      return (
        "https://www.google.com/maps/dir/?api=1" +
        "&origin=" +
        encodeURIComponent(ctx.lat + "," + ctx.lng) +
        "&destination=" +
        encodeURIComponent(destination)
      );
    }

    return (
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(destination)
    );
  }

function openMyLocationMap() {
  const ctx = window.KRXA_CONTEXT;

  if (ctx.gpsReady && ctx.lat && ctx.lng) {
    const point = ctx.lat + "," + ctx.lng;
    window.open(
      "https://www.google.com/maps/search/" +
        encodeURIComponent("내 위치 " + point) +
        "/@" +
        point +
        ",18z",
      "_blank"
    );
    return;
  }

  requestLocationPermission();
}

  function openRouteTo(destination) {
    const ctx = window.KRXA_CONTEXT;

    if (!destination) {
      alert("목적지 정보가 없습니다.");
      return;
    }

    if (ctx.gpsReady && ctx.lat && ctx.lng) {
      window.open(
        "https://www.google.com/maps/dir/?api=1" +
          "&origin=" +
          encodeURIComponent(ctx.lat + "," + ctx.lng) +
          "&destination=" +
          encodeURIComponent(destination),
        "_blank"
      );
      return;
    }

    requestLocationPermission();

    window.open(
      "https://www.google.com/maps/search/" + encodeURIComponent(destination),
      "_blank"
    );
  }
  function openLocationSearch(keyword) {
    window.open(buildGoogleMapsSearchUrl(keyword), "_blank");
  }

  function openMapRouter(keyword) {
    const q = keyword || "tourist attractions near me";
    window.open(buildGoogleMapsSearchUrl(q), "_blank");
  }

  function getContextForApi() {
    const ctx = window.KRXA_CONTEXT;

    return {
      date: ctx.dateText,
      time: ctx.timeText,
      locale: ctx.locale,
      language: ctx.language,
      lat: ctx.lat,
      lng: ctx.lng,
      gpsReady: ctx.gpsReady,
      gpsStatus: ctx.gpsStatus,
      online: ctx.online,
      updatedAt: ctx.updatedAt
    };
  }

  function updateTimeLoop() {
    formatDateTime();
    renderContextBar();
  }

  function initDeviceContext() {
    updateTimeLoop();
    initGPS();

    setInterval(updateTimeLoop, 30000);

    window.addEventListener("online", function () {
      window.KRXA_CONTEXT.online = true;
      renderContextBar();
    });

    window.addEventListener("offline", function () {
      window.KRXA_CONTEXT.online = false;
      renderContextBar();
    });
  }

window.KRXA_DeviceContext = {
    init: initDeviceContext,
    get: getContextForApi,
    render: renderContextBar,

    requestLocationPermission: requestLocationPermission,
    openLocationSearch: openLocationSearch,
    openMyLocationMap: openMyLocationMap,
    openMapRouter: openMapRouter,
    openRouteTo: openRouteTo,
    buildGoogleMapsSearchUrl: buildGoogleMapsSearchUrl,
    buildGoogleMapsRouteUrl: buildGoogleMapsRouteUrl
};

window.KRXA_Recommend = window.KRXA_Recommend || {};
window.KRXA_Recommend.openMarketResearchV1 = function() {
  const html =
    "<p><b>GPS 기반 현실 시장조사 추천 v1</b></p>" +
    "<p>TV·유튜브·먹방·뉴스·리뷰·별점·지도 검색을 기준으로 후보를 찾습니다.</p>" +

    "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.searchMarket('food')\">🍜 맛집 찾기</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.searchMarket('attraction')\">🏖 관광지 찾기</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.searchMarket('experience')\">🎡 체험 찾기</button>" +

    "<hr>" +
    "<input id='krxaMarketKeyword' placeholder='직접 검색: 예) 돼지국밥, 야시장, 아이와 갈 곳' style='width:100%;margin-top:8px;padding:10px'>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.searchMarket('custom')\">🔎 직접 검색</button>";

  if (window.KRXA_App && window.KRXA_App.openModal) {
    window.KRXA_App.openModal("현실 시장조사 추천", html);
  }
};

window.KRXA_Recommend.searchMarket = function (type) {
  let keyword = "";

  if (type === "food") {
    keyword = "주변 맛집 TV 방송 유튜브 먹방 리뷰 별점";
  } else if (type === "attraction") {
    keyword = "주변 관광지 인기 명소 후기 뉴스";
  } else if (type === "experience") {
    keyword = "주변 체험 여행 예약 후기 인기";
  } else {
    const el = document.getElementById("krxaMarketKeyword");
    keyword = el && el.value ? el.value : "주변 여행 추천";
  }

  if (window.KRXA_DeviceContext && window.KRXA_DeviceContext.openMapRouter) {
    window.KRXA_DeviceContext.openMapRouter(keyword);
    return;
  }

  window.open(
    "https://www.google.com/search?q=" + encodeURIComponent(keyword),
    "_blank"
  );
};
initDeviceContext();
})();
// ===== KRXA Route Patch: Google/Naver current location directions =====
(function(){
  function getCtx(){ return window.KRXA_CONTEXT || {}; }
  window.KRXA_openGoogleRoute = function(destination){
    const ctx = getCtx();
    let url = "https://www.google.com/maps/dir/?api=1";
    if(ctx.gpsReady && ctx.lat && ctx.lng){
      url += "&origin=" + encodeURIComponent(ctx.lat + "," + ctx.lng);
    }
    url += "&destination=" + encodeURIComponent(destination || "");
    window.open(url, "_blank");
  };
  window.KRXA_openNaverRoute = function(destination){
    const ctx = getCtx();
    const q = encodeURIComponent(destination || "");
    if(ctx.gpsReady && ctx.lat && ctx.lng){
      window.open("https://map.naver.com/p/directions/" + ctx.lng + "," + ctx.lat + ",내위치/" + q, "_blank");
    }else{
      window.open("https://map.naver.com/p/search/" + q, "_blank");
    }
  };
  if(window.KRXA_DeviceContext){
    window.KRXA_DeviceContext.openRouteTo = window.KRXA_openGoogleRoute;
    window.KRXA_DeviceContext.openNaverRouteTo = window.KRXA_openNaverRoute;
  }
})();
// ===== End KRXA Route Patch =====

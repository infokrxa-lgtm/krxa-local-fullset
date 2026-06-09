/* KRXA Travel V1 - Device Context Engine
   역할:
   - 사용자 기기 기준 날짜/시간/언어/GPS/네트워크 상태 확인
   - HOME 상단 Device Context Bar 표시
   - 여행 메뉴의 위치 기반 검색 URL 생성
*/

(function () {
  window.KRXA_CONTEXT = {
    dateText: "",
    timeText: "",
    locale: navigator.language || "unknown",
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

  function updateTimeLoop() {
    formatDateTime();
    renderContextBar();
  }

  function initGPS() {
    if (!navigator.geolocation) {
      window.KRXA_CONTEXT.gpsReady = false;
      window.KRXA_CONTEXT.gpsStatus = "GPS 미지원";
      renderContextBar();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        window.KRXA_CONTEXT.lat = pos.coords.latitude;
        window.KRXA_CONTEXT.lng = pos.coords.longitude;
        window.KRXA_CONTEXT.gpsReady = true;
        window.KRXA_CONTEXT.gpsStatus = "위치 확인됨";
        renderContextBar();
      },
      function () {
        window.KRXA_CONTEXT.gpsReady = false;
        window.KRXA_CONTEXT.gpsStatus = "위치 권한 없음";
        renderContextBar();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  function buildGoogleMapsSearchUrl(keyword) {
    const ctx = window.KRXA_CONTEXT;

    if (ctx.gpsReady && ctx.lat && ctx.lng) {
      return (
        "https://www.google.com/maps/search/" +
        encodeURIComponent(keyword) +
        "/@" +
        ctx.lat +
        "," +
        ctx.lng +
        ",15z"
      );
    }

    return "https://www.google.com/maps/search/" + encodeURIComponent(keyword);
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
      window.open(
        "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent(ctx.lat + "," + ctx.lng),
        "_blank"
      );
      return;
    }

    window.open("https://www.google.com/maps", "_blank");
  }

  function openLocationSearch(keyword) {
    window.open(buildGoogleMapsSearchUrl(keyword), "_blank");
  }

  function getContextForApi() {
    const ctx = window.KRXA_CONTEXT;

    return {
      date: ctx.dateText,
      time: ctx.timeText,
      locale: ctx.locale,
      lat: ctx.lat,
      lng: ctx.lng,
      gpsReady: ctx.gpsReady,
      gpsStatus: ctx.gpsStatus,
      online: ctx.online,
      updatedAt: ctx.updatedAt
    };
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
    openLocationSearch: openLocationSearch,
    openMyLocationMap: openMyLocationMap,
    buildGoogleMapsSearchUrl: buildGoogleMapsSearchUrl,
    buildGoogleMapsRouteUrl: buildGoogleMapsRouteUrl
  };
})();
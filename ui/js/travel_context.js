/* KRXA Travel V1 - Device Context Engine */

(function () {
  window.KRXA_CONTEXT = {
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

    requestLocationPermission();
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
    buildGoogleMapsSearchUrl: buildGoogleMapsSearchUrl,
    buildGoogleMapsRouteUrl: buildGoogleMapsRouteUrl
  };
})();
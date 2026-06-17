/* KRXA Travel V1 - Device Context Engine Full Version */

(function () {
  window.KRXA_CONTEXT = {
    dateText: "",
    timeText: "",
    locale: navigator.language || "ko-KR",
    language: (navigator.language || "ko").split("-")[0] || "ko",
    lat: "",
    lng: "",
    country: "",
    city: "",
    place: "",
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

    const els = document.querySelectorAll(
      ".deviceContextBar, .krxaDeviceContextBar, #deviceContextBar"
    );

    if (!els || !els.length) return;

    const locationText = ctx.gpsReady
      ? "위치 확인됨"
      : (ctx.gpsStatus || "위치 확인 중");

    const text =
      "📍 " + locationText +
      " · " + (ctx.dateText || "") +
      " · " + (ctx.timeText || "") +
      " · " + (ctx.language || "ko");

    els.forEach(function (el) {
      el.innerText = text;
    });
  }

  function requestLocationPermission() {
    if (!navigator.geolocation) {
      window.KRXA_CONTEXT.gpsReady = false;
      window.KRXA_CONTEXT.gpsStatus = "위치 기능 없음";
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

  function getContextForApi() {
    const ctx = window.KRXA_CONTEXT;

    return {
      date: ctx.dateText,
      time: ctx.timeText,
      locale: ctx.locale,
      language: ctx.language,
      lat: ctx.lat,
      lng: ctx.lng,
      country: ctx.country,
      city: ctx.city,
      place: ctx.place,
      gpsReady: ctx.gpsReady,
      gpsStatus: ctx.gpsStatus,
      online: ctx.online,
      updatedAt: ctx.updatedAt
    };
  }

  function buildGoogleMapsSearchUrl(keyword) {
    const ctx = window.KRXA_CONTEXT;
    const q = keyword || "nearby places";

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

    if (!destination) {
      return "https://www.google.com/maps/dir/";
    }

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

  function openMapSearch(keyword) {
    window.open(buildGoogleMapsSearchUrl(keyword), "_blank");
  }

  function openMapDirections(destination) {
    if (!destination) {
      alert("목적지 정보가 없습니다.");
      return;
    }

    window.open(buildGoogleMapsRouteUrl(destination), "_blank");
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

  function updateTimeLoop() {
    formatDateTime();
    renderContextBar();
  }

  function initDeviceContext() {
    updateTimeLoop();
    requestLocationPermission();

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

    buildGoogleMapsSearchUrl: buildGoogleMapsSearchUrl,
    buildGoogleMapsRouteUrl: buildGoogleMapsRouteUrl,

    openMapSearch: openMapSearch,
    openMapDirections: openMapDirections,
    openMyLocationMap: openMyLocationMap,

    openMapRouter: openMapSearch,
    openRouteTo: openMapDirections
  };

  initDeviceContext();
})();
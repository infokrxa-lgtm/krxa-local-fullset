// Travel V1 Recommendation / Execution Hub Engine
// 1페이지 Home + 2페이지 여행상황 공통 사용

(function () {
  window.KRXA_Recommend = window.KRXA_Recommend || {};

  const DEFAULT_LINKS = {
    flight: [
      { name: "Google Flights", url: "https://www.google.com/travel/flights" },
      { name: "Skyscanner", url: "https://www.skyscanner.com" },
      { name: "Trip.com", url: "https://www.trip.com/flights" },
      { name: "Booking", url: "https://www.booking.com/flights" },
      { name: "Agoda", url: "https://www.agoda.com/flights" }
    ],
    train: [
      { name: "Google 기차 검색", url: "https://www.google.com/search?q=train+station+near+me" }
    ],
    subway: [
      { name: "주변 지하철역", url: "https://www.google.com/maps/search/subway+station+near+me" }
    ],
    bus: [
      { name: "주변 버스정류장", url: "https://www.google.com/maps/search/bus+stop+near+me" }
    ],
    taxi: [
      { name: "주변 택시", url: "https://www.google.com/maps/search/taxi+near+me" }
    ],
    ship: [
      { name: "주변 여객선 / 항구", url: "https://www.google.com/maps/search/ferry+terminal+near+me" }
    ],
    attraction: [
      { name: "주변 관광지", url: "https://www.google.com/maps/search/tourist+attractions+near+me" }
    ],
    experience: [
      { name: "주변 체험 여행", url: "https://www.google.com/search?q=nearby+travel+experiences" }
    ],
    food: [
      { name: "주변 맛집", url: "https://www.google.com/maps/search/restaurants+near+me" }
    ]
  };

  function getUserLinks(type) {
    try {
      const raw = localStorage.getItem("krxa_user_links_" + type);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveUserLinks(type, links) {
    localStorage.setItem("krxa_user_links_" + type, JSON.stringify(links));
  }

  function buildButtons(type) {
    const links = DEFAULT_LINKS[type] || [];
    const userLinks = getUserLinks(type);
    const all = links.concat(userLinks);

    let html = "";

    all.forEach(function (link, index) {
      html +=
        "<button class='btn blue' style='width:100%;margin-top:8px' " +
        "onclick=\"window.open('" + link.url + "','_blank')\">" +
        link.name +
        "</button>";

      if (index >= links.length) {
        html +=
          "<button class='btn red' style='width:100%;margin-top:4px' " +
          "onclick=\"KRXA_Recommend.removeUserLink('" + type + "'," + (index - links.length) + ")\">" +
          "삭제: " + link.name +
          "</button>";
      }
    });

    html +=
      "<hr>" +
      "<input id='krxaLinkName' placeholder='사이트 이름' style='width:100%;margin-top:8px;padding:10px'>" +
      "<input id='krxaLinkUrl' placeholder='사이트 주소 https://...' style='width:100%;margin-top:8px;padding:10px'>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.addUserLink('" + type + "')\">사용자 사이트 등록</button>";

    return html;
  }

  function openPanel(title, type) {
    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal(title, buildButtons(type));
      return;
    }

    const links = DEFAULT_LINKS[type] || [];
    if (links[0]) window.open(links[0].url, "_blank");
  }

  window.KRXA_Recommend.addUserLink = function (type) {
    const nameEl = document.getElementById("krxaLinkName");
    const urlEl = document.getElementById("krxaLinkUrl");

    const name = nameEl ? nameEl.value.trim() : "";
    const url = urlEl ? urlEl.value.trim() : "";

    if (!name || !url) {
      alert("사이트 이름과 주소를 입력하세요.");
      return;
    }

    const links = getUserLinks(type);
    links.push({ name: name, url: url });
    saveUserLinks(type, links);

    openPanel("사용자 등록 완료", type);
  };

  window.KRXA_Recommend.removeUserLink = function (type, index) {
    const links = getUserLinks(type);
    links.splice(index, 1);
    saveUserLinks(type, links);

    openPanel("사용자 사이트 삭제 완료", type);
  };

  window.KRXA_Recommend.openNearby = function (type) {
    if (type === "attraction") return openPanel("주변 관광지", "attraction");
    if (type === "experience") return openPanel("주변 체험 여행", "experience");
    if (type === "food") return openPanel("주변 맛집", "food");
    if (type === "transport") return window.KRXA_Recommend.openTransportHub();

    return openPanel("추천", type);
  };

  window.KRXA_Recommend.openTransportHub = function () {
    const html =
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openNearby('flight')\">✈️ 항공</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openNearby('train')\">🚄 기차</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openNearby('subway')\">🚇 지하철</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openNearby('bus')\">🚌 버스</button>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openNearby('taxi')\">🚕 택시</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openNearby('ship')\">🚢 선박</button>";

    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal("교통 선택", html);
      return;
    }

    window.open("https://www.google.com/maps/search/transportation+near+me", "_blank");
  };

  window.KRXA_Recommend.openTodayRecommendation = function () {
    const html =
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openNearby('attraction')\">🏖 주변 관광지</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openNearby('experience')\">🎡 주변 체험</button>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openNearby('food')\">🍜 주변 맛집</button>";

    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal("오늘의 추천", html);
      return;
    }

    window.open("https://www.google.com/search?q=nearby+travel+attractions+experiences+restaurants", "_blank");
  };window.KRXA_Recommend.openGpsConsent = function () {
  if (window.KRXA_DeviceContext && window.KRXA_DeviceContext.requestLocationPermission) {
    window.KRXA_DeviceContext.requestLocationPermission();
  }
};

window.KRXA_Recommend.openMarketBasedNearby = function (type) {
  const map = {
    attraction: "tourist attractions near me",
    experience: "travel experiences near me",
    food: "popular restaurants near me",
    cafe: "popular cafe near me",
    transport: "transportation near me"
  };

  const keyword = map[type] || "tourist attractions near me";

  if (window.KRXA_DeviceContext && window.KRXA_DeviceContext.openMapRouter) {
    window.KRXA_DeviceContext.openMapRouter(keyword);
    return;
  }

  window.open(
    "https://www.google.com/search?q=" + encodeURIComponent(keyword),
    "_blank"
  );
};

window.KRXA_Recommend.openLLMRecommendV1 = function () {
  const html =
    "<p><b>GPS 기반 현실 추천 v1</b></p>" +
    "<p>현재는 지도/검색 기반으로 실행하고, 다음 단계에서 LLM 분석을 연결합니다.</p>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openMarketBasedNearby('attraction')\">🏖 관광지</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openMarketBasedNearby('experience')\">🎡 체험</button>" +
    "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openMarketBasedNearby('food')\">🍜 맛집</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMyLocationMap()\">📍 내 위치 지도</button>";

  if (window.KRXA_App && window.KRXA_App.openModal) {
    window.KRXA_App.openModal("GPS 기반 추천", html);
  }
};
})();
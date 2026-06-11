// Travel V1 Market Research Recommendation Engine v1

(function () {
  window.KRXA_Recommend = window.KRXA_Recommend || {};

  function getCtx() {
    return window.KRXA_DeviceContext ? window.KRXA_DeviceContext.get() : {};
  }

  function openModal(title, html) {
    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal(title, html);
      return;
    }
    alert(title);
  }

  window.KRXA_Recommend.openMarketResearchV1 = function () {
    const html =
      "<p><b>GPS 기반 현실 시장조사 추천</b></p>" +
      "<p>TV·유튜브·먹방·뉴스·리뷰·별점·지도 흐름을 기준으로 후보를 만듭니다.</p>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('attraction','주변 관광지')\">🏖 관광지 추천</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('experience','주변 체험')\">🎡 체험 추천</button>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('food','주변 맛집')\">🍜 맛집 추천</button>" +
      "<hr>" +
      "<input id='krxaMarketKeyword' placeholder='직접 검색 예: 방송 맛집, 야시장, 아이와 갈 곳' style='width:100%;margin-top:8px;padding:10px'>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.searchCustomMarket()\">🔎 직접 검색</button>";

    openModal("현실 시장조사 추천", html);
  };

  window.KRXA_Recommend.searchCustomMarket = function () {
    const el = document.getElementById("krxaMarketKeyword");
    const keyword = el && el.value ? el.value : "주변 여행 추천";
    window.KRXA_Recommend.showMarketCards("custom", keyword);
  };

  window.KRXA_Recommend.showMarketCards = async function (category, keyword) {
    const ctx = getCtx();

    const res = await fetch("/api/recommend-market", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        category: category,
        keyword: keyword,
        lat: ctx.lat || "",
        lng: ctx.lng || ""
      })
    });

    const data = await res.json();

    let html =
      "<p><b>LLM 분석 추천 카드</b></p>" +
      "<p>현재 위치 기준 시장조사형 후보입니다.</p>";

    (data.cards || []).forEach(function (card) {
      html +=
        "<div class='msg' style='margin-top:10px'>" +
        "<b>" + card.title + "</b>" +
        "<span>" + card.desc + "<br><small>" + card.reason + "</small></span>" +
        "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('" + card.map_keyword + "')\">지도에서 보기</button>" +
        "</div>";
    });

    html +=
      "<button class='btn green' style='width:100%;margin-top:10px' onclick=\"KRXA_DeviceContext.openMyLocationMap()\">📍 내 위치 보기</button>";

    openModal("추천 결과", html);
  };

  window.KRXA_Recommend.openNearby = function (type) {
    if (type === "food") return window.KRXA_Recommend.showMarketCards("food", "주변 맛집");
    if (type === "attraction") return window.KRXA_Recommend.showMarketCards("attraction", "주변 관광지");
    if (type === "experience") return window.KRXA_Recommend.showMarketCards("experience", "주변 체험");
    if (type === "transport") return window.KRXA_Recommend.openTransportHub();
    return window.KRXA_Recommend.openMarketResearchV1();
  };

  window.KRXA_Recommend.openTransportHub = function () {
    const html =
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openFlightHub()\">✈️ 항공</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('train station near me')\">🚄 기차</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('subway station near me')\">🚇 지하철</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('bus stop near me')\">🚌 버스</button>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('taxi stand near me')\">🚕 택시</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('ferry terminal near me')\">🚢 선박</button>";

    openModal("교통 허브", html);
  };

  window.KRXA_Recommend.openFlightHub = function () {
    const html =
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://www.google.com/travel/flights','_blank')\">Google Flights</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://www.skyscanner.com','_blank')\">Skyscanner</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://www.trip.com/flights','_blank')\">Trip.com</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://www.booking.com/flights','_blank')\">Booking</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://www.agoda.com/flights','_blank')\">Agoda</button>" +
      "<hr>" +
      "<p><b>사용자 사이트 등록은 DEV/관리자 모드에서 확장</b></p>";

    openModal("항공권 검색", html);
  };
window.KRXA_Recommend.discoveryPlaces = [];
window.KRXA_Recommend.currentDiscoveryPlaceIndex = 0;

window.KRXA_Recommend.loadDiscoveryPlaces = async function () {
  try {
    const res = await fetch("/api/travel-discovery");
    const data = await res.json();

    if (data.ok && data.items && data.items.length) {
      window.KRXA_Recommend.discoveryPlaces = data.items;
      window.KRXA_Recommend.currentDiscoveryPlaceIndex = 0;
      window.KRXA_Recommend.renderDiscoveryPlaceHero();
      return;
    }
  } catch (e) {
    console.log("travel discovery load failed", e);
  }
};

window.KRXA_Recommend.renderDiscoveryPlaceHero = function () {
  const places = window.KRXA_Recommend.discoveryPlaces || [];
  if (!places.length) return;

  const place =
    places[window.KRXA_Recommend.currentDiscoveryPlaceIndex % places.length];

  const titleEl = document.getElementById("discoveryHeroTitle");
  const subEl = document.getElementById("discoveryHeroSub");

  if (titleEl) titleEl.innerText = place.title || "추천 장소";
  if (subEl) subEl.innerText = place.subtitle || place.reason || "";
};

window.KRXA_Recommend.rotateDiscoveryPlaceHero = function () {
  const places = window.KRXA_Recommend.discoveryPlaces || [];
  if (!places.length) return;

  window.KRXA_Recommend.currentDiscoveryPlaceIndex =
    (window.KRXA_Recommend.currentDiscoveryPlaceIndex + 1) % places.length;

  window.KRXA_Recommend.renderDiscoveryPlaceHero();
};

window.KRXA_Recommend.openCurrentDiscoveryCard = function () {
  const places = window.KRXA_Recommend.discoveryPlaces || [];
  const place =
    places[window.KRXA_Recommend.currentDiscoveryPlaceIndex % places.length];

  if (!place) {
    window.KRXA_Recommend.openMarketResearchV1();
    return;
  }

  window.KRXA_Recommend.openPlaceRoute(place);
};

window.KRXA_Recommend.openPlaceRoute = function (place) {
  const html =
    "<p><b>" + (place.title || "추천 장소") + "</b></p>" +
    "<p>" + (place.subtitle || "") + "</p>" +
    "<div class='msg'><b>추천 사유</b><span>" + (place.reason || "") + "</span></div>" +
    "<div class='msg'><b>출처</b><span>" + (place.broadcast || place.source || "추천 후보") + "</span></div>" +
    "<div class='msg'><b>가는 방법</b><span>" + (place.route_hint || "현재 위치에서 이동수단을 선택해 확인합니다.") + "</span></div>" +
    "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openTransportHub()\">🚕 교통수단 선택</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('" + (place.map_keyword || place.keyword || place.title) + "')\">작게 보기: 지도에서 보기</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_App.goPage(3)\">🎤 말대말로 묻기</button>";

  if (window.KRXA_App && window.KRXA_App.openModal) {
    window.KRXA_App.openModal("가는 방법", html);
  }
};

setTimeout(function () {
  window.KRXA_Recommend.loadDiscoveryPlaces();
  setInterval(window.KRXA_Recommend.rotateDiscoveryPlaceHero, 5000);
}, 800);
window.KRXA_Recommend.openServiceLinkHub = async function (group) {
  const res = await fetch("/api/travel-service-links?group=" + encodeURIComponent(group));
  const data = await res.json();

  if (!data.ok) {
    alert(data.message || "서비스 링크를 불러오지 못했습니다.");
    return;
  }

  let html =
    "<p><b>" + (data.label || group) + "</b></p>" +
    "<p>" + (data.description || "") + "</p>";

  const items = (data.items || []).concat(data.user_items || []);

items.forEach(function (item) {
  const colorClass = item.source === "user" ? "green" : "blue";

  html +=
    "<button class='btn " + colorClass + "' style='width:100%;margin-top:8px' onclick=\"window.open('" +
    item.url +
    "','_blank')\">" +
    item.name +
    "</button>";
  });

  if (data.user_add_enabled) {
    html +=
      "<hr>" +
      "<p><b>내 사이트 등록 / 수정 / 삭제</b></p>" +
      "<input id='krxaServiceName' placeholder='사이트 이름' style='width:100%;margin-top:8px;padding:10px'>" +
      "<input id='krxaServiceUrl' placeholder='사이트 주소 https://...' style='width:100%;margin-top:8px;padding:10px'>" +
"<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.addUserServiceLink('" +
group +
"')\">사용자 사이트 등록</button>" +
"<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openUserServiceManager('" +
group +
"')\">등록 사이트 관리</button>";
  }

  if (window.KRXA_App && window.KRXA_App.openModal) {
    window.KRXA_App.openModal(data.label || "서비스 연결", html);
  }
};

window.KRXA_Recommend.addUserServiceLink = async function (group) {
  const nameEl = document.getElementById("krxaServiceName");
  const urlEl = document.getElementById("krxaServiceUrl");

  const name = nameEl ? nameEl.value.trim() : "";
  const url = urlEl ? urlEl.value.trim() : "";

  if (!name || !url) {
    alert("사이트 이름과 주소를 입력하세요.");
    return;
  }

  const res = await fetch("/api/travel-service-links/user-add", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({group: group, name: name, url: url})
  });

  const data = await res.json();

  if (!data.ok) {
    alert(data.message || "등록 실패");
    return;
  }

  window.KRXA_Recommend.openServiceLinkHub(group);
};

window.KRXA_Recommend.deleteUserServiceLink = async function (group, id) {
  const res = await fetch("/api/travel-service-links/user-delete", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({group: group, id: id})
  });

  const data = await res.json();

  if (!data.ok) {
    alert(data.message || "삭제 실패");
    return;
  }

  window.KRXA_Recommend.openServiceLinkHub(group);
};
window.KRXA_Recommend.openFlightHub = function () {
  window.KRXA_Recommend.openServiceLinkHub("flight");
};

window.KRXA_Recommend.openMapHub = function () {
  window.KRXA_Recommend.openServiceLinkHub("map");
};
window.KRXA_Recommend.openUserServiceManager = async function (group) {
  const res = await fetch("/api/travel-service-links?group=" + encodeURIComponent(group));
  const data = await res.json();

  if (!data.ok) {
    alert(data.message || "사용자 사이트를 불러오지 못했습니다.");
    return;
  }

  let html = "<p><b>등록 사이트 관리</b></p>";

  const userItems = data.user_items || [];

  if (!userItems.length) {
    html += "<p>등록된 사용자 사이트가 없습니다.</p>";
  }

  userItems.forEach(function (item) {
    html +=
      "<div class='msg' style='margin-top:8px'>" +
      "<b>" + item.name + "</b>" +
      "<span>" + item.url + "</span>" +
      "<button class='btn red' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.deleteUserServiceLink('" +
      group +
      "','" +
      item.id +
      "')\">삭제</button>" +
      "</div>";
  });

  html +=
    "<hr>" +
    "<input id='krxaServiceName' placeholder='사이트 이름' style='width:100%;margin-top:8px;padding:10px'>" +
    "<input id='krxaServiceUrl' placeholder='사이트 주소 https://...' style='width:100%;margin-top:8px;padding:10px'>" +
    "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.addUserServiceLink('" +
    group +
    "')\">새 사이트 등록</button>";

  if (window.KRXA_App && window.KRXA_App.openModal) {
    window.KRXA_App.openModal("내 사이트 관리", html);
  }
};
})();
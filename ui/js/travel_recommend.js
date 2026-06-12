// Travel V1 Final Recommendation / Discovery / Service Hub

(function () {
  window.KRXA_Recommend = window.KRXA_Recommend || {};

  function getCtx() {
    return window.KRXA_DeviceContext ? window.KRXA_DeviceContext.get() : {};
  }

  // -------------------------
  // Modal Stack: 닫기 = 전단계 복귀
  // -------------------------
  window.KRXA_Recommend.modalStack = window.KRXA_Recommend.modalStack || [];

  function currentModalSnapshot() {
    const title = document.getElementById("modalTitle");
    const body = document.getElementById("modalBody");
    if (!title || !body) return null;
    return { title: title.innerText || "", html: body.innerHTML || "" };
  }

  function openModal(title, html, push) {
    if (window.KRXA_App && window.KRXA_App.openModal) {
      if (push) {
        const snap = currentModalSnapshot();
        if (snap && snap.html) window.KRXA_Recommend.modalStack.push(snap);
      }
      window.KRXA_App.openModal(title, html);
      return;
    }
    alert(title);
  }

  setTimeout(function () {
    if (!window.KRXA_App || !window.KRXA_App.closeModal || window.KRXA_App.__krxaCloseWrapped) return;

    const originalClose = window.KRXA_App.closeModal;
    window.KRXA_App.closeModal = function () {
      const prev = window.KRXA_Recommend.modalStack.pop();
      if (prev) {
        window.KRXA_App.openModal(prev.title, prev.html);
        return;
      }
      originalClose.call(window.KRXA_App);
    };
    window.KRXA_App.__krxaCloseWrapped = true;
  }, 500);

  // -------------------------
  // Discovery Places
  // -------------------------
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
      }
    } catch (e) {
      console.log("travel discovery load failed", e);
    }
  };

  window.KRXA_Recommend.renderDiscoveryPlaceHero = function () {
    const places = window.KRXA_Recommend.discoveryPlaces || [];
    if (!places.length) return;

    const place = places[window.KRXA_Recommend.currentDiscoveryPlaceIndex % places.length];

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
    const place = places[window.KRXA_Recommend.currentDiscoveryPlaceIndex % places.length];

    if (!place) {
      window.KRXA_Recommend.openMarketResearchV1();
      return;
    }

    if (card.linked_group) {
      window.KRXA_Recommend.openPlaceGroup(card.linked_group, place);
      return;
    }

    window.KRXA_Recommend.openPlaceRoute(place);
  };

  window.KRXA_Recommend.openPlaceRoute = function (place) {
    const title = place.title || "추천 장소";
    const subtitle = place.subtitle || "";
    const reason = place.reason || "";
    const source = place.broadcast || place.source || "추천 후보";
    const routeHint = place.route_hint || "현재 위치에서 이동수단을 선택해 가는 방법을 확인합니다.";

    const html =
      "<h3>" + title + "</h3>" +
      "<p>" + subtitle + "</p>" +
      "<div class='msg'><b>추천 사유</b><span>" + reason + "</span></div>" +
      "<div class='msg'><b>방송/출처</b><span>" + source + "</span></div>" +
      "<div class='msg'><b>가는 방법</b><span>" + routeHint + "</span></div>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openTransportHub()\">🚕 교통수단 선택</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px;font-size:14px' onclick=\"KRXA_Recommend.openMapHubForPlace('" + encodeURIComponent(JSON.stringify(place)) + "')\">작게 보기: 지도에서 보기</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openMiniTranslate()\">🎤 말대말로 묻기</button>";

    openModal("가는 방법", html, false);
  };

  // -------------------------
  // Market Research fallback
  // -------------------------
  window.KRXA_Recommend.openMarketResearchV1 = function () {
    const html =
      "<p><b>GPS 기반 현실 시장조사 추천</b></p>" +
      "<p>TV·유튜브·먹방·뉴스·리뷰·별점 흐름을 기준으로 후보를 찾습니다.</p>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('attraction','주변 관광지')\">🏖 관광지 추천</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('experience','주변 체험')\">🎡 체험 추천</button>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('food','주변 맛집')\">🍜 맛집 추천</button>";
    openModal("현실 시장조사 추천", html, false);
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

    let html = "<p><b>추천 장소 리스트</b></p>";

    (data.cards || []).forEach(function (card) {
      const place = {
        title: card.title,
        subtitle: card.desc,
        reason: card.reason,
        source: "시장조사형 추천",
        broadcast: "TV / YouTube / 리뷰 / 지도",
        keyword: card.map_keyword,
        map_keyword: card.map_keyword,
        route_hint: "현재 위치에서 교통수단을 선택해 확인합니다."
      };

      html +=
        "<div class='msg' style='margin-top:10px;cursor:pointer' onclick=\"KRXA_Recommend.openPlaceRoute(" +
        JSON.stringify(place).replace(/"/g, "&quot;") +
        ")\">" +
        "<b>" + card.title + "</b>" +
        "<span>" + card.desc + "<br><small>" + card.reason + "</small></span>" +
        "</div>";
    });

    openModal("추천 장소", html, false);
  };

  // -------------------------
  // Transport Hub
  // -------------------------
  window.KRXA_Recommend.openTransportHub = function () {
    const html =
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('walking route near me')\">🚶 도보</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('driving route near me')\">🚗 자가용</button>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('taxi stand near me')\">🚕 택시</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('bus stop near me')\">🚌 버스</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('subway station near me')\">🚇 지하철</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('train station near me')\">🚄 기차</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openFlightHub()\">✈️ 항공</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('bicycle rental near me')\">🚲 자전거</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('kickboard rental near me')\">🛴 킥보드</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('ferry terminal near me')\">🚢 선박</button>";

    openModal("교통수단 선택", html, true);
  };

  // -------------------------
  // Service Links Hub
  // -------------------------
  window.KRXA_Recommend.openServiceLinkHub = async function (group, backTo) {
    const res = await fetch("/api/travel-service-links?group=" + encodeURIComponent(group));
    const data = await res.json();

    if (!data.ok) {
      alert(data.message || "서비스 링크를 불러오지 못했습니다.");
      return;
    }

    let html =
      (backTo === "transport"
        ? "<button class='btn blue' style='width:100%;margin-bottom:8px' onclick=\"KRXA_Recommend.openTransportHub()\">← 교통 허브로 돌아가기</button>"
        : "") +
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
        "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openUserServiceManager('" +
        group +
        "')\">사용자 사이트 등록/관리</button>";
    }

    openModal(data.label || "서비스 연결", html, true);
  };

  window.KRXA_Recommend.addUserServiceLink = async function (group) {
    const nameEl = document.getElementById("krxaServiceName");
    const urlEl = document.getElementById("krxaServiceUrl");

    const name = nameEl ? nameEl.value.trim() : "";
    let url = urlEl ? urlEl.value.trim() : "";

    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

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

    window.KRXA_Recommend.openUserServiceManager(group);
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

    window.KRXA_Recommend.openUserServiceManager(group);
  };

  window.KRXA_Recommend.openUserServiceManager = async function (group) {
    const res = await fetch("/api/travel-service-links?group=" + encodeURIComponent(group));
    const data = await res.json();

    if (!data.ok) {
      alert(data.message || "사용자 사이트를 불러오지 못했습니다.");
      return;
    }

    let html = "<p><b>내 사이트 등록 / 수정 / 삭제</b></p>";

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

    openModal("내 사이트 관리", html, true);
  };

  window.KRXA_Recommend.openFlightHub = function () {
    window.KRXA_Recommend.openServiceLinkHub("flight", "transport");
  };

  window.KRXA_Recommend.openMapHub = function () {
    window.KRXA_Recommend.openServiceLinkHub("map");
  };

  window.KRXA_Recommend.openMapHubForPlace = function (encodedPlace) {
    let place = {};
    try {
      place = JSON.parse(decodeURIComponent(encodedPlace));
    } catch (e) {}

    const q = place.map_keyword || place.keyword || place.title || "nearby place";
    const html =
      "<p><b>지도에서 보기</b></p>" +
      "<p>현재 위치 기준으로 지도앱을 선택하세요.</p>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('" + q + "')\">Google Maps</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://map.naver.com/p/search/" + encodeURIComponent(q) + "','_blank')\">Naver Map</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://map.kakao.com/?q=" + encodeURIComponent(q) + "','_blank')\">Kakao Map</button>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openServiceLinkHub('map')\">사용자 지도앱</button>";

    openModal("지도 허브", html, true);
  };

  // -------------------------
  // Mini Translate
  // -------------------------
  window.KRXA_Recommend.openMiniTranslate = function () {
    const html =
      "<p><b>미니 말대말</b></p>" +
      "<p>현재 화면을 유지한 상태에서 통역 페이지로 이동할 수 있습니다.</p>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_App.closeModal(); KRXA_App.goPage(4);\">🎤 말대말 열기</button>";
    openModal("미니 말대말", html, true);
  };

  // boot
  setTimeout(function () {
    window.KRXA_Recommend.loadMapDbHeroItems();
    window.KRXA_Recommend.loadHeroCards();
    window.KRXA_Recommend.loadDiscoveryPlaces();
    setInterval(function(){
      if (!window.KRXA_Recommend.rotateMapDbHero()) {
        if (!window.KRXA_Recommend.rotateHeroCard()) {
          window.KRXA_Recommend.rotateDiscoveryPlaceHero();
        }
      }
    }, 5000);
  }, 800);

// ===== Travel Hero Cards v1 =====
window.KRXA_Recommend.heroCards = [];
window.KRXA_Recommend.currentHeroCardIndex = 0;

window.KRXA_Recommend.loadHeroCards = async function () {
  try {
    const res = await fetch("/api/travel-hero-cards");
    const data = await res.json();

    if (data.ok && data.items && data.items.length) {
      window.KRXA_Recommend.heroCards = data.items;
      window.KRXA_Recommend.currentHeroCardIndex = 0;
      window.KRXA_Recommend.renderHeroCard();
      return true;
    }
  } catch (e) {
    console.log("hero cards load failed", e);
  }
  return false;
};

window.KRXA_Recommend.renderHeroCard = function () {
  const cards = window.KRXA_Recommend.heroCards || [];
  if (!cards.length) return false;

  const card = cards[window.KRXA_Recommend.currentHeroCardIndex % cards.length];

  const titleEl = document.getElementById("discoveryHeroTitle");
  const subEl = document.getElementById("discoveryHeroSub");

  if (titleEl) titleEl.innerText = card.title || "추천 카드";
  if (subEl) subEl.innerText = card.subtitle || card.source || "";

  return true;
};

window.KRXA_Recommend.rotateHeroCard = function () {
  const cards = window.KRXA_Recommend.heroCards || [];
  if (!cards.length) return false;

  window.KRXA_Recommend.currentHeroCardIndex =
    (window.KRXA_Recommend.currentHeroCardIndex + 1) % cards.length;

  window.KRXA_Recommend.renderHeroCard();
  return true;
};

window.KRXA_Recommend.openCurrentDiscoveryCard = function () {
  const cards = window.KRXA_Recommend.heroCards || [];

  if (cards.length) {
    const card = cards[window.KRXA_Recommend.currentHeroCardIndex % cards.length];

    const place = {
      title: card.title,
      subtitle: card.subtitle,
      reason: "관제 등록 Hero 카드 기반 추천입니다.",
      source: card.source || "Travel Hero Card",
      broadcast: card.source || "",
      keyword: card.keyword || card.map_keyword || card.title,
      map_keyword: card.map_keyword || card.keyword || card.title,
      route_hint: "현재 위치에서 교통수단을 선택해 확인합니다.",
      linked_group: card.linked_group || ""
    };

    window.KRXA_Recommend.openPlaceRoute(place);
    return;
  }

  if (window.KRXA_Recommend.discoveryPlaces && window.KRXA_Recommend.discoveryPlaces.length) {
    window.KRXA_Recommend.openPlaceRoute(
      window.KRXA_Recommend.discoveryPlaces[
        window.KRXA_Recommend.currentDiscoveryPlaceIndex %
        window.KRXA_Recommend.discoveryPlaces.length
      ]
    );
    return;
  }

  window.KRXA_Recommend.openMarketResearchV1();
};



// ===== Travel Place Group List v1 =====
window.KRXA_Recommend.openPlaceGroup = async function (groupId, fallbackCard) {
  try {
    const res = await fetch("/api/travel-place-groups?group=" + encodeURIComponent(groupId));
    const data = await res.json();

    if (!data.ok || !data.items || !data.items.length) {
      if (fallbackCard) {
        window.KRXA_Recommend.openPlaceRoute(fallbackCard);
        return;
      }
      alert("연결된 장소 리스트가 없습니다.");
      return;
    }

    let html =
      "<p><b>" + (data.title || "장소 리스트") + "</b></p>" +
      "<p>" + (data.source || "") + "</p>";

    data.items.forEach(function (item) {
      const place = {
        title: item.title,
        subtitle: (item.region || "") + " · " + (item.menu || ""),
        reason: item.reason || "리스트 기반 추천 장소입니다.",
        source: data.source || item.broadcast || "",
        broadcast: item.broadcast || data.source || "",
        keyword: item.map_keyword || item.title,
        map_keyword: item.map_keyword || item.title,
        address: item.address || "",
        phone: item.phone || "",
        route_hint: "현재 내 위치에서 이 장소까지 가는 방법을 확인합니다."
      };

      html +=
        "<div class='msg' style='margin-top:10px;cursor:pointer' onclick=\"KRXA_Recommend.openPlaceRoute(" +
        JSON.stringify(place).replace(/"/g, "&quot;") +
        ")\">" +
        "<b>" + (item.title || "장소") + "</b>" +
        "<span>" +
        (item.region || "") + " " + (item.menu || "") +
        "<br><small>" + (item.reason || "") + "</small>" +
        "</span></div>";
    });

    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal(data.title || "장소 리스트", html);
    }
  } catch (e) {
    console.log("openPlaceGroup failed", e);
    if (fallbackCard) window.KRXA_Recommend.openPlaceRoute(fallbackCard);
  }
};



// ===== KRXA Place Group / Route Final Override =====
window.KRXA_Recommend.openCurrentDiscoveryCard = function () {
  const cards = window.KRXA_Recommend.heroCards || [];
  if (cards.length) {
    const card = cards[window.KRXA_Recommend.currentHeroCardIndex % cards.length];

    const fallbackPlace = {
      title: card.title,
      subtitle: card.subtitle,
      reason: "관제 등록 Hero 카드 기반 추천입니다.",
      source: card.source || "Travel Hero Card",
      broadcast: card.source || "",
      keyword: card.keyword || card.map_keyword || card.title,
      map_keyword: card.map_keyword || card.keyword || card.title,
      route_hint: "현재 위치에서 교통수단을 선택해 확인합니다.",
      linked_group: card.linked_group || ""
    };

    if (card.linked_group) {
      window.KRXA_Recommend.openPlaceGroup(card.linked_group, fallbackPlace);
      return;
    }

    window.KRXA_Recommend.openPlaceRoute(fallbackPlace);
    return;
  }

  window.KRXA_Recommend.openMarketResearchV1();
};

window.KRXA_Recommend.openPlaceGroup = async function (groupId, fallbackPlace) {
  const res = await fetch("/api/travel-place-groups?group=" + encodeURIComponent(groupId));
  const data = await res.json();

  if (!data.ok || !data.items || !data.items.length) {
    window.KRXA_Recommend.openPlaceRoute(fallbackPlace);
    return;
  }

  let html =
    "<p><b>" + (data.title || "장소 리스트") + "</b></p>" +
    "<p>" + (data.source || "") + "</p>";

  data.items.forEach(function (item) {
    const place = {
      title: item.title,
      subtitle: (item.region || "") + " · " + (item.menu || ""),
      reason: item.reason || "리스트 기반 추천 장소입니다.",
      source: item.broadcast || data.source || "",
      broadcast: item.broadcast || data.source || "",
      keyword: item.map_keyword || item.title,
      map_keyword: item.map_keyword || item.title,
      address: item.address || "",
      phone: item.phone || "",
      route_hint: "현재 내 위치에서 이 목적지까지 가는 방법을 확인합니다."
    };

    html +=
      "<div class='msg' style='margin-top:10px;cursor:pointer' onclick='KRXA_Recommend.openPlaceRoute(" +
      JSON.stringify(place).replace(/'/g, "&#39;") +
      ")'>" +
      "<b>" + item.title + "</b>" +
      "<span>" + (item.region || "") + " · " + (item.menu || "") +
      "<br><small>" + (item.reason || "") + "</small></span></div>";
  });

  if (window.KRXA_App && window.KRXA_App.openModal) {
    window.KRXA_App.openModal(data.title || "장소 리스트", html);
  }
};

window.KRXA_Recommend.openMapHubForKeyword = function (keyword) {
  const q = keyword || "nearby place";
  const ctx = window.KRXA_DeviceContext ? window.KRXA_DeviceContext.get() : {};
  const lat = ctx.lat || "";
  const lng = ctx.lng || "";

  let naverUrl = "https://map.naver.com/p/search/" + encodeURIComponent(q);
  if (lat && lng) naverUrl += "?c=" + lng + "," + lat + ",15,0,0,0,dh";

  let kakaoUrl = "https://map.kakao.com/?q=" + encodeURIComponent(q);
  if (lat && lng) kakaoUrl += "&urlX=" + lng + "&urlY=" + lat;

  const html =
    "<p><b>지도앱 선택</b></p>" +
    "<p>현재 위치 기준 검색입니다. 구글은 내 위치 표시가 가장 안정적입니다.</p>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_DeviceContext.openMapRouter('" + q + "')\">Google Maps</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('" + naverUrl + "','_blank')\">Naver Map</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('" + kakaoUrl + "','_blank')\">Kakao Map</button>";

  window.KRXA_App.openModal("지도 허브", html);
};


// ===== Hero x KRXA Map DB Integration v1 =====
window.KRXA_Recommend.mapDbHeroItems = [];
window.KRXA_Recommend.currentMapDbHeroIndex = 0;

window.KRXA_Recommend.loadMapDbHeroItems = async function () {
  try {
    const res = await fetch("/api/krxa-map-places");
    const data = await res.json();

    if (data.ok && data.items && data.items.length) {
      window.KRXA_Recommend.mapDbHeroItems = data.items;
      window.KRXA_Recommend.currentMapDbHeroIndex = 0;
      window.KRXA_Recommend.renderMapDbHero();
      return true;
    }
  } catch (e) {
    console.log("KRXA Map DB hero load failed", e);
  }
  return false;
};

window.KRXA_Recommend.renderMapDbHero = function () {
  const items = window.KRXA_Recommend.mapDbHeroItems || [];
  if (!items.length) return false;

  const item = items[window.KRXA_Recommend.currentMapDbHeroIndex % items.length];

  const titleEl = document.getElementById("discoveryHeroTitle");
  const subEl = document.getElementById("discoveryHeroSub");

  if (titleEl) titleEl.innerText = item.title || "KRXA 추천 장소";
  if (subEl) subEl.innerText = item.reason || item.source || "현재 위치 기준 추천 후보";

  return true;
};

window.KRXA_Recommend.rotateMapDbHero = function () {
  const items = window.KRXA_Recommend.mapDbHeroItems || [];
  if (!items.length) return false;

  window.KRXA_Recommend.currentMapDbHeroIndex =
    (window.KRXA_Recommend.currentMapDbHeroIndex + 1) % items.length;

  window.KRXA_Recommend.renderMapDbHero();
  return true;
};

window.KRXA_Recommend.openMapDbHeroItem = function () {
  const items = window.KRXA_Recommend.mapDbHeroItems || [];
  if (!items.length) return false;

  const item = items[window.KRXA_Recommend.currentMapDbHeroIndex % items.length];

  const place = {
    title: item.title,
    subtitle: item.region || "",
    reason: item.reason || "KRXA Map DB 기반 추천 후보입니다.",
    source: item.source || "KRXA Map DB",
    broadcast: item.source || "",
    keyword: item.map_keyword || item.title,
    map_keyword: item.map_keyword || item.title,
    address: item.address || "",
    phone: item.phone || "",
    route_hint: "현재 내 위치에서 이 장소까지 가는 방법을 확인합니다."
  };

  window.KRXA_Recommend.openPlaceRoute(place);
  return true;
};

// Hero 클릭 우선순위 재정의:
// 1순위 KRXA Map DB
// 2순위 Hero Cards
// 3순위 Discovery Places
window.KRXA_Recommend.openCurrentDiscoveryCard = function () {
  if (window.KRXA_Recommend.openMapDbHeroItem()) return;

  const cards = window.KRXA_Recommend.heroCards || [];
  if (cards.length) {
    const card = cards[window.KRXA_Recommend.currentHeroCardIndex % cards.length];

    const place = {
      title: card.title,
      subtitle: card.subtitle,
      reason: "관제 등록 Hero 카드 기반 추천입니다.",
      source: card.source || "Travel Hero Card",
      broadcast: card.source || "",
      keyword: card.keyword || card.map_keyword || card.title,
      map_keyword: card.map_keyword || card.keyword || card.title,
      route_hint: "현재 위치에서 교통수단을 선택해 확인합니다.",
      linked_group: card.linked_group || ""
    };

    if (card.linked_group && window.KRXA_Recommend.openPlaceGroup) {
      window.KRXA_Recommend.openPlaceGroup(card.linked_group, place);
      return;
    }

    window.KRXA_Recommend.openPlaceRoute(place);
    return;
  }

  if (window.KRXA_Recommend.discoveryPlaces && window.KRXA_Recommend.discoveryPlaces.length) {
    const place = window.KRXA_Recommend.discoveryPlaces[
      window.KRXA_Recommend.currentDiscoveryPlaceIndex %
      window.KRXA_Recommend.discoveryPlaces.length
    ];
    window.KRXA_Recommend.openPlaceRoute(place);
    return;
  }

  window.KRXA_Recommend.openMarketResearchV1();
};




// ===== Travel V1 Page2 Card + Mini M2M Final =====
window.KRXA_Recommend.openMiniM2M = function(){
  const html =
    "<p><b>말대말 미니 통역</b></p>" +
    "<p>현재 화면을 유지한 채 말하기 / 번역 / 닫기만 실행합니다.</p>" +
    "<textarea id='miniM2mText' style='width:100%;height:90px;border-radius:12px;padding:10px' placeholder='말하거나 번역할 내용을 입력하세요'></textarea>" +
    "<button class='btn green' style='width:100%;margin-top:8px' onclick='KRXA_Recommend.miniM2mSpeak()'>🎤 말하기</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick='KRXA_Recommend.miniM2mTranslate()'>🌐 번역</button>" +
    "<button class='btn blue' style='width:100%;margin-top:8px' onclick='KRXA_App.closeModal && KRXA_App.closeModal()'>닫기</button>" +
    "<div id='miniM2mResult' style='margin-top:10px;padding:10px;background:#f1f5f9;border-radius:12px;color:#0f172a'>대기 중</div>";

  if(window.KRXA_App && window.KRXA_App.openModal){
    window.KRXA_App.openModal("말대말", html);
  }else{
    alert("말대말 미니 모달 준비");
  }
};

window.KRXA_Recommend.miniM2mSpeak = function(){
  const box = document.getElementById("miniM2mResult");
  if(box) box.innerText = "말하기 준비 중입니다. 기존 말대말 음성 엔진과 연결됩니다.";
  if(window.KRXA_M2M && window.KRXA_M2M.startListening){
    window.KRXA_M2M.startListening();
  }
};

window.KRXA_Recommend.miniM2mTranslate = async function(){
  const text = (document.getElementById("miniM2mText") || {}).value || "";
  const box = document.getElementById("miniM2mResult");
  if(!text.trim()){
    if(box) box.innerText = "번역할 내용을 입력하세요.";
    return;
  }
  if(box) box.innerText = "번역 요청 중...";
  try{
    const res = await fetch("/api/translate", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text:text, target:"auto"})
    });
    const data = await res.json();
    if(box) box.innerText = data.result || data.text || JSON.stringify(data);
  }catch(e){
    if(box) box.innerText = "번역 실패: " + e.message;
  }
};

window.KRXA_Recommend.openPage2Card = function(kind){
  if(kind === "airport"){
    window.KRXA_Recommend.openFlightHub ? window.KRXA_Recommend.openFlightHub() : window.open("/travel-map?q=공항", "_blank");
    return;
  }

  if(kind === "hotel"){
    window.KRXA_Recommend.openServiceHub ? window.KRXA_Recommend.openServiceHub("hotel") : window.open("/travel-map?q=호텔", "_blank");
    return;
  }

  if(kind === "food"){
    if(window.KRXA_App && window.KRXA_App.goPage){
      window.KRXA_App.goPage(2);
    }else{
      window.location.hash = "food";
    }
    return;
  }

  if(kind === "transport"){
    window.KRXA_Recommend.openTransportHub ? window.KRXA_Recommend.openTransportHub() : window.open("/travel-map?q=교통", "_blank");
    return;
  }

  if(kind === "tour"){
    window.KRXA_Recommend.openMarketResearchV1 ? window.KRXA_Recommend.openMarketResearchV1() : window.open("/travel-map?q=관광지", "_blank");
    return;
  }

  if(kind === "shopping"){
    window.KRXA_Recommend.openServiceHub ? window.KRXA_Recommend.openServiceHub("shopping") : window.open("/travel-map?q=쇼핑 시장 마트", "_blank");
    return;
  }

  if(kind === "tv"){
    window.KRXA_Recommend.openMiniM2M();
    return;
  }

  if(kind === "call"){
    window.KRXA_Recommend.openMiniM2M();
    return;
  }

  if(kind === "photo"){
    window.KRXA_Recommend.openMiniM2M();
    return;
  }

  if(kind === "video"){
    alert("동영상 촬영 기능은 기기 카메라 권한 연결 후 활성화합니다.");
    return;
  }

  if(kind === "music"){
    alert("음악 기능은 현행 유지합니다.");
    return;
  }

  if(kind === "sos"){
    if(window.KRXA_App && window.KRXA_App.goPage){
      window.KRXA_App.goPage(7);
    }else{
      alert("SOS 긴급 페이지로 이동합니다.");
    }
    return;
  }
};

document.addEventListener("click", function(e){
  const text = (e.target.innerText || "").trim();

  if(text.includes("공항")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("airport"); }
  else if(text.includes("호텔")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("hotel"); }
  else if(text.includes("식당")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("food"); }
  else if(text.includes("교통")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("transport"); }
  else if(text.includes("관광")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("tour"); }
  else if(text.includes("쇼핑")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("shopping"); }
  else if(text.includes("TV")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("tv"); }
  else if(text.includes("통화")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("call"); }
  else if(text.includes("사진")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("photo"); }
  else if(text.includes("동영상")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("video"); }
  else if(text.includes("음악")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("music"); }
  else if(text.includes("SOS") || text.includes("긴급")){ e.preventDefault(); window.KRXA_Recommend.openPage2Card("sos"); }
}, true);


})();

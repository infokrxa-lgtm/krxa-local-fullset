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
    window.KRXA_Recommend.loadHeroCards();
    window.KRXA_Recommend.loadDiscoveryPlaces();
    setInterval(function(){
      if (!window.KRXA_Recommend.rotateHeroCard()) {
        window.KRXA_Recommend.rotateDiscoveryPlaceHero();
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


})();

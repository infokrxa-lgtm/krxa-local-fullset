/* KRXA Travel V1 - Recommend / Discovery / Service Hub Full Version */

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

  function esc(s) {
    return String(s || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function placeKeyword(place) {
    return place.map_keyword || place.keyword || place.address || place.title || "";
  }

  function openPlaceDir(place) {
    const q = placeKeyword(place);
    if (window.KRXA_DeviceContext && window.KRXA_DeviceContext.openMapDirections) {
      (window.KRXA_MapApps && window.KRXA_MapApps.openDir ? window.KRXA_MapApps.openDir(q) : window.KRXA_DeviceContext.openMapDirections(q));
    }
  }

  function openPlaceSearch(keyword) {
    if (window.KRXA_DeviceContext && window.KRXA_DeviceContext.openMapSearch) {
      (window.KRXA_MapApps && window.KRXA_MapApps.openSearch ? window.KRXA_MapApps.openSearch(keyword || "nearby places") : window.KRXA_DeviceContext.openMapSearch(keyword || "nearby places"));
    }
  }

  window.KRXA_Recommend.openPlaceRoute = function (place) {
    if (!place) return;

    const html =
      "<h3>" + esc(place.title || "추천 장소") + "</h3>" +
      "<p>" + esc(place.subtitle || "") + "</p>" +
      "<div class='msg'><b>추천 사유</b><span>" + esc(place.reason || "") + "</span></div>" +
      "<div class='msg'><b>출처</b><span>" + esc(place.source || place.broadcast || "LLM 시장조사") + "</span></div>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick='KRXA_Recommend.openPlaceDirFromJson(\"" +
      encodeURIComponent(JSON.stringify(place)) +
      "\")'>길찾기 Google Dir</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick='KRXA_Recommend.openMapSearchForKeyword(\"" +
      esc(placeKeyword(place)) +
      "\")'>지도보기 Google Search</button>";

    openModal("장소 이동", html);
  };

  window.KRXA_Recommend.openPlaceDirFromJson = function (encoded) {
    try {
      const place = JSON.parse(decodeURIComponent(encoded));
      openPlaceDir(place);
    } catch (e) {
      alert("장소 정보를 열 수 없습니다.");
    }
  };

  window.KRXA_Recommend.openMapSearchForKeyword = function (keyword) {
    openPlaceSearch(keyword || "nearby places");
  };

  window.KRXA_Recommend.openRecommendList = function (title, items, searchKeyword) {
    items = items || [];

    let html =
      "<p><b>" + esc(title || "추천 리스트") + "</b></p>" +
      "<p>장소를 클릭하면 현재 위치를 출발지로 Google 길찾기가 열립니다.</p>";

    items.slice(0, 5).forEach(function (place, idx) {
      html +=
        "<div class='msg' style='margin-top:10px;cursor:pointer' onclick='KRXA_Recommend.openPlaceDirFromJson(\"" +
        encodeURIComponent(JSON.stringify(place)) +
        "\")'>" +
        "<b>" + (idx + 1) + ". " + esc(place.title || "추천 장소") + "</b>" +
        "<span>" +
        esc(place.subtitle || place.address || "") +
        "<br><small>" + esc(place.reason || "") + "</small>" +
        "</span></div>";
    });

    html +=
      "<hr>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick='KRXA_Recommend.openMapSearchForKeyword(\"" +
      esc(searchKeyword || title || "nearby places") +
      "\")'>지도보기 Google Search</button>";

    openModal(title || "추천 리스트", html);
  };

  window.KRXA_Recommend.showMarketCards = async function (category, keyword) {
    const ctx = getCtx();

    try {
      const res = await fetch("/api/recommend-market", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          category: category,
          keyword: keyword,
          lat: ctx.lat || "",
          lng: ctx.lng || "",
          language: ctx.language || "ko",
          country: ctx.country || "",
          city: ctx.city || "",
          place: ctx.place || ""
        })
      });

      const data = await res.json();
      const cards = data.cards || data.items || [];

      const places = cards.map(function (card) {
        return {
          title: card.title || card.name || keyword,
          subtitle: card.desc || card.subtitle || card.address || "",
          reason: card.reason || "현재 위치 기반 LLM 시장조사 추천 후보입니다.",
          source: card.source || "LLM 시장조사",
          keyword: card.map_keyword || card.keyword || card.title || keyword,
          map_keyword: card.map_keyword || card.keyword || card.title || keyword,
          address: card.address || "",
          phone: card.phone || ""
        };
      });

      if (places.length) {
        window.KRXA_Recommend.openRecommendList(keyword || "추천 장소", places, keyword);
        return;
      }
    } catch (e) {
      console.log("recommend market failed", e);
    }

    window.KRXA_Recommend.openRecommendList(keyword || "추천 장소", [
      {
        title: keyword || "주변 추천 장소",
        subtitle: "Google 지도 검색으로 확인",
        reason: "LLM 추천 API 연결 전 기본 검색 후보입니다.",
        source: "Google Search fallback",
        map_keyword: keyword || "nearby places"
      }
    ], keyword || "nearby places");
  };

  window.KRXA_Recommend.openMarketResearchV1 = function () {
    const html =
      "<p><b>현재 위치 기반 추천</b></p>" +
      "<p>LLM 시장조사 후 추천 장소 5개를 보여줍니다.</p>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('food','주변 맛집')\">맛집 추천</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('hotel','주변 호텔')\">호텔 추천</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('attraction','주변 관광지')\">관광지 추천</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.showMarketCards('shopping','주변 쇼핑')\">쇼핑 추천</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"KRXA_Recommend.openTransportHub()\">교통 허브</button>";

    openModal("현재 위치 추천", html);
  };

  window.KRXA_Recommend.openTransportHub = function () {
    const html =
      "<p><b>교통 허브</b></p>" +
      "<p>목적지를 입력하면 현재 위치를 출발지로 길찾기합니다.</p>" +
      "<input id='krxaTransportDest' placeholder='목적지 입력 예: 인천공항, 강남역, 호텔명' style='width:100%;margin-top:8px;padding:10px;border-radius:10px'>" +
      "<button class='btn green' style='width:100%;margin-top:8px' onclick='KRXA_Recommend.openTransportDir()'>길찾기 Google Dir</button>" +
      "<button class='btn blue' style='width:100%;margin-top:8px' onclick='KRXA_Recommend.openTransportSearch()'>교통 주변보기 Google Search</button>";

    openModal("교통 허브", html);
  };

  window.KRXA_Recommend.openTransportDir = function () {
    const el = document.getElementById("krxaTransportDest");
    const dest = el && el.value ? el.value.trim() : "";
    if (!dest) {
      alert("목적지를 입력하세요.");
      return;
    }
    if (window.KRXA_DeviceContext && window.KRXA_DeviceContext.openMapDirections) {
      (window.KRXA_MapApps && window.KRXA_MapApps.openDir ? window.KRXA_MapApps.openDir(dest) : window.KRXA_DeviceContext.openMapDirections(dest));
    }
  };

  window.KRXA_Recommend.openTransportSearch = function () {
    const el = document.getElementById("krxaTransportDest");
    const q = el && el.value ? el.value.trim() : "nearby transport";
    openPlaceSearch(q + " 교통");
  };

  window.KRXA_Recommend.openHeroBaekban = function () {
    const items = [
      {
        title: "늘봄집 수서본점",
        subtitle: "서울 강남 · 북어 요리",
        reason: "허영만 백반기행 관련 검색 후보",
        source: "Hero Card",
        map_keyword: "늘봄집 수서본점"
      },
      {
        title: "최가네백반기행",
        subtitle: "부천 · 한식",
        reason: "지도 검색 결과 기반 후보",
        source: "Hero Card",
        map_keyword: "최가네백반기행"
      },
      {
        title: "허영만 백반기행 맛집",
        subtitle: "현재 위치 주변",
        reason: "현재 위치 주변 전체 후보 검색",
        source: "Google Search fallback",
        map_keyword: "허영만 백반기행 맛집"
      }
    ];

    window.KRXA_Recommend.openRecommendList("허영만 백반기행 맛집 리스트", items, "허영만 백반기행 맛집");
  };

  window.KRXA_Recommend.openCurrentDiscoveryCard = function () {
    window.KRXA_Recommend.openHeroBaekban();
  };

  window.KRXA_Recommend.openPage2Card = function (kind) {
    if (kind === "airport" || kind === "music" || kind === "tv" || kind === "call" || kind === "photo" || kind === "video") {
      alert("현재 기능은 유지합니다. 추후 개선 대상입니다.");
      return;
    }

    if (kind === "hotel") {
      window.KRXA_Recommend.showMarketCards("hotel", "주변 호텔");
      return;
    }

    if (kind === "food") {
      window.KRXA_Recommend.showMarketCards("food", "주변 맛집");
      return;
    }

    if (kind === "route") {
      window.KRXA_Recommend.openTransportHub();
      return;
    }

    if (kind === "tour") {
      window.KRXA_Recommend.showMarketCards("attraction", "주변 관광지");
      return;
    }

    if (kind === "shopping") {
      window.KRXA_Recommend.showMarketCards("shopping", "주변 쇼핑");
      return;
    }

    if (kind === "transport") {
      window.KRXA_Recommend.openTransportHub();
      return;
    }

    window.KRXA_Recommend.openMarketResearchV1();
  };

  document.addEventListener("click", function (e) {
    const text = (e.target.innerText || "").trim();

    if (!text) return;

    if (text.includes("허영만") || text.includes("둘러보기")) {
      e.preventDefault();
      window.KRXA_Recommend.openHeroBaekban();
    } else if (text.includes("호텔")) {
      e.preventDefault();
      window.KRXA_Recommend.openPage2Card("hotel");
    } else if (text.includes("식당") || text.includes("맛집")) {
      e.preventDefault();
      window.KRXA_Recommend.openPage2Card("food");
    } else if (text.includes("교통")) {
      e.preventDefault();
      window.KRXA_Recommend.openPage2Card("transport");
    } else if (text.includes("길찾기")) {
      e.preventDefault();
      window.KRXA_Recommend.openPage2Card("route");
    } else if (text.includes("관광")) {
      e.preventDefault();
      window.KRXA_Recommend.openPage2Card("tour");
    } else if (text.includes("쇼핑")) {
      e.preventDefault();
      window.KRXA_Recommend.openPage2Card("shopping");
    }
  }, true);

// KRXA Map Apps user manager entry
window.KRXA_Recommend.openUserMapAppsManager = function () {
  if (window.KRXA_MapApps && window.KRXA_MapApps.openUserMapManager) {
    window.KRXA_MapApps.openUserMapManager();
  } else {
    alert("지도앱 관리 기능을 불러오지 못했습니다.");
  }
};

})();
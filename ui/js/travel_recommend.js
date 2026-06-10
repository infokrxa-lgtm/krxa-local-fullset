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
})();
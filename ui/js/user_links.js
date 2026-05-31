/* KRXA Travel V1 - User Links Engine
   역할:
   - 여행 메뉴별 사용자 사이트 등록/삭제/조회
   - localStorage 우선 저장
   - 추후 /api/travel-links 연동 가능
   - 공항/호텔/식당/교통/길찾기/관광/쇼핑/음악 공통 적용
*/

(function () {
  const STORAGE_KEY = "krxa_travel_user_links_v1";

  const DEFAULT_LINKS = {
    airport: [
      { name: "Google Maps 공항", url: "https://www.google.com/maps/search/airport" },
      { name: "공항철도 검색", url: "https://www.google.com/maps/search/airport+train" },
      { name: "환전소 검색", url: "https://www.google.com/maps/search/currency+exchange" }
    ],
    hotel: [
      { name: "Booking.com", url: "https://www.booking.com" },
      { name: "Agoda", url: "https://www.agoda.com" },
      { name: "Trip.com", url: "https://www.trip.com" }
    ],
    food: [
      { name: "Google Maps 식당", url: "https://www.google.com/maps/search/restaurants" },
      { name: "Tripadvisor Restaurants", url: "https://www.tripadvisor.com/Restaurants" },
      { name: "Yelp", url: "https://www.yelp.com" }
    ],
    taxi: [
      { name: "Google Maps 교통", url: "https://www.google.com/maps" },
      { name: "Uber", url: "https://www.uber.com" },
      { name: "Kakao T", url: "https://www.kakaomobility.com" }
    ],
    route: [
      { name: "Google Maps", url: "https://www.google.com/maps" },
      { name: "Naver Map", url: "https://map.naver.com" },
      { name: "Kakao Map", url: "https://map.kakao.com" }
    ],
    tour: [
      { name: "YouTube", url: "https://www.youtube.com" },
      { name: "TikTok", url: "https://www.tiktok.com" },
      { name: "Klook", url: "https://www.klook.com" },
      { name: "KKday", url: "https://www.kkday.com" }
    ],
    shopping: [
      { name: "Google Maps 쇼핑", url: "https://www.google.com/maps/search/shopping" },
      { name: "Amazon", url: "https://www.amazon.com" },
      { name: "AliExpress", url: "https://www.aliexpress.com" }
    ],
    music: [
      { name: "YouTube Music", url: "https://music.youtube.com" },
      { name: "Spotify", url: "https://open.spotify.com" },
      { name: "Apple Music", url: "https://music.apple.com" },
      { name: "Melon", url: "https://www.melon.com" }
    ],
    call: [
      { name: "WhatsApp", url: "https://wa.me/" },
      { name: "WeChat", url: "https://www.wechat.com" }
    ],
    sos: [
      { name: "주변 병원", url: "https://www.google.com/maps/search/hospital" },
      { name: "주변 경찰서", url: "https://www.google.com/maps/search/police" },
      { name: "대사관 검색", url: "https://www.google.com/search?q=nearest+embassy" }
    ]
  };

  function loadAllUserLinks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return parsed;
    } catch (e) {
      return {};
    }
  }

  function saveAllUserLinks(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data || {}));
  }

  function normalizeUrl(url) {
    const value = String(url || "").trim();

    if (!value) return "";

    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("tel:") ||
      value.startsWith("mailto:")
    ) {
      return value;
    }

    return "https://" + value;
  }

  function getDefaultLinks(category) {
    return DEFAULT_LINKS[category] ? DEFAULT_LINKS[category].slice() : [];
  }

  function getUserLinks(category) {
    const all = loadAllUserLinks();
    const list = all[category];

    if (!Array.isArray(list)) return [];

    return list.filter(function (x) {
      return x && x.name && x.url;
    });
  }

  function getLinks(category) {
    return getDefaultLinks(category).concat(getUserLinks(category));
  }

  function addLink(category, name, url) {
    const cleanName = String(name || "").trim();
    const cleanUrl = normalizeUrl(url);

    if (!category || !cleanName || !cleanUrl) {
      return {
        ok: false,
        message: "카테고리, 사이트명, URL을 확인하세요."
      };
    }

    const all = loadAllUserLinks();

    if (!Array.isArray(all[category])) {
      all[category] = [];
    }

    all[category].push({
      name: cleanName,
      url: cleanUrl,
      createdAt: new Date().toISOString()
    });

    saveAllUserLinks(all);

    return {
      ok: true,
      message: "링크가 추가되었습니다.",
      links: getLinks(category)
    };
  }

  function deleteUserLink(category, userIndex) {
    const all = loadAllUserLinks();

    if (!Array.isArray(all[category])) {
      return {
        ok: false,
        message: "삭제할 사용자 링크가 없습니다."
      };
    }

    const idx = Number(userIndex);

    if (Number.isNaN(idx) || idx < 0 || idx >= all[category].length) {
      return {
        ok: false,
        message: "삭제 번호가 올바르지 않습니다."
      };
    }

    all[category].splice(idx, 1);
    saveAllUserLinks(all);

    return {
      ok: true,
      message: "링크가 삭제되었습니다.",
      links: getLinks(category)
    };
  }

  function clearCategory(category) {
    const all = loadAllUserLinks();

    if (all[category]) {
      delete all[category];
      saveAllUserLinks(all);
    }

    return {
      ok: true,
      message: "해당 카테고리 사용자 링크가 초기화되었습니다."
    };
  }

  function openLink(url) {
    const cleanUrl = normalizeUrl(url);

    if (!cleanUrl) {
      alert("URL이 없습니다.");
      return;
    }

    window.open(cleanUrl, "_blank");
  }

  function buildLinksHtml(category) {
    const defaultLinks = getDefaultLinks(category);
    const userLinks = getUserLinks(category);

    let html = "";

    html += "<div class='linkGroup'>";
    html += "<b>기본 추천앱</b>";

    if (!defaultLinks.length) {
      html += "<p>기본 추천앱이 없습니다.</p>";
    }

    defaultLinks.forEach(function (link, i) {
      html +=
        "<div class='linkItem'>" +
        "<span>" +
        link.name +
        "</span>" +
        "<button class='btn blue' onclick=\"KRXA_UserLinks.open('" +
        link.url.replace(/'/g, "\\'") +
        "')\">열기</button>" +
        "</div>";
    });

    html += "</div>";

    html += "<div class='linkGroup' style='margin-top:10px'>";
    html += "<b>내가 등록한 사이트</b>";

    if (!userLinks.length) {
      html += "<p>등록된 사용자 사이트가 없습니다.</p>";
    }

    userLinks.forEach(function (link, i) {
      html +=
        "<div class='linkItem'>" +
        "<span>" +
        i +
        ". " +
        link.name +
        "</span>" +
        "<button class='btn blue' onclick=\"KRXA_UserLinks.open('" +
        link.url.replace(/'/g, "\\'") +
        "')\">열기</button>" +
        "</div>";
    });

    html += "</div>";

    return html;
  }

  function buildManagerHtml(category) {
    let html = "";

    html += "<div>";
    html += "<p><b>사용자 사이트 등록/삭제</b></p>";
    html += buildLinksHtml(category);

    html += "<hr>";
    html += "<input id='userLinkNameInput' placeholder='사이트명'>";
    html += "<input id='userLinkUrlInput' placeholder='https://...'>";
    html +=
      "<button class='btn blue' style='width:100%;margin-top:6px' onclick=\"KRXA_UserLinks.addFromInputs('" +
      category +
      "')\">추가</button>";

    html += "<input id='userLinkDeleteIndexInput' placeholder='삭제 번호 예: 0'>";
    html +=
      "<button class='btn red' style='width:100%;margin-top:6px' onclick=\"KRXA_UserLinks.deleteFromInput('" +
      category +
      "')\">삭제</button>";
    html += "</div>";

    return html;
  }

  function addFromInputs(category) {
    const nameEl = document.getElementById("userLinkNameInput");
    const urlEl = document.getElementById("userLinkUrlInput");

    const result = addLink(
      category,
      nameEl ? nameEl.value : "",
      urlEl ? urlEl.value : ""
    );

    alert(result.message);

    if (result.ok && window.KRXA_App && window.KRXA_App.refreshLinkManager) {
      window.KRXA_App.refreshLinkManager(category);
    }
  }

  function deleteFromInput(category) {
    const idxEl = document.getElementById("userLinkDeleteIndexInput");

    const result = deleteUserLink(category, idxEl ? idxEl.value : "");

    alert(result.message);

    if (result.ok && window.KRXA_App && window.KRXA_App.refreshLinkManager) {
      window.KRXA_App.refreshLinkManager(category);
    }
  }

  window.KRXA_UserLinks = {
    getDefaultLinks: getDefaultLinks,
    getUserLinks: getUserLinks,
    getLinks: getLinks,
    add: addLink,
    delete: deleteUserLink,
    clearCategory: clearCategory,
    open: openLink,
    buildLinksHtml: buildLinksHtml,
    buildManagerHtml: buildManagerHtml,
    addFromInputs: addFromInputs,
    deleteFromInput: deleteFromInput
  };
})();
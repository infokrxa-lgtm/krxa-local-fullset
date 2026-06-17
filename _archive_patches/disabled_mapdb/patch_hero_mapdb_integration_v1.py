from pathlib import Path

p = Path("ui/js/travel_recommend.js")
s = p.read_text(encoding="utf-8")

insert = r'''
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
'''

if "Hero x KRXA Map DB Integration v1" not in s:
    s = s.replace("})();", insert + "\n\n})();")

# boot에 Map DB 로드 추가
if "loadMapDbHeroItems();" not in s:
    s = s.replace(
        "window.KRXA_Recommend.loadHeroCards();",
        "window.KRXA_Recommend.loadMapDbHeroItems();\n    window.KRXA_Recommend.loadHeroCards();"
    )

# 회전 우선순위 MapDB > HeroCards > Discovery
old = """if (!window.KRXA_Recommend.rotateHeroCard()) {
        window.KRXA_Recommend.rotateDiscoveryPlaceHero();
      }"""
new = """if (!window.KRXA_Recommend.rotateMapDbHero()) {
        if (!window.KRXA_Recommend.rotateHeroCard()) {
          window.KRXA_Recommend.rotateDiscoveryPlaceHero();
        }
      }"""

if old in s:
    s = s.replace(old, new)

p.write_text(s, encoding="utf-8")
print("Hero x KRXA Map DB Integration v1 applied.")
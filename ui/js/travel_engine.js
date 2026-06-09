/* KRXA Travel V1 - Travel Engine
   역할:
   - 여행 허브 메뉴 데이터 관리
   - 공항/호텔/식당/교통/길찾기/관광/쇼핑/음악 상세 안내 구성
   - 각 항목 클릭 시 새 안내창 내용 제공
   - 사진/동영상/말하기 공통바 연결
*/

(function () {
  const MENU_DATA = {
    airport: {
      label: "공항",
      icon: "✈️",
      subtitle: "입국·환전·유심",
      localBased: true,
      items: [
        {
          label: "입국심사",
          guide: [
            "여권과 입국 관련 서류를 준비합니다.",
            "입국신고서가 있으면 이름, 여권번호, 숙소 주소, 방문 목적을 확인합니다.",
            "모르는 항목은 사진찍기 또는 말하기로 도움을 받을 수 있습니다."
          ],
          phrases: [
            "입국심사는 어디로 가나요?",
            "이 칸에는 무엇을 적어야 하나요?",
            "호텔 주소를 보여드리겠습니다."
          ]
        },
        {
          label: "수하물",
          guide: [
            "도착 항공편 번호와 수하물 벨트 번호를 확인합니다.",
            "짐이 나오지 않으면 항공사 수하물 데스크로 이동합니다.",
            "수하물 표 사진을 찍어 안내를 받을 수 있습니다."
          ],
          phrases: [
            "제 짐이 나오지 않았습니다.",
            "수하물 찾는 곳은 어디인가요?"
          ]
        },
        {
          label: "환전",
          guide: [
            "공항 환전소 또는 ATM 위치를 확인합니다.",
            "카드 사용 가능 여부와 수수료를 확인합니다.",
            "환율은 외부 사이트 또는 현지 환전소 기준을 확인합니다."
          ],
          phrases: [
            "환전소는 어디인가요?",
            "카드 사용할 수 있나요?"
          ]
        },
        {
          label: "유심/eSIM",
          guide: [
            "현지 SIM 또는 eSIM 판매처를 확인합니다.",
            "데이터 용량, 기간, 가격을 확인합니다.",
            "설치 화면은 사진으로 찍어 안내 받을 수 있습니다."
          ],
          phrases: [
            "eSIM을 설치하고 싶습니다.",
            "데이터만 되는 요금제가 있나요?"
          ]
        },
        {
          label: "공항철도",
          guide: [
            "현재 위치에서 공항철도 역 위치를 확인합니다.",
            "목적지까지 노선과 소요 시간을 지도 앱으로 확인합니다."
          ],
          searchKeyword: "airport train"
        },
        {
          label: "공항버스",
          guide: [
            "목적지 방향 공항버스 정류장을 확인합니다.",
            "버스 번호, 요금, 막차 시간을 확인합니다."
          ],
          searchKeyword: "airport bus"
        },
        {
          label: "택시",
          guide: [
            "공식 택시 승차장으로 이동합니다.",
            "목적지 주소를 기사에게 보여줍니다.",
            "요금과 결제 방법을 확인합니다."
          ],
          phrases: [
            "이 주소로 가 주세요.",
            "카드 결제 가능합니까?"
          ],
          searchKeyword: "taxi stand"
        }
      ],
      defaultLinks: [
        { name: "Google Maps 공항", url: "https://www.google.com/maps/search/airport" },
        { name: "공항철도 검색", url: "https://www.google.com/maps/search/airport+train" },
        { name: "환전소 검색", url: "https://www.google.com/maps/search/currency+exchange" }
      ]
    },

    hotel: {
      label: "호텔",
      icon: "🏨",
      subtitle: "예약·체크인",
      localBased: true,
      items: [
        {
          label: "예약확인",
          guide: [
            "예약자 이름과 예약번호를 준비합니다.",
            "여권을 제시해야 할 수 있습니다.",
            "예약 앱 화면을 보여주면 빠릅니다."
          ],
          phrases: [
            "예약 확인 부탁드립니다.",
            "제 이름으로 예약되어 있습니다."
          ]
        },
        {
          label: "체크인",
          guide: [
            "체크인 시간과 보증금 여부를 확인합니다.",
            "조식, 와이파이, 객실 위치를 확인합니다."
          ],
          phrases: [
            "체크인하고 싶습니다.",
            "와이파이 비밀번호가 무엇인가요?"
          ]
        },
        {
          label: "체크아웃",
          guide: [
            "체크아웃 시간과 추가 요금 여부를 확인합니다.",
            "짐 보관 가능 여부를 물어볼 수 있습니다."
          ],
          phrases: [
            "체크아웃하고 싶습니다.",
            "짐을 잠시 맡길 수 있나요?"
          ]
        },
        {
          label: "편의시설",
          guide: [
            "조식, 세탁, 피트니스, 수영장, 셔틀버스 정보를 확인합니다."
          ],
          phrases: [
            "조식은 어디에서 먹나요?",
            "세탁 서비스가 있나요?"
          ]
        }
      ],
      defaultLinks: [
        { name: "Booking.com", url: "https://www.booking.com" },
        { name: "Agoda", url: "https://www.agoda.com" },
        { name: "Trip.com", url: "https://www.trip.com" }
      ]
    },

    food: {
      label: "식당",
      icon: "🍜",
      subtitle: "주변·메뉴",
      localBased: true,
      items: [
        {
          label: "주변 식당",
          guide: [
            "현재 위치 기준 주변 식당을 지도 앱에서 확인합니다.",
            "리뷰와 영업시간을 확인합니다."
          ],
          searchKeyword: "restaurants near me"
        },
        {
          label: "메뉴번역",
          guide: [
            "메뉴판을 사진으로 찍어 번역합니다.",
            "모르는 음식명은 사진과 함께 확인합니다."
          ],
          phrases: [
            "이 메뉴는 어떤 음식인가요?",
            "추천 메뉴가 무엇인가요?"
          ]
        },
        {
          label: "음식정보",
          guide: [
            "음식 사진을 찍으면 음식명, 재료, 알레르기 가능성을 확인하는 흐름으로 사용합니다.",
            "최종 판단은 사용자와 식당 직원 확인이 필요합니다."
          ],
          phrases: [
            "이 음식에 돼지고기가 들어가나요?",
            "이 음식은 맵나요?"
          ]
        },
        {
          label: "주문하기",
          guide: [
            "먹고 싶은 메뉴를 선택한 뒤 주문 문장을 보여줍니다."
          ],
          phrases: [
            "이것 하나 주세요.",
            "덜 맵게 해 주세요."
          ]
        },
        {
          label: "계산하기",
          guide: [
            "계산서 요청, 카드 결제, 영수증 요청 문장을 제공합니다."
          ],
          phrases: [
            "계산서 주세요.",
            "카드 결제 가능합니까?"
          ]
        }
      ],
      defaultLinks: [
        { name: "Google Maps 식당", url: "https://www.google.com/maps/search/restaurants" },
        { name: "Tripadvisor Restaurants", url: "https://www.tripadvisor.com/Restaurants" },
        { name: "Yelp", url: "https://www.yelp.com" }
      ]
    },

    taxi: {
      label: "교통",
      icon: "🚕",
      subtitle: "택시·버스",
      localBased: true,
      items: [
        {
          label: "택시",
          guide: [
            "현재 위치에서 가까운 택시 승차장 또는 호출 앱을 확인합니다.",
            "목적지 주소를 기사에게 보여줍니다."
          ],
          phrases: [
            "이 주소로 가 주세요.",
            "얼마나 걸리나요?"
          ],
          searchKeyword: "taxi near me"
        },
        {
          label: "버스",
          guide: [
            "현재 위치 주변 버스 정류장과 목적지 방향 노선을 확인합니다."
          ],
          searchKeyword: "bus stop near me"
        },
        {
          label: "지하철",
          guide: [
            "현재 위치 주변 지하철역과 목적지까지 노선을 확인합니다."
          ],
          searchKeyword: "subway station near me"
        },
        {
          label: "교통카드",
          guide: [
            "현지 교통카드 구매와 충전 방법을 확인합니다."
          ],
          phrases: [
            "교통카드는 어디에서 살 수 있나요?",
            "충전하고 싶습니다."
          ]
        }
      ],
      defaultLinks: [
        { name: "Google Maps 교통", url: "https://www.google.com/maps" },
        { name: "Uber", url: "https://www.uber.com" },
        { name: "Kakao T", url: "https://www.kakaomobility.com" }
      ]
    },

    route: {
      label: "길찾기",
      icon: "🗺️",
      subtitle: "GPS·지도",
      localBased: true,
      items: [
        {
          label: "목적지 입력",
          guide: [
            "현재 위치는 기기 GPS를 기준으로 사용합니다.",
            "목적지만 입력하면 지도 앱으로 연결합니다."
          ]
        },
        {
          label: "Google Maps",
          guide: [
            "Google Maps를 새 창으로 열어 경로를 확인합니다."
          ],
          link: "https://www.google.com/maps"
        },
        {
          label: "Naver Map",
          guide: [
            "Naver Map을 새 창으로 엽니다."
          ],
          link: "https://map.naver.com"
        },
        {
          label: "Kakao Map",
          guide: [
            "Kakao Map을 새 창으로 엽니다."
          ],
          link: "https://map.kakao.com"
        },
        {
          label: "택시 문장",
          guide: [
            "기사에게 보여줄 목적지 전달 문장을 생성합니다."
          ],
          phrases: [
            "이 주소로 가 주세요.",
            "여기에서 내려 주세요."
          ]
        }
      ],
      defaultLinks: [
        { name: "Google Maps", url: "https://www.google.com/maps" },
        { name: "Naver Map", url: "https://map.naver.com" },
        { name: "Kakao Map", url: "https://map.kakao.com" }
      ]
    },

    tour: {
      label: "관광",
      icon: "📷",
      subtitle: "사진·영상",
      localBased: true,
      items: [
        {
          label: "주변 관광지",
          guide: [
            "현재 위치 기준 주변 관광지를 확인합니다."
          ],
          searchKeyword: "tourist attractions near me"
        },
        {
          label: "YouTube",
          guide: [
            "관광지 관련 영상을 검색합니다."
          ],
          link: "https://www.youtube.com"
        },
        {
          label: "TikTok",
          guide: [
            "현지 여행 짧은 영상을 확인합니다."
          ],
          link: "https://www.tiktok.com"
        },
        {
          label: "티켓",
          guide: [
            "입장권, 체험권, 투어 예약 사이트로 연결합니다."
          ]
        }
      ],
      defaultLinks: [
        { name: "YouTube", url: "https://www.youtube.com" },
        { name: "TikTok", url: "https://www.tiktok.com" },
        { name: "Klook", url: "https://www.klook.com" },
        { name: "KKday", url: "https://www.kkday.com" }
      ]
    },

    shopping: {
      label: "쇼핑",
      icon: "🛍️",
      subtitle: "상품·라벨",
      localBased: true,
      items: [
        {
          label: "상품 라벨",
          guide: [
            "상품 라벨을 사진으로 찍어 번역합니다.",
            "성분, 용량, 사용법을 확인합니다."
          ]
        },
        {
          label: "가격 확인",
          guide: [
            "가격표, 할인 조건, 세금 포함 여부를 확인합니다."
          ]
        },
        {
          label: "환불 문의",
          guide: [
            "환불 가능 여부와 영수증 필요 여부를 확인합니다."
          ],
          phrases: [
            "환불할 수 있나요?",
            "영수증이 필요합니까?"
          ]
        },
        {
          label: "세금 환급",
          guide: [
            "Tax refund 안내문을 확인하고 작성법을 안내받습니다."
          ]
        }
      ],
      defaultLinks: [
        { name: "Google Maps 쇼핑", url: "https://www.google.com/maps/search/shopping" },
        { name: "Amazon", url: "https://www.amazon.com" },
        { name: "AliExpress", url: "https://www.aliexpress.com" }
      ]
    },

    music: {
      label: "음악",
      icon: "🎵",
      subtitle: "플레이리스트",
      localBased: false,
      items: [
        {
          label: "YouTube Music",
          guide: [
            "YouTube Music으로 연결합니다."
          ],
          link: "https://music.youtube.com"
        },
        {
          label: "Spotify",
          guide: [
            "Spotify로 연결합니다."
          ],
          link: "https://open.spotify.com"
        },
        {
          label: "Apple Music",
          guide: [
            "Apple Music으로 연결합니다."
          ],
          link: "https://music.apple.com"
        },
        {
          label: "Melon",
          guide: [
            "Melon으로 연결합니다."
          ],
          link: "https://www.melon.com"
        }
      ],
      defaultLinks: [
        { name: "YouTube Music", url: "https://music.youtube.com" },
        { name: "Spotify", url: "https://open.spotify.com" },
        { name: "Apple Music", url: "https://music.apple.com" },
        { name: "Melon", url: "https://www.melon.com" }
      ]
    }
  };

  function getMenu(category) {
    return MENU_DATA[category] || MENU_DATA.airport;
  }

  function getAllMenus() {
    return MENU_DATA;
  }

  function buildGuideHtml(category, itemLabel) {
    const menu = getMenu(category);
    const item = (menu.items || []).find(function (x) {
      return x.label === itemLabel;
    });

    if (!item) {
      return "<p>안내 정보를 찾을 수 없습니다.</p>";
    }

    let html = "";
    html += "<p><b>" + item.label + " 안내</b></p>";

    if (item.guide && item.guide.length) {
      html += "<ul>";
      item.guide.forEach(function (g) {
        html += "<li>" + g + "</li>";
      });
      html += "</ul>";
    }

    if (item.phrases && item.phrases.length) {
      html += "<p><b>자주 쓰는 문장</b></p>";
      html += "<ul>";
      item.phrases.forEach(function (p) {
        html += "<li>" + p + "</li>";
      });
      html += "</ul>";
    }

    if (item.searchKeyword && window.KRXA_DeviceContext) {
      html +=
        "<button class='btn blue' style='width:100%;margin-top:6px' onclick=\"window.open(window.KRXA_DeviceContext.buildGoogleMapsSearchUrl('" +
        item.searchKeyword.replace(/'/g, "\\'") +
        "'),'_blank')\">위치 기반 검색</button>";
    }

    if (item.link) {
      html +=
        "<button class='btn blue' style='width:100%;margin-top:6px' onclick=\"window.open('" +
        item.link +
        "','_blank')\">사이트 열기</button>";
    }

    html +=
      "<button class='btn blue' style='width:100%;margin-top:6px' onclick=\"KRXA_App.openMedia('photo')\">📷 사진찍기</button>";
    html +=
      "<button class='btn blue' style='width:100%;margin-top:6px' onclick=\"KRXA_App.openMedia('video')\">🎥 동영상촬영</button>";
    html +=
      "<button class='btn green' style='width:100%;margin-top:6px' onclick=\"KRXA_Translate.openQuickInput()\">🎙 말하기</button>";

    return html;
  }

  window.KRXA_TravelEngine = {
    getMenu: getMenu,
    getAllMenus: getAllMenus,
    buildGuideHtml: buildGuideHtml
  };
})();

// ===== Travel V1 Home quick actions =====
(function () {
  window.KRXA_App = window.KRXA_App || {};

  window.KRXA_App.openTravelInspiration = function () {
    window.open(
      "https://www.google.com/search?q=" +
        encodeURIComponent("주변 관광지 체험 여행지"),
      "_blank"
    );
  };

  window.KRXA_App.openTransport = function () {
    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal(
        "교통 선택",
        "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://www.google.com/search?q=nearby+airport+transport','_blank')\">✈️ 항공 / 공항 이동</button>" +
          "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://www.google.com/search?q=nearby+subway+station','_blank')\">🚇 지하철</button>" +
          "<button class='btn blue' style='width:100%;margin-top:8px' onclick=\"window.open('https://www.google.com/search?q=nearby+bus+stop','_blank')\">🚌 버스</button>" +
          "<button class='btn green' style='width:100%;margin-top:8px' onclick=\"window.open('https://www.google.com/search?q=nearby+taxi','_blank')\">🚕 택시</button>"
      );
      return;
    }

    window.open("https://www.google.com/search?q=nearby+transportation", "_blank");
  };
})();
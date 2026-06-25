/* PATCH29 Travel Recommendation Data Layer v1 */
(function(){
  const SITE_PROVIDER = {
    airport: [
      ["Google Flights","https://www.google.com/travel/flights"],
      ["Skyscanner","https://www.skyscanner.com"],
      ["인천공항","https://www.airport.kr"],
      ["공항철도","https://www.arex.or.kr"]
    ],
    hotel: [
      ["Google Hotels","https://www.google.com/travel/hotels"],
      ["Agoda","https://www.agoda.com"],
      ["Booking.com","https://www.booking.com"],
      ["Hotels.com","https://kr.hotels.com"]
    ],
    tour: [
      ["Google Travel","https://www.google.com/travel"],
      ["Visit Korea","https://korean.visitkorea.or.kr"],
      ["Google Maps 관광","https://www.google.com/maps/search/관광지"]
    ],
    shopping: [
      ["Google Maps 쇼핑","https://www.google.com/maps/search/쇼핑"],
      ["Naver 쇼핑","https://shopping.naver.com"],
      ["Google Search 쇼핑","https://www.google.com/search?q=shopping+near+me"]
    ],
    food: [
      ["Google Maps 맛집","https://www.google.com/maps/search/맛집"],
      ["Naver Map","https://map.naver.com"],
      ["Kakao Map","https://map.kakao.com"]
    ]
  };

  const RECOMMEND_PROVIDER = {
    airport: ["가까운 공항", "공항철도", "공항버스", "국내선 공항", "국제공항"],
    hotel: ["주변 호텔", "가까운 숙소", "가성비 호텔", "가족 호텔", "오늘 예약 가능한 호텔"],
    tour: ["주변 관광지", "근처 명소", "지역축제", "사진 명소", "야경 명소"],
    shopping: ["주변 쇼핑", "근처 쇼핑몰", "시장", "편의점", "마트"],
    food: ["주변 맛집", "한식 맛집", "백반 맛집", "현지인 맛집", "허영만 백반기행 맛집"]
  };

  function sites(type){
    return SITE_PROVIDER[type] || SITE_PROVIDER.food;
  }

  function recommendations(type){
    return RECOMMEND_PROVIDER[type] || RECOMMEND_PROVIDER.food;
  }

  window.KRXA_TravelRecommendationDataLayer = {
    sites,
    recommendations
  };
})();
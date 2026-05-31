/* KRXA Travel V1 - Service Worker
   역할:
   - PWA 설치 후 기본 캐시
   - 앱 재방문 속도 향상
   - 네트워크 불안정 시 기본 화면 유지
   - 오프라인 생존 문장 페이지 접근 보조
*/

const KRXA_CACHE_NAME = "krxa-travel-v1-cache-001";

const KRXA_CACHE_FILES = [
  "/app?service=travel",
  "/manifest.json",
  "/service-worker.js",
  "/js/travel_context.js",
  "/js/travel_engine.js",
  "/js/user_links.js",
  "/js/m2m_translate.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(KRXA_CACHE_NAME).then(function (cache) {
      return cache.addAll(KRXA_CACHE_FILES).catch(function () {
        return Promise.resolve();
      });
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== KRXA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(function (response) {
        const copy = response.clone();

        caches.open(KRXA_CACHE_NAME).then(function (cache) {
          cache.put(request, copy);
        });

        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached;

          return new Response(
            "<!DOCTYPE html><html lang='ko'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1.0'><title>말대말 Offline</title></head><body style='font-family:Arial;padding:20px'><h2>말대말 OFFLINE</h2><p>인터넷 연결이 불안정합니다.</p><p>도와주세요 → Help me.</p><p>병원이 어디인가요? → Where is the hospital?</p><p>경찰을 불러주세요. → Please call the police.</p></body></html>",
            {
              headers: {
                "Content-Type": "text/html; charset=UTF-8"
              }
            }
          );
        });
      })
  );
});
/* KRXA Travel UI Config Runtime v1 */
/* CONTROL/DEV 저장값을 USER UI에 반영하는 경량 런타임 */

(function () {
  window.KRXA_UI_CONFIG = window.KRXA_UI_CONFIG || null;

  async function loadConfig() {
    try {
      const res = await fetch("/api/travel-ui-config");
      const data = await res.json();
      if (data && data.ok && data.config) {
        window.KRXA_UI_CONFIG = data.config;
        applyConfig(data.config);
        return data.config;
      }
    } catch (e) {
      console.log("KRXA UI config load failed", e);
    }
    return null;
  }

  function norm(s) {
    return String(s || "").replace(/\s+/g, "").toLowerCase();
  }

  function enabledItems(config) {
    const out = [];
    (config.pages || []).forEach(function (p) {
      if (p.enabled === false) return;
      (p.items || []).forEach(function (it) {
        if (it.enabled !== false) out.push(it);
      });
    });
    return out;
  }

  function applyConfig(config) {
    if (!config || !config.pages) return;

    const items = enabledItems(config);
    const enabledNames = new Set(items.map(function (it) { return norm(it.title); }));

    document.querySelectorAll("button, .card, .serviceCard, .hero, .menuItem, .quickCard, [data-krxa-item]").forEach(function (el) {
      const txt = norm(el.innerText || el.textContent || el.getAttribute("data-krxa-item") || "");
      if (!txt) return;

      let matched = false;
      (config.pages || []).forEach(function (p) {
        (p.items || []).forEach(function (it) {
          const key = norm(it.title);
          if (key && txt.includes(key)) {
            matched = true;
            if (it.enabled === false || p.enabled === false) {
              el.style.display = "none";
              el.setAttribute("data-krxa-disabled", "true");
            } else {
              if (el.getAttribute("data-krxa-disabled") === "true") {
                el.style.display = "";
                el.removeAttribute("data-krxa-disabled");
              }
            }
          }
        });
      });
    });
  }

  function findItem(pageId, itemId) {
    const cfg = window.KRXA_UI_CONFIG;
    if (!cfg) return null;
    const p = (cfg.pages || []).find(function (x) { return x.id === pageId; });
    if (!p) return null;
    return (p.items || []).find(function (x) { return x.id === itemId; }) || null;
  }

  window.KRXA_UIConfig = {
    load: loadConfig,
    apply: applyConfig,
    findItem: findItem
  };

  document.addEventListener("DOMContentLoaded", function () {
    loadConfig();
    setInterval(loadConfig, 60000);
  });
})();

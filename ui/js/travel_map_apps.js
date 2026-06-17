/* KRXA Travel V1 - Map Apps Provider Engine v1 */
/* USER: default Google + user provider select/add/delete/on-off */
/* CONTROL/DEV use API/storage, existing UI structure is not replaced. */

(function () {
  window.KRXA_MapApps = window.KRXA_MapApps || {};

  const DEFAULT_STATE = {
    version: "v1",
    default_provider: "google",
    providers: [
      {
        id: "google",
        name: "Google Maps",
        enabled: true,
        locked: true,
        search_url: "https://www.google.com/maps/search/{query}",
        dir_url: "https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}"
      }
    ],
    user_providers: []
  };

  function enc(v) {
    return encodeURIComponent(v || "");
  }

  function getCtx() {
    if (window.KRXA_DeviceContext && window.KRXA_DeviceContext.get) {
      return window.KRXA_DeviceContext.get();
    }
    return window.KRXA_CONTEXT || {};
  }

  function getOrigin() {
    const ctx = getCtx();
    if (ctx && ctx.lat && ctx.lng) {
      return String(ctx.lat) + "," + String(ctx.lng);
    }
    return "";
  }

  async function loadState() {
    try {
      const res = await fetch("/api/travel-map-apps");
      if (!res.ok) throw new Error("map apps api not ready");
      const data = await res.json();
      if (data && data.ok && data.state) return data.state;
      if (data && data.version) return data;
    } catch (e) {
      console.log("KRXA MapApps fallback:", e.message);
    }
    return DEFAULT_STATE;
  }

  async function saveState(state) {
    const res = await fetch("/api/travel-map-apps/save", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(state)
    });
    return await res.json();
  }

  function allProviders(state) {
    state = state || DEFAULT_STATE;
    const base = state.providers || [];
    const user = state.user_providers || [];
    return base.concat(user);
  }

  function getSelectedProviderId() {
    return localStorage.getItem("KRXA_SELECTED_MAP_PROVIDER") || "";
  }

  function setSelectedProviderId(id) {
    localStorage.setItem("KRXA_SELECTED_MAP_PROVIDER", id || "google");
  }

  function getProviderFromState(state) {
    const list = allProviders(state).filter(function (p) {
      return p && p.enabled !== false;
    });

    const selected = getSelectedProviderId();
    let provider = null;

    if (selected) {
      provider = list.find(function (p) { return p.id === selected; });
    }

    if (!provider && state.default_provider) {
      provider = list.find(function (p) { return p.id === state.default_provider; });
    }

    if (!provider) {
      provider = list.find(function (p) { return p.id === "google"; }) || list[0] || DEFAULT_STATE.providers[0];
    }

    return provider;
  }

  function buildUrl(template, values) {
    let url = template || "";
    Object.keys(values || {}).forEach(function (key) {
      url = url.replaceAll("{" + key + "}", enc(values[key]));
    });
    return url;
  }

  async function openSearch(keyword) {
    const state = await loadState();
    const provider = getProviderFromState(state);
    const query = keyword || "nearby places";

    const url = buildUrl(provider.search_url || DEFAULT_STATE.providers[0].search_url, {
      query: query,
      origin: getOrigin(),
      destination: query
    });

    window.open(url, "_blank");
  }

  async function openDir(destination) {
    if (!destination) {
      alert("목적지 정보가 없습니다.");
      return;
    }

    const state = await loadState();
    const provider = getProviderFromState(state);
    const origin = getOrigin();

    const url = buildUrl(provider.dir_url || DEFAULT_STATE.providers[0].dir_url, {
      origin: origin,
      destination: destination,
      query: destination
    });

    window.open(url, "_blank");
  }

  async function openUserMapManager() {
    const state = await loadState();
    const list = allProviders(state);
    const selected = getSelectedProviderId() || state.default_provider || "google";

    let html = "";
    html += "<p><b>지도앱 선택 / 사용자 등록</b></p>";
    html += "<p>기본 지도앱은 Google Maps입니다. 사용자가 직접 지도앱을 추가/삭제/ON-OFF/선택할 수 있습니다.</p>";

    list.forEach(function (p) {
      const checked = selected === p.id ? "checked" : "";
      const disabledDelete = p.locked ? "disabled" : "";
      const onText = p.enabled === false ? "OFF" : "ON";

      html += "<div class='msg' style='margin-top:8px'>";
      html += "<b>" + (p.name || p.id) + " [" + onText + "]</b>";
      html += "<span>" + (p.locked ? "기본 제공" : "사용자 등록") + "</span>";
      html += "<button class='btn green' style='width:100%;margin-top:6px' onclick=\"KRXA_MapApps.selectProvider('" + p.id + "')\">사용 선택 " + (checked ? "✓" : "") + "</button>";
      if (!p.locked) {
        html += "<button class='btn blue' style='width:100%;margin-top:6px' onclick=\"KRXA_MapApps.toggleUserProvider('" + p.id + "')\">ON/OFF</button>";
        html += "<button class='btn red' style='width:100%;margin-top:6px' " + disabledDelete + " onclick=\"KRXA_MapApps.deleteUserProvider('" + p.id + "')\">삭제</button>";
      }
      html += "</div>";
    });

    html += "<hr>";
    html += "<input id='krxaMapName' placeholder='지도앱 이름 예: Naver Map' style='width:100%;margin-top:8px;padding:10px;border-radius:10px'>";
    html += "<input id='krxaMapSearch' placeholder='Search URL 예: https://map.example/search/{query}' style='width:100%;margin-top:8px;padding:10px;border-radius:10px'>";
    html += "<input id='krxaMapDir' placeholder='Dir URL 예: https://map.example/dir?from={origin}&to={destination}' style='width:100%;margin-top:8px;padding:10px;border-radius:10px'>";
    html += "<button class='btn green' style='width:100%;margin-top:8px' onclick='KRXA_MapApps.addUserProvider()'>사용자 지도앱 등록</button>";

    if (window.KRXA_App && window.KRXA_App.openModal) {
      window.KRXA_App.openModal("지도앱 관리", html);
    } else {
      alert("지도앱 관리");
    }
  }

  async function addUserProvider() {
    const nameEl = document.getElementById("krxaMapName");
    const searchEl = document.getElementById("krxaMapSearch");
    const dirEl = document.getElementById("krxaMapDir");

    const name = nameEl ? nameEl.value.trim() : "";
    const search = searchEl ? searchEl.value.trim() : "";
    const dir = dirEl ? dirEl.value.trim() : "";

    if (!name || !search || !dir) {
      alert("지도앱 이름, Search URL, Dir URL을 모두 입력하세요.");
      return;
    }

    const state = await loadState();
    state.user_providers = state.user_providers || [];

    const id = "user_" + Date.now();

    state.user_providers.push({
      id: id,
      name: name,
      enabled: true,
      locked: false,
      status: "user",
      search_url: search,
      dir_url: dir
    });

    await saveState(state);
    setSelectedProviderId(id);
    openUserMapManager();
  }

  async function deleteUserProvider(id) {
    const state = await loadState();
    state.user_providers = (state.user_providers || []).filter(function (p) {
      return p.id !== id;
    });

    if (getSelectedProviderId() === id) {
      setSelectedProviderId(state.default_provider || "google");
    }

    await saveState(state);
    openUserMapManager();
  }

  async function toggleUserProvider(id) {
    const state = await loadState();
    (state.user_providers || []).forEach(function (p) {
      if (p.id === id) p.enabled = p.enabled === false ? true : false;
    });

    await saveState(state);
    openUserMapManager();
  }

  function selectProvider(id) {
    setSelectedProviderId(id || "google");
    alert("사용 지도앱이 선택되었습니다.");
  }

  window.KRXA_MapApps.load = loadState;
  window.KRXA_MapApps.save = saveState;
  window.KRXA_MapApps.openSearch = openSearch;
  window.KRXA_MapApps.openDir = openDir;
  window.KRXA_MapApps.openUserMapManager = openUserMapManager;
  window.KRXA_MapApps.addUserProvider = addUserProvider;
  window.KRXA_MapApps.deleteUserProvider = deleteUserProvider;
  window.KRXA_MapApps.toggleUserProvider = toggleUserProvider;
  window.KRXA_MapApps.selectProvider = selectProvider;

})();

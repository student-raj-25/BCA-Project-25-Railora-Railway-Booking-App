(() => {
  const tokenKey = "railora_token";
  const userKey = "railora_user";
  const draftKeys = ["railora_selected_train", "railora_passengers", "railora_seats", "railora_last_pnr"];
  const apiBasePromise = fetch("/js/runtime-config.json")
    .then((response) => {
      if (!response.ok) throw new Error("The app's API configuration could not be loaded.");
      return response.json();
    })
    .then((config) => {
      const apiBase = window.RAILORA_API_BASE || config.apiBase || "";
      if (apiBase && new URL(apiBase).protocol !== "https:") throw new Error("The configured API must use HTTPS.");
      return apiBase.replace(/\/+$/, "");
    });
  function clearDraft(clearJourney = false) {
    draftKeys.forEach((key) => localStorage.removeItem(key));
    if (clearJourney) localStorage.removeItem("railora_journey");
  }
  async function request(path, options = {}) {
    const token = localStorage.getItem(tokenKey);
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const apiBase = await apiBasePromise;
    let response;
    try {
      response = await fetch(`${apiBase}/api${path}`, { ...options, headers });
    } catch {
      throw new Error("Cannot reach the booking server. Make sure it is running and try again.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        clearDraft(true);
      }
      throw new Error(data.error || "The request could not be completed.");
    }
    return data;
  }
  window.RailApi = {
    request,
    saveSession(data) {
      const previousUser = this.getUser();
      if (previousUser && (previousUser.id !== data.user.id || previousUser.email !== data.user.email)) clearDraft(true);
      localStorage.setItem(tokenKey, data.token);
      localStorage.setItem(userKey, JSON.stringify(data.user));
    },
    getUser() {
      try { return JSON.parse(localStorage.getItem(userKey) || "null"); }
      catch { return null; }
    },
    clearSession() {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
      clearDraft(true);
    },
    requireUser() {
      if (!localStorage.getItem(tokenKey)) {
        location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
        return false;
      }
      return true;
    }
  };
})();

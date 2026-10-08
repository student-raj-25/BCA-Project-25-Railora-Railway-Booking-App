(() => {
  const api = () => window.RailApi;
  function setBusy(form, busy) {
    const button = form.querySelector("[type=submit]");
    button.disabled = busy;
    button.dataset.original ||= button.innerHTML;
    button.innerHTML = busy ? '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Please wait…' : button.dataset.original;
  }
  function bindAuth() {
    document.querySelectorAll("[data-auth-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        setBusy(form, true);
        try {
          const data = new FormData(form);
          const payload = Object.fromEntries(data.entries());
          const path = form.dataset.authForm === "signup" ? "/auth/signup" : "/auth/login";
          const result = await api().request(path, { method: "POST", body: JSON.stringify(payload) });
          api().saveSession(result);
          const next = new URLSearchParams(location.search).get("next");
          location.href = next && next.startsWith("/") ? next : "/index.html";
        } catch (error) {
          window.showToast(error.message, true);
        } finally { setBusy(form, false); }
      });
    });
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        input.type = input.type === "password" ? "text" : "password";
        button.innerHTML = input.type === "password" ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
      });
    });
    document.querySelectorAll("[data-logout]").forEach((button) => button.addEventListener("click", () => {
      api().clearSession();
      location.href = "/login.html";
    }));
  }
  window.RailAuth = { bindAuth };
})();

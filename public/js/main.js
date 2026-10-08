(() => {
  const app = document.getElementById("app");
  const api = window.RailApi;
  const esc = (value) => window.RailTrains.escapeHtml(value);
  const user = api.getUser();

  window.showToast = (message, isError = false) => {
    const region = document.getElementById("toast-region");
    const toast = document.createElement("div");
    toast.className = `toast-message ${isError ? "error" : ""}`;
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4300);
  };

  function renderHeader() {
    const page = location.pathname.split("/").pop() || "index.html";
    document.getElementById("site-header").innerHTML = `<header class="site-header"><div class="container nav-shell d-flex align-items-center justify-content-between">
      <a class="brand" href="/"><span class="brand-mark"><i class="fa-solid fa-train"></i></span>railora</a>
      <button class="mobile-menu" id="mobile-menu" aria-label="Open navigation" aria-expanded="false"><i class="fa-solid fa-bars"></i></button>
      <div class="nav-content" id="nav-content"><nav aria-label="Main navigation"><ul class="nav-links">
        <li><a class="${page === "index.html" ? "active" : ""}" href="/">Home</a></li>
        <li><a href="/#journey-form">Book ticket</a></li>
        <li><a class="${page === "search-trains.html" || page === "train-details.html" ? "active" : ""}" href="/search-trains.html">Trains</a></li>
        <li><a class="${page === "my-bookings.html" ? "active" : ""}" href="/my-bookings.html">My bookings</a></li>
        <li><a class="${page === "contact.html" ? "active" : ""}" href="/contact.html">Contact</a></li>
      </ul></nav><div class="nav-actions">${user ? `<a class="btn btn-outline btn-sm" href="/profile.html"><i class="fa-regular fa-user me-1"></i>${esc(user.name.split(" ")[0])}</a><button class="btn btn-primary btn-sm" data-logout>Log out</button>` : `<a class="btn btn-outline btn-sm" href="/login.html">Log in</a><a class="btn btn-primary btn-sm" href="/signup.html">Sign up</a>`}</div></div>
    </div></header>`;
    document.getElementById("mobile-menu").addEventListener("click", (event) => {
      const nav = document.getElementById("nav-content");
      const expanded = nav.classList.toggle("open");
      event.currentTarget.setAttribute("aria-expanded", String(expanded));
      event.currentTarget.innerHTML = expanded ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
  }

  function renderLogin() {
    app.innerHTML = `<section class="auth-shell"><aside class="auth-art"><span class="eyebrow">Welcome back</span><h2>Good journeys begin with a good plan.</h2><p>Sign in to keep your travel plans and demo bookings together.</p></aside><div class="auth-form-wrap"><form class="auth-form" data-auth-form="login"><div class="section-kicker">Your Railora account</div><h1>Sign in</h1><p class="lead">Pick up where your next journey begins.</p><div class="field mb-3"><label>EMAIL OR MOBILE NUMBER</label><input class="control" name="identifier" autocomplete="username" required placeholder="you@example.com or 10-digit mobile"></div><div class="field mb-2"><label>PASSWORD</label><div class="position-relative"><input class="control pe-5" id="login-password" name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="Your password"><button type="button" class="btn-icon position-absolute top-50 end-0 translate-middle-y me-2" data-password-toggle="login-password" aria-label="Show password"><i class="fa-regular fa-eye"></i></button></div></div><div class="d-flex justify-content-between align-items-center mb-4"><label class="form-check small text-muted"><input class="form-check-input me-1" type="checkbox" name="remember"> Remember me</label><a href="#" data-forgot-password class="small fw-bold text-primary">Forgot password?</a></div><button class="btn btn-primary btn-wide" type="submit">Sign in <i class="fa-solid fa-arrow-right ms-2"></i></button><div class="auth-footer">Don't have an account? <a href="/signup.html">Sign up</a></div></form></div></section>`;
  }

  function renderSignup() {
    app.innerHTML = `<section class="auth-shell"><aside class="auth-art"><span class="eyebrow">Start your next story</span><h2>More time for the view outside.</h2><p>Create an account to plan journeys and manage your demo tickets.</p></aside><div class="auth-form-wrap"><form class="auth-form" data-auth-form="signup"><div class="section-kicker">Join Railora</div><h1>Create your account</h1><p class="lead">It's quick, and your travel plans stay in one place.</p><div class="field mb-3"><label>FULL NAME</label><input class="control" name="name" required minlength="2" maxlength="80" autocomplete="name" placeholder="Your full name"></div><div class="two-col"><div class="field mb-3"><label>EMAIL ADDRESS</label><input class="control" name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div><div class="field mb-3"><label>MOBILE NUMBER</label><input class="control" name="mobile" type="tel" inputmode="numeric" pattern="\\d{10}" minlength="10" maxlength="10" required autocomplete="tel" placeholder="10-digit number"></div><div class="field mb-3"><label>DATE OF BIRTH</label><input class="control" name="dob" type="date" max="${new Date().toISOString().slice(0, 10)}"></div><div class="field mb-3"><label>GENDER</label><select class="control" name="gender"><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></div></div><div class="field mb-3"><label>PASSWORD</label><div class="position-relative"><input class="control pe-5" id="signup-password" name="password" type="password" minlength="8" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}" required autocomplete="new-password" placeholder="8+ characters, mixed case, number & symbol"><button type="button" class="btn-icon position-absolute top-50 end-0 translate-middle-y me-2" data-password-toggle="signup-password" aria-label="Show password"><i class="fa-regular fa-eye"></i></button></div></div><div class="field mb-3"><label>CONFIRM PASSWORD</label><input class="control" name="confirmPassword" type="password" required autocomplete="new-password" placeholder="Enter your password again"></div><button class="btn btn-primary btn-wide" type="submit">Create account <i class="fa-solid fa-arrow-right ms-2"></i></button><div class="auth-footer">Already have an account? <a href="/login.html">Sign in</a></div></form></div></section>`;
    const form = document.querySelector("[data-auth-form=signup]");
    form.addEventListener("submit", (event) => {
      const values = new FormData(form);
      if (values.get("password") !== values.get("confirmPassword")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.showToast("Your passwords do not match.", true);
      }
    }, true);
  }

  async function renderProfile() {
    if (!api.requireUser()) return;
    app.innerHTML = `<div class="page-shell"><div class="container"><div class="loading"><span class="spinner"></span><br>Loading your profile…</div></div></div>`;
    try {
      const { user: current } = await api.request("/profile");
      api.saveSession({ token: localStorage.getItem("railora_token"), user: current });
      app.innerHTML = `<div class="page-shell"><div class="container">${pageHeading("Your account", "Profile", "Keep your contact information up to date.")}<div class="row justify-content-center"><div class="col-lg-8"><section class="surface-card"><div class="d-flex align-items-center gap-3 mb-4"><div class="profile-avatar"><i class="fa-regular fa-user"></i></div><div><h2 class="h5 fw-bold mb-1">${esc(current.name)}</h2><span class="station">${esc(current.email)}</span></div></div><form id="profile-form"><div class="field mb-3"><label>FULL NAME</label><input class="control" name="name" required minlength="2" maxlength="80" value="${esc(current.name)}"></div><div class="field mb-3"><label>EMAIL ADDRESS</label><input class="control" value="${esc(current.email)}" disabled><small class="station">Email address cannot be changed in this demo.</small></div><div class="two-col"><div class="field mb-3"><label>MOBILE NUMBER</label><input class="control" name="mobile" required pattern="\\d{10}" maxlength="10" value="${esc(current.mobile)}"></div><div class="field mb-3"><label>DATE OF BIRTH</label><input class="control" name="dob" type="date" max="${new Date().toISOString().slice(0, 10)}" value="${esc(current.dob)}"></div></div><div class="field mb-4"><label>GENDER</label><select class="control" name="gender"><option value="">Prefer not to say</option>${["Female", "Male", "Other"].map((v) => `<option ${current.gender === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><button class="btn btn-primary" type="submit">Save changes</button></form></section></div></div></div></div>`;
      document.getElementById("profile-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const button = form.querySelector("[type=submit]");
        button.disabled = true;
        try {
          const result = await api.request("/profile", { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
          api.saveSession({ token: localStorage.getItem("railora_token"), user: result.user });
          window.showToast("Profile updated.");
          renderProfile();
        } catch (error) { window.showToast(error.message, true); button.disabled = false; }
      });
    } catch (error) { app.innerHTML = `<div class="page-shell container"><div class="alert-inline">${esc(error.message)}</div></div>`; }
  }
  function pageHeading(kicker, title, subtitle) {
    return `<div class="page-heading"><div class="section-kicker">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></div>`;
  }

  function renderContact() {
    app.innerHTML = `<div class="page-shell"><div class="container">${pageHeading("We’re here to help", "Contact Railora", "Have a question about this demo? Send us a note.")}<div class="contact-layout"><section class="surface-card"><h2 class="h5 fw-bold mb-4">Send a message</h2><form id="contact-form"><div class="field mb-3"><label>YOUR NAME</label><input class="control" name="name" required minlength="2" maxlength="80"></div><div class="two-col"><div class="field mb-3"><label>EMAIL</label><input class="control" name="email" type="email" required></div><div class="field mb-3"><label>MOBILE</label><input class="control" name="mobile" inputmode="numeric" pattern="\\d{10}" maxlength="10" required></div></div><div class="field mb-4"><label>MESSAGE</label><textarea class="control" name="message" rows="5" minlength="10" maxlength="1200" required placeholder="How can we help?"></textarea></div><button class="btn btn-primary" type="submit">Send message <i class="fa-solid fa-arrow-right ms-2"></i></button></form></section><aside class="surface-card"><div class="section-kicker">Customer care</div><h2 class="h5 fw-bold mt-2">Here for the details.</h2><p class="text-muted">This portfolio app is a booking demo, not an official railway customer service channel.</p><div class="contact-item"><i class="fa-regular fa-envelope"></i><div><strong>Demo inbox</strong><div class="station">hello@railora.example</div></div></div><div class="contact-item"><i class="fa-regular fa-clock"></i><div><strong>Typical reply time</strong><div class="station">Within 1–2 working days</div></div></div><div class="contact-item"><i class="fa-solid fa-location-dot"></i><div><strong>Based in</strong><div class="station">Bengaluru, India</div></div></div></aside></div></div></div>`;
    document.getElementById("contact-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const button = form.querySelector("[type=submit]");
      button.disabled = true;
      try {
        const result = await api.request("/contact", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        window.showToast(result.message);
        form.reset();
      } catch (error) { window.showToast(error.message, true); }
      finally { button.disabled = false; }
    });
  }

  function init() {
    renderHeader();
    const page = location.pathname.split("/").pop() || "index.html";
    const routes = {
      "index.html": () => window.RailTrains.renderHome(),
      "login.html": renderLogin,
      "signup.html": renderSignup,
      "search-trains.html": () => window.RailTrains.renderSearch(),
      "train-details.html": () => window.RailTrains.renderDetails(),
      "passenger-details.html": () => window.RailBooking.renderPassengers(),
      "seat-selection.html": () => window.RailBooking.renderSeats(),
      "payment.html": () => window.RailBooking.renderPayment(),
      "booking-success.html": () => window.RailBooking.renderSuccess(),
      "my-bookings.html": () => window.RailBooking.renderBookings(),
      "profile.html": renderProfile,
      "contact.html": renderContact
    };
    (routes[page] || routes["index.html"])();
    window.RailAuth.bindAuth();
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-forgot-password]");
    if (!link) return;
    event.preventDefault();
    window.showToast("Password recovery is not enabled in this demo. No reset email is sent.");
  });
  document.addEventListener("DOMContentLoaded", init);
})();

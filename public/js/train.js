(() => {
  const api = window.RailApi;
  const app = document.getElementById("app");
  const classNames = ["Sleeper", "AC 3 Tier", "AC 2 Tier", "AC First Class", "Chair Car", "Second Sitting"];
  const escapeHtml = (text) => String(text ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const readJourney = () => {
    try { return JSON.parse(localStorage.getItem("railora_journey") || "{}"); }
    catch { return {}; }
  };
  const saveJourney = (journey) => localStorage.setItem("railora_journey", JSON.stringify(journey));
  const dateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const stationOptions = (stations, selected = "") => stations.map((station) =>
    `<option value="${escapeHtml(station)}" ${station === selected ? "selected" : ""}>${escapeHtml(station)}</option>`).join("");

  function searchPanel(stations) {
    const journey = readJourney();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `<section class="booking-wrap"><div class="container"><form class="booking-panel" id="journey-form">
      <div class="panel-heading"><h2>Where would you like to go?</h2><span><i class="fa-solid fa-shield-halved me-1"></i> Easy booking, clear fares</span></div>
      <div class="booking-grid">
        <div class="field"><label for="from-station">FROM</label><select class="control" id="from-station" name="from" required><option value="">Choose station</option>${stationOptions(stations, journey.from)}</select></div>
        <div class="swap-cell"><button class="swap-btn" id="swap-stations" aria-label="Swap stations" type="button"><i class="fa-solid fa-arrow-right-arrow-left"></i></button></div>
        <div class="field"><label for="to-station">TO</label><select class="control" id="to-station" name="to" required><option value="">Choose station</option>${stationOptions(stations, journey.to)}</select></div>
        <div class="field"><label for="journey-date">JOURNEY DATE</label><input class="control" type="date" id="journey-date" name="journeyDate" min="${dateString(new Date())}" value="${escapeHtml(journey.journeyDate || dateString(tomorrow))}" required></div>
        <div class="field"><label for="travel-class">TRAVEL CLASS</label><select class="control" id="travel-class" name="travelClass">${classNames.map((name) => `<option ${journey.travelClass === name ? "selected" : ""}>${name}</option>`).join("")}</select></div>
        <div class="field quota-field"><label for="quota">QUOTA</label><select class="control" id="quota" name="quota">${["General", "Tatkal", "Ladies", "Senior Citizen"].map((name) => `<option ${journey.quota === name ? "selected" : ""}>${name}</option>`).join("")}</select></div>
        <div class="search-action"><button class="btn btn-primary" type="submit"><i class="fa-solid fa-magnifying-glass me-2"></i>Search trains</button></div>
      </div></form></div></section>`;
  }

  async function renderHome() {
    app.innerHTML = `<section class="hero"><div class="container hero-content"><span class="eyebrow">A better way to travel by rail</span><h1>Your journey<br>starts here.</h1><p>Search trains, compare travel classes and reserve your next railway journey with confidence.</p><a href="#journey-form" class="btn btn-orange mt-2">Plan your trip <i class="fa-solid fa-arrow-right ms-2"></i></a></div><i class="fa-solid fa-train hero-scribble"></i><div class="train-ribbon"><i class="fa-solid fa-train-subway moving-train"></i></div></section>
      <div id="home-search"></div>
      <section class="feature-band"><div class="container"><div class="section-kicker">Travel made thoughtful</div><h2 class="section-title">A smoother journey, from search to seat.</h2><p class="section-subtitle">Everything you need to plan and manage your trip, in one calm place.</p><div class="feature-grid">
        <article class="feature-card"><div class="feature-icon"><i class="fa-solid fa-magnifying-glass"></i></div><h3>Find the right train</h3><p>Compare schedules, journey times and available classes in seconds.</p></article>
        <article class="feature-card"><div class="feature-icon"><i class="fa-solid fa-ticket"></i></div><h3>Book with confidence</h3><p>Keep passenger and ticket details together in your personal bookings.</p></article>
        <article class="feature-card"><div class="feature-icon"><i class="fa-solid fa-mobile-screen-button"></i></div><h3>Manage on the go</h3><p>View, print or cancel your demo reservations whenever you need.</p></article>
      </div></div></section>`;
    try {
      const { stations } = await api.request("/trains");
      document.getElementById("home-search").innerHTML = searchPanel(stations);
      bindSearchForm();
      if (location.hash === "#journey-form") document.getElementById("journey-form").scrollIntoView({ behavior: "smooth" });
    } catch (error) { window.showToast(error.message, true); }
  }

  function bindSearchForm() {
    const form = document.getElementById("journey-form");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const journey = Object.fromEntries(new FormData(form).entries());
      if (journey.from === journey.to) return window.showToast("Choose two different stations.", true);
      saveJourney(journey);
      location.href = "/search-trains.html";
    });
    document.getElementById("swap-stations").addEventListener("click", () => {
      const from = document.getElementById("from-station");
      const to = document.getElementById("to-station");
      [from.value, to.value] = [to.value, from.value];
    });
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
  }
  function renderTrainCard(train, chosenClass) {
    const selected = chosenClass && train.prices[chosenClass] > 0 && train.seats[chosenClass]
      ? chosenClass
      : Object.keys(train.prices).find((name) => train.prices[name] > 0 && train.seats[name] > 0);
    const classes = Object.entries(train.prices).map(([name, fare]) => {
      const available = Boolean(fare && train.seats[name]);
      return `<button class="class-chip ${name === selected ? "selected" : ""} ${available ? "" : "disabled"}" type="button" data-class="${escapeHtml(name)}" data-train="${train.id}" ${available ? "" : "disabled"}><strong>${escapeHtml(name)}</strong><small>${available ? `${train.seats[name]} available · ${formatMoney(fare)}` : "Not available"}</small></button>`;
    }).join("");
    return `<article class="train-card" data-train-card data-type="${escapeHtml(train.type)}" data-departure="${train.departure}" data-duration="${parseDuration(train.duration)}" data-id="${train.id}">
      <div class="train-top"><div><h2 class="train-title">${escapeHtml(train.name)}</h2><span class="train-number">Train ${escapeHtml(train.number)} · ${escapeHtml(train.type)} service</span></div><span class="train-type">${escapeHtml(train.days.join(" · "))}</span></div>
      <div class="train-times"><div><div class="time">${escapeHtml(train.departure)}</div><div class="station">${escapeHtml(train.from)}</div></div><div class="route-line"><span>${escapeHtml(train.duration)} · ${train.distance.toLocaleString("en-IN")} km</span></div><div><div class="time">${escapeHtml(train.arrival)}</div><div class="station">${escapeHtml(train.to)}</div></div></div>
      <div class="class-chips">${classes}</div>
      <div class="train-bottom"><span class="station"><i class="fa-regular fa-calendar me-1"></i> Runs ${escapeHtml(train.days.join(", "))}</span><div class="train-actions"><a class="btn btn-outline btn-sm" href="/train-details.html?id=${train.id}">View details</a><button class="btn btn-outline btn-sm" type="button" data-check-availability="${train.id}" data-class="${escapeHtml(selected || "")}">Check availability</button><button class="btn btn-primary btn-sm" type="button" data-book-train="${train.id}" data-class="${escapeHtml(selected || "")}">Book now <i class="fa-solid fa-arrow-right ms-1"></i></button></div></div></article>`;
  }
  function parseDuration(duration) {
    const match = duration.match(/(\d+)h\s*(\d+)m/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }
  function rememberTrainSelection(trainId, travelClass, train) {
    const current = readJourney();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    saveJourney({
      ...current,
      from: current.from || train.from,
      to: current.to || train.to,
      journeyDate: current.journeyDate || dateString(tomorrow),
      travelClass: travelClass || current.travelClass,
      quota: current.quota || "General"
    });
    localStorage.setItem("railora_selected_train", trainId);
  }
  function chooseTrain(trainId, travelClass, train) {
    rememberTrainSelection(trainId, travelClass, train);
    location.href = "/passenger-details.html";
  }
  function bindTrainCards(trains) {
    document.querySelectorAll(".class-chip:not([disabled])").forEach((chip) => chip.addEventListener("click", () => {
      const card = chip.closest("[data-train-card]");
      card.querySelectorAll(".class-chip").forEach((item) => item.classList.remove("selected"));
      chip.classList.add("selected");
      card.querySelector("[data-book-train]").dataset.class = chip.dataset.class;
      card.querySelector("[data-check-availability]").dataset.class = chip.dataset.class;
    }));
    document.querySelectorAll("[data-check-availability]").forEach((button) => button.addEventListener("click", async () => {
      const selectedJourney = readJourney();
      const train = trains.find((item) => item.id === button.dataset.checkAvailability);
      if (!train) return window.showToast("That train is no longer available.", true);
      const travelClass = button.dataset.class;
      if (!travelClass || !selectedJourney.journeyDate) return window.showToast("Choose a travel date and class first.", true);
      try {
        const query = new URLSearchParams({ date: selectedJourney.journeyDate, travelClass });
        const { bookedSeats } = await api.request(`/trains/${encodeURIComponent(train.id)}/seats?${query}`);
        const mapCapacity = 72;
        window.showToast(`Sample coach map: ${Math.max(0, mapCapacity - bookedSeats.length)} of ${mapCapacity} seats open in ${travelClass}.`);
      } catch (error) { window.showToast(error.message, true); }
    }));
    document.querySelectorAll("[data-book-train]").forEach((button) => button.addEventListener("click", () => {
      const train = trains.find((item) => item.id === button.dataset.bookTrain);
      if (!train) return window.showToast("That train is no longer available.", true);
      if (!api.getUser()) {
        rememberTrainSelection(train.id, button.dataset.class, train);
        location.href = `/login.html?next=${encodeURIComponent("/passenger-details.html")}`;
        return;
      }
      chooseTrain(train.id, button.dataset.class, train);
    }));
    document.querySelectorAll("[data-details-book]").forEach((button) => button.addEventListener("click", () => {
      const train = trains.find((item) => item.id === button.dataset.trainId);
      if (!train) return window.showToast("That train is no longer available.", true);
      if (!api.getUser()) {
        rememberTrainSelection(train.id, button.dataset.travelClass, train);
        location.href = `/login.html?next=${encodeURIComponent("/passenger-details.html")}`;
        return;
      }
      chooseTrain(train.id, button.dataset.travelClass, train);
    }));
  }

  async function renderSearch() {
    const journey = readJourney();
    if (!journey.journeyDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      journey.journeyDate = dateString(tomorrow);
      saveJourney(journey);
    }
    app.innerHTML = `<div class="page-shell"><div class="container"><div class="page-heading"><div class="section-kicker">Find your connection</div><h1>Available trains</h1><p id="search-caption">Compare the journey options that fit your plans.</p></div><div class="sort-row"><select class="control" id="sort-trains" aria-label="Sort trains"><option value="recommended">Recommended</option><option value="price">Cheapest fare</option><option value="duration">Fastest journey</option><option value="early">Earliest departure</option><option value="late">Latest departure</option></select><select class="control" id="filter-class" aria-label="Filter by class"><option value="">All available classes</option>${classNames.map((name) => `<option>${name}</option>`).join("")}</select><select class="control" id="filter-type" aria-label="Filter by train type"><option value="">All train types</option>${["Rajdhani", "Shatabdi", "Duronto", "Vande Bharat", "Garib Rath", "Express"].map((name) => `<option>${name}</option>`).join("")}</select><select class="control" id="filter-time" aria-label="Filter departure time"><option value="">Any departure</option><option value="morning">Morning · before 12</option><option value="afternoon">Afternoon · 12–18</option><option value="evening">Evening · after 18</option></select><select class="control" id="filter-arrival" aria-label="Filter arrival time"><option value="">Any arrival</option><option value="morning">Morning · before 12</option><option value="afternoon">Afternoon · 12–18</option><option value="evening">Evening · after 18</option></select><input class="control" id="filter-price" type="number" min="1" placeholder="Max fare (₹)" aria-label="Maximum fare"><input class="control" id="filter-duration" type="number" min="1" placeholder="Max hours" aria-label="Maximum journey duration in hours"></div><div id="train-results" class="loading"><span class="spinner"></span><br>Finding trains…</div></div></div>`;
    try {
      const query = new URLSearchParams({ from: journey.from || "", to: journey.to || "", travelClass: journey.travelClass || "", date: journey.journeyDate || "" });
      const data = await api.request(`/trains?${query}`);
      const list = data.trains;
      const caption = journey.from && journey.to ? `${journey.from} to ${journey.to} · ${journey.journeyDate}` : `Browse trains running on ${journey.journeyDate}. Choose a trip to begin.`;
      document.getElementById("search-caption").textContent = caption;
      const results = document.getElementById("train-results");
      function update() {
        let filtered = [...list];
        const classFilter = document.getElementById("filter-class").value;
        const typeFilter = document.getElementById("filter-type").value;
        const timeFilter = document.getElementById("filter-time").value;
        const arrivalFilter = document.getElementById("filter-arrival").value;
        const maxPrice = Number(document.getElementById("filter-price").value) || 0;
        const maxDuration = Number(document.getElementById("filter-duration").value) || 0;
        if (classFilter) filtered = filtered.filter((train) => train.prices[classFilter] > 0 && train.seats[classFilter] > 0);
        if (typeFilter) filtered = filtered.filter((train) => train.type === typeFilter);
        if (timeFilter) filtered = filtered.filter((train) => inTimePeriod(train.departure, timeFilter));
        if (arrivalFilter) filtered = filtered.filter((train) => inTimePeriod(train.arrival, arrivalFilter));
        if (maxPrice) filtered = filtered.filter((train) => fareFor(train, classFilter) <= maxPrice);
        if (maxDuration) filtered = filtered.filter((train) => parseDuration(train.duration) <= maxDuration * 60);
        const sort = document.getElementById("sort-trains").value;
        if (sort === "price") filtered.sort((a, b) => minPrice(a) - minPrice(b));
        if (sort === "duration") filtered.sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration));
        if (sort === "early") filtered.sort((a, b) => a.departure.localeCompare(b.departure));
        if (sort === "late") filtered.sort((a, b) => b.departure.localeCompare(a.departure));
        results.innerHTML = filtered.length ? `<div class="train-list">${filtered.map((train) => renderTrainCard(train, journey.travelClass)).join("")}</div>` : `<div class="empty-state"><i class="fa-solid fa-train"></i><h3>No trains match these filters</h3><p>Try another class or clear a filter.</p></div>`;
        bindTrainCards(filtered);
      }
      function minPrice(train) { const fares = Object.entries(train.prices).filter(([name, amount]) => amount > 0 && train.seats[name]); return fares.length ? Math.min(...fares.map(([, amount]) => amount)) : Infinity; }
      ["sort-trains", "filter-class", "filter-type", "filter-time", "filter-arrival", "filter-price", "filter-duration"].forEach((id) => {
        document.getElementById(id).addEventListener(id === "filter-price" || id === "filter-duration" ? "input" : "change", update);
      });
      update();
      function fareFor(train, selectedClass) {
        if (selectedClass && train.prices[selectedClass] > 0) return train.prices[selectedClass];
        if (journey.travelClass && train.prices[journey.travelClass] > 0) return train.prices[journey.travelClass];
        return minPrice(train);
      }
      function inTimePeriod(value, period) {
        const hour = Number(value.slice(0, 2));
        return period === "morning" ? hour < 12 : period === "afternoon" ? hour >= 12 && hour < 18 : hour >= 18;
      }
    } catch (error) {
      document.getElementById("train-results").innerHTML = `<div class="alert-inline">${escapeHtml(error.message)}</div>`;
    }
  }

  const routeStops = {
    "12951": [["Mumbai Central", "16:35", "—"], ["Surat", "19:04", "19:08"], ["Vadodara Junction", "20:35", "20:39"], ["Ratlam Junction", "00:10", "00:13"], ["Kota Junction", "03:35", "03:40"], ["New Delhi", "08:10", "—"]],
    "12002": [["New Delhi", "06:00", "—"], ["Agra Cantt", "07:50", "07:53"], ["Gwalior", "09:15", "09:17"], ["Jhansi Junction", "10:35", "10:37"], ["Bhopal Junction", "14:35", "—"]],
    "12264": [["Hazrat Nizamuddin", "22:10", "—"], ["Kota Junction", "02:40", "02:45"], ["Ratlam Junction", "06:30", "06:35"], ["Vadodara Junction", "10:10", "10:15"], ["Pune Junction", "15:10", "—"]],
    "22436": [["New Delhi", "15:00", "—"], ["Kanpur Central", "19:10", "19:12"], ["Prayagraj Junction", "21:30", "21:33"], ["Varanasi Junction", "23:00", "—"]],
    "12909": [["Bandra Terminus", "16:35", "—"], ["Surat", "20:02", "20:06"], ["Vadodara Junction", "21:38", "21:42"], ["Kota Junction", "03:15", "03:20"], ["Hazrat Nizamuddin", "09:15", "—"]]
  };
  async function renderDetails() {
    const id = new URLSearchParams(location.search).get("id") || localStorage.getItem("railora_selected_train");
    if (!id) return location.replace("/search-trains.html");
    app.innerHTML = `<div class="page-shell"><div class="container loading"><span class="spinner"></span><br>Loading train details…</div></div>`;
    try {
      const { train } = await api.request(`/trains/${encodeURIComponent(id)}`);
      const journey = readJourney();
      const stops = routeStops[id] || [[train.from, train.departure, "—"], ["En route", "—", "—"], [train.to, train.arrival, "—"]];
      const selectedClass = journey.travelClass && train.prices[journey.travelClass] ? journey.travelClass : Object.keys(train.seats).find((name) => train.seats[name] > 0);
      const fare = train.prices[selectedClass] || 0;
      app.innerHTML = `<div class="page-shell"><div class="container"><a href="/search-trains.html" class="station"><i class="fa-solid fa-arrow-left me-2"></i>Back to trains</a><div class="page-heading mt-3"><div class="section-kicker">${escapeHtml(train.type)} · Train ${escapeHtml(train.number)}</div><h1>${escapeHtml(train.name)}</h1><p>${escapeHtml(train.from)} to ${escapeHtml(train.to)} · ${escapeHtml(train.days.join(", "))}</p></div>
        <div class="details-layout"><section class="surface-card"><h2 class="h5 fw-bold mb-4">Your route</h2><div class="timeline">${stops.map((stop, index) => `<div class="timeline-stop"><span class="timeline-dot"><i class="fa-solid ${index === 0 || index === stops.length - 1 ? "fa-location-dot" : "fa-train"}"></i></span><div><strong>${escapeHtml(stop[0])}</strong><small>${index === 0 ? "Departure station" : index === stops.length - 1 ? "Arrival station" : "Scheduled stop"}</small></div><div class="text-end"><strong>${escapeHtml(stop[1])}</strong>${stop[2] !== "—" ? `<small>Arrives ${escapeHtml(stop[2])}</small>` : ""}</div></div>`).join("")}</div></section>
        <aside class="surface-card journey-summary"><h2 class="h5 fw-bold">Journey overview</h2><div class="summary-row"><span>Distance</span><strong>${train.distance.toLocaleString("en-IN")} km</strong></div><div class="summary-row"><span>Duration</span><strong>${escapeHtml(train.duration)}</strong></div><div class="summary-row"><span>Runs</span><strong>${escapeHtml(train.days.length === 7 ? "Daily" : train.days.join(", "))}</strong></div><div class="summary-row"><span>Facilities</span><strong>Pantry · Charging · Linen</strong></div><div class="field mt-3"><label for="details-class">SELECT CLASS</label><select class="control" id="details-class">${Object.entries(train.prices).filter(([name, amount]) => amount > 0 && train.seats[name]).map(([name, amount]) => `<option value="${escapeHtml(name)}" ${name === selectedClass ? "selected" : ""}>${escapeHtml(name)} · ${formatMoney(amount)} · ${train.seats[name]} seats</option>`).join("")}</select></div><p class="small text-muted mt-3 mb-3">Demo fares are estimates and do not represent live railway inventory.</p><button class="btn btn-primary btn-wide" data-details-book data-train-id="${train.id}" data-travel-class="${escapeHtml(selectedClass)}">Continue to passengers · ${formatMoney(fare)}</button></aside></div></div></div>`;
      document.getElementById("details-class").addEventListener("change", (event) => {
        const option = event.target.value;
        const button = document.querySelector("[data-details-book]");
        button.dataset.travelClass = option;
        button.innerHTML = `Continue to passengers · ${formatMoney(train.prices[option])}`;
      });
      bindTrainCards([train]);
    } catch (error) { app.innerHTML = `<div class="page-shell container"><div class="alert-inline">${escapeHtml(error.message)} <a href="/search-trains.html">Browse trains</a></div></div>`; }
  }

  window.RailTrains = { renderHome, renderSearch, renderDetails, escapeHtml, formatMoney, readJourney, saveJourney };
})();

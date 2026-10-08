(() => {
  const api = () => window.RailApi;
  const trainsApi = () => window.RailTrains;
  const app = document.getElementById("app");
  const escape = (value) => trainsApi().escapeHtml(value);
  const money = (value) => trainsApi().formatMoney(value);
  const journey = () => trainsApi().readJourney();
  const jsonStore = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const getTrain = async () => {
    const id = localStorage.getItem("railora_selected_train");
    if (!id) { location.replace("/search-trains.html"); return null; }
    try {
      return (await api().request(`/trains/${encodeURIComponent(id)}`)).train;
    } catch (error) {
      app.innerHTML = pageShell(`<div class="alert-inline">${escape(error.message)} <a href="/search-trains.html">Browse trains</a></div>`);
      return null;
    }
  };
  const pageShell = (content) => `<div class="page-shell"><div class="container">${content}</div></div>`;
  const heading = (kicker, title, text = "") => `<div class="page-heading"><div class="section-kicker">${kicker}</div><h1>${title}</h1>${text ? `<p>${text}</p>` : ""}</div>`;
  const fareBreakdown = (baseFare) => ({ baseFare, reservation: 40, gst: Math.round(baseFare * .05), platform: 15, total: Math.round(baseFare + 40 + baseFare * .05 + 15) });
  function summaryCard(train, total, label = "Estimated total") {
    return `<aside class="surface-card journey-summary"><h2 class="h5 fw-bold">Trip summary</h2><p class="mb-1 fw-bold">${escape(train.name)}</p><p class="station">${escape(train.number)} · ${escape(journey().travelClass || "")}</p><div class="summary-row"><span>${escape(journey().from || train.from)} → ${escape(journey().to || train.to)}</span><strong>${escape(journey().journeyDate || "")}</strong></div><div class="summary-row total"><span>${label}</span><span>${money(total)}</span></div><small class="text-muted">Demo fare includes taxes and service fees.</small></aside>`;
  }

  async function renderPassengers() {
    if (!api().requireUser()) return;
    const train = await getTrain();
    if (!train) return;
    let passengers = jsonStore("railora_passengers", [{ name: "", age: "", gender: "", berth: "No preference", nationality: "Indian" }]);
    const baseFare = (train.prices[journey().travelClass] || 0) * passengers.length;
    const passengerCard = (person, index) => `<section class="passenger-card" data-passenger-card><div class="passenger-card-head"><h3>Passenger ${index + 1}</h3>${index ? `<button type="button" class="btn-icon" data-remove-passenger="${index}" aria-label="Remove passenger"><i class="fa-regular fa-trash-can"></i></button>` : ""}</div><div class="two-col"><div class="field mb-3"><label>FULL NAME</label><input class="control" name="name" value="${escape(person.name)}" autocomplete="name" required minlength="2" maxlength="80" placeholder="As on your ID"></div><div class="field mb-3"><label>AGE</label><input class="control" name="age" value="${escape(person.age)}" type="number" min="1" max="120" required placeholder="Age"></div><div class="field mb-3"><label>GENDER</label><select class="control" name="gender" required><option value="">Select gender</option>${["Male", "Female", "Other"].map((v) => `<option ${person.gender === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><div class="field mb-3"><label>BERTH PREFERENCE</label><select class="control" name="berth">${["No preference", "Lower", "Middle", "Upper", "Side Lower", "Side Upper"].map((v) => `<option ${person.berth === v ? "selected" : ""}>${v}</option>`).join("")}</select></div></div><div class="field"><label>NATIONALITY</label><input class="control" name="nationality" value="${escape(person.nationality || "Indian")}" maxlength="40"></div></section>`;
    app.innerHTML = pageShell(`<a href="/search-trains.html" class="station"><i class="fa-solid fa-arrow-left me-2"></i>Change train</a>${heading("Your travel party", "Passenger details", "Enter each passenger's details as they appear on their travel ID.")}<div class="booking-layout"><div><form id="passenger-form">${passengers.map(passengerCard).join("")}<div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-outline" id="add-passenger"><i class="fa-solid fa-plus me-2"></i>Add passenger</button><button type="submit" class="btn btn-primary">Continue to seats <i class="fa-solid fa-arrow-right ms-2"></i></button></div><p class="small text-muted mt-3"><i class="fa-solid fa-lock me-1"></i>Passenger information is saved to this demo's SQLite database with your booking.</p></form></div>${summaryCard(train, fareBreakdown(baseFare).total)}</div>`);
    const form = document.getElementById("passenger-form");
    document.getElementById("add-passenger").addEventListener("click", () => {
      if (passengers.length >= 6) return window.showToast("You can add up to 6 passengers.", true);
      passengers = readPassengerFields(form);
      passengers.push({ name: "", age: "", gender: "", berth: "No preference", nationality: "Indian" });
      localStorage.setItem("railora_passengers", JSON.stringify(passengers));
      renderPassengers();
    });
    form.querySelectorAll("[data-remove-passenger]").forEach((button) => button.addEventListener("click", () => {
      passengers = readPassengerFields(form);
      passengers.splice(Number(button.dataset.removePassenger), 1);
      localStorage.setItem("railora_passengers", JSON.stringify(passengers));
      renderPassengers();
    }));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      passengers = readPassengerFields(form);
      localStorage.setItem("railora_passengers", JSON.stringify(passengers));
      localStorage.removeItem("railora_seats");
      location.href = "/seat-selection.html";
    });
  }
  function readPassengerFields(form) {
    return [...form.querySelectorAll("[data-passenger-card]")].map((card) =>
      Object.fromEntries([...card.querySelectorAll("[name]")].map((field) => [field.name, field.value]))
    );
  }
  async function renderSeats() {
    if (!api().requireUser()) return;
    const train = await getTrain();
    if (!train) return;
    const passengers = jsonStore("railora_passengers", []);
    if (!passengers.length) return location.replace("/passenger-details.html");
    let selected = jsonStore("railora_seats", []);
    if (selected.length > passengers.length) selected = selected.slice(0, passengers.length);
    const seats = Array.from({ length: 72 }, (_, i) => i + 1);
    let bookedData;
    try {
      bookedData = await api().request(`/trains/${encodeURIComponent(train.id)}/seats?date=${encodeURIComponent(journey().journeyDate)}&travelClass=${encodeURIComponent(journey().travelClass)}`);
    } catch (error) {
      app.innerHTML = pageShell(`<div class="alert-inline">${escape(error.message)}</div>`);
      return;
    }
    const booked = new Set(bookedData.bookedSeats);
    const ladies = new Set([6, 18, 31, 57]);
    const senior = new Set([11, 37, 65]);
    const base = (train.prices[journey().travelClass] || 0) * passengers.length;
    const cardSeats = () => `<div class="seat-grid">${seats.map((number) => {
      const status = booked.has(number) ? "booked" : ladies.has(number) ? "ladies" : senior.has(number) ? "senior" : "";
      return `<button type="button" class="seat ${status} ${selected.includes(number) ? "selected" : ""}" data-seat="${number}" ${status === "booked" ? "disabled" : ""} aria-label="Seat ${number}${status ? ` ${status}` : ""}">${number}</button>`;
    }).join("")}</div>`;
    app.innerHTML = pageShell(`<a href="/passenger-details.html" class="station"><i class="fa-solid fa-arrow-left me-2"></i>Passenger details</a>${heading("Make it yours", "Choose your seats", `Select ${passengers.length} ${passengers.length === 1 ? "seat" : "seats"} for your journey.`)}<div class="booking-layout"><section class="surface-card"><div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3"><strong>${escape(train.name)}</strong><span class="pill">Coach S1 · ${escape(journey().travelClass || "")}</span></div><div class="seat-legend mb-3"><span><i class="legend-dot" style="background:#f2faf6;border:1px solid #cfe5d9"></i>Available</span><span><i class="legend-dot" style="background:#2874b9"></i>Selected</span><span><i class="legend-dot" style="background:#e8edf1"></i>Booked</span><span><i class="legend-dot" style="background:#fff2e8"></i>Ladies</span><span><i class="legend-dot" style="background:#f1edff"></i>Senior citizen</span></div><div class="seat-plan"><div class="coach-label"><i class="fa-solid fa-train-subway me-2"></i>Coach S1 · Berth layout</div>${cardSeats()}</div><p id="seat-count" class="small text-muted mt-3 mb-0"></p></section>${summaryCard(train, fareBreakdown(base).total)}<div class="d-grid"><button class="btn btn-primary" id="continue-payment">Continue to demo payment <i class="fa-solid fa-arrow-right ms-2"></i></button></div></div>`);
    const update = () => {
      document.getElementById("seat-count").textContent = `${selected.length} of ${passengers.length} seats selected`;
      document.getElementById("continue-payment").disabled = selected.length !== passengers.length;
      localStorage.setItem("railora_seats", JSON.stringify(selected));
    };
    document.querySelectorAll("[data-seat]:not(:disabled)").forEach((button) => button.addEventListener("click", () => {
      const number = Number(button.dataset.seat);
      if (selected.includes(number)) selected = selected.filter((seat) => seat !== number);
      else if (selected.length < passengers.length) selected.push(number);
      else return window.showToast(`Please select exactly ${passengers.length} seats.`, true);
      button.classList.toggle("selected", selected.includes(number));
      update();
    }));
    document.getElementById("continue-payment").addEventListener("click", () => location.href = "/payment.html");
    update();
  }

  async function renderPayment() {
    if (!api().requireUser()) return;
    const train = await getTrain();
    if (!train) return;
    const passengers = jsonStore("railora_passengers", []);
    const seats = jsonStore("railora_seats", []);
    if (!passengers.length || seats.length !== passengers.length) return location.replace("/passenger-details.html");
    const fares = fareBreakdown((train.prices[journey().travelClass] || 0) * passengers.length);
    const amountRows = `<div class="summary-row"><span>Base fare (${passengers.length} × ${money(train.prices[journey().travelClass])})</span><strong>${money(fares.baseFare)}</strong></div><div class="summary-row"><span>Reservation charges</span><strong>${money(fares.reservation)}</strong></div><div class="summary-row"><span>GST</span><strong>${money(fares.gst)}</strong></div><div class="summary-row"><span>Platform fee</span><strong>${money(fares.platform)}</strong></div><div class="summary-row total"><span>Total</span><strong>${money(fares.total)}</strong></div>`;
    app.innerHTML = pageShell(`${heading("Secure your reservation", "Demo payment", "Choose a payment method to complete this simulated booking.")}<div class="booking-layout"><section class="surface-card"><div class="alert-inline mb-4"><i class="fa-solid fa-circle-info me-2"></i>Demo only — no money is collected and no payment gateway is connected.</div><form id="payment-form"><h2 class="h5 fw-bold mb-3">Payment method</h2><div class="payment-methods">${[["upi", "UPI", "fa-mobile-screen-button"], ["debit", "Debit card", "fa-credit-card"], ["credit", "Credit card", "fa-credit-card"], ["netbanking", "Net banking", "fa-building-columns"], ["wallet", "Wallet", "fa-wallet"]].map(([value, label, icon], index) => `<label class="payment-method"><input type="radio" name="method" value="${value}" ${index === 0 ? "checked" : ""}><i class="fa-solid ${icon} text-primary"></i><strong>${label}</strong></label>`).join("")}</div><div id="payment-fields" class="payment-form"></div><button class="btn btn-primary btn-wide mt-3" type="submit"><i class="fa-solid fa-lock me-2"></i>Pay ${money(fares.total)} · Demo</button><p class="small text-center text-muted mt-3 mb-0">This demo booking is for portfolio and learning purposes.</p></form></section><aside class="surface-card journey-summary"><h2 class="h5 fw-bold">Fare summary</h2><p class="fw-bold mb-1">${escape(train.name)}</p><p class="station">${escape(journey().from || train.from)} → ${escape(journey().to || train.to)} · ${escape(journey().journeyDate)}</p>${amountRows}<small class="text-muted">No real transaction will occur.</small></aside></div>`);
    const fields = document.getElementById("payment-fields");
    const drawFields = () => {
      const method = document.querySelector("[name=method]:checked").value;
      if (method === "upi") fields.innerHTML = `<div class="field"><label>UPI ID</label><input class="control" name="upi" placeholder="name@bank" required pattern="[^\\s@]+@[^\\s@]+"><div class="station mt-2">Demo options: Google Pay · PhonePe · Paytm · Other UPI</div></div>`;
      else if (method === "debit" || method === "credit") fields.innerHTML = `<div class="field mb-3"><label>CARD NUMBER</label><input class="control" name="card" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" minlength="12" maxlength="19" pattern="[0-9 ]{12,19}" required></div><div class="field mb-3"><label>CARD HOLDER</label><input class="control" name="holder" autocomplete="cc-name" required></div><div class="two-col"><div class="field"><label>EXPIRY</label><input class="control" name="expiry" placeholder="MM/YY" pattern="(0[1-9]|1[0-2])\\/\\d{2}" required></div><div class="field"><label>CVV</label><input class="control" name="cvv" inputmode="numeric" type="password" minlength="3" maxlength="4" pattern="\\d{3,4}" required></div></div>`;
      else if (method === "netbanking") fields.innerHTML = `<div class="field"><label>SELECT BANK</label><select class="control" name="bank" required><option value="">Choose demo bank</option>${["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Other bank"].map((bank) => `<option>${bank}</option>`).join("")}</select></div>`;
      else fields.innerHTML = `<div class="field"><label>WALLET</label><select class="control" name="wallet" required><option value="">Choose demo wallet</option><option>Paytm</option><option>Amazon Pay</option><option>Other wallet</option></select></div>`;
    };
    document.querySelectorAll("[name=method]").forEach((radio) => radio.addEventListener("change", drawFields));
    drawFields();
    document.getElementById("payment-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const button = form.querySelector("[type=submit]");
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Confirming demo booking…';
      try {
        const data = await api().request("/bookings", { method: "POST", body: JSON.stringify({
          trainId: train.id,
          from: journey().from || train.from,
          to: journey().to || train.to,
          journeyDate: journey().journeyDate,
          travelClass: journey().travelClass,
          quota: journey().quota || "General",
          passengers: passengers.map((person, index) => ({ ...person, seatNumber: seats[index] }))
        }) });
        localStorage.setItem("railora_last_pnr", data.booking.pnr);
        location.href = `/booking-success.html?pnr=${encodeURIComponent(data.booking.pnr)}`;
      } catch (error) {
        window.showToast(error.message, true);
        button.disabled = false;
        button.innerHTML = `<i class="fa-solid fa-lock me-2"></i>Pay ${money(fares.total)} · Demo`;
      }
    });
  }

  function ticketMarkup(booking) {
    const passengerList = (booking.passengers || []).map((person) => `<div class="d-flex justify-content-between gap-3 py-2"><span><strong>${escape(person.name)}</strong><small class="d-block station">${escape(person.age)} yrs · ${escape(person.gender)} · ${escape(person.berth || "No preference")}</small></span><span class="text-end"><strong>${escape(person.coach)} · ${escape(person.seat)}</strong><small class="d-block station">${escape(booking.travel_class)}</small></span></div>`).join("");
    return `<article class="ticket" id="ticket"><header class="ticket-head"><div><div class="eyebrow">Railora e-ticket</div><h2>${escape(booking.train_name)}</h2><small>${escape(booking.train_number)} · ${escape(booking.travel_class)} · ${escape(booking.quota)}</small></div><div class="pnr"><small>PNR</small><strong>${escape(booking.pnr)}</strong></div></header><div class="ticket-body"><div class="ticket-route"><div><strong>${escape(booking.departure_time)}</strong><span>${escape(booking.from_station)}</span></div><div class="route-line"><span>${escape(booking.duration)}</span></div><div><strong>${escape(booking.arrival_time)}</strong><span>${escape(booking.to_station)}</span></div></div><div class="ticket-meta"><div><small>JOURNEY DATE</small><strong>${escape(booking.journey_date)}</strong></div><div><small>BOOKING STATUS</small><strong class="booking-status ${booking.status === "CANCELLED" ? "cancelled" : ""}">${escape(booking.status)}</strong></div><div><small>TOTAL FARE</small><strong>${money(booking.fare)}</strong></div></div><div class="ticket-passengers"><h3 class="h6 fw-bold">Passenger${booking.passengers.length === 1 ? "" : "s"}</h3>${passengerList}</div></div></article>`;
  }
  async function renderSuccess() {
    if (!api().requireUser()) return;
    const pnr = new URLSearchParams(location.search).get("pnr") || localStorage.getItem("railora_last_pnr");
    if (!pnr) return location.replace("/my-bookings.html");
    app.innerHTML = pageShell(`<div class="loading"><span class="spinner"></span><br>Preparing your e-ticket…</div>`);
    try {
      const { booking } = await api().request(`/bookings/${encodeURIComponent(pnr)}`);
      const cancelled = booking.status === "CANCELLED";
      document.title = cancelled ? "Cancelled booking — Railora" : "Booking confirmed — Railora";
      app.innerHTML = pageShell(`<div class="success-content ${cancelled ? "booking-cancelled" : ""}"><div class="success-mark"><i class="fa-solid ${cancelled ? "fa-xmark" : "fa-check"}"></i></div><div class="section-kicker">${cancelled ? "Booking update" : "All aboard"}</div><h1>${cancelled ? "This booking was cancelled" : "Ticket booked successfully"}</h1><p class="text-muted">${cancelled ? "This demo reservation is cancelled. The ticket below is retained for your records." : "Your demo reservation is confirmed. Your ticket details are ready below."}</p></div><div class="row justify-content-center"><div class="col-xl-9"><div class="mb-3">${ticketMarkup(booking)}</div><div class="d-flex flex-wrap justify-content-center gap-2 ticket-actions"><button class="btn btn-primary" id="download-ticket"><i class="fa-solid fa-download me-2"></i>Download ticket</button><button class="btn btn-outline" data-print-ticket><i class="fa-solid fa-print me-2"></i>Print ticket</button><a class="btn btn-outline" href="/my-bookings.html">View my bookings</a><a class="btn btn-outline" href="/">Go to home</a></div></div></div>${cancelled ? "" : '<div class="confetti-layer" aria-hidden="true"></div>'}`);
      document.getElementById("download-ticket").addEventListener("click", () => downloadTicket(booking));
      bindPrint();
      if (!cancelled) launchConfetti();
      if (new URLSearchParams(location.search).has("print")) window.setTimeout(() => window.print(), 250);
    } catch (error) { app.innerHTML = pageShell(`<div class="alert-inline">${escape(error.message)} <a href="/my-bookings.html">View bookings</a></div>`); }
  }
  function downloadTicket(booking) {
    const lines = [`RAILORA DEMO E-TICKET`, `PNR: ${booking.pnr}`, `Train: ${booking.train_name} (${booking.train_number})`, `From: ${booking.from_station} at ${booking.departure_time}`, `To: ${booking.to_station} at ${booking.arrival_time}`, `Journey date: ${booking.journey_date}`, `Class: ${booking.travel_class} | Status: ${booking.status}`, `Fare: ${money(booking.fare)}`, `Passengers:`, ...booking.passengers.map((p) => `- ${p.name}, ${p.age}, ${p.gender}, ${p.coach} seat ${p.seat}`), "", "Demo ticket only — not valid for travel."];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `railora-ticket-${booking.pnr}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function bindPrint() {
    document.querySelectorAll("[data-print-ticket]").forEach((button) => button.addEventListener("click", () => window.print()));
  }
  function launchConfetti() {
    const layer = document.querySelector(".confetti-layer");
    if (!layer) return;
    const colors = ["#f49b55", "#2874b9", "#55b98a", "#e7c458", "#ad8bd2"];
    for (let i = 0; i < 46; i += 1) {
      const piece = document.createElement("i");
      piece.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * 1.3}s;transform:rotate(${Math.random() * 360}deg)`;
      layer.appendChild(piece);
    }
  }
  async function renderBookings() {
    if (!api().requireUser()) return;
    app.innerHTML = pageShell(`${heading("Your travel history", "My bookings", "All the details for your Railora demo reservations.")}<div id="bookings-list" class="loading"><span class="spinner"></span><br>Loading your bookings…</div>`);
    try {
      const { bookings } = await api().request("/bookings");
      const list = document.getElementById("bookings-list");
      if (!bookings.length) {
        list.className = "empty-state";
        list.innerHTML = `<i class="fa-solid fa-ticket"></i><h3>No bookings yet</h3><p>Your next journey is waiting.</p><a href="/" class="btn btn-primary mt-2">Search trains</a>`;
        return;
      }
      list.className = "";
      list.innerHTML = bookings.map((booking) => `<article class="booking-row"><div><small>PNR ${escape(booking.pnr)}</small><strong>${escape(booking.train_name)}</strong><small>${escape(booking.train_number)} · ${escape(booking.travel_class)}</small></div><div><small>JOURNEY</small><strong>${escape(booking.from_station)} → ${escape(booking.to_station)}</strong><small>${escape(booking.journey_date)}</small></div><div><small>PASSENGER / SEAT</small><strong>${escape(booking.passengers[0].name)}${booking.passengers.length > 1 ? ` +${booking.passengers.length - 1}` : ""}</strong><small>${escape(booking.passengers.map((p) => `${p.coach}-${p.seat}`).join(", "))} · ${money(booking.fare)}</small></div><div class="booking-row-actions"><span class="booking-status ${booking.status === "CANCELLED" ? "cancelled" : ""}">${escape(booking.status)}</span><div class="d-flex flex-wrap gap-1 mt-2"><a class="btn btn-outline btn-sm" href="/booking-success.html?pnr=${encodeURIComponent(booking.pnr)}">View ticket</a><a class="btn btn-outline btn-sm" href="/booking-success.html?pnr=${encodeURIComponent(booking.pnr)}&print=1">Print</a>${booking.status !== "CANCELLED" ? `<button class="btn btn-outline btn-sm" data-cancel="${escape(booking.pnr)}">Cancel</button>` : ""}</div></div></article>`).join("");
      list.querySelectorAll("[data-cancel]").forEach((button) => button.addEventListener("click", async () => {
        if (!window.confirm("Cancel this demo booking? This action cannot be undone.")) return;
        button.disabled = true;
        try {
          await api().request(`/bookings/${encodeURIComponent(button.dataset.cancel)}/cancel`, { method: "PATCH", body: "{}" });
          window.showToast("Demo booking cancelled.");
          renderBookings();
        } catch (error) { button.disabled = false; window.showToast(error.message, true); }
      }));
    } catch (error) { document.getElementById("bookings-list").innerHTML = `<div class="alert-inline">${escape(error.message)}</div>`; }
  }

  window.RailBooking = { renderPassengers, renderSeats, renderPayment, renderSuccess, renderBookings, ticketMarkup, bindPrint };
})();

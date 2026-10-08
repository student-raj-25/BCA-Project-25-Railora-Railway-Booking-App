require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { DatabaseSync } = require("node:sqlite");

const app = express();
const port = Number(process.env.PORT) || 3000;
const jwtSecret = process.env.JWT_SECRET;
const allowedOrigins = (process.env.CLIENT_ORIGIN || "").split(",").map((origin) => origin.trim()).filter(Boolean);
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("Set JWT_SECRET to a random secret at least 32 characters long.");
}

const configuredDatabase = process.env.DATABASE_PATH || "./data/railway.sqlite";
const databasePath = path.resolve(__dirname, configuredDatabase);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    mobile TEXT NOT NULL UNIQUE,
    dob TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pnr TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    train_id TEXT NOT NULL,
    train_name TEXT NOT NULL,
    train_number TEXT NOT NULL,
    from_station TEXT NOT NULL,
    to_station TEXT NOT NULL,
    journey_date TEXT NOT NULL,
    travel_class TEXT NOT NULL,
    quota TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration TEXT NOT NULL,
    fare REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'CONFIRMED',
    passengers_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const trains = [
  { id: "12951", number: "12951", name: "Mumbai Rajdhani Express", from: "Mumbai Central", to: "New Delhi", departure: "16:35", arrival: "08:10", duration: "15h 35m", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], type: "Rajdhani", distance: 1384, prices: { "Sleeper": 0, "AC 3 Tier": 2145, "AC 2 Tier": 2940, "AC First Class": 4980, "Chair Car": 0, "Second Sitting": 0 }, seats: { "Sleeper": 120, "AC 3 Tier": 65, "AC 2 Tier": 28, "AC First Class": 10 } },
  { id: "12002", number: "12002", name: "Bhopal Shatabdi Express", from: "New Delhi", to: "Bhopal Junction", departure: "06:00", arrival: "14:35", duration: "8h 35m", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], type: "Shatabdi", distance: 707, prices: { "Sleeper": 0, "AC 3 Tier": 0, "AC 2 Tier": 0, "AC First Class": 0, "Chair Car": 1480, "Second Sitting": 760 }, seats: { "Chair Car": 74, "Second Sitting": 115 } },
  { id: "12264", number: "12264", name: "Pune Duronto Express", from: "Hazrat Nizamuddin", to: "Pune Junction", departure: "22:10", arrival: "15:10", duration: "17h 00m", days: ["Mon", "Wed", "Fri", "Sun"], type: "Duronto", distance: 1472, prices: { "Sleeper": 920, "AC 3 Tier": 2150, "AC 2 Tier": 2990, "AC First Class": 5120, "Chair Car": 0, "Second Sitting": 0 }, seats: { "Sleeper": 84, "AC 3 Tier": 52, "AC 2 Tier": 19, "AC First Class": 7 } },
  { id: "22436", number: "22436", name: "Vande Bharat Express", from: "New Delhi", to: "Varanasi Junction", departure: "15:00", arrival: "23:00", duration: "8h 00m", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], type: "Vande Bharat", distance: 771, prices: { "Sleeper": 0, "AC 3 Tier": 0, "AC 2 Tier": 0, "AC First Class": 0, "Chair Car": 1805, "Second Sitting": 0 }, seats: { "Chair Car": 48 } },
  { id: "12909", number: "12909", name: "Garib Rath Express", from: "Bandra Terminus", to: "Hazrat Nizamuddin", departure: "16:35", arrival: "09:15", duration: "16h 40m", days: ["Mon", "Tue", "Thu", "Fri", "Sat"], type: "Garib Rath", distance: 1367, prices: { "Sleeper": 0, "AC 3 Tier": 1240, "AC 2 Tier": 0, "AC First Class": 0, "Chair Car": 0, "Second Sitting": 0 }, seats: { "AC 3 Tier": 102 } },
  { id: "12627", number: "12627", name: "Karnataka Express", from: "KSR Bengaluru", to: "New Delhi", departure: "19:20", arrival: "10:30", duration: "39h 10m", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], type: "Express", distance: 2401, prices: { "Sleeper": 865, "AC 3 Tier": 2260, "AC 2 Tier": 3200, "AC First Class": 5420, "Chair Car": 0, "Second Sitting": 0 }, seats: { "Sleeper": 91, "AC 3 Tier": 36, "AC 2 Tier": 12, "AC First Class": 3 } }
];
const stations = ["Mumbai Central", "Surat", "Vadodara Junction", "Ratlam Junction", "Kota Junction", "New Delhi", "Bhopal Junction", "Hazrat Nizamuddin", "Pune Junction", "Varanasi Junction", "Bandra Terminus", "KSR Bengaluru"];

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use((req, _res, next) => {
  if (!req.body) req.body = {};
  next();
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(origin && allowedOrigins.includes(origin) ? 204 : 403);
  next();
});
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
  next();
});

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    if (!token) throw new Error("Missing token");
    const payload = jwt.verify(token, jwtSecret);
    const user = db.prepare("SELECT id, name, email, mobile, dob, gender FROM users WHERE id = ?").get(payload.sub);
    if (!user) throw new Error("Unknown user");
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Please sign in to continue." });
  }
}

function cleanText(value, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isUniqueConflict(error) {
  return error.code === "ERR_SQLITE_ERROR" && /UNIQUE constraint failed/i.test(error.message);
}

function validJourneyDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function issueToken(userId, remember = false) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: remember ? "30d" : "8h" });
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", database: "sqlite" }));
app.get("/api/trains", (req, res) => {
  const from = cleanText(req.query.from).toLowerCase();
  const to = cleanText(req.query.to).toLowerCase();
  const travelClass = cleanText(req.query.travelClass);
  const date = cleanText(req.query.date, 10);
  const parsedDate = date ? validJourneyDate(date) : null;
  if (date && !parsedDate) return res.status(400).json({ error: "Choose a valid journey date." });
  const runningDay = parsedDate && ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][parsedDate.getUTCDay()];
  const result = trains.filter((train) =>
    (!from || train.from.toLowerCase().includes(from)) &&
    (!to || train.to.toLowerCase().includes(to)) &&
    (!runningDay || train.days.includes(runningDay)) &&
    (!travelClass || (train.prices[travelClass] > 0 && train.seats[travelClass] > 0))
  );
  res.json({ trains: result, stations });
});
app.get("/api/trains/:id/seats", (req, res) => {
  const train = trains.find((item) => item.id === req.params.id);
  const journeyDate = cleanText(req.query.date, 10);
  const travelClass = cleanText(req.query.travelClass, 32);
  const parsedDate = validJourneyDate(journeyDate);
  if (!train || !parsedDate || !train.seats[travelClass]) {
    return res.status(400).json({ error: "Provide a valid train, journey date, and available class." });
  }
  const runningDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][parsedDate.getUTCDay()];
  if (!train.days.includes(runningDay)) return res.status(400).json({ error: "This train does not run on the selected date." });
  const bookedSeats = new Set([3, 8, 13, 21, 29, 34, 42, 48, 53, 62, 69]);
  db.prepare("SELECT passengers_json FROM bookings WHERE train_id = ? AND journey_date = ? AND travel_class = ? AND status = 'CONFIRMED'")
    .all(train.id, journeyDate, travelClass)
    .forEach((row) => JSON.parse(row.passengers_json).forEach((passenger) => bookedSeats.add(Number(passenger.seat))));
  res.json({ bookedSeats: [...bookedSeats] });
});
app.get("/api/trains/:id", (req, res) => {
  const train = trains.find((item) => item.id === req.params.id);
  if (!train) return res.status(404).json({ error: "Train not found." });
  res.json({ train, stations });
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 80);
    const email = cleanText(req.body.email, 120).toLowerCase();
    const mobile = cleanText(req.body.mobile, 10);
    const dob = cleanText(req.body.dob, 10);
    const gender = cleanText(req.body.gender, 24);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: "Enter a valid name, email address, and 10-digit mobile number." });
    }
    const birthDate = dob ? validJourneyDate(dob) : null;
    if ((dob && (!birthDate || dob > new Date().toISOString().slice(0, 10))) ||
        !["", "Female", "Male", "Other"].includes(gender)) {
      return res.status(400).json({ error: "Enter a valid date of birth and gender." });
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      return res.status(400).json({ error: "Password must be 8+ characters with upper/lowercase, a number, and a symbol." });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = db.prepare("INSERT INTO users (name, email, mobile, dob, gender, password_hash) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, email, mobile, dob, gender, passwordHash);
    const user = { id: result.lastInsertRowid, name, email, mobile, dob, gender };
    res.status(201).json({ token: issueToken(user.id), user });
  } catch (error) {
    if (isUniqueConflict(error)) return res.status(409).json({ error: "That email or mobile number is already registered." });
    next(error);
  }
});
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const identifier = cleanText(req.body.identifier, 120);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE OR mobile = ?").get(identifier, identifier);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Email/mobile or password is incorrect." });
    }
    const { password_hash: _secret, ...safeUser } = user;
    res.json({ token: issueToken(user.id, req.body.remember === "on" || req.body.remember === true), user: safeUser });
  } catch (error) {
    next(error);
  }
});
app.get("/api/profile", requireAuth, (req, res) => res.json({ user: req.user }));
app.put("/api/profile", requireAuth, (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 80);
    const mobile = cleanText(req.body.mobile, 10);
    const dob = cleanText(req.body.dob, 10);
    const gender = cleanText(req.body.gender, 24);
    const birthDate = dob ? validJourneyDate(dob) : null;
    if (name.length < 2 || !/^\d{10}$/.test(mobile) ||
        (dob && (!birthDate || dob > new Date().toISOString().slice(0, 10))) ||
        !["", "Female", "Male", "Other"].includes(gender)) {
      return res.status(400).json({ error: "Enter valid name, mobile, date of birth, and gender details." });
    }
    db.prepare("UPDATE users SET name = ?, mobile = ?, dob = ?, gender = ? WHERE id = ?").run(name, mobile, dob, gender, req.user.id);
    res.json({ user: db.prepare("SELECT id, name, email, mobile, dob, gender FROM users WHERE id = ?").get(req.user.id) });
  } catch (error) {
    if (isUniqueConflict(error)) return res.status(409).json({ error: "That mobile number is already registered." });
    next(error);
  }
});

app.post("/api/bookings", requireAuth, (req, res, next) => {
  try {
    const body = req.body;
    const train = trains.find((item) => item.id === cleanText(body.trainId));
    const passengers = Array.isArray(body.passengers) ? body.passengers : [];
    if (!train || passengers.length < 1 || passengers.length > 6) return res.status(400).json({ error: "Select a valid train and 1–6 passengers." });
    const travelClass = cleanText(body.travelClass);
    const unitFare = train.prices[travelClass];
    if (!unitFare || !train.seats[travelClass]) return res.status(400).json({ error: "That class is not available on this train." });
    const from = cleanText(body.from, 80) || train.from;
    const to = cleanText(body.to, 80) || train.to;
    if (from !== train.from || to !== train.to) return res.status(400).json({ error: "The selected route does not match this train." });
    const quota = cleanText(body.quota, 24) || "General";
    if (!["General", "Tatkal", "Ladies", "Senior Citizen"].includes(quota)) return res.status(400).json({ error: "Select a valid booking quota." });
    const journeyDate = cleanText(body.journeyDate);
    const parsedJourneyDate = validJourneyDate(journeyDate);
    if (!parsedJourneyDate || journeyDate < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ error: "Select a valid future journey date." });
    }
    const runningDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][parsedJourneyDate.getUTCDay()];
    if (!train.days.includes(runningDay)) return res.status(400).json({ error: "This train does not run on the selected date." });
    const validatedPassengers = passengers.map((passenger) => ({
      name: cleanText(passenger.name, 80),
      age: Number(passenger.age),
      gender: cleanText(passenger.gender, 16),
      berth: cleanText(passenger.berth, 24),
      nationality: cleanText(passenger.nationality, 40) || "Indian",
      coach: "S1",
      seat: Number(passenger.seatNumber)
    }));
    const blockedSeats = new Set([3, 8, 13, 21, 29, 34, 42, 48, 53, 62, 69]);
    const existing = db.prepare("SELECT passengers_json FROM bookings WHERE train_id = ? AND journey_date = ? AND travel_class = ? AND status = 'CONFIRMED'")
      .all(train.id, journeyDate, travelClass);
    existing.forEach((row) => JSON.parse(row.passengers_json).forEach((passenger) => blockedSeats.add(Number(passenger.seat))));
    if (validatedPassengers.some((p) => p.name.length < 2 || !Number.isInteger(p.age) || p.age < 1 || p.age > 120 || !["Male", "Female", "Other"].includes(p.gender) || !Number.isInteger(p.seat) || p.seat < 1 || p.seat > 72) ||
        new Set(validatedPassengers.map((p) => p.seat)).size !== validatedPassengers.length ||
        validatedPassengers.some((p) => blockedSeats.has(p.seat)) ||
        validatedPassengers.some((p) => !["No preference", "Lower", "Middle", "Upper", "Side Lower", "Side Upper"].includes(p.berth))) {
      return res.status(400).json({ error: "Check passenger name, age, gender, berth preference, and selected seats." });
    }
    const baseFare = unitFare * passengers.length;
    const fare = Math.round(baseFare + 40 + baseFare * 0.05 + 15);
    let pnr;
    do { pnr = String(1000000000 + Math.floor(Math.random() * 9000000000)); }
    while (db.prepare("SELECT 1 FROM bookings WHERE pnr = ?").get(pnr));
    db.prepare(`INSERT INTO bookings (pnr, user_id, train_id, train_name, train_number, from_station, to_station, journey_date, travel_class, quota, departure_time, arrival_time, duration, fare, passengers_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      pnr, req.user.id, train.id, train.name, train.number, from,
      to, journeyDate, travelClass,
      quota, train.departure, train.arrival,
      train.duration, fare, JSON.stringify(validatedPassengers)
    );
    res.status(201).json({ booking: getBooking(pnr, req.user.id) });
  } catch (error) { next(error); }
});

function getBooking(pnr, userId) {
  const row = db.prepare("SELECT * FROM bookings WHERE pnr = ? AND user_id = ?").get(pnr, userId);
  if (!row) return null;
  return { ...row, passengers: JSON.parse(row.passengers_json) };
}
app.get("/api/bookings", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT pnr FROM bookings WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ bookings: rows.map((row) => getBooking(row.pnr, req.user.id)) });
});
app.get("/api/bookings/:pnr", requireAuth, (req, res) => {
  const booking = getBooking(cleanText(req.params.pnr, 16), req.user.id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  res.json({ booking });
});
app.patch("/api/bookings/:pnr/cancel", requireAuth, (req, res) => {
  const booking = getBooking(cleanText(req.params.pnr, 16), req.user.id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  if (booking.status === "CANCELLED") return res.status(409).json({ error: "This booking is already cancelled." });
  db.prepare("UPDATE bookings SET status = 'CANCELLED' WHERE pnr = ? AND user_id = ?").run(booking.pnr, req.user.id);
  res.json({ booking: getBooking(booking.pnr, req.user.id) });
});
app.post("/api/contact", (req, res, next) => {
  try {
    const { name, email, mobile, message } = req.body;
    if (cleanText(name, 80).length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(email, 120)) || !/^\d{10}$/.test(cleanText(mobile, 10)) || cleanText(message, 1200).length < 10) {
      return res.status(400).json({ error: "Please complete all contact fields with valid details." });
    }
    db.prepare("INSERT INTO contacts (name, email, mobile, message) VALUES (?, ?, ?, ?)").run(cleanText(name, 80), cleanText(email, 120), cleanText(mobile, 10), cleanText(message, 1200));
    res.status(201).json({ message: "Your message has been received." });
  } catch (error) { next(error); }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(port, () => console.log(`Railway booking app listening at http://localhost:${port}`));

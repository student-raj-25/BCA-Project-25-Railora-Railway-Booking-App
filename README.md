# Railora railway ticket booking

Railora is a responsive, full-stack railway booking demo built with HTML, CSS, Bootstrap 5, vanilla JavaScript, Express, and SQLite. It uses sample train schedules and simulated payments; it is not an official railway booking service and must not be used to buy real tickets.
<br>
Live Demo:https://railora-ticket-book.netlify.app
<br>

![image alt](https://github.com/student-raj-25/railora-railway-booking/blob/main/rail.PNG)
<br>
![image alt](https://github.com/student-raj-25/railora-railway-booking/blob/main/create.PNG)
<br>

## Project structure

```text
railway-ticket-booking/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── server.js
├── render.yaml
├── netlify.toml
├── scripts/
│   └── netlify-build.js
├── data/                       # Created at runtime; SQLite database is ignored by Git
└── public/
    ├── index.html
    ├── login.html
    ├── signup.html
    ├── search-trains.html
    ├── train-details.html
    ├── passenger-details.html
    ├── seat-selection.html
    ├── payment.html
    ├── booking-success.html
    ├── my-bookings.html
    ├── profile.html
    ├── contact.html
    ├── css/
    │   ├── style.css
    │   └── responsive.css
    └── js/
        ├── runtime-config.json
        ├── api.js
        ├── auth.js
        ├── booking.js
        ├── main.js
        └── train.js
```

## Run locally with VS Code

1. Install Node.js 22.13 or newer (the app uses Node's built-in SQLite module).
2. Open this project folder in VS Code.
3. In the integrated terminal, run:

   ```powershell
   npm install
   Copy-Item .env.example .env
   ```

4. Edit `.env` and set `JWT_SECRET` to a unique random value of at least 32 characters. For example, generate a development secret with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

5. Start the web app:

   ```powershell
   npm start
   ```

6. Open `http://localhost:3000`. Express serves both the pages and the `/api` endpoints. The SQLite database is created automatically at `data/railway.sqlite`.

### Live Server note

The app has a backend, so opening `public/index.html` through VS Code Live Server alone will not provide the `/api` endpoints. Start the Express server with `npm start` and use `http://localhost:3000` for the complete application. Live Server can preview the static markup, but signup, login, train data, and bookings require Express.

## Deploy

### Netlify frontend + persistent Render backend

Netlify hosts the website frontend; the included Render Blueprint runs Express and stores data on its persistent SQLite disk. Both services need to be deployed—the Netlify site by itself cannot run the booking API or database. A Git repository containing this project is required to create the Render Blueprint.

1. Push this project as the repository root to GitHub (or another Git provider supported by both services).
2. Create a Netlify site from that repository. The included `netlify.toml` sets `public` as the publish directory and runs `npm run build:netlify`. The initial build needs `RAILORA_API_BASE`; you can create the Netlify site, note its assigned `*.netlify.app` URL, and set the environment variable after the backend URL is available.
3. In Render, create a Blueprint from the same repository. The `render.yaml` configures an Express service, persistent SQLite disk, generated `JWT_SECRET`, and prompts for `CLIENT_ORIGIN`. Set `CLIENT_ORIGIN` to the exact Netlify origin (for example, `https://your-site.netlify.app`, without a trailing slash). Deploy and note the Render service URL.
4. In Netlify site environment variables, set `RAILORA_API_BASE` to the Render origin (for example, `https://railora-api.onrender.com`, without a path or trailing slash). Trigger a new deploy. The Netlify build writes this URL to `public/js/runtime-config.json`; the browser then sends API requests to Render.
5. Visit `/api/health` on the Render service and verify it returns `{"status":"ok","database":"sqlite"}`. Then test signup and a demo booking on the Netlify URL.

For a one-off CLI deploy after the Render backend is ready, set the same build environment variable and deploy the generated static files:

```powershell
$env:NETLIFY = "true"
$env:RAILORA_API_BASE = "https://railora-api.onrender.com"
npm run build:netlify
npx netlify-cli deploy --prod --dir=public
```

Authenticate the Netlify CLI with `npx netlify-cli login` first, and create/link the site with `npx netlify-cli init`. Never put `JWT_SECRET` in Netlify; it belongs only in the backend environment. Never use the example JWT secret in production. Keep the SQLite disk attached to the backend service.

### Deploy the full app on Render

Use the included `render.yaml` blueprint to deploy the complete Express app and its static frontend together. Configure a strong `JWT_SECRET`; the blueprint requests a generated secret. A persistent disk is configured for SQLite. After deploy, open the service URL.

## User, booking, and storage flow

- **Users:** `/api/auth/signup` validates account fields and stores a bcrypt password hash in the `users` SQLite table. Login returns a signed JWT; the browser stores it in `localStorage` and sends it as a bearer token. The optional “Remember me” choice gives a longer-lived token. Logout and expired sessions clear the token, user profile, and passenger/seat draft state.
- **Train search:** sample train records live in `server.js`. Search and train detail data are served by `/api/trains`; no live timetable or availability provider is contacted.
- **Booking flow:** journey and passenger drafts use `localStorage` while navigating the separate pages. The demo seat map limits selection and checks duplicate seats server-side for active bookings. The payment form accepts demo-only details but does not send or store them, and no payment gateway is connected. On confirmation, the server recalculates the fare, generates a PNR, and saves the booking and passenger list in SQLite.
- **My bookings:** authenticated API endpoints return only the signed-in user's bookings. Cancellation updates the stored status to `CANCELLED`; it is a demo operation and does not contact a carrier.
- **Database:** SQLite creates `users`, `bookings`, and `contacts` tables on server start. Keep `data/railway.sqlite` and its WAL files backed up together if preserving a local database.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Service and database health |
| GET | `/api/trains` | Search sample trains |
| GET | `/api/trains/:id` | Sample route and train details |
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Sign in |
| GET / PUT | `/api/profile` | Read or update the signed-in profile |
| GET / POST | `/api/bookings` | List bookings or create a demo booking |
| GET | `/api/bookings/:pnr` | Read an owned booking |
| PATCH | `/api/bookings/:pnr/cancel` | Cancel an owned demo booking |
| POST | `/api/contact` | Save a contact message |

## Demo boundaries

This is a portfolio project, not an official railway reservation platform. Timetables, inventory, seat statuses, and fares are illustrative. Payment details are never transmitted to a payment processor. Do not enter a real payment card number.

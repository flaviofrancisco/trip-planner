# ✈️ Trip Planner

An interactive multi-stop travel itinerary planner with maps, drag-and-drop reordering, budgeting, sharing, Excel export, an embedded **AI Travel Agent**, and a live **voice-to-voice translator**.

Built end-to-end against the PRD in [`trip-planner.md`](./trip-planner.md).

---

## Table of contents

- [Stack](#stack)
- [Quick start](#quick-start)
- [Security & credentials](#security--credentials)
- [Make targets](#make-targets)
- [Features](#features)
- [Project layout](#project-layout)
- [API reference](#api-reference)
- [Notes & limitations](#notes--limitations)

---

## Stack

| Layer | Tech |
|---|---|
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · Google Maps JS API · `@dnd-kit` · `lucide-react` · `xlsx` |
| **Backend** | Node.js · Express · TypeScript · Mongoose · JWT (bcrypt + zod) · OpenAI SDK · Google Generative AI SDK |
| **Database** | MongoDB 7 |
| **Maps & Geocoding** | Google Maps JavaScript API · Google Places Autocomplete · Google Geocoding API · Google Routes API v2 |
| **Runtime** | Docker + Docker Compose |

---

## Quick start

**Prerequisites:** Docker, Docker Compose, and `make`.

```bash
# 1. Create your local env file from the template
cp .env.example .env

# 2. Edit .env and fill in:
#    - JWT_SECRET with a long random string (e.g. `openssl rand -hex 48`)
#    - GOOGLE_MAPS_API_KEY and VITE_GOOGLE_MAPS_API_KEY with your Google Maps API key

# 3. Build and start everything
make rebuild
```

Then open:

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend health | http://localhost:4000/api/health |
| MongoDB | `mongodb://localhost:27017/tripplanner` |

### Google Maps API setup

A Google Maps API key is required for maps, geocoding, autocomplete, and directions. In the [Google Cloud Console](https://console.cloud.google.com/apis/library), enable these APIs for your key:

- **Maps JavaScript API** — interactive map rendering
- **Places API** — autocomplete search
- **Geocoding API** — address lookup and reverse geocoding
- **Routes API** — real route directions with duration, distance, fare, and polylines

Set the same key in `.env` as both `GOOGLE_MAPS_API_KEY` (backend) and `VITE_GOOGLE_MAPS_API_KEY` (frontend).

After signing up, click the **Settings** button in the header to add your OpenAI and/or Gemini API keys (stored per-user in the DB). At least one is required for the AI agent and voice translator.

Source under `frontend/src` and `backend/src` is bind-mounted into the containers, so edits hot-reload.

---

## Security & credentials

This project handles secrets (JWT signing key, third-party API keys). The repo is configured to keep them **out of git**:

- 🔒 **`.gitignore` excludes** `.env`, `.env.*`, `*.pem`, `*.key`, `service-account*.json`, and other common credential file patterns. Only `.env.example` is tracked.
- 🔒 **`.env.example`** ships placeholder values only — never commit a real `.env`.
- 🔒 **User API keys** (OpenAI / Gemini) are stored per-user in MongoDB and stripped from all JSON responses (the API returns booleans like `{ openai: true }`, never the key itself).
- 🔒 **Passwords** are bcrypt-hashed; the schema never returns the hash.

### Before your first commit

If you are about to initialize git in this repo, verify nothing sensitive is staged:

```bash
git init
git status                         # should NOT list .env
git check-ignore -v .env           # should confirm .env is ignored
git ls-files --others --ignored --exclude-standard   # see what's being ignored
```

### If a secret was ever committed

Rotate it immediately (regenerate `JWT_SECRET`, revoke API keys), then purge it from history with [`git filter-repo`](https://github.com/newren/git-filter-repo) or BFG. `git rm --cached .env` alone does **not** remove a secret from previous commits.

### Recommendations for production

- Generate `JWT_SECRET` with a CSPRNG (`openssl rand -hex 48`); never use the example default.
- Encrypt the user `apiKeys` field at rest (KMS-wrapped envelope encryption).
- Restrict your Google Maps API key to specific referrers/IPs and only the APIs you need.
- Set `CORS_ORIGIN` to your real frontend origin, not `http://localhost:3000`.

---

## Make targets

| Target | What it does |
|---|---|
| `make up` | clean + `docker compose up -d` |
| `make build` | clean + `docker compose build` |
| `make rebuild` | clean + `docker compose up -d --build` |
| `make down` | `docker compose down` |
| `make restart` | `down` then `up` |
| `make logs` | tail logs from all services |
| `make ps` | service status |
| `make clean` | strip macOS `._*` and `.DS_Store` files |

> The `clean` step exists because this project lives on a FAT/exFAT volume. macOS writes a `._<file>` AppleDouble companion for every file with extended attributes, and BuildKit's context loader fails with `failed to xattr ... operation not permitted` when it tries to tar them. `clean` strips them before each build.

---

## Features

### Auth & sharing
- Email/password signup & login (JWT, bcrypt-hashed passwords).
- Share any trip with another registered user by email at one of two permission levels:
  - **Viewer** — read-only access
  - **Editor** — full add / modify / delete rights

### Trip management & export
- Multiple trips, dropdown loader, per-trip live **Total Estimated Cost**.
- **Export to Excel (.xlsx)** — one click in the trip header; produces Stops, Transport, and Summary sheets (notes, costs, reservations, coordinates, ratings).

### Map & POIs (Google Maps)
- Interactive **Google Maps** with `AdvancedMarkerElement` for city and attraction markers.
- **Google Places Autocomplete** on the search box — type a name, pick from suggestions, instantly adds the place with address and coordinates.
- Add a POI by autocomplete search, manual geocode search, exact lat/lng coordinates, GPS "Use my location", or **double-clicking** anywhere on the map.
- **Address metadata** — saved automatically from autocomplete, search, or reverse geocoding; editable in the detail panel.
- **Coordinates display** — formatted as `45.4642°N, 9.1900°E` in the POI detail panel.
- Per-stop: name, address, attraction icon (museum, restaurant, park, landmark, beach, mountain, shopping, nightlife, theater, church, zoo, viewpoint, **hotel**, **airbnb**), notes, cost or free toggle, reservation icon (Hotel / Airbnb / Museum / Restaurant / Guided / Boat), 5-star rating.

### Itinerary & transport
Auto-numbered stops; transport legs visualized with color/style mapping:

| Mode | Color | Style |
|---|---|---|
| 🚆 Train | Blue | Solid |
| 🚇 Metro / Subway | Purple | Solid |
| 🚶 By Foot | Red | Dotted |
| 🚕 Taxi / Uber | Yellow | Solid |
| ✈️ Plane | Green | Solid |
| ⛴️ Ferry | Grey | Solid |
| 🚌 Bus | Orange | Solid |
| 🚗 Rented Car | Black | Solid |
| 🚏 Public Transport | Cyan | Solid |

A legend is rendered on the map.

### Google Directions integration
- Click the navigation button on any route to fetch **real directions** from the Google Routes API v2.
- **Multiple route alternatives** displayed in a picker modal with summary, duration, distance, and transit fare (when available).
- Select a route to save its **duration**, **distance**, **cost** (from fare), and **encoded polyline**.
- The map renders the **actual route path** (curved road/rail line) instead of a straight line between markers.
- Directions work for walking, driving, and transit modes; plane mode gracefully shows "not available".
- Route info persists across sessions — the polyline and metadata are stored on the leg.

### AI travel agent
Chat panel embedded in the trip page (right sidebar). Pick the provider per-request: **OpenAI `gpt-4o-mini`** or **Gemini `gemini-1.5-flash`**.

The agent has **write access** through function calling:

- `list_steps` — read the current itinerary
- `add_poi_by_city`, `add_poi_by_coords` — add stops
- `update_step` — rename, edit notes, set cost / free / rating / icons
- `delete_step`
- `reorder_steps` — apply a specific ordering
- `set_transport` — choose the transport mode between two stops
- `optimize_order` — nearest-neighbor logistics optimization

Example prompts:
- *"Add Kyoto, then Osaka, then Hiroshima, and set the transport between them all to train."*
- *"Mark step 2 as a 5-star museum and add notes about the Imperial War Museum."*
- *"Optimize my itinerary for the shortest route."*

Also: one-click **Optimize** button that runs the nearest-neighbor algorithm directly — no API key needed.

### Voice translator (live, voice-to-voice)
- Header button **Translate** opens the translator modal.
- Browser **Web Speech API** for voice input (Chrome / Edge required for `SpeechRecognition`) and **SpeechSynthesis** for spoken output.
- Backend uses your selected AI provider for translation.
- 12 languages preconfigured; supports swapping source/target and replaying the spoken translation.

### UI / UX
- Fully responsive — sidebars stack on small screens.
- **Light / Dark / System** theme; preference persisted in `localStorage` and on the user profile. "System" follows the OS preference automatically.
- Tailwind utility-first design with accessible focus states.

---

## Project layout

```
trip-planner/
├── docker-compose.yml
├── Makefile
├── .env.example
├── .gitignore
├── trip-planner.md                 # PRD
├── backend/
│   ├── Dockerfile · package.json · tsconfig.json
│   └── src/
│       ├── server.ts
│       ├── middleware/             # auth + errorHandler
│       ├── models/                 # User (apiKeys, prefs), Trip (cities, legs, expenses)
│       ├── routes/                 # auth, users, trips, ai, directions
│       └── services/              # ai, tripTools, optimizer, geocode
└── frontend/
    ├── Dockerfile · package.json · tailwind.config.js · vite.config.ts
    ├── index.html                  # Loads Google Maps JS API
    └── src/
        ├── main.tsx · App.tsx · api.ts · types.ts · constants.ts · styles.css
        ├── utils/                  # export.ts, currency.ts, date.ts, aiErrors.ts
        ├── context/                # AuthContext, ThemeContext, ToastContext, ConfirmContext
        ├── components/             # Layout, ThemeSync, SettingsModal, TripMap (Google Maps),
        │                           # MapLegend, AddPlaceForm (Places Autocomplete),
        │                           # DirectionsPicker, PoiPanel, AttractionsList,
        │                           # CitiesList, CityDetailPanel, RoutesList,
        │                           # TabbedPanel, ExpensesPanel, SharePanel,
        │                           # AIChatPanel, VoiceTranslator
        └── pages/                  # LoginPage, SignupPage, TripsPage,
                                    # TripPlannerPage, CityPlannerPage
```

---

## API reference

All routes except `/api/auth/*` require `Authorization: Bearer <jwt>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | `{ token, user }` |
| POST | `/api/auth/login` | `{ token, user }` |
| GET | `/api/users/me` | Current user (apiKeys returned as booleans) |
| PATCH | `/api/users/me` | Update name, `preferences.theme`, `apiKeys.{openai,gemini}` |
| GET | `/api/trips` | List my + shared trips |
| POST | `/api/trips` | Create trip |
| GET | `/api/trips/:id` | Trip with cities, legs, sharing, totalCost |
| PATCH | `/api/trips/:id` | Rename trip, set currency |
| DELETE | `/api/trips/:id` | Delete trip (owner only) |
| POST | `/api/trips/:id/cities` | Add city |
| PATCH | `/api/trips/:id/cities/:cityId` | Update city |
| DELETE | `/api/trips/:id/cities/:cityId` | Delete city |
| POST | `/api/trips/:id/cities/reorder` | `{ order: [cityId,…] }` |
| POST | `/api/trips/:id/cities/:cityId/attractions` | Add attraction |
| PATCH | `/api/trips/:id/cities/:cityId/attractions/:id` | Update attraction (name, address, coords, notes, cost, rating, icons, visitAt) |
| DELETE | `/api/trips/:id/cities/:cityId/attractions/:id` | Delete attraction |
| POST | `/api/trips/:id/cities/:cityId/attractions/reorder` | `{ order: [attractionId,…] }` |
| POST | `/api/trips/:id/legs` | Inter-city leg `{ fromCityId, toCityId, transportMode }` |
| PATCH | `/api/trips/:id/legs/:legId` | Update leg (mode, cost, duration, distance, routePolyline) |
| DELETE | `/api/trips/:id/legs/:legId` | Delete inter-city leg |
| POST | `/api/trips/:id/cities/:cityId/legs` | Intra-city leg between attractions |
| PATCH | `/api/trips/:id/cities/:cityId/legs/:legId` | Update intra-city leg |
| DELETE | `/api/trips/:id/cities/:cityId/legs/:legId` | Delete intra-city leg |
| POST | `/api/trips/:id/expenses` | Add trip-level expense |
| PATCH | `/api/trips/:id/expenses/:expenseId` | Update trip-level expense |
| DELETE | `/api/trips/:id/expenses/:expenseId` | Delete trip-level expense |
| POST | `/api/trips/:id/cities/:cityId/expenses` | Add city-level expense |
| PATCH | `/api/trips/:id/cities/:cityId/expenses/:expenseId` | Update city-level expense |
| DELETE | `/api/trips/:id/cities/:cityId/expenses/:expenseId` | Delete city-level expense |
| POST | `/api/trips/:id/share` | `{ email, permission }` (owner only) |
| DELETE | `/api/trips/:id/share/:userId` | Unshare (owner only) |
| GET | `/api/directions` | Proxy to Google Routes API v2 (origin, destination, transportMode) |
| POST | `/api/ai/chat` | `{ tripId, provider, messages }` → `{ reply, toolCalls, trip }` |
| POST | `/api/ai/translate` | `{ provider, text, sourceLang, targetLang }` → `{ translated }` |
| POST | `/api/ai/optimize/:tripId` | Reorders stops via nearest-neighbor heuristic |

---

## Notes & limitations

- `JWT_SECRET` defaults to `change-me-in-prod` in `docker-compose.yml` — set it via `.env` for anything beyond local hacking.
- API keys live on the user document in MongoDB; the schema strips them from responses but **does not encrypt at rest**. Wrap them with KMS for production.
- **Google Maps API key** is required. Enable Maps JavaScript API, Places API, Geocoding API, and Routes API in your Google Cloud project. The same key is used by both frontend and backend.
- Voice recognition relies on the Web Speech API and works best in Chrome / Edge. Translation and TTS work in all modern browsers.
- AI tool calling can chain many edits per turn (up to 6 rounds). The chat panel only appears for users with editor or owner permission on the trip.
- Directions for **plane** mode are not available (Google Routes API does not support flight routing); the map falls back to a straight line.
- Transit **fare** information depends on the transit agency providing data to Google; it may not be available in all regions.

---

## License

Private / unpublished.

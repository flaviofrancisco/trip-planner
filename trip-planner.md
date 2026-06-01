# SYSTEM DIRECTIVE FOR CLAUDE CODE
You are an expert Full-Stack Developer. Your task is to build a comprehensive, interactive Travel Itinerary Planner based on the Product Requirements Document (PRD) below. Implement the application step-by-step, ensuring clean architectural boundaries, responsive design, and robust database models. 

---

# Product Requirements Document (PRD): Custom Travel Itinerary Planner

## 1. Project Overview
An interactive, highly responsive web application for travel enthusiasts to plan, visualize, and share multi-stop, multi-city itineraries on a map. Users can group trips by cities, plot points of interest (POIs) within those cities, dynamically re-order their stops, connect them using color-coded transportation modes, track granular costs, collaborate with others, and leverage an integrated AI Assistant to optimize logistics and bridge language barriers.

## 2. User Architecture & Authentication
* **Authentication:** Secure user registration, login, and session management (JWT-based).
* **Sharing & Permissions:** Users can share specific trips with other registered users via email/username with two distinct permission levels:
    * **Viewer:** Can see the itinerary, map, notes, and costs but cannot make changes.
    * **Editor:** Has full rights to add, modify, delete, and re-order steps, cities, and details.

## 3. Core Features & User Stories

### 3.1 UI/UX & Hierarchical Design
* **As a user,** I want a fully **responsive user interface** (desktop, tablet, mobile) built with **Tailwind CSS** for a clean, modern, cohesive aesthetic.
* **As a user,** I want the application to support both **Light Mode and Dark Mode**, adapting to my system preference or a manual toggle.
* **As a user,** I want to organize my trip hierarchically: **Trip -> Cities -> Attractions**.
    * *Example:* A "Japan" Trip contains the cities Tokyo, Kyoto, and Osaka. Clicking on "Tokyo" opens the specific attractions visited within Tokyo.

### 3.2 Trip & Budget Management
* **As a user,** I want to create a new trip and load saved trips dynamically from a dashboard.
* **As a user,** I want to see a **Total Estimated Cost** dynamically calculated. The budget must be broken down by:
    * **City-level costs** (e.g., total spent in Kyoto vs. Osaka).
    * **Inter-city transport costs** (e.g., Bullet train from Tokyo to Kyoto).
    * **Intra-city costs** (Attractions, local transit).
    * **Daily extra expenses:** Categories for Breakfast, Lunch, Dinner, Snacks, Pharmacies, and Small Shopping.
* **As a user,** I want to **export my trip planner data to Excel (.xlsx) or Google Sheets**, including all steps, notes, costs, and reservation details.

### 3.3 City & Point of Interest (POI) Management
* **As a user,** I want to add Cities to my trip and define the transportation method and cost to travel between them.
* **As a user,** I want to add POIs/Attractions within a city by:
    * **Google Places Autocomplete** — type a name, pick from suggestions, address and coordinates auto-filled.
    * **Geocode search** — search by address with Google Geocoding API.
    * **Exact coordinates** — input Latitude/Longitude manually.
    * **GPS location** — "Use my location" button with reverse geocoding.
    * **Double-click on map** — click anywhere on Google Maps to add a city or attraction with reverse-geocoded address.
* **As a user,** I want to click on an attraction marker to open a detailed panel to input:
    * Custom **Name** and **Address** (auto-populated, editable).
    * **Coordinates** displayed as formatted lat/lng (e.g., `45.4642°N, 9.1900°E`).
    * Domain-specific **Icon** (museum, restaurant, park, landmark, beach, mountain, shopping, nightlife, theater, church, zoo, viewpoint, **hotel**, **airbnb**).
    * **Date and Time** of the visit.
    * Rich **Notes** (*"What I would like to see and do?"*).
    * **Attraction Cost** (or mark as Free).
    * **Transportation Cost & Mode** to get to this specific attraction from the previous one.
    * **Reservation Type Icon** (Options: *Hotel, Airbnb, Museum, Restaurant, Guided Trip, Boat Ride*).
    * A post-visit **5-Star Rating**.

### 3.4a Google Directions & Route Planning
* **As a user,** I want to fetch **real directions** from Google Routes API when creating or editing a transport route between stops.
* **As a user,** I want to see **multiple route alternatives** with summary, duration, distance, and transit fare (when available) in a picker modal.
* **As a user,** I want to select the best route and have its **duration, distance, cost (from fare), and route polyline** saved on the leg.
* **As a user,** I want the map to render the **actual route path** (curved road/rail line) instead of a straight line between markers.
* **As a user,** I want route information to persist across sessions.
* Transport mode mapping to Google Routes API: foot → WALK, taxi/car → DRIVE, bus/train/metro/ferry/transit → TRANSIT, plane → not available (straight line).

### 3.4 Itinerary Sequence, Re-ordering & Transport Visualization
* **As a user,** I want to **seamlessly re-order my planned cities and attractions using a drag-and-drop interface** so I can easily adjust my itinerary sequence. The numbering and connecting map routes must update automatically when a re-order occurs.
* **As a user,** I want my travel steps (both between cities and between attractions within a city) to be explicitly numbered and ordered sequentially.
* **As a user,** I want the connections between markers to be visualized as colored polyline paths on the map.
* **Map Legend & Color-Coding:**
    * 🟦 **Blue (Solid Line):** Train
    * 🟪 **Purple (Solid Line):** Metro / Subway
    * 🟥 **Red (Dotted Line):** By Foot
    * 🟨 **Yellow (Solid Line):** Taxi / Uber
    * 🟩 **Green (Solid Line):** Plane
    * ⬜ **Grey (Solid Line):** Ferry
    * 🟧 **Orange (Solid Line):** Bus
    * ⬛ **Black (Solid Line):** Rented Car
    * 🔵 **Cyan (Solid Line):** Public Transport

### 3.5 AI Travel Agent & Companion Features
* **As a user,** I want an interactive chat interface with an AI Agent, with a settings panel to input my own **OpenAI API Key** or **Gemini API Key**.
* **As a user,** I want the AI to have **write-access** (Function/Tool Calling) to edit my trips (add/remove POIs, update notes, change transport modes, and automatically re-order sequences).
* **As a user,** I want the AI to **optimize logistics**, analyzing my daily itinerary and rearranging attractions based on geographic proximity and time management.
* **As a traveler,** I want a **live voice-to-voice translation** feature powered by AI to converse smoothly with locals.

---

## 4. Technical Stack & Architecture

### Frontend
* **Framework:** React 18 (using Functional Components and Hooks).
* **Language:** TypeScript
* **Styling:** Tailwind CSS (configured for React with dark mode strategy enabled).
* **Drag and Drop:** `@dnd-kit/core` for seamless re-ordering of cities and attractions.
* **Maps:** Google Maps JavaScript API with `AdvancedMarkerElement`, `Polyline`, and encoded polyline rendering.
* **Search:** Google Places Autocomplete API for city and attraction search with instant address resolution.
* **Geocoding:** Google Geocoding API for address lookup and reverse geocoding (double-click to add, "Use my location").
* **Directions:** Google Routes API v2 for real route directions with multiple alternatives, duration, distance, fare, and encoded polylines.
* **Data Export:** `xlsx` library for Excel export.
* **Audio:** Web Audio API integrated with the chosen AI provider's speech-to-text/text-to-speech services for the translator.

### Backend
* **Environment:** Node.js with Express.
* **Language:** TypeScript
* **Database:** MongoDB 7 (using Mongoose for schema modeling).
* **AI Integration:** Integration layer supporting OpenAI Node SDK and Google Gen AI SDK for secure function-calling to mutate MongoDB documents.
* **Directions Proxy:** Server-side proxy to Google Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`) — keeps the API key server-side.

### DevOps & Deployment
* The entire application is containerized using **Docker**.
* `docker-compose.yml` spins up Frontend (port 3000), Backend (port 4000), and MongoDB (port 27017) with `docker compose up`.
* Google Maps API key injected via environment variables: `GOOGLE_MAPS_API_KEY` (backend) and `VITE_GOOGLE_MAPS_API_KEY` (frontend).
* AI API keys (OpenAI, Gemini) are stored per-user in MongoDB and managed through the Settings UI.

---

## 5. Data Model (Hierarchical, Embedded in MongoDB)

* **User Schema:** `userId`, `email`, `passwordHash`, `name`, `apiKeys: { openai, gemini }`, `preferences: { theme }`.
* **Trip Schema:** `tripId`, `title`, `ownerId`, `currency`, `sharedWith: [{ userId, permission }]`, `cities: [City]`, `legs: [InterLeg]`, `expenses: [Expense]`, `totalCost` (virtual).
* **City Schema (Embedded in Trip):** `cityId`, `cityNumber`, `name`, `coordinates: { lat, lng }`, `notes`, `startDate`, `endDate`, `attractions: [Attraction]`, `legs: [IntraLeg]`, `expenses: [Expense]`.
* **Attraction Schema (Embedded in City):** `attractionId`, `attractionNumber`, `poiName`, `address`, `coordinates: { lat, lng }`, `visitAt`, `notes`, `cost`, `isFree`, `rating`, `attractionTypeIcon` (museum, restaurant, park, landmark, beach, mountain, shopping, nightlife, theater, church, zoo, viewpoint, hotel, airbnb, other), `reservationIcon` (none, hotel, airbnb, museum, restaurant, guided, boat).
* **InterLeg Schema (Embedded in Trip):** `legId`, `fromCityId`, `toCityId`, `transportMode`, `cost`, `duration`, `distance`, `routePolyline`.
* **IntraLeg Schema (Embedded in City):** `legId`, `fromAttractionId`, `toAttractionId`, `transportMode`, `cost`, `duration`, `distance`, `routePolyline`.
* **Expense Schema (Embedded in Trip or City):** `expenseId`, `category` (breakfast, lunch, dinner, snacks, drinks, pharmacy, shopping, other), `description`, `cost`, `date`.
* **Transport Modes:** train, metro, foot, taxi, plane, ferry, bus, car, transit.
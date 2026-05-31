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
* **As a user,** I want to add POIs/Attractions within a city by searching the **Name** (Geocoding) or inputting exact **Latitude/Longitude**.
* **As a user,** I want to click on an attraction marker to open a detailed panel to input:
    * Custom **Name** and domain-specific **Icon** (e.g., museum, restaurant, park).
    * **Date and Time** of the visit.
    * Rich **Notes** (*"What I would like to see and do?"*).
    * **Attraction Cost** (or mark as Free).
    * **Transportation Cost & Mode** to get to this specific attraction from the previous one.
    * **Reservation Type Icon** (Options: *Hotel, Airbnb, Museum, Restaurant, Guided Trip, Boat Ride*).
    * A post-visit **5-Star Rating**.

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

### 3.5 AI Travel Agent & Companion Features
* **As a user,** I want an interactive chat interface with an AI Agent, with a settings panel to input my own **OpenAI API Key** or **Gemini API Key**.
* **As a user,** I want the AI to have **write-access** (Function/Tool Calling) to edit my trips (add/remove POIs, update notes, change transport modes, and automatically re-order sequences).
* **As a user,** I want the AI to **optimize logistics**, analyzing my daily itinerary and rearranging attractions based on geographic proximity and time management.
* **As a traveler,** I want a **live voice-to-voice translation** feature powered by AI to converse smoothly with locals.

---

## 4. Technical Stack & Architecture

### Frontend
* **Framework:** React (using Functional Components and Hooks).
* **State Management:** Redux Toolkit (RTK) to manage the global state of hierarchical trips, UI themes, and user sessions.
* **Language:** TypeScript
* **Styling:** Tailwind CSS (configured for React with dark mode strategy enabled).
* **Drag and Drop:** `@dnd-kit/core` (or similar modern React DnD library) for seamless re-ordering of cities and attractions.
* **Maps:** `react-leaflet` or `@react-google-maps/api`.
* **Data Export:** `xlsx` library for Excel export.
* **Audio:** Web Audio API integrated with the chosen AI provider's speech-to-text/text-to-speech services for the translator.

### Backend
* **Environment:** Node.js with Express or NestJS.
* **Language:** TypeScript
* **Database:** MongoDB (using Mongoose for schema modeling).
* **AI Integration:** Integration layer supporting OpenAI Node SDK and Google Gen AI SDK for secure function-calling to mutate MongoDB documents.

### DevOps & Deployment
* The entire application must be containerized using **Docker**.
* Provide a `docker-compose.yml` to spin up the Frontend, Backend, and MongoDB with `docker-compose up`.

---

## 5. Suggested Data Model (Hierarchical)

* **User Schema:** `userId`, `email`, `passwordHash`, `name`, `apiKeys: { openai, gemini }`, `preferences`.
* **Trip Schema:** `tripId`, `title`, `ownerId`, `sharedWith: [{ userId, permission }]`, `totalCost`.
* **City Schema (Embedded in Trip or Linked):** `cityId`, `tripId`, `cityName`, `sequenceOrder`, `arrivalDate`, `departureDate`, `transportToNextCity: { mode, cost }`. *(Note: `sequenceOrder` must be updatable via frontend drag-and-drop).*
* **Attraction/POI Schema (Linked to City):** `poiId`, `cityId`, `sequenceNumber`, `poiName`, `coordinates: { lat, lng }`, `dateTime`, `notes`, `costs: { admission, transportToHere, extraExpenses: { meals, shopping, pharmacy } }`, `rating`, `attractionTypeIcon`, `reservationIcon`, `transportModeToHere`. *(Note: `sequenceNumber` must be updatable via frontend drag-and-drop).*
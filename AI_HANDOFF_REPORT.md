# DiabetesCare 360 - AI Hand-Off Report

This document is a complete summary of the DiabetesCare 360 project state. It is designed to be fed into future AI agents as context so they instantly know the architecture, what has been built, and what the remaining limitations are.

## Architecture & Stack
The project is a 100% free-tier stack divided across three major platforms:
- **Frontend (Vercel):** React + Vite SPA.
- **Backend API (Render):** Node.js + TypeScript + Express. Handles database communication, authentication, and WebSockets.
- **ML Service (Render):** Python + FastAPI. Handles NLP parsing for meals, LSTM forecasting, and Random Forest risk models.
- **Database (Supabase):** PostgreSQL with TimescaleDB for time-series data.
- **Cache & Pub/Sub (Upstash):** Serverless Redis for WebSockets, rate limiting, and real-time events.

## What is Completely Finished
According to the original PRD (`antigravity-backend-brief.md`), almost all Phases are complete.

### Frontend UI (`src/App.jsx`)
The Vercel application contains a fully functional multi-tab dashboard built in React:
1. **Overview Screen:** Displays current glucose, time in range, adherence, today's medication, and predictive insights (Risk ML).
2. **Trends Screen:** Displays the 3-hour ML forecast overlaid on actual readings via Recharts.
3. **Medications Screen:** Fetches the patient's prescriptions and indicates whether they have been taken today.
4. **Diet Screen:** Allows the user to type natural language meals (e.g., "2 rotis and dal"). This hits the Node API, proxies to the Python NLP model, breaks down the carbohydrates, and updates the list with dietary tags.
5. **Care Team Chat:** Connects the patient and clinician in a messaging interface. 

### Backend APIs (`/api`)
The Node.js backend handles all core functionality:
- **Authentication (`/auth/login`):** JWT-based secure auth using `bcrypt`.
- **Database Migrations (`knex`):** All schemas defined natively.
- **Auto-Seeding:** The `package.json` build step has been modified (`npm run migrate && npm run seed`) so that Render automatically injects dummy data (including `patient@demo.com`) on every deployment.
- **IoT Ingestion (`POST /devices/:id/readings`):** Ingests glucose readings securely.
- **Pub/Sub System (`services/redis.ts`):** Emits real-time messages via Upstash Redis whenever a new reading occurs.
- **WebSockets (`websocket/gateway.ts`):** Pushes real-time alerts.
- **Cron Jobs (`jobs/missedDose.ts`):** Runs every 15 minutes to check for un-logged medications and creates a "Missed dose" alert.
- **Test Suite (`api.test.ts`):** Complete Jest suite written and covering all endpoints.

## Known Quirks & Fixes Applied
- **Vercel TypeScript AST Parsing Bug:** Vercel's build bots crash when they try to compile the heavy backend Knex migrations. A `.vercelignore` file was added to the repository root that tells Vercel to completely ignore the `/api` and `/ml-service` folders. 
- **Array Payload Mapping Bug:** The API wraps GET responses in a `{ data: [...] }` object. The frontend `App.jsx` originally crashed by trying to run `.map()` directly on the wrapper object. This was patched in commit `6baf183`.
- **Token Naming Convention:** The backend issues `access_token` (snake_case) but the frontend was initially looking for `accessToken` (camelCase). Fixed in `App.jsx`.
- **Database Routing:** Due to Render's free tier not supporting external IPv6 traffic routing efficiently, the Supabase connection string specifically uses the *IPv4 Connection Pooler* endpoint (`aws-0-ap-northeast-1.pooler.supabase.com`).

## What Remains Unfinished (Phase 10 Blocked)
The final step in the PRD was to implement **Phase 10: CI/CD Pipeline**.
- The intention was to write a `.github/workflows/ci.yml` file to run Jest tests automatically on every GitHub push.
- **Status:** BLOCKED. The user's provided Personal Access Token (PAT) for GitHub does not have the `workflow` scope enabled. Git strictly rejects pushes that modify `.github/workflows/` without this scope.
- **Workaround:** CI/CD has been skipped. Deployments run directly to Render and Vercel without a middle-man testing action.

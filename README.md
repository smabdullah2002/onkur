# onkur - Personal Plant Manager

onkur is a personal plant-care app with a React frontend and FastAPI backend.
It helps each signed-in user manage plants, get daily AI routines, see weather-based care tips, and run plant health checks from images.

LIVE DEMO: https://onkur.netlify.app/
## Features

- User authentication with Supabase Auth (sign up, sign in, sign out)
- Per-user plant management (create, list, update, delete, mark watered)
- AI-assisted plant identification from image
- AI-enriched health assessment from image (disease probability + care suggestions)
- Daily AI routine generation based on each user's plants
- Weather-based care tips with Supabase caching by user + location + time window
- Multi-page UI:
  - Plant Manager
  - Routine
  - Health

## Tech Stack

- Frontend:
  - React 19
  - Vite 8
  - Tailwind CSS 4
  - Supabase JS SDK
- Backend:
  - FastAPI
  - Supabase Python SDK
  - Google Gemini (`google-genai`)
  - Requests
  - Pydantic

## Project Structure

- Backend app entry: `backend/main.py`
- API router composition: `backend/base.py`
- Backend APIs:
  - `backend/api/plant_identification_api.py`
  - `backend/api/routine_api.py`
  - `backend/api/weather_api.py`
- Backend services:
  - `backend/services/auth_service.py`
  - `backend/services/plant_service.py`
  - `backend/services/plant_identification.py`
  - `backend/services/routine_service.py`
  - `backend/services/weather_service.py`
- Frontend app shell and auth: `frontend/src/App.jsx`
- Frontend Supabase client: `frontend/src/lib/supabaseClient.js`
- Frontend pages:
  - `frontend/src/components/IdentifierPage/Onkurplantmanager.jsx`
  - `frontend/src/components/RoutinePage/OnkurRoutinePage.jsx`
  - `frontend/src/components/HealthPage/OnkurHealthAssessmentPage.jsx`
- Env sync helper (backend -> frontend): `scripts/sync-frontend-env.mjs`

## Authentication and User Scoping

All personal data endpoints are user-scoped.

- Backend resolves user from `Authorization: Bearer <access_token>`
- No default shared user fallback in normal flow
- Plant CRUD, routine generation, and weather tip caching all use resolved `user_id`

## Environment Variables

### Backend (`backend/.env`)

Required:

- `SUPABASE_URL`
- `SUPABASE_KEY` (service role key for backend operations)
- `GEMINI_API_KEY`
- `PLANT_ID_API`
- `PLANT_ID_URL`

Optional:

- `PLANT_ID_HEALTH_URL` (defaults to `https://plant.id/api/v3/health_assessment`)
- `SUPABASE_ANON_KEY` (recommended for frontend sync; see note below)
- `SUPABASE_JWT_SECRET`
- `SUPABASE_DEV_USER_ID` (not used in strict auth flow unless explicitly enabled)

### Frontend (`frontend/.env.local`)

Required by the app:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (defaults to `http://127.0.0.1:8000` if omitted)

Note:

- `frontend/.env.local` is auto-generated/synced from `backend/.env` before frontend dev/build.
- Sync script: `scripts/sync-frontend-env.mjs`.
- Best practice: set `SUPABASE_ANON_KEY` in `backend/.env` so frontend uses anon key (not service key).

## Database Tables (Supabase)

The backend expects these tables:

- `plants`
  - includes user-scoped rows with `user_id`
- `daily_routines`
  - used for per-user daily routine caching
- `weather_tips`
  - used for per-user weather tip caching by location and time window

Ensure table policies and schema match your Supabase project requirements.

## API Summary

### Plant and Identification

- `POST /identify`
  - multipart image upload for plant identification
- `POST /identify/health-assessment-test`
  - JSON health assessment test payload
- `POST /identify/health-assessment-test-upload`
  - multipart image upload for health assessment
- `GET /plants`
- `POST /plants`
- `PATCH /plants/{plant_id}`
- `PATCH /plants/{plant_id}/watered-today`
- `DELETE /plants/{plant_id}`

### Routine and Weather

- `GET /routine/daily`
- `GET /weather/widget?lat=...&lon=...`

Authentication:

- Personal endpoints require `Authorization: Bearer <token>`.
- Backend returns `401` for missing/invalid token.

## Local Development

## 1) Backend

From repository root:

- `cd backend`
- `python -m venv .venv` (if needed)
- Activate venv (Windows): `.venv\\Scripts\\Activate.ps1`
- `pip install -r requirements.txt`
- `uvicorn main:app --reload --host 127.0.0.1 --port 8000`

## 2) Frontend

From repository root:

- `cd frontend`
- `npm install --legacy-peer-deps`
- `npm run dev`

Or from repository root (helper scripts):

- `npm run dev`
- `npm run build`

The root scripts proxy to frontend scripts and support env sync.

## Build and Validation

- Frontend build: `npm run build` (inside `frontend` or via root script)
- Backend syntax check example:
  - `python -m py_compile backend/services/*.py backend/api/*.py`

## Troubleshooting

### Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY

- Ensure `backend/.env` has `SUPABASE_URL` and preferably `SUPABASE_ANON_KEY`.
- Run frontend scripts (`npm run dev` or `npm run build`) so pre-scripts sync env automatically.
- Confirm `frontend/.env.local` exists after sync.

### Frontend import resolve issues from root

- Use root scripts (`npm run dev`, `npm run build`) or run commands inside `frontend`.
- Root `package.json` proxies to frontend and avoids wrong working-directory issues.

## Security Notes

- Do not expose backend service role keys to browsers.
- Prefer Supabase anon key in frontend env.
- Keep `backend/.env` and `frontend/.env.local` out of source control.

## License

No license file is currently defined in this repository.

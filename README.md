# EnglishBuddy

EnglishBuddy is a full-stack speaking practice tracker for English learners. Users can
register, set a weekly speaking goal, practice live with an AI speaking partner, log
practice sessions, and review their progress from a protected dashboard.

## What is included

- User registration and login
- Public home page with dashboard and live-practice navigation
- Live AI speaking practice with instant feedback
- Local session persistence in the browser
- Protected dashboard with weekly progress and streak tracking
- Practice session logging with topic, mode, duration, score, and notes
- Backend persistence using MongoDB when configured, with local JSON fallback for simple setup

## Tech stack

- React + Vite
- React Router
- Node.js
- Express
- OpenAI Responses API
- MongoDB + Mongoose
- Local JSON fallback for development and smoke tests

## Run locally

1. Start the backend:

   ```bash
   cd backend
   npm start
   ```

2. Start the frontend in another terminal:

   ```bash
   cd frontend
   npm run dev
   ```

3. Open the Vite URL shown in the terminal.

## Environment

- Backend port is read from the root `.env` file and defaults to `8080`.
- If `MONGODB_URI` is set, the backend uses MongoDB.
- If `MONGODB_URI` is set but unreachable, the backend fails fast on startup.
- If `MONGODB_URI` is not set, the backend falls back to a local JSON file at `backend/data/store.json`.
- AI practice requires `OPENAI_API_KEY`.
- `OPENAI_MODEL` defaults to `gpt-4o-mini`.
- Frontend API base URL defaults to `/api` in production.
- To point the frontend somewhere else, set `VITE_API_URL`.
- Use [.env.example](/Users/keshav/Desktop/EnglishBuddy/.env.example) as the starting template.

## Deploy on Render

This repo is set up to deploy as one Render web service using [render.yaml](/Users/keshav/Desktop/EnglishBuddy/render.yaml).

1. Push this repo to GitHub with the latest changes.
2. In Render, create a new Blueprint and select this repository.
3. Render will use the build command from `render.yaml` to build the frontend and run the backend.
4. Set `OPENAI_API_KEY` in Render for the live AI practice feature.
5. For persistent production data, set `MONGODB_URI` in Render before the first real use.

The deployed app serves both the React frontend and the API from the same domain.

## Deploy on Vercel

This repo is now set up for a single-project Vercel deployment:

- Static frontend output comes from `frontend/dist`
- API requests are handled by [api/[...route].js](/Users/keshav/Desktop/EnglishBuddy/api/[...route].js)
- Frontend routes are rewritten to `index.html` for React Router

Before deploying on Vercel:

1. Set `OPENAI_API_KEY`
2. Set `OPENAI_MODEL=gpt-4o-mini`
3. Set `MONGODB_URI`

`MONGODB_URI` is required on Vercel. The local JSON fallback is kept for local development,
but Vercel Functions do not provide durable writable storage for production app data.

Suggested Vercel settings:

- Framework preset: `Other`
- Root directory: project root
- Install command: taken from [vercel.json](/Users/keshav/Desktop/EnglishBuddy/vercel.json)
- Build command: taken from [vercel.json](/Users/keshav/Desktop/EnglishBuddy/vercel.json)
- Output directory: `frontend/dist`

After deployment, verify:

- `/api/health` returns `status: "ok"`
- `storage` is `mongodb`
- `ai.configured` is `true`

## Voice support

- Voice input uses the browser Speech Recognition API and works best in Chrome or Edge.
- AI coaching is based on the recognized transcript, so it evaluates fluency, grammar,
  vocabulary, and clarity rather than raw pronunciation audio.

## Verification

- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`
- Backend smoke test: `cd backend && npm test`

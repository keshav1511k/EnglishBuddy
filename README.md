# EnglishBuddy

EnglishBuddy is a full-stack speaking practice tracker for English learners. Users can
register, set a weekly speaking goal, log practice sessions, and review their progress
from a protected dashboard.

## What is included

- User registration and login
- Local session persistence in the browser
- Protected dashboard with weekly progress and streak tracking
- Practice session logging with topic, mode, duration, score, and notes
- Backend persistence using MongoDB when configured, with local JSON fallback for simple setup

## Tech stack

- React + Vite
- React Router
- Node.js
- Express
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
- Frontend API base URL defaults to `http://localhost:8080/api`.
- To point the frontend somewhere else, set `VITE_API_URL`.
- Use [.env.example](/Users/keshav/Desktop/EnglishBuddy/.env.example) as the starting template.

## Deploy on Render

This repo is set up to deploy as one Render web service using [render.yaml](/Users/keshav/Desktop/EnglishBuddy/render.yaml).

1. Push this repo to GitHub with the latest changes.
2. In Render, create a new Blueprint and select this repository.
3. Render will use the build command from `render.yaml` to build the frontend and run the backend.
4. For persistent production data, set `MONGODB_URI` in Render before the first real use.

The deployed app serves both the React frontend and the API from the same domain.

## Verification

- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`
- Backend smoke test: `cd backend && npm test`

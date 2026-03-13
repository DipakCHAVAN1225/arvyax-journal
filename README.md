# 🌿 ArvyaX AI-Assisted Journal System

An immersive nature journaling app with AI-powered emotion analysis. Users write journal entries after nature sessions (forest, ocean, mountain, desert, meadow) and receive deep emotional insights powered by Claude AI.

---

## ✨ Features

- **Journal Entry Creation** — Write entries tied to specific nature ambiences
- **AI Emotion Analysis** — Claude Haiku analyzes emotion, keywords, and summary per entry
- **Insights Dashboard** — Visual breakdown of emotion patterns, ambience usage, and recent themes
- **Analysis Caching** — Identical texts are cached in SQLite to save LLM cost
- **Rate Limiting** — Per-IP limits on all routes (100/15min general, 10/min for analysis)
- **Streaming Analysis** — Optional SSE streaming for real-time LLM output
- **Responsive UI** — Organic nature aesthetic, works beautifully on mobile and desktop

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm install
npm start
# Server runs at http://localhost:3001
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

### Docker (optional)

```bash
docker-compose up --build
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

---

## 📡 API Reference

### `POST /api/journal`
Create a journal entry.

**Request:**
```json
{
  "userId": "alice",
  "ambience": "forest",
  "text": "I felt calm today after listening to the rain."
}
```

**Response:** `201 Created` — the created entry object.

---

### `GET /api/journal/:userId`
Get all entries for a user.

**Query params:** `limit`, `offset`, `ambience`

**Response:**
```json
{
  "entries": [...],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

---

### `POST /api/journal/analyze`
Analyze text using the LLM.

**Request:**
```json
{ "text": "I felt calm after the rain", "entryId": "optional-uuid" }
```

**Response:**
```json
{
  "emotion": "calm",
  "keywords": ["rain", "nature", "peace"],
  "summary": "User experienced relaxation during the forest session.",
  "cached": false
}
```

For streaming, add `"stream": true` — returns SSE with `token`, `complete`, and `error` events.

---

### `GET /api/journal/insights/:userId`
Get aggregated insights.

**Response:**
```json
{
  "totalEntries": 8,
  "topEmotion": "calm",
  "mostUsedAmbience": "forest",
  "recentKeywords": ["focus", "nature", "rain"],
  "emotionBreakdown": { "calm": 5, "joyful": 3 },
  "ambienceBreakdown": { "forest": 4, "ocean": 4 },
  "recentEntries": 3,
  "analyzedEntries": 6
}
```

---

### `PATCH /api/journal/entry/:id/analyze`
Analyze a specific existing entry and save the result.

---

## 🗂️ Project Structure

```
arvyax-journal/
├── backend/
│   ├── server.js              # Express app + rate limiting
│   ├── routes/journal.js      # All API endpoints
│   ├── services/llmService.js # Claude API + caching
│   ├── db/database.js         # SQLite schema + init
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   └── JournalPage.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── JournalForm.jsx
│   │   │   ├── EntryList.jsx
│   │   │   └── InsightsPanel.jsx
│   │   ├── utils/api.js
│   │   └── styles/globals.css
│   └── vite.config.js
├── docker-compose.yml
├── README.md
└── ARCHITECTURE.md
```

---

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend port | `3001` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Required |
| `FRONTEND_URL` | CORS allowed origin | `*` |
| `DB_PATH` | SQLite database path | `./data/journal.db` |

---

## 🧪 Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`)
- **LLM:** Anthropic Claude Haiku (`claude-haiku-4-5-20251001`)
- **Frontend:** React 18 + Vite + React Router
- **Styling:** CSS Modules with custom design system

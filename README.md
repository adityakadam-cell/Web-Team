# web-team

All-in-one **operations terminal** — 3 web tools in one Python app with a ContentGuard-inspired cyberpunk dark UI. Each tool ends with a *Push to GitHub or Download* step.

This is a single, all-Python project: **Flask** serves server-rendered **Jinja** pages (no React / Node build). One service, one deploy.

## Tools

| Module | Path | What it does |
|--------|------|-------------|
| **Clone — HTML** | `/clone` | Clone any page's design and refill it with your own content (files or Google Sheet) → download ZIP or push |
| **Web — Audit** | `/audit` | Crawl your site, score every page on a 27-point SEO checklist → download HTML report or push |
| **Optimizer — Portal** | `/optimizer` | Real Google PageSpeed scores (mobile + desktop) + auto HTML fixes → download HTML or push |

Every module shares the same final step: **Push to GitHub** (Personal Access Token, live streaming logs) **or Download** the generated output.

## Quick Start

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate      # Mac/Linux
pip install -r requirements.txt
copy .env.example .env           # edit as needed (Windows)
python app.py                    # -> http://localhost:5000
```

Open http://localhost:5000 — that's the whole app. There is no separate frontend server to run.

> Windows one-click: `start-dev.bat` still works (it just runs the Flask app now).

## Project Structure

```
web-team/
├── backend/
│   ├── app.py                  Flask app: page routes + /api/* + the 4 tool engines
│   ├── templates/              Jinja (server-rendered HTML)
│   │   ├── base.html           Nav, grid background, ambient blobs, footer
│   │   ├── home.html           "Authorized operators only" terminal + 3 cards
│   │   ├── clone.html  audit.html  optimizer.html
│   │   └── _finish.html        Shared "Push to GitHub OR Download" step
│   ├── static/
│   │   ├── css/style.css       Pure-CSS cyberpunk theme (no build step)
│   │   └── js/                 main.js · finish.js · clone.js · audit.js · optimizer.js
│   ├── requirements.txt
│   └── .env.example
├── requirements.txt            Root shim so Railway/Render detect Python
├── Procfile                    web: gunicorn --chdir backend app:app ...
├── railway.json                Railway deploy config (single service)
├── render.yaml                 Render deploy config (backup option)
└── README.md
```

> The old `frontend/` (React/Vite) folder is **deprecated** and no longer used or built. It can be deleted; it is kept only for git history.

## Environment Variables (backend/.env)

| Variable | Required | Purpose |
|----------|----------|---------|
| `SECRET_KEY` | Yes | Flask session secret |
| `PAGESPEED_API_KEY` | Optional | Google PageSpeed API (Optimizer) |
| `GEMINI_API_KEY` | Optional | Gemini AI (Page Cloner) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Optional | Email optimizer reports |
| `RESEND_API_KEY` | Optional | Email audit reports |

## Linking to Existing Engines

Each tool first tries to import your full local engine and falls back to a built-in simplified version if it isn't present, so the app always runs:

- **Clone** → `D:\py\api-agent\` (8-agent pipeline)
- **Audit** → `D:\py\Audit wizard\trial\audit\audit-wizard\audit_engine.py`
- **Optimizer** → `D:\py\optimizer-app\optimizer-wizard-main\optimizer.py` + `pagespeed.py`

## Design System

ContentGuard "operations terminal" language:
- **Background:** `#050505` near-black with a 44px grid overlay + drifting ambient blobs
- **Fonts:** Space Grotesk (display) · Plus Jakarta Sans (body) · JetBrains Mono (code) · Cormorant Garamond (italic accents)
- **Cards:** Neon medallion rings, gradient borders, per-module glow — Emerald (Clone) · Teal (Audit) · Indigo (Optimizer)

## Deploy — single Python service

Because the app is now all-Python, you deploy **one service** (no separate frontend host).

### Railway (recommended — free to start, GitHub auto-deploy, no credit card)
1. Push this repo to GitHub.
2. Railway → **New Project → Deploy from GitHub repo** → pick this repo.
3. Railway reads `railway.json` / `Procfile` automatically. No root directory change needed.
4. Add env vars (`SECRET_KEY`, optional API keys) in the Railway **Variables** tab.
5. Every push to the repo auto-deploys.

Start command (already configured):
```
gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120
```

### Render (backup)
`render.yaml` is included and configured for the same single Python service (build `pip install -r requirements.txt`, no npm).

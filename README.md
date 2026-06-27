# web-team

All-in-one web toolkit — 4 tools in one platform with a controteam-inspired dark UI.

## Tools

| Tool | Path | What it does |
|------|------|-------------|
| SEO Audit Wizard | `/audit` | Crawls your site, checks 27-point SEO checklist, exports HTML/Excel report |
| Page Optimizer | `/optimizer` | Real PageSpeed scores (mobile + desktop) + 15+ auto-fixes + manual guide |
| Page Cloner | `/cloner` | AI-powered page cloner — upload content, get HTML pages matching a design |
| GitHub Push | `/github` | Push any folder to GitHub with PAT auth — no terminal needed |

## Quick Start

### Windows (one-click)
```
Double-click start-dev.bat
```
Opens both servers automatically.

### Manual

**Backend (Flask)**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
cp .env.example .env         # edit as needed
python app.py                # → http://localhost:5000
```

**Frontend (React + Vite)**
```bash
cd frontend
npm install
npm run dev                  # → http://localhost:3000
```

## Project Structure

```
web-team/
├── frontend/                    React + TypeScript + Vite + Tailwind v4
│   ├── src/
│   │   ├── App.tsx              Router + layout
│   │   ├── index.css            Global styles (controteam design language)
│   │   ├── components/
│   │   │   ├── CustomCursor.tsx Animated cursor (desktop only)
│   │   │   ├── ScrollReveal.tsx Scroll-triggered fade-in wrapper
│   │   │   ├── Navbar.tsx       Fixed top nav with mobile menu
│   │   │   └── WizardShell.tsx  Shared step-progress shell for all tools
│   │   └── pages/
│   │       ├── Home.tsx         Landing page + tool launcher cards
│   │       └── tools/
│   │           ├── AuditWizard.tsx
│   │           ├── Optimizer.tsx
│   │           ├── PageCloner.tsx
│   │           └── GitHubPush.tsx
│   ├── package.json
│   └── vite.config.ts           Proxies /api → :5000
│
├── backend/                     Flask Python backend
│   ├── app.py                   All 4 API route groups
│   ├── requirements.txt
│   └── .env.example
│
├── start-dev.bat                Windows one-click launcher
└── README.md
```

## Environment Variables (backend/.env)

| Variable | Required | Purpose |
|----------|----------|---------|
| `SECRET_KEY` | Yes | Flask session secret |
| `PAGESPEED_API_KEY` | Optional | Google PageSpeed API (Optimizer tool) |
| `GMAIL_USER` | Optional | Gmail sender for email reports |
| `GMAIL_APP_PASSWORD` | Optional | Gmail App Password (16 chars) |
| `GEMINI_API_KEY` | Optional | Gemini AI for Page Cloner |
| `RESEND_API_KEY` | Optional | Resend for Audit email delivery |

## Design System

Inherits controteam's design language:
- **Background:** `#050505` near-black
- **Grid overlay:** subtle 44px grid lines
- **Fonts:** Space Grotesk (display) · Plus Jakarta Sans (body) · JetBrains Mono (code)
- **Cursor:** Custom animated dual-ring cursor (desktop only)
- **Animations:** Scroll-reveal with cubic-bezier easing, ambient blob drift, shimmer text
- **Cards:** Glassmorphism with gradient borders and tool-specific glow on hover
- **Accent colours:** Teal (Audit) · Indigo (Optimizer) · Emerald (Cloner) · Amber (GitHub)

## Linking to Existing Projects

The backend auto-detects your existing tool projects in `D:\py`:

- **Audit Wizard** → `D:\py\Audit wizard\trial\audit\audit-wizard\audit_engine.py`
- **Optimizer** → `D:\py\optimizer-app\optimizer-wizard-main\optimizer.py` + `pagespeed.py`
- **Page Cloner** → `D:\py\api-agent\` (full 8-agent pipeline)

If these paths aren't present, each tool falls back to a built-in simplified implementation so the app always works.

## Deploy

**Vercel (frontend)**
```bash
cd frontend && npm run build
# Deploy dist/ to Vercel
```

**Render (backend)**
- Build: `pip install -r requirements.txt`
- Start: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4`
- Set all env vars in Render dashboard

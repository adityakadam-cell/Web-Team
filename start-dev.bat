@echo off
title web-team Dev Server
echo.
echo ==========================================
echo   web-team — starting dev servers
echo ==========================================
echo.

REM ── Backend ──────────────────────────────
echo [1/2] Starting Flask backend on :5000...
cd /d "%~dp0backend"

if not exist ".env" (
  echo   Copying .env.example to .env ...
  copy ".env.example" ".env" >nul
)

if not exist ".venv" (
  echo   Creating Python virtual environment...
  python -m venv .venv
)
call .venv\Scripts\activate.bat

echo   Installing backend dependencies...
pip install -r requirements.txt -q --break-system-packages 2>nul || pip install -r requirements.txt -q

start "web-team Backend" cmd /k "call .venv\Scripts\activate && python app.py"

REM ── Frontend ─────────────────────────────
echo [2/2] Starting Vite frontend on :3000...
cd /d "%~dp0frontend"

if not exist "node_modules" (
  echo   Installing frontend dependencies (first run takes ~1 min)...
  npm install
)

start "web-team Frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo   Frontend → http://localhost:3000
echo   Backend  → http://localhost:5000
echo ==========================================
echo.
echo Both servers started in separate windows.
echo Close those windows to stop the servers.
echo.
pause

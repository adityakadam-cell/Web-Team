@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Push web-team to GitHub
cd /d "%~dp0"

echo.
echo ==========================================
echo   web-team  push to GitHub
echo   https://github.com/adityakadam-cell/Web-Team
echo ==========================================
echo.

REM ─── Check git ───────────────────────────────────────────────
where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git is not installed.
  echo Download it from: https://git-scm.com/download/win
  echo Then re-run this file.
  echo.
  pause
  exit /b 1
)
echo [OK] Git found.

REM ─── Init repo if not already ────────────────────────────────
if not exist ".git" (
  echo Initialising git repo in this folder...
  git init
  git branch -M main
  echo Done.
) else (
  echo [OK] Git repo already exists.
)

REM ─── Set remote origin ───────────────────────────────────────
set "REPO=https://github.com/adityakadam-cell/Web-Team.git"
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin "%REPO%"
  echo [OK] Remote added.
) else (
  git remote set-url origin "%REPO%"
  echo [OK] Remote updated.
)

REM ─── Git identity ────────────────────────────────────────────
for /f "delims=" %%n in ('git config --global user.name 2^>nul') do set "GN=%%n"
if not defined GN (
  set /p "GN=Enter your name for git commits: "
  git config --global user.name "!GN!"
)

for /f "delims=" %%e in ('git config --global user.email 2^>nul') do set "GE=%%e"
if not defined GE (
  set /p "GE=Enter your GitHub email: "
  git config --global user.email "!GE!"
)
echo [OK] Git identity set.

REM ─── GitHub token login ──────────────────────────────────────
git config --global credential.helper store

echo.
echo Enter your GitHub Personal Access Token.
echo (Get one: github.com/settings/tokens ^> Generate new token classic ^> tick repo)
echo.
set /p "GHUSER=GitHub username (press Enter to use adityakadam-cell): "
if "!GHUSER!"=="" set "GHUSER=adityakadam-cell"

set /p "GHTOK=Paste your token here and press Enter: "
if "!GHTOK!"=="" (
  echo [ERROR] No token entered. Cannot push without a token.
  echo.
  pause
  exit /b 1
)

REM Save credentials
(
  echo protocol=https
  echo host=github.com
  echo username=!GHUSER!
  echo password=!GHTOK!
  echo.
) | git credential approve
echo [OK] Credentials saved.

REM ─── .gitignore ──────────────────────────────────────────────
if not exist ".gitignore" (
  echo Creating .gitignore...
  (
    echo frontend/node_modules/
    echo frontend/dist/
    echo backend/.venv/
    echo backend/output/
    echo backend/.env
    echo **/__pycache__/
    echo *.pyc
    echo .DS_Store
    echo Thumbs.db
  ) > .gitignore
  echo [OK] .gitignore created.
)

REM ─── Stage and commit ────────────────────────────────────────
echo.
echo Staging all files...
git add -A
echo [OK] Files staged.

set "MSG=web-team initial push %date% %time:~0,8%"
echo Committing...
git commit -m "!MSG!" 2>&1
if errorlevel 1 (
  echo (Nothing to commit or already committed - will still push)
)

REM ─── Push ────────────────────────────────────────────────────
echo.
echo Pushing to GitHub...
git push -u origin main 2>&1
if not errorlevel 1 goto :success

echo.
echo Normal push failed - trying force-with-lease...
git fetch origin 2>&1
git push -u origin main --force-with-lease 2>&1
if not errorlevel 1 goto :success

echo.
echo Trying force push...
git push -u origin main --force 2>&1
if not errorlevel 1 goto :success

echo.
echo [ERROR] Push failed. Make sure:
echo   1. The repo exists at github.com/adityakadam-cell/Web-Team
echo   2. Your token has the "repo" scope
echo   3. The username is correct
echo.
pause
exit /b 1

:success
echo.
echo ==========================================
echo   SUCCESS! Files are on GitHub:
echo   https://github.com/adityakadam-cell/Web-Team
echo ==========================================
echo.
pause
endlocal

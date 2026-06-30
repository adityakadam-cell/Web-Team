@echo off
cd /d "%~dp0"
echo ============================================
echo   web-team : clear lock + commit + push
echo ============================================
echo.
echo [1/4] Clearing stale git lock (if any)...
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo [2/4] Staging all changes...
git add -A
echo [3/4] Committing...
git commit -m "all-python rebuild: 3-tool operations terminal (clone/audit/optimizer)"
echo [4/4] Pushing to origin/main...
git push -u origin main
if errorlevel 1 (
  echo.
  echo Normal push was rejected - trying force-with-lease...
  git push -u origin main --force-with-lease
)
echo.
echo ================= DONE =================
echo Check the lines above for "Everything up-to-date" or a commit hash.
pause

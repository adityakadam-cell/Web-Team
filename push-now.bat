@echo off
cd /d "%~dp0"
echo.
echo Pushing web-team to GitHub...
echo.

git init
git remote remove origin 2>nul
git remote add origin https://github.com/adityakadam-cell/Web-Team.git
git branch -M main
git add -A
git commit -m "Add render config and build script"
git push -u origin main --force

echo.
echo Done! Check above for any errors.
echo.
pause

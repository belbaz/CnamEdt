@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   DEPLOY WEBSITE - EDT EICNAM
echo ========================================
echo.

set COMMIT_MSG=%~1
if not defined COMMIT_MSG set COMMIT_MSG=Deploy website updates

git --version >NUL 2>&1
if errorlevel 1 (
  echo ERREUR: Git non disponible dans le PATH
  exit /b 1
)

echo [1/2] Commit des changements...
git add .
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
  echo ATTENTION: Aucun changement a committer ou erreur de commit
)

echo [2/2] Push vers origin...
git push
if errorlevel 1 (
  echo ERREUR: git push a echoue
  exit /b 1
)

echo.
echo ========================================
echo   DEPLOIEMENT WEBSITE DEMARRE (Vercel via Git)
echo ========================================
echo.
exit /b 0


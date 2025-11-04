@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   DEPLOY WEBSITE - EDT EICNAM
echo ========================================
echo.

REM Verifier qu'on est dans le bon repertoire
if not exist package.json (
    echo ERREUR: package.json introuvable
    echo Assurez-vous d'executer ce script depuis la racine du projet
    pause
    exit /b 1
)

REM Message de commit optionnel
set COMMIT_MSG=%~1
if not defined COMMIT_MSG set COMMIT_MSG=Update website

REM Verifier Git
git --version >NUL 2>&1
if errorlevel 1 (
    echo ERREUR: Git n'est pas installe ou pas dans le PATH
    pause
    exit /b 1
)

echo [1/3] Configuration pour Vercel...
echo.

REM Activer la configuration web (sans output: export)
if not exist scripts\switch-next-config.js (
    echo ERREUR: scripts\switch-next-config.js introuvable
    pause
    exit /b 1
)

node scripts\switch-next-config.js web
if errorlevel 1 (
    echo ERREUR: Impossible d'activer la configuration web
    pause
    exit /b 1
)

REM Verifier que next.config.js n'a pas output: export
REM check-export-mode.js retourne 1 si export trouve, 0 sinon
if exist scripts\check-export-mode.js (
    node scripts\check-export-mode.js >nul 2>&1
    if errorlevel 1 (
        echo ERREUR: next.config.js est toujours en mode export
        echo Les API routes ne fonctionneront pas
        pause
        exit /b 1
    )
)

echo Configuration web activee (API routes actives)

REM S'assurer que les API routes sont presentes
if not exist src\app\api (
    echo ERREUR: Dossier API introuvable !
    if exist src\app\_api_backup (
        echo Restauration du dossier API...
        cd src\app
        rename _api_backup api >nul 2>&1
        cd ..\..
        if exist src\app\api (
            echo API restaurees avec succes
        ) else (
            echo ERREUR: Impossible de restaurer les API
            pause
            exit /b 1
        )
    ) else (
        echo ERREUR: Le dossier src\app\api est requis pour Vercel
        echo Le dossier _api_backup n'existe pas non plus
        pause
        exit /b 1
    )
) else (
    echo Routes API presentes
)

echo.
echo [2/3] Statut Git:
git status --short
echo.

echo [3/3] Commit et push...
git add .
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo.
    echo ATTENTION: Aucun changement a committer
    echo.
    choice /C ON /M "Forcer le push quand meme"
    if errorlevel 2 (
        echo Push annule
        pause
        exit /b 0
    )
)

echo.
echo Push vers GitHub...
git push
if errorlevel 1 (
    echo.
    echo ERREUR: git push a echoue
    echo.
    echo Causes possibles:
    echo - Pas de connexion internet
    echo - Probleme d'authentification GitHub
    echo - Conflits avec la branche distante
    echo.
    echo Essayez: git pull --rebase puis git push
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOIEMENT TERMINE
echo ========================================
echo.
echo Le code a ete pousse sur GitHub
echo Vercel va automatiquement deployer dans 1-2 minutes
echo.
echo Site: https://edt-eicnam.vercel.app
echo.
pause
exit /b 0

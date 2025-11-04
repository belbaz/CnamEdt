@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   DEPLOY WEBSITE ONLY - EDT EICNAM
echo ========================================
echo.

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

REM S'assurer qu'on est en configuration web
echo [1/5] Verification de la configuration...
if exist next.config.web.js (
    echo Configuration web trouvee
    copy /Y next.config.web.js next.config.js >nul
    echo Configuration web activee
) else if exist mobile-config\next.config.mobile.js (
    echo ATTENTION: Seule la config mobile trouvee
    echo Assurez-vous que next.config.js est configure pour le web
)

REM Verifier qu'on n'est pas en mode export
echo [2/5] Verification du mode de build...
findstr /C:"output: 'export'" next.config.js >nul
if not errorlevel 1 (
    echo ATTENTION: next.config.js est en mode 'export'
    echo Cela desactivera les API routes !
    echo.
    if exist next.config.web.js (
        echo Correction automatique: activation de la configuration web...
        copy /Y next.config.web.js next.config.js >nul
        echo Configuration web activee (output: 'export' supprime)
    ) else (
        echo Impossible de corriger automatiquement (next.config.web.js introuvable)
        echo.
        choice /C ON /M "Continuer quand meme"
        if errorlevel 2 (
            echo Annule par l'utilisateur
            pause
            exit /b 1
        )
    )
)

REM S'assurer que les API sont presentes
echo [3/5] Verification des API routes...
if not exist src\app\api (
    echo ERREUR: Dossier API introuvable !
    if exist src\app\_api_backup (
        echo Restauration du dossier API depuis backup...
        rename src\app\_api_backup api
        if exist src\app\api (
            echo API restaurees avec succes
        ) else (
            echo ERREUR: Impossible de restaurer les API
            pause
            exit /b 1
        )
    ) else (
        echo Le dossier src\app\api est requis pour le site web
        pause
        exit /b 1
    )
) else (
    echo API routes presentes
)

REM Afficher le statut Git
echo [4/5] Statut Git actuel:
git status --short
echo.

REM Commit et push
echo [5/5] Commit et push des changements...
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
echo   DEPLOIEMENT WEBSITE LANCE
echo ========================================
echo.
echo Le code a ete pousse sur GitHub
echo Vercel va automatiquement detecter les changements
echo et deployer le site en 1-2 minutes
echo.
echo Surveillez le deploiement sur:
echo https://vercel.com/dashboard
echo.
echo Site en production:
echo https://edt-eicnam.vercel.app
echo.
pause
exit /b 0

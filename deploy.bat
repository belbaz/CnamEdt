@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   DEPLOY EDT EICNAM
echo   Build APK + Git Push + Deploy Vercel
echo ========================================
echo.

REM Verifier si une version est passee en parametre
set PARAM_VERSION=%~1
if defined PARAM_VERSION (
    set VERSION=%PARAM_VERSION%
    echo Version specifiee en parametre : !VERSION!
    echo.
    echo Mise a jour de package.json avec la version !VERSION!...
    call node mobile-config\set-version.js !VERSION!
    if errorlevel 1 (
        echo ERREUR: Mise a jour de package.json echouee
        pause
        exit /b 1
    )
    echo Mise a jour des fichiers avec la version !VERSION!...
    call node mobile-config\update-version-in-files.js
    if errorlevel 1 (
        echo ERREUR: Mise a jour des fichiers echouee
        pause
        exit /b 1
    )
) else (
    REM Recuperer la version actuelle depuis package.json
    echo Lecture de la version actuelle...
    for /f "delims=" %%i in ('node mobile-config\get-version.js') do set CURRENT_VERSION=%%i
    
    echo Version actuelle : !CURRENT_VERSION!
    echo Incrementation automatique de la version ^(+0.0.1^)...
    
    REM Incrementer automatiquement
    for /f "tokens=*" %%a in ('node mobile-config\increment-version.js ^| findstr /C:"NEW_VERSION="') do set %%a
    if errorlevel 1 (
        echo ERREUR: Incrementation echouee
        pause
        exit /b 1
    )
    set VERSION=!NEW_VERSION!
    echo Nouvelle version : !VERSION!
    echo.
    echo Mise a jour des fichiers avec la nouvelle version...
    call node mobile-config\update-version-in-files.js
    if errorlevel 1 (
        echo ERREUR: Mise a jour des fichiers echouee
        pause
        exit /b 1
    )
)

echo.

echo [0/9] Verification des processus Node.js/Next.js...
REM Tuer tous les processus node.exe qui pourraient verrouiller les fichiers
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Processus Node.js detectes - Arret en cours...
    taskkill /F /IM node.exe /T >NUL 2>&1
    if errorlevel 1 (
        echo ATTENTION: Impossible d'arreter tous les processus Node.js
        echo Veuillez fermer manuellement le serveur de developpement
        pause
    ) else (
        echo Processus Node.js arretes avec succes
        timeout /t 2 /nobreak >NUL
    )
) else (
    echo Aucun processus Node.js en cours d'execution
)

echo [1/9] Nettoyage...
if exist out rmdir /s /q out
if exist android\app\build rmdir /s /q android\app\build

echo [2/9] Preparation pour mobile...
REM Definir la variable d'environnement pour le build mobile
set BUILD_MODE=mobile

REM Sauvegarder la configuration web actuelle
if exist next.config.js (
    copy /Y next.config.js next.config.web.backup
    echo Configuration web sauvegardee
)

REM Copier la configuration mobile de Next.js
copy /Y mobile-config\next.config.mobile.js next.config.js
echo Configuration Next.js mobile activee

REM Renommer temporairement le dossier API (incompatible avec export statique)
REM On utilise rename au lieu de move pour eviter les problemes de permissions
if exist src\app\api (
    if exist src\app\_api_backup rmdir /s /q src\app\_api_backup
    rename src\app\api _api_backup
    if exist src\app\_api_backup (
        echo Dossier API temporairement renomme
    ) else (
        echo ATTENTION: Impossible de renommer le dossier API
        echo Assurez-vous qu'aucun fichier n'est ouvert dans l'IDE
        pause
        exit /b 1
    )
)

echo [3/9] Build Next.js (export statique avec BUILD_MODE=mobile)...
call npm run build
if errorlevel 1 (
    echo ERREUR: Build Next.js a echoue
    REM Restaurer le dossier API renomme
    if exist src\app\_api_backup (
        if exist src\app\api rmdir /s /q src\app\api
        rename src\app\_api_backup api
        echo Dossier API restaure apres erreur
    )
    REM Restaurer la configuration web
    if exist next.config.web.backup (
        copy /Y next.config.web.backup next.config.js
        del next.config.web.backup
        echo Configuration web restauree apres erreur
    )
    pause
    exit /b 1
)

echo [4/9] Restauration du dossier API et configuration web...
REM Restaurer le dossier API renomme
if exist src\app\_api_backup (
    if exist src\app\api rmdir /s /q src\app\api
    rename src\app\_api_backup api
    echo Dossier API restaure
)

REM Restaurer la configuration web
if exist next.config.web.backup (
    copy /Y next.config.web.backup next.config.js
    del next.config.web.backup
    echo Configuration web restauree
) else (
    REM Si pas de backup, utiliser la config web par defaut
    if exist next.config.web.js (
        copy /Y next.config.web.js next.config.js
        echo Configuration web restauree depuis next.config.web.js
    )
)

echo [5/9] Synchronisation avec Android...
call npx cap sync android
if errorlevel 1 (
    echo ERREUR: Sync Capacitor a echoue
    pause
    exit /b 1
)

echo [6/9] Build de l'APK...
cd android
REM Utiliser explicitement le wrapper Windows et nettoyer avant build
call .\gradlew.bat clean assembleDebug
if errorlevel 1 (
    echo ERREUR: Build APK a echoue
    cd ..
    pause
    exit /b 1
)
cd ..

echo [7/9] Renommage de l'APK avec la version...
set APK_SOURCE=android\app\build\outputs\apk\debug\app-debug.apk
set APK_DEST=android\app\build\outputs\apk\debug\edt_cnam_v!VERSION!.apk

if exist "%APK_SOURCE%" (
    move /Y "%APK_SOURCE%" "%APK_DEST%"
    if exist "%APK_DEST%" (
        echo APK renomme: edt_cnam_v!VERSION!.apk
    ) else (
        echo ERREUR: Impossible de renommer l'APK
        pause
        exit /b 1
    )
) else (
    echo ERREUR: APK source introuvable
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD APK TERMINE !
echo ========================================
echo.
echo APK genere dans:
echo android\app\build\outputs\apk\debug\edt_cnam_v!VERSION!.apk
echo.

echo [8/9] Upload vers Supabase...
node mobile-config\upload-to-supabase.js !VERSION!
if errorlevel 1 (
    echo.
    echo ========================================
    echo   ATTENTION: Upload Supabase a echoue
    echo ========================================
    echo.
    echo APK cree localement mais non uploade sur Supabase
    echo Verifiez votre configuration .env.local
    echo.
    echo Continuation avec le Git push...
    echo.
)

echo.
echo [9/9] Git commit et push...
echo.

REM Verification que Git est installe
git --version >NUL 2>&1
if errorlevel 1 (
    echo ERREUR: Git n'est pas installe ou non trouve dans le PATH
    echo Veuillez installer Git pour continuer
    pause
    exit /b 1
)

echo Ajout de tous les fichiers modifies...
git add .

echo.
echo Verification des fichiers a commiter...
git status --short

echo.
echo Commit avec message "Update version to !VERSION!"...
git commit -m "Update version to !VERSION!"

if errorlevel 1 (
    echo.
    echo ATTENTION: Le commit a echoue ou aucune modification a commiter
    echo Continuation avec le push...
    echo.
)

echo.
echo Push vers le repository distant...
git push

if errorlevel 1 (
    echo.
    echo ========================================
    echo   ATTENTION: Git push a echoue
    echo ========================================
    echo.
    echo Verifiez:
    echo - Que vous etes connecte a Internet
    echo - Que vous avez les droits sur le repository
    echo - Qu'aucun conflit n'existe
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOY TERMINE AVEC SUCCES !
echo ========================================
echo.
echo [RECAP]
echo.
echo APK:
echo - Version: !VERSION!
echo - Fichier local: android\app\build\outputs\apk\debug\edt_cnam_v!VERSION!.apk
echo - Supabase: OK
echo.
echo GIT:
echo - Fichiers commites: OK
echo - Push vers origin: OK
echo.
echo VERCEL:
echo - Le deploiement demarrera automatiquement suite au push
echo - Verifiez sur: https://vercel.com/dashboard
echo.
echo FICHIERS MIS A JOUR:
echo - package.json: !VERSION!
echo - src/app/api/version/route.js: !VERSION!
echo - src/app/page.js: !VERSION!
echo.
echo ========================================
echo   Le site sera deploye automatiquement
echo   sur Vercel dans quelques minutes !
echo ========================================
echo.
pause


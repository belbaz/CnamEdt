@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   Build APK RAPIDE EDT EICNAM
echo ========================================
echo.
echo MODE RAPIDE: Skip clean, utilise cap copy, builds incrementaux
echo.

REM Verifier si une version est passee en parametre
set PARAM_VERSION=%~1
if defined PARAM_VERSION (
    set VERSION=%PARAM_VERSION%
    echo Version specifiee en parametre : !VERSION!
    echo.
    echo Mise a jour de package.json avec la version !VERSION!...
    call node set-version.js !VERSION!
    if errorlevel 1 (
        echo ERREUR: Mise a jour de package.json echouee
        pause
        exit /b 1
    )
    echo Mise a jour des fichiers avec la version !VERSION!...
    call node update-version-in-files.js
    if errorlevel 1 (
        echo ERREUR: Mise a jour des fichiers echouee
        pause
        exit /b 1
    )
) else (
    REM Recuperer la version actuelle depuis package.json
    echo Lecture de la version actuelle...
    for /f "delims=" %%i in ('node get-version.js') do set CURRENT_VERSION=%%i
    
    echo Version actuelle : !CURRENT_VERSION!
    echo Incrementation automatique de la version ^(+0.0.1^)...
    
    REM Incrementer automatiquement
    for /f "tokens=*" %%a in ('node increment-version.js ^| findstr /C:"NEW_VERSION="') do set %%a
    if errorlevel 1 (
        echo ERREUR: Incrementation echouee
        pause
        exit /b 1
    )
    set VERSION=!NEW_VERSION!
    echo Nouvelle version : !VERSION!
    echo.
    echo Mise a jour des fichiers avec la nouvelle version...
    call node update-version-in-files.js
    if errorlevel 1 (
        echo ERREUR: Mise a jour des fichiers echouee
        pause
        exit /b 1
    )
)

echo.

REM Se deplacer a la racine du projet
cd ..

echo [1/6] Verification des processus Node.js/Next.js...
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
        timeout /t 1 /nobreak >NUL
    )
) else (
    echo Aucun processus Node.js en cours d'execution
)

echo [2/6] Preparation pour mobile...
REM Definir la variable d'environnement pour le build mobile
set BUILD_MODE=mobile

REM Sauvegarder la configuration web actuelle
if exist next.config.js (
    copy /Y next.config.js next.config.web.backup >nul
)

REM Copier la configuration mobile de Next.js
copy /Y mobile-config\next.config.mobile.js next.config.js >nul

REM Renommer temporairement le dossier API (incompatible avec export statique)
if exist src\app\api (
    if exist src\app\_api_backup rmdir /s /q src\app\_api_backup 2>NUL
    rename src\app\api _api_backup >nul 2>&1
)

echo [3/6] Build Next.js (export statique avec BUILD_MODE=mobile)...
call npm run build
if errorlevel 1 (
    echo ERREUR: Build Next.js a echoue
    REM Restaurer le dossier API renomme
    if exist src\app\_api_backup (
        if exist src\app\api rmdir /s /q src\app\api 2>NUL
        rename src\app\_api_backup api >nul 2>&1
    )
    REM Restaurer la configuration web
    if exist next.config.web.backup (
        copy /Y next.config.web.backup next.config.js >nul
        del next.config.web.backup
    )
    pause
    exit /b 1
)

echo [4/6] Restauration du dossier API et configuration web...
REM Restaurer le dossier API renomme
if exist src\app\_api_backup (
    if exist src\app\api rmdir /s /q src\app\api 2>NUL
    rename src\app\_api_backup api >nul 2>&1
)

REM Restaurer la configuration web
if exist next.config.web.backup (
    copy /Y next.config.web.backup next.config.js >nul
    del next.config.web.backup
) else (
    if exist next.config.web.js (
        copy /Y next.config.web.js next.config.js >nul
    )
)

echo [5/6] Copie des fichiers vers Android ^(cap copy - RAPIDE^)...
REM Utiliser cap copy au lieu de cap sync (beaucoup plus rapide)
REM cap copy copie juste les fichiers web, sans mettre a jour les dependances natives
call npx cap copy android
if errorlevel 1 (
    echo ATTENTION: cap copy echoue, essai avec cap sync...
    call npx cap sync android
    if errorlevel 1 (
        echo ERREUR: Sync Capacitor a echoue
        pause
        exit /b 1
    )
)

echo [6/6] Build de l'APK ^(incremental - SANS clean^)...
cd android
REM PAS de clean pour build incremental - beaucoup plus rapide !
REM Utiliser assembleDebug directement (plus rapide que release)
call .\gradlew.bat assembleDebug --parallel
if errorlevel 1 (
    echo ATTENTION: Build incremental echoue, essai avec clean...
    call .\gradlew.bat clean assembleDebug --parallel
    if errorlevel 1 (
        echo ERREUR: Build APK a echoue
        cd ..
        pause
        exit /b 1
    )
)
cd ..

echo [6.5/6] Renommage de l'APK avec la version...
set APK_SOURCE=android\app\build\outputs\apk\debug\app-debug.apk
set APK_DEST=android\app\build\outputs\apk\debug\edt_cnam_v!VERSION!.apk

if exist "%APK_SOURCE%" (
    move /Y "%APK_SOURCE%" "%APK_DEST%" >nul 2>&1
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

echo [7/7] Upload vers Supabase...
cd mobile-config
node upload-to-supabase.js !VERSION!
if errorlevel 1 (
    echo.
    echo ========================================
    echo   ATTENTION: Upload Supabase a echoue
    echo ========================================
    echo.
    echo APK cree localement mais non uploade sur Supabase
    echo Verifiez votre configuration .env.local
    echo.
    pause
    exit /b 0
)

echo.
echo ========================================
echo   BUILD ET UPLOAD TERMINES !
echo ========================================
echo.
echo APK genere localement:
echo android\app\build\outputs\apk\debug\edt_cnam_v!VERSION!.apk
echo.
echo ========================================
echo   VERSIONS MISES A JOUR AUTOMATIQUEMENT:
echo ========================================
echo.
echo - package.json : !VERSION!
echo - src/app/api/version/route.js : !VERSION!
echo - src/app/page.js : !VERSION!
echo - android/app/build.gradle : !VERSION!
echo.
pause


@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   Build APK PRODUCTION - EDT EICNAM
echo ========================================
echo.

REM Parametre: version
set VERSION=%~1

if not defined VERSION (
    echo ERREUR: Version requise
    echo Usage: build-apk-prod.bat X.Y.Z
    pause
    exit /b 1
)

REM Verifier format version
echo %VERSION% | findstr /R "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
if errorlevel 1 (
    echo ERREUR: Format de version invalide "%VERSION%"
    echo Format attendu: X.Y.Z (ex: 2.0.33)
    pause
    exit /b 1
)

REM Se deplacer a la racine
cd ..

REM Verifier la cle de signature
if not exist edt-cnam-release-key.keystore (
    echo ERREUR: Cle de signature introuvable
    echo Fichier requis: edt-cnam-release-key.keystore
    pause
    exit /b 1
)

REM Definir les variables pour PRODUCTION
set NEXT_PUBLIC_APP_CHANNEL=prod
set APP_CHANNEL=prod
set BUILD_MODE=mobile

echo Configuration PRODUCTION activee
echo Version: %VERSION%
echo.

REM Arreter Node.js
echo [1/8] Arret des processus Node.js...
taskkill /F /IM node.exe /T >NUL 2>&1
timeout /t 1 /nobreak >NUL

REM Nettoyer
echo [2/8] Nettoyage...
if exist out rmdir /s /q out
if exist android\app\build rmdir /s /q android\app\build

REM Sauvegarder config
echo [3/8] Configuration mobile...
if exist next.config.js copy /Y next.config.js next.config.web.backup >nul
copy /Y mobile-config\next.config.mobile.js next.config.js >nul

REM Desactiver API temporairement
if exist src\app\api (
    if exist src\app\_api_backup rmdir /s /q src\app\_api_backup
    rename src\app\api _api_backup
)

REM Build Next.js
echo [4/8] Build Next.js (mode mobile/export)...
call npm run build
if errorlevel 1 (
    echo ERREUR: Build Next.js echoue
    if exist src\app\_api_backup rename src\app\_api_backup api
    if exist next.config.web.backup (
        copy /Y next.config.web.backup next.config.js >nul
        del next.config.web.backup
    )
    pause
    exit /b 1
)

REM Restaurer
if exist src\app\_api_backup rename src\app\_api_backup api
if exist next.config.web.backup (
    copy /Y next.config.web.backup next.config.js >nul
    del next.config.web.backup
)

REM Capacitor
echo [5/8] Sync Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo ERREUR: Capacitor sync echoue
    pause
    exit /b 1
)

REM Build APK signe
echo [6/8] Build APK Release signe...
cd android
call .\gradlew.bat clean assembleRelease --parallel
if errorlevel 1 (
    echo ERREUR: Build release echoue
    cd ..
    pause
    exit /b 1
)
cd ..

REM Renommer
echo [7/8] Renommage APK...
set APK_SOURCE=android\app\build\outputs\apk\release\app-release.apk
set APK_DEST=android\app\build\outputs\apk\release\edt_cnam_v%VERSION%.apk
move /Y "%APK_SOURCE%" "%APK_DEST%" >nul

echo [8/8] Upload Supabase...
cd mobile-config
node upload-to-supabase.js %VERSION%
if errorlevel 1 (
    echo ATTENTION: Upload echoue
)
cd ..

echo.
echo ========================================
echo   BUILD PRODUCTION TERMINE
echo ========================================
echo APK: android\app\build\outputs\apk\release\edt_cnam_v%VERSION%.apk
echo.
pause

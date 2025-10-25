@echo off
echo ========================================
echo   Build APK EDT EICNAM
echo ========================================
echo.

REM Remonter dans le dossier parent du projet
cd ..

echo [1/6] Nettoyage...
if exist out rmdir /s /q out
if exist android\app\build rmdir /s /q android\app\build

echo [2/6] Preparation pour mobile (deplacer API)...
REM Definir la variable d'environnement pour le build mobile
set BUILD_MODE=mobile

REM Deplacer le dossier API (incompatible avec export statique)
if exist src\app\api (
    if exist .api_temp rmdir /s /q .api_temp
    move src\app\api .api_temp
    echo Dossier API temporairement deplace hors de src/app/
)

echo [3/6] Build Next.js (export statique avec BUILD_MODE=mobile)...
call npm run build
if errorlevel 1 (
    echo ERREUR: Build Next.js a echoue
    REM Restaurer API
    if exist .api_temp (
        move .api_temp src\app\api
        echo Dossier API restaure
    )
    pause
    exit /b 1
)

echo [4/6] Restauration (API)...
REM Restaurer le dossier API
if exist .api_temp (
    if exist src\app\api rmdir /s /q src\app\api
    move .api_temp src\app\api
    echo Dossier API restaure
)

echo [5/6] Synchronisation avec Android...
call npx cap sync android
if errorlevel 1 (
    echo ERREUR: Sync Capacitor a echoue
    pause
    exit /b 1
)

echo [6/6] Build de l'APK...
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

echo.
echo ========================================
echo   BUILD TERMINE !
echo ========================================
echo.
echo APK genere dans:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Pour installer sur ton telephone:
echo adb install android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Retour au dossier mobile-config...
cd mobile-config
pause

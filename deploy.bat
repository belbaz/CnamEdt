@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   DEPLOY EDT EICNAM
echo ========================================
echo.

REM Verifier si une version est passee en parametre
set PARAM_VERSION=%~1
if defined PARAM_VERSION (
    set VERSION=%PARAM_VERSION%
    echo Version: !VERSION!
    call node mobile-config\set-version.js !VERSION! >nul
    if errorlevel 1 (
        echo ERREUR: Mise a jour version echouee
        pause
        exit /b 1
    )
    call node mobile-config\update-version-in-files.js >nul
    if errorlevel 1 (
        echo ERREUR: Mise a jour fichiers echouee
        pause
        exit /b 1
    )
) else (
    for /f "delims=" %%i in ('node mobile-config\get-version.js') do set CURRENT_VERSION=%%i
    echo Version actuelle: !CURRENT_VERSION!
    
    for /f "tokens=*" %%a in ('node mobile-config\increment-version.js ^| findstr /C:"NEW_VERSION="') do set %%a
    if errorlevel 1 (
        echo ERREUR: Incrementation echouee
        pause
        exit /b 1
    )
    set VERSION=!NEW_VERSION!
    echo Nouvelle version: !VERSION!
    call node mobile-config\update-version-in-files.js >nul
    if errorlevel 1 (
        echo ERREUR: Mise a jour fichiers echouee
        pause
        exit /b 1
    )
)
echo.

echo [0/8] Verification signature APK...
if not exist edt-cnam-release-key.keystore (
    echo Cle de signature non trouvee, creation automatique...
    
    REM Lire le mot de passe depuis .env.local
    set KEYSTORE_PASSWORD=
    if exist .env.local (
        for /f "tokens=1,2 delims==" %%a in ('findstr /C:"KEYSTORE_PASSWORD" .env.local') do set KEYSTORE_PASSWORD=%%b
    )
    
    REM Enlever les guillemets si presents
    set KEYSTORE_PASSWORD=!KEYSTORE_PASSWORD:"=!
    
    if "!KEYSTORE_PASSWORD!"=="" (
        echo ERREUR: KEYSTORE_PASSWORD non trouve dans .env.local
        echo Ajoutez: KEYSTORE_PASSWORD=VotreMotDePasse
        pause
        exit /b 1
    )
    
    REM Creer la cle
    keytool -genkey -v -keystore edt-cnam-release-key.keystore -alias edt-cnam -keyalg RSA -keysize 2048 -validity 10000 -storepass !KEYSTORE_PASSWORD! -keypass !KEYSTORE_PASSWORD! -dname "CN=EDT EICNAM, OU=EICNAM, O=EICNAM, L=Paris, ST=Ile-de-France, C=FR" >nul 2>&1
    
    if errorlevel 1 (
        echo ERREUR: Creation cle echouee
        pause
        exit /b 1
    )
    
    REM Copier la cle dans le dossier android
    copy /Y edt-cnam-release-key.keystore android\edt-cnam-release-key.keystore >nul
    
    REM Creer keystore.properties (chemin relatif depuis android/app/)
    (
    echo storeFile=../edt-cnam-release-key.keystore
    echo storePassword=!KEYSTORE_PASSWORD!
    echo keyAlias=edt-cnam
    echo keyPassword=!KEYSTORE_PASSWORD!
    ) > android\keystore.properties
    
    echo Cle de signature creee
    echo.
    echo IMPORTANT: Le fichier android\app\build.gradle doit etre configure pour la signature.
    echo Si ce n'est pas deja fait, consultez SIGNING_GUIDE.md
    echo.
) else (
    echo Cle de signature trouvee
)

echo [1/8] Arret processus Node.js...
taskkill /F /IM node.exe /T >NUL 2>&1
timeout /t 1 /nobreak >NUL

echo [2/8] Nettoyage...
if exist out rmdir /s /q out 2>NUL
if exist android\app\build rmdir /s /q android\app\build 2>NUL

echo [3/8] Configuration mobile...
set BUILD_MODE=mobile
if exist next.config.js copy /Y next.config.js next.config.web.backup >nul
copy /Y mobile-config\next.config.mobile.js next.config.js >nul

if exist src\app\api (
    if exist src\app\_api_backup rmdir /s /q src\app\_api_backup 2>NUL
    rename src\app\api _api_backup
    if not exist src\app\_api_backup (
        echo ERREUR: Impossible de renommer le dossier API
        pause
        exit /b 1
    )
)

echo [4/8] Build Next.js...
call npm run build
if errorlevel 1 (
    echo ERREUR: Build Next.js echoue
    if exist src\app\_api_backup (
        if exist src\app\api rmdir /s /q src\app\api 2>NUL
        rename src\app\_api_backup api
    )
    if exist next.config.web.backup (
        copy /Y next.config.web.backup next.config.js >nul
        del next.config.web.backup
    )
    pause
    exit /b 1
)

if exist src\app\_api_backup (
    if exist src\app\api rmdir /s /q src\app\api 2>NUL
    rename src\app\_api_backup api
)
if exist next.config.web.backup (
    copy /Y next.config.web.backup next.config.js >nul
    del next.config.web.backup
) else if exist next.config.web.js (
    copy /Y next.config.web.js next.config.js >nul
)

echo [5/8] Sync Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo ERREUR: Sync Capacitor echoue
    pause
    exit /b 1
)

echo [6/8] Build APK (signe)...
cd android
call .\gradlew.bat clean assembleRelease
if errorlevel 1 (
    echo ERREUR: Build APK echoue
    cd ..
    pause
    exit /b 1
)
cd ..

set APK_SOURCE=android\app\build\outputs\apk\release\app-release.apk
set APK_DEST=android\app\build\outputs\apk\release\edt_cnam_v!VERSION!.apk
move /Y "%APK_SOURCE%" "%APK_DEST%" >nul
echo APK signe: edt_cnam_v!VERSION!.apk

echo [7/8] Upload Supabase...
node mobile-config\upload-to-supabase.js !VERSION!
if errorlevel 1 (
    echo ATTENTION: Upload Supabase echoue (continue quand meme^)
)

echo.
echo Git commit et push...
git --version >NUL 2>&1
if errorlevel 1 (
    echo ERREUR: Git non installe
    pause
    exit /b 1
)

git add . >nul 2>&1
git commit -m "Update version to !VERSION!" >nul 2>&1
git push

if errorlevel 1 (
    echo ERREUR: Git push echoue
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOY TERMINE !
echo ========================================
echo.
echo Version: !VERSION!
echo APK signe: android\app\build\outputs\apk\release\edt_cnam_v!VERSION!.apk
echo Vercel: Deploiement en cours...
echo.
pause


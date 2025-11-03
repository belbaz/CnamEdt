@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   DEPLOY PRODUCTION COMPLETE
echo   (APK + WEBSITE) - EDT EICNAM
echo ========================================
echo.

REM Parametre optionnel: version ex: 2.0.33
set PARAM_VERSION=%~1

REM Definir explicitement le canal PRODUCTION
set NEXT_PUBLIC_APP_CHANNEL=prod
set APP_CHANNEL=prod

echo Configuration: Canal PRODUCTION
echo.

REM ===== ETAPE 1: BUILD APK PRODUCTION =====
echo ========================================
echo   ETAPE 1/2: BUILD APK PRODUCTION
echo ========================================
echo.

REM Verifier la cle de signature
if not exist edt-cnam-release-key.keystore (
    echo ERREUR: Fichier de cle edt-cnam-release-key.keystore introuvable
    echo.
    echo Creation automatique de la cle...
    
    REM Lire le mot de passe depuis .env.local
    set KEYSTORE_PASSWORD=
    if exist .env.local (
        for /f "tokens=1,2 delims==" %%a in ('findstr /C:"KEYSTORE_PASSWORD" .env.local') do set KEYSTORE_PASSWORD=%%b
    )
    
    REM Enlever les guillemets
    set KEYSTORE_PASSWORD=!KEYSTORE_PASSWORD:"=!
    
    if "!KEYSTORE_PASSWORD!"=="" (
        echo ERREUR: KEYSTORE_PASSWORD non trouve dans .env.local
        echo Ajoutez dans .env.local: KEYSTORE_PASSWORD=VotreMotDePasse
        pause
        exit /b 1
    )
    
    REM Creer la cle
    keytool -genkey -v -keystore edt-cnam-release-key.keystore -alias edtcnam -keyalg RSA -keysize 2048 -validity 10000 -storepass !KEYSTORE_PASSWORD! -keypass !KEYSTORE_PASSWORD! -dname "CN=EDT EICNAM, OU=EICNAM, O=EICNAM, L=Paris, ST=Ile-de-France, C=FR"
    
    if errorlevel 1 (
        echo ERREUR: Creation de la cle echouee
        pause
        exit /b 1
    )
    
    REM Copier dans android
    copy /Y edt-cnam-release-key.keystore android\edt-cnam-release-key.keystore >nul
    
    REM Creer keystore.properties
    (
        echo storeFile=../edt-cnam-release-key.keystore
        echo storePassword=!KEYSTORE_PASSWORD!
        echo keyAlias=edtcnam
        echo keyPassword=!KEYSTORE_PASSWORD!
    ) > android\keystore.properties
    
    echo Cle de signature creee avec succes
) else (
    echo Cle de signature trouvee
)

REM Gestion de la version
pushd mobile-config
if defined PARAM_VERSION (
    set VERSION=%PARAM_VERSION%
    echo Version specifiee: !VERSION!
    call node set-version.js !VERSION! >nul
    if errorlevel 1 (
        echo ERREUR: set-version echoue
        popd
        pause
        exit /b 1
    )
    call node update-version-in-files.js >nul
) else (
    for /f "delims=" %%i in ('node get-version.js') do set CURRENT_VERSION=%%i
    echo Version actuelle: !CURRENT_VERSION!
    
    for /f "tokens=*" %%a in ('node increment-version.js ^| findstr /C:"NEW_VERSION="') do set %%a
    if errorlevel 1 (
        echo ERREUR: Incrementation echouee
        popd
        pause
        exit /b 1
    )
    set VERSION=!NEW_VERSION!
    echo Nouvelle version: !VERSION!
    call node update-version-in-files.js >nul
)
popd

echo.
echo [1/7] Arret des processus Node.js...
taskkill /F /IM node.exe /T >NUL 2>&1
timeout /t 2 /nobreak >NUL

echo [2/7] Nettoyage...
if exist out rmdir /s /q out 2>NUL
if exist android\app\build rmdir /s /q android\app\build 2>NUL

echo [3/7] Configuration mobile...
REM Sauvegarder config actuelle
if exist next.config.js copy /Y next.config.js next.config.web.backup >nul
copy /Y mobile-config\next.config.mobile.js next.config.js >nul

REM Desactiver temporairement les API pour le build mobile
if exist src\app\api (
    if exist src\app\_api_backup rmdir /s /q src\app\_api_backup 2>NUL
    rename src\app\api _api_backup
)

echo [4/7] Build Next.js pour mobile...
set BUILD_MODE=mobile
call npm run build
if errorlevel 1 (
    echo ERREUR: Build Next.js echoue
    REM Restaurer
    if exist src\app\_api_backup rename src\app\_api_backup api
    if exist next.config.web.backup (
        copy /Y next.config.web.backup next.config.js >nul
        del next.config.web.backup
    )
    pause
    exit /b 1
)

REM Restaurer API et config
if exist src\app\_api_backup rename src\app\_api_backup api
if exist next.config.web.backup (
    copy /Y next.config.web.backup next.config.js >nul
    del next.config.web.backup
) else if exist next.config.web.js (
    copy /Y next.config.web.js next.config.js >nul
)

echo [5/7] Sync Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo ERREUR: Capacitor sync echoue
    pause
    exit /b 1
)

echo [6/7] Build APK signe...
cd android
call .\gradlew.bat clean assembleRelease --parallel
if errorlevel 1 (
    echo ERREUR: Build APK echoue
    cd ..
    pause
    exit /b 1
)
cd ..

REM Renommer APK
set APK_SOURCE=android\app\build\outputs\apk\release\app-release.apk
set APK_DEST=android\app\build\outputs\apk\release\edt_cnam_v!VERSION!.apk
move /Y "%APK_SOURCE%" "%APK_DEST%" >nul
echo APK genere: edt_cnam_v!VERSION!.apk

echo [7/7] Upload vers Supabase...
node mobile-config\upload-to-supabase.js !VERSION!
if errorlevel 1 (
    echo ATTENTION: Upload Supabase echoue (le deploiement continue)
)

echo.
echo ========================================
echo   APK PRODUCTION COMPLETE !
echo ========================================
echo Version: !VERSION!
echo Fichier: edt_cnam_v!VERSION!.apk
echo.

REM ===== ETAPE 2: DEPLOY WEBSITE =====
echo ========================================
echo   ETAPE 2/2: DEPLOIEMENT DU SITE WEB
echo ========================================
echo.

REM S'assurer que la config web est active
if exist next.config.web.js (
    copy /Y next.config.web.js next.config.js >nul
    echo Configuration web activee
)

REM Verifier les API
if not exist src\app\api (
    echo ERREUR: API routes manquantes pour le site web !
    pause
    exit /b 1
)

echo Commit des changements...
git add .
git commit -m "Deploy production v!VERSION!"
if errorlevel 1 (
    echo ATTENTION: Pas de changements a committer
)

echo.
echo Push vers GitHub...
git push
if errorlevel 1 (
    echo.
    echo ERREUR: Git push echoue
    echo Le site n'a pas ete deploye
    echo.
    echo L'APK a ete genere avec succes mais vous devez
    echo deployer manuellement le site avec: git push
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOIEMENT PRODUCTION TERMINE !
echo ========================================
echo.
echo Version deployee: !VERSION!
echo.
echo [OK] APK Production: edt_cnam_v!VERSION!.apk
echo [OK] Site Web: Deploiement en cours sur Vercel
echo.
echo Les utilisateurs Android recevront automatiquement
echo la notification de mise a jour au prochain lancement.
echo.
echo URLs:
echo - Site: https://edt-eicnam.vercel.app
echo - API Version: https://edt-eicnam.vercel.app/api/version
echo - Dashboard Vercel: https://vercel.com/dashboard
echo.
pause
exit /b 0

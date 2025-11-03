@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   DEPLOY APK PROD - EDT EICNAM
echo ========================================
echo.

REM Parametre optionnel: version ex: 2.0.33
set PARAM_VERSION=%~1

REM Verifier la cle de signature
if not exist edt-cnam-release-key.keystore (
    echo ERREUR: Fichier de cle edt-cnam-release-key.keystore introuvable a la racine
    exit /b 1
)

REM Charger variables depuis .env.local si present
if exist .env.local (
    for /f "usebackq delims=" %%A in (".env.local") do (
        set "line=%%A"
        if not "!line!"=="" if not "!line:~0,1!"=="#" if not "!line:~0,1!"==";" (
            for /f "tokens=1* delims==" %%B in ("!line!") do (
                if not "%%B"=="" set "%%B=%%C"
            )
        )
    )
)

if not defined KEY_ALIAS set KEY_ALIAS=edtcnam
if not defined KEYSTORE_PASSWORD set /p KEYSTORE_PASSWORD=Entrez le mot de passe du keystore: 
if not defined KEY_PASSWORD set KEY_PASSWORD=%KEYSTORE_PASSWORD%

echo [1/6] Arret processus Node.js...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    taskkill /F /IM node.exe /T >NUL 2>&1
)

echo [2/6] Nettoyage...
if exist android\app\build rmdir /s /q android\app\build

echo [3/6] Build Next.js pour mobile (export)...
set BUILD_MODE=mobile
if exist next.config.js copy /Y next.config.js next.config.web.backup >nul
copy /Y mobile-config\next.config.mobile.js next.config.js >nul
if exist src\app\api (
    if exist src\app\_api_backup rmdir /s /q src\app\_api_backup
    rename src\app\api _api_backup
)
call npm run build
if errorlevel 1 (
    echo ERREUR: Build Next.js a echoue
    if exist src\app\_api_backup (
        if exist src\app\api rmdir /s /q src\app\api
        rename src\app\_api_backup api
    )
    if exist next.config.web.backup (
        copy /Y next.config.web.backup next.config.js >nul
        del next.config.web.backup >nul
    )
    exit /b 1
)
if exist src\app\_api_backup (
    if exist src\app\api rmdir /s /q src\app\api
    rename src\app\_api_backup api
)
if exist next.config.web.backup (
    copy /Y next.config.web.backup next.config.js >nul
    del next.config.web.backup >nul
)

echo [4/6] Capacitor copy Android...
call npx cap copy android
if errorlevel 1 (
    call npx cap sync android
    if errorlevel 1 (
        echo ERREUR: Capacitor sync a echoue
        exit /b 1
    )
)

echo [5/6] Build APK release signe...
cd android
call .\gradlew.bat clean assembleRelease --parallel
if errorlevel 1 (
    echo ERREUR: Build release a echoue
    cd ..
    exit /b 1
)
cd ..

REM Determiner VERSION
if defined PARAM_VERSION (
    set VERSION=%PARAM_VERSION%
    call node mobile-config\set-version.js !VERSION! >nul
    call node mobile-config\update-version-in-files.js >nul
) else (
    for /f "delims=" %%i in ('node mobile-config\get-version.js') do set VERSION=%%i
)
echo Version: !VERSION!

REM Renommer APK release
set APK_SOURCE=android\app\build\outputs\apk\release\app-release.apk
set APK_DEST=android\app\build\outputs\apk\release\edt_cnam_v!VERSION!.apk
if exist "%APK_DEST%" del "%APK_DEST%" >nul 2>&1
move /Y "%APK_SOURCE%" "%APK_DEST%" >nul
echo APK signe: edt_cnam_v!VERSION!.apk

echo [6/6] Upload Supabase...
node mobile-config\upload-to-supabase.js !VERSION!
if errorlevel 1 (
    echo ATTENTION: Upload Supabase echoue
)

echo.
echo ========================================
echo   APK PROD GENERE ET UPLOADE
echo ========================================
echo.
echo Aucune action sur le site n'a ete faite.
exit /b 0


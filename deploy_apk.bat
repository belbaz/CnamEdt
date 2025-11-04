@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   DEPLOY APK - EDT EICNAM
echo ========================================
echo.

REM Verifier si une version est passee en parametre
set PARAM_VERSION=%~1

REM Se deplacer dans mobile-config pour utiliser build-apk.bat
cd mobile-config

if defined PARAM_VERSION (
    echo Version specifiee: %PARAM_VERSION%
    call .\build-apk.bat %PARAM_VERSION%
) else (
    echo Pas de version specifiee, utilisation de build-apk.bat...
    call .\build-apk.bat
)

if errorlevel 1 (
    echo.
    echo ERREUR: Build APK a echoue
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo   DEPLOY APK TERMINE
echo ========================================
echo.
echo L'APK a ete cree et uploade sur Supabase
echo.
echo Pour installer sur votre telephone:
echo adb install android\app\build\outputs\apk\release\edt_cnam_v*.apk
echo.
pause
exit /b 0


@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   SWITCH CHANNEL - EDT EICNAM
echo ========================================
echo.

echo Canal actuel dans l'environnement:
if defined APP_CHANNEL (
    echo APP_CHANNEL=%APP_CHANNEL%
) else (
    echo APP_CHANNEL=non defini (par defaut: prod)
)

if defined NEXT_PUBLIC_APP_CHANNEL (
    echo NEXT_PUBLIC_APP_CHANNEL=%NEXT_PUBLIC_APP_CHANNEL%
) else (
    echo NEXT_PUBLIC_APP_CHANNEL=non defini (par defaut: prod)
)

echo.
echo Choisissez le canal:
echo [1] Production (prod)
echo [2] Test
echo [3] Annuler
echo.
choice /C 123 /M "Votre choix"

if errorlevel 3 (
    echo Annule
    exit /b 0
)

if errorlevel 2 (
    set NEW_CHANNEL=test
    echo.
    echo ========================================
    echo   CANAL TEST ACTIVE
    echo ========================================
) else (
    set NEW_CHANNEL=prod
    echo.
    echo ========================================
    echo   CANAL PRODUCTION ACTIVE
    echo ========================================
)

REM Exporter les variables pour la session courante
set APP_CHANNEL=%NEW_CHANNEL%
set NEXT_PUBLIC_APP_CHANNEL=%NEW_CHANNEL%

echo.
echo Variables d'environnement mises a jour pour cette session:
echo APP_CHANNEL=%APP_CHANNEL%
echo NEXT_PUBLIC_APP_CHANNEL=%NEXT_PUBLIC_APP_CHANNEL%
echo.
echo IMPORTANT: Ces variables ne sont valides que pour cette session CMD.
echo Pour les scripts de build, elles sont definies automatiquement.
echo.
pause

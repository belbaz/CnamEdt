@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   DEPLOY APK TEST - EDT EICNAM
echo ========================================
echo.

REM Parametre optionnel: version ex: 2.0.33
set PARAM_VERSION=%~1

pushd mobile-config
echo [1/4] Dossier courant: %CD%
if not exist build-apk.bat (
    echo ERREUR: build-apk.bat introuvable dans %CD%
    popd
    echo Appuyez sur une touche pour fermer...
    pause >nul
    exit /b 1
)
if defined PARAM_VERSION (
    REM Valider format X.Y.Z, sinon ignorer
    echo %PARAM_VERSION% | findstr /R "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
    if errorlevel 1 (
        echo Parametre fourni "%PARAM_VERSION%" n'est pas une version X.Y.Z. Incrementation automatique utilisee.
        set PARAM_VERSION=
    ) else (
        echo Version specifiee: %PARAM_VERSION%
        call node set-version.js %PARAM_VERSION%
        if errorlevel 1 (
            echo ERREUR: set-version a echoue
            popd
            exit /b 1
        )
        call node update-version-in-files.js
        if errorlevel 1 (
            echo ERREUR: update-version-in-files a echoue
            popd
            exit /b 1
        )
    )
)

REM Build et upload APK test (debug) avec renommage edt_cnam_v_test_X.Y.Z.apk
echo [2/4] Lancement du build APK (test)...
echo    Version: %PARAM_VERSION%
@echo on
if defined PARAM_VERSION (
    call .\build-apk.bat %PARAM_VERSION% test
) else (
    call .\build-apk.bat "" test
)
@echo off
if errorlevel 1 (
    echo.
    echo ERREUR: build-apk test a echoue (voir logs ci-dessus)
    popd
    echo Appuyez sur une touche pour fermer...
    pause >nul
    exit /b 1
)
popd

echo.
echo ========================================
echo   [OK] APK TEST GENERE ET UPLOADE
echo ========================================
echo.
echo L'API /api/version?test=true pointera automatiquement vers la derniere version de test.
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
exit /b 0


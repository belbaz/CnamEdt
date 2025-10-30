@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   TEST BUILD SECURITE ANDROID
echo ========================================
echo.
echo Ce script teste si les ameliorations de
echo securite compilent correctement.
echo.

echo [1/5] Nettoyage des builds precedents...
cd android
call .\gradlew.bat clean >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Nettoyage echoue
    cd ..
    pause
    exit /b 1
)
cd ..
echo OK

echo [2/5] Verification du fichier network_security_config.xml...
if exist "android\app\src\main\res\xml\network_security_config.xml" (
    echo OK - Fichier trouve
) else (
    echo ERREUR: Fichier network_security_config.xml manquant
    pause
    exit /b 1
)

echo [3/5] Verification du AndroidManifest.xml...
findstr /C:"networkSecurityConfig" android\app\src\main\AndroidManifest.xml >nul
if errorlevel 1 (
    echo ERREUR: Configuration reseau non trouvee dans le manifeste
    pause
    exit /b 1
)
echo OK - Configuration reseau trouvee

echo [4/5] Verification du build.gradle...
findstr /C:"minifyEnabled true" android\app\build.gradle >nul
if errorlevel 1 (
    echo ERREUR: minifyEnabled non active
    pause
    exit /b 1
)
echo OK - Obfuscation activee

echo [5/5] Test de build release (peut prendre 2-3 minutes)...
echo.
echo Debut du build...
cd android
call .\gradlew.bat assembleRelease --console=plain
set BUILD_RESULT=!errorlevel!
cd ..

if !BUILD_RESULT! EQU 0 (
    echo.
    echo ========================================
    echo   BUILD REUSSI !
    echo ========================================
    echo.
    echo Les ameliorations de securite sont OK:
    echo  - Network Security Config   [OK]
    echo  - AndroidManifest mis a jour [OK]
    echo  - Obfuscation R8 activee     [OK]
    echo  - ProGuard rules correctes   [OK]
    echo.
    echo APK genere avec succes !
    echo.
    
    REM Trouver le fichier APK
    for %%F in (android\app\build\outputs\apk\release\*.apk) do (
        set APK_FILE=%%F
        set APK_SIZE=%%~zF
        set /a APK_SIZE_MB=!APK_SIZE! / 1024 / 1024
        echo Fichier: %%~nxF
        echo Taille: !APK_SIZE_MB! MB
    )
    echo.
) else (
    echo.
    echo ========================================
    echo   BUILD ECHOUE
    echo ========================================
    echo.
    echo Verifiez les erreurs ci-dessus.
    echo.
    echo Erreurs possibles:
    echo  - Regles ProGuard incorrectes
    echo  - Fichier XML mal forme
    echo  - Dependances manquantes
    echo.
)

pause


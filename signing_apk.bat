@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   CONFIGURATION SIGNATURE APK
echo ========================================
echo.
echo Ce script va configurer la signature officielle pour votre APK.
echo.
echo Avantages:
echo - Moins d'avertissements Google Play Protect
echo - APK professionnel
echo - Mises a jour fluides
echo.
pause
echo.

REM Verifier si keytool est disponible
keytool -version >NUL 2>&1
if errorlevel 1 (
    echo ERREUR: keytool non trouve
    echo.
    echo keytool est fourni avec Java JDK.
    echo Verifiez que Java JDK est installe et dans le PATH.
    echo.
    pause
    exit /b 1
)

echo [1/4] Creation de la cle de signature...
echo.

REM Verifier si la clé existe déjà
if exist edt-cnam-release-key.keystore (
    echo ATTENTION: La cle existe deja !
    echo.
    set /p OVERWRITE="Voulez-vous la remplacer ? (O/N): "
    if /i not "!OVERWRITE!"=="O" (
        echo Operation annulee
        pause
        exit /b 0
    )
    del edt-cnam-release-key.keystore
)

echo.
echo Lecture du mot de passe depuis .env.local...

REM Lire le mot de passe depuis .env.local
set STORE_PASSWORD=
if exist .env.local (
    for /f "tokens=1,2 delims==" %%a in ('findstr /C:"KEYSTORE_PASSWORD" .env.local') do set STORE_PASSWORD=%%b
)

if "!STORE_PASSWORD!"=="" (
    echo ERREUR: KEYSTORE_PASSWORD non trouve dans .env.local
    echo.
    echo Ajoutez cette ligne dans votre fichier .env.local:
    echo KEYSTORE_PASSWORD=VotreMotDePasseSecurise123
    echo.
    pause
    exit /b 1
)

echo Mot de passe trouve dans .env.local
set KEY_ALIAS=edt-cnam

echo.
echo Creation de la cle...
keytool -genkey -v -keystore edt-cnam-release-key.keystore -alias !KEY_ALIAS! -keyalg RSA -keysize 2048 -validity 10000 -storepass !STORE_PASSWORD! -keypass !STORE_PASSWORD! -dname "CN=EDT EICNAM, OU=EICNAM, O=EICNAM, L=Paris, ST=Ile-de-France, C=FR"

if errorlevel 1 (
    echo.
    echo ERREUR: Creation de la cle echouee
    pause
    exit /b 1
)

echo.
echo [2/4] Creation du fichier keystore.properties...

REM Créer le fichier keystore.properties
(
echo storeFile=../edt-cnam-release-key.keystore
echo storePassword=!STORE_PASSWORD!
echo keyAlias=!KEY_ALIAS!
echo keyPassword=!STORE_PASSWORD!
) > android\keystore.properties

echo Fichier android\keystore.properties cree

echo.
echo [3/4] Mise a jour de .gitignore...

REM Vérifier si .gitignore contient déjà les règles
findstr /C:"*.keystore" .gitignore >NUL 2>&1
if errorlevel 1 (
    echo. >> .gitignore
    echo # Cle de signature (NE PAS COMMITER^) >> .gitignore
    echo *.keystore >> .gitignore
    echo android/keystore.properties >> .gitignore
    echo edt-cnam-release-key.keystore >> .gitignore
    echo Regles ajoutees a .gitignore
) else (
    echo Regles deja presentes dans .gitignore
)

echo.
echo [4/4] Modification de build.gradle...

REM Backup du build.gradle
copy /Y android\app\build.gradle android\app\build.gradle.backup >nul
echo Backup cree: android\app\build.gradle.backup

echo.
echo ========================================
echo   CONFIGURATION TERMINEE !
echo ========================================
echo.
echo Fichiers crees:
echo - edt-cnam-release-key.keystore
echo - android\keystore.properties
echo.
echo IMPORTANT:
echo.
echo 1. Sauvegardez edt-cnam-release-key.keystore en lieu sur !
echo 2. Notez votre mot de passe: !STORE_PASSWORD!
echo 3. NE PARTAGEZ JAMAIS ces fichiers !
echo.
echo PROCHAINES ETAPES:
echo.
echo 1. Modifiez android\app\build.gradle:
echo    - Ajoutez la configuration de signature (voir SIGNING_GUIDE.md)
echo.
echo 2. Modifiez deploy.bat:
echo    - Remplacez "assembleDebug" par "assembleRelease"
echo    - Changez le chemin "debug" par "release"
echo.
echo 3. Testez avec: .\deploy.bat
echo.
echo Consultez SIGNING_GUIDE.md pour les details complets.
echo.
pause


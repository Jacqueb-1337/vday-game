@echo off
echo ========================================
echo    Building Willowmere ZIP Package
echo ========================================
echo.

REM Check if NW.js is set up
if not exist "nwjs\nw.exe" (
    echo ERROR: NW.js not found!
    echo Please run setup-prod.bat first to download NW.js
    echo.
    pause
    exit /b 1
)

REM Create directories
if not exist "dist" mkdir dist
if not exist "build\windows-zip" mkdir build\windows-zip

set BUILD_DIR=build\windows-zip
set PACKAGE_DIR=%BUILD_DIR%\Willowmere

echo Creating portable package...

REM Clean and create package directory
if exist "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%"

echo Copying NW.js runtime...
xcopy /E /I /H /Y "nwjs\*" "%PACKAGE_DIR%\"

echo Copying game files...
xcopy /E /I /Y "src\*" "%PACKAGE_DIR%\src\"
copy "index.html" "%PACKAGE_DIR%\"
copy "main.js" "%PACKAGE_DIR%\"
copy "style.css" "%PACKAGE_DIR%\"
copy "package.json" "%PACKAGE_DIR%\"
copy "tilemap.json" "%PACKAGE_DIR%\"
copy "objectmap.json" "%PACKAGE_DIR%\"
copy "npcs.json" "%PACKAGE_DIR%\"
copy "dialogue.json" "%PACKAGE_DIR%\"
copy "README.md" "%PACKAGE_DIR%\"
if exist "LICENSE" copy "LICENSE" "%PACKAGE_DIR%\LICENSE.txt"

REM Rename nw.exe to Willowmere.exe
if exist "%PACKAGE_DIR%\nw.exe" (
    move "%PACKAGE_DIR%\nw.exe" "%PACKAGE_DIR%\Willowmere.exe"
)

REM Create launch script
echo @echo off > "%PACKAGE_DIR%\Launch Willowmere.bat"
echo cd /d "%%~dp0" >> "%PACKAGE_DIR%\Launch Willowmere.bat"
echo start "" "Willowmere.exe" >> "%PACKAGE_DIR%\Launch Willowmere.bat"

REM Create modding info file
echo Willowmere - Modding Information > "%PACKAGE_DIR%\MODDING.txt"
echo. >> "%PACKAGE_DIR%\MODDING.txt"
echo This game is designed to be easily moddable! >> "%PACKAGE_DIR%\MODDING.txt"
echo. >> "%PACKAGE_DIR%\MODDING.txt"
echo Key files you can modify: >> "%PACKAGE_DIR%\MODDING.txt"
echo - src/assets/ - All game textures and sprites >> "%PACKAGE_DIR%\MODDING.txt"
echo - tilemap.json - Map layout and tile data >> "%PACKAGE_DIR%\MODDING.txt"
echo - objectmap.json - Placed objects and buildings >> "%PACKAGE_DIR%\MODDING.txt"
echo - npcs.json - NPC data and positions >> "%PACKAGE_DIR%\MODDING.txt"
echo - dialogue.json - NPC dialogue >> "%PACKAGE_DIR%\MODDING.txt"
echo - src/*.js - Game logic and mechanics >> "%PACKAGE_DIR%\MODDING.txt"
echo. >> "%PACKAGE_DIR%\MODDING.txt"
echo To run your modded game: >> "%PACKAGE_DIR%\MODDING.txt"
echo 1. Make your changes to the files above >> "%PACKAGE_DIR%\MODDING.txt"
echo 2. Run Willowmere.exe or "Launch Willowmere.bat" >> "%PACKAGE_DIR%\MODDING.txt"
echo. >> "%PACKAGE_DIR%\MODDING.txt"
echo For more information, see README.md >> "%PACKAGE_DIR%\MODDING.txt"
echo Happy modding! >> "%PACKAGE_DIR%\MODDING.txt"

REM Create installation instructions
echo Willowmere - Installation Instructions > "%PACKAGE_DIR%\INSTALL.txt"
echo. >> "%PACKAGE_DIR%\INSTALL.txt"
echo This is a portable version of Willowmere. >> "%PACKAGE_DIR%\INSTALL.txt"
echo No installation required! >> "%PACKAGE_DIR%\INSTALL.txt"
echo. >> "%PACKAGE_DIR%\INSTALL.txt"
echo To run the game: >> "%PACKAGE_DIR%\INSTALL.txt"
echo - Double-click "Launch Willowmere.bat" >> "%PACKAGE_DIR%\INSTALL.txt"
echo - Or double-click "Willowmere.exe" >> "%PACKAGE_DIR%\INSTALL.txt"
echo. >> "%PACKAGE_DIR%\INSTALL.txt"
echo To install system-wide (optional): >> "%PACKAGE_DIR%\INSTALL.txt"
echo 1. Copy this entire folder to C:\Program Files\Willowmere\ >> "%PACKAGE_DIR%\INSTALL.txt"
echo 2. Create shortcuts to Willowmere.exe on your desktop >> "%PACKAGE_DIR%\INSTALL.txt"
echo. >> "%PACKAGE_DIR%\INSTALL.txt"
echo The game is fully moddable - see MODDING.txt for details. >> "%PACKAGE_DIR%\INSTALL.txt"

echo Creating ZIP package...

REM Create ZIP using PowerShell
set ZIP_NAME=Willowmere-v1.0.0-Windows-Portable.zip

REM Remove existing ZIP if it exists
if exist "dist\%ZIP_NAME%" del "dist\%ZIP_NAME%"

powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('%BUILD_DIR%', 'dist\%ZIP_NAME%')}"

if exist "dist\%ZIP_NAME%" (
    echo.
    echo ========================================
    echo     ZIP Package Built Successfully!
    echo ========================================
    echo.
    echo Package location: dist\%ZIP_NAME%
    echo.
    echo The ZIP contains:
    echo   - Complete portable game
    echo   - No installation required
    echo   - All source files for modding
    echo   - Launch scripts for easy running
    echo.
    echo To distribute:
    echo   1. Share the ZIP file
    echo   2. Users extract and run "Launch Willowmere.bat"
    echo.
) else (
    echo ERROR: Failed to create ZIP package
)

pause

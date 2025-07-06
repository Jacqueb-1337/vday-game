@echo off
echo ========================================
echo   Building for ALL Platforms
echo ========================================
echo.

set NWJS_VERSION=v0.82.0

if not exist "dist" mkdir dist
if not exist "build" mkdir build

echo Downloading NW.js for all platforms...
echo.

REM Download for Windows x64
call :download_platform win-x64 zip

REM Download for Windows 32-bit
call :download_platform win-ia32 zip

REM Download for Linux x64
call :download_platform linux-x64 tar.gz

REM Download for Linux 32-bit  
call :download_platform linux-ia32 tar.gz

REM Download for macOS x64
call :download_platform osx-x64 zip

REM Download for macOS ARM64
call :download_platform osx-arm64 zip

echo.
echo Building packages for all platforms...
echo.

REM Build Windows packages
call :build_zip_package win-x64
call :build_zip_package win-ia32

REM Build macOS packages  
call :build_zip_package osx-x64
call :build_zip_package osx-arm64

REM Note about Linux (requires 7-zip for tar.gz extraction)
echo NOTE: Linux packages require 7-Zip to be installed for full support
echo Install 7-Zip from https://www.7-zip.org/ for Linux package creation

echo.
echo ========================================
echo    Multi-Platform Build Complete!
echo ========================================
echo.
echo Built packages:
dir /b dist\Willowmere-v1.0.0-* 2>nul
echo.
pause
goto :eof

:download_platform
set PLATFORM=%1
set EXTENSION=%2
set FILENAME=nwjs-%NWJS_VERSION%-%PLATFORM%
set URL=https://dl.nwjs.io/%NWJS_VERSION%/%FILENAME%.%EXTENSION%
set DOWNLOAD_FILE=build\%FILENAME%.%EXTENSION%

if not exist "%DOWNLOAD_FILE%" (
    echo Downloading %FILENAME%.%EXTENSION%...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%URL%' -OutFile '%DOWNLOAD_FILE%' -UserAgent 'Mozilla/5.0'}"
    if exist "%DOWNLOAD_FILE%" (
        echo   Downloaded successfully
    ) else (
        echo   ERROR: Failed to download
    )
) else (
    echo %FILENAME%.%EXTENSION% already downloaded
)
goto :eof

:build_zip_package
set PLATFORM=%1
set BUILD_DIR=build\%PLATFORM%
set PACKAGE_DIR=%BUILD_DIR%\Willowmere
set NWJS_FILE=build\nwjs-%NWJS_VERSION%-%PLATFORM%.zip

echo Building package for %PLATFORM%...

if not exist "%NWJS_FILE%" (
    echo   Skipping %PLATFORM% - download file not found
    goto :eof
)

REM Clean and create directories
if exist "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%"

REM Extract NW.js
powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('%NWJS_FILE%', '%BUILD_DIR%\temp')}"
move "%BUILD_DIR%\temp\nwjs-%NWJS_VERSION%-%PLATFORM%\*" "%PACKAGE_DIR%\" >nul 2>&1
rmdir /s /q "%BUILD_DIR%\temp" >nul 2>&1

REM Copy game files
xcopy /E /I /Y "src\*" "%PACKAGE_DIR%\src\" >nul
copy "index.html" "%PACKAGE_DIR%\" >nul
copy "main.js" "%PACKAGE_DIR%\" >nul  
copy "style.css" "%PACKAGE_DIR%\" >nul
copy "package.json" "%PACKAGE_DIR%\" >nul
copy "tilemap.json" "%PACKAGE_DIR%\" >nul
copy "objectmap.json" "%PACKAGE_DIR%\" >nul
copy "npcs.json" "%PACKAGE_DIR%\" >nul
copy "dialogue.json" "%PACKAGE_DIR%\" >nul
copy "README.md" "%PACKAGE_DIR%\" >nul
if exist "LICENSE" copy "LICENSE" "%PACKAGE_DIR%\LICENSE.txt" >nul

REM Create platform-specific files
if "%PLATFORM:~0,3%"=="win" (
    REM Windows: rename nw.exe and create .bat launcher
    if exist "%PACKAGE_DIR%\nw.exe" move "%PACKAGE_DIR%\nw.exe" "%PACKAGE_DIR%\Willowmere.exe" >nul
    echo @echo off > "%PACKAGE_DIR%\Launch Willowmere.bat"
    echo cd /d "%%~dp0" >> "%PACKAGE_DIR%\Launch Willowmere.bat"
    echo start "" "Willowmere.exe" >> "%PACKAGE_DIR%\Launch Willowmere.bat"
    set RUN_COMMAND=Launch Willowmere.bat or Willowmere.exe
    set OS_NAME=Windows
) else (
    REM macOS: create shell launcher
    echo #!/bin/bash > "%PACKAGE_DIR%\launch-willowmere.sh"
    echo cd "$(dirname "$0")" >> "%PACKAGE_DIR%\launch-willowmere.sh"
    echo ./nwjs.app/Contents/MacOS/nwjs . >> "%PACKAGE_DIR%\launch-willowmere.sh"
    set RUN_COMMAND=./launch-willowmere.sh or open nwjs.app
    set OS_NAME=macOS
)

REM Create documentation
echo Willowmere - Installation Instructions > "%PACKAGE_DIR%\INSTALL.txt"
echo. >> "%PACKAGE_DIR%\INSTALL.txt"
echo This is a portable version of Willowmere for %OS_NAME%. >> "%PACKAGE_DIR%\INSTALL.txt"
echo No installation required! >> "%PACKAGE_DIR%\INSTALL.txt"
echo. >> "%PACKAGE_DIR%\INSTALL.txt"
echo To run the game: >> "%PACKAGE_DIR%\INSTALL.txt"
echo - %RUN_COMMAND% >> "%PACKAGE_DIR%\INSTALL.txt"
echo. >> "%PACKAGE_DIR%\INSTALL.txt"
echo The game is fully moddable - see README.md for details. >> "%PACKAGE_DIR%\INSTALL.txt"

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
echo Happy modding! >> "%PACKAGE_DIR%\MODDING.txt"

REM Create ZIP package
set ZIP_NAME=Willowmere-v1.0.0-%PLATFORM%-Portable.zip
if exist "dist\%ZIP_NAME%" del "dist\%ZIP_NAME%"

powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('%BUILD_DIR%', 'dist\%ZIP_NAME%')}"

if exist "dist\%ZIP_NAME%" (
    echo   Created: %ZIP_NAME%
) else (
    echo   ERROR: Failed to create %ZIP_NAME%
)
goto :eof

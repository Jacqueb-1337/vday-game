@echo off
setlocal enabledelayedexpansion

echo ========================================
echo          Willowmere Setup
echo ========================================
echo.

REM NW.js version to download
set NWJS_VERSION=v0.82.0

REM Check if argument was passed
set BUILD_TYPE=%1
if "%BUILD_TYPE%"=="" (
    echo Which NW.js version do you want?
    echo   1] Production ^(smaller, faster^)
    echo   2] Development ^(includes DevTools^)
    echo.
    set /p choice="Enter choice (1-2): "
    if "!choice!"=="2" (
        set BUILD_TYPE=dev
    ) else (
        set BUILD_TYPE=prod
    )
) else if "%BUILD_TYPE%"=="dev" (
    set BUILD_TYPE=dev
) else (
    set BUILD_TYPE=prod
)

REM Set flavor based on build type
if "%BUILD_TYPE%"=="dev" (
    set FLAVOR=sdk
    echo Setting up NW.js Development version with DevTools...
) else (
    set FLAVOR=normal
    echo Setting up NW.js Production version...
)

REM Detect architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set ARCH=win-x64
) else (
    set ARCH=win-ia32
)

REM Set download info
set FILENAME=nwjs-%FLAVOR%-%NWJS_VERSION%-%ARCH%
set URL=https://dl.nwjs.io/%NWJS_VERSION%/%FILENAME%.zip
set DOWNLOAD_FILE=%FILENAME%.zip

echo.
echo Downloading: %FILENAME%
echo Architecture: %ARCH%
echo URL: %URL%
echo.

REM Clean existing installation
if exist "nwjs\" (
    echo Cleaning existing NW.js installation...
    rmdir /s /q "nwjs"
)

REM Download NW.js using PowerShell
echo Downloading NW.js... (this may take a few minutes)
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%URL%' -OutFile '%DOWNLOAD_FILE%' -UserAgent 'Mozilla/5.0'}"

if not exist "%DOWNLOAD_FILE%" (
    echo ERROR: Failed to download NW.js
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo Download completed! Extracting...

REM Extract using PowerShell
powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('%DOWNLOAD_FILE%', '.')}"

if not exist "%FILENAME%\" (
    echo ERROR: Failed to extract NW.js
    pause
    exit /b 1
)

REM Rename extracted folder to nwjs
move "%FILENAME%" "nwjs"

if not exist "nwjs\" (
    echo ERROR: Failed to rename extracted folder
    pause
    exit /b 1
)

REM Clean up download file
del "%DOWNLOAD_FILE%"

REM Create launch script
echo @echo off > launch.bat
echo cd /d "%%~dp0" >> launch.bat
echo nwjs\nw.exe . >> launch.bat
echo pause >> launch.bat

echo.
echo ========================================
echo          Setup Complete!
echo ========================================
echo.
echo Your game is ready to run!
echo.
echo To start the game:
echo   - Double-click launch.bat
echo   - Or run: nwjs\nw.exe .
echo.
echo NW.js %FLAVOR% %NWJS_VERSION% installed successfully!
echo Location: %CD%\nwjs\
echo.
pause

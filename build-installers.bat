@echo off
echo ========================================
echo       Willowmere Installer Builder
echo ========================================
echo.

if "%1"=="help" goto :help
if "%1"=="--help" goto :help
if "%1"=="-h" goto :help

REM Check if NW.js is set up
if not exist "nwjs\" (
    echo ERROR: NW.js not found!
    echo Please run setup-prod.bat first
    pause
    exit /b 1
)

REM Create directories
if not exist "dist" mkdir dist
if not exist "build" mkdir build

if "%1"=="windows" goto :windows
if "%1"=="all" goto :all
if "%1"=="" goto :windows

echo Unknown target: %1
goto :help

:windows
echo Building Windows installer...
call build-installer.bat
goto :end

:all
echo Building for all platforms...
echo.
echo Building Windows installer...
call build-installer.bat
echo.
echo For macOS and Linux, please run build-installers.sh on those platforms
goto :end

:help
echo Usage: %0 [target]
echo.
echo Targets:
echo   windows  - Build Windows installer (default)
echo   all      - Build for all platforms
echo   help     - Show this help
echo.
echo Examples:
echo   %0
echo   %0 windows
echo   %0 all
goto :end

:end
echo.
echo ========================================
echo           Build Complete!
echo ========================================
echo.
echo Check the dist\ directory for installer files.
echo All installers preserve source code for easy modding!
echo.
pause

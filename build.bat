@echo off
echo ========================================
echo       Quick Installer Build
echo ========================================
echo.

REM Check if NW.js is already set up
if not exist "nwjs\" (
    echo ERROR: NW.js not found!
    echo Please run one of these first:
    echo   setup-dev.bat  - Development version
    echo   setup-prod.bat - Production version ^(recommended^)
    echo.
    pause
    exit /b 1
)

echo Building installers...

REM Ask user which platform to build for
echo Which platform would you like to build for?
echo   1] Windows only (fastest)
echo   2] All platforms (downloads NW.js for all platforms)
echo   3] Advanced options
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo Building Windows installer...
    call build-installers.bat windows
) else if "%choice%"=="2" (
    echo Building for all platforms...
    call build-installers.bat all
) else if "%choice%"=="3" (
    echo.
    echo Advanced options:
    echo   windows - Build Windows installer only
    echo   all     - Build for all platforms
    echo   help    - Show all available options
    echo.
    call build-installers.bat
) else (
    echo Invalid choice, building Windows installer by default...
    call build-installers.bat windows
)

echo.
echo Build complete! Check dist\ directory for installer files.
pause

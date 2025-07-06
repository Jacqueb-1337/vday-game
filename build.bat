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
call build-installers.bat

echo.
echo Build complete! Check dist\ directory for installer files.
pause

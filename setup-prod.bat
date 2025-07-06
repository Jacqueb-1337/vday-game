@echo off
echo ========================================
echo      Willowmere Production Setup
echo ========================================
echo.
echo This will:
echo  1. Download production NW.js
echo  2. Build installers for distribution
echo.

call setup.bat prod

REM Check if setup was successful
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: NW.js setup failed. Cannot build installers.
    pause
    exit /b 1
)

echo.
echo ========================================
echo       Building Installers...
echo ========================================
echo.

REM Build installers
call build-installers.bat

echo.
echo ========================================
echo    Production Build Complete!
echo ========================================
echo.
echo Your game is ready for distribution!
echo Check the dist\ directory for installer files.
echo.
pause

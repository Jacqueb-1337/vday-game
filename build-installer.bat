@echo off
echo ========================================
echo       Building Willowmere Installer
echo ========================================
echo.

REM Check if Inno Setup is installed
if not exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" (
    if not exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" (
        echo ERROR: Inno Setup 6 not found!
        echo Please download and install Inno Setup from: https://jrsoftware.org/isinfo.php
        echo.
        pause
        exit /b 1
    )
    set ISCC="%ProgramFiles%\Inno Setup 6\ISCC.exe"
) else (
    set ISCC="%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
)

REM Check if NW.js is set up
if not exist "nwjs\nw.exe" (
    echo ERROR: NW.js not found!
    echo Please run setup-prod.bat first to download NW.js
    echo.
    pause
    exit /b 1
)

REM Create dist directory
if not exist "dist" mkdir dist

REM Build the installer
echo Building installer with Inno Setup...
%ISCC% "installer\windows\Willowmere.iss"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo     Installer Built Successfully!
    echo ========================================
    echo.
    echo Installer location: dist\Willowmere-Setup-v1.0.0.exe
    echo.
    echo The installer will:
    echo   - Install to Program Files\jacqueb\Willowmere
    echo   - Rename nw.exe to Willowmere.exe
    echo   - Create desktop shortcut (optional)
    echo   - Create start menu entries
    echo   - Keep all source files accessible for modding
    echo.
) else (
    echo.
    echo ERROR: Failed to build installer
    echo Check the output above for error details
    echo.
)

pause

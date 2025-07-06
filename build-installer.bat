@echo off
echo ========================================
echo       Building Willowmere Installer
echo ========================================
echo.

REM Check if Inno Setup is installed
set ISCC_FOUND=0
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" (
    set ISCC="%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
    set ISCC_FOUND=1
) else if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" (
    set ISCC="%ProgramFiles%\Inno Setup 6\ISCC.exe"
    set ISCC_FOUND=1
) else if exist "build\tools\inno-setup-portable\ISCC.exe" (
    set ISCC="build\tools\inno-setup-portable\ISCC.exe"
    set ISCC_FOUND=1
    echo Using portable Inno Setup...
)

if %ISCC_FOUND%==0 (
    echo Inno Setup not found in system. Downloading portable version...
    echo.
    call build-installer-portable.bat
    exit /b %ERRORLEVEL%
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

REM Check if installer was actually created (better than checking exit code due to warnings)
if exist "dist\Willowmere-Setup-v1.0.0.exe" (
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

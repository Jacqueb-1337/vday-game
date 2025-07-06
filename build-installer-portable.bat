@echo off
echo ========================================
echo    Building Windows Installer (EXE)
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
if not exist "build\tools" mkdir build\tools

REM Download portable Inno Setup if not exists
set INNO_PORTABLE_DIR=build\tools\inno-setup-portable
set INNO_COMPILER=%INNO_PORTABLE_DIR%\ISCC.exe

if not exist "%INNO_COMPILER%" (
    echo Downloading portable Inno Setup compiler...
    echo This is a one-time download (~10MB)
    echo.
    
    REM We'll use a GitHub release that has a portable version
    set INNO_URL=https://github.com/jrsoftware/issrc/releases/download/is-6_2_2/innosetup-6.2.2.exe
    set INNO_DOWNLOAD=build\tools\innosetup-installer.exe
    
    echo Downloading Inno Setup...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; try { Invoke-WebRequest -Uri '%INNO_URL%' -OutFile '%INNO_DOWNLOAD%' -UserAgent 'Mozilla/5.0' } catch { Write-Host 'Primary download failed, trying alternative...'; Invoke-WebRequest -Uri 'https://files.jrsoftware.org/is/6/innosetup-6.2.2.exe' -OutFile '%INNO_DOWNLOAD%' -UserAgent 'Mozilla/5.0' }}"
    
    if not exist "%INNO_DOWNLOAD%" (
        echo ERROR: Failed to download Inno Setup
        echo Falling back to ZIP package creation...
        goto :create_zip_fallback
    )
    
    echo Extracting portable Inno Setup...
    REM Install to our portable directory
    "%INNO_DOWNLOAD%" /VERYSILENT /SUPPRESSMSGBOXES /DIR="%INNO_PORTABLE_DIR%" /NORESTART
    
    REM Wait for installation to complete
    timeout /t 5 /nobreak > nul
    
    REM Clean up installer
    del "%INNO_DOWNLOAD%"
    
    if not exist "%INNO_COMPILER%" (
        echo WARNING: Portable Inno Setup extraction failed
        echo Falling back to ZIP package creation...
        goto :create_zip_fallback
    )

echo Building Windows installer using portable Inno Setup...
echo Using: %INNO_COMPILER%
echo.

REM Build the installer
"%INNO_COMPILER%" "installer\windows\Willowmere.iss"

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
    echo You can distribute this .exe file to users for easy installation.
    echo.
) else (
    echo ERROR: Inno Setup compilation failed
    echo Falling back to ZIP package creation...
    goto :create_zip_fallback
)

goto :end

:create_zip_fallback
echo.
echo ========================================
echo   Creating ZIP Package (Fallback)
echo ========================================
echo.

call build-installer-zip.bat

:end
pause
exit /b 0

:portable_fallback
echo.
echo ========================================
echo    Portable Setup Failed - Using ZIP
echo ========================================
echo.
echo Creating portable ZIP package instead...
call build-installer-zip.bat
pause
exit /b 1

@echo off
echo ========================================
echo   Building for ALL Platforms
echo ========================================
echo.

REM NW.js version
set NWJS_VERSION=v0.82.0

REM Create directories
if not exist "dist" mkdir dist
if not exist "build" mkdir build

echo Downloading NW.js for all platforms...
echo.

REM Define platform mappings
set PLATFORMS=win-x64 win-ia32 linux-x64 linux-ia32 osx-x64 osx-arm64

setlocal enabledelayedexpansion
for %%P in (%PLATFORMS%) do (
    echo Downloading NW.js for %%P...
    
    REM Determine file extension
    set EXTENSION=zip
    if "%%P"=="linux-x64" set EXTENSION=tar.gz
    if "%%P"=="linux-ia32" set EXTENSION=tar.gz
    
    REM Production build filename
    set FILENAME=nwjs-%NWJS_VERSION%-%%P
    
    REM Download if not already exists
    if not exist "build\!FILENAME!.!EXTENSION!" (
        echo   Downloading !FILENAME!.!EXTENSION!...
        
        REM Use PowerShell with proper parameter passing
        powershell -Command "& {param($url, $outfile) [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri $url -OutFile $outfile -UserAgent 'Mozilla/5.0'}" -url "https://dl.nwjs.io/%NWJS_VERSION%/!FILENAME!.!EXTENSION!" -outfile "build\!FILENAME!.!EXTENSION!"
        
        if not exist "build\!FILENAME!.!EXTENSION!" (
            echo   ERROR: Failed to download !FILENAME!.!EXTENSION!
        ) else (
            echo   Downloaded successfully
        )
    ) else (
        echo   Already downloaded
    )
    echo.
)

echo Building packages for all platforms...
echo.

REM Build Windows packages
call :build_windows win-x64
call :build_windows win-ia32

REM Build Linux packages  
call :build_linux linux-x64
call :build_linux linux-ia32

REM Build macOS packages
call :build_macos osx-x64
call :build_macos osx-arm64

echo.
echo ========================================
echo    All Platform Builds Complete!
echo ========================================
echo.
echo Built packages:
dir /b dist\Willowmere-v1.0.0-*
echo.
echo All packages are portable and include:
echo   - Complete game with NW.js runtime
echo   - All source files for modding
echo   - Installation instructions
echo   - Launch scripts
echo.
pause
goto :eof

:build_windows
set PLATFORM=%1
set BUILD_DIR=build\%PLATFORM%
set PACKAGE_DIR=%BUILD_DIR%\Willowmere
set NWJS_FILE=build\nwjs-%NWJS_VERSION%-%PLATFORM%.zip

echo Building Windows package for %PLATFORM%...

REM Clean and create directories
if exist "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%"

REM Extract NW.js
powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('%NWJS_FILE%', '%BUILD_DIR%\temp')}"
move "%BUILD_DIR%\temp\nwjs-%NWJS_VERSION%-%PLATFORM%\*" "%PACKAGE_DIR%\"
rmdir /s /q "%BUILD_DIR%\temp"

REM Copy game files
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

REM Rename executable
if exist "%PACKAGE_DIR%\nw.exe" move "%PACKAGE_DIR%\nw.exe" "%PACKAGE_DIR%\Willowmere.exe"

REM Create launch script
echo @echo off > "%PACKAGE_DIR%\Launch Willowmere.bat"
echo cd /d "%%~dp0" >> "%PACKAGE_DIR%\Launch Willowmere.bat"
echo start "" "Willowmere.exe" >> "%PACKAGE_DIR%\Launch Willowmere.bat"

REM Create install instructions
call :create_install_instructions "%PACKAGE_DIR%" "Windows" "Launch Willowmere.bat or Willowmere.exe"

REM Create ZIP
set ZIP_NAME=Willowmere-v1.0.0-%PLATFORM%-Portable.zip
if exist "dist\%ZIP_NAME%" del "dist\%ZIP_NAME%"
powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('%BUILD_DIR%', 'dist\%ZIP_NAME%')}"

if exist "dist\%ZIP_NAME%" (
    echo   Created: %ZIP_NAME%
) else (
    echo   ERROR: Failed to create %ZIP_NAME%
)
goto :eof

:build_linux
set PLATFORM=%1
set BUILD_DIR=build\%PLATFORM%
set PACKAGE_DIR=%BUILD_DIR%\Willowmere
set NWJS_FILE=build\nwjs-%NWJS_VERSION%-%PLATFORM%.tar.gz

echo Building Linux package for %PLATFORM%...

REM Clean and create directories
if exist "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%"

REM Extract NW.js using WSL or 7-zip if available
if exist "%ProgramFiles%\7-Zip\7z.exe" (
    "%ProgramFiles%\7-Zip\7z.exe" x "%NWJS_FILE%" -o"%BUILD_DIR%\temp" -y > nul
    "%ProgramFiles%\7-Zip\7z.exe" x "%BUILD_DIR%\temp\nwjs-%NWJS_VERSION%-%PLATFORM%.tar" -o"%BUILD_DIR%\temp" -y > nul
    move "%BUILD_DIR%\temp\nwjs-%NWJS_VERSION%-%PLATFORM%\*" "%PACKAGE_DIR%\"
    rmdir /s /q "%BUILD_DIR%\temp"
) else (
    echo   WARNING: 7-Zip not found, skipping Linux build for %PLATFORM%
    goto :eof
)

REM Copy game files
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

REM Rename executable
if exist "%PACKAGE_DIR%\nw" move "%PACKAGE_DIR%\nw" "%PACKAGE_DIR%\Willowmere"

REM Create launch script
echo #!/bin/bash > "%PACKAGE_DIR%\launch-willowmere.sh"
echo cd "$(dirname "$0")" >> "%PACKAGE_DIR%\launch-willowmere.sh"
echo ./Willowmere . >> "%PACKAGE_DIR%\launch-willowmere.sh"

REM Create install instructions
call :create_install_instructions "%PACKAGE_DIR%" "Linux" "./launch-willowmere.sh or ./Willowmere"

REM Create TAR.GZ
set TAR_NAME=Willowmere-v1.0.0-%PLATFORM%-Portable.tar.gz
if exist "dist\%TAR_NAME%" del "dist\%TAR_NAME%"
if exist "%ProgramFiles%\7-Zip\7z.exe" (
    "%ProgramFiles%\7-Zip\7z.exe" a -ttar "dist\%TAR_NAME:.tar.gz=.tar%" "%BUILD_DIR%\*" > nul
    "%ProgramFiles%\7-Zip\7z.exe" a -tgzip "dist\%TAR_NAME%" "dist\%TAR_NAME:.tar.gz=.tar%" > nul
    del "dist\%TAR_NAME:.tar.gz=.tar%"
    echo   Created: %TAR_NAME%
) else (
    echo   WARNING: Cannot create TAR.GZ without 7-Zip
)
goto :eof

:build_macos
set PLATFORM=%1
set BUILD_DIR=build\%PLATFORM%
set PACKAGE_DIR=%BUILD_DIR%\Willowmere
set NWJS_FILE=build\nwjs-%NWJS_VERSION%-%PLATFORM%.zip

echo Building macOS package for %PLATFORM%...

REM Clean and create directories
if exist "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%"

REM Extract NW.js
powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('%NWJS_FILE%', '%BUILD_DIR%\temp')}"
move "%BUILD_DIR%\temp\nwjs-%NWJS_VERSION%-%PLATFORM%\*" "%PACKAGE_DIR%\"
rmdir /s /q "%BUILD_DIR%\temp"

REM Copy game files
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

REM Create launch script
echo #!/bin/bash > "%PACKAGE_DIR%\launch-willowmere.sh"
echo cd "$(dirname "$0")" >> "%PACKAGE_DIR%\launch-willowmere.sh"
echo ./nwjs.app/Contents/MacOS/nwjs . >> "%PACKAGE_DIR%\launch-willowmere.sh"

REM Create install instructions  
call :create_install_instructions "%PACKAGE_DIR%" "macOS" "./launch-willowmere.sh or open nwjs.app"

REM Create ZIP
set ZIP_NAME=Willowmere-v1.0.0-%PLATFORM%-Portable.zip
if exist "dist\%ZIP_NAME%" del "dist\%ZIP_NAME%"
powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('%BUILD_DIR%', 'dist\%ZIP_NAME%')}"

if exist "dist\%ZIP_NAME%" (
    echo   Created: %ZIP_NAME%
) else (
    echo   ERROR: Failed to create %ZIP_NAME%
)
goto :eof

:create_install_instructions
set TARGET_DIR=%1
set OS_NAME=%2
set RUN_CMD=%3

REM Remove quotes from parameters
set TARGET_DIR=%TARGET_DIR:"=%
set OS_NAME=%OS_NAME:"=%
set RUN_CMD=%RUN_CMD:"=%

echo Willowmere - Installation Instructions > "%TARGET_DIR%\INSTALL.txt"
echo. >> "%TARGET_DIR%\INSTALL.txt"
echo This is a portable version of Willowmere for %OS_NAME%. >> "%TARGET_DIR%\INSTALL.txt"
echo No installation required! >> "%TARGET_DIR%\INSTALL.txt"
echo. >> "%TARGET_DIR%\INSTALL.txt"
echo To run the game: >> "%TARGET_DIR%\INSTALL.txt"
echo - %RUN_CMD% >> "%TARGET_DIR%\INSTALL.txt"
echo. >> "%TARGET_DIR%\INSTALL.txt"
echo The game is fully moddable - see README.md for details. >> "%TARGET_DIR%\INSTALL.txt"

REM Create modding info
echo Willowmere - Modding Information > "%TARGET_DIR%\MODDING.txt"
echo. >> "%TARGET_DIR%\MODDING.txt"
echo This game is designed to be easily moddable! >> "%TARGET_DIR%\MODDING.txt"
echo. >> "%TARGET_DIR%\MODDING.txt"
echo Key files you can modify: >> "%TARGET_DIR%\MODDING.txt"
echo - src/assets/ - All game textures and sprites >> "%TARGET_DIR%\MODDING.txt"
echo - tilemap.json - Map layout and tile data >> "%TARGET_DIR%\MODDING.txt"
echo - objectmap.json - Placed objects and buildings >> "%TARGET_DIR%\MODDING.txt"
echo - npcs.json - NPC data and positions >> "%TARGET_DIR%\MODDING.txt"
echo - dialogue.json - NPC dialogue >> "%TARGET_DIR%\MODDING.txt"
echo - src/*.js - Game logic and mechanics >> "%TARGET_DIR%\MODDING.txt"
echo. >> "%TARGET_DIR%\MODDING.txt"
echo Happy modding! >> "%TARGET_DIR%\MODDING.txt"
goto :eof

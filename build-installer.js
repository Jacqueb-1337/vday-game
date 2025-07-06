const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('========================================');
console.log('   Building Willowmere Installer (JS)');
console.log('========================================');
console.log();

// Check if NW.js is set up
if (!fs.existsSync('nwjs/nw.exe')) {
    console.error('ERROR: NW.js not found!');
    console.error('Please run setup-prod.bat first to download NW.js');
    process.exit(1);
}

// Create directories
const distDir = 'dist';
const buildDir = 'build/windows-installer';
const packageDir = path.join(buildDir, 'Willowmere');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

// Clean package directory
if (fs.existsSync(packageDir)) {
    fs.rmSync(packageDir, { recursive: true, force: true });
}
fs.mkdirSync(packageDir, { recursive: true });

console.log('Creating installer package...');

// Copy files function
function copyRecursive(src, dest) {
    if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(item => {
            copyRecursive(path.join(src, item), path.join(dest, item));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Copy NW.js runtime
console.log('Copying NW.js runtime...');
copyRecursive('nwjs', packageDir);

// Copy game files
console.log('Copying game files...');
const gameFiles = [
    'index.html', 'main.js', 'style.css', 'package.json',
    'tilemap.json', 'objectmap.json', 'npcs.json', 'dialogue.json',
    'README.md'
];

copyRecursive('src', path.join(packageDir, 'src'));

gameFiles.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(packageDir, file));
    }
});

if (fs.existsSync('LICENSE')) {
    fs.copyFileSync('LICENSE', path.join(packageDir, 'LICENSE.txt'));
}

// Rename nw.exe to Willowmere.exe
const nwExe = path.join(packageDir, 'nw.exe');
const willowmereExe = path.join(packageDir, 'Willowmere.exe');
if (fs.existsSync(nwExe)) {
    fs.renameSync(nwExe, willowmereExe);
}

// Create installer script (NSIS format)
const nsisScript = `
!define APPNAME "Willowmere"
!define COMPANYNAME "jacqueb"
!define DESCRIPTION "A magical 2D game with 3D movement capabilities"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0
!define HELPURL "https://github.com/jacqueb/willowmere"
!define UPDATEURL "https://github.com/jacqueb/willowmere"
!define ABOUTURL "https://github.com/jacqueb/willowmere"
!define INSTALLSIZE 150000

RequestExecutionLevel admin
InstallDir "$PROGRAMFILES64\\\\jacqueb\\\\Willowmere"
Name "\${APPNAME}"
outFile "..\\\\..\\\\dist\\\\Willowmere-Setup-v1.0.0.exe"
 
!include LogicLib.nsh
 
page components
page directory
page instfiles
 
!macro VerifyUserIsAdmin
UserInfo::GetAccountType
pop $0
\${If} $0 != "admin"
    messageBox mb_iconstop "Administrator rights required!"
    setErrorLevel 740
    quit
\${EndIf}
!macroend
 
function .onInit
    setShellVarContext all
    !insertmacro VerifyUserIsAdmin
functionEnd
 
section "install"
    setOutPath $INSTDIR
    file /r "Willowmere\\\\*.*"
    
    writeUninstaller "$INSTDIR\\\\uninstall.exe"
    
    createDirectory "$SMPROGRAMS\\\\Willowmere"
    createShortCut "$SMPROGRAMS\\\\Willowmere\\\\Willowmere.lnk" "$INSTDIR\\\\Willowmere.exe"
    createShortCut "$DESKTOP\\\\Willowmere.lnk" "$INSTDIR\\\\Willowmere.exe"
sectionEnd
 
section "uninstall"
    delete "$SMPROGRAMS\\\\Willowmere\\\\Willowmere.lnk"
    delete "$DESKTOP\\\\Willowmere.lnk"
    rmDir "$SMPROGRAMS\\\\Willowmere"
    
    rmDir /r "$INSTDIR"
sectionEnd
`;

// Create batch installer (fallback)
const batchInstaller = `@echo off
echo Installing Willowmere...
echo.

set INSTALL_DIR=%ProgramFiles%\\jacqueb\\Willowmere

echo Creating installation directory...
if not exist "%ProgramFiles%\\jacqueb" mkdir "%ProgramFiles%\\jacqueb"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Copying files...
xcopy /E /I /H /Y "Willowmere\\*" "%INSTALL_DIR%\\"

echo Creating shortcuts...
powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\\Desktop\\Willowmere.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\\Willowmere.exe'; $Shortcut.Save()}"

echo.
echo Installation complete!
echo Game installed to: %INSTALL_DIR%
echo Desktop shortcut created.
echo.
pause`;

// Create modding info
const moddingInfo = `Willowmere - Modding Information

This game is designed to be easily moddable!

Key files you can modify:
- src/assets/ - All game textures and sprites
- tilemap.json - Map layout and tile data
- objectmap.json - Placed objects and buildings
- npcs.json - NPC data and positions
- dialogue.json - NPC dialogue
- src/*.js - Game logic and mechanics

To run your modded game:
1. Make your changes to the files above
2. Run Willowmere.exe

For more information, see README.md
Happy modding!`;

fs.writeFileSync(path.join(packageDir, 'MODDING.txt'), moddingInfo);
fs.writeFileSync(path.join(buildDir, 'install.bat'), batchInstaller);

// Try to create a self-extracting installer
console.log('Creating self-extracting installer...');

try {
    // Use PowerShell to create a compressed installer
    const psScript = `
    $source = "${path.resolve(buildDir).replace(/\\/g, '\\\\')}"
    $destination = "${path.resolve('dist/Willowmere-Setup-v1.0.0.exe').replace(/\\/g, '\\\\')}"
    
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($source, "$destination.zip")
    
    # Create self-extracting executable
    $zipBytes = [System.IO.File]::ReadAllBytes("$destination.zip")
    $extractorScript = @"
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show("Extracting Willowmere installer...", "Willowmere Setup")
[System.IO.Compression.ZipFile]::ExtractToDirectory("$destination.zip", "$env:TEMP\\WillowmereSetup")
Start-Process "$env:TEMP\\WillowmereSetup\\install.bat" -Wait
Remove-Item "$env:TEMP\\WillowmereSetup" -Recurse -Force
Remove-Item "$destination.zip" -Force
"@
    $extractorScript | Out-File -FilePath "$destination.ps1" -Encoding UTF8
    Remove-Item "$destination.zip" -Force
    `;
    
    execSync(`powershell -Command "${psScript}"`, { stdio: 'inherit' });
    
    // Create ZIP fallback
    execSync(`powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${buildDir.replace(/\\/g, '\\\\')}', 'dist/Willowmere-v1.0.0-Windows.zip')"`, { stdio: 'inherit' });
    
    console.log();
    console.log('========================================');
    console.log('     Installer Built Successfully!');
    console.log('========================================');
    console.log();
    console.log('Files created:');
    console.log('  - dist/Willowmere-v1.0.0-Windows.zip (portable)');
    console.log();
    console.log('Installation options:');
    console.log('  1. Extract ZIP and run install.bat (recommended)');
    console.log('  2. Extract ZIP and copy files manually');
    console.log();
    
} catch (error) {
    console.error('Error creating installer:', error.message);
    console.log('Creating ZIP package as fallback...');
    
    try {
        execSync(`powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${buildDir.replace(/\\/g, '\\\\')}', 'dist/Willowmere-v1.0.0-Windows.zip')"`, { stdio: 'inherit' });
        console.log('ZIP package created: dist/Willowmere-v1.0.0-Windows.zip');
    } catch (zipError) {
        console.error('Failed to create ZIP package:', zipError.message);
        process.exit(1);
    }
}

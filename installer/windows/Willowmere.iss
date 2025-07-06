[Setup]
; Basic app information
AppName=Willowmere
AppVersion=1.0.0
AppPublisher=jacqueb
AppPublisherURL=https://github.com/jacqueb
AppSupportURL=https://github.com/jacqueb/willowmere
AppUpdatesURL=https://github.com/jacqueb/willowmere
DefaultDirName={autopf}\jacqueb\Willowmere
DefaultGroupName=Willowmere
AllowNoIcons=yes
LicenseFile=LICENSE
OutputDir=dist
OutputBaseFilename=Willowmere-Setup-v1.0.0
SetupIconFile=src\assets\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

; Privileges - install for all users by default
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Uninstall
UninstallDisplayIcon={app}\Willowmere.exe
UninstallDisplayName=Willowmere

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1
Name: "associatefiles"; Description: "Associate .willowmere save files"; GroupDescription: "File associations"

[Files]
; Game files
Source: "nwjs\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "main.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "style.css"; DestDir: "{app}"; Flags: ignoreversion
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "tilemap.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "objectmap.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "npcs.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "dialogue.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion; DestName: "LICENSE.txt"

; Documentation for modders
Source: "docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: DirExists(ExpandConstant('{srcexe}\..\docs'))

[Icons]
; Start menu shortcuts
Name: "{group}\Willowmere"; Filename: "{app}\Willowmere.exe"; WorkingDir: "{app}"; IconFilename: "{app}\Willowmere.exe"
Name: "{group}\Modding Documentation"; Filename: "{app}\README.md"; WorkingDir: "{app}"
Name: "{group}\Game Files"; Filename: "{app}"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,Willowmere}"; Filename: "{uninstallexe}"

; Desktop shortcut (optional)
Name: "{autodesktop}\Willowmere"; Filename: "{app}\Willowmere.exe"; WorkingDir: "{app}"; IconFilename: "{app}\Willowmere.exe"; Tasks: desktopicon

; Quick launch shortcut (optional, for older Windows)
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\Willowmere"; Filename: "{app}\Willowmere.exe"; WorkingDir: "{app}"; Tasks: quicklaunchicon

[Registry]
; File associations for save files (optional)
Root: HKCR; Subkey: ".willowmere"; ValueType: string; ValueName: ""; ValueData: "WillowmereSaveFile"; Flags: uninsdeletevalue; Tasks: associatefiles
Root: HKCR; Subkey: "WillowmereSaveFile"; ValueType: string; ValueName: ""; ValueData: "Willowmere Save File"; Flags: uninsdeletekey; Tasks: associatefiles
Root: HKCR; Subkey: "WillowmereSaveFile\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\Willowmere.exe,0"; Tasks: associatefiles
Root: HKCR; Subkey: "WillowmereSaveFile\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\Willowmere.exe"" ""%1"""; Tasks: associatefiles

[Run]
; Option to launch after installation
Filename: "{app}\Willowmere.exe"; Description: "{cm:LaunchProgram,Willowmere}"; Flags: nowait postinstall skipifsilent

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Rename nw.exe to Willowmere.exe
    if FileExists(ExpandConstant('{app}\nw.exe')) then
    begin
      RenameFile(ExpandConstant('{app}\nw.exe'), ExpandConstant('{app}\Willowmere.exe'));
    end;
    
    // Create a modding info file
    SaveStringToFile(ExpandConstant('{app}\MODDING.txt'), 
      'Willowmere - Modding Information' + #13#10 + #13#10 +
      'This game is designed to be easily moddable!' + #13#10 + #13#10 +
      'Key files you can modify:' + #13#10 +
      '- src/assets/ - All game textures and sprites' + #13#10 +
      '- tilemap.json - Map layout and tile data' + #13#10 +
      '- objectmap.json - Placed objects and buildings' + #13#10 +
      '- npcs.json - NPC data and positions' + #13#10 +
      '- dialogue.json - NPC dialogue' + #13#10 +
      '- src/*.js - Game logic and mechanics' + #13#10 + #13#10 +
      'To run your modded game:' + #13#10 +
      '1. Make your changes to the files above' + #13#10 +
      '2. Run Willowmere.exe' + #13#10 + #13#10 +
      'For more information, see README.md' + #13#10 +
      'Happy modding!' + #13#10,
      False);
  end;
end;

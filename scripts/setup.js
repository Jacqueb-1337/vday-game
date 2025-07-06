const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// NW.js version to download (you can update this as needed)
const NWJS_VERSION = 'v0.82.0';

// Platform detection
const platform = process.platform;
const arch = process.arch;

// NW.js download URLs and filenames
const getNWJSInfo = (isDev = false) => {
    const flavor = isDev ? 'sdk' : 'normal';
    let platformString, extension, executable;
    
    switch (platform) {
        case 'win32':
            platformString = arch === 'x64' ? 'win-x64' : 'win-ia32';
            extension = 'zip';
            executable = 'nw.exe';
            break;
        case 'darwin':
            platformString = arch === 'arm64' ? 'osx-arm64' : 'osx-x64';
            extension = 'zip';
            executable = 'nwjs.app/Contents/MacOS/nwjs';
            break;
        case 'linux':
            platformString = arch === 'x64' ? 'linux-x64' : 'linux-ia32';
            extension = 'tar.gz';
            executable = 'nw';
            break;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
    
    const filename = `nwjs-${flavor}-${NWJS_VERSION}-${platformString}`;
    const url = `https://dl.nwjs.io/${NWJS_VERSION}/${filename}.${extension}`;
    
    return { url, filename, extension, executable, platformString, flavor };
};

// Progress bar for downloads
const createProgressBar = (total) => {
    let current = 0;
    return {
        update: (chunk) => {
            current += chunk;
            const percent = Math.round((current / total) * 100);
            const filled = Math.round(percent / 2);
            const bar = '█'.repeat(filled) + '░'.repeat(50 - filled);
            process.stdout.write(`\r[${bar}] ${percent}% (${Math.round(current / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB)`);
        },
        complete: () => {
            process.stdout.write('\n');
        }
    };
};

// Download file with progress
const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirects
                return downloadFile(response.headers.location, dest)
                    .then(resolve)
                    .catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            const total = parseInt(response.headers['content-length'], 10);
            const progressBar = createProgressBar(total);
            
            console.log(`Downloading: ${path.basename(dest)}`);
            console.log(`Size: ${Math.round(total / 1024 / 1024)}MB`);
            
            response.on('data', (chunk) => {
                progressBar.update(chunk.length);
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                progressBar.complete();
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(dest, () => {}); // Delete partial file
                reject(err);
            });
        }).on('error', reject);
    });
};

// Extract archive
const extractArchive = async (archivePath, extractPath, filename) => {
    console.log('Extracting NW.js...');
    
    try {
        if (path.extname(archivePath) === '.zip') {
            const extract = require('extract-zip');
            await extract(archivePath, { dir: extractPath });
        } else {
            // For .tar.gz files (Linux)
            execSync(`tar -xzf "${archivePath}" -C "${extractPath}"`, { stdio: 'inherit' });
        }
        
        // Move contents from the extracted folder to nwjs directory
        const extractedFolder = path.join(extractPath, filename);
        if (fs.existsSync(extractedFolder)) {
            const items = fs.readdirSync(extractedFolder);
            for (const item of items) {
                const srcPath = path.join(extractedFolder, item);
                const destPath = path.join(extractPath, item);
                
                if (fs.existsSync(destPath)) {
                    fs.removeSync(destPath);
                }
                
                fs.moveSync(srcPath, destPath);
            }
            
            // Remove the now-empty extracted folder
            fs.removeSync(extractedFolder);
        }
        
        console.log('✅ Extraction complete!');
        
    } catch (error) {
        throw new Error(`Failed to extract archive: ${error.message}`);
    }
};

// Install dependencies
const installDependencies = () => {
    console.log('Installing Node.js dependencies...');
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ Dependencies installed!');
    } catch (error) {
        console.warn('⚠️  Failed to install dependencies. You may need to run "npm install" manually.');
    }
};

// Main setup function
const setup = async () => {
    console.log('🎮 Willowmere Setup\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    let isDev = false;
    
    if (args.includes('--dev') || args.includes('-d')) {
        isDev = true;
    } else if (args.includes('--prod') || args.includes('-p')) {
        isDev = false;
    } else {
        // Interactive prompt
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
            readline.question('Which NW.js version do you want?\n  1) Production (smaller, faster)\n  2) Development (includes DevTools)\nEnter choice (1-2): ', resolve);
        });
        
        readline.close();
        isDev = answer.trim() === '2';
    }
    
    const nwjsInfo = getNWJSInfo(isDev);
    const projectRoot = path.resolve(__dirname, '..');
    const nwjsDir = path.join(projectRoot, 'nwjs');
    const downloadPath = path.join(projectRoot, `${nwjsInfo.filename}.${nwjsInfo.extension}`);
    
    console.log(`\n📦 Setting up NW.js ${nwjsInfo.flavor} ${NWJS_VERSION} for ${nwjsInfo.platformString}`);
    
    try {
        // Clean existing NW.js directory
        if (fs.existsSync(nwjsDir)) {
            console.log('🧹 Cleaning existing NW.js installation...');
            fs.removeSync(nwjsDir);
        }
        
        // Create nwjs directory
        fs.ensureDirSync(nwjsDir);
        
        // Download NW.js
        console.log('⬇️  Downloading NW.js...');
        await downloadFile(nwjsInfo.url, downloadPath);
        
        // Extract
        await extractArchive(downloadPath, nwjsDir, nwjsInfo.filename);
        
        // Clean up download file
        fs.removeSync(downloadPath);
        
        // Make executable (Linux/macOS)
        if (platform !== 'win32') {
            const execPath = path.join(nwjsDir, nwjsInfo.executable);
            if (fs.existsSync(execPath)) {
                fs.chmodSync(execPath, '755');
            }
        }
        
        // Install Node.js dependencies
        installDependencies();
        
        // Create launch scripts
        console.log('📝 Creating launch scripts...');
        
        if (platform === 'win32') {
            // Windows batch file
            const batchContent = `@echo off
cd /d "%~dp0"
nwjs\\nw.exe .
pause`;
            fs.writeFileSync(path.join(projectRoot, 'launch.bat'), batchContent);
            
            // PowerShell script
            const psContent = `Set-Location $PSScriptRoot
.\\nwjs\\nw.exe .`;
            fs.writeFileSync(path.join(projectRoot, 'launch.ps1'), psContent);
        } else {
            // Shell script for Linux/macOS
            const shellContent = `#!/bin/bash
cd "$(dirname "$0")"
./nwjs/${nwjsInfo.executable} .`;
            fs.writeFileSync(path.join(projectRoot, 'launch.sh'), shellContent);
            fs.chmodSync(path.join(projectRoot, 'launch.sh'), '755');
        }
        
        console.log('\n🎉 Setup complete!');
        console.log('\n📖 How to run your game:');
        console.log('   npm start           - Start the game');
        console.log('   npm run dev         - Setup dev version and start');
        console.log('   npm run build       - Setup production version and start');
        
        if (platform === 'win32') {
            console.log('   launch.bat          - Double-click to run (Windows)');
            console.log('   launch.ps1          - PowerShell script');
        } else {
            console.log('   ./launch.sh         - Shell script');
        }
        
        console.log(`\n🔧 NW.js ${isDev ? 'Development' : 'Production'} version installed`);
        console.log(`📁 Location: ${nwjsDir}`);
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run setup
if (require.main === module) {
    setup();
}

module.exports = { setup, getNWJSInfo };

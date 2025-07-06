const fs = require('fs-extra');
const path = require('path');

const clean = () => {
    console.log('🧹 Cleaning NW.js installation...');
    
    const projectRoot = path.resolve(__dirname, '..');
    const nwjsDir = path.join(projectRoot, 'nwjs');
    
    try {
        if (fs.existsSync(nwjsDir)) {
            fs.removeSync(nwjsDir);
            console.log('✅ NW.js directory removed');
        } else {
            console.log('ℹ️  NW.js directory not found');
        }
        
        // Remove launch scripts
        const scripts = ['launch.bat', 'launch.ps1', 'launch.sh'];
        scripts.forEach(script => {
            const scriptPath = path.join(projectRoot, script);
            if (fs.existsSync(scriptPath)) {
                fs.removeSync(scriptPath);
                console.log(`✅ Removed ${script}`);
            }
        });
        
        console.log('🎉 Cleanup complete!');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    }
};

if (require.main === module) {
    clean();
}

module.exports = { clean };

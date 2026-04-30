const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, filesList);
        } else if (fullPath.endsWith('.js')) {
            filesList.push(fullPath);
        }
    }
    return filesList;
}

const srcDir = path.join(__dirname, 'src');
const files = getFiles(srcDir);
let data = '';

for (const file of files) {
    data += fs.readFileSync(file, 'utf8') + '\n';
}

const outDir = path.join(__dirname, 'www');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'fsm.js');
fs.writeFileSync(outPath, data, 'utf8');

console.log(`built ${outPath} (${data.length} bytes)`);

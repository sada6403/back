const fs = require('fs');
const path = require('path');

const filename = process.argv[2] || 'query_results_v2.txt';
const filePath = path.resolve(__dirname, '..', filename);

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    const buffer = fs.readFileSync(filePath);
    let content = '';
    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] !== 0) {
            content += String.fromCharCode(buffer[i]);
        }
    }
    process.stdout.write(content);
} catch (err) {
    console.error(err);
}

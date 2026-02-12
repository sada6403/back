const fs = require('fs');
const path = require('path');

const files = ['debug_data_out.txt', 'query_results_v2.txt', 'query_results_v2_utf8.txt'];
const targetRegex = /FV-KA-\d{3}/;

files.forEach(file => {
    const filePath = path.resolve(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`\n--- Scanning ${file} ---`);
        try {
            const content = fs.readFileSync(filePath, 'utf8'); // Try utf8 first
            const lines = content.split(/\r?\n/);
            lines.forEach((line, index) => {
                if (targetRegex.test(line)) {
                    console.log(`Line ${index + 1}: ${line.trim()}`);
                    // Print a bit of context if needed (next few lines?)
                    for (let i = 1; i <= 3; i++) {
                        if (lines[index + i]) console.log(`  +${i}: ${lines[index + i].trim()}`);
                    }
                }
            });
        } catch (err) {
            console.log(`Error reading ${file} as utf8, trying binary/latin1...`);
            // If utf8 fails or file is messy, try reading differently or just skip
        }
    } else {
        console.log(`File ${file} not found.`);
    }
});

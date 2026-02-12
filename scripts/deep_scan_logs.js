const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../query_results_v2.txt');

try {
    const buffer = fs.readFileSync(filePath);
    let content = '';
    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] !== 0) {
            content += String.fromCharCode(buffer[i]);
        }
    }

    // Split by common separators if it looks like a dump
    // Often these logs are from a console.log(JSON.stringify(..., null, 2)) or similar

    console.log('--- Deep Scan Results ---');

    // Search for Members
    if (content.includes('members')) {
        console.log('Found "members" keyword.');
    }

    // Look for lines that look like NIC or Phone patterns
    // NIC: 199...V or 12 digits
    // Phone: 07...
    const lines = content.split(/\r?\n/);

    // Collect "blocks" of data. Sometimes data is logged as objects { ... }
    let captureBlock = false;
    let currentBlock = [];

    lines.forEach(line => {
        const cleanLine = line.trim();

        // Pattern detection for Members or FVs
        if (cleanLine.includes('memberCode') || cleanLine.includes('NIC') || cleanLine.includes('Phone:')) {
            console.log('Potential Data Line:', cleanLine);
        }

        // Try to identify JSON blocks
        if (cleanLine === '{') {
            captureBlock = true;
            currentBlock = ['{'];
        } else if (captureBlock) {
            currentBlock.push(cleanLine);
            if (cleanLine === '}' || cleanLine === '},') {
                const blockStr = currentBlock.join('\n');
                if (blockStr.includes('KA-') || blockStr.includes('Karachchi')) {
                    console.log('\n--- FOUND BLOCK ---');
                    console.log(blockStr);
                }
                captureBlock = false;
            }
        }
    });

} catch (err) {
    console.error(err);
}

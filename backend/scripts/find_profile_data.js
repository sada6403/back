const fs = require('fs');
const path = require('path');

const logPath = 'c:\\Projects\\Management_IT\\backend\\user_check_utf8.txt';
const namesToFind = [
    'Dalindan', 'Saliny',
    'Rathika', 'Perampalarasan',
    'kalaivany', 'Sasikaran',
    'Sasikala', 'Sunmugaraja',
    'Abiramy', 'Yokesvaran',
    'Sivasri', 'Vadivel',
    'Tharsiny', 'Raveenthirakumar',
    'Sakila', 'Thevalingam',
    'Thabojini', 'Jeevananthan',
    'Nishanthini', 'Sivatharsan',
    'Pakeerathy', 'Elangeswaran'
];

async function findData() {
    try {
        if (!fs.existsSync(logPath)) {
            console.log('Log file not found:', logPath);
            return;
        }

        const content = fs.readFileSync(logPath, 'utf8');
        // The file seems to have "User found: { ... }" blocks
        const blocks = content.split('User found:');
        console.log(`Analyzing ${blocks.length} data blocks...`);

        const matches = [];

        for (const block of blocks) {
            if (!block.trim()) continue;

            const lowerBlock = block.toLowerCase();
            const hasMatch = namesToFind.some(name => lowerBlock.includes(name.toLowerCase()));

            if (hasMatch) {
                // Try to parse JSON
                const jsonStart = block.indexOf('{');
                const jsonEnd = block.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    try {
                        const jsonStr = block.substring(jsonStart, jsonEnd + 1);
                        const obj = JSON.parse(jsonStr);
                        matches.push(obj);
                    } catch (e) {
                        // If parsing fails, just store the raw block
                        matches.push({ raw: block.trim() });
                    }
                } else {
                    matches.push({ raw: block.trim() });
                }
            }
        }

        console.log(`Found ${matches.length} potential matches.`);
        fs.writeFileSync('c:\\Projects\\Management_IT\\backend\\found_profiles.json', JSON.stringify(matches, null, 2));
        console.log('Results saved to found_profiles.json');

    } catch (err) {
        console.error('Error:', err);
    }
}

findData();

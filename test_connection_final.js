const http = require('http');

function get(url) {
    return new Promise((resolve) => {
        console.log(`Testing ${url}...`);
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    // console.log('Response:', JSON.stringify(json, null, 2).substring(0, 200) + '...');
                    if (json.success && json.data) {
                        console.log(`✅ Success! Found ${json.data.length} records.`);
                    } else {
                        console.log('⚠️ Response received but unexpected format:', data.substring(0, 100));
                    }
                } catch (e) {
                    console.log('Raw body:', data);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`❌ Error: ${e.message}`);
            resolve();
        });
    });
}

async function test() {
    await get('http://127.0.0.1:3001/api/members');
    await get('http://127.0.0.1:3001/api/employees');
}

test();

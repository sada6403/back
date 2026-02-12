const http = require('http');

function get(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3001/api${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    // Try to parse to pretty print, or just return text
                    const json = JSON.parse(data);
                    console.log(`\n--- GET ${path} (${res.statusCode}) ---`);
                    // Print only summary or first item to avoid massive logs
                    if (json.data && Array.isArray(json.data)) {
                        console.log(`Success: ${json.success}`);
                        console.log(`Count: ${json.count || json.data.length}`);
                        console.log('Sample Item:', JSON.stringify(json.data[0], null, 2));
                    } else if (Array.isArray(json)) {
                        console.log(`Is Array: Yes`);
                        console.log(`Length: ${json.length}`);
                        console.log('Sample Item:', JSON.stringify(json[0], null, 2));
                    } else {
                        console.log(JSON.stringify(json, null, 2));
                    }
                    resolve();
                } catch (e) {
                    console.log(`\n--- GET ${path} (${res.statusCode}) ---`);
                    console.log('Raw Body:', data);
                    resolve();
                }
            });
        }).on('error', err => {
            console.log(`\n--- GET ${path} FAILED ---`);
            console.error(err.message);
            resolve();
        });
    });
}

async function test() {
    await get('/members');
    await get('/employees'); // or /users depending on route
}

test();

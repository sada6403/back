const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/transactions',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log('Response Structure:', Object.keys(json));
            if (json.data && Array.isArray(json.data)) {
                console.log('Transaction Count:', json.data.length);
                if (json.data.length > 0) {
                    console.log('First Transaction Sample:', JSON.stringify(json.data[0], null, 2));
                }
            } else {
                console.log('Data is not an array:', json);
            }
        } catch (e) {
            console.log('Raw Body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();

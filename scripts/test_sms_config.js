const https = require('https');

// Credentials provided by user
const USERNAME = 'esmsusr_rzpdQuR3';
const PASSWORD = 'Jk8qBwGf';
const SENDER_ID = 'NF_FARMING'; // Or 'Mobitel'
const TEST_MOBILE = '0776518765'; // Using a placeholder 077 number as a safe test

// Common Mobitel Endpoints
const ENDPOINTS = [
    {
        name: 'BulkSMS_v2 (SOAP/GET)',
        url: 'https://msmsenterprise.mobitel.lk/BulkSMS/BulkSMS_v2.asmx/SendBulk',
        method: 'GET',
        params: {
            user: USERNAME,
            password: PASSWORD,
            sender: SENDER_ID,
            mobile: TEST_MOBILE,
            message: 'Test SMS from NF Farming System'
        }
    },
    {
        name: 'Legacy HTTP API',
        url: 'https://msmsenterprise.mobitel.lk/BlueSMS/BlueSMS_v2.asmx/SendBulk',
        method: 'GET',
        params: {
            username: USERNAME,
            password: PASSWORD,
            sender: SENDER_ID,
            mobile: TEST_MOBILE,
            message: 'Test SMS from NF Farming System'
        }
    }
];

const makeRequest = (endpoint) => {
    return new Promise((resolve, reject) => {
        let fullUrl = endpoint.url;

        if (endpoint.method === 'GET' && endpoint.params) {
            const query = new URLSearchParams(endpoint.params).toString();
            fullUrl += `?${query}`;
        }

        const options = {
            method: endpoint.method,
            headers: {}
        };

        if (endpoint.method === 'POST') {
            options.headers['Content-Type'] = 'application/json';
        }

        console.log(`\nTesting: ${endpoint.name}`);
        console.log(`URL: ${fullUrl}`);

        const req = https.request(fullUrl, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: body
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (endpoint.method === 'POST' && endpoint.data) {
            req.write(JSON.stringify(endpoint.data));
        }

        req.end();
    });
};

const testConnectivity = async () => {
    console.log('--- Testing Mobitel SMS API Connectivity (Native HTTPS) ---');
    console.log(`User: ${USERNAME}`);

    for (const endpoint of ENDPOINTS) {
        try {
            const response = await makeRequest(endpoint);
            console.log(`Status: ${response.status}`);
            console.log('Response Body:', response.body);

            // Check for success indicators
            if (response.status === 200 && !response.body.includes('Authentication Failed') && !response.body.includes('Error')) {
                console.log(`✅ POTENTIAL SUCCESS on ${endpoint.name}`);
            } else if (response.status === 200 && response.body.includes('alias not found')) {
                console.log(`⚠️ AUTH OK, ALIAS ERROR on ${endpoint.name} (This means credentials satisfy the gateway, just need correct SenderID)`);
            } else {
                console.log(`❌ FAILURE on ${endpoint.name}`);
            }

        } catch (error) {
            console.error(`❌ ERROR on ${endpoint.name}:`, error.message);
        }
    }
};

testConnectivity();

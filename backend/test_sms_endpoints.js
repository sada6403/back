const https = require('https');

const endpoints = [
    '/http_api.php',
    '/http_api',
    '/sendsms.php',
    '/sendsms',
    '/send_sms.php',
    '/send_sms',
    '/api/sendsms',
    '/api/send_sms',
    '/bulksms/sendsms',
    '/bulksms/send_sms',
    '/api/v1/message',
    '/connect/api',
    '/sms/send',
    '/push_api.php'
];

const domain = 'msmsenterprise.mobitel.lk';

const checkEndpoint = (path) => {
    return new Promise((resolve) => {
        const options = {
            hostname: domain,
            path: path,
            method: 'GET',
            timeout: 5000
        };

        const req = https.request(options, (res) => {
            console.log(`[${res.statusCode}] https://${domain}${path}`);
            if (res.statusCode !== 404) {
                console.log(`   >>> POTENTIAL MATCH! Status: ${res.statusCode}`);
            }
            res.resume(); // Consume response to free memory
            res.on('end', () => resolve());
        });

        req.on('error', (e) => {
            console.error(`[ERR] ${path} : ${e.message}`);
            resolve();
        });

        req.on('timeout', () => {
            console.error(`[TIMEOUT] ${path}`);
            req.destroy();
            resolve();
        });

        req.end();
    });
};

const run = async () => {
    console.log(`Probing Mobitel Endpoints on ${domain}...`);
    for (const path of endpoints) {
        await checkEndpoint(path);
    }
};

run();

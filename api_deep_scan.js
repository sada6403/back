const axios = require('axios');
require('dotenv').config();

const USERNAME = process.env.MOBITEL_USER || 'esmsusr_rzpdQuR3';
const PASSWORD = process.env.MOBITEL_PASSWORD || 'Jk8qBwGf';
const ALIAS = process.env.MOBITEL_SENDER_ID || 'NF Groups';

const PATHS = [
    '/index.php/api/send_sms',
    '/index.php/api/send',
    '/index.php/api/message',
    '/index.php/api/sms',
    '/index.php/api/bulk_send',
    '/api/send_sms',
    '/api/send',
    '/api/message'
];

const HOSTS = [
    'http://msmsenterprise.mobitel.lk',
    'https://msmsenterprise.mobitel.lk',
    'http://esms.mobitel.lk'
];

async function scan() {
    console.log('--- Deep API Scan ---');
    for (const host of HOSTS) {
        for (const path of PATHS) {
            const url = host + path;
            console.log(`Checking: ${url}`);
            try {
                const res = await axios.get(url, {
                    params: { username: USERNAME, password: PASSWORD, alias: ALIAS, message: 'Test', recipients: '94770000000' },
                    timeout: 4000
                });
                console.log(`[FOUND!] ${url} - Status: ${res.status}`);
                console.log('Response:', JSON.stringify(res.data).substring(0, 200));
            } catch (e) {
                if (e.response && e.response.status !== 404) {
                    console.log(`[LOG] ${url} - Status: ${e.response.status} (Not 404!)`);
                }
            }
        }
    }
}

scan();

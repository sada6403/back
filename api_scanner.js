const axios = require('axios');
require('dotenv').config();

const USERNAME = process.env.MOBITEL_USER || 'esmsusr_rzpdQuR3';
const PASSWORD = process.env.MOBITEL_PASSWORD || 'Jk8qBwGf';
const ALIAS = process.env.MOBITEL_SENDER_ID || 'NF Groups';
const TEST_NUMBER = '94779836365';
const MESSAGE = 'REST API Test - Please ignore';

const ENDPOINTS = [
    'http://msmsenterprise.mobitel.lk/index.php/api/send_sms',
    'https://msmsenterprise.mobitel.lk/index.php/api/send_sms',
    'http://msmsenterprise.mobitel.lk/api/send_sms',
    'http://202.124.63.109/index.php/api/send_sms',
    'http://esms.mobitel.lk/api/send_sms',
    'https://esms.mobitel.lk/api/send_sms'
];

async function scanEndpoints() {
    console.log('--- Mobitel REST API Discovery ---');
    console.log(`User: ${USERNAME} | Alias: ${ALIAS}`);

    for (const url of ENDPOINTS) {
        console.log(`\n[Test] Target: ${url}`);

        try {
            // Try POST with params
            const params = new URLSearchParams();
            params.append('username', USERNAME);
            params.append('password', PASSWORD);
            params.append('alias', ALIAS);
            params.append('message', MESSAGE);
            params.append('recipients', TEST_NUMBER);

            const response = await axios.post(url, params, {
                timeout: 5000,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            console.log(`[PASS] Success! Status: ${response.status}`);
            console.log('Data:', response.data);
            process.exit(0);
        } catch (error) {
            if (error.response) {
                console.log(`[FAIL] Status: ${error.response.status} | Data: ${JSON.stringify(error.response.data)}`);
            } else {
                console.log(`[FAIL] Error: ${error.message}`);
            }
        }

        try {
            // Try GET with params
            const getUrl = `${url}?username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}&alias=${encodeURIComponent(ALIAS)}&message=${encodeURIComponent(MESSAGE)}&recipients=${encodeURIComponent(TEST_NUMBER)}`;
            const response = await axios.get(getUrl, { timeout: 5000 });
            console.log(`[PASS] Success (GET)! Status: ${response.status}`);
            console.log('Data:', response.data);
            process.exit(0);
        } catch (error) {
            // silent fail for GET if POST already failed/logged
        }
    }
    console.log('\n--- Discovery Finished: No working REST endpoint found ---');
}

scanEndpoints();

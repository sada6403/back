const axios = require('axios');
const fs = require('fs');

const CANDIDATES = [
    'https://msmsent.mobitel.lk/BulkSMS_v2/SendBulk',
    'https://msmsent.mobitel.lk/BulkSMS/BulkSMS_v2/SendBulk',
    'https://msmsenterprise.mobitel.lk/BulkSMS_v2/SendBulk',
    'https://msmsent.mobitel.lk/BulkSMS/SendBulk',
    'https://msmsenterprise.mobitel.lk/api/send'
];

async function check(url) {
    console.log(`Testing ${url}...`);
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            validateStatus: () => true,
            timeout: 5000
        });
        console.log(`Status: ${res.status}`);
        if (res.status !== 404) {
            console.log('FOUND SOMETHING!');
            console.log(res.data.substring(0, 200));
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

async function run() {
    for (const u of CANDIDATES) {
        await check(u);
    }
}
run();

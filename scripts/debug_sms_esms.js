const axios = require('axios');

// Paths to test (Mix of SOAP and REST styles, without .asmx)
const URLS = [
    'https://msmsent.mobitel.lk/BulkSMS_v2/SendBulk',
    'https://msmsent.mobitel.lk/BulkSMS/SendBulk',
    'https://msmsent.mobitel.lk/esms/SendBulk',
    'https://msmsent.mobitel.lk/BulkSMS/BulkSMS_v2',
    'http://msmsent.mobitel.lk/BulkSMS_v2/SendBulk'
];

const PARAMS = {
    user: 'esmsusr_rzpdQuR3',
    password: 'Jk8qBwGf',
    sender: 'NF_FARMING',
    mobile: '0776518765',
    message: 'Test ESMS'
};

async function test() {
    console.log('--- Testing ESMS Paths ---');
    for (const url of URLS) {
        try {
            console.log(`Testing: ${url}`);
            const res = await axios.get(url, {
                params: PARAMS,
                timeout: 5000,
                validateStatus: () => true
            });
            console.log(`  -> Status: ${res.status}`);
            if (res.status === 200) {
                console.log('  -> RESPONSE:', res.data);
            }
        } catch (e) {
            console.log(`  -> Error: ${e.message}`);
        }
    }
}

test();

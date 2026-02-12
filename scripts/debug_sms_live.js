const https = require('https');
const fs = require('fs');

const LOG_FILE = 'debug_sms_result.txt';
const URL_TARGET = 'https://msmsent.mobitel.lk/BulkSMS/BulkSMS_v2.asmx/SendBulk';
// const URL_TARGET = 'https://msmsenterprise.mobitel.lk/BulkSMS/BulkSMS_v2.asmx/SendBulk'; // Alternate

const USER = 'esmsusr_rzpdQuR3';
const PASS = 'Jk8qBwGf';
const SENDER = 'NF_FARMING';
const MOBILE = '0776518765';
const MESSAGE = 'Debug WAF Test';

const params = new URLSearchParams({
    user: USER,
    password: PASS,
    sender: SENDER,
    mobile: MOBILE,
    message: MESSAGE
});

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function checkWaf() {
    fs.appendFileSync(LOG_FILE, '\n--- ROUND 5: WAF HEADERS ---\n');
    log(`Testing with Headers: ${URL_TARGET}`);

    const fullUrl = `${URL_TARGET}?${params.toString()}`;

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive'
        }
    };

    https.get(fullUrl, options, (res) => {
        log(`  -> Status: ${res.statusCode}`);
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            log(`  -> Response Preview: ${data.substring(0, 300).replace(/\n/g, ' ')}`);
        });
    }).on('error', (e) => {
        log(`  -> Error: ${e.message}`);
    });
}

checkWaf();

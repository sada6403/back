const https = require('https');
const fs = require('fs');
const querystring = require('querystring');

const LOG_FILE = 'debug_sms_result.txt';
// Trying POST to the msmsent endpoint
const URL_TARGET = 'https://msmsent.mobitel.lk/BulkSMS/BulkSMS_v2.asmx/SendBulk';

const USER = 'esmsusr_rzpdQuR3';
const PASS = 'Jk8qBwGf';
const SENDER = 'NF_FARMING';
const MOBILE = '0776518765';
const MESSAGE = 'Debug POST Test';

const postData = querystring.stringify({
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

async function checkPost() {
    fs.appendFileSync(LOG_FILE, '\n--- ROUND 6: POST CHECK ---\n');
    log(`Testing POST: ${URL_TARGET}`);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    const req = https.request(URL_TARGET, options, (res) => {
        log(`  -> Status: ${res.statusCode}`);
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            log(`  -> Response Preview: ${data.substring(0, 300).replace(/\n/g, ' ')}`);
        });
    });

    req.on('error', (e) => {
        log(`  -> Error: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

checkPost();

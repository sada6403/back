const https = require('https');
const fs = require('fs');

const LOG_FILE = 'debug_sms_result.txt';
// The WSDL path implies the service is at .asmx
const HOST = 'msmsent.mobitel.lk';
const PATH = '/BulkSMS/BulkSMS_v2.asmx';
const URL_TARGET = `https://${HOST}${PATH}`;

const USER = 'esmsusr_rzpdQuR3';
const PASS = 'Jk8qBwGf';
const SENDER = 'NF_FARMING';
const MOBILE = '0776518765';
const MESSAGE = 'Debug SOAP Test';

// SOAP 1.2 Envelope
const SOAP_BODY = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <SendBulk xmlns="http://tempuri.org/">
      <user>${USER}</user>
      <password>${PASS}</password>
      <sender>${SENDER}</sender>
      <mobile>${MOBILE}</mobile>
      <message>${MESSAGE}</message>
    </SendBulk>
  </soap12:Body>
</soap12:Envelope>`;

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function checkSoap() {
    fs.appendFileSync(LOG_FILE, '\n--- ROUND 7: SOAP CHECK ---\n');
    log(`Testing SOAP: ${URL_TARGET}`);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'Content-Length': Buffer.byteLength(SOAP_BODY),
            'Host': HOST,
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

    req.write(SOAP_BODY);
    req.end();
}

checkSoap();

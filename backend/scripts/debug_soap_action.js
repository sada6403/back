const https = require('https');
const fs = require('fs');

const LOG_FILE = 'debug_sms_result.txt';
const HOST = 'msmsent.mobitel.lk';
const PATH = '/BulkSMS/BulkSMS_v2.asmx';
const URL_TARGET = `https://${HOST}${PATH}`;

const USER = 'esmsusr_rzpdQuR3';
const PASS = 'Jk8qBwGf';
const SENDER = 'NF_FARMING';
const MOBILE = '0776518765';
const MESSAGE = 'Debug SOAPAction Test';

const SOAP_BODY = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SendBulk xmlns="http://tempuri.org/">
      <user>${USER}</user>
      <password>${PASS}</password>
      <sender>${SENDER}</sender>
      <mobile>${MOBILE}</mobile>
      <message>${MESSAGE}</message>
    </SendBulk>
  </soap:Body>
</soap:Envelope>`;

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function checkSoapAction() {
    fs.appendFileSync(LOG_FILE, '\n--- ROUND 9: SOAP ACTION ---\n');
    log(`Testing SOAP Action: ${URL_TARGET}`);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8', // SOAP 1.1 content type
            'Content-Length': Buffer.byteLength(SOAP_BODY),
            'Host': HOST,
            'SOAPAction': '"http://tempuri.org/SendBulk"', // Critical Header
            'User-Agent': 'Mozilla/5.0'
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

checkSoapAction();

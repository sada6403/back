const https = require('https');
const http = require('http');
const fs = require('fs');

const LOG_FILE = 'debug_sms_result.txt';
// User's domain
const HOST = 'msmsenterprise.mobitel.lk';

const PATHS = [
    '/http/index.php',
    '/http/send-message',
    '/api/send_sms',
    '/BulkSMS/BulkSMS_v2.asmx', // Just in case
    '/index.php/api/send',
    '/services/api'
];

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function checkPath(path) {
    const url = `https://${HOST}${path}`;
    return new Promise((resolve) => {
        log(`Testing: ${url}`);
        const req = https.get(url, (res) => {
            log(`  -> Status: ${res.statusCode}`);
            resolve();
        });
        req.on('error', (e) => {
            log(`  -> Error: ${e.message}`);
            resolve();
        });
    });
}

// Also check msmsent just in case
async function checkPathEnt(path) {
    const url = `https://msmsent.mobitel.lk${path}`;
    return new Promise((resolve) => {
        log(`Testing (ent): ${url}`);
        const req = https.get(url, (res) => {
            log(`  -> Status: ${res.statusCode}`);
            resolve();
        });
        req.on('error', (e) => {
            log(`  -> Error: ${e.message}`);
            resolve();
        });
    });
}

async function run() {
    fs.appendFileSync(LOG_FILE, '\n--- ROUND 8: PORTAL PATHS ---\n');
    for (const p of PATHS) {
        await checkPath(p);
    }
    for (const p of PATHS) {
        await checkPathEnt(p);
    }
}

run();

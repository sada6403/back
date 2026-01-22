const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/members',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // We need a token? The endpoint is likely protected.
    }
};

// Wait, the endpoint IS protected. I need a token.
// I can login first? Or I can just bypass auth in code for a second?
// Bypassing auth is risky if I leave it.
// Better: Simulating the controller function directly in a script without HTTP server overhead, 
// OR generating a valid token if I have the secret.
// I have the secret in .env !

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const secret = process.env.JWT_SECRET || 'nf_farming_secure_jwt_secret_key_2023_!@#';
const token = jwt.sign({ id: 'debug_id', role: 'manager', branchId: 'debug_branch' }, secret, { expiresIn: '1h' });

const req = http.request({ ...options, headers: { 'Authorization': `Bearer ${token}` } }, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.success && json.data) {
                const ram = json.data.find(m => m.name === 'ram');
                const sabi = json.data.find(m => m.name === 'Sabi');

                console.log('--- API RESPONSE CHECK ---');
                if (sabi) {
                    console.log('Member: Sabi');
                    console.log('FV Name:', sabi.fieldVisitorName);
                    console.log('FV ID:', sabi.fieldVisitorId);
                } else { console.log('Sabi not found in API response'); }

                if (ram) {
                    console.log('Member: ram');
                    console.log('FV Name:', ram.fieldVisitorName);
                    console.log('FV ID:', ram.fieldVisitorId);
                }
            } else {
                console.log('API Error:', json);
            }
        } catch (e) { console.log('Parse Error:', e); console.log(data); }
    });
});

req.on('error', error => {
    console.error('Request Error:', error);
});

req.end();

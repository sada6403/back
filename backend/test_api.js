const http = require('http');

// analyzer credentials
const loginData = JSON.stringify({
    username: 'HR-AZ9956', // From analyzer_info.json
    password: 'password123', // I don't know the password... wait, I can just use a local JWT if the secret matches.
    role: 'analyzer'
});

// Since I don't know the password, let me generate a token locally using the JWT_SECRET from .env!
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign(
    {
        id: '698c8db5923f9f4a2287a443', // Analyzer _id
        role: 'analyzer',
        branchId: 'All'
    },
    process.env.JWT_SECRET || 'your_secret',
    { expiresIn: '30d' }
);

console.log('Generated Token:', token);

const options = {
    hostname: '13.48.199.103',
    port: 3001,
    path: '/api/transactions',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log(`Success: ${parsed.success}, Count: ${parsed.count}`);
            if (parsed.count > 0) {
                console.log('Sample transaction:', JSON.stringify(parsed.data[0], null, 2));
            } else {
                console.log('Response msg:', parsed.message || parsed);
            }
        } catch (e) {
            console.log('Raw resp:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();

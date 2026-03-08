const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'your_secret';

const tokenAnalyzer = jwt.sign(
    { id: '698c8db5923f9f4a2287a443', role: 'analyzer', branchId: 'All' },
    secret, { expiresIn: '30d' }
);

const options = {
    hostname: '13.48.199.103',
    port: 3001,
    path: '/api/transactions',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer ' + tokenAnalyzer,
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        fs.writeFileSync('analyzer_response.json', data, 'utf8');
        console.log(`Saved response to analyzer_response.json. Status: ${res.statusCode}`);
    });
});
req.end();

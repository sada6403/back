const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'your_secret';

const tokenAnalyzer = jwt.sign(
    { id: '698c8db5923f9f4a2287a443', role: 'analyzer', branchId: 'All' },
    secret, { expiresIn: '30d' }
);

const tokenITSector = jwt.sign(
    { id: 'some_it_guy_id', role: 'it_sector', branchId: 'All' },
    secret, { expiresIn: '30d' }
);

const makeReq = (token, roleName) => {
    return new Promise((resolve) => {
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
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                console.log(`${roleName} Status: ${res.statusCode}`);
                console.log(`${roleName} Response: ${data.substring(0, 200)}...\n`);
                resolve();
            });
        });
        req.end();
    });
};

(async () => {
    await makeReq(tokenAnalyzer, 'ANALYZER');
    await makeReq(tokenITSector, 'IT_SECTOR');
})();

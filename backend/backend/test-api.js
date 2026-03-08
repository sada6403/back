const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
    try {
        const baseUrl = 'http://13.48.199.103:3001/api';
        const secret = process.env.JWT_SECRET;

        // Generate token for the it_sector user seen in logs
        const payload = {
            id: '69700020230737cf13fcea90a',
            role: 'it_sector',
            branchId: 'HO-001'
        };

        const token = jwt.sign(payload, secret, { expiresIn: '1h' });
        console.log('Token generated.');

        // 2. Fetch members
        console.log('Fetching members...');
        const start = Date.now();
        const membersRes = await axios.get(`${baseUrl}/members`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const end = Date.now();

        console.log(`Success! Fetched ${membersRes.data.count} members in ${end - start}ms`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
        process.exit(1);
    }
}

test();

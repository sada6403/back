const axios = require('axios');

const API_URL = 'http://localhost:3000/api/members';

async function test() {
    try {
        console.log('Fetching members...');
        const res = await axios.get(API_URL);

        // Find Sabi
        const member = res.data.data.find(m => m.name.includes('Sabi') || m.full_name.includes('Sabi'));

        if (member) {
            console.log('--- FOUND MEMBER: Sabi ---');
            console.log('keys:', Object.keys(member));
            console.log('registrationData:', JSON.stringify(member.registrationData, null, 2));
        } else {
            console.log('Member Sabi not found.');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

test();

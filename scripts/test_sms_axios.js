const { sendSMS } = require('../utils/smsService');

async function test() {
    try {
        console.log('Testing Axios SMS...');
        const res = await sendSMS('0776518765', 'Axios Test Message');
        console.log('Result:', res);
    } catch (e) {
        console.error('Test Failed:', e.message);
    }
}

test();

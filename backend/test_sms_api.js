const { sendBulk } = require('./utils/smsService');
require('dotenv').config();

async function testSMS() {
    const testNumber = '0779836365';
    const message = 'Test message from Management System via Automated Browser (Mobitel eSMS).';

    console.log('--- SMS API Diagnostic ---');
    console.log('Target Number:', testNumber);
    console.log('Message:', message);

    try {
        const result = await sendBulk([testNumber], message);
        console.log('\n--- Result ---');
        console.log(JSON.stringify(result, null, 2));

        if (result.success > 0) {
            console.log('\nSUCCESS: Message processed for sending.');
        } else {
            console.log('\nFAILED: Check logs for details.');
        }
    } catch (e) {
        console.error('\nERROR:', e.message);
    }
}

testSMS();

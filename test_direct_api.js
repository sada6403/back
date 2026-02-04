const { sendMobitelBulk } = require('./utils/mobitelApiService');

async function testOfficialApi() {
    console.log('--- Official Mobitel API Diagnostic (Zero OTP) ---');

    const testNumber = '94779836365'; // Your number for testing
    const message = 'Official Mobitel REST API Test - No OTP required! - Management IT';

    try {
        const result = await sendMobitelBulk([testNumber], message);
        console.log('\nFinal Result:', JSON.stringify(result, null, 2));

        if (result.success > 0) {
            console.log('\n[SUCCESS] Message sent directly without OTP/Browser!');
        } else {
            console.log('\n[FAILURE] API call failed. Check credentials/URL.');
        }
    } catch (err) {
        console.error('\n[CRITICAL ERROR]', err.message);
    }
}

testOfficialApi();

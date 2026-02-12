require('dotenv').config();
const { sendSMS } = require('../utils/smsService');

const verifyConfig = async () => {
    console.log('--- Mobitel Configuration Verification ---');
    console.log('Checking environment variables...');

    const user = process.env.MOBITEL_USER;
    const pass = process.env.MOBITEL_PASSWORD;
    const sender = process.env.MOBITEL_SENDER_ID;

    if (!user) console.error('❌ MOBITEL_USER is missing in .env');
    else console.log('✅ MOBITEL_USER is set');

    if (!pass) console.error('❌ MOBITEL_PASSWORD is missing in .env');
    else console.log('✅ MOBITEL_PASSWORD is set');

    if (!sender) console.log('⚠️ MOBITEL_SENDER_ID is missing (using default "Mobitel")');
    else console.log(`✅ MOBITEL_SENDER_ID is set to "${sender}"`);

    if (!user || !pass) {
        console.error('\nPlease add these to your .env file:');
        console.error('MOBITEL_USER=your_user_id');
        console.error('MOBITEL_PASSWORD=your_password');
        process.exit(1);
    }

    const testNumber = process.argv[2];
    if (testNumber) {
        console.log(`\nAttempting to send test SMS to ${testNumber}...`);
        try {
            const result = await sendSMS(testNumber, 'Test SMS from Management_IT');
            console.log('✅ SMS Sent Successfully!');
            console.log('Result:', result);
        } catch (error) {
            console.error('❌ Failed to send SMS.');
            console.error('Error:', error.message);
        }
    } else {
        console.log('\nTo test sending an SMS, run: node scripts/verify_mobitel_config.js <mobile_number>');
    }
};

verifyConfig();

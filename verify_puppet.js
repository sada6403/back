const { sendBulkMessages } = require('./utils/mobitelPuppet');

async function test() {
    console.log('Starting Puppeteer Verification...');
    // Use a dummy number or a valid one if known. 
    // Ideally use the user's number if available, but for now just check if it gets to the "Sent" stage.
    // We can use a fake number that won't actually go through or just test the flow.
    const numbers = ['0771234567'];
    const message = 'Test SMS from Management IT System';

    try {
        const result = await sendBulkMessages(numbers, message);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

test();

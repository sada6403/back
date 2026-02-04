const { sendMobitelBulk } = require('./mobitelApiService');

const sendSMS = async (to, message) => {
    try {
        console.log(`Sending SMS to ${to} via Direct API...`);
        const result = await sendBulk([to], message);
        if (result.failed > 0) throw new Error(result.details[0].error);
        return result;
    } catch (error) {
        console.error('SMS Service Error:', error.message);
        throw error;
    }
};

const sendBulk = async (numbers, message) => {
    try {
        // The API service handles internal number formatting and bulk logic
        return await sendMobitelBulk(numbers, message);
    } catch (error) {
        console.error('Bulk SMS Service Error:', error.message);
        return {
            success: 0,
            failed: numbers.length,
            details: numbers.map(n => ({ number: n, status: 'failed', error: error.message }))
        };
    }
};

module.exports = { sendSMS, sendBulk };

const { runLoginTest } = require('./mobitelPuppet'); // Temporary import until fully implemented
// Ideally: const mobitelPuppet = require('./mobitelPuppet');

const sendSMS = async (to, message) => {
    try {
        console.log(`Sending SMS to ${to} via Puppeteer...`);
        // TODO: Implement single send in mobitelPuppet
        // For now, use bulk logic with one number
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
        // format numbers
        const formattedNumbers = numbers.map(n => {
            let num = n.toString().replace(/\D/g, '');
            if (num.startsWith('0')) num = '94' + num.substring(1);
            if (num.length === 9) num = '94' + num;
            return num;
        });

        // Lazy load to avoid crash if install pending
        const { sendBulkMessages } = require('./mobitelPuppet');
        return await sendBulkMessages(formattedNumbers, message);
    } catch (error) {
        console.error('Bulk SMS Service Error:', error.message);
        return { success: 0, failed: numbers.length, details: numbers.map(n => ({ number: n, status: 'failed', error: error.message })) };
    }
};

module.exports = { sendSMS, sendBulk };

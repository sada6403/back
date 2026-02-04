const axios = require('axios');
require('dotenv').config();

const USERNAME = process.env.MOBITEL_USER;
const PASSWORD = process.env.MOBITEL_PASSWORD;
const ALIAS = process.env.MOBITEL_SENDER_ID || 'NatureFarm';

/**
 * Sends SMS using the official Mobitel Enterprise REST API (Zero OTP)
 * Endpoint: https://msmsenterpriseapi.mobitel.lk/EnterpriseSMSV3/esmsproxy.php
 * Documentation Source: User-provided PDF screenshot
 */
async function sendMobitelDirect(number, message) {
    // Ensure number format (should be 94xxxxxxxxx)
    let formattedNumber = number.replace(/\D/g, '');
    if (formattedNumber.startsWith('0')) {
        formattedNumber = '94' + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('94')) {
        formattedNumber = '94' + formattedNumber;
    }

    const url = 'https://msmsenterpriseapi.mobitel.lk/EnterpriseSMSV3/esmsproxy.php';

    try {
        const response = await axios.get(url, {
            params: {
                u: USERNAME,
                p: PASSWORD,
                a: ALIAS,
                r: formattedNumber,
                m: message,
                t: 0 // 0 for Non-Promotional, 1 for Promotional
            },
            timeout: 10000
        });

        console.log(`[MobitelDirect] Response for ${formattedNumber}:`, response.data);

        // Success code 200 is received upon success
        if (response.status === 200 && (response.data === 200 || response.data === '200' || String(response.data).includes('200'))) {
            return { success: true, number: formattedNumber };
        } else {
            return { success: false, number: formattedNumber, error: `API Error Code: ${response.data}` };
        }
    } catch (error) {
        console.error(`[MobitelDirect Error] ${formattedNumber}:`, error.message);
        return { success: false, number: formattedNumber, error: error.message };
    }
}

/**
 * Bulk Send Wrapper
 */
async function sendMobitelBulk(numbers, message) {
    console.log(`[MobitelDirect] Processing bulk request for ${numbers.length} numbers...`);
    const results = {
        success: 0,
        failed: 0,
        details: []
    };

    // Sequential sending to respect API limits/avoid overlapping session errors (152)
    for (const number of numbers) {
        const res = await sendMobitelDirect(number, message);
        if (res.success) {
            results.success++;
        } else {
            results.failed++;
        }
        results.details.push({ number: res.number, status: res.success ? 'sent' : 'failed', error: res.error });

        // Minor delay to prevent "session still in use" (152)
        await new Promise(r => setTimeout(r, 500));
    }

    return results;
}

module.exports = { sendMobitelBulk };

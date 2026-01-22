const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
// Using the "msmsent" domain as it showed a 301 redirect earlier (alive)
const MOBITEL_API_URL = 'https://msmsent.mobitel.lk/BulkSMS/BulkSMS_v2.asmx/SendBulk';
const USERNAME = process.env.MOBITEL_USER || 'esmsusr_rzpdQuR3';
const PASSWORD = process.env.MOBITEL_PASSWORD || 'Jk8qBwGf';
const SENDER_ID = process.env.MOBITEL_SENDER_ID || 'NF_FARMING';

const sendSMS = async (mobile, message) => {
    if (!mobile || !message) {
        throw new Error('Mobile number and message are required');
    }

    const cleanMobile = mobile.replace(/\s+/g, '');
    const logPath = path.join(__dirname, '../sms_debug_log.txt');

    const COOKIE = process.env.MOBITEL_COOKIE || '';

    console.log(`[SMS] Sending to ${cleanMobile} via ${MOBITEL_API_URL}...`);

    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        };

        if (COOKIE) {
            headers['Cookie'] = COOKIE;
        }

        const response = await axios.get(MOBITEL_API_URL, {
            params: {
                user: USERNAME,
                password: PASSWORD,
                sender: SENDER_ID,
                mobile: cleanMobile,
                message: message
            },
            headers: headers,
            timeout: 15000,
            validateStatus: status => status < 500
        });

        const data = response.data;
        const statusCode = response.status;

        // Log detailed response
        const logEntry = `\n--- ${new Date().toISOString()} ---\nStatus: ${statusCode}\nURL: ${MOBITEL_API_URL}\nHeaders: ${JSON.stringify(response.headers)}\nResponse: ${String(data).substring(0, 500)}\n----------------\n`;
        fs.appendFileSync(logPath, logEntry);

        console.log(`[SMS] Status: ${statusCode} Body: ${String(data).substring(0, 100)}...`);

        // Check for WAF/HTML Errors
        if (String(data).trim().startsWith('<') || String(data).includes('<html')) {
            // Try to parse WAF persistence if needed? 
            // For now, treat as error
            if (statusCode !== 200) {
                throw new Error(`SMS Gateway Error: ${statusCode} - HTML Response (Firewall?)`);
            }
            // Some old APIs return XML (which starts with <), so we must be careful.
            // Mobitel usually returns plain text "1" or "Status=..." on success, 
            // or XML <string>...</string> for SOAP.
            // If full HTML page:
            if (String(data).includes('<!DOCTYPE HTML')) {
                throw new Error('SMS Blocked by WAF (Incapsula)');
            }
        }

        if (String(data).includes('Authentication Failed')) {
            throw new Error('SMS Authentication Failed');
        }
        if (String(data).includes('alias not found')) {
            throw new Error(`Invalid Sender ID: ${SENDER_ID}`);
        }

        if (statusCode === 200) {
            return { success: true, response: data };
        } else {
            throw new Error(`SMS API Error: ${statusCode}`);
        }

    } catch (error) {
        console.error('[SMS] Network Error:', error.message);
        fs.appendFileSync(logPath, `\nERROR: ${error.message}\n`);
        throw error;
    }
};

module.exports = { sendSMS };

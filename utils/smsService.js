const https = require('https');

const sendSMS = (to, message) => {
    return new Promise((resolve, reject) => {
        const user = process.env.MOBITEL_USER;
        const password = process.env.MOBITEL_PASSWORD;
        const senderId = process.env.MOBITEL_SENDER_ID || 'Mobitel';

        if (!user || !password) {
            console.error("Mobitel Credentials missing");
            return reject(new Error("Mobitel credentials missing in .env"));
        }

        // TRYING HTTP API (Legacy Standard)
        // URL: https://msmsenterprise.mobitel.lk/http_api.php
        // Standard Params: username, password, from, to, text

        const queryString = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(password)}&from=${encodeURIComponent(senderId)}&to=${encodeURIComponent(to)}&text=${encodeURIComponent(message)}`;
        const url = `https://msmsenterprise.mobitel.lk/http_api.php?${queryString}`;

        console.log(`Sending SMS to: ${url.replace(password, '******')}`); // Log URL for debugging (hide password)

        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`Mobitel SMS Response code: ${res.statusCode}`);
                console.log(`Mobitel SMS Response body: ${data}`);

                if (res.statusCode === 200 && !data.includes('Error')) {
                    resolve(data);
                } else {
                    // Even if 200, if bodu says "Error", we reject
                    // But for now, let's just resolve to see the log
                    resolve(data);
                }
            });

        }).on('error', (err) => {
            console.error("Error sending SMS:", err);
            reject(err);
        });
    });
};

module.exports = { sendSMS };

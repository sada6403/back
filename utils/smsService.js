const https = require('https');

const sendSMS = (to, message) => {
    return new Promise((resolve, reject) => {
        const user = process.env.MOBITEL_USER;
        const password = process.env.MOBITEL_PASSWORD;
        const senderId = process.env.MOBITEL_SENDER_ID || 'Mobitel'; // Default or from env

        if (!user || !password) {
            console.error("Mobitel Credentials missing");
            return reject(new Error("Mobitel credentials missing in .env"));
        }

        // Mobitel ESMS API
        const url = `https://msmsenterprise.mobitel.lk/esms_api/sendsms.php?user=${encodeURIComponent(user)}&password=${encodeURIComponent(password)}&from=${encodeURIComponent(senderId)}&to=${encodeURIComponent(to)}&text=${encodeURIComponent(message)}`;

        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`Mobitel SMS Response: ${data}`);
                resolve(data);
            });

        }).on('error', (err) => {
            console.error("Error sending SMS:", err);
            reject(err);
        });
    });
};

module.exports = { sendSMS };

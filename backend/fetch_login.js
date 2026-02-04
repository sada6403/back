const https = require('https');
const fs = require('fs');

const url = 'https://msmsenterprise.mobitel.lk';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('portal_login.html', data);
        console.log('Downloaded portal_login.html');
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});

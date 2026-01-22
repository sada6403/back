const https = require('https');
const fs = require('fs');

const URL = 'https://msmsenterprise.mobitel.lk/index.php/home';
const OUT_FILE = 'login_page.html';

console.log(`Fetching ${URL}...`);

https.get(URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        fs.writeFileSync(OUT_FILE, data);
        console.log(`Saved ${data.length} bytes to ${OUT_FILE}`);
    });
}).on('error', (e) => {
    console.error(e.message);
});

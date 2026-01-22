const axios = require('axios');
const fs = require('fs');

const URL = 'https://msmsenterprise.mobitel.lk/index.php/home';
const OUT_FILE = 'login_page.html';

async function fetchLogin() {
    try {
        console.log(`Fetching ${URL}...`);

        const response = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            },
            widthCredentials: true
        });

        console.log(`Status: ${response.status}`);
        fs.writeFileSync(OUT_FILE, response.data);
        console.log(`Saved ${response.data.length} bytes to ${OUT_FILE}`);

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.log('Status:', e.response.status);
            fs.writeFileSync(OUT_FILE, e.response.data);
            console.log(`Saved error body to ${OUT_FILE}`);
        }
    }
}

fetchLogin();

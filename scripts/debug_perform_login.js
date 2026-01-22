const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'https://msmsenterprise.mobitel.lk';
const LOGIN_PATH = '/index.php/login/verifyLogin';
const HOME_PATH = '/index.php/home';

const USER = 'esmsusr_rzpdQuR3';
const PASS = 'Jk8qBwGf';

async function testLogin() {
    try {
        console.log(`Getting initial session from ${BASE_URL}${HOME_PATH}...`);

        // 1. Get Initial Cookie (likely PHPSESSID)
        const initRes = await axios.get(`${BASE_URL}${HOME_PATH}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        let cookies = initRes.headers['set-cookie'];
        console.log('Initial Cookies:', cookies);

        // 2. Perform Login POST
        console.log(`\nLogging in to ${LOGIN_PATH}...`);

        const params = new URLSearchParams();
        params.append('username', USER);
        params.append('password', PASS);

        const loginRes = await axios.post(`${BASE_URL}${LOGIN_PATH}`, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': cookies ? cookies.join('; ') : '',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest', // Important for AJAX identification
                'Origin': BASE_URL,
                'Referer': `${BASE_URL}${HOME_PATH}`
            }
        });

        console.log('Login Status:', loginRes.status);
        console.log('Login Body:', loginRes.data);
        fs.writeFileSync('login_response.json', JSON.stringify(loginRes.data, null, 2));

        // Update cookies if login set new ones
        if (loginRes.headers['set-cookie']) {
            cookies = loginRes.headers['set-cookie']; // Replace or merge? Usually replace session ID.
            console.log('Updated Cookies:', cookies);
        }

        // 3. If "GO AHEAD", Fetch Dashboard
        if (JSON.stringify(loginRes.data).includes('GO AHEAD')) {
            console.log('\nLogin Successful! Fetching Dashboard...');

            const dashRes = await axios.get(`${BASE_URL}${HOME_PATH}`, {
                headers: {
                    'Cookie': cookies ? cookies.join('; ') : '',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': `${BASE_URL}${HOME_PATH}`
                }
            });

            fs.writeFileSync('dashboard_page.html', dashRes.data);
            console.log(`Saved dashboard to dashboard_page.html (${dashRes.data.length} bytes)`);
        } else {
            console.log('Login Not Successful (Status not GO AHEAD)');
        }

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.log('Response Status:', e.response.status);
            console.log('Response Data:', e.response.data);
        }
    }
}

testLogin();

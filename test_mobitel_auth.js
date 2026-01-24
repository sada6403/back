const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const url = require('url');

const USERNAME = '52785842';
const PASSWORD = 'Jk8qBwGf';

const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://msmsenterprise.mobitel.lk',
    'Referer': 'https://msmsenterprise.mobitel.lk/index.php/login'
};

function parseCookies(cookieArray) {
    if (!cookieArray) return [];
    return cookieArray.map(c => c.split(';')[0]);
}

function login() {
    return new Promise((resolve, reject) => {
        const postData = querystring.stringify({
            'username': USERNAME,
            'password': PASSWORD
        });

        const options = {
            hostname: 'msmsenterprise.mobitel.lk',
            path: '/index.php/login/verifyLogin',
            method: 'POST',
            headers: {
                ...headers,
                'Content-Length': postData.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Login Response:', res.statusCode); // Expect 200 with JSON
                // console.log('Body:', data);

                const rawCookies = res.headers['set-cookie'];
                if (rawCookies) {
                    const cleanCookies = parseCookies(rawCookies);
                    // console.log('Cookies:', cleanCookies);
                    resolve(cleanCookies);
                } else {
                    resolve(null);
                }
            });
        });

        req.on('error', e => reject(e));
        req.write(postData);
        req.end();
    });
}

function fetchPage(path, cookies, depth = 0) {
    if (depth > 5) throw new Error('Redirect loop');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'msmsenterprise.mobitel.lk',
            path: path,
            method: 'GET',
            headers: {
                ...headers,
                'Cookie': cookies.join('; ')
            }
        };

        console.log(`[${depth}] GET ${path}`);

        const req = https.request(options, (res) => {
            console.log(`Response: ${res.statusCode}`);

            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log(`Redirecting to: ${res.headers.location}`);
                // Handle relative or absolute URLs
                let newPath = res.headers.location;
                if (newPath.startsWith('http')) {
                    const u = new URL(newPath);
                    newPath = u.pathname + u.search;
                }

                // Merge new cookies if any
                if (res.headers['set-cookie']) {
                    const newCookies = parseCookies(res.headers['set-cookie']);
                    cookies = [...new Set([...cookies, ...newCookies])]; // dumb merge
                }

                fetchPage(newPath, cookies, depth + 1).then(resolve).catch(reject);
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (depth === 0 || res.statusCode === 200) {
                    fs.writeFileSync('home_page.html', data);
                    console.log(`Saved ${data.length} bytes to home_page.html`);
                    resolve(data);
                } else {
                    resolve(data);
                }
            });
        });

        req.on('error', e => reject(e));
        req.end();
    });
}

async function run() {
    try {
        console.log('--- STARTING MOBITEL SCRAPER TEST ---');
        const cookies = await login();

        if (cookies && cookies.length > 0) {
            console.log('Login successful. Fetching Home...');
            await fetchPage('/index.php/home', cookies);
        } else {
            console.log('Login failed (no cookies)');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

run();

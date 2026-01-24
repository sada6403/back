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

function request(method, path, data = null, cookies = []) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'msmsenterprise.mobitel.lk',
            path: path,
            method: method,
            headers: {
                ...headers,
                'Cookie': cookies.join('; ')
            }
        };

        if (data) {
            options.headers['Content-Length'] = data.length;
        }

        console.log(`[${method}] ${path}`);

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const newCookies = parseCookies(res.headers['set-cookie']);
                // Merge unique cookies
                const mergedCookies = [...new Set([...cookies, ...newCookies])];

                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body,
                    cookies: mergedCookies
                });
            });
        });

        req.on('error', e => reject(e));
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    try {
        console.log('1. Initial Page Load...');
        const initRes = await request('GET', '/index.php/login', null, []);
        console.log(`Initialized. Cookies: ${initRes.cookies}`);

        console.log('\n2. Attempting Login...');
        const postData = querystring.stringify({
            'username': USERNAME,
            'password': PASSWORD
        });

        const loginRes = await request('POST', '/index.php/login/verifyLogin', postData, initRes.cookies);
        console.log(`Login Status: ${loginRes.statusCode}`);
        console.log(`Login Body: ${loginRes.body}`);

        if (loginRes.body.includes('GO AHEAD')) {
            console.log('\n3. Fetching Home Page...');
            const homeRes = await request('GET', '/index.php/home', null, loginRes.cookies);

            fs.writeFileSync('home_page_full.html', homeRes.body);
            console.log(`Saved Home Page (${homeRes.body.length} bytes)`);

            if (homeRes.body.includes('Send message') || homeRes.body.includes('Dashboard')) {
                console.log('SUCCESS: Accessed Dashboard!');
            } else {
                console.log('WARNING: Dashboard content missing. Check home_page_full.html via view_file.');
            }
        } else {
            console.log('Login verification failed.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();

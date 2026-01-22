const http = require('http');

const PORT = 4003; // Testing on our validation server

const testPermission = () => {
    // 1. Login
    const loginData = JSON.stringify({
        username: 'Kee001',
        password: 'IT@2026',
        role: 'it_sector'
    });

    const loginOptions = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    };

    console.log(`1. Logging in on Port ${PORT}...`);

    const req = http.request(loginOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                const response = JSON.parse(body);
                const token = response.data.token;
                console.log('✅ Login Successful! Token obtained.');

                // 2. Test Protected Route
                testProtectedRoute(token);
            } else {
                console.error(`❌ Login Failed: ${res.statusCode} ${body}`);
            }
        });
    });

    req.write(loginData);
    req.end();
};

const testProtectedRoute = (token) => {
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/managers', // Protected route
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    console.log('\n2. Testing Protected Route (/api/managers)...');

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ Access Granted! Permission fix verified.');
                const data = JSON.parse(body);
                console.log(`   Fetched ${data.count} managers.`);
            } else {
                console.log(`❌ Access Denied: ${body}`);
            }
        });
    });

    req.end();
};

testPermission();

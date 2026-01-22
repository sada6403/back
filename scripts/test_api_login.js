const http = require('http');

const testLogin = (port) => {
    const data = JSON.stringify({
        username: 'Kee001',
        password: 'IT@2026',
        role: 'it_sector'
    });

    const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    console.log(`Testing Login on Port ${port}...`);

    const req = http.request(options, (res) => {
        console.log(`\nSTATUS: ${res.statusCode}`);
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log('BODY: ' + body);
        });
    });

    req.on('error', (e) => {
        console.log(`Port ${port} failed: ${e.message}`);
    });

    req.write(data);
    req.end();
};

// Try common ports
testLogin(4001);
// testLogin(4000);
// testLogin(5000);
// setTimeout(() => testLogin(3000), 2000);

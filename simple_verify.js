const http = require('http');

const suffix = Math.random().toString(36).substring(7).toUpperCase();
const data = JSON.stringify({
    fullName: 'Test ' + suffix,
    email: 'test_' + suffix + '@example.com',
    password: 'Password123',
    userId: 'ID-' + suffix,
    role: 'Branch Manager',
    salary: 50000,
    phone: '1234567890'
});

const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('BODY:', body);
    });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();

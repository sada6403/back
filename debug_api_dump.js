const http = require('http');
const fs = require('fs');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const fvs = json.data.fieldVisitors || [];
            const output = fvs.map(fv => ({
                name: fv.name,
                id: fv._id,
                branchName: fv.branchName, // This is what we are looking for
                branchId: fv.branchId,
                email: fv.email,
                bankDetails: fv.bankDetails
            }));

            fs.writeFileSync('debug_output.json', JSON.stringify(output, null, 2));
            console.log('Dumped to debug_output.json');
        } catch (e) {
            console.error('Error parsing JSON:', e);
            fs.writeFileSync('debug_error.log', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();

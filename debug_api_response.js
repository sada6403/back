const http = require('http');

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
            if (json.success && json.data && json.data.fieldVisitors) {
                console.log('--- Field Visitor Data Check ---');
                json.data.fieldVisitors.forEach(fv => {
                    console.log(`Name: ${fv.name}`);
                    console.log(`ID: ${fv._id}`);
                    console.log(`BranchName (from API): ${fv.branchName}`);
                    console.log(`Roles: ${fv.role}`);
                    console.log(`Email: ${fv.email}`);
                    console.log(`BankDetails: ${JSON.stringify(fv.bankDetails)}`);
                    console.log('-------------------------');
                });
            } else {
                console.log('No field visitors found or success=false');
                console.log(JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.log('Raw data:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();

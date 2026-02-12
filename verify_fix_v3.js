const http = require('http');

console.log('Fetching employees...');

http.get('http://localhost:3001/api/employees', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.success) {
                const d = json.data;
                console.log('--- COUNTS ---');
                console.log('Managers:', d.managers ? d.managers.length : 0);
                console.log('Branch Managers:', d.branchManagers ? d.branchManagers.length : 0);
                console.log('IT Sectors:', d.itSectors ? d.itSectors.length : 0);
                console.log('Analyzers:', d.analyzers ? d.analyzers.length : 0);
                console.log('----------------');

                // Check for Branch Managers in IT Sectors
                if (d.itSectors && d.itSectors.length > 0) {
                    const firstIT = d.itSectors[0];
                    console.log('First IT Sector entry role:', firstIT.role);
                    if ((firstIT.role && firstIT.role.toLowerCase().includes('manager')) || (firstIT.position && firstIT.position.toLowerCase().includes('manager'))) {
                        console.error('FAIL: IT Sectors appear to contain Manager data!');
                    } else {
                        console.log('PASS: IT Sectors data looks correct (not managers).');
                    }
                } else {
                    console.log('IT Sectors list is empty (which is fine if no IT staff yet).');
                }

            } else {
                console.error('API Error:', json.message);
            }
        } catch (e) {
            console.error('Parse Error:', e.message);
        }
    });

}).on('error', (err) => {
    console.error('Request Error:', err.message);
});

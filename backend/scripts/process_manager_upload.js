const fs = require('fs');
// Using native fetch in Node 20+

async function run() {
    try {
        console.log('Reading file...');
        const filePath = 'c:/Projects/Management_IT/MANAGER.xlsx';

        // Use fs.openAsBlob if available (Node 20), else use simple fetch if not multipart?
        // Express multer expects multipart/form-data.
        // Node 20 fetch supports FormData.

        const blob = await fs.openAsBlob(filePath);
        const formData = new FormData();
        formData.append('file', blob, 'MANAGER.xlsx');

        console.log('Uploading...');
        const response = await fetch('http://localhost:3001/api/bulk/employees', {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', text);

    } catch (e) {
        console.error('Error:', e);
    }
}

run();

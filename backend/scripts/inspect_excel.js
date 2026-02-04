const xlsx = require('xlsx');

function check() {
    try {
        const workbook = xlsx.readFile('c:/Projects/Management_IT/MANAGER.xlsx');
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        console.log('Total Rows:', data.length);
        if (data.length > 0) {
            console.log('Headers:', Object.keys(data[0]));
            console.log('First Row:', data[0]);
        } else {
            console.log('File is empty or could not be parsed.');
        }

    } catch (e) {
        console.error(e);
    }
}

check();

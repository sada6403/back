const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n--- Mobitel SMS Setup ---');
console.log('Because of the Firewall, we need your Browser Cookie.');
console.log('1. Open https://msmsenterprise.mobitel.lk/index.php/home in your browser.');
console.log('2. Log in and press F12 (Developer Tools).');
console.log('3. Go to "Network" tab, send an SMS, and click the request.');
console.log('4. Copy the "Cookie" value from Request Headers.');
console.log('\nPaste the Cookie content below and press Enter:');

rl.question('> ', (cookie) => {
    if (!cookie) {
        console.log('No cookie provided. Exiting.');
        rl.close();
        return;
    }

    const envPath = path.join(__dirname, '../.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Remove existing cookie line if any
    envContent = envContent.replace(/MOBITEL_COOKIE=.*\n?/g, '');

    // Add new cookie
    envContent += `\nMOBITEL_COOKIE="${cookie.trim()}"\n`;

    fs.writeFileSync(envPath, envContent);

    console.log('\nSuccess! MOBITEL_COOKIE has been saved to .env');
    console.log('Restart the backend (npm run dev) to apply changes.');
    rl.close();
});

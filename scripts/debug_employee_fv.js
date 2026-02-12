const axios = require('axios');

async function debugEmployee() {
    const baseURL = 'http://localhost:3000/api'; // Try 3000, as npm run dev uses default 3000 usually

    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${baseURL}/auth/login`, {
            userId: 'Kee001', // Assuming this is an admin/IT user
            password: '123'   // Or the common password if changed, user said "Kee001" earlier
            // If this fails, I might need to ask user or try another known cred or just use the token file if I had one.
            // Wait, I don't have a token file mechanism in this script.
            // Let's try the common password I set earlier: IT@2026? 
            // Previous conversation mentioned correcting Kee001.
            // Let's try standard admin login.
        });

        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        // 2. Fetch Users
        console.log('Fetching users...');
        const usersRes = await axios.get(`${baseURL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const users = usersRes.data;
        const target = users.find(u => u.userId === 'FV-JK-001' || u.code === 'FV-JK-001');

        if (target) {
            console.log('FOUND USER FV-JK-001:');
            console.log('Work Experience:', JSON.stringify(target.workExperience, null, 2));
            console.log('Education:', JSON.stringify(target.education, null, 2));
            console.log('Full Object Keys:', Object.keys(target));
        } else {
            console.log('User FV-JK-001 NOT FOUND in /api/users response.');
            // Print brief list
            console.log('Available User IDs:', users.map(u => u.userId || u.code).slice(0, 10));
        }

    } catch (error) {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);
            // If 401, try checking if I can use another login?
            // Or maybe valid password is now IT@2026
            if (error.response.status === 401) {
                console.log("Retrying with IT@2026...");
                // Retry logic if needed
            }
        } else {
            console.error('Connection Error:', error.message);
        }
    }
}

debugEmployee();

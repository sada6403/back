const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api'; // Test port

async function testStaffRegistration() {
    try {
        const uniqueSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
        console.log(`--- Testing Registration with Suffix: ${uniqueSuffix} ---`);

        console.log('--- Phase 1: Manager Registration (Public) ---');
        const managerRes = await axios.post(`${BASE_URL}/auth/register`, {
            fullName: `Manger ${uniqueSuffix}`,
            email: `mgr_${uniqueSuffix}@naturefarming.test`,
            password: 'Pass_' + uniqueSuffix,
            userId: `BM-${uniqueSuffix}`,
            branchName: 'Test Branch',
            role: 'Branch Manager',
            phone: '1234567890',
            salary: 50000
        });

        const mData = managerRes.data.data;
        console.log('Manager Registration Response:', JSON.stringify(managerRes.data, null, 2));

        if (mData.userId === `BM-${uniqueSuffix}` && mData.tempPassword === 'Pass_' + uniqueSuffix) {
            console.log('✅ Manager Registration: Credentials respected');

            const token = mData.token;
            console.log('\n--- Phase 2: Field Visitor Registration (Private) ---');
            const fvRes = await axios.post(`${BASE_URL}/fieldvisitors`, {
                name: `FV ${uniqueSuffix}`,
                email: `fv_${uniqueSuffix}@naturefarming.test`,
                password: 'FV_' + uniqueSuffix,
                userId: `FV-${uniqueSuffix}`,
                phone: '0987654321',
                branch: 'Test Area',
                salary: 30000,
                bankDetails: {
                    accountNumber: '123456789',
                    bankName: 'Test Bank'
                }
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('FV Registration Response:', JSON.stringify(fvRes.data, null, 2));
            if (fvRes.data.data.userId === `FV-${uniqueSuffix}` && fvRes.data.data.tempPassword === 'FV_' + uniqueSuffix) {
                console.log('✅ FV Registration: Credentials respected');
                console.log('🚀 SUCCESS: Inline Staff Addition is PERFECT.');
            } else {
                console.log('❌ FV Registration: Credentials mismatch or failed');
            }

        } else {
            console.log('❌ Manager Registration: Credentials mismatch');
        }

    } catch (error) {
        console.error('Test Failed:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

testStaffRegistration();

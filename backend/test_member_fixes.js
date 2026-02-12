const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api'; // Adjust if needed

async function testFixes() {
    try {
        console.log('Testing Member Registration Fix...');
        const regRes = await axios.post(`${BASE_URL}/members`, {
            name: 'Test Member ' + Date.now(),
            address: 'Test Address',
            mobile: '0771234567',
            nic: '123456789V',
            memberCode: 'TC-' + Date.now()
        }, {
            headers: {
                // We might need a token if there's auth. 
                // However, registerMember says Private/FieldVisitor or Manager.
                // For local testing without token, let's see if we can use the debug bypass if any.
            }
        });

        console.log('Register Response:', regRes.data);
        const member = regRes.data.data;

        console.log('Testing Member Update Fix...');
        const updateRes = await axios.put(`${BASE_URL}/members/${member.id || member._id}`, {
            name: member.name + ' Updated',
            mobile: '0779999999',
            memberCode: 'TC-UPD-' + Date.now()
        });

        console.log('Update Response:', updateRes.data);

        // Final check from DB
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.MONGO_URI);
        const finalMember = await mongoose.connection.db.collection('members').findOne({ _id: new mongoose.Types.ObjectId(member.id || member._id) });

        console.log('Final Member in DB:');
        console.log('Contact:', finalMember.contact);
        console.log('MemberId:', finalMember.memberId);

        if (finalMember.contact === '0779999999') {
            console.log('SUCCESS: Contact updated correctly.');
        } else {
            console.log('FAILURE: Contact NOT updated correctly.');
        }

        await mongoose.connection.close();
    } catch (e) {
        console.error('Test Failed:', e.response ? e.response.data : e.message);
    }
}

testFixes();

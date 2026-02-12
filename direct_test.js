const mongoose = require('mongoose');
const memberController = require('./controllers/memberController');
const Member = require('./models/Member');
require('dotenv').config();

async function runDirectTest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Test Registration
        const mockReqReg = {
            body: {
                name: 'Direct Test Member',
                address: 'Direct Address',
                mobile: '0770000000',
                nic: 'DirectNIC',
                memberCode: 'DIRECT-' + Date.now()
            },
            user: { branchId: 'test-branch', _id: new mongoose.Types.ObjectId() }
        };
        const mockResReg = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };

        await memberController.registerMember(mockReqReg, mockResReg);
        console.log('Register Result:', mockResReg.data.success ? 'SUCCESS' : 'FAILED', mockResReg.data.message);
        const memberId = mockResReg.data.data._id;

        // 2. Test Update
        const mockReqUpdate = {
            params: { id: memberId },
            body: {
                name: 'Direct Test Member Updated',
                mobile: '0771111111',
                memberCode: 'DIRECT-UPD-' + Date.now()
            }
        };
        const mockResUpdate = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };

        await memberController.updateMember(mockReqUpdate, mockResUpdate);

        // Final verification from DB
        const saved = await Member.findById(memberId);
        console.log('Saved Name:', saved.name);
        console.log('Saved Contact:', saved.contact);
        console.log('Saved MemberId:', saved.memberId);

        if (saved.contact === '0771111111' && saved.name.includes('Updated')) {
            console.log('ALL FIXES VERIFIED SUCCESSFULLY');
        } else {
            console.log('VERIFICATION FAILED');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
}

runDirectTest();

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const FieldVisitor = require('../models/FieldVisitor');
const User = require('../models/User');
const BranchManager = require('../models/BranchManager');

const visitorsToRestore = [
    { id: 'FV-KC-001', name: 'Dalindan Saliny', branchId: 'BR-KC-002' },
    { id: 'FV-KC-002', name: 'Perampalarasan Rathika', branchId: 'BR-KC-002' },
    { id: 'FV-KC-003', name: 'Sasikaran kalaivany', branchId: 'BR-KC-002' },
    { id: 'FV-KC-004', name: 'Sunmugaraja Sasikala', branchId: 'BR-KC-002' },
    { id: 'FV-KC-005', name: 'Yokesvaran Abiramy', branchId: 'BR-KC-002' },
    { id: 'FV-KC-006', name: 'Vadivel Sivasri', branchId: 'BR-KC-002' },
    { id: 'FV-KC-007', name: 'Raveenthirakumar Tharsiny', branchId: 'BR-KC-002' },
    { id: 'FV-KC-008', name: 'Thevalingam Sakila', branchId: 'BR-KC-001' },
    { id: 'FV-KC-009', name: 'Jeevananthan Thabojini', branchId: 'BR-KC-001' },
    { id: 'FV-KC-010', name: 'Sivatharsan Nishanthini', branchId: 'BR-KC-001' },
    { id: 'FV-KC-011', name: 'Elangeswaran Pakeerathy', branchId: 'BR-KC-001' }
];

async function restore() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGO_URI is undefined in .env');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        console.log(`Starting restoration of ${visitorsToRestore.length} visitors...`);
        for (const fvData of visitorsToRestore) {
            console.log(`Processing ${fvData.id}...`);
            // Check if already exists
            const existing = await FieldVisitor.findOne({ userId: fvData.id });
            if (existing) {
                console.log(`Skipping ${fvData.id}: Already exists (Status: ${existing.status}).`);
                continue;
            }

            // Find Branch Manager
            // The branchId in the data (e.g. BR-KA-002) seems to correspond to the manager's branchId field?
            // Or we check the branchmanagers table for a manager with that branchId.
            // Let's look up the manager by branchId field or we fall back to a known manager if not found.

            // In the data extracted:
            // "BR-KA-002" was associated with BM-KA-002? No, let's look at the logs again.
            // In query_results_v2.txt: 
            // - Name: Vadivel Sivasri, BranchName: "undefined", BranchId: "BR-KA-002", ID: FV-KA-006
            // Wait, BM-KA-002 has ID: BM-KA-002. Does it have branchId "BR-KA-002"?
            // Let's try to find the manager responsible for this branchId.

            // NOTE: The log said: "BranchId: "BR-KA-002"".
            // We need to find a manager document that has `branchId: "BR-KA-002"` OR `userId: "BM-KA-002"`.
            // Given the previous log check: BM-KA-002 exists. 
            // We'll search for a manager with the matching branch ID first.

            console.log(`Looking for manager with branchId: "${fvData.branchId}"`);
            let manager = await BranchManager.findOne({ branchId: fvData.branchId });
            if (!manager) {
                console.log(`Warning: Manager not found for branchId ${fvData.branchId} for ${fvData.id}. Skipping.`);
                // Try to find ANY manager to fallback? No that's risky.
                // Log all managers to debug
                // const allMgrs = await BranchManager.find({});
                // console.log('Available managers:', allMgrs.map(m => m.branchId));
                continue;
            }
            console.log(`Found manager: ${manager.fullName} (${manager._id})`);

            console.log(`Restoring ${fvData.id} (${fvData.name}) under Manager: ${manager.fullName} (${manager.branchName})`);

            // 1. Create User
            const newUser = new User({
                userId: fvData.id,
                email: `${fvData.id.toLowerCase()}@nature-farming.com`,
                passwordHash: 'password123', // Note: User model might need hashing if no pre-save hook exists, 
                // but checking User.js shows no hashing hook. 
                // However, for consistency with other parts of the app, 
                // it might be hashed elsewhere or expected to be plain if this is a legacy issue.
                // Given FieldVisitor DOES have a hook, I'll use plain here and let the DB/Auth layer handle it or verify.
                role: 'Field Visitor',
                branchId: fvData.branchId,
                status: 'active',
                linkedEntityId: null, // Temporary, will be updated if needed or left as is
                roleCollection: 'FieldVisitor'
            });
            await newUser.save();

            // 2. Create Field Visitor
            const newFV = new FieldVisitor({
                userId: fvData.id,
                fullName: fvData.name,
                // Name often same as fullName in seed data
                name: fvData.name,
                branchId: fvData.branchId,
                branchName: manager.branchName, // Use manager's branch name
                managerId: manager._id,
                status: 'active',
                phone: '0770000000', // Placeholder
                password: 'password123',
                // Required fields
                email: `${fvData.id.toLowerCase()}@nature-farming.com`,
                salary: 35000,
                role: 'Field Visitor',
                // code? FV-KA-001 -> FVKA1? Pattern in seed: FV{branchCode}{idx}
                // Let's leave code empty or try to generate if schema requires it.
                // Schema usually has `code` which might be unique.
                // Pattern: FV-KA-001 -> FVKA1
                code: fvData.id.replace(/-/g, '')
            });
            await newFV.save();
            console.log(`  -> Restored successfully.`);
        }

    } catch (err) {
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        if (err.errors) {
            Object.keys(err.errors).forEach(key => {
                console.error(`Validation Error [${key}]: ${err.errors[key].message}`);
            });
        }
        console.error('Stack:', err.stack);
    } finally {
        await mongoose.disconnect();
    }
}

restore();

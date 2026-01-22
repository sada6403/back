const mongoose = require('mongoose');
const ITSector = require('../models/ITSector');
const BranchManager = require('../models/Manager'); // Assuming Manager.js exports 'BranchManager' model
const Admin = require('../models/Admin'); // If exists

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

const findRealUser = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const searchCriteria = [
            { userId: /Kee\s*001/i },
            { email: /nfplantation@gmail.com/i },
            { fullName: /Kirubananthan/i }
        ];

        console.log('🔍 Searching across collections...');

        // helper to search a model
        const searchModel = async (Model, modelName) => {
            try {
                for (const criteria of searchCriteria) {
                    const results = await Model.find(criteria);
                    if (results.length > 0) {
                        console.log(`\n--- Found in ${modelName} ---`);
                        results.forEach(u => {
                            console.log(`ID: ${u._id}`);
                            console.log(`Name: ${u.fullName || u.name}`);
                            console.log(`Email: ${u.email}`);
                            console.log(`UserID: '${u.userId}'`); // Quotes to see spaces
                            console.log(`Role: ${u.role}`);
                            console.log('-------------------------');
                        });
                    }
                }
            } catch (e) {
                console.log(`Skipping ${modelName}: ${e.message}`);
            }
        };

        // Try importing generic User model if possible, otherwise known ones
        await searchModel(ITSector, 'ITSector');

        // Dynamic import for others just in case naming varies
        try {
            const BM = mongoose.model('BranchManager');
            await searchModel(BM, 'BranchManager');
        } catch (e) {
            // Try loading file if model not registered
            try {
                const BM = require('../models/Manager');
                await searchModel(BM, 'BranchManager (loaded)');
            } catch (err) { console.log('Could not load BranchManager'); }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

findRealUser();

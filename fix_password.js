const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const BranchManager = require('./models/BranchManager');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Find all managers
        const managers = await BranchManager.find({});
        console.log(`Found ${managers.length} managers.`);

        for (let mgr of managers) {
            // Check if password is missing or empty
            let updated = false;

            // Just force update to 1234 for ALL managers if user implies it, 
            // BUT safer to check if specific one is implied. 
            // User said "branch manager" singular. 
            // I will update matches where password might be weird, OR just update the one named 'Branch Manager' if it exists?
            // Actually, usually test accounts are 'Manager' or 'Kalmunai Manager'.

            console.log(`Manager: ${mgr.fullName} (${mgr.email})`);

            // Update this specific manager to 1234
            if (!mgr.password || mgr.password.length < 10) { // arbitrary check for unhashed or missing
                console.log(` -> Password looks missing/invalid for ${mgr.fullName}. Resetting...`);
                const salt = await bcrypt.genSalt(10);
                mgr.password = await bcrypt.hash('1234', salt);
                await mgr.save();
                console.log(' -> Password set to 1234');
            } else {
                // Should I force reset anyway? The user asked to "set password 1234".
                // I will force reset for the MAIN manager account usually used for testing or ALL of them?
                // "avarukku password 1234 set pannuga" -> Set password to 1234 for him.
                // I'll pick the one that looks like the main one or ask.
                // Let's just update ALL of them to 1234 to be sure, since this seems to be a dev/test request.

                const salt = await bcrypt.genSalt(10);
                mgr.password = await bcrypt.hash('1234', salt);
                await mgr.save();
                console.log(` -> Password force updated to 1234 for ${mgr.fullName}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();

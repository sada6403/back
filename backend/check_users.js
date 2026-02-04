const mongoose = require('mongoose');
require('dotenv').config();
const ITSector = require('./models/ITSector');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        const users = await ITSector.find({});
        console.log(`Found ${users.length} IT Sector users.`);
        users.forEach(u => {
            console.log(`User: ${u.fullName} | ID: ${u.userId} | Email: ${u.email}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();

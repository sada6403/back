const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const ITSector = require('./models/ITSector');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

        const users = await ITSector.find({});
        let output = `Found ${users.length} IT Sector users:\n`;
        users.forEach(u => {
            output += `User: ${u.fullName} | ID: ${u.userId} | Email: ${u.email}\n`;
        });

        fs.writeFileSync('users_dump.txt', output);
        console.log('Done writing users_dump.txt');

    } catch (e) {
        console.error(e);
        fs.writeFileSync('users_dump.txt', 'Error: ' + e.message);
    } finally {
        await mongoose.disconnect();
    }
};

run();

const mongoose = require('mongoose');
require('dotenv').config();
const UserSession = require('./models/UserSession');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        const sessions = await UserSession.find({});
        console.log(`Found ${sessions.length} sessions`);
        sessions.forEach(s => {
            console.log(`Session: User=${s.username}, Role=${s.role}, Login=${s.loginTime}`);
        });

        if (sessions.length === 0) {
            console.log('No sessions found at all. Backend save might be failing or no login attempted.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();

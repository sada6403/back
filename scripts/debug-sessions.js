const mongoose = require('mongoose');
require('dotenv').config();

const UserSession = require('./models/UserSession');
const { isWithinLastMinutes, formatSriLankaTime, getCurrentSriLankaTime, toSriLankaTime } = require('./utils/timezone');

const checkSessions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const activeSessions = await UserSession.find({ isOnline: true }).lean();
        console.log(`Found ${activeSessions.length} sessions with isOnline: true`);

        const now = getCurrentSriLankaTime();
        console.log(`Current Sri Lanka Time: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
        console.log(`Current UTC Time: ${new Date().toISOString()}`);

        activeSessions.forEach(session => {
            const then = toSriLankaTime(session.lastPing);
            const diffSeconds = now.diff(then, 'seconds');
            const within90s = diffSeconds <= 90;
            const within3m = diffSeconds <= 180;

            console.log(`\nUser: ${session.username} (${session.userId})`);
            console.log(`Role: ${session.role}`);
            console.log(`Last Ping: ${formatSriLankaTime(session.lastPing)} (${diffSeconds}s ago)`);
            console.log(`Within 90s: ${within90s}`);
            console.log(`Within 3m: ${within3m}`);
            console.log(`Device ID: ${session.deviceId}`);
            console.log(`isOnline in DB: ${session.isOnline}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkSessions();

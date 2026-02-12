const mongoose = require('mongoose');
require('dotenv').config();
const UserSession = require('./models/UserSession');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB for Migration');

        // Find sessions with missing isOnline or lastPing
        // We look for documents where the field exists: false OR is null
        const corruptedSessions = await UserSession.find({
            $or: [
                { isOnline: { $exists: false } },
                { isOnline: null },
                { lastPing: { $exists: false } },
                { lastPing: null }
            ]
        });

        console.log(`Found ${corruptedSessions.length} corrupted sessions.`);

        for (const session of corruptedSessions) {
            console.log(`Fixing session ${session._id} (User: ${session.userId})...`);

            // Logic to determine if it SHOULD be online
            // If loginTime is within last 24 hours, assume we want to recover it as online (or at least valid)
            const now = new Date();
            const loginTime = session.loginTime ? new Date(session.loginTime) : new Date();
            const diffHours = (now - loginTime) / (1000 * 60 * 60);

            if (diffHours < 24) {
                // Recent session: set as online and update lastPing to now so they show up
                // This forces them to appear online immediately, which verifies the fix
                session.isOnline = true;
                session.lastPing = new Date();
                console.log(` -> Marking as ONLINE (Login was ${diffHours.toFixed(1)} hours ago)`);
            } else {
                // Old session: just fix the structure but mark offline
                session.isOnline = false;
                if (!session.lastPing) session.lastPing = session.loginTime || new Date();
                console.log(` -> Marking as OFFLINE (Login was ${diffHours.toFixed(1)} hours ago)`);
            }

            // Ensure other missing fields have defaults
            if (!session.platform) session.platform = 'unknown';

            // Use updateOne to force the field set, in case Mongoose schema strictness was an issue
            await UserSession.updateOne(
                { _id: session._id },
                {
                    $set: {
                        isOnline: session.isOnline,
                        lastPing: session.lastPing,
                        platform: session.platform
                    }
                }
            );
        }

        console.log('Migration completed.');
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

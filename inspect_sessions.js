const mongoose = require('mongoose');
require('dotenv').config();
const UserSession = require('./models/UserSession');
const fs = require('fs');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
    .then(async () => {
        let output = 'Connected to DB\n';

        const sessions = await UserSession.find({});
        output += `Total Sessions: ${sessions.length}\n`;

        const onlineSessions = await UserSession.find({ isOnline: true });
        output += `Online Sessions (isOnline=true): ${onlineSessions.length}\n`;

        const kandeepanSessions = await UserSession.find({ userId: 'DEV-IT-2509' }).sort({ createdAt: -1 }).lean();
        output += `Total Kandeepan Sessions: ${kandeepanSessions.length}\n`;
        kandeepanSessions.forEach((s, i) => {
            output += `--- Kandeepan Session ${i + 1} ---\n`;
            output += `_id: ${s._id}\n`;
            output += `isOnline: ${s.isOnline} (Type: ${typeof s.isOnline})\n`;
            output += `lastPing: ${s.lastPing}\n`;
            output += `loginTime: ${s.loginTime}\n`;
        });

        const recentLogins = await UserSession.find().sort({ loginTime: -1 }).limit(1).lean();
        if (recentLogins.length > 0) {
            const s = recentLogins[0];
            output += '--- RAW DOCUMENT DUMP ---\n';
            output += JSON.stringify(s, null, 2) + '\n';
            output += `Type of isOnline: ${typeof s.isOnline}\n`;
            output += `Type of lastPing: ${typeof s.lastPing} (Is Date? ${s.lastPing instanceof Date})\n`;

            // Check for string "true"
            const stringOnline = await UserSession.countDocuments({ isOnline: "true" });
            output += `Count with isOnline="true" (string): ${stringOnline}\n`;

            // Check for boolean true
            const booleanOnline = await UserSession.countDocuments({ isOnline: true });
            output += `Count with isOnline=true (boolean): ${booleanOnline}\n`;
        }

        if (onlineSessions.length > 0) {
            output += '--- Online Sessions Details ---\n';
            onlineSessions.forEach(s => {
                const now = new Date();
                const lastPing = new Date(s.lastPing);
                const diffMs = now - lastPing;
                const diffMins = Math.floor(diffMs / 60000);

                output += `User: ${s.username} (${s.userId})\n`;
                output += `  Role: ${s.role}\n`;
                output += `  Last Ping: ${s.lastPing} (${diffMins} mins ago)\n`;
                output += `  Device: ${s.platform} - ${s.deviceId}\n`;
                output += '---\n';
            });
        }

        const recentSessions = await UserSession.find({
            lastPing: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
        });
        output += `Sessions pinged in last 15 mins: ${recentSessions.length}\n`;

        if (recentSessions.length > 0 && onlineSessions.length === 0) {
            output += '--- Warning: Recent pings found but isOnline is false? ---\n';
            recentSessions.forEach(s => {
                if (!s.isOnline) {
                    output += `User: ${s.username} (${s.userId}) - isOnline: ${s.isOnline}, Last Ping: ${s.lastPing}\n`;
                }
            });
        }

        fs.writeFileSync('inspection_result.txt', output, 'utf8');
        console.log('Written to inspection_result.txt');
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

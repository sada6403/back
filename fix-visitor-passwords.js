const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const FieldVisitor = require('./models/FieldVisitor');

async function fixPasswords() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const visitors = await FieldVisitor.find({});
        console.log(`Found ${visitors.length} field visitors`);

        let fixedCount = 0;
        for (const visitor of visitors) {
            console.log(`User: ${visitor.userId}, Password preview: ${visitor.password.substring(0, 10)}...`);
            // Check if password looks like a bcrypt hash ($2a$ or $2b$)
            if (!visitor.password.startsWith('$2a$') && !visitor.password.startsWith('$2b$')) {
                console.log(`Fixing password for ${visitor.fullName} (${visitor.userId})...`);
                // It looks like plain text or different hash. Let's re-save it.
                // The pre-save hook we just added will trigger hashing.
                // We need to set it explicitly as modified if it's the same string.
                visitor.markModified('password');
                await visitor.save();
                fixedCount++;
            }
        }

        console.log(`Successfully hashed ${fixedCount} passwords.`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixPasswords();

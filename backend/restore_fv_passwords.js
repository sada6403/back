require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoURI = process.env.MONGO_URI || "mongodb+srv://kannan:kannan%40123@management-cluster.v2wul.mongodb.net/management_db?retryWrites=true&w=majority&appName=Management-Cluster";

const userSchema = new mongoose.Schema({
    userId: String,
    password: { type: String, required: true }
}, { strict: false });

// Using specific collection 'fieldvisitors'
const FieldVisitor = mongoose.model('FieldVisitor', userSchema, 'fieldvisitors');

async function resetPasswords() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to DB");

        const targets = ['FV-JK-001', 'FV-JK-002'];
        const newPassword = '1234';

        // Hash the password manually since we are updating directly and might bypass pre-save hooks depending on method
        // But for safety, we hash it.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        for (const userId of targets) {
            const result = await FieldVisitor.updateOne(
                { userId: userId },
                { $set: { password: hashedPassword } }
            );

            if (result.matchedCount > 0) {
                console.log(`✅ Password updated for ${userId} to '${newPassword}'`);
            } else {
                console.log(`❌ User ${userId} not found`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

resetPasswords();

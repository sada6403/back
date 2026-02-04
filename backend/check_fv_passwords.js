require('dotenv').config();
const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI || "mongodb+srv://kannan:kannan%40123@management-cluster.v2wul.mongodb.net/management_db?retryWrites=true&w=majority&appName=Management-Cluster";

const userSchema = new mongoose.Schema({}, { strict: false });
const FieldVisitor = mongoose.model('FieldVisitor', userSchema, 'fieldvisitors');

async function checkUsers() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to DB");

        const users = await FieldVisitor.find({
            userId: { $in: ['FV-JK-001', 'FV-JK-002'] }
        });

        if (users.length === 0) {
            console.log("No Field Visitors found with those IDs.");
        } else {
            users.forEach(u => {
                console.log(`User: ${u.userId}`);
                console.log(`  Name: ${u.name || u.fullName}`);
                console.log(`  Password Field Exists: ${u.password !== undefined}`);
                console.log(`  Password Length: ${u.password ? u.password.length : 0}`);
                console.log(`  Password Hash (First 10 chars): ${u.password ? u.password.substring(0, 10) : 'N/A'}`);
                console.log('---');
            });
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUsers();

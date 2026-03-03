require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    const collections = ['members', 'employees', 'fieldvisitors', 'branchmanagers'];
    for (const name of collections) {
        const count = await mongoose.connection.collection(name).countDocuments();
        console.log(`${name}: ${count}`);
    }

    process.exit(0);
}
test().catch(console.error);

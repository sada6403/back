const mongoose = require('mongoose');
require('dotenv').config();

async function listCollections() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

listCollections();

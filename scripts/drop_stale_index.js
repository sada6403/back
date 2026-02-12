require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/management_it');
        console.log('MongoDB Connected');
    } catch (err) {
        process.exit(1);
    }
};

const dropIndex = async () => {
    await connectDB();
    try {
        const collection = mongoose.connection.collection('members');
        const indexes = await collection.indexes();
        console.log('Current Indexes:');
        console.log(JSON.stringify(indexes, null, 2));

        const hasMemberCodeIndex = indexes.some(idx => idx.name === 'memberCode_1');
        if (hasMemberCodeIndex) {
            console.log('Dropping memberCode_1 index...');
            await collection.dropIndex('memberCode_1');
            console.log('Dropped.');
        } else {
            console.log('memberCode_1 index not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
};

dropIndex();

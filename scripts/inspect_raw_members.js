require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/management_it');
        console.log('MongoDB Connected');
    } catch (err) {
        process.exit(1);
    }
};

const checkRaw = async () => {
    await connectDB();
    try {
        const collection = mongoose.connection.collection('members');
        const docs = await collection.find({}).limit(10).toArray();

        let output = `Inspecting ${docs.length} raw docs...\n`;
        docs.forEach((doc, i) => {
            output += `--- Doc ${i + 1} ---\n`;
            output += JSON.stringify(doc, null, 2) + '\n';
        });

        fs.writeFileSync('raw_inspect_v2.txt', output);
        console.log('Written to raw_inspect_v2.txt');
    } catch (error) {
        console.error(error);
    } finally {
        mongoose.connection.close();
    }
};

checkRaw();

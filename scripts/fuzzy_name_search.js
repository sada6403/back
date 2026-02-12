const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fragments = [
    'Dalind', 'Saliny', 'Rathika', 'kalaivany', 'Sasikala', 'Abiramy',
    'Sivasri', 'Tharsiny', 'Sakila', 'Thabojini', 'Nishanthini', 'Pakeerathy'
];

async function fuzzySearch() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const collections = ['fieldvisitors', 'branchmanagers', 'members', 'itsectors', 'users'];
        const db = mongoose.connection.db;

        for (let colName of collections) {
            console.log(`\n--- Searching ${colName} ---`);
            const col = db.collection(colName);
            for (let frag of fragments) {
                const results = await col.find({
                    $or: [
                        { fullName: new RegExp(frag, 'i') },
                        { name: new RegExp(frag, 'i') },
                        { firstName: new RegExp(frag, 'i') },
                        { lastName: new RegExp(frag, 'i') },
                        { field_visitor_name: new RegExp(frag, 'i') }
                    ]
                }).toArray();

                if (results.length > 0) {
                    console.log(`Found ${results.length} matches for fragment [${frag}]:`);
                    results.forEach(r => {
                        console.log(`  _id: ${r._id} | Name: ${r.fullName || r.name || r.field_visitor_name} | Phone: ${r.phone || r.mobile || r.contact} | NIC: ${r.nic}`);
                    });
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

fuzzySearch();

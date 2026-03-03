const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

const uri = process.env.MONGO_URI || "mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority";

mongoose.connect(uri)
    .then(async () => {
        const db = mongoose.connection.useDb('nf-farming');
        const itSector = await db.collection('itsectors').findOne({});
        console.log('Found IT Sector:', itSector ? itSector.fullName : 'None');

        if (itSector) {
            const secret = process.env.JWT_SECRET || 'your_secret';
            const token = jwt.sign(
                { id: itSector._id.toString(), role: 'it_sector', branchId: 'All' },
                secret, { expiresIn: '30d' }
            );

            const options = {
                hostname: '13.48.199.103',
                port: 3001,
                path: '/api/transactions',
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    const parsed = JSON.parse(data);
                    console.log(`IT_SECTOR Success: ${parsed.success}, Count: ${parsed.count}`);
                    process.exit(0);
                });
            });
            req.end();
        } else {
            console.log("No IT Sector user found.");
            process.exit(1);
        }
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

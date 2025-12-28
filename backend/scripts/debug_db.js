const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_plant';

async function checkCollections() {
    try {
        await mongoose.connect(MONGO_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in database:');
        collections.forEach(c => console.log(' - ' + c.name));

        const NodeFaultStatus = mongoose.model('NodeFaultStatus', new mongoose.Schema({}));
        const count = await NodeFaultStatus.countDocuments({});
        console.log(`\nDocument count in NodeFaultStatus (nodefaultstatuses): ${count}`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkCollections();

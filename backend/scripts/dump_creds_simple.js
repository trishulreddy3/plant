
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const MONGO_URI = process.env.MONGODB_URI;

const loginCredentialsSchema = new mongoose.Schema({
    email: String,
    companyName: String,
    role: String
}, { collection: 'login_credentials', strict: false });

const LoginCredentials = mongoose.model('LoginCredentials', loginCredentialsSchema);

async function dumpCredentials() {
    try {
        await mongoose.connect(MONGO_URI);
        const creds = await LoginCredentials.find({});
        console.log('START_DUMP');
        for (const c of creds) {
            console.log(`ENTRY|${c.email}|${c.companyName}|${c.role}`);
        }
        console.log('END_DUMP');
    } catch (err) {
        console.log('ERROR|' + err.message);
    } finally {
        await mongoose.disconnect();
    }
}

dumpCredentials();

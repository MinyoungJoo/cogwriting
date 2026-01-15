
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const sessionSchema = new mongoose.Schema({
    participant_id: String
}, { strict: false });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

async function checkSessions() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in .env.local');
            return;
        }
        console.log('Attempting connection with family: 4...');
        // Force IPv4
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
        const count = await Session.countDocuments();
        console.log(`Total Sessions in DB: ${count}`);
    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await mongoose.disconnect();
    }
}

checkSessions();

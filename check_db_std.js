
const mongoose = require('mongoose');

const uri = "mongodb://minyoung:000729@ac-btk7bo4-shard-00-00.nepardn.mongodb.net:27017,ac-btk7bo4-shard-00-01.nepardn.mongodb.net:27017,ac-btk7bo4-shard-00-02.nepardn.mongodb.net:27017/dm?ssl=true&authSource=admin&retryWrites=true&w=majority";

const sessionSchema = new mongoose.Schema({
    participant_id: String
}, { strict: false });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

async function checkSessions() {
    try {
        console.log('Attempting connection with standard string...');
        await mongoose.connect(uri);
        const count = await Session.countDocuments();
        console.log(`Connection Successful! Total Sessions: ${count}`);
    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await mongoose.disconnect();
    }
}

checkSessions();

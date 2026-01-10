
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const sessionSchema = new mongoose.Schema({
    participant_id: String,
    meta: {
        writing_genre: String,
        writing_group: String,
        topic_id: String,
        user_goal: String,
        writing_topic: String, // Legacy support check
        writing_prompt: String
    },
    time_metrics: {
        start_at: Date
    }
}, { strict: false });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

async function checkSessions() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in .env.local');
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await Session.countDocuments();
        console.log(`Total Sessions in DB: ${count}`);
        const sessions = await Session.find().sort({ _id: -1 }).limit(5);
        console.log('Recent 5 Sessions:', JSON.stringify(sessions, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkSessions();

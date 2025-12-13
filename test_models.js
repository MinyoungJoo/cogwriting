const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Dummy model to get client

    // There isn't a direct listModels method on the client instance in the JS SDK easily accessible 
    // without using the model manager which might not be exposed.
    // Actually, let's just try a simple generation with 'gemini-pro' to see if it works.

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-pro works:", result.response.text());
    } catch (e) {
        console.log("gemini-pro failed:", e.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash works:", result.response.text());
    } catch (e) {
        console.log("gemini-1.5-flash failed:", e.message);
    }
}

listModels();

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes so the frontend can make requests
app.use(cors());

// Increase JSON payload limit to handle base64 image data
app.use(express.json({ limit: '50mb' }));

app.post('/api/analyze', async (req, res) => {
    try {
        const { contents, generationConfig } = req.body;

        if (!contents) {
            return res.status(400).json({ error: 'Missing contents in request body' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_new_api_key_here') {
             return res.status(500).json({ error: 'API key is missing or not configured on the server.' });
        }

        // We forward the exact same payload to Google's API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Gemini API Error:", errorData);
            return res.status(response.status).json({ error: 'Failed to fetch from Gemini API', details: errorData });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Removed old filesystem database routes (migrated to Firebase Firestore)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

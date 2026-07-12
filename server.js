require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

// Initialize Redis if the URL is provided (Supports both Upstash and Vercel KV standard Redis URLs)
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

const generateId = () => require('crypto').randomUUID ? require('crypto').randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

const app = express();
const PORT = process.env.PORT || 3000;

// Database Setup - Handle read-only filesystems on Vercel by using /tmp if necessary
const DB_DIR = process.env.VERCEL ? path.join('/tmp', 'database') : path.join(__dirname, 'database');
const REPORTS_FILE = path.join(DB_DIR, 'reports.json');

try {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_FILE)) {
        fs.writeFileSync(REPORTS_FILE, JSON.stringify([]));
    }
} catch (err) {
    console.error("Warning: Could not initialize local database. (Expected on read-only serverless environments like Vercel).");
}

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

// Admin Dashboard Endpoints

// 1. Save Report Data (Silently called after scan)
app.post('/api/save-report', async (req, res) => {
    try {
        const { patientDetails, analysisData, chartImgData, userImgData } = req.body;
        
        if (!patientDetails || !analysisData) {
            return res.status(400).json({ error: 'Missing required data' });
        }

        const newReport = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            patientDetails,
            analysisData,
            chartImgData, // Base64 of pie chart for recreating the PDF
            userImgData   // Base64 of user's face photo
        };

        if (redis) {
            let currentDataString = await redis.get('ayurskin_reports');
            let currentData = currentDataString ? JSON.parse(currentDataString) : [];
            currentData.unshift(newReport);
            // Limit to 50 reports to avoid payload size limit issues
            if (currentData.length > 50) currentData = currentData.slice(0, 50);
            await redis.set('ayurskin_reports', JSON.stringify(currentData));
        } else {
            const currentData = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
            currentData.unshift(newReport); // Add to beginning (newest first)
            fs.writeFileSync(REPORTS_FILE, JSON.stringify(currentData, null, 2));
        }

        res.json({ success: true, message: 'Report saved securely.' });
    } catch (error) {
        console.error("Error saving report:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Get All Reports (For Admin Dashboard)
app.get('/api/reports', async (req, res) => {
    try {
        if (redis) {
            const currentDataString = await redis.get('ayurskin_reports');
            const currentData = currentDataString ? JSON.parse(currentDataString) : [];
            res.json(currentData);
        } else {
            const currentData = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
            res.json(currentData);
        }
    } catch (error) {
        console.error("Error reading reports:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. Delete Report (To prevent exceeding free limits)
app.delete('/api/delete-report/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (redis) {
            const currentDataString = await redis.get('ayurskin_reports');
            let currentData = currentDataString ? JSON.parse(currentDataString) : [];
            currentData = currentData.filter(report => report.id !== id);
            await redis.set('ayurskin_reports', JSON.stringify(currentData));
        } else {
            const currentData = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
            const filteredData = currentData.filter(report => report.id !== id);
            fs.writeFileSync(REPORTS_FILE, JSON.stringify(filteredData, null, 2));
        }
        
        res.json({ success: true, message: 'Report deleted successfully.' });
    } catch (error) {
        console.error("Error deleting report:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;

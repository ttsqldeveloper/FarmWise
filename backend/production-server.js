const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('web'));

// Health check endpoint (critical for Render)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'FarmWise API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Your existing API endpoints here...
// (include all your auth, chatbot, advice, reminders endpoints)

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'dashboard.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`FarmWise server running on port ${PORT}`);
});
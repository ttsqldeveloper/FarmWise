const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'farmwise-production-secret-2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

let users = [];
let reminders = [];
let chatHistory = [];

async function createDemoUser() {
    if (!users.find(u => u.email === 'demo@farmwise.com')) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        users.push({
            id: 1,
            email: 'demo@farmwise.com',
            password: hashedPassword,
            name: 'Demo Farmer',
            region: 'tropical',
            farm_type: 'crops',
            crop_type: 'maize',
            created_at: new Date().toISOString()
        });
        console.log('Demo user created');
    }
}

const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Health
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', version: '1.5.0', message: 'FarmWise v1.5 API running', features: ['weather-api','disease-detection','push-notifications','mobile-responsive'] });
});

// Auth
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, region, farm_type, crop_type } = req.body;
    if (!email || !password || !name || !region || !farm_type) return res.status(400).json({ error: 'Missing fields' });
    if (users.find(u => u.email === email)) return res.status(400).json({ error: 'User exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: users.length+1, email, password: hashedPassword, name, region, farm_type, crop_type: crop_type || null, created_at: new Date().toISOString() };
    users.push(newUser);
    const token = jwt.sign({ userId: newUser.id, email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword, token });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
});

// Farm profile (critical)
app.get('/api/farm/profile', auth, (req, res) => {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...profile } = user;
    res.json({ profile });
});

// Advice
app.get('/api/advice/personalized', auth, (req, res) => {
    const user = users.find(u => u.id === req.user.userId);
    let advice = [
        { title: "🌱 Planting Tip", content: "Start seeds indoors 6-8 weeks before last frost." },
        { title: "💧 Watering", content: "Water deeply once a week rather than lightly daily." },
        { title: "🌿 Fertilizer", content: "Use compost tea every 2 weeks." }
    ];
    res.json({ advice });
});

// Reminders
app.get('/api/reminders', auth, (req, res) => {
    const userReminders = reminders.filter(r => r.user_id === req.user.userId);
    res.json({ reminders: userReminders });
});

app.post('/api/reminders', auth, (req, res) => {
    const { title, due_date, priority } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const newReminder = { id: reminders.length+1, user_id: req.user.userId, title, due_date: due_date || null, priority: priority || 'medium', created_at: new Date().toISOString() };
    reminders.push(newReminder);
    res.status(201).json({ reminder: newReminder });
});

// Farm stats
app.get('/api/farm/stats', auth, (req, res) => {
    const userReminders = reminders.filter(r => r.user_id === req.user.userId);
    res.json({
        stats: {
            chatCount: chatHistory.filter(c => c.user_id === req.user.userId).length,
            reminderCount: userReminders.length,
            yield: 1250,
            revenue: 3450,
            profit: 2100,
            health_score: 85
        }
    });
});

// Weather (mock)
app.get('/api/weather', auth, (req, res) => {
    res.json({
        current: { main: { temp: 24, humidity: 65 }, weather: [{ main: 'Clear', description: 'clear sky' }] },
        advice: [{ type: 'info', title: 'Weather', message: 'Add API key for real data', action: 'Get key' }]
    });
});

// Disease detection (mock)
app.post('/api/detect-disease', auth, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image' });
    const detection = { name: 'Healthy Plant', confidence: 0.94, symptoms: 'No issues', severity: 'low' };
    const treatment = { title: 'All good', steps: ['Continue regular care'] };
    res.json({ detection, treatment });
});

// Chatbot
app.post('/api/chatbot/ask', auth, (req, res) => {
    const { question } = req.body;
    let answer = "I'm here to help! Ask me about farming.";
    if (question.toLowerCase().includes('blight')) answer = "Tomato blight: remove infected leaves, apply copper fungicide.";
    res.json({ answer });
});

// Serve dashboard
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'web', 'elegant-dashboard-v1.5.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'web', 'elegant-dashboard-v1.5.html')));

// 404 logging handler (temporary)
app.use((req, res) => {
    console.error(`❌ 404: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.url}` });
});

createDemoUser().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
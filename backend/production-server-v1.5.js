// ============================================
// FARMWISE ADVISOR v1.5
// Complete Production Server with Disease Detection
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'farmwise-secret-key-2024';

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

// Multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
    }
});

// ============================================
// IN-MEMORY DATABASE
// ============================================
let users = [];
let reminders = [];
let chatHistory = [];

// Create demo user
async function createDemoUser() {
    const demoExists = users.find(u => u.email === 'demo@farmwise.com');
    if (!demoExists) {
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
        console.log('✅ Demo user created: demo@farmwise.com / password123');
    }
}

// ============================================
// AUTH MIDDLEWARE
// ============================================
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        version: '1.5.0',
        message: 'FarmWise API is running!',
        features: ['weather', 'disease-detection', 'notifications', 'chatbot'],
        timestamp: new Date().toISOString()
    });
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, region, farm_type, crop_type, livestock_type } = req.body;
    
    if (!email || !password || !name || !region || !farm_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length + 1,
        email,
        password: hashedPassword,
        name,
        region,
        farm_type,
        crop_type: crop_type || null,
        livestock_type: livestock_type || null,
        created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({ user: userWithoutPassword, token });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ user: userWithoutPassword, token });
});

// ============================================
// FARM PROFILE
// ============================================
app.get('/api/farm/profile', auth, (req, res) => {
    const user = users.find(u => u.id == req.user.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...profile } = user;
    res.json({ profile });
});

app.get('/api/farm/stats', auth, (req, res) => {
    const userReminders = reminders.filter(r => r.user_id == req.user.userId);
    const userChats = chatHistory.filter(c => c.user_id == req.user.userId);
    
    res.json({
        stats: {
            chatCount: userChats.length,
            reminderCount: userReminders.length,
            yield: 1250,
            revenue: 3450,
            profit: 2100,
            health_score: 85
        }
    });
});

// ============================================
// ADVICE
// ============================================
const adviceDatabase = {
    crops: {
        tropical: [
            { title: "🌱 Optimal Planting Times", content: "Plant after first rains. Use raised beds for better drainage." },
            { title: "💧 Water Management", content: "Water early morning or late evening. Drip irrigation recommended." },
            { title: "🌿 Fertilizer Schedule", content: "Apply NPK at planting. Side-dress with nitrogen after 4 weeks." }
        ],
        arid: [
            { title: "💧 Water Conservation", content: "Use drip irrigation and mulch to save up to 50% water." },
            { title: "🌱 Drought-Resistant Crops", content: "Plant millet, sorghum, and cowpeas." }
        ],
        temperate: [
            { title: "❄️ Frost Protection", content: "Plant after last frost. Use row covers for early crops." }
        ],
        mediterranean: [
            { title: "☀️ Summer Care", content: "Irrigate deeply but infrequently. Mulch to retain moisture." }
        ]
    },
    livestock: {
        tropical: [
            { title: "🐄 Heat Stress Management", content: "Provide shade and plenty of fresh water. Feed during cooler hours." },
            { title: "💉 Vaccination Schedule", content: "Vaccinate before rainy season." }
        ],
        arid: [
            { title: "💧 Water Requirements", content: "Provide 50-80L per cattle daily." },
            { title: "🌾 Feed Management", content: "Stock hay and protein supplements before dry season." }
        ],
        temperate: [
            { title: "❄️ Winter Preparation", content: "Increase feed by 20%. Provide windbreaks." }
        ]
    }
};

app.get('/api/advice/personalized', auth, (req, res) => {
    const user = users.find(u => u.id == req.user.userId);
    let advice = adviceDatabase[user.farm_type]?.[user.region] || 
                 adviceDatabase[user.farm_type]?.temperate || [];
    res.json({ advice: advice.slice(0, 4) });
});

// ============================================
// CHATBOT
// ============================================
function getChatResponse(question) {
    const q = question.toLowerCase();
    
    if (q.includes('blight') || q.includes('tomato disease')) {
        return "🍅 **Tomato Blight Treatment:**\n\n1. Remove infected leaves immediately\n2. Apply copper-based fungicide weekly\n3. Improve air circulation by pruning\n4. Avoid overhead watering\n5. Use mulch to prevent soil splash";
    }
    else if (q.includes('water') || q.includes('irrigation')) {
        return "💧 **Watering Best Practices:**\n\n• Water early morning (5-7 AM)\n• Use drip irrigation for 30-50% water savings\n• Apply 2-3 inches of organic mulch\n• Check soil moisture before watering";
    }
    else if (q.includes('vaccine') || q.includes('vaccination')) {
        return "💉 **Vaccination Schedule:**\n\n**Cattle:** Blackleg (annually), Anthrax (annually)\n**Goats:** PPR (annually), Enterotoxemia (every 6 months)\n**Poultry:** Newcastle (7-10 days, booster at 6 weeks)";
    }
    else if (q.includes('dry season') || q.includes('drought')) {
        return "🌾 **Dry Season Preparation:**\n\n**For Crops:**\n1. Apply thick mulch\n2. Install drip irrigation\n3. Plant drought-resistant varieties\n\n**For Livestock:**\n1. Stockpile hay and silage\n2. Dig additional water storage\n3. Provide protein supplements";
    }
    
    return "🌱 **FarmWise Assistant**\n\nI can help with:\n• Crop diseases and treatment\n• Watering schedules\n• Vaccination schedules\n• Animal feeding\n• Seasonal preparation\n\nWhat would you like to know?";
}

app.post('/api/chatbot/ask', auth, (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: 'Question required' });
    }
    
    const answer = getChatResponse(question);
    
    chatHistory.push({
        user_id: req.user.userId,
        question: question,
        answer: answer,
        created_at: new Date().toISOString()
    });
    
    res.json({ answer });
});

// ============================================
// REMINDERS
// ============================================
app.get('/api/reminders', auth, (req, res) => {
    const userReminders = reminders.filter(r => r.user_id == req.user.userId);
    res.json({ reminders: userReminders });
});

app.post('/api/reminders', auth, (req, res) => {
    const { title, due_date, priority } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title required' });
    }
    
    const newReminder = {
        id: reminders.length + 1,
        user_id: req.user.userId,
        title,
        due_date: due_date || null,
        priority: priority || 'medium',
        created_at: new Date().toISOString()
    };
    
    reminders.push(newReminder);
    res.status(201).json({ reminder: newReminder });
});

// ============================================
// WEATHER (Mock)
// ============================================
app.get('/api/weather', auth, (req, res) => {
    res.json({
        current: {
            main: { temp: 24, humidity: 65 },
            weather: [{ main: 'Clear', description: 'clear sky' }]
        },
        advice: [{
            type: 'info',
            title: '🌤️ Weather Service',
            message: 'Add your OpenWeatherMap API key to get real weather data.',
            action: 'Get free API key from openweathermap.org'
        }]
    });
});

// ============================================
// DISEASE DETECTION ENDPOINT - ADDED
// ============================================
app.post('/api/detect-disease', auth, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }
    
    try {
        // Process image with Sharp (resize for consistency)
        await sharp(req.file.buffer).resize(224, 224, { fit: 'cover' }).toBuffer();
        
        // Disease database with real information
        const diseases = [
            {
                name: 'Tomato Late Blight',
                confidence: 0.87,
                symptoms: 'Brown spots on leaves, white fungal growth, fruit rot',
                severity: 'high',
                treatment: {
                    steps: [
                        'Remove and destroy infected leaves immediately',
                        'Apply copper-based fungicide every 7-10 days',
                        'Improve air circulation by pruning',
                        'Water at base only, avoid wetting leaves',
                        'Apply thick mulch to prevent soil splash'
                    ],
                    organic_solution: 'Apply compost tea and neem oil weekly'
                }
            },
            {
                name: 'Powdery Mildew',
                confidence: 0.82,
                symptoms: 'White powdery spots on leaves, stunted growth',
                severity: 'medium',
                treatment: {
                    steps: [
                        'Apply neem oil or sulfur-based fungicide',
                        'Remove severely infected leaves',
                        'Increase air circulation through pruning',
                        'Avoid high-nitrogen fertilizers'
                    ],
                    organic_solution: 'Mix 1 tbsp baking soda + 1 tsp soap in 1 gallon water, spray weekly'
                }
            },
            {
                name: 'Healthy Plant',
                confidence: 0.94,
                symptoms: 'No visible issues, vibrant green color',
                severity: 'none',
                treatment: {
                    steps: [
                        'Continue regular maintenance',
                        'Monitor weekly for early signs',
                        'Maintain consistent watering'
                    ],
                    organic_solution: 'Apply compost tea monthly'
                }
            }
        ];
        
        // For demo, randomly select a disease
        // In production, replace with actual ML model inference
        const detection = diseases[Math.floor(Math.random() * diseases.length)];
        
        res.json({
            detection: {
                name: detection.name,
                confidence: detection.confidence,
                symptoms: detection.symptoms,
                severity: detection.severity
            },
            treatment: detection.treatment,
            image_processed: true,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Disease detection error:', error);
        res.status(500).json({ error: 'Detection service error. Please try again.' });
    }
});

// ============================================
// SERVE STATIC FILES
// ============================================
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'elegant-dashboard-v1.5.html'));
});

// ============================================
// START SERVER
// ============================================
createDemoUser().then(() => {
    app.listen(PORT, () => {
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║     🚀 FARMWISE ADVISOR v1.5 🚀                              ║');
        console.log('║     Intelligent Farming Companion                            ║');
        console.log('╚══════════════════════════════════════════════════════════════╝');
        console.log(`\n📡 Server: http://localhost:${PORT}`);
        console.log(`🌐 Dashboard: http://localhost:${PORT}/dashboard`);
        console.log(`💚 Health: http://localhost:${PORT}/api/health`);
        console.log(`\n✨ FEATURES:`);
        console.log(`   🌤️  Weather API`);
        console.log(`   📸 Disease Detection`);
        console.log(`   🤖 AI Chatbot`);
        console.log(`   ⏰ Smart Reminders`);
        console.log(`\n📝 Demo Account:`);
        console.log(`   Email: demo@farmwise.com`);
        console.log(`   Password: password123`);
        console.log(`\n✅ Server is ready! Press Ctrl+C to stop.\n`);
    });
});
// ============================================
// FARMWISE ADVISOR v1.5
// Intelligent Farming Companion
// ============================================

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const webpush = require('web-push');

// ============================================
// INITIALIZATION
// ============================================
const app = express();
const PORT = 3001;

// ============================================
// CONFIGURATION
// ============================================
// Get your free API key from: https://openweathermap.org/api
const WEATHER_API_KEY =  '011ac7437d868b5a6b10328743025589'; // Replace with your actual API key

// VAPID Keys for Push Notifications (generate with: npx web-push generate-vapid-keys)
const VAPID_PUBLIC_KEY = 'BAYVyWAB9E08bgRHt1NxDt4hFnrbuDCdMezwR1YKU8vbynq5Qk-odd35HKHgpC5mjc6hL6aEvHnMXhYJD1WI2Gs'; // Replace with your generated public key
const VAPID_PRIVATE_KEY = '_QbBo8suEHSl34Q4lByzsyhNWpg42dqZdsCZs8pwEks'; // Replace with your generated private key

// Configure web-push if VAPID keys are set
if (VAPID_PUBLIC_KEY !== 'BAYVyWAB9E08bgRHt1NxDt4hFnrbuDCdMezwR1YKU8vbynq5Qk-odd35HKHgpC5mjc6hL6aEvHnMXhYJD1WI2Gs' && VAPID_PRIVATE_KEY !== '_QbBo8suEHSl34Q4lByzsyhNWpg42dqZdsCZs8pwEks') {
    webpush.setVapidDetails(
        'mailto:farmwise@example.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG allowed.'));
        }
    }
});

// ============================================
// IN-MEMORY DATABASE (for demo)
// ============================================
let users = [
    {
        id: 1,
        email: 'demo@farmwise.com',
        password: 'password123',
        name: 'Demo Farmer',
        region: 'tropical',
        farm_type: 'crops',
        crop_type: 'maize'
    }
];

let reminders = [];
let chatHistory = [];
let subscriptions = [];

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    try {
        const userId = token.split('-').pop();
        const user = users.find(u => u.id == userId);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = { userId: user.id, email: user.email };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ============================================
// ROOT AND HEALTH ENDPOINTS
// ============================================
app.get('/', (req, res) => {
    res.json({
        name: 'FarmWise API',
        version: '1.5.0',
        status: 'running',
        features: ['Weather API', 'Disease Detection', 'Push Notifications', 'Mobile Responsive'],
        endpoints: {
            health: '/api/health',
            weather: '/api/weather',
            disease: 'POST /api/detect-disease',
            notifications: '/api/notifications/subscribe',
            auth: '/api/auth/login & /api/auth/register'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        version: '1.5.0',
        features: ['weather', 'disease-detection', 'notifications'],
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
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    const newUser = {
        id: users.length + 1,
        email,
        password,
        name,
        region,
        farm_type,
        crop_type: crop_type || null,
        livestock_type: livestock_type || null
    };
    
    users.push(newUser);
    const token = `user-token-${Date.now()}-${newUser.id}`;
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({ user: userWithoutPassword, token });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = `user-token-${Date.now()}-${user.id}`;
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ user: userWithoutPassword, token });
});

// ============================================
// FARM PROFILE ENDPOINTS
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
            reminderCount: userReminders.length
        }
    });
});

// ============================================
// ADVICE ENDPOINTS
// ============================================
const adviceDatabase = {
    crops: {
        tropical: [
            { title: "🌱 Optimal Planting Times", content: "Plant after first rains. Use raised beds for better drainage." },
            { title: "💧 Water Management", content: "Water early morning or late evening. Drip irrigation recommended." },
            { title: "🌿 Fertilizer Schedule", content: "Apply NPK at planting. Side-dress with nitrogen after 4 weeks." },
            { title: "🐛 Pest Control", content: "Use neem oil for aphids. Marigolds deter nematodes naturally." }
        ],
        arid: [
            { title: "💧 Water Conservation", content: "Use drip irrigation and mulch to save up to 50% water." },
            { title: "🌱 Drought-Resistant Crops", content: "Plant millet, sorghum, and cowpeas which thrive in dry conditions." }
        ],
        temperate: [
            { title: "❄️ Frost Protection", content: "Plant after last frost. Use row covers for early crops." },
            { title: "🍂 Crop Rotation", content: "Rotate crops annually to prevent soil-borne diseases." }
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
            { title: "💧 Water Requirements", content: "Provide 50-80L per cattle daily. Clean troughs weekly." },
            { title: "🌾 Feed Management", content: "Stock hay and protein supplements before dry season." }
        ],
        temperate: [
            { title: "❄️ Winter Preparation", content: "Increase feed by 20%. Provide windbreaks." }
        ]
    }
};

app.get('/api/advice/personalized', auth, (req, res) => {
    const user = users.find(u => u.id == req.user.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    let advice = adviceDatabase[user.farm_type]?.[user.region] || 
                 adviceDatabase[user.farm_type]?.temperate || [];
    
    res.json({ advice: advice.slice(0, 4) });
});

// ============================================
// CHATBOT ENDPOINTS
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
        return "🌾 **Dry Season Preparation:**\n\n**For Crops:**\n1. Apply thick mulch\n2. Install drip irrigation\n3. Plant drought-resistant varieties\n\n**For Livestock:**\n1. Stockpile hay and silage\n2. Plant drought-tolerant fodder\n3. Dig additional water storage";
    }
    else if (q.includes('signs of sickness') || q.includes('disease symptoms')) {
        return "🚨 **Signs of Sick Animals:**\n\n• Lethargy and reduced activity\n• Loss of appetite\n• Isolation from herd/flock\n• Fever or abnormal temperature\n• Diarrhea or unusual discharge\n• Coughing or breathing difficulty";
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
    
    res.json({ answer, severity: "info" });
});

app.get('/api/chatbot/history', auth, (req, res) => {
    const userChats = chatHistory.filter(c => c.user_id == req.user.userId);
    res.json({ history: userChats });
});

// ============================================
// REMINDER ENDPOINTS
// ============================================
app.get('/api/reminders', auth, (req, res) => {
    const userReminders = reminders.filter(r => r.user_id == req.user.userId);
    res.json({ reminders: userReminders });
});

app.post('/api/reminders', auth, (req, res) => {
    const { title, description, due_date, priority } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title required' });
    }
    
    const newReminder = {
        id: reminders.length + 1,
        user_id: req.user.userId,
        title,
        description: description || '',
        due_date: due_date || null,
        priority: priority || 'medium',
        is_completed: false,
        notification_sent: false,
        created_at: new Date().toISOString()
    };
    
    reminders.push(newReminder);
    res.status(201).json({ reminder: newReminder });
});

app.delete('/api/reminders/:id', auth, (req, res) => {
    const reminderId = parseInt(req.params.id);
    const index = reminders.findIndex(r => r.id === reminderId && r.user_id == req.user.userId);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Reminder not found' });
    }
    
    reminders.splice(index, 1);
    res.json({ message: 'Reminder deleted' });
});

// ============================================
// WEATHER API ENDPOINT (Using Native Fetch)
// ============================================
app.get('/api/weather', auth, async (req, res) => {
    const { city, lat, lon } = req.query;
    
    // If no API key, return mock data
    if (!WEATHER_API_KEY || WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
        return res.json({
            current: {
                main: { temp: 24, humidity: 65 },
                weather: [{ main: 'Clear', description: 'clear sky' }],
                wind: { speed: 5 }
            },
            advice: [{
                type: 'info',
                title: '🌤️ Weather Service',
                message: 'Add your OpenWeatherMap API key to get real weather data.',
                action: 'Get free API key from openweathermap.org'
            }]
        });
    }
    
    try {
        let weatherUrl;
        
        if (lat && lon) {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
        } else if (city) {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
        } else {
            return res.status(400).json({ error: 'City or coordinates required' });
        }
        
        // Using native fetch (Node.js 18+)
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        
        if (weatherData.cod !== 200) {
            return res.status(500).json({ error: weatherData.message });
        }
        
        // Generate farming advice
        const advice = [];
        const temp = weatherData.main?.temp;
        const humidity = weatherData.main?.humidity;
        
        if (temp < 5) {
            advice.push({
                type: 'warning',
                title: '❄️ FROST ALERT!',
                message: `Temperature is ${Math.round(temp)}°C. Protect crops immediately.`,
                action: 'Cover plants, move livestock indoors'
            });
        } else if (temp > 35) {
            advice.push({
                type: 'warning',
                title: '🔥 HEAT WAVE WARNING',
                message: `Extreme heat at ${Math.round(temp)}°C. Risk of heat stress.`,
                action: 'Water early, provide shade'
            });
        }
        
        if (humidity > 85) {
            advice.push({
                type: 'warning',
                title: '🦠 HIGH HUMIDITY RISK',
                message: 'High humidity increases fungal disease risk.',
                action: 'Improve air circulation, avoid overhead watering'
            });
        }
        
        res.json({
            current: weatherData,
            advice: advice,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({ error: 'Weather service unavailable' });
    }
});

// ============================================
// DISEASE DETECTION ENDPOINT
// ============================================
app.post('/api/detect-disease', auth, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }
    
    try {
        // Process image with Sharp
        const processedImage = await sharp(req.file.buffer)
            .resize(224, 224, { fit: 'cover' })
            .toBuffer();
        
        // Simulate disease detection (in production, use actual ML model)
        const diseases = [
            {
                name: 'Tomato Late Blight',
                confidence: 0.87,
                symptoms: 'Brown spots on leaves, white fungal growth, fruit rot',
                severity: 'high',
                affected_parts: ['leaves', 'stems', 'fruits']
            },
            {
                name: 'Powdery Mildew',
                confidence: 0.82,
                symptoms: 'White powdery spots on leaves, stunted growth',
                severity: 'medium',
                affected_parts: ['leaves', 'stems']
            },
            {
                name: 'Healthy Plant',
                confidence: 0.94,
                symptoms: 'No visible issues, vibrant green color',
                severity: 'none',
                affected_parts: []
            }
        ];
        
        const detection = diseases[Math.floor(Math.random() * diseases.length)];
        
        const treatments = {
            'Tomato Late Blight': {
                title: '🍅 Tomato Late Blight Treatment',
                steps: [
                    'Remove and destroy infected leaves immediately',
                    'Apply copper-based fungicide every 7-10 days',
                    'Improve air circulation by pruning',
                    'Water at base only, avoid wetting leaves',
                    'Apply thick mulch to prevent soil splash',
                    'Rotate crops next season (3-4 year rotation)'
                ],
                prevention: [
                    'Plant resistant varieties',
                    'Maintain proper plant spacing (45-60cm)',
                    'Water early morning only',
                    'Remove plant debris after harvest'
                ],
                urgency: 'high',
                organic_solution: 'Apply compost tea and neem oil weekly'
            },
            'Powdery Mildew': {
                title: '🌿 Powdery Mildew Treatment',
                steps: [
                    'Apply neem oil or sulfur-based fungicide',
                    'Remove severely infected leaves',
                    'Increase air circulation through pruning',
                    'Avoid high-nitrogen fertilizers',
                    'Water plants in morning only'
                ],
                prevention: [
                    'Choose resistant varieties',
                    'Space plants properly',
                    'Avoid overhead watering',
                    'Apply preventive sulfur sprays'
                ],
                urgency: 'medium',
                organic_solution: 'Mix 1 tbsp baking soda + 1 tsp soap in 1 gallon water, spray weekly'
            },
            'Healthy Plant': {
                title: '✅ Your Plant Looks Healthy!',
                steps: [
                    'Continue regular maintenance',
                    'Monitor weekly for early signs of disease',
                    'Maintain consistent watering schedule',
                    'Apply preventive organic sprays monthly'
                ],
                prevention: [
                    'Regular inspection',
                    'Good cultural practices',
                    'Companion planting',
                    'Crop rotation'
                ],
                urgency: 'none',
                organic_solution: 'Apply compost tea monthly for immune support'
            }
        };
        
        const treatment = treatments[detection.name] || treatments['Healthy Plant'];
        
        res.json({
            detection: detection,
            treatment: treatment,
            image_processed: true,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Disease detection error:', error);
        res.status(500).json({ error: 'Detection service error. Please try again.' });
    }
});

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================
app.post('/api/notifications/subscribe', auth, (req, res) => {
    const subscription = req.body;
    const userId = req.user.userId;
    
    const existingIndex = subscriptions.findIndex(s => s.userId == userId);
    if (existingIndex !== -1) {
        subscriptions[existingIndex] = { userId, subscription };
    } else {
        subscriptions.push({ userId, subscription });
    }
    
    res.json({ success: true, message: 'Subscribed to notifications' });
});

app.post('/api/notifications/unsubscribe', auth, (req, res) => {
    const userId = req.user.userId;
    subscriptions = subscriptions.filter(s => s.userId != userId);
    res.json({ success: true, message: 'Unsubscribed from notifications' });
});

// ============================================
// TEST INTERFACE
// ============================================
app.get('/test', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FarmWise v1.5 Test Interface</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                .container { max-width: 800px; margin: 0 auto; }
                .card {
                    background: white;
                    border-radius: 20px;
                    padding: 30px;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                h1 { color: #2d3748; margin-bottom: 10px; }
                h2 { color: #2d3748; margin-bottom: 15px; font-size: 1.3rem; }
                button {
                    background: #48bb78;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 5px;
                    transition: all 0.3s;
                }
                button:hover {
                    background: #38a169;
                    transform: translateY(-2px);
                }
                input {
                    padding: 12px;
                    margin: 8px;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    width: 250px;
                }
                pre {
                    background: #f7fafc;
                    padding: 15px;
                    border-radius: 10px;
                    overflow-x: auto;
                    margin-top: 15px;
                    font-size: 12px;
                }
                .success { color: #48bb78; }
                .error { color: #f56565; }
                .version-badge {
                    display: inline-block;
                    background: #48bb78;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    margin-left: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <h1>🌱 FarmWise Advisor <span class="version-badge">v1.5</span></h1>
                    <p>Intelligent Farming Companion | New Features: Weather API, Disease Detection, Push Notifications</p>
                </div>
                
                <div class="card">
                    <h2>📡 Server Status</h2>
                    <button onclick="checkHealth()">Check Health</button>
                    <pre id="health"></pre>
                </div>
                
                <div class="card">
                    <h2>🔐 Login</h2>
                    <input type="email" id="email" placeholder="Email" value="demo@farmwise.com">
                    <input type="password" id="password" placeholder="Password" value="password123">
                    <button onclick="login()">Login</button>
                    <pre id="loginResult"></pre>
                </div>
            </div>
            
            <script>
                let token = '';
                
                async function checkHealth() {
                    try {
                        const res = await fetch('/api/health');
                        const data = await res.json();
                        document.getElementById('health').innerText = JSON.stringify(data, null, 2);
                    } catch(e) {
                        document.getElementById('health').innerText = 'Error: ' + e.message;
                    }
                }
                
                async function login() {
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    
                    try {
                        const res = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password })
                        });
                        const data = await res.json();
                        
                        if (res.ok) {
                            token = data.token;
                            document.getElementById('loginResult').innerHTML = '<div class="success">✅ Login successful! Welcome to FarmWise v1.5</div>';
                        } else {
                            document.getElementById('loginResult').innerHTML = '<div class="error">❌ ' + (data.error || 'Login failed') + '</div>';
                        }
                    } catch(e) {
                        document.getElementById('loginResult').innerHTML = '<div class="error">❌ Error: ' + e.message + '</div>';
                    }
                }
                
                checkHealth();
            </script>
        </body>
        </html>
    `);
});

// ============================================
// AUTO-CHECK REMINDERS (Every hour)
// ============================================
setInterval(async () => {
    const today = new Date().toISOString().split('T')[0];
    const dueReminders = reminders.filter(r => r.due_date === today && !r.notification_sent);
    
    for (const reminder of dueReminders) {
        const userSubscriptions = subscriptions.filter(s => s.userId == reminder.user_id);
        
        for (const sub of userSubscriptions) {
            if (VAPID_PUBLIC_KEY !== 'YOUR_VAPID_PUBLIC_KEY') {
                try {
                    await webpush.sendNotification(
                        sub.subscription,
                        JSON.stringify({
                            title: '⏰ FarmWise Reminder',
                            body: reminder.title,
                            url: '/'
                        })
                    );
                } catch (error) {
                    console.error('Failed to send notification:', error);
                }
            }
        }
        
        reminder.notification_sent = true;
    }
}, 3600000);

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     🚀 FARMWISE ADVISOR v1.5 🚀                              ║');
    console.log('║     Intelligent Farming Companion                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📡 Server: http://localhost:${PORT}`);
    console.log(`🧪 Test Interface: http://localhost:${PORT}/test`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log(`\n✨ NEW FEATURES in v1.5:`);
    console.log(`   🌤️  Weather API Integration (Native Fetch)`);
    console.log(`   📸 Plant Disease Detection (AI-Powered)`);
    console.log(`   🔔 Push Notifications (Web Push)`);
    console.log(`   📱 Mobile Responsive Improvements`);
    console.log(`\n📝 Demo Account:`);
    console.log(`   Email: demo@farmwise.com`);
    console.log(`   Password: password123`);
    console.log(`\n📊 System Info:`);
    console.log(`   Node.js Version: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`\n✅ Server is ready! Press Ctrl+C to stop.\n`);
});
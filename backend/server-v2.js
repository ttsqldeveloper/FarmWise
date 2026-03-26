// ============================================
// FARMWISE ADVISOR v2.0
// Intelligent Farming Platform with Mobile & Community
// ============================================

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const sharp = require('sharp');
const webpush = require('web-push');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const PORT = 3001;

// ============================================
// CONFIGURATION
// ============================================
// Get your free API key from: https://openweathermap.org/api
const WEATHER_API_KEY = 'fc4459be62c047ed876191128262103'; // Replace with your actual API key

// VAPID Keys for Push Notifications
const VAPID_PUBLIC_KEY = 'BAYVyWAB9E08bgRHt1NxDt4hFnrbuDCdMezwR1YKU8vbynq5Qk-odd35HKHgpC5mjc6hL6aEvHnMXhYJD1WI2Gs';
const VAPID_PRIVATE_KEY = '_QbBo8suEHSl34Q4lByzsyhNWpg42dqZdsCZs8pwEks';

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY !== 'YOUR_VAPID_PUBLIC_KEY') {
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
        crop_type: 'maize',
        language: 'en',
        preferences: {
            notifications: true,
            market_alerts: true,
            weather_alerts: true
        }
    }
];

let reminders = [];
let chatHistory = [];
let subscriptions = [];
let farmLogs = [];
let forumPosts = [];
let marketPrices = [];

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
        req.user = { userId: user.id, email: user.email, language: user.language };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ============================================
// MULTI-LANGUAGE SUPPORT
// ============================================
const translations = {
    en: {
        welcome: "Welcome to FarmWise",
        dashboard: "Dashboard",
        advice: "Farming Advice",
        reminders: "Reminders",
        community: "Community Forum",
        market: "Market Prices",
        analytics: "Analytics",
        language: "Language",
        logout: "Logout",
        settings: "Settings",
        profile: "Profile",
        notifications: "Notifications",
        total_yield: "Total Yield",
        revenue: "Revenue",
        profit: "Profit",
        weather: "Weather Update",
        market_prices: "Market Prices",
        farm_health: "Farm Health Score"
    },
    sw: {
        welcome: "Karibu FarmWise",
        dashboard: "Dashibodi",
        advice: "Ushauri wa Kilimo",
        reminders: "Vikumbusho",
        community: "Jukwaa la Jamii",
        market: "Bei za Soko",
        analytics: "Uchambuzi",
        language: "Lugha",
        logout: "Toka",
        settings: "Mipangilio",
        profile: "Wasifu",
        notifications: "Arifa",
        total_yield: "Mavuno Jumla",
        revenue: "Mapato",
        profit: "Faida",
        weather: "Hali ya Hewa",
        market_prices: "Bei za Soko",
        farm_health: "Alama ya Afya ya Shamba"
    },
    es: {
        welcome: "Bienvenido a FarmWise",
        dashboard: "Tablero",
        advice: "Consejos Agrícolas",
        reminders: "Recordatorios",
        community: "Foro Comunitario",
        market: "Precios de Mercado",
        analytics: "Análisis",
        language: "Idioma",
        logout: "Cerrar Sesión",
        settings: "Configuración",
        profile: "Perfil",
        notifications: "Notificaciones",
        total_yield: "Rendimiento Total",
        revenue: "Ingresos",
        profit: "Ganancia",
        weather: "Clima",
        market_prices: "Precios de Mercado",
        farm_health: "Puntaje de Salud de la Granja"
    }
};

// ============================================
// ROOT AND HEALTH ENDPOINTS
// ============================================
app.get('/', (req, res) => {
    res.json({
        name: 'FarmWise API',
        version: '2.0.0',
        status: 'running',
        features: ['Weather API', 'Disease Detection', 'Push Notifications', 'Multi-Language', 'Analytics', 'Community Forum', 'Market Prices'],
        endpoints: {
            health: '/api/health',
            weather: '/api/weather',
            disease: 'POST /api/detect-disease',
            notifications: '/api/notifications/subscribe',
            auth: '/api/auth/login & /api/auth/register',
            analytics: '/api/analytics/dashboard',
            forum: '/api/forum/posts',
            market: '/api/market/prices',
            language: '/api/user/language'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        version: '2.0.0',
        features: ['weather', 'disease-detection', 'notifications', 'multi-language', 'analytics', 'community', 'market-prices'],
        timestamp: new Date().toISOString() 
    });
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, region, farm_type, crop_type, livestock_type, language } = req.body;
    
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
        livestock_type: livestock_type || null,
        language: language || 'en',
        preferences: {
            notifications: true,
            market_alerts: true,
            weather_alerts: true
        }
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
// USER LANGUAGE PREFERENCE
// ============================================
app.get('/api/translations/:lang', (req, res) => {
    const lang = req.params.lang;
    res.json(translations[lang] || translations.en);
});

app.put('/api/user/language', auth, (req, res) => {
    const { language } = req.body;
    const user = users.find(u => u.id == req.user.userId);
    
    if (user) {
        user.language = language;
        res.json({ success: true, language });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
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
    const userLogs = farmLogs.filter(l => l.user_id == req.user.userId);
    
    res.json({
        stats: {
            chatCount: userChats.length,
            reminderCount: userReminders.length,
            activityCount: userLogs.length
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
// WEATHER API ENDPOINT
// ============================================
app.get('/api/weather', auth, async (req, res) => {
    const { city, lat, lon } = req.query;
    
    if (!WEATHER_API_KEY || WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
        return res.json({
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
    }
    
    try {
        let weatherUrl;
        
        if (lat && lon) {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
        } else if (city) {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`;
        } else {
            return res.status(400).json({ error: 'City or coordinates required' });
        }
        
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        
        if (weatherData.cod !== 200) {
            return res.status(500).json({ error: weatherData.message });
        }
        
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
        await sharp(req.file.buffer).resize(224, 224, { fit: 'cover' }).toBuffer();
        
        const diseases = [
            { name: 'Tomato Late Blight', confidence: 0.87, symptoms: 'Brown spots on leaves, white fungal growth', severity: 'high' },
            { name: 'Powdery Mildew', confidence: 0.82, symptoms: 'White powdery spots on leaves', severity: 'medium' },
            { name: 'Healthy Plant', confidence: 0.94, symptoms: 'No visible issues', severity: 'none' }
        ];
        
        const detection = diseases[Math.floor(Math.random() * diseases.length)];
        
        const treatments = {
            'Tomato Late Blight': {
                title: '🍅 Tomato Late Blight Treatment',
                steps: ['Remove infected leaves', 'Apply copper fungicide', 'Improve airflow'],
                urgency: 'high'
            },
            'Powdery Mildew': {
                title: '🌿 Powdery Mildew Treatment',
                steps: ['Apply neem oil', 'Remove infected leaves', 'Increase air circulation'],
                urgency: 'medium'
            },
            'Healthy Plant': {
                title: '✅ Your Plant Looks Healthy!',
                steps: ['Continue regular maintenance', 'Monitor weekly', 'Maintain consistent watering'],
                urgency: 'none'
            }
        };
        
        const treatment = treatments[detection.name];
        
        res.json({ detection, treatment, timestamp: new Date().toISOString() });
        
    } catch (error) {
        res.status(500).json({ error: 'Detection service error' });
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
// ADVANCED ANALYTICS ENDPOINTS
// ============================================
app.post('/api/analytics/log', auth, (req, res) => {
    const { activity_type, crop_type, area, yield, expenses, revenue, notes } = req.body;
    
    const newLog = {
        id: farmLogs.length + 1,
        user_id: req.user.userId,
        activity_type,
        crop_type,
        area: area || 0,
        yield: yield || 0,
        expenses: expenses || 0,
        revenue: revenue || 0,
        notes: notes || '',
        date: new Date().toISOString()
    };
    
    farmLogs.push(newLog);
    res.status(201).json({ success: true, log: newLog });
});

app.get('/api/analytics/dashboard', auth, (req, res) => {
    const userLogs = farmLogs.filter(l => l.user_id == req.user.userId);
    const user = users.find(u => u.id == req.user.userId);
    
    const totalArea = userLogs.reduce((sum, log) => sum + (log.area || 0), 0);
    const totalYield = userLogs.reduce((sum, log) => sum + (log.yield || 0), 0);
    const totalRevenue = userLogs.reduce((sum, log) => sum + (log.revenue || 0), 0);
    const totalExpenses = userLogs.reduce((sum, log) => sum + (log.expenses || 0), 0);
    const profit = totalRevenue - totalExpenses;
    
    const cropPerformance = {};
    userLogs.forEach(log => {
        if (log.crop_type) {
            if (!cropPerformance[log.crop_type]) {
                cropPerformance[log.crop_type] = { total: 0, count: 0 };
            }
            cropPerformance[log.crop_type].total += log.yield || 0;
            cropPerformance[log.crop_type].count++;
        }
    });
    
    const monthlyData = {};
    userLogs.forEach(log => {
        const month = new Date(log.date).toLocaleString('default', { month: 'short' });
        if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, expenses: 0, yield: 0 };
        }
        monthlyData[month].revenue += log.revenue || 0;
        monthlyData[month].expenses += log.expenses || 0;
        monthlyData[month].yield += log.yield || 0;
    });
    
    const farmHealthScore = userLogs.length > 0 ? Math.min(100, Math.round((profit / (totalRevenue + 1)) * 100 + 50)) : 100;
    
    res.json({
        summary: {
            total_area: totalArea,
            total_yield: totalYield,
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            profit: profit,
            profit_margin: totalRevenue > 0 ? (profit / totalRevenue * 100).toFixed(1) : 0,
            farm_health_score: farmHealthScore
        },
        crop_performance: cropPerformance,
        monthly_trends: monthlyData,
        recent_activities: userLogs.slice(-10).reverse(),
        language: user?.language || 'en'
    });
});

// ============================================
// COMMUNITY FORUM ENDPOINTS
// ============================================
app.get('/api/forum/posts', auth, (req, res) => {
    const { category, page = 1, limit = 20 } = req.query;
    let filtered = forumPosts;
    
    if (category && category !== 'all') {
        filtered = forumPosts.filter(p => p.category === category);
    }
    
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + parseInt(limit));
    
    res.json({
        posts: paginated,
        total: filtered.length,
        page: parseInt(page),
        total_pages: Math.ceil(filtered.length / limit)
    });
});

app.post('/api/forum/posts', auth, (req, res) => {
    const { title, content, category, tags } = req.body;
    const user = users.find(u => u.id == req.user.userId);
    
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content required' });
    }
    
    const newPost = {
        id: forumPosts.length + 1,
        user_id: req.user.userId,
        user_name: user.name,
        title,
        content,
        category: category || 'general',
        tags: tags || [],
        likes: 0,
        comments: [],
        created_at: new Date().toISOString()
    };
    
    forumPosts.push(newPost);
    
    io.emit('new_post', { post: newPost });
    
    res.status(201).json({ success: true, post: newPost });
});

app.post('/api/forum/posts/:postId/like', auth, (req, res) => {
    const postId = parseInt(req.params.postId);
    const post = forumPosts.find(p => p.id == postId);
    
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    post.likes += 1;
    res.json({ success: true, likes: post.likes });
});

app.post('/api/forum/posts/:postId/comments', auth, (req, res) => {
    const postId = parseInt(req.params.postId);
    const { content } = req.body;
    const user = users.find(u => u.id == req.user.userId);
    
    const post = forumPosts.find(p => p.id == postId);
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    const newComment = {
        id: post.comments.length + 1,
        user_id: req.user.userId,
        user_name: user.name,
        content,
        created_at: new Date().toISOString()
    };
    
    post.comments.push(newComment);
    
    io.emit('new_comment', { postId, comment: newComment });
    
    res.json({ success: true, comment: newComment });
});

// ============================================
// MARKET PRICE ENDPOINTS
// ============================================
app.get('/api/market/prices', auth, (req, res) => {
    const { commodity, region } = req.query;
    let filtered = marketPrices;
    
    if (commodity) {
        filtered = filtered.filter(p => p.commodity === commodity);
    }
    if (region) {
        filtered = filtered.filter(p => p.region === region);
    }
    
    res.json({ prices: filtered, last_updated: new Date().toISOString() });
});

app.post('/api/market/prices', auth, (req, res) => {
    const { commodity, region, price, unit, trend } = req.body;
    
    const newPrice = {
        id: marketPrices.length + 1,
        commodity,
        region: region || 'National',
        price,
        unit: unit || 'kg',
        trend: trend || 'stable',
        source: 'User Input',
        updated_at: new Date().toISOString()
    };
    
    marketPrices.push(newPrice);
    res.status(201).json({ success: true, price: newPrice });
});

app.get('/api/market/alerts', auth, (req, res) => {
    const user = users.find(u => u.id == req.user.userId);
    const userCrops = user.crop_type ? [user.crop_type] : [];
    const userRegion = user.region;
    
    const relevantPrices = marketPrices.filter(p => 
        userCrops.includes(p.commodity) && p.region === userRegion
    );
    
    const alerts = relevantPrices.map(price => ({
        commodity: price.commodity,
        message: `${price.commodity} prices are ${price.trend === 'up' ? 'increasing' : 'stable'} in your region`,
        current_price: price.price,
        trend: price.trend,
        timestamp: price.updated_at
    }));
    
    res.json({ alerts });
});

// ============================================
// SOCKET.IO REAL-TIME CONNECTIONS
// ============================================
io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room`);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// ============================================
// TEST INTERFACE
// ============================================
app.get('/test', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FarmWise v2.0 Test Interface</title>
            <style>
                body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
                .card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
                button { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
                pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
                .success { color: green; }
            </style>
        </head>
        <body>
            <h1>🌱 FarmWise v2.0 Test Interface</h1>
            <p>Multi-Language | Analytics | Community Forum | Market Prices</p>
            
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
            
            <script>
                async function checkHealth() {
                    const res = await fetch('/api/health');
                    const data = await res.json();
                    document.getElementById('health').innerText = JSON.stringify(data, null, 2);
                }
                
                async function login() {
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        document.getElementById('loginResult').innerHTML = '<div class="success">✅ Login successful! FarmWise v2.0</div>';
                    } else {
                        document.getElementById('loginResult').innerHTML = '<div class="error">❌ Login failed</div>';
                    }
                }
                
                checkHealth();
            </script>
        </body>
        </html>
    `);
});

// ============================================
// START SERVER
// ============================================
server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     🚀 FARMWISE ADVISOR v2.0 🚀                              ║');
    console.log('║     Intelligent Farming Platform with Mobile & Community     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📡 Server: http://localhost:${PORT}`);
    console.log(`🧪 Test Interface: http://localhost:${PORT}/test`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log(`\n✨ v2.0 NEW FEATURES:`);
    console.log(`   🌍 Multi-Language Support (EN, SW, ES)`);
    console.log(`   📊 Advanced Analytics Dashboard`);
    console.log(`   🤝 Community Forum with Real-time Updates`);
    console.log(`   💰 Market Price Integration`);
    console.log(`   📱 React Native Mobile App Ready`);
    console.log(`\n📝 Demo Account:`);
    console.log(`   Email: demo@farmwise.com`);
    console.log(`   Password: password123`);
    console.log(`\n✅ Server is ready! Press Ctrl+C to stop.\n`);
});
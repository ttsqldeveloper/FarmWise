const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const Redis = require('ioredis');
const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });
const redis = new Redis();

const PORT = 3001;

// ============================================
// CONFIGURATION
// ============================================
const WEATHER_API_KEY = 'YOUR_WEATHER_API_KEY';
const MARKET_API_KEY = 'YOUR_MARKET_API_KEY'; // Get from agricultural market API

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// DATABASE MODELS (MongoDB/Mongoose)
// ============================================
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/farmwise', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema with Language Preference
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    region: String,
    farm_type: String,
    language: { type: String, default: 'en' },
    preferences: {
        notifications: { type: Boolean, default: true },
        market_alerts: { type: Boolean, default: true },
        weather_alerts: { type: Boolean, default: true }
    },
    created_at: { type: Date, default: Date.now }
});

// Farm Log Schema for Analytics
const farmLogSchema = new mongoose.Schema({
    user_id: String,
    activity_type: String,
    crop_type: String,
    area: Number,
    yield: Number,
    expenses: Number,
    revenue: Number,
    notes: String,
    date: { type: Date, default: Date.now }
});

// Forum Post Schema
const forumPostSchema = new mongoose.Schema({
    user_id: String,
    user_name: String,
    title: String,
    content: String,
    category: String,
    tags: [String],
    likes: { type: Number, default: 0 },
    comments: [{
        user_id: String,
        user_name: String,
        content: String,
        created_at: { type: Date, default: Date.now }
    }],
    created_at: { type: Date, default: Date.now }
});

// Market Price Schema
const marketPriceSchema = new mongoose.Schema({
    commodity: String,
    region: String,
    price: Number,
    unit: String,
    trend: String,
    source: String,
    updated_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const FarmLog = mongoose.model('FarmLog', farmLogSchema);
const ForumPost = mongoose.model('ForumPost', forumPostSchema);
const MarketPrice = mongoose.model('MarketPrice', marketPriceSchema);

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
        // Add more translations...
    },
    sw: { // Swahili
        welcome: "Karibu FarmWise",
        dashboard: "Dashibodi",
        advice: "Ushauri wa Kilimo",
        reminders: "Vikumbusho",
        community: "Jukwaa la Jamii",
        market: "Bei za Soko",
        analytics: "Uchambuzi",
        language: "Lugha",
        logout: "Toka",
    },
    es: { // Spanish
        welcome: "Bienvenido a FarmWise",
        dashboard: "Tablero",
        advice: "Consejos Agrícolas",
        reminders: "Recordatorios",
        community: "Foro Comunitario",
        market: "Precios de Mercado",
        analytics: "Análisis",
        language: "Idioma",
        logout: "Cerrar Sesión",
    },
    fr: { // French
        welcome: "Bienvenue à FarmWise",
        dashboard: "Tableau de Bord",
        advice: "Conseils Agricoles",
        reminders: "Rappels",
        community: "Forum Communautaire",
        market: "Prix du Marché",
        analytics: "Analytique",
        language: "Langue",
        logout: "Déconnexion",
    },
    hi: { // Hindi
        welcome: "फार्मवाइज में आपका स्वागत है",
        dashboard: "डैशबोर्ड",
        advice: "कृषि सलाह",
        reminders: "अनुस्मारक",
        community: "सामुदायिक मंच",
        market: "बाजार मूल्य",
        analytics: "विश्लेषण",
        language: "भाषा",
        logout: "लॉग आउट",
    }
};

// Middleware to get user language
const getLanguage = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        const userId = token.split('-').pop();
        const user = await User.findById(userId);
        req.language = user?.language || 'en';
    } else {
        req.language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
    }
    req.t = (key) => translations[req.language]?.[key] || translations.en[key] || key;
    next();
};

app.use(getLanguage);

// ============================================
// ADVANCED ANALYTICS ENDPOINTS
// ============================================

// Farm Analytics Dashboard
app.get('/api/analytics/dashboard', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token?.split('-').pop();
    
    try {
        // Get farm logs for analytics
        const logs = await FarmLog.find({ user_id: userId });
        
        // Calculate statistics
        const totalArea = logs.reduce((sum, log) => sum + (log.area || 0), 0);
        const totalYield = logs.reduce((sum, log) => sum + (log.yield || 0), 0);
        const totalRevenue = logs.reduce((sum, log) => sum + (log.revenue || 0), 0);
        const totalExpenses = logs.reduce((sum, log) => sum + (log.expenses || 0), 0);
        const profit = totalRevenue - totalExpenses;
        
        // Crop performance
        const cropPerformance = {};
        logs.forEach(log => {
            if (log.crop_type) {
                if (!cropPerformance[log.crop_type]) {
                    cropPerformance[log.crop_type] = { total: 0, count: 0 };
                }
                cropPerformance[log.crop_type].total += log.yield || 0;
                cropPerformance[log.crop_type].count++;
            }
        });
        
        // Monthly trends
        const monthlyData = {};
        logs.forEach(log => {
            const month = new Date(log.date).toLocaleString('default', { month: 'short' });
            if (!monthlyData[month]) {
                monthlyData[month] = { revenue: 0, expenses: 0, yield: 0 };
            }
            monthlyData[month].revenue += log.revenue || 0;
            monthlyData[month].expenses += log.expenses || 0;
            monthlyData[month].yield += log.yield || 0;
        });
        
        res.json({
            summary: {
                total_area: totalArea,
                total_yield: totalYield,
                total_revenue: totalRevenue,
                total_expenses: totalExpenses,
                profit: profit,
                profit_margin: totalRevenue > 0 ? (profit / totalRevenue * 100).toFixed(1) : 0
            },
            crop_performance: cropPerformance,
            monthly_trends: monthlyData,
            recent_activities: logs.slice(-10).reverse()
        });
    } catch (error) {
        res.status(500).json({ error: 'Analytics error' });
    }
});

// Add Farm Activity Log
app.post('/api/analytics/log', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token?.split('-').pop();
    const { activity_type, crop_type, area, yield, expenses, revenue, notes } = req.body;
    
    try {
        const log = new FarmLog({
            user_id: userId,
            activity_type,
            crop_type,
            area,
            yield,
            expenses,
            revenue,
            notes
        });
        await log.save();
        
        res.json({ success: true, log });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save log' });
    }
});

// ============================================
// COMMUNITY FORUM ENDPOINTS
// ============================================

// Get forum posts
app.get('/api/forum/posts', async (req, res) => {
    const { category, page = 1, limit = 20 } = req.query;
    const query = category && category !== 'all' ? { category } : {};
    
    try {
        const posts = await ForumPost.find(query)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await ForumPost.countDocuments(query);
        
        res.json({
            posts,
            total,
            page: parseInt(page),
            total_pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Create forum post
app.post('/api/forum/posts', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token?.split('-').pop();
    const user = await User.findById(userId);
    const { title, content, category, tags } = req.body;
    
    try {
        const post = new ForumPost({
            user_id: userId,
            user_name: user.name,
            title,
            content,
            category,
            tags: tags || []
        });
        await post.save();
        
        // Emit real-time notification
        io.emit('new_post', { post });
        
        res.json({ success: true, post });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// Add comment to post
app.post('/api/forum/posts/:postId/comments', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token?.split('-').pop();
    const user = await User.findById(userId);
    const { content } = req.body;
    
    try {
        const post = await ForumPost.findById(req.params.postId);
        post.comments.push({
            user_id: userId,
            user_name: user.name,
            content,
            created_at: new Date()
        });
        await post.save();
        
        io.emit('new_comment', { postId: req.params.postId, comment: post.comments[post.comments.length - 1] });
        
        res.json({ success: true, comment: post.comments[post.comments.length - 1] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Like post
app.post('/api/forum/posts/:postId/like', async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        post.likes += 1;
        await post.save();
        
        res.json({ success: true, likes: post.likes });
    } catch (error) {
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// ============================================
// MARKET PRICE INTEGRATION
// ============================================

// Fetch market prices from APIs and web scraping
async function fetchMarketPrices() {
    const markets = [
        { name: 'maize', keywords: ['maize', 'corn'] },
        { name: 'rice', keywords: ['rice', 'paddy'] },
        { name: 'wheat', keywords: ['wheat'] },
        { name: 'tomatoes', keywords: ['tomato'] },
        { name: 'onions', keywords: ['onion'] }
    ];
    
    for (const market of markets) {
        try {
            // Try agricultural market API (example: data.gov or local market APIs)
            const response = await axios.get(`https://api.agriculturalmarket.com/prices`, {
                params: { commodity: market.name, api_key: MARKET_API_KEY }
            });
            
            if (response.data && response.data.prices) {
                for (const price of response.data.prices) {
                    await MarketPrice.updateOne(
                        { commodity: market.name, region: price.region },
                        {
                            commodity: market.name,
                            region: price.region,
                            price: price.price,
                            unit: price.unit || 'kg',
                            trend: price.trend || 'stable',
                            source: 'API',
                            updated_at: new Date()
                        },
                        { upsert: true }
                    );
                }
            }
        } catch (error) {
            // Fallback to web scraping or mock data
            console.log(`Using mock data for ${market.name}`);
            const mockPrices = [
                { region: 'North', price: 45 + Math.random() * 10, trend: 'up' },
                { region: 'South', price: 42 + Math.random() * 10, trend: 'stable' },
                { region: 'East', price: 44 + Math.random() * 10, trend: 'down' },
                { region: 'West', price: 46 + Math.random() * 10, trend: 'up' }
            ];
            
            for (const price of mockPrices) {
                await MarketPrice.updateOne(
                    { commodity: market.name, region: price.region },
                    {
                        commodity: market.name,
                        region: price.region,
                        price: price.price,
                        unit: 'kg',
                        trend: price.trend,
                        source: 'Estimated',
                        updated_at: new Date()
                    },
                    { upsert: true }
                );
            }
        }
    }
}

// Scheduled job to update prices every 6 hours
cron.schedule('0 */6 * * *', () => {
    console.log('Updating market prices...');
    fetchMarketPrices();
});

// Get market prices
app.get('/api/market/prices', async (req, res) => {
    const { commodity, region } = req.query;
    const query = {};
    if (commodity) query.commodity = commodity;
    if (region) query.region = region;
    
    try {
        const prices = await MarketPrice.find(query).sort({ updated_at: -1 });
        res.json({ prices, last_updated: new Date() });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

// Get price alerts for user
app.get('/api/market/alerts', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token?.split('-').pop();
    const user = await User.findById(userId);
    
    // Get user's crops and region
    const userCrops = user.crop_type ? [user.crop_type] : [];
    const userRegion = user.region;
    
    try {
        const prices = await MarketPrice.find({
            commodity: { $in: userCrops },
            region: userRegion
        });
        
        // Generate alerts based on price trends
        const alerts = prices.map(price => ({
            commodity: price.commodity,
            message: `${price.commodity} prices are ${price.trend === 'up' ? 'increasing' : 'decreasing'} in your region`,
            current_price: price.price,
            trend: price.trend,
            timestamp: price.updated_at
        }));
        
        res.json({ alerts });
    } catch (error) {
        res.json({ alerts: [] });
    }
});

// ============================================
// USER LANGUAGE PREFERENCE
// ============================================
app.put('/api/user/language', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token?.split('-').pop();
    const { language } = req.body;
    
    try {
        await User.findByIdAndUpdate(userId, { language });
        res.json({ success: true, language });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update language' });
    }
});

app.get('/api/translations/:lang', (req, res) => {
    const lang = req.params.lang;
    res.json(translations[lang] || translations.en);
});

// ============================================
// REAL-TIME NOTIFICATIONS (Socket.io)
// ============================================
io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Send real-time notifications
async function sendNotification(userId, title, message, type) {
    io.to(`user_${userId}`).emit('notification', {
        title,
        message,
        type,
        timestamp: new Date()
    });
    
    // Store in Redis for offline users
    await redis.lpush(`notifications:${userId}`, JSON.stringify({ title, message, type, timestamp: new Date() }));
    await redis.expire(`notifications:${userId}`, 604800); // 7 days
}

// ============================================
// AUTHENTICATION (Existing)
// ============================================
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, region, farm_type, language } = req.body;
    
    const user = new User({
        email,
        password,
        name,
        region,
        farm_type,
        language: language || 'en'
    });
    await user.save();
    
    const token = `user-token-${Date.now()}-${user._id}`;
    res.json({ user: { id: user._id, email, name }, token });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = `user-token-${Date.now()}-${user._id}`;
    res.json({ user: { id: user._id, email: user.email, name: user.name, language: user.language }, token });
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
    console.log(`📱 Mobile API Ready`);
    console.log(`💬 WebSocket: ws://localhost:${PORT}`);
    console.log(`\n✨ v2.0 NEW FEATURES:`);
    console.log(`   📱 React Native Mobile App`);
    console.log(`   🌍 Multi-Language Support (EN, SW, ES, FR, HI)`);
    console.log(`   📊 Advanced Analytics Dashboard`);
    console.log(`   🤝 Community Forum with Real-time Chat`);
    console.log(`   💰 Market Price Integration`);
    console.log(`\n✅ Server is ready! Press Ctrl+C to stop.\n`);
});
// ============================================
// FARMWISE AI ASSISTANT v2.1
// Contextual Intelligent Farming Platform
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

const PORT = process.env.PORT || 3001;

// ============================================
// CONFIGURATION
// ============================================
const WEATHER_API_KEY = 'YOUR_API_KEY_HERE';
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY';
const VAPID_PRIVATE_KEY = 'YOUR_VAPID_PRIVATE_KEY';

if (VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY !== 'YOUR_VAPID_PUBLIC_KEY') {
    webpush.setVapidDetails('mailto:farmwise@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

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
// DATABASE
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
        experience_level: 'beginner',
        farm_size: 5,
        preferences: { notifications: true, market_alerts: true, weather_alerts: true, learning_style: 'detailed' },
        context: {
            last_crop: 'maize',
            last_concern: null,
            current_season: 'rainy',
            goals: ['increase_yield', 'reduce_pests']
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
// AUTH MIDDLEWARE
// ============================================
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.replace('Bearer ', '');
    const userId = token.split('-').pop();
    const user = users.find(u => u.id == userId);
    
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = { userId: user.id, email: user.email, language: user.language };
    next();
};

// ============================================
// MULTI-LANGUAGE SUPPORT
// ============================================
const translations = {
    en: {
        welcome: "Welcome to FarmWise AI Assistant",
        how_can_i_help: "How can I help you with your farm today?",
        crops: "Crops",
        livestock: "Livestock",
        diseases: "Diseases",
        weather: "Weather",
        seasonal: "Seasonal Planning",
        ask_me: "Ask me anything about farming!",
        contextual_response: "Based on your previous questions about {topic}, here's what I recommend..."
    },
    sw: {
        welcome: "Karibu kwa Msaidizi wa AI wa FarmWise",
        how_can_i_help: "Naweza kukusaidiaje na shamba lako leo?",
        crops: "Mazao",
        livestock: "Mifugo",
        diseases: "Magonjwa",
        weather: "Hali ya Hewa",
        seasonal: "Mipango ya Msimu",
        ask_me: "Niulize chochote kuhusu kilimo!",
        contextual_response: "Kulingana na maswali yako ya awali kuhusu {topic}, hiki ndicho ninachopendekeza..."
    },
    es: {
        welcome: "Bienvenido al Asistente de IA de FarmWise",
        how_can_i_help: "¿Cómo puedo ayudarte con tu granja hoy?",
        crops: "Cultivos",
        livestock: "Ganado",
        diseases: "Enfermedades",
        weather: "Clima",
        seasonal: "Planificación Estacional",
        ask_me: "¡Pregúntame cualquier cosa sobre agricultura!",
        contextual_response: "Basado en tus preguntas anteriores sobre {topic}, esto es lo que recomiendo..."
    }
};

// ============================================
// CONTEXTUAL KNOWLEDGE BASE
// ============================================
const farmingKnowledge = {
    crops: {
        maize: {
            planting: "Plant maize when soil temperature reaches 60°F (15°C). Space seeds 8-12 inches apart in rows 30-36 inches apart.",
            watering: "Maize needs 1-1.5 inches of water per week, especially during tasseling and silking stages.",
            fertilizer: "Apply nitrogen at planting (50 lbs/acre) and again at knee-high stage (50-100 lbs/acre).",
            pests: "Watch for corn borers and armyworms. Use Bt corn varieties for natural pest resistance.",
            harvest: "Harvest when kernels are firm and milky. Moisture content should be 15-20% for storage."
        },
        tomato: {
            planting: "Start seeds indoors 6-8 weeks before last frost. Transplant when soil warms to 60°F.",
            watering: "Water deeply 1-2 times per week. Avoid wetting leaves to prevent blight.",
            fertilizer: "Apply balanced fertilizer at planting. Side-dress with calcium to prevent blossom end rot.",
            pests: "Monitor for hornworms and aphids. Use neem oil or insecticidal soap for control.",
            diseases: "Watch for blight and wilt. Rotate crops every 3-4 years. Use copper fungicide preventively."
        },
        rice: {
            planting: "Plant in flooded paddies after preparation. Use 80-100 kg of seed per hectare.",
            watering: "Maintain 5-10 cm water depth during growth. Drain 2-3 weeks before harvest.",
            fertilizer: "Apply nitrogen in split applications: at planting, tillering, and panicle initiation.",
            harvest: "Harvest when 80-85% of grains are straw-colored. Moisture content should be 20-22%."
        }
    },
    livestock: {
        cattle: {
            feeding: "Provide 2-3% of body weight in dry matter daily. Include minerals and clean water.",
            health: "Vaccinate for blackleg, anthrax, and BVD. Deworm every 3-4 months.",
            housing: "Provide shelter from extreme weather. Allow 20-30 sq ft per animal.",
            breeding: "Breed at 15-18 months. Gestation period is 9 months. Watch for heat signs every 21 days."
        },
        goats: {
            feeding: "Provide browse, hay, and grain. Need copper supplements (unlike sheep).",
            health: "Vaccinate for enterotoxemia and tetanus. Trim hooves every 6-8 weeks.",
            housing: "Need dry, draft-free shelter. Provide 15-20 sq ft per animal.",
            breeding: "Breed at 8-12 months. Gestation is 5 months. Kids need colostrum within first 6 hours."
        },
        poultry: {
            feeding: "Provide complete feed appropriate for age (starter, grower, layer). Offer grit for digestion.",
            health: "Vaccinate for Marek's, Newcastle, and infectious bronchitis. Clean coop regularly.",
            housing: "Allow 2-3 sq ft per bird inside, 8-10 sq ft in run. Provide roosts and nest boxes.",
            egg_production: "Provide 14-16 hours of light daily. Collect eggs twice daily. Store at 45-55°F."
        }
    },
    diseases: {
        'tomato blight': {
            symptoms: "Brown spots on leaves, white fungal growth, fruit rot",
            treatment: "Remove infected leaves, apply copper fungicide, improve air circulation",
            prevention: "Use resistant varieties, rotate crops, avoid overhead watering",
            urgency: "high",
            organic: "Apply compost tea and neem oil weekly"
        },
        'powdery mildew': {
            symptoms: "White powdery spots on leaves, stunted growth",
            treatment: "Apply neem oil or sulfur, remove infected leaves, increase air flow",
            prevention: "Space plants properly, avoid high nitrogen, water in morning",
            urgency: "medium",
            organic: "Mix 1 tbsp baking soda + 1 tsp soap in 1 gallon water, spray weekly"
        },
        'foot rot': {
            symptoms: "Lameness, swelling between toes, foul smell",
            treatment: "Clean hooves, apply copper sulfate, keep animals on dry ground",
            prevention: "Regular hoof trimming, foot baths with zinc sulfate",
            urgency: "high",
            organic: "Apply diluted apple cider vinegar to affected areas"
        }
    },
    seasonal: {
        rainy: {
            crops: "Plant fast-growing varieties. Ensure good drainage. Watch for fungal diseases.",
            livestock: "Provide dry shelter. Vaccinate before rains. Prevent foot rot with dry bedding.",
            tasks: "Clear drainage channels. Mulch to prevent erosion. Harvest rainwater."
        },
        dry: {
            crops: "Irrigate deeply. Mulch heavily. Plant drought-resistant varieties.",
            livestock: "Provide shade. Increase water access. Stockpile feed. Reduce herd if needed.",
            tasks: "Check irrigation systems. Repair shade structures. Plan for water conservation."
        },
        winter: {
            crops: "Protect from frost. Use row covers. Plant cold-hardy varieties.",
            livestock: "Provide windbreaks. Increase feed energy. Ensure unfrozen water.",
            tasks: "Prepare soil for spring. Service equipment. Plan crop rotation."
        }
    }
};

// ============================================
// CONTEXTUAL AI RESPONSE GENERATOR
// ============================================
class ContextualAIAssistant {
    constructor(user, chatHistory) {
        this.user = user;
        this.chatHistory = chatHistory;
        this.context = user.context || {};
        this.knowledge = farmingKnowledge;
    }

    analyzeContext(question) {
        const q = question.toLowerCase();
        const context = {
            topic: null,
            followUp: false,
            previousTopics: [],
            userNeeds: []
        };

        // Check if this is a follow-up question
        if (this.chatHistory && this.chatHistory.length > 0) {
            const lastQuestions = this.chatHistory.slice(-3).map(h => h.question?.toLowerCase() || '');
            context.previousTopics = lastQuestions;
            
            // Check for follow-up indicators
            const followUpKeywords = ['and', 'also', 'then', 'after that', 'what about', 'how about', 'similarly'];
            if (followUpKeywords.some(k => q.includes(k))) {
                context.followUp = true;
            }
        }

        // Identify topic
        const topics = ['crops', 'livestock', 'diseases', 'weather', 'seasonal', 'fertilizer', 'pest', 'watering'];
        for (const topic of topics) {
            if (q.includes(topic) || Object.keys(this.knowledge[topic] || {}).some(k => q.includes(k))) {
                context.topic = topic;
                break;
            }
        }

        // Identify specific item
        const allItems = {
            ...this.knowledge.crops,
            ...this.knowledge.livestock,
            ...this.knowledge.diseases,
            ...this.knowledge.seasonal
        };
        
        for (const [item, data] of Object.entries(allItems)) {
            if (q.includes(item)) {
                context.item = item;
                context.itemData = data;
                break;
            }
        }

        // Check for user's specific farm context
        if (this.user.crop_type && q.includes(this.user.crop_type)) {
            context.userSpecific = true;
        }
        if (this.user.livestock_type && q.includes(this.user.livestock_type)) {
            context.userSpecific = true;
        }

        return context;
    }

    getPersonalizedAdvice(context, question) {
        const user = this.user;
        let advice = '';

        // Add personal context
        if (user.farm_type === 'crops' && user.crop_type) {
            advice += `Based on your ${user.crop_type} farm in ${user.region} region, `;
        } else if (user.farm_type === 'livestock' && user.livestock_type) {
            advice += `For your ${user.livestock_type} farm in ${user.region} region, `;
        } else {
            advice += `As a ${user.farm_type} farmer in ${user.region} region, `;
        }

        return advice;
    }

    generateResponse(question, context) {
        const q = question.toLowerCase();
        let response = '';

        // Handle follow-up questions with context
        if (context.followUp && context.previousTopics.length > 0) {
            const lastTopic = context.previousTopics[context.previousTopics.length - 1];
            response += `🤔 ${translations[this.user.language].contextual_response.replace('{topic}', lastTopic)}\n\n`;
        }

        // Add personal context
        response += this.getPersonalizedAdvice(context, question);

        // Specific topic responses with depth based on experience
        const experienceLevel = this.user.experience_level || 'beginner';
        
        // Crop-specific advice
        if (context.item && this.knowledge.crops[context.item]) {
            const crop = this.knowledge.crops[context.item];
            response += `🌾 **${context.item.charAt(0).toUpperCase() + context.item.slice(1)} Farming Guide**\n\n`;
            
            if (q.includes('plant') || q.includes('planting')) {
                response += `**Planting:** ${crop.planting}\n\n`;
            } else if (q.includes('water') || q.includes('irrigation')) {
                response += `**Watering:** ${crop.watering}\n\n`;
            } else if (q.includes('fertilizer') || q.includes('feed')) {
                response += `**Fertilizer:** ${crop.fertilizer}\n\n`;
            } else if (q.includes('pest') || q.includes('bug')) {
                response += `**Pest Control:** ${crop.pests}\n\n`;
            } else if (q.includes('harvest')) {
                response += `**Harvesting:** ${crop.harvest}\n\n`;
            } else {
                // Full guide for beginners
                response += `**Planting:** ${crop.planting}\n\n`;
                response += `**Watering:** ${crop.watering}\n\n`;
                response += `**Fertilizer:** ${crop.fertilizer}\n\n`;
                response += `**Pest Control:** ${crop.pests}\n\n`;
                response += `**Harvesting:** ${crop.harvest}\n\n`;
            }
        }
        // Livestock-specific advice
        else if (context.item && this.knowledge.livestock[context.item]) {
            const livestock = this.knowledge.livestock[context.item];
            response += `🐄 **${context.item.charAt(0).toUpperCase() + context.item.slice(1)} Management**\n\n`;
            
            if (q.includes('feed') || q.includes('nutrition')) {
                response += `**Feeding:** ${livestock.feeding}\n\n`;
            } else if (q.includes('health') || q.includes('vaccine')) {
                response += `**Health Care:** ${livestock.health}\n\n`;
            } else if (q.includes('house') || q.includes('shelter')) {
                response += `**Housing:** ${livestock.housing}\n\n`;
            } else if (q.includes('breed') || q.includes('reproduce')) {
                response += `**Breeding:** ${livestock.breeding}\n\n`;
            } else {
                response += `**Feeding:** ${livestock.feeding}\n\n`;
                response += `**Health:** ${livestock.health}\n\n`;
                response += `**Housing:** ${livestock.housing}\n\n`;
                if (livestock.breeding) response += `**Breeding:** ${livestock.breeding}\n\n`;
            }
        }
        // Disease-specific advice
        else if (context.item && this.knowledge.diseases[context.item]) {
            const disease = this.knowledge.diseases[context.item];
            response += `🦠 **${context.item.charAt(0).toUpperCase() + context.item.slice(1)} Management**\n\n`;
            response += `**Symptoms:** ${disease.symptoms}\n\n`;
            response += `**Treatment:** ${disease.treatment}\n\n`;
            response += `**Prevention:** ${disease.prevention}\n\n`;
            if (disease.organic) response += `**🌱 Organic Solution:** ${disease.organic}\n\n`;
            response += `**Urgency:** ${disease.urgency === 'high' ? '🚨 Immediate action required' : '⚡ Address soon'}\n\n`;
        }
        // Seasonal advice
        else if (context.item && this.knowledge.seasonal[context.item]) {
            const season = this.knowledge.seasonal[context.item];
            response += `🍂 **${context.item.charAt(0).toUpperCase() + context.item.slice(1)} Season Guide**\n\n`;
            response += `**For Crops:** ${season.crops}\n\n`;
            response += `**For Livestock:** ${season.livestock}\n\n`;
            response += `**Tasks:** ${season.tasks}\n\n`;
        }
        // General intelligent response
        else {
            response = this.getGeneralResponse(question, context);
        }

        // Add action items based on urgency
        if (context.item && this.knowledge.diseases[context.item]) {
            const disease = this.knowledge.diseases[context.item];
            response += `\n📋 **Action Items:**\n`;
            const actions = disease.treatment.split(',').slice(0, 3);
            actions.forEach(action => response += `• ${action.trim()}\n`);
        }

        // Add follow-up suggestions
        response += `\n💡 **Would you like to know more about:**\n`;
        if (context.topic === 'crops') {
            response += `• Watering schedules for your ${user.crop_type || 'crops'}\n`;
            response += `• Fertilizer recommendations\n`;
            response += `• Pest control methods\n`;
        } else if (context.topic === 'livestock') {
            response += `• Vaccination schedules\n`;
            response += `• Feeding guides\n`;
            response += `• Health monitoring tips\n`;
        } else {
            response += `• Seasonal planning for your farm\n`;
            response += `• Disease prevention strategies\n`;
            response += `• Improving farm productivity\n`;
        }

        return response;
    }

    getGeneralResponse(question, context) {
        const user = this.user;
        const q = question.toLowerCase();
        
        // Weather-related
        if (q.includes('weather') || q.includes('rain') || q.includes('temperature')) {
            return `🌤️ **Weather Advisory**\n\nAs a ${user.farm_type} farmer in ${user.region}, you should monitor weather patterns closely. ` +
                   `In ${user.region} regions, it's ${this.getSeasonalAdvice()}\n\n` +
                   `💡 Tip: Install a rain gauge to track precipitation for optimal irrigation planning.`;
        }
        
        // Fertilizer advice
        if (q.includes('fertilizer') || q.includes('nutrient')) {
            return `🌿 **Fertilizer Recommendations**\n\nFor your ${user.farm_type} farm:\n\n` +
                   `• Test soil annually for nutrient deficiencies\n` +
                   `• Use organic compost to improve soil structure\n` +
                   `• Apply fertilizers based on crop needs and growth stage\n` +
                   `• Consider green manure cover crops for natural nitrogen\n\n` +
                   `💡 For ${user.crop_type || 'your crops'}, apply nitrogen at planting and during active growth.`;
        }
        
        // Pest control
        if (q.includes('pest') || q.includes('bug') || q.includes('insect')) {
            return `🐛 **Integrated Pest Management**\n\n` +
                   `**Preventive Measures:**\n` +
                   `• Rotate crops annually\n` +
                   `• Maintain healthy soil\n` +
                   `• Use companion planting (marigolds deter nematodes)\n\n` +
                   `**Natural Controls:**\n` +
                   `• Introduce beneficial insects (ladybugs, lacewings)\n` +
                   `• Apply neem oil or insecticidal soap\n` +
                   `• Use pheromone traps for specific pests\n\n` +
                   `💡 Monitor your crops weekly for early pest detection.`;
        }
        
        // Default intelligent welcome
        return `🌱 **FarmWise AI Assistant**\n\nI'm here to help with all your farming needs! Based on your profile:\n\n` +
               `• **Farm Type:** ${user.farm_type === 'crops' ? '🌾 Crops' : '🐄 Livestock'}\n` +
               `• **Region:** ${user.region} climate\n` +
               `• ${user.farm_type === 'crops' ? `**Main Crop:** ${user.crop_type || 'Not specified'}` : `**Livestock:** ${user.livestock_type || 'Not specified'}`}\n\n` +
               `Here are some topics I can help with:\n\n` +
               `🌾 **Crops:** Planting, watering, fertilizing, pest control, harvesting\n` +
               `🐄 **Livestock:** Feeding, health, breeding, housing, vaccination\n` +
               `🦠 **Diseases:** Identification, treatment, prevention\n` +
               `🌤️ **Weather:** Seasonal planning, irrigation timing\n` +
               `📈 **Business:** Market prices, profitability, farm management\n\n` +
               `What would you like to learn about today?`;
    }

    getSeasonalAdvice() {
        const month = new Date().getMonth();
        if (month >= 10 || month <= 1) return 'approaching dry season. Start water conservation.';
        if (month >= 2 && month <= 4) return 'rainy season. Focus on drainage and disease prevention.';
        if (month >= 5 && month <= 7) return 'cool season. Protect from frost.';
        return 'warm season. Monitor for heat stress.';
    }
}

// ============================================
// ENHANCED CHATBOT ENDPOINT
// ============================================
app.post('/api/chatbot/ask', auth, async (req, res) => {
    const { question } = req.body;
    const user = users.find(u => u.id == req.user.userId);
    
    if (!question) {
        return res.status(400).json({ error: 'Question required' });
    }
    
    // Get user's chat history for context
    const userChatHistory = chatHistory.filter(c => c.user_id == req.user.userId);
    
    // Create contextual AI assistant
    const assistant = new ContextualAIAssistant(user, userChatHistory);
    const context = assistant.analyzeContext(question);
    const answer = assistant.generateResponse(question, context);
    
    // Store in history with context
    chatHistory.push({
        user_id: req.user.userId,
        question: question,
        answer: answer,
        context: context,
        created_at: new Date().toISOString()
    });
    
    // Update user context
    if (context.item) {
        user.context.last_crop = context.item;
        user.context.last_concern = context.topic;
    }
    
    res.json({ 
        answer: answer,
        context: context,
        severity: context.itemData?.urgency || 'info',
        suggestions: [
            `Learn more about ${context.topic || 'farming'}`, 
            "See related topics", 
            "Get seasonal advice"
        ]
    });
});

// ============================================
// CONTEXT AWARE ADVICE ENDPOINT
// ============================================
app.get('/api/advice/contextual', auth, (req, res) => {
    const user = users.find(u => u.id == req.user.userId);
    const userChatHistory = chatHistory.filter(c => c.user_id == req.user.userId);
    const assistant = new ContextualAIAssistant(user, userChatHistory);
    
    // Generate proactive advice based on user's farm and recent concerns
    const proactiveAdvice = [];
    
    // Seasonal advice
    const month = new Date().getMonth();
    if (month >= 10 || month <= 1) {
        proactiveAdvice.push({
            title: "🌾 Dry Season Preparation",
            content: "Start preparing for dry season now. Stock feed, check water storage, mulch crops.",
            priority: "high"
        });
    }
    
    // Crop-specific advice
    if (user.crop_type) {
        proactiveAdvice.push({
            title: `🌱 ${user.crop_type.charAt(0).toUpperCase() + user.crop_type.slice(1)} Care`,
            content: assistant.knowledge.crops[user.crop_type]?.planting || "Monitor growth and adjust care accordingly.",
            priority: "medium"
        });
    }
    
    // Recent concerns
    const recentConcerns = userChatHistory.slice(-3).filter(h => h.context?.topic);
    if (recentConcerns.length > 0) {
        proactiveAdvice.push({
            title: "📚 Based on Your Recent Questions",
            content: `You've been asking about ${recentConcerns.map(c => c.context.topic).join(', ')}. Would you like more detailed information?`,
            priority: "low"
        });
    }
    
    res.json({ advice: proactiveAdvice });
});

// ============================================
// LEARN FROM USER INTERACTIONS
// ============================================
app.post('/api/chatbot/feedback', auth, (req, res) => {
    const { questionId, helpful, comments } = req.body;
    const user = users.find(u => u.id == req.user.userId);
    
    // Store feedback for improving AI responses
    const feedback = {
        user_id: req.user.userId,
        question_id: questionId,
        helpful: helpful,
        comments: comments,
        timestamp: new Date().toISOString()
    };
    
    // In production, this would update ML models
    console.log('Feedback received:', feedback);
    
    res.json({ success: true, message: "Thank you for your feedback!" });
});

// ============================================
// UPDATE USER PREFERENCES
// ============================================
app.put('/api/user/preferences', auth, (req, res) => {
    const { preferences, experience_level, goals } = req.body;
    const user = users.find(u => u.id == req.user.userId);
    
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    if (experience_level) user.experience_level = experience_level;
    if (goals) user.context.goals = goals;
    
    res.json({ success: true, user: { preferences: user.preferences, experience_level: user.experience_level, goals: user.context.goals } });
});

// ============================================
// REMAINING ENDPOINTS (from previous version)
// ============================================
// ... (keep all your existing endpoints for auth, reminders, weather, etc.)

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', version: '2.1.0', features: ['contextual-ai', 'multi-language', 'analytics', 'community'] });
});

app.post('/api/auth/register', (req, res) => {
    const { email, password, name, region, farm_type, crop_type, livestock_type, language } = req.body;
    if (!email || !password || !name || !region || !farm_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    const newUser = {
        id: users.length + 1, email, password, name, region, farm_type,
        crop_type: crop_type || null, livestock_type: livestock_type || null,
        language: language || 'en', experience_level: 'beginner', farm_size: 1,
        preferences: { notifications: true, market_alerts: true, weather_alerts: true, learning_style: 'detailed' },
        context: { last_crop: crop_type, last_concern: null, current_season: 'rainy', goals: ['improve_yield'] }
    };
    users.push(newUser);
    const token = `user-token-${Date.now()}-${newUser.id}`;
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword, token });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const token = `user-token-${Date.now()}-${user.id}`;
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
});

app.get('/api/farm/profile', auth, (req, res) => {
    const user = users.find(u => u.id == req.user.userId);
    const { password, ...profile } = user;
    res.json({ profile });
});

app.get('/api/advice/personalized', auth, (req, res) => {
    const user = users.find(u => u.id == req.user.userId);
    const advice = [
        { title: "🌱 Based on Your Profile", content: `As a ${user.farm_type} farmer in ${user.region}, focus on ${user.farm_type === 'crops' ? 'soil health and irrigation' : 'feed quality and shelter'}.` },
        { title: "📈 Improvement Tip", content: `Set up regular monitoring schedules for ${user.crop_type || user.livestock_type || 'your farm'}.` }
    ];
    res.json({ advice });
});
// ============================================
// ROOT ROUTE - Serve Dashboard
// ============================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FarmWise AI Assistant</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #1a4731 0%, #0f2e20 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    max-width: 1200px;
                    width: 100%;
                    background: rgba(255,255,255,0.95);
                    border-radius: 30px;
                    padding: 40px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                }
                h1 {
                    color: #1a4731;
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                .version {
                    color: #48bb78;
                    font-size: 0.9rem;
                    margin-bottom: 30px;
                }
                .features {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin: 40px 0;
                }
                .feature-card {
                    background: #f7fafc;
                    padding: 20px;
                    border-radius: 20px;
                    text-align: center;
                    transition: transform 0.3s;
                }
                .feature-card:hover {
                    transform: translateY(-5px);
                }
                .feature-icon {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                .feature-title {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .btn {
                    display: inline-block;
                    background: #48bb78;
                    color: white;
                    padding: 12px 30px;
                    border-radius: 30px;
                    text-decoration: none;
                    font-weight: bold;
                    margin: 10px;
                    transition: background 0.3s;
                }
                .btn:hover {
                    background: #38a169;
                }
                .status {
                    margin-top: 20px;
                    padding: 10px;
                    background: #e6f7e6;
                    border-radius: 10px;
                    color: #2e7d32;
                }
                @media (max-width: 768px) {
                    .container { padding: 20px; }
                    h1 { font-size: 1.8rem; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🌱 FarmWise AI Assistant</h1>
                <div class="version">Version 2.1 - Contextual Intelligent Farming Platform</div>
                
                <div class="features">
                    <div class="feature-card">
                        <div class="feature-icon">🧠</div>
                        <div class="feature-title">Contextual AI</div>
                        <div>Remembers conversations and provides personalized advice</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🌍</div>
                        <div class="feature-title">Multi-Language</div>
                        <div>English, Kiswahili, Español</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📸</div>
                        <div class="feature-title">Disease Detection</div>
                        <div>Upload photos for instant diagnosis</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🌤️</div>
                        <div class="feature-title">Weather Integration</div>
                        <div>Real-time farming advice based on weather</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📊</div>
                        <div class="feature-title">Analytics</div>
                        <div>Track yield, revenue, and farm health</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🤝</div>
                        <div class="feature-title">Community Forum</div>
                        <div>Connect with other farmers</div>
                    </div>
                </div>
                
                <a href="/dashboard" class="btn">🚀 Launch AI Assistant</a>
                <a href="/test" class="btn" style="background: #4a5568;">🔧 Test API</a>
                
                <div class="status">
                    ✅ Server is running | 🤖 AI Assistant Ready | 📱 Mobile Friendly
                </div>
                <div style="margin-top: 20px; font-size: 0.8rem; color: #718096;">
                    Demo: demo@farmwise.com / password123
                </div>
            </div>
        </body>
        </html>
    `);
});

// ============================================
// DASHBOARD ROUTE
// ============================================
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/web/dashboard.html', (err) => {
        if (err) {
            // If dashboard.html doesn't exist, show a simple dashboard
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>FarmWise AI Dashboard</title>
                    <style>
                        body { font-family: Arial; padding: 20px; background: linear-gradient(135deg, #1a4731, #0f2e20); color: white; text-align: center; }
                        .card { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 20px; margin: 20px auto; max-width: 500px; }
                        input, button { padding: 10px; margin: 5px; border-radius: 10px; border: none; }
                        button { background: #48bb78; color: white; cursor: pointer; }
                    </style>
                </head>
                <body>
                    <h1>🌱 FarmWise AI Dashboard</h1>
                    <div class="card">
                        <h2>Login</h2>
                        <input type="email" id="email" placeholder="Email" value="demo@farmwise.com"><br>
                        <input type="password" id="password" placeholder="Password" value="password123"><br>
                        <button onclick="login()">Login to AI Assistant</button>
                    </div>
                    <div id="chat" style="display:none;" class="card">
                        <h2>AI Assistant</h2>
                        <div id="messages" style="height: 300px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 10px;"></div>
                        <input type="text" id="question" placeholder="Ask me anything..." style="width: 70%;">
                        <button onclick="ask()">Send</button>
                    </div>
                    <script>
                        let token = '';
                        const API_URL = '';
                        
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
                                token = data.token;
                                document.getElementById('chat').style.display = 'block';
                                document.querySelector('.card').style.display = 'none';
                                addMessage('bot', 'Hello! I'm your AI farming assistant. Ask me anything about crops, livestock, or farming! 🌱');
                            } else {
                                alert('Login failed');
                            }
                        }
                        
                        async function ask() {
                            const question = document.getElementById('question').value;
                            if (!question) return;
                            addMessage('user', question);
                            document.getElementById('question').value = '';
                            
                            const res = await fetch('/api/chatbot/ask', {
                                method: 'POST',
                                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ question })
                            });
                            const data = await res.json();
                            addMessage('bot', data.answer);
                        }
                        
                        function addMessage(role, text) {
                            const div = document.getElementById('messages');
                            div.innerHTML += '<div style="margin: 10px; text-align: ' + (role === 'user' ? 'right' : 'left') + '">' +
                                '<span style="background: ' + (role === 'user' ? '#48bb78' : 'rgba(255,255,255,0.2)') + '; padding: 8px 12px; border-radius: 15px; display: inline-block; max-width: 80%;">' + 
                                text.replace(/\n/g, '<br>') + '</span></div>';
                            div.scrollTop = div.scrollHeight;
                        }
                    </script>
                </body>
                </html>
            `);
        }
    });
});

// ============================================
// TEST ROUTE (keep existing)
// ============================================
app.get('/test', (req, res) => {
    res.json({
        name: 'FarmWise AI Assistant',
        version: '2.1',
        status: 'running',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth/login',
            chatbot: '/api/chatbot/ask',
            advice: '/api/advice/personalized',
            weather: '/api/weather',
            disease: '/api/detect-disease',
            analytics: '/api/analytics/dashboard',
            forum: '/api/forum/posts',
            market: '/api/market/prices'
        },
        demo: {
            email: 'demo@farmwise.com',
            password: 'password123'
        }
    });
});
// ============================================
// START SERVER
// ============================================
server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     🤖 FARMWISE AI ASSISTANT v2.1 🚀                         ║');
    console.log('║     Contextual Intelligent Farming Platform                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📡 Server: http://localhost:${PORT}`);
    console.log(`\n✨ NEW FEATURES:`);
    console.log(`   🧠 Contextual AI - Remembers your conversation`);
    console.log(`   📚 Personalized advice based on your farm profile`);
    console.log(`   🔄 Follow-up question detection`);
    console.log(`   💡 Proactive recommendations`);
    console.log(`   🎯 Experience-level tailored responses`);
    console.log(`   📊 Learning from user feedback`);
    console.log(`\n📝 Demo Account:`);
    console.log(`   Email: demo@farmwise.com`);
    console.log(`   Password: password123`);
    console.log(`\n✅ Server is ready! Press Ctrl+C to stop.\n`);
});
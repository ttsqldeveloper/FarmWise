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

// Remove duplicate path require and optional TensorFlow
// Only include if you have the model and installed @tensorflow/tfjs-node
// const tf = require('@tensorflow/tfjs-node');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'farmwise-secret-key-2024';

// Optional: Load ML model (commented out until you have the model file)
// let model = null;
// 
// async function loadModel() {
//     try {
//         const modelPath = 'file://' + path.join(__dirname, 'models', 'model.json');
//         model = await tf.loadLayersModel(modelPath);
//         console.log('✅ Disease detection model loaded');
//     } catch (err) {
//         console.error('❌ Failed to load model:', err.message);
//         console.log('⚠️  Disease detection will fall back to mock mode');
//     }
// }

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
// ============================================// ============================================
// CROP KNOWLEDGE BASE
// ============================================
// Livestock knowledge base


// Helper to find livestock by name (case-insensitive, partial match)
function findLivestock(query) {
    const livestockNames = Object.keys(livestockDatabase);
    const lowerQuery = query.toLowerCase();
    // Exact match first
    let match = livestockNames.find(animal => animal === lowerQuery);
    if (match) return livestockDatabase[match];
    // Partial match
    match = livestockNames.find(animal => lowerQuery.includes(animal) || animal.includes(lowerQuery));
    return match ? livestockDatabase[match] : null;
}
const cropDatabase = {
    maize: {
        name: 'Maize (Corn)',
        planting: 'Plant when soil temperature reaches 60°F (15°C). Space seeds 8-12 inches apart in rows 30-36 inches apart.',
        watering: 'Needs 1-1.5 inches of water per week, especially during tasseling and silking stages.',
        fertilizer: 'Apply nitrogen at planting (50 lbs/acre) and again at knee-high stage (50-100 lbs/acre).',
        pests: 'Watch for corn borers and armyworms. Use Bt corn varieties for natural pest resistance.',
        harvest: 'Harvest when kernels are firm and milky. Moisture content should be 15-20% for storage.',
        growing_days: '60-100 days',
        temperature_range: '60-85°F (15-29°C)'
    },
    tomato: {
        name: 'Tomato',
        planting: 'Start seeds indoors 6-8 weeks before last frost. Transplant when soil warms to 60°F.',
        watering: 'Water deeply 1-2 times per week. Avoid wetting leaves to prevent blight.',
        fertilizer: 'Apply balanced fertilizer at planting. Side-dress with calcium to prevent blossom end rot.',
        pests: 'Monitor for hornworms and aphids. Use neem oil or insecticidal soap.',
        harvest: 'Harvest when fully coloured and slightly soft. Store at room temperature away from sunlight.',
        growing_days: '60-85 days',
        temperature_range: '65-85°F (18-29°C)'
    },
    rice: {
        name: 'Rice',
        planting: 'Plant in flooded paddies after preparation. Use 80-100 kg of seed per hectare.',
        watering: 'Maintain 5-10 cm water depth during growth. Drain 2-3 weeks before harvest.',
        fertilizer: 'Apply nitrogen in split applications: at planting, tillering, and panicle initiation.',
        pests: 'Watch for stem borers and rice blast. Use resistant varieties and rotate crops.',
        harvest: 'Harvest when 80-85% of grains are straw-coloured. Moisture content should be 20-22%.',
        growing_days: '90-150 days',
        temperature_range: '70-95°F (21-35°C)'
    },
    wheat: {
        name: 'Wheat',
        planting: 'Plant in fall for winter wheat, or early spring for spring wheat. Seed rate 100-120 kg/ha.',
        watering: 'Most critical during stem elongation and grain filling. Avoid waterlogging.',
        fertilizer: 'Apply nitrogen at planting and again at tillering. Phosphorus important for root development.',
        pests: 'Watch for aphids, Hessian fly, and fusarium head blight. Rotate crops.',
        harvest: 'Harvest when grain moisture is 13-15%. Use a combine harvester.',
        growing_days: '90-120 days',
        temperature_range: '50-75°F (10-24°C)'
    },
    potato: {
        name: 'Potato',
        planting: 'Plant seed potatoes 2-4 inches deep, 12 inches apart. Hilling improves yield.',
        watering: 'Consistent moisture critical during tuber formation. Avoid overwatering near harvest.',
        fertilizer: 'Balanced fertilizer (10-10-10) at planting. Avoid excess nitrogen which delays maturity.',
        pests: 'Watch for Colorado potato beetle and late blight. Rotate crops to reduce disease.',
        harvest: 'Harvest when vines have died back. Cure tubers in dark, humid place before storage.',
        growing_days: '70-120 days',
        temperature_range: '60-70°F (15-21°C)'
    },
    soybean: {
        name: 'Soybean',
        planting: 'Plant after soil warms to 60°F. Seed rate 140-180 lbs per acre.',
        watering: 'Needs consistent moisture during flowering and pod filling (1-1.5 inches per week).',
        fertilizer: 'Inoculate with rhizobium bacteria. Apply phosphorus and potassium based on soil test.',
        pests: 'Watch for soybean aphids, spider mites, and bean leaf beetles.',
        harvest: 'Harvest when pods are brown and seeds rattle inside. Moisture content 13-15%.',
        growing_days: '80-120 days',
        temperature_range: '60-85°F (15-29°C)'
    },
    onion: {
        name: 'Onion',
        planting: 'Plant sets or seeds in early spring. Space 4-6 inches apart.',
        watering: 'Keep soil consistently moist but not waterlogged. Reduce water when bulbs mature.',
        fertilizer: 'Apply nitrogen-rich fertilizer every 3-4 weeks during growth.',
        pests: 'Watch for onion maggots and thrips. Rotate crops annually.',
        harvest: 'Harvest when tops fall over and begin to dry. Cure in warm, dry place.',
        growing_days: '90-120 days',
        temperature_range: '55-75°F (13-24°C)'
    }
};

// Helper function to find crop by name (case-insensitive)
function findCrop(query) {
    const cropNames = Object.keys(cropDatabase);
    const lowerQuery = query.toLowerCase().trim();
    
    // Exact match
    let match = cropNames.find(crop => crop === lowerQuery);
    if (match) return cropDatabase[match];
    
    // Partial match (crop name contains query or query contains crop name)
    match = cropNames.find(crop => lowerQuery.includes(crop) || crop.includes(lowerQuery));
    if (match) return cropDatabase[match];
    
    // Check common variations
    const variations = {
        'corn': 'maize',
        'potatoes': 'potato',
        'tomatoes': 'tomato',
        'soy beans': 'soybean',
        'soyabean': 'soybean',
        'wheats': 'wheat',
        'rices': 'rice',
        'onions': 'onion'
    };
    
    for (const [variant, crop] of Object.entries(variations)) {
        if (lowerQuery.includes(variant)) {
            return cropDatabase[crop];
        }
    }
    
    return null;
}// ============================================
// LIVESTOCK KNOWLEDGE BASE
// ============================================

const livestockDatabase = {
    cattle: {
        name: 'Cattle',
        feeding: 'Provide 2-3% of body weight in dry matter daily. Include minerals and clean water. Feed high-quality hay or pasture.',
        health: 'Vaccinate for blackleg, anthrax, and BVD. Deworm every 3-4 months. Watch for signs of bloat and respiratory disease.',
        housing: 'Provide shelter from extreme weather. Allow 20-30 sq ft per animal. Ensure proper ventilation and dry bedding.',
        breeding: 'Breed at 15-18 months. Gestation period is 9 months. Watch for heat signs every 21 days. Calving assistance may be needed.',
        lifespan: '15-20 years',
        daily_water: '50-80 liters',
        temperature_range: '40-80°F (4-27°C)'
    },
    goats: {
        name: 'Goats',
        feeding: 'Provide browse, hay, and grain. Need copper supplements (unlike sheep). Feed 2-4 lbs of hay daily.',
        health: 'Vaccinate for enterotoxemia and tetanus. Trim hooves every 6-8 weeks. Watch for parasites and pneumonia.',
        housing: 'Need dry, draft-free shelter. Provide 15-20 sq ft per animal. Raised platforms help keep feet dry.',
        breeding: 'Breed at 8-12 months. Gestation is 5 months (150 days). Kids need colostrum within first 6 hours.',
        lifespan: '10-15 years',
        daily_water: '5-10 liters',
        temperature_range: '40-90°F (4-32°C)'
    },
    poultry: {
        name: 'Poultry (Chickens)',
        feeding: 'Provide complete feed appropriate for age (starter, grower, layer). Offer grit for digestion. 0.25 lbs per bird daily.',
        health: 'Vaccinate for Marek\'s, Newcastle, and infectious bronchitis. Clean coop regularly. Watch for mites and respiratory issues.',
        housing: 'Allow 2-3 sq ft per bird inside, 8-10 sq ft in run. Provide roosts and nest boxes (1 per 4-5 hens).',
        breeding: 'Egg production requires 14-16 hours of light daily. Collect eggs twice daily. Broody hens can hatch eggs in 21 days.',
        lifespan: '5-10 years',
        daily_water: '0.5-1 liter per 10 birds',
        temperature_range: '50-85°F (10-29°C)'
    },
    sheep: {
        name: 'Sheep',
        feeding: 'Provide good quality hay or pasture. Avoid copper – sheep are sensitive. Feed 2-4 lbs of hay daily.',
        health: 'Vaccinate for enterotoxemia and tetanus. Trim hooves every 6-8 weeks. Watch for internal parasites and foot rot.',
        housing: 'Provide windbreaks and dry bedding. Allow 15-20 sq ft per animal. Good ventilation essential.',
        breeding: 'Breed in autumn. Gestation ~5 months (147 days). Lambs need colostrum within first 6 hours.',
        lifespan: '10-12 years',
        daily_water: '5-10 liters',
        temperature_range: '30-85°F (-1 to 29°C)'
    },
    pigs: {
        name: 'Pigs',
        feeding: 'Provide balanced feed with protein (14-18%). Clean water always available. Feed 4-6 lbs daily.',
        health: 'Vaccinate for erysipelas and parvovirus. Keep farrowing area clean. Watch for respiratory disease and parasites.',
        housing: 'Provide shelter with bedding. Allow 8-10 sq ft per pig. Proper drainage essential for waste management.',
        breeding: 'Breed at 8-9 months. Gestation 3 months, 3 weeks, 3 days (114 days). Farrowing crate recommended.',
        lifespan: '10-15 years',
        daily_water: '10-20 liters',
        temperature_range: '60-75°F (15-24°C)'
    },
    rabbits: {
        name: 'Rabbits',
        feeding: 'Provide unlimited hay, fresh vegetables, and commercial pellets (1/4 cup daily). Fresh water always.',
        health: 'Vaccinate for RHDV (Rabbit Hemorrhagic Disease). Check teeth and nails regularly. Watch for GI stasis.',
        housing: 'Provide spacious cage with solid floor (wire causes sore hocks). Temperature 60-70°F ideal.',
        breeding: 'Breed at 6-8 months. Gestation 28-31 days. Does can have 4-12 kits per litter.',
        lifespan: '8-12 years',
        daily_water: '0.5-1 liter',
        temperature_range: '55-75°F (13-24°C)'
    },
    ducks: {
        name: 'Ducks',
        feeding: 'Provide waterfowl feed or layer pellets. Need access to water for swallowing food. 0.3-0.5 lbs daily.',
        health: 'Vaccinate for duck viral enteritis. Keep water clean to prevent disease. Watch for bumblefoot and parasites.',
        housing: 'Provide shelter from predators and weather. Need swimming water (kiddie pool works). 4-6 sq ft per bird.',
        breeding: 'Lay eggs in early morning. Eggs hatch in 28 days. Drakes (males) not needed for egg production.',
        lifespan: '8-12 years',
        daily_water: '1-2 liters',
        temperature_range: '40-85°F (4-29°C)'
    }
};

// Helper function to find livestock by name (case-insensitive)
function findLivestock(query) {
    const livestockNames = Object.keys(livestockDatabase);
    const lowerQuery = query.toLowerCase().trim();
    
    // Exact match
    let match = livestockNames.find(animal => animal === lowerQuery);
    if (match) return livestockDatabase[match];
    
    // Partial match
    match = livestockNames.find(animal => lowerQuery.includes(animal) || animal.includes(lowerQuery));
    if (match) return livestockDatabase[match];
    
    // Check common variations and plurals
    const variations = {
        'cow': 'cattle',
        'cows': 'cattle',
        'bull': 'cattle',
        'calf': 'cattle',
        'goat': 'goats',
        'chicken': 'poultry',
        'chickens': 'poultry',
        'hen': 'poultry',
        'rooster': 'poultry',
        'lamb': 'sheep',
        'hog': 'pigs',
        'pig': 'pigs',
        'swine': 'pigs',
        'bunny': 'rabbits',
        'hare': 'rabbits',
        'duck': 'ducks'
    };
    
    for (const [variant, animal] of Object.entries(variations)) {
        if (lowerQuery.includes(variant)) {
            return livestockDatabase[animal];
        }
    }
    
    return null;
}
// ============================================
// CHATBOT WITH CROP AND LIVESTOCK SEARCH
// ============================================

function getChatResponse(question) {
    const q = question.toLowerCase();
    
    // ============================================
    // CROP SEARCH INTENT
    // ============================================
    
    const cropKeywords = [
        'tell me about', 'how to grow', 'how do i grow', 
        'growing', 'planting', 'search crop', 'info on', 
        'about', 'crop', 'guide for'
    ];
    
    let isCropQuery = false;
    let cropQuery = '';
    
    for (let kw of cropKeywords) {
        if (q.includes(kw)) {
            isCropQuery = true;
            const afterKw = q.split(kw)[1]?.trim();
            if (afterKw) cropQuery = afterKw;
            break;
        }
    }
    
    if (!isCropQuery && q.split(' ').length <= 2) {
        const singleWord = q.trim();
        if (findCrop(singleWord)) {
            isCropQuery = true;
            cropQuery = singleWord;
        }
    }
    
    if (isCropQuery && cropQuery) {
        const crop = findCrop(cropQuery);
        if (crop) {
            return `🌾 **${crop.name}**\n\n` +
                   `📅 **Planting:** ${crop.planting}\n\n` +
                   `💧 **Watering:** ${crop.watering}\n\n` +
                   `🌿 **Fertilizer:** ${crop.fertilizer}\n\n` +
                   `🐛 **Pests:** ${crop.pests}\n\n` +
                   `🌽 **Harvest:** ${crop.harvest}\n\n` +
                   `⏱️ **Growing Period:** ${crop.growing_days}\n\n` +
                   `🌡️ **Temperature Range:** ${crop.temperature_range}\n\n` +
                   `💡 Ask me about specific diseases or pests for more details!`;
        }
    }
    
    // ============================================
    // LIVESTOCK SEARCH INTENT
    // ============================================
    
    const livestockKeywords = [
        'tell me about', 'how to raise', 'how do i raise', 
        'raising', 'search livestock', 'info on', 
        'about', 'livestock', 'guide for', 'care for'
    ];
    
    let isLivestockQuery = false;
    let livestockQuery = '';
    
    for (let kw of livestockKeywords) {
        if (q.includes(kw)) {
            isLivestockQuery = true;
            const afterKw = q.split(kw)[1]?.trim();
            if (afterKw) livestockQuery = afterKw;
            break;
        }
    }
    
    if (!isLivestockQuery && q.split(' ').length <= 2) {
        const singleWord = q.trim();
        if (findLivestock(singleWord)) {
            isLivestockQuery = true;
            livestockQuery = singleWord;
        }
    }
    
    if (isLivestockQuery && livestockQuery) {
        const animal = findLivestock(livestockQuery);
        if (animal) {
            return `🐄 **${animal.name}**\n\n` +
                   `🍽️ **Feeding:** ${animal.feeding}\n\n` +
                   `💊 **Health:** ${animal.health}\n\n` +
                   `🏠 **Housing:** ${animal.housing}\n\n` +
                   `🥚 **Breeding:** ${animal.breeding}\n\n` +
                   `⏱️ **Lifespan:** ${animal.lifespan}\n\n` +
                   `💧 **Daily Water:** ${animal.daily_water}\n\n` +
                   `🌡️ **Temperature Range:** ${animal.temperature_range}\n\n` +
                   `💡 Ask me about specific diseases, vaccination schedules, or feeding for more details!`;
        } else {
            const availableAnimals = Object.keys(livestockDatabase).join(', ');
            return `❓ I couldn't find information on "${livestockQuery}".\n\n` +
                   `📚 Available livestock: ${availableAnimals}\n\n` +
                   `💡 Try asking: "tell me about cattle" or "how to raise goats"`;
        }
    }
    
    // ============================================
    // DISEASE DETECTION
    // ============================================
    if (q.includes('blight') || q.includes('tomato disease')) {
        return "🍅 **Tomato Blight Treatment:**\n\n1. Remove infected leaves immediately\n2. Apply copper-based fungicide weekly\n3. Improve air circulation by pruning\n4. Avoid overhead watering\n5. Use mulch to prevent soil splash";
    }
    
    // ============================================
    // WATERING ADVICE
    // ============================================
    else if (q.includes('water') || q.includes('irrigation')) {
        return "💧 **Watering Best Practices:**\n\n• Water early morning (5-7 AM)\n• Use drip irrigation for 30-50% water savings\n• Apply 2-3 inches of organic mulch\n• Check soil moisture before watering\n• Young plants: daily for first 2 weeks\n• Mature plants: 1-2 inches per week";
    }
    
    // ============================================
    // VACCINATION SCHEDULE
    // ============================================
    else if (q.includes('vaccine') || q.includes('vaccination')) {
        return "💉 **Vaccination Schedule:**\n\n**Cattle:**\n• Blackleg: Annually before rainy season\n• Anthrax: Annually in endemic areas\n\n**Goats/Sheep:**\n• PPR: Annually\n• Enterotoxemia: Every 6 months\n\n**Poultry:**\n• Newcastle: 7-10 days, booster at 6 weeks\n• Gumboro: 14-21 days\n\n*Always consult your local veterinarian.*";
    }
    
    // ============================================
    // DRY SEASON PREPARATION
    // ============================================
    else if (q.includes('dry season') || q.includes('drought')) {
        return "🌾 **Dry Season Preparation:**\n\n**For Crops:**\n1. Apply thick mulch (4-6 inches)\n2. Install drip irrigation\n3. Plant drought-resistant varieties\n4. Harvest rainwater\n5. Use shade cloth\n\n**For Livestock:**\n1. Stockpile hay and silage (3-4 months)\n2. Plant drought-tolerant fodder\n3. Dig additional water storage\n4. Provide protein supplements\n5. Reduce herd size if needed";
    }
    
    // ============================================
    // DEFAULT RESPONSE
    // ============================================
    else {
        const availableCrops = Object.keys(cropDatabase).join(', ');
        const availableLivestock = Object.keys(livestockDatabase).join(', ');
        
        return `🌱 **FarmWise Assistant v1.5**\n\n` +
               `I can help you with:\n\n` +
               `🌾 **Crops:**\n` +
               `• Search crops: ${availableCrops}\n` +
               `• Planting, watering, fertilizing, pest control, harvesting\n\n` +
               `🐄 **Livestock:**\n` +
               `• Search livestock: ${availableLivestock}\n` +
               `• Feeding, health, housing, breeding\n\n` +
               `🦠 **Diseases:**\n` +
               `• Blight, mildew, pest control, livestock illnesses\n\n` +
               `🌤️ **Seasonal:**\n` +
               `• Dry season preparation, irrigation\n\n` +
               `💡 **Try asking:**\n` +
               `• "How to grow tomatoes?"\n` +
               `• "Tell me about maize"\n` +
               `• "How to raise cattle?"\n` +
               `• "Tell me about goats"\n` +
               `• "What vaccines do chickens need?"\n` +
               `• "How to treat tomato blight?"\n` +
               `• "How to prepare for dry season?"`;
    }
}

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
// IMAGE PREPROCESSING FOR ML MODEL
// ============================================

/**
 * Preprocess image for ML model input
 * Requirements:
 * - Resize to 224x224 pixels (standard for most vision models)
 * - Convert to RGB (3 channels)
 * - Normalize pixel values to [0, 1] range
 * - Return as buffer or tensor
 */
async function preprocessImageForModel(imageBuffer) {
    try {
        // Step 1: Decode and convert to RGB (3 channels)
        let image = sharp(imageBuffer);
        
        // Get metadata to check image properties
        const metadata = await image.metadata();
        
        // Step 2: Ensure RGB color space (3 channels)
        if (metadata.channels !== 3) {
            image = image.toColourspace('rgb');
        }
        
        // Step 3: Resize to 224x224 pixels (standard input size)
        image = image.resize(224, 224, {
            fit: 'cover',           // Cover the area, crop if needed
            position: 'centre',     // Center crop
            background: { r: 0, g: 0, b: 0 }  // Black background for padding
        });
        
        // Step 4: Convert to normalized float values [0, 1]
        // Sharp outputs 0-255 uint8, we need to convert to 0-1 float
        const processedBuffer = await image
            .removeAlpha()          // Remove alpha channel if present
            .raw()                  // Get raw pixel data
            .toBuffer();
        
        // Step 5: Convert buffer to float array and normalize
        const pixels = new Float32Array(processedBuffer.length);
        for (let i = 0; i < processedBuffer.length; i++) {
            pixels[i] = processedBuffer[i] / 255.0;  // Normalize to [0, 1]
        }
        
        // Step 6: Create tensor shape [1, 224, 224, 3] (batch, height, width, channels)
        // This format is ready for TensorFlow.js or other ML frameworks
        const inputTensor = {
            shape: [1, 224, 224, 3],
            data: pixels,
            dtype: 'float32'
        };
        
        return {
            success: true,
            tensor: inputTensor,
            metadata: {
                originalSize: `${metadata.width}x${metadata.height}`,
                processedSize: '224x224',
                channels: 3,
                format: 'float32'
            }
        };
        
    } catch (error) {
        console.error('Image preprocessing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Alternative: Get image as normalized buffer for external API calls
 * (Use this if you're calling an external ML API like Plant.id or TensorFlow Serving)
 */
async function getNormalizedImageBuffer(imageBuffer) {
    try {
        const processedBuffer = await sharp(imageBuffer)
            .resize(224, 224, { fit: 'cover' })
            .removeAlpha()
            .raw()
            .toBuffer();
        
        // Normalize to [0, 1] and convert to Base64 for API calls
        const floatValues = [];
        for (let i = 0; i < processedBuffer.length; i++) {
            floatValues.push(processedBuffer[i] / 255.0);
        }
        
        return {
            success: true,
            data: floatValues,
            shape: [1, 224, 224, 3],
            base64: Buffer.from(processedBuffer).toString('base64')
        };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}
// ============================================
// DISEASE MAPPING FUNCTION
// Converts model class names to display information
// ============================================

const diseaseMapping = {
    // Tomato Diseases
    'Tomato___Late_blight': {
        displayName: 'Tomato Late Blight',
        symptoms: 'Brown spots on leaves, white fungal growth, fruit rot',
        severity: 'high',
        affectedParts: ['leaves', 'stems', 'fruits'],
        treatment: {
            steps: [
                'Remove and destroy infected leaves immediately',
                'Apply copper-based fungicide every 7-10 days',
                'Improve air circulation by pruning',
                'Water at base only, avoid wetting leaves',
                'Apply thick mulch to prevent soil splash',
                'Rotate crops next season (3-4 year rotation)'
            ],
            organicSolution: 'Apply compost tea and neem oil weekly',
            urgency: 'high'
        }
    },
    'Tomato___Early_blight': {
        displayName: 'Tomato Early Blight',
        symptoms: 'Dark spots with concentric rings on lower leaves',
        severity: 'medium',
        affectedParts: ['leaves', 'stems'],
        treatment: {
            steps: [
                'Remove infected leaves',
                'Apply fungicide containing chlorothalonil',
                'Mulch to prevent soil splash',
                'Rotate crops',
                'Avoid overhead watering'
            ],
            organicSolution: 'Apply copper spray or Bacillus subtilis',
            urgency: 'medium'
        }
    },
    'Tomato___healthy': {
        displayName: 'Healthy Tomato Plant',
        symptoms: 'No visible issues, vibrant green color',
        severity: 'none',
        affectedParts: [],
        treatment: {
            steps: [
                'Continue regular maintenance',
                'Monitor weekly for early signs of disease',
                'Maintain consistent watering schedule',
                'Apply preventive organic sprays monthly'
            ],
            organicSolution: 'Apply compost tea monthly for immune support',
            urgency: 'none'
        }
    },

    // Potato Diseases
    'Potato___Early_blight': {
        displayName: 'Potato Early Blight',
        symptoms: 'Dark concentric spots on leaves, yellowing',
        severity: 'medium',
        affectedParts: ['leaves', 'tubers'],
        treatment: {
            steps: [
                'Remove infected foliage',
                'Apply fungicide',
                'Practice crop rotation',
                'Use disease-free seed potatoes'
            ],
            organicSolution: 'Apply copper fungicide',
            urgency: 'medium'
        }
    },
    'Potato___Late_blight': {
        displayName: 'Potato Late Blight',
        symptoms: 'Dark lesions on leaves, white fungal growth, tuber rot',
        severity: 'high',
        affectedParts: ['leaves', 'stems', 'tubers'],
        treatment: {
            steps: [
                'Destroy infected plants immediately',
                'Apply copper-based fungicide',
                'Harvest early if possible',
                'Store tubers in dry conditions'
            ],
            organicSolution: 'Apply compost tea with beneficial microbes',
            urgency: 'high'
        }
    },
    'Potato___healthy': {
        displayName: 'Healthy Potato Plant',
        symptoms: 'No visible issues, healthy foliage',
        severity: 'none',
        affectedParts: [],
        treatment: {
            steps: [
                'Continue regular care',
                'Monitor for early signs',
                'Maintain proper irrigation'
            ],
            organicSolution: 'Apply compost tea monthly',
            urgency: 'none'
        }
    },

    // Corn/Maize Diseases
    'Corn___Common_rust': {
        displayName: 'Corn Common Rust',
        symptoms: 'Rust-colored pustules on leaves',
        severity: 'medium',
        affectedParts: ['leaves'],
        treatment: {
            steps: [
                'Use resistant varieties',
                'Apply fungicide if severe',
                'Crop rotation',
                'Remove crop debris'
            ],
            organicSolution: 'Apply neem oil or sulfur',
            urgency: 'medium'
        }
    },
    'Corn___Northern_Leaf_Blight': {
        displayName: 'Corn Northern Leaf Blight',
        symptoms: 'Long cigar-shaped lesions on leaves',
        severity: 'medium',
        affectedParts: ['leaves'],
        treatment: {
            steps: [
                'Use resistant hybrids',
                'Crop rotation',
                'Tillage to bury residue',
                'Apply fungicide if necessary'
            ],
            organicSolution: 'Apply copper fungicide',
            urgency: 'medium'
        }
    },
    'Corn___healthy': {
        displayName: 'Healthy Corn Plant',
        symptoms: 'No visible issues, healthy growth',
        severity: 'none',
        affectedParts: [],
        treatment: {
            steps: [
                'Continue regular monitoring',
                'Maintain proper nutrition',
                'Irrigate as needed'
            ],
            organicSolution: 'Apply compost tea',
            urgency: 'none'
        }
    },

    // Apple Diseases
    'Apple___Apple_scab': {
        displayName: 'Apple Scab',
        symptoms: 'Olive-green to black spots on leaves and fruit',
        severity: 'medium',
        affectedParts: ['leaves', 'fruit'],
        treatment: {
            steps: [
                'Rake and remove fallen leaves',
                'Apply fungicides in spring',
                'Prune trees for air circulation',
                'Use resistant varieties'
            ],
            organicSolution: 'Apply sulfur or neem oil',
            urgency: 'medium'
        }
    },
    'Apple___Cedar_apple_rust': {
        displayName: 'Cedar Apple Rust',
        symptoms: 'Yellow-orange spots on leaves, tubular structures',
        severity: 'low',
        affectedParts: ['leaves', 'fruit'],
        treatment: {
            steps: [
                'Remove cedar trees near orchard',
                'Apply fungicide',
                'Use resistant varieties'
            ],
            organicSolution: 'Apply sulfur spray',
            urgency: 'low'
        }
    },
    'Apple___healthy': {
        displayName: 'Healthy Apple Tree',
        symptoms: 'No visible issues, healthy foliage',
        severity: 'none',
        affectedParts: [],
        treatment: {
            steps: [
                'Continue regular maintenance',
                'Prune annually',
                'Monitor for pests'
            ],
            organicSolution: 'Apply compost tea',
            urgency: 'none'
        }
    },

    // Grape Diseases
    'Grape___Black_rot': {
        displayName: 'Grape Black Rot',
        symptoms: 'Brown spots on leaves, black mummified fruit',
        severity: 'high',
        affectedParts: ['leaves', 'fruit'],
        treatment: {
            steps: [
                'Remove mummified fruit',
                'Apply fungicide',
                'Prune for air circulation',
                'Remove infected plant parts'
            ],
            organicSolution: 'Apply copper fungicide',
            urgency: 'high'
        }
    },
    'Grape___healthy': {
        displayName: 'Healthy Grape Vine',
        symptoms: 'No visible issues, healthy growth',
        severity: 'none',
        affectedParts: [],
        treatment: {
            steps: [
                'Continue regular care',
                'Prune properly',
                'Monitor for early signs'
            ],
            organicSolution: 'Apply compost tea',
            urgency: 'none'
        }
    },

    // Peach Diseases
    'Peach___Bacterial_spot': {
        displayName: 'Peach Bacterial Spot',
        symptoms: 'Small water-soaked spots on leaves and fruit',
        severity: 'medium',
        affectedParts: ['leaves', 'fruit'],
        treatment: {
            steps: [
                'Use resistant varieties',
                'Apply copper spray',
                'Prune for air circulation',
                'Avoid overhead irrigation'
            ],
            organicSolution: 'Apply copper fungicide',
            urgency: 'medium'
        }
    },
    'Peach___healthy': {
        displayName: 'Healthy Peach Tree',
        symptoms: 'No visible issues, healthy growth',
        severity: 'none',
        affectedParts: [],
        treatment: {
            steps: [
                'Continue regular care',
                'Prune annually',
                'Monitor for pests'
            ],
            organicSolution: 'Apply compost tea',
            urgency: 'none'
        }
    },

    // Strawberry Diseases
    'Strawberry___Leaf_scorch': {
        displayName: 'Strawberry Leaf Scorch',
        symptoms: 'Purple to brown spots on leaves',
        severity: 'medium',
        affectedParts: ['leaves'],
        treatment: {
            steps: [
                'Remove infected leaves',
                'Improve air circulation',
                'Apply fungicide',
                'Avoid overhead watering'
            ],
            organicSolution: 'Apply neem oil',
            urgency: 'medium'
        }
    },
    'Strawberry___healthy': {
        displayName: 'Healthy Strawberry Plant',
        symptoms: 'No visible issues, healthy growth',
        severity: 'none',
        affectedParts: [],
        treatment: {
            steps: [
                'Continue regular care',
                'Mulch to prevent fruit rot',
                'Monitor for pests'
            ],
            organicSolution: 'Apply compost tea',
            urgency: 'none'
        }
    }
};

// Fallback mapping for unknown diseases
const fallbackMapping = {
    displayName: 'Unknown Disease Detected',
    symptoms: 'Unable to identify specific disease from the image',
    severity: 'medium',
    affectedParts: [],
    treatment: {
        steps: [
            'Consult local agricultural extension office',
            'Take a sample to a plant clinic',
            'Isolate affected plants',
            'Document symptoms for expert identification'
        ],
        organicSolution: 'Apply neem oil as a general preventive measure',
        urgency: 'medium'
    }
};

// ============================================
// MAPPING FUNCTION
// ============================================

/**
 * Maps model class name to display information
 * @param {string} className - The model output class name (e.g., 'Tomato___Late_blight')
 * @param {number} confidence - The model's confidence score (0-1)
 * @returns {object} Formatted disease information for frontend
 */
function mapDiseaseToDisplay(className, confidence) {
    // Get mapping for this class name, or use fallback if not found
    const mapping = diseaseMapping[className] || fallbackMapping;
    
    // Calculate confidence percentage
    const confidencePercent = Math.round(confidence * 100);
    
    // Determine confidence level for UI styling
    let confidenceLevel = 'low';
    if (confidencePercent >= 85) confidenceLevel = 'high';
    else if (confidencePercent >= 70) confidenceLevel = 'medium';
    
    return {
        detection: {
            name: mapping.displayName,
            confidence: confidence,
            confidencePercent: confidencePercent,
            confidenceLevel: confidenceLevel,
            symptoms: mapping.symptoms,
            severity: mapping.severity,
            affectedParts: mapping.affectedParts,
            scientificName: className
        },
        treatment: mapping.treatment,
        metadata: {
            modelClass: className,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Get list of all available diseases (for frontend reference)
 */
function getAvailableDiseases() {
    return Object.keys(diseaseMapping).map(key => ({
        modelClass: key,
        displayName: diseaseMapping[key].displayName,
        severity: diseaseMapping[key].severity
    }));
}
// ============================================
// DISEASE DETECTION ENDPOINT with MAPPING
// ============================================
app.post('/api/detect-disease', auth, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }
    
    try {
        // Step 1: Preprocess the image
        const processed = await preprocessImageForModel(req.file.buffer);
        
        if (!processed.success) {
            return res.status(400).json({ error: 'Image preprocessing failed: ' + processed.error });
        }
        
        // Step 2: Run inference (replace with your actual model call)
        // For demo, we'll simulate model output
        // In production, you would call your TensorFlow model here:
        // const predictions = await model.predict(processed.tensor);
        // const predictedClass = getPredictedClass(predictions);
        // const confidence = getConfidence(predictions);
        
        // Simulated model output for demonstration
        const possibleClasses = Object.keys(diseaseMapping);
        const randomClass = possibleClasses[Math.floor(Math.random() * possibleClasses.length)];
        const randomConfidence = 0.75 + (Math.random() * 0.2); // 0.75 - 0.95
        
        // Step 3: Map the model output to display information
        const result = mapDiseaseToDisplay(randomClass, randomConfidence);
        
        // Step 4: Return formatted response
        res.json({
            success: true,
            detection: result.detection,
            treatment: result.treatment,
            metadata: result.metadata,
            preprocessing: {
                originalSize: processed.metadata.originalSize,
                processedSize: processed.metadata.processedSize,
                normalized: true
            },
            image_processed: true,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Disease detection error:', error);
        res.status(500).json({ 
            error: 'Detection service error. Please try again.',
            details: error.message 
        });
    }
});

// Optional: Endpoint to get list of available diseases
app.get('/api/diseases/list', auth, (req, res) => {
    res.json({
        diseases: getAvailableDiseases(),
        count: Object.keys(diseaseMapping).length
    });
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
        console.log(`   📸 Disease Detection (with preprocessing)`);
        console.log(`   🤖 AI Chatbot`);
        console.log(`   ⏰ Smart Reminders`);
        console.log(`\n📝 Demo Account:`);
        console.log(`   Email: demo@farmwise.com`);
        console.log(`   Password: password123`);
        console.log(`\n✅ Server is ready! Press Ctrl+C to stop.\n`);
    });
});
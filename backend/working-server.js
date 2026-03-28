const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('web')); // Serve static files from web folder

// Store users
const users = [
    { id: 1, email: 'demo@farmwise.com', password: 'password123', name: 'Demo Farmer' }
];

// Store conversation history for context
let conversationHistory = [];

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'FarmWise AI v2.1 is running!', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = `user-token-${Date.now()}-${user.id}`;
    res.json({ 
        user: { id: user.id, email: user.email, name: user.name },
        token 
    });
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    const newUser = {
        id: users.length + 1,
        email,
        password,
        name: name || 'Farmer'
    };
    users.push(newUser);
    
    const token = `user-token-${Date.now()}-${newUser.id}`;
    res.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name }, token });
});

// Contextual AI Chatbot
app.post('/api/chatbot/ask', (req, res) => {
    const { question } = req.body;
    const q = question.toLowerCase();
    
    // Check context from previous conversation
    const lastQuestion = conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].question : '';
    const isFollowUp = lastQuestion && (q.includes('and') || q.includes('also') || q.includes('then') || q.includes('what about') || q.includes('how about'));
    
    let answer = '';
    
    // Tomato Blight
    if (q.includes('blight') || (q.includes('tomato') && q.includes('disease'))) {
        answer = `🍅 **Tomato Blight Treatment**\n\n**Symptoms:** Brown spots on leaves, white fungal growth, fruit rot\n\n**Treatment:**\n1. Remove infected leaves immediately\n2. Apply copper-based fungicide weekly\n3. Improve air circulation by pruning\n4. Avoid overhead watering\n5. Use mulch to prevent soil splash\n\n**Prevention:** Plant resistant varieties and rotate crops yearly.\n\n💡 Would you like to know about watering tomatoes?`;
    }
    // Powdery Mildew
    else if (q.includes('powdery mildew') || (q.includes('mildew'))) {
        answer = `🌿 **Powdery Mildew Treatment**\n\n**Symptoms:** White powdery spots on leaves, stunted growth\n\n**Treatment:**\n1. Apply neem oil or sulfur-based fungicide\n2. Remove severely infected leaves\n3. Increase air circulation through pruning\n4. Avoid high-nitrogen fertilizers\n5. Water plants in morning only\n\n**Organic Solution:** Mix 1 tbsp baking soda + 1 tsp soap in 1 gallon water, spray weekly.`;
    }
    // Watering (context-aware)
    else if (q.includes('water') || q.includes('irrigation') || q.includes('watering')) {
        if (lastQuestion.includes('tomato') || isFollowUp) {
            answer = `💧 **Tomato Watering Guide**\n\nSince you were asking about tomatoes:\n\n• Water deeply 1-2 times per week\n• Water at the base, not on leaves\n• Use drip irrigation for best results\n• Mulch to retain moisture\n• Water early morning (5-7 AM)\n\n💡 This helps prevent blight and other fungal diseases!`;
        } else {
            answer = `💧 **General Watering Tips**\n\n• Water early morning (5-7 AM) to reduce evaporation\n• Use drip irrigation for 30-50% water savings\n• Apply 2-3 inches of organic mulch\n• Check soil moisture 2 inches deep before watering\n• Young plants: daily for first 2 weeks\n• Mature plants: 1-2 inches per week`;
        }
    }
    // Vaccination
    else if (q.includes('vaccine') || q.includes('vaccination')) {
        answer = `💉 **Vaccination Schedule**\n\n**Cattle:**\n• Blackleg: Annually before rainy season\n• Anthrax: Annually in endemic areas\n\n**Goats/Sheep:**\n• PPR: Annually\n• Enterotoxemia: Every 6 months\n\n**Poultry:**\n• Newcastle: 7-10 days, booster at 6 weeks\n• Gumboro: 14-21 days\n\n*Always consult your local veterinarian.*`;
    }
    // Dry Season
    else if (q.includes('dry season') || q.includes('drought')) {
        answer = `🌾 **Dry Season Preparation**\n\n**For Crops:**\n1. Apply thick mulch (4-6 inches)\n2. Install drip irrigation\n3. Plant drought-resistant varieties\n4. Harvest rainwater\n5. Use shade cloth\n\n**For Livestock:**\n1. Stockpile hay and silage (3-4 months)\n2. Plant drought-tolerant fodder\n3. Dig additional water storage\n4. Provide protein supplements\n5. Reduce herd size if needed`;
    }
    // Pest Control
    else if (q.includes('pest') || q.includes('bug') || q.includes('insect')) {
        answer = `🐛 **Natural Pest Control**\n\n**Organic Solutions:**\n• Neem oil: Effective against aphids, mites, and fungus\n• Diatomaceous earth: For crawling insects\n• Companion planting: Marigolds deter nematodes\n• Beneficial insects: Ladybugs eat aphids\n\n**Prevention:**\n• Rotate crops annually\n• Maintain healthy soil\n• Remove infected plants immediately\n• Use row covers for protection`;
    }
    // Animal Health
    else if (q.includes('signs of sickness') || q.includes('sick animal') || q.includes('disease symptoms')) {
        answer = `🚨 **Signs of Sick Animals**\n\n**Common Symptoms:**\n• Lethargy and reduced activity\n• Loss of appetite\n• Isolation from herd/flock\n• Fever or abnormal temperature\n• Diarrhea or unusual discharge\n• Coughing or breathing difficulty\n• Sunken eyes (dehydration)\n\n**When to Call Vet:**\n• Symptoms persist >24 hours\n• Multiple animals affected\n• Severe signs like bloating\n• Sudden death in flock`;
    }
    // Storage
    else if (q.includes('store') || q.includes('preserve') || q.includes('storage')) {
        answer = `📦 **Produce Storage Tips**\n\n**Vegetables:**\n• Store in cool, dark place\n• Don't wash before storing\n• Use root cellars for potatoes, carrots\n• Refrigerate leafy greens\n\n**Fruits:**\n• Store at room temperature until ripe\n• Refrigerate after ripening\n• Consider drying, canning, or freezing\n\n**Grains:**\n• Keep in airtight containers\n• Store in cool, dry place\n• Check regularly for pests`;
    }
    // Default response
    else {
        answer = `🌱 **FarmWise AI Assistant v2.1**\n\nI'm your contextual farming assistant! I remember our conversation and can help with:\n\n**🌾 Crops:**\n• Planting times and spacing\n• Watering schedules\n• Fertilizer application\n• Pest control\n• Disease identification (blight, mildew)\n• Harvesting and storage\n\n**🐄 Livestock:**\n• Feeding and nutrition\n• Vaccination schedules\n• Signs of sickness\n• Housing requirements\n• Dry season preparation\n\n**💡 Try asking:**\n• "How to treat tomato blight?"\n• "What vaccines do goats need?"\n• "How to prepare for dry season?"\n• "Signs of sickness in chickens"\n• "Best watering schedule for crops"\n\n*I remember our conversation context, so feel free to ask follow-up questions!*`;
    }
    
    // Store conversation for context
    conversationHistory.push({ question, answer, timestamp: Date.now() });
    if (conversationHistory.length > 10) conversationHistory.shift();
    
    res.json({ answer, severity: 'info' });
});

// Advice endpoint
app.get('/api/advice/personalized', (req, res) => {
    res.json({
        advice: [
            { title: "🌱 Seasonal Tip", content: "Based on current season, focus on irrigation and pest monitoring. Check soil moisture daily." },
            { title: "💧 Water Management", content: "Water early morning to reduce evaporation by up to 30%. Use drip irrigation for efficiency." },
            { title: "🌿 Soil Health", content: "Add organic compost to improve soil structure and water retention. Test soil pH annually." },
            { title: "🐛 Pest Prevention", content: "Introduce beneficial insects like ladybugs. Use neem oil as natural pesticide." }
        ]
    });
});

// Reminders endpoints
let reminders = [];

app.get('/api/reminders', (req, res) => {
    res.json({ reminders });
});

app.post('/api/reminders', (req, res) => {
    const { title, description, due_date, priority } = req.body;
    const newReminder = {
        id: reminders.length + 1,
        title,
        description: description || '',
        due_date: due_date || null,
        priority: priority || 'medium',
        created_at: new Date().toISOString()
    };
    reminders.push(newReminder);
    res.status(201).json({ reminder: newReminder });
});

// Farm stats
app.get('/api/farm/stats', (req, res) => {
    res.json({
        stats: {
            yield: 1250,
            revenue: 3450,
            profit: 2100,
            health_score: 85
        }
    });
});

// Disease detection (mock)
app.post('/api/detect-disease', (req, res) => {
    // For demo, return a sample response
    res.json({
        detection: {
            name: 'Tomato Late Blight',
            confidence: 0.87,
            symptoms: 'Brown spots on leaves, white fungal growth, fruit rot',
            severity: 'high'
        },
        treatment: {
            title: '🍅 Tomato Late Blight Treatment',
            steps: [
                'Remove and destroy infected leaves immediately',
                'Apply copper-based fungicide every 7-10 days',
                'Improve air circulation by pruning',
                'Water at base only, avoid wetting leaves',
                'Apply thick mulch to prevent soil splash',
                'Rotate crops next season'
            ]
        }
    });
});

// Serve dashboard
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FarmWise AI v2.1</title>
            <meta http-equiv="refresh" content="0; url=/dashboard">
        </head>
        <body>Redirecting to dashboard...</body>
        </html>
    `);
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'dashboard-v2.1.html'));
});

// Serve the HTML file directly
app.get('/web/dashboard-v2.1.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'dashboard-v2.1.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     🤖 FARMWISE AI ASSISTANT v2.1 🚀                         ║');
    console.log('║     Contextual Intelligent Farming Platform                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📡 Server: http://localhost:${PORT}`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log(`\n📝 Demo Account:`);
    console.log(`   Email: demo@farmwise.com`);
    console.log(`   Password: password123`);
    console.log(`\n✅ Server is ready! Press Ctrl+C to stop.\n`);
});
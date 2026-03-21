const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Store users in memory (for demo purposes)
// In production, use a real database
let users = [
    {
        id: 1,
        email: 'demo@farmwise.com',
        password: 'password123', // In production, this should be hashed
        name: 'Demo Farmer',
        region: 'tropical',
        farm_type: 'crops',
        crop_type: 'maize'
    }
];

let reminders = [];
let chatHistory = [];

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'FarmWise API',
        version: '2.0',
        status: 'running',
        message: 'Server is working!'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});

// REGISTER endpoint - FIXED
app.post('/api/auth/register', (req, res) => {
    console.log('Registration attempt:', req.body);
    
    const { email, password, name, region, farm_type, crop_type, livestock_type } = req.body;
    
    // Validate required fields
    if (!email || !password || !name || !region || !farm_type) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['email', 'password', 'name', 'region', 'farm_type']
        });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const newUser = {
        id: users.length + 1,
        email,
        password, // In production, hash this!
        name,
        region,
        farm_type,
        crop_type: crop_type || null,
        livestock_type: livestock_type || null
    };
    
    users.push(newUser);
    console.log('✅ New user registered:', email);
    
    // Create token (in production, use JWT)
    const token = 'user-token-' + Date.now() + '-' + newUser.id;
    
    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
        user: userWithoutPassword,
        token: token,
        message: 'Registration successful!'
    });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    console.log('Login attempt:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create token
    const token = 'user-token-' + Date.now() + '-' + user.id;
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
        user: userWithoutPassword,
        token: token,
        message: 'Login successful!'
    });
});

// Advice endpoint
app.get('/api/advice/personalized', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    // Get user from token (simplified)
    const token = auth.replace('Bearer ', '');
    const userId = token.split('-').pop();
    const user = users.find(u => u.id == userId);
    
    const farmType = user?.farm_type || 'crops';
    const region = user?.region || 'tropical';
    
    const adviceDatabase = {
        crops: {
            tropical: [
                { title: "🌱 Optimal Planting Times", content: "Plant after first rains. Use raised beds for better drainage." },
                { title: "💧 Water Management", content: "Water early morning or late evening. Drip irrigation recommended." },
                { title: "🌿 Fertilizer Schedule", content: "Apply NPK at planting. Side-dress with nitrogen after 4 weeks." },
                { title: "🐛 Pest Control", content: "Use neem oil for aphids. Marigolds deter nematodes naturally." },
                { title: "🌾 Drought Protection", content: "Mulch heavily with straw. Use shade cloth during heat waves." }
            ],
            arid: [
                { title: "💧 Water Conservation", content: "Use drip irrigation and mulch to save up to 50% water." },
                { title: "🌱 Drought-Resistant Crops", content: "Plant millet, sorghum, and cowpeas which thrive in dry conditions." },
                { title: "🌿 Soil Management", content: "Add organic matter to improve water retention." }
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
    
    let advice = adviceDatabase[farmType]?.[region] || adviceDatabase[farmType]?.temperate || [];
    
    res.json({ advice: advice.slice(0, 4) });
});

// Chatbot endpoint
app.post('/api/chatbot/ask', (req, res) => {
    const { question } = req.body;
    const auth = req.headers.authorization;
    
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    let answer = "🌱 I'm here to help! Ask me about farming, crops, livestock, or seasonal preparation.";
    
    const q = question.toLowerCase();
    
    if (q.includes('blight') || q.includes('tomato disease')) {
        answer = "🍅 **Tomato Blight Treatment:**\n\n1. Remove infected leaves immediately\n2. Apply copper-based fungicide weekly\n3. Improve air circulation by pruning\n4. Avoid overhead watering\n5. Use mulch to prevent soil splash\n6. Rotate crops next season";
    } 
    else if (q.includes('water') || q.includes('irrigation')) {
        answer = "💧 **Watering Best Practices:**\n\n• Water early morning (5-7 AM) to reduce evaporation\n• Use drip irrigation for 30-50% water savings\n• Apply 2-3 inches of organic mulch\n• Check soil moisture 2 inches deep before watering\n• Young plants: daily for first 2 weeks\n• Mature plants: 1-2 inches per week";
    }
    else if (q.includes('vaccine') || q.includes('vaccination')) {
        answer = "💉 **Vaccination Schedule:**\n\n**Cattle:**\n• Blackleg: Annually before rainy season\n• Anthrax: Annually in endemic areas\n\n**Goats/Sheep:**\n• PPR: Annually\n• Enterotoxemia: Every 6 months\n\n**Poultry:**\n• Newcastle: 7-10 days, booster at 6 weeks\n• Gumboro: 14-21 days\n\n*Always consult your local veterinarian*";
    }
    else if (q.includes('feed') || q.includes('nutrition')) {
        answer = "🍽️ **Animal Nutrition Guide:**\n\n**Basic Requirements:**\n• Clean, fresh water 24/7\n• Quality roughage (hay, silage, pasture)\n• Mineral supplements specific to your area\n\n**Signs of Good Nutrition:**\n• Healthy appetite\n• Shiny coat/feathers\n• Normal weight and growth\n• Regular reproduction";
    }
    else if (q.includes('dry season') || q.includes('drought')) {
        answer = "🌾 **Dry Season Preparation:**\n\n**For Crops:**\n1. Apply thick mulch (4-6 inches)\n2. Install drip irrigation\n3. Plant drought-resistant varieties\n4. Harvest rainwater\n5. Use shade cloth\n\n**For Livestock:**\n1. Stockpile hay and silage (3-4 months)\n2. Plant drought-tolerant fodder\n3. Dig additional water storage\n4. Provide protein supplements\n5. Reduce herd size if needed";
    }
    else if (q.includes('signs of sickness') || q.includes('disease symptoms')) {
        answer = "🚨 **Signs of Sick Animals:**\n\n**Common Symptoms:**\n• Lethargy and reduced activity\n• Loss of appetite\n• Isolation from herd/flock\n• Fever or abnormal temperature\n• Diarrhea or unusual discharge\n• Coughing or breathing difficulty\n• Sunken eyes (dehydration)\n\n**When to Call Vet:**\n• Symptoms persist >24 hours\n• Multiple animals affected\n• Severe signs like bloating\n• Sudden death in flock";
    }
    else if (q.includes('store') || q.includes('preserve')) {
        answer = "📦 **Produce Storage Tips:**\n\n**Vegetables:**\n• Store in cool, dark place\n• Don't wash before storing\n• Use root cellars for potatoes, carrots\n• Refrigerate leafy greens\n\n**Fruits:**\n• Store at room temperature until ripe\n• Refrigerate after ripening\n• Consider drying, canning, or freezing\n\n**Grains:**\n• Keep in airtight containers\n• Store in cool, dry place\n• Check regularly for pests";
    }
    
    // Save to history
    const token = auth.replace('Bearer ', '');
    const userId = token.split('-').pop();
    
    chatHistory.push({
        user_id: userId,
        question: question,
        answer: answer,
        created_at: new Date().toISOString()
    });
    
    res.json({ answer, severity: "info" });
});

// Reminders endpoints
app.get('/api/reminders', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = auth.replace('Bearer ', '');
    const userId = token.split('-').pop();
    
    const userReminders = reminders.filter(r => r.user_id == userId);
    
    res.json({ reminders: userReminders });
});

app.post('/api/reminders', (req, res) => {
    const { title, description, due_date, priority } = req.body;
    const auth = req.headers.authorization;
    
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    if (!title) {
        return res.status(400).json({ error: 'Title required' });
    }
    
    const token = auth.replace('Bearer ', '');
    const userId = token.split('-').pop();
    
    const newReminder = {
        id: reminders.length + 1,
        user_id: parseInt(userId),
        title,
        description: description || '',
        due_date: due_date || null,
        priority: priority || 'medium',
        is_completed: false,
        created_at: new Date().toISOString()
    };
    
    reminders.push(newReminder);
    
    res.status(201).json({ reminder: newReminder });
});

// Farm profile
app.get('/api/farm/profile', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = auth.replace('Bearer ', '');
    const userId = token.split('-').pop();
    const user = users.find(u => u.id == userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const { password, ...profile } = user;
    res.json({ profile });
});

// Farm stats
app.get('/api/farm/stats', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = auth.replace('Bearer ', '');
    const userId = token.split('-').pop();
    
    const userReminders = reminders.filter(r => r.user_id == userId);
    const userChats = chatHistory.filter(c => c.user_id == userId);
    
    res.json({
        stats: {
            chatCount: userChats.length,
            reminderCount: userReminders.length
        }
    });
});

// Chat history
app.get('/api/chatbot/history', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = auth.replace('Bearer ', '');
    const userId = token.split('-').pop();
    
    const userChats = chatHistory.filter(c => c.user_id == userId);
    
    res.json({ history: userChats });
});

// Test interface
app.get('/test', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FarmWise API Test</title>
            <style>
                body {
                    font-family: Arial;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    background: #f5f5f5;
                }
                .card {
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                button {
                    background: #4CAF50;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin: 5px;
                }
                pre {
                    background: #f4f4f4;
                    padding: 10px;
                    border-radius: 5px;
                    overflow-x: auto;
                }
                input {
                    padding: 10px;
                    margin: 5px;
                    width: 200px;
                }
                .success { color: green; }
                .error { color: red; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🌱 FarmWise API Test</h1>
                <p>Server is running!</p>
            </div>
            
            <div class="card">
                <h2>1. Register New Account</h2>
                <input type="text" id="regName" placeholder="Name" value="New Farmer">
                <input type="email" id="regEmail" placeholder="Email" value="new@farmer.com">
                <input type="password" id="regPassword" placeholder="Password" value="password123">
                <select id="regRegion">
                    <option value="tropical">Tropical</option>
                    <option value="arid">Arid</option>
                    <option value="temperate">Temperate</option>
                </select>
                <select id="regFarmType">
                    <option value="crops">Crops</option>
                    <option value="livestock">Livestock</option>
                </select>
                <button onclick="register()">Register</button>
                <pre id="registerResult"></pre>
            </div>
            
            <div class="card">
                <h2>2. Login</h2>
                <input type="email" id="email" placeholder="Email" value="demo@farmwise.com">
                <input type="password" id="password" placeholder="Password" value="password123">
                <button onclick="login()">Login</button>
                <pre id="loginResult"></pre>
            </div>
            
            <script>
                async function register() {
                    const name = document.getElementById('regName').value;
                    const email = document.getElementById('regEmail').value;
                    const password = document.getElementById('regPassword').value;
                    const region = document.getElementById('regRegion').value;
                    const farm_type = document.getElementById('regFarmType').value;
                    
                    try {
                        const res = await fetch('/api/auth/register', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, email, password, region, farm_type })
                        });
                        const data = await res.json();
                        document.getElementById('registerResult').innerText = JSON.stringify(data, null, 2);
                    } catch(e) {
                        document.getElementById('registerResult').innerText = 'Error: ' + e.message;
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
                        document.getElementById('loginResult').innerText = JSON.stringify(data, null, 2);
                    } catch(e) {
                        document.getElementById('loginResult').innerText = 'Error: ' + e.message;
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║     🚀 FARMWISE BACKEND SERVER 🚀         ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n📡 Server: http://localhost:${PORT}`);
    console.log(`🧪 Test Interface: http://localhost:${PORT}/test`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log('\n📝 Demo Account:');
    console.log('   Email: demo@farmwise.com');
    console.log('   Password: password123');
    console.log('\n📝 Registered Users:');
    users.forEach(u => console.log(`   • ${u.email}`));
    console.log('\n✅ Server is ready! Press Ctrl+C to stop.\n');
});

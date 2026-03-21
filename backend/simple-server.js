
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'FarmWise API',
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

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', email);
    
    // Simple validation
    if (email === 'demo@farmwise.com' && password === 'password123') {
        res.json({
            user: {
                id: 1,
                email: email,
                name: 'Demo Farmer',
                region: 'tropical',
                farm_type: 'crops'
            },
            token: 'demo-token-12345'
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Advice endpoint
app.get('/api/advice/personalized', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    res.json({
        advice: [
            { title: "🌱 Planting Tips", content: "Start seeds indoors 6-8 weeks before last frost." },
            { title: "💧 Watering Schedule", content: "Water deeply once a week rather than lightly daily." },
            { title: "🌿 Fertilizer Guide", content: "Use compost tea every 2 weeks during growing season." },
            { title: "🐛 Pest Control", content: "Neem oil works great for aphids and mites." }
        ]
    });
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
    if (q.includes('blight') || q.includes('tomato')) {
        answer = "🍅 Tomato blight treatment: Remove infected leaves, apply copper fungicide weekly, improve airflow, avoid overhead watering.";
    } else if (q.includes('water')) {
        answer = "💧 Water early morning, use drip irrigation, apply mulch to retain moisture.";
    } else if (q.includes('vaccine')) {
        answer = "💉 Common vaccines: Blackleg for cattle, PPR for goats, Newcastle for poultry.";
    } else if (q.includes('dry season')) {
        answer = "🌾 Dry season prep: Stock feed, install water storage, mulch crops, plant drought-resistant varieties.";
    }
    
    res.json({ answer });
});

// Reminders endpoints
app.get('/api/reminders', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    res.json({ 
        reminders: [
            { id: 1, title: "Check irrigation system", due_date: "2024-12-01", priority: "high" },
            { id: 2, title: "Apply fertilizer", due_date: "2024-12-15", priority: "medium" }
        ] 
    });
});

app.post('/api/reminders', (req, res) => {
    const { title, description, due_date, priority } = req.body;
    const auth = req.headers.authorization;
    
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    res.status(201).json({ 
        reminder: { 
            id: Date.now(), 
            title, 
            description, 
            due_date, 
            priority 
        } 
    });
});

// Farm profile
app.get('/api/farm/profile', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    res.json({
        profile: {
            id: 1,
            name: "Demo Farmer",
            email: "demo@farmwise.com",
            region: "tropical",
            farm_type: "crops",
            crop_type: "maize"
        }
    });
});

// Test interface
app.get('/test', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FarmWise API Test</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                .container { max-width: 1200px; margin: 0 auto; }
                .card {
                    background: white;
                    border-radius: 20px;
                    padding: 30px;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                h1, h2 { color: #2d3748; margin-bottom: 15px; }
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
                input, select {
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
                    white-space: pre-wrap;
                }
                .status {
                    padding: 10px;
                    border-radius: 10px;
                    margin: 10px 0;
                }
                .success { background: #c6f6d5; color: #22543d; }
                .error { background: #fed7d7; color: #742a2a; }
                .flex { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <h1>🌱 FarmWise API Test Interface</h1>
                    <p>Your FarmWise backend server is running! Test all endpoints below.</p>
                </div>
                
                <div class="card">
                    <h2>📡 Server Status</h2>
                    <button onclick="checkHealth()">Check Health</button>
                    <div id="healthResult"></div>
                </div>
                
                <div class="card">
                    <h2>🔐 Login</h2>
                    <div class="flex">
                        <input type="email" id="email" placeholder="Email" value="demo@farmwise.com">
                        <input type="password" id="password" placeholder="Password" value="password123">
                        <button onclick="login()">Login</button>
                    </div>
                    <div id="loginResult"></div>
                    <div id="tokenDisplay" style="display:none; background:#fef5e7; padding:10px; border-radius:8px; margin-top:10px; word-break:break-all;"></div>
                </div>
                
                <div id="protected" style="display:none">
                    <div class="card">
                        <h2>🌾 Protected Endpoints</h2>
                        <div class="flex">
                            <button onclick="getAdvice()">Get Advice</button>
                            <button onclick="askQuestion()">Ask Chatbot</button>
                            <button onclick="getReminders()">Get Reminders</button>
                            <button onclick="createReminder()">Create Reminder</button>
                            <button onclick="getProfile()">Get Profile</button>
                        </div>
                        <div id="result"></div>
                    </div>
                </div>
            </div>
            
            <script>
                let token = '';
                
                async function checkHealth() {
                    try {
                        const res = await fetch('/api/health');
                        const data = await res.json();
                        document.getElementById('healthResult').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                    } catch(e) {
                        document.getElementById('healthResult').innerHTML = '<div class="status error">❌ Error: ' + e.message + '</div>';
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
                            document.getElementById('loginResult').innerHTML = '<div class="status success">✅ Login successful!</div>';
                            document.getElementById('tokenDisplay').style.display = 'block';
                            document.getElementById('tokenDisplay').innerHTML = '🔑 Token: ' + token;
                            document.getElementById('protected').style.display = 'block';
                        } else {
                            document.getElementById('loginResult').innerHTML = '<div class="status error">❌ ' + (data.error || 'Login failed') + '</div>';
                        }
                    } catch(e) {
                        document.getElementById('loginResult').innerHTML = '<div class="status error">❌ Error: ' + e.message + '</div>';
                    }
                }
                
                async function getAdvice() {
                    if (!token) { alert('Please login first'); return; }
                    try {
                        const res = await fetch('/api/advice/personalized', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        const data = await res.json();
                        document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                    } catch(e) {
                        document.getElementById('result').innerHTML = '<div class="status error">Error: ' + e.message + '</div>';
                    }
                }
                
                async function askQuestion() {
                    if (!token) { alert('Please login first'); return; }
                    const question = prompt('Ask a farming question:', 'How to treat tomato blight?');
                    if (!question) return;
                    
                    try {
                        const res = await fetch('/api/chatbot/ask', {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer ' + token,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ question })
                        });
                        const data = await res.json();
                        document.getElementById('result').innerHTML = '<pre>🤖 ' + data.answer + '</pre>';
                    } catch(e) {
                        document.getElementById('result').innerHTML = '<div class="status error">Error: ' + e.message + '</div>';
                    }
                }
                
                async function getReminders() {
                    if (!token) { alert('Please login first'); return; }
                    try {
                        const res = await fetch('/api/reminders', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        const data = await res.json();
                        document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                    } catch(e) {
                        document.getElementById('result').innerHTML = '<div class="status error">Error: ' + e.message + '</div>';
                    }
                }
                
                async function createReminder() {
                    if (!token) { alert('Please login first'); return; }
                    const title = prompt('Reminder title:', 'Check irrigation');
                    if (!title) return;
                    
                    try {
                        const res = await fetch('/api/reminders', {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer ' + token,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ title, priority: 'medium' })
                        });
                        const data = await res.json();
                        document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                    } catch(e) {
                        document.getElementById('result').innerHTML = '<div class="status error">Error: ' + e.message + '</div>';
                    }
                }
                
                async function getProfile() {
                    if (!token) { alert('Please login first'); return; }
                    try {
                        const res = await fetch('/api/farm/profile', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        const data = await res.json();
                        document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                    } catch(e) {
                        document.getElementById('result').innerHTML = '<div class="status error">Error: ' + e.message + '</div>';
                    }
                }
                
                // Auto check health on load
                checkHealth();
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
    console.log('\n📝 Test Credentials:');
    console.log('   Email: demo@farmwise.com');
    console.log('   Password: password123');
    console.log('\n✅ Server is ready! Press Ctrl+C to stop.\n');
});

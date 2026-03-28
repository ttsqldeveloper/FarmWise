const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'demo@farmwise.com' && password === 'password123') {
        res.json({
            user: { id: 1, email, name: 'Demo Farmer' },
            token: 'demo-token-12345'
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Chatbot endpoint
app.post('/api/chatbot/ask', (req, res) => {
    const { question } = req.body;
    const q = question.toLowerCase();
    
    let answer = '';
    if (q.includes('blight')) {
        answer = '🍅 Tomato blight: Remove infected leaves, apply copper fungicide, improve airflow.';
    } else if (q.includes('water')) {
        answer = '💧 Water early morning, use drip irrigation, apply mulch to retain moisture.';
    } else if (q.includes('vaccine')) {
        answer = '💉 Vaccines: Blackleg for cattle, PPR for goats, Newcastle for poultry.';
    } else {
        answer = '🌱 I can help with crops, livestock, diseases, and seasonal planning. Ask me anything!';
    }
    res.json({ answer });
});

// Serve dashboard
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>FarmWise AI</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>🌱 FarmWise AI Assistant</h1>
            <p>Server is running!</p>
            <a href="/dashboard" style="background: green; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Launch Dashboard</a>
        </body>
        </html>
    `);
});

app.get('/dashboard', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FarmWise AI</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial; background: linear-gradient(135deg, #1a4731, #0f2e20); min-height: 100vh; padding: 20px; margin: 0; }
                .container { max-width: 800px; margin: 0 auto; }
                .card { background: white; border-radius: 20px; padding: 30px; margin-bottom: 20px; }
                h1 { color: #1a4731; }
                input, button { padding: 10px; margin: 5px; border-radius: 10px; border: 1px solid #ddd; }
                button { background: #48bb78; color: white; cursor: pointer; border: none; }
                .chat-area { height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 10px; padding: 10px; margin-bottom: 10px; background: #f9f9f9; }
                .message { margin-bottom: 10px; }
                .user { text-align: right; color: #48bb78; }
                .bot { text-align: left; color: #1a4731; }
                .hidden { display: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card" id="loginCard">
                    <h1>🌱 FarmWise AI</h1>
                    <p>Login to your farming assistant</p>
                    <input type="email" id="email" placeholder="Email" value="demo@farmwise.com"><br>
                    <input type="password" id="password" placeholder="Password" value="password123"><br>
                    <button onclick="login()">Login</button>
                    <p style="margin-top: 15px; font-size: 0.8rem;">Demo: demo@farmwise.com / password123</p>
                </div>

                <div class="card hidden" id="chatCard">
                    <h1>🤖 FarmWise AI</h1>
                    <div class="chat-area" id="chatArea">
                        <div class="message bot">🌱 Hello! Ask me about farming, crops, or livestock!</div>
                    </div>
                    <input type="text" id="question" placeholder="Ask me anything..." style="width: 70%;">
                    <button onclick="ask()">Send</button>
                    <button onclick="logout()" style="background: #f56565;">Logout</button>
                </div>
            </div>

            <script>
                let token = '';
                
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
                        document.getElementById('loginCard').classList.add('hidden');
                        document.getElementById('chatCard').classList.remove('hidden');
                    } else {
                        alert('Login failed');
                    }
                }
                
                async function ask() {
                    const question = document.getElementById('question').value;
                    if (!question) return;
                    const chatArea = document.getElementById('chatArea');
                    chatArea.innerHTML += '<div class="message user">👤 ' + question + '</div>';
                    document.getElementById('question').value = '';
                    
                    const res = await fetch('/api/chatbot/ask', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question })
                    });
                    const data = await res.json();
                    chatArea.innerHTML += '<div class="message bot">🤖 ' + data.answer + '</div>';
                    chatArea.scrollTop = chatArea.scrollHeight;
                }
                
                function logout() {
                    token = '';
                    document.getElementById('chatCard').classList.add('hidden');
                    document.getElementById('loginCard').classList.remove('hidden');
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health\n`);
});
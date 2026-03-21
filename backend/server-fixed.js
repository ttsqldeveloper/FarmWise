const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5001; // Changed from 5000 to 5001
const JWT_SECRET = 'farmwise-secret-key-2024';

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'farmwise',
  password: 'postgres',
  port: 5432,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.log('\n💡 Make sure PostgreSQL is running and password is correct\n');
  } else {
    console.log('✅ PostgreSQL connected successfully');
    release();
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make db available
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Authentication middleware
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

// ============= AUTH ROUTES =============
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, region, farm_type, crop_type, livestock_type } = req.body;
  
  if (!email || !password || !name || !region || !farm_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, region, farm_type, crop_type, livestock_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, region, farm_type, crop_type, livestock_type`,
      [email, hashedPassword, name, region, farm_type, crop_type || null, livestock_type || null]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      region: user.region,
      farm_type: user.farm_type,
      crop_type: user.crop_type,
      livestock_type: user.livestock_type
    };
    
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= ADVICE ROUTES =============
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

app.get('/api/advice/personalized', auth, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const result = await pool.query(
      'SELECT farm_type, region FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    let advice = adviceDatabase[user.farm_type]?.[user.region] || 
                 adviceDatabase[user.farm_type]?.temperate || [];
    
    res.json({ advice: advice.slice(0, 5) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= REMINDER ROUTES =============
app.get('/api/reminders', auth, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const result = await pool.query(
      'SELECT * FROM reminders WHERE user_id = $1 ORDER BY due_date ASC NULLS LAST',
      [userId]
    );
    res.json({ reminders: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/reminders/upcoming', auth, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const result = await pool.query(
      `SELECT * FROM reminders 
       WHERE user_id = $1 AND is_completed = false 
       ORDER BY due_date ASC NULLS LAST 
       LIMIT 5`,
      [userId]
    );
    res.json({ reminders: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/reminders', auth, async (req, res) => {
  const userId = req.user.userId;
  const { title, description, due_date, priority } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO reminders (user_id, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title, description, due_date || null, priority || 'medium']
    );
    
    res.status(201).json({ reminder: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/reminders/:id', auth, async (req, res) => {
  const userId = req.user.userId;
  const reminderId = req.params.id;
  
  try {
    const result = await pool.query(
      'DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id',
      [reminderId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= CHATBOT ROUTES =============
function getChatResponse(question) {
  const q = question.toLowerCase();
  
  if (q.includes('blight') || q.includes('tomato disease')) {
    return "🍅 **Tomato Blight Treatment:**\n\n1. Remove infected leaves immediately\n2. Apply copper-based fungicide weekly\n3. Improve air circulation by pruning\n4. Avoid overhead watering\n5. Use mulch to prevent soil splash";
  }
  
  if (q.includes('water') || q.includes('irrigation')) {
    return "💧 **Watering Best Practices:**\n\n• Water early morning (5-7 AM)\n• Use drip irrigation for 30-50% water savings\n• Apply 2-3 inches of organic mulch\n• Check soil moisture before watering";
  }
  
  if (q.includes('vaccine') || q.includes('vaccination')) {
    return "💉 **Vaccination Schedule:**\n\n**Cattle:** Blackleg (annually), Anthrax (annually)\n**Goats:** PPR (annually), Enterotoxemia (every 6 months)\n**Poultry:** Newcastle (7-10 days, booster at 6 weeks)";
  }
  
  if (q.includes('feed') || q.includes('nutrition')) {
    return "🍽️ **Animal Nutrition:**\n\n• Clean, fresh water 24/7\n• Quality roughage (hay, silage, pasture)\n• Mineral supplements\n• Adjust feed based on production stage";
  }
  
  if (q.includes('dry season') || q.includes('drought')) {
    return "🌾 **Dry Season Preparation:**\n\n**For Crops:**\n1. Apply thick mulch\n2. Install drip irrigation\n3. Plant drought-resistant varieties\n\n**For Livestock:**\n1. Stockpile hay and silage\n2. Plant drought-tolerant fodder\n3. Dig additional water storage";
  }
  
  return "🌱 **FarmWise Assistant**\n\nI can help with:\n• Crop diseases and treatment\n• Watering schedules\n• Vaccination schedules\n• Animal feeding\n• Seasonal preparation\n\nWhat would you like to know?";
}

app.post('/api/chatbot/ask', auth, async (req, res) => {
  const { question } = req.body;
  const userId = req.user.userId;
  
  if (!question) {
    return res.status(400).json({ error: 'Question required' });
  }
  
  const answer = getChatResponse(question);
  
  // Save to history
  try {
    await pool.query(
      'INSERT INTO chat_history (user_id, question, answer) VALUES ($1, $2, $3)',
      [userId, question, answer]
    );
  } catch (error) {
    console.error('Error saving chat:', error);
  }
  
  res.json({ answer, severity: "info", actionItems: [] });
});

app.get('/api/chatbot/history', auth, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const result = await pool.query(
      'SELECT question, answer, created_at FROM chat_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    res.json({ history: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= FARM PROFILE ROUTES =============
app.get('/api/farm/profile', auth, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const result = await pool.query(
      'SELECT id, name, email, region, farm_type, crop_type, livestock_type FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/farm/profile', auth, async (req, res) => {
  const userId = req.user.userId;
  const { region, farm_type, crop_type, livestock_type } = req.body;
  
  try {
    await pool.query(
      `UPDATE users 
       SET region = COALESCE($1, region),
           farm_type = COALESCE($2, farm_type),
           crop_type = COALESCE($3, crop_type),
           livestock_type = COALESCE($4, livestock_type),
           updated_at = NOW()
       WHERE id = $5`,
      [region, farm_type, crop_type, livestock_type, userId]
    );
    
    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/farm/stats', auth, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const chatResult = await pool.query(
      'SELECT COUNT(*) as count FROM chat_history WHERE user_id = $1',
      [userId]
    );
    
    const reminderResult = await pool.query(
      'SELECT COUNT(*) as count FROM reminders WHERE user_id = $1',
      [userId]
    );
    
    res.json({
      stats: {
        chatCount: parseInt(chatResult.rows[0].count),
        reminderCount: parseInt(reminderResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= HEALTH CHECK =============
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============= START SERVER =============
app.listen(PORT, () => {
  console.log('\n=================================');
  console.log('🚀 FarmWise Backend Server');
  console.log('=================================');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  console.log('\n📝 Test Credentials:');
  console.log('   Email: demo@farmwise.com');
  console.log('   Password: password123');
  console.log('\n📋 Available Endpoints:');
  console.log('   POST   /api/auth/login');
  console.log('   POST   /api/auth/register');
  console.log('   GET    /api/advice/personalized');
  console.log('   GET    /api/reminders');
  console.log('   POST   /api/reminders');
  console.log('   POST   /api/chatbot/ask');
  console.log('   GET    /api/chatbot/history');
  console.log('   GET    /api/farm/profile');
  console.log('=================================\n');
});
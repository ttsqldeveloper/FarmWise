const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store users
const users = [
    { id: 1, email: 'demo@farmwise.com', password: 'password123', name: 'Demo Farmer' }
];

// Store farm data
let farmData = {
    activities: [
        { date: '2024-03-15', type: 'harvest', crop: 'Maize', yield: 320, revenue: 960, expenses: 280 },
        { date: '2024-03-10', type: 'harvest', crop: 'Tomatoes', yield: 210, revenue: 1050, expenses: 320 },
        { date: '2024-03-05', type: 'fertilizing', crop: 'Maize', expenses: 150 }
    ],
    crops: {
        Maize: { yield: 1250, revenue: 3450, expenses: 2100, area: 2.5 },
        Tomatoes: { yield: 850, revenue: 4200, expenses: 1800, area: 1.2 },
        Beans: { yield: 620, revenue: 3100, expenses: 1200, area: 1.8 },
        Potatoes: { yield: 980, revenue: 2900, expenses: 1500, area: 1.5 }
    },
    monthlyData: {
        'Jan': { revenue: 2100, profit: 850 },
        'Feb': { revenue: 2450, profit: 1020 },
        'Mar': { revenue: 2800, profit: 1250 },
        'Apr': { revenue: 3100, profit: 1480 },
        'May': { revenue: 3450, profit: 1650 },
        'Jun': { revenue: 3780, profit: 1890 }
    }
};

// ============================================
// API ENDPOINTS
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'FarmWise Analytics Server is running!', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = `user-token-${Date.now()}-${user.id}`;
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
});

app.get('/api/analytics/data', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    let totalYield = 0, totalRevenue = 0, totalExpenses = 0;
    for (let crop in farmData.crops) {
        totalYield += farmData.crops[crop].yield;
        totalRevenue += farmData.crops[crop].revenue;
        totalExpenses += farmData.crops[crop].expenses;
    }
    const totalProfit = totalRevenue - totalExpenses;
    const farmHealthScore = Math.min(100, Math.round((totalProfit / (totalRevenue + 1)) * 50 + 50));
    
    res.json({
        kpis: { totalYield, totalRevenue, totalProfit, farmHealthScore },
        crops: farmData.crops,
        activities: farmData.activities,
        monthlyData: farmData.monthlyData
    });
});

app.post('/api/analytics/activity', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const { date, type, crop, yield: yieldAmount, revenue, expenses } = req.body;
    const newActivity = {
        date: date || new Date().toISOString().split('T')[0],
        type, crop,
        yield: yieldAmount || 0,
        revenue: revenue || 0,
        expenses: expenses || 0
    };
    
    farmData.activities.unshift(newActivity);
    
    if (!farmData.crops[crop]) {
        farmData.crops[crop] = { yield: 0, revenue: 0, expenses: 0, area: 1 };
    }
    farmData.crops[crop].yield += newActivity.yield;
    farmData.crops[crop].revenue += newActivity.revenue;
    farmData.crops[crop].expenses += newActivity.expenses;
    
    res.json({ success: true, activity: newActivity });
});

app.get('/api/farm/stats', (req, res) => {
    let totalYield = 0, totalRevenue = 0, totalExpenses = 0;
    for (let crop in farmData.crops) {
        totalYield += farmData.crops[crop].yield;
        totalRevenue += farmData.crops[crop].revenue;
        totalExpenses += farmData.crops[crop].expenses;
    }
    const totalProfit = totalRevenue - totalExpenses;
    const farmHealthScore = Math.min(100, Math.round((totalProfit / (totalRevenue + 1)) * 50 + 50));
    
    res.json({
        stats: { yield: totalYield, revenue: totalRevenue, profit: totalProfit, health_score: farmHealthScore }
    });
});

app.post('/api/chatbot/ask', (req, res) => {
    const { question } = req.body;
    const q = question.toLowerCase();
    
    if (q.includes('revenue') || q.includes('profit')) {
        const totalRevenue = Object.values(farmData.crops).reduce((s, c) => s + c.revenue, 0);
        const totalExpenses = Object.values(farmData.crops).reduce((s, c) => s + c.expenses, 0);
        const profit = totalRevenue - totalExpenses;
        res.json({ answer: `📊 Total Revenue: $${totalRevenue.toLocaleString()}\nTotal Expenses: $${totalExpenses.toLocaleString()}\nNet Profit: $${profit.toLocaleString()}` });
    } 
    else if (q.includes('yield')) {
        const totalYield = Object.values(farmData.crops).reduce((s, c) => s + c.yield, 0);
        res.json({ answer: `🌾 Total Yield: ${totalYield} kg\nTop Crop: Maize with ${farmData.crops.Maize.yield} kg` });
    }
    else {
        res.json({ answer: `📈 Farm Analytics Assistant\n\nI can help with:\n• Revenue and profit trends\n• Crop yield performance\n• Farm health score\n\nAsk: "What's my revenue?" or "How much yield?"` });
    }
});

// ============================================
// SERVE THE DASHBOARD HTML
// ============================================

// Serve the analytics dashboard at root
app.get('/', (req, res) => {
    res.send(getDashboardHTML());
});

app.get('/dashboard', (req, res) => {
    res.send(getDashboardHTML());
});

app.get('/analytics', (req, res) => {
    res.send(getDashboardHTML());
});

// Function to return the dashboard HTML
function getDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FarmWise Analytics | Smart Farm Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0a2e1f 0%, #1a4731 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .app-container { max-width: 1600px; margin: 0 auto; }
        .glass-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 28px;
            box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
        }
        .glass-card:hover { transform: translateY(-2px); }
        .header {
            background: linear-gradient(135deg, rgba(26, 71, 49, 0.95), rgba(15, 46, 32, 0.95));
            border-radius: 28px;
            padding: 24px 32px;
            margin-bottom: 28px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
        }
        .logo h1 {
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, #fff, #48bb78);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .version-badge {
            background: linear-gradient(135deg, #48bb78, #38a169);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            margin-left: 10px;
            color: white;
        }
        .login-container { max-width: 480px; margin: 80px auto; }
        .login-card { padding: 48px; text-align: center; }
        .login-icon { font-size: 4rem; margin-bottom: 20px; }
        .input-group { margin-bottom: 20px; text-align: left; }
        .input-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #2d3748; }
        .input-group input {
            width: 100%;
            padding: 14px 18px;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            font-size: 1rem;
        }
        .input-group input:focus { outline: none; border-color: #48bb78; }
        .btn-primary {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white;
            border: none;
            border-radius: 16px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
        }
        .dashboard { display: none; }
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 28px;
        }
        .kpi-card { padding: 24px; text-align: center; position: relative; overflow: hidden; }
        .kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #48bb78, #38a169);
        }
        .kpi-icon { font-size: 2rem; margin-bottom: 12px; }
        .kpi-value { font-size: 2.2rem; font-weight: 800; color: #1a4731; }
        .kpi-label { color: #718096; font-size: 0.85rem; margin-top: 5px; }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin-bottom: 24px;
        }
        .chart-card { padding: 24px; }
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
        }
        .chart-header h3 { font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .chart-container { position: relative; height: 300px; }
        .data-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin-bottom: 24px;
        }
        .data-card { padding: 24px; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .crop-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        .crop-name { font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .progress-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; margin: 0 15px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #48bb78, #38a169); border-radius: 4px; }
        .btn-sm {
            padding: 8px 16px;
            background: #48bb78;
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
        }
        .logout-btn {
            background: #f56565;
            padding: 10px 24px;
            border: none;
            border-radius: 30px;
            color: white;
            cursor: pointer;
        }
        .hidden { display: none; }
        .toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: white;
            padding: 14px 24px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            z-index: 1000;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top-color: #48bb78;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1200px) {
            .kpi-grid { grid-template-columns: repeat(2, 1fr); }
            .charts-grid { grid-template-columns: 1fr; }
            .data-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <div class="header">
            <div class="header-content">
                <div class="logo">
                    <h1>📊 FarmWise Analytics <span class="version-badge">v2.1</span></h1>
                    <p style="font-size: 0.8rem; opacity: 0.8;">Smart Farm Performance Dashboard</p>
                </div>
                <div class="date-range" id="dateRangeDisplay">
                    <i class="fas fa-calendar-alt"></i> Real-time Analytics
                </div>
            </div>
        </div>

        <div id="loginSection" class="login-container">
            <div class="glass-card login-card">
                <div class="login-icon">📊</div>
                <h2>Farm Analytics Dashboard</h2>
                <p style="color: #718096; margin: 10px 0 20px;">Track your farm's performance metrics</p>
                <div class="input-group">
                    <label>Email</label>
                    <input type="email" id="loginEmail" value="demo@farmwise.com">
                </div>
                <div class="input-group">
                    <label>Password</label>
                    <input type="password" id="loginPassword" value="password123">
                </div>
                <button class="btn-primary" onclick="login()">Access Analytics</button>
                <p style="margin-top: 20px; font-size: 0.75rem;">Demo: demo@farmwise.com / password123</p>
            </div>
        </div>

        <div id="dashboard" class="dashboard">
            <div class="kpi-grid">
                <div class="glass-card kpi-card"><div class="kpi-icon">🌾</div><div class="kpi-value" id="totalYield">0</div><div class="kpi-label">Total Yield (kg)</div></div>
                <div class="glass-card kpi-card"><div class="kpi-icon">💰</div><div class="kpi-value" id="totalRevenue">0</div><div class="kpi-label">Total Revenue ($)</div></div>
                <div class="glass-card kpi-card"><div class="kpi-icon">📈</div><div class="kpi-value" id="totalProfit">0</div><div class="kpi-label">Net Profit ($)</div></div>
                <div class="glass-card kpi-card"><div class="kpi-icon">⭐</div><div class="kpi-value" id="farmHealth">0%</div><div class="kpi-label">Farm Health Score</div></div>
            </div>

            <div class="charts-grid">
                <div class="glass-card chart-card"><div class="chart-header"><h3><i class="fas fa-chart-line"></i> Revenue & Profit Trends</h3></div><div class="chart-container"><canvas id="revenueChart"></canvas></div></div>
                <div class="glass-card chart-card"><div class="chart-header"><h3><i class="fas fa-chart-pie"></i> Crop Distribution</h3></div><div class="chart-container"><canvas id="cropChart"></canvas></div></div>
            </div>

            <div class="data-grid">
                <div class="glass-card data-card"><div class="chart-header"><h3><i class="fas fa-table"></i> Recent Activities</h3></div><div id="activitiesList"><div class="spinner"></div></div></div>
                <div class="glass-card data-card"><div class="chart-header"><h3><i class="fas fa-chart-simple"></i> Crop Performance</h3></div><div id="cropPerformanceList"><div class="spinner"></div></div></div>
            </div>

            <div style="text-align: center; margin: 40px 0 20px;">
                <button class="logout-btn" onclick="logout()">Logout</button>
            </div>
        </div>
    </div>

    <script>
        let token = '';
        let revenueChart, cropChart;

        async function login() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (res.ok) {
                    token = data.token;
                    document.getElementById('loginSection').style.display = 'none';
                    document.getElementById('dashboard').style.display = 'block';
                    loadAnalyticsData();
                    showToast('Welcome to Farm Analytics Dashboard!', 'success');
                } else {
                    showToast(data.error || 'Login failed', 'error');
                }
            } catch (error) {
                showToast('Connection error. Make sure server is running on port 3001', 'error');
            }
        }

        async function loadAnalyticsData() {
            try {
                const res = await fetch('/api/analytics/data', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const data = await res.json();
                
                document.getElementById('totalYield').innerText = data.kpis.totalYield.toLocaleString();
                document.getElementById('totalRevenue').innerText = '$' + data.kpis.totalRevenue.toLocaleString();
                document.getElementById('totalProfit').innerText = '$' + data.kpis.totalProfit.toLocaleString();
                document.getElementById('farmHealth').innerText = data.kpis.farmHealthScore + '%';
                
                updateCharts(data);
                updateActivities(data.activities);
                updateCropPerformance(data.crops);
            } catch (error) {
                console.error('Failed to load data', error);
            }
        }

        function updateCharts(data) {
            const revenueCtx = document.getElementById('revenueChart').getContext('2d');
            if (revenueChart) revenueChart.destroy();
            revenueChart = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: Object.keys(data.monthlyData),
                    datasets: [
                        { label: 'Revenue', data: Object.values(data.monthlyData).map(m => m.revenue), borderColor: '#48bb78', backgroundColor: 'rgba(72, 187, 120, 0.1)', fill: true, tension: 0.4 },
                        { label: 'Profit', data: Object.values(data.monthlyData).map(m => m.profit), borderColor: '#4299e1', backgroundColor: 'rgba(66, 153, 225, 0.1)', fill: true, tension: 0.4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: true }
            });
            
            const cropCtx = document.getElementById('cropChart').getContext('2d');
            if (cropChart) cropChart.destroy();
            cropChart = new Chart(cropCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(data.crops),
                    datasets: [{ data: Object.values(data.crops).map(c => c.yield), backgroundColor: ['#48bb78', '#4299e1', '#ed8936', '#9f7aea'] }]
                },
                options: { responsive: true, maintainAspectRatio: true }
            });
        }

        function updateActivities(activities) {
            const container = document.getElementById('activitiesList');
            if (!activities || activities.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 20px;">No activities recorded</p>';
                return;
            }
            let html = '<table class="data-table"><thead><tr><th>Date</th><th>Activity</th><th>Crop</th><th>Details</th></tr></thead><tbody>';
            activities.slice(0, 8).forEach(a => {
                let details = '';
                if (a.yield) details += \`Yield: \${a.yield}kg \`;
                if (a.revenue) details += \`Revenue: $\${a.revenue}\`;
                html += \`<tr><td>\${a.date}</td><td>\${a.type}</td><td>\${a.crop}</td><td>\${details || '-'}</td></tr>\`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        }

        function updateCropPerformance(crops) {
            const container = document.getElementById('cropPerformanceList');
            let html = '';
            for (let [crop, data] of Object.entries(crops)) {
                html += \`
                    <div class="crop-item">
                        <div class="crop-name"><i class="fas fa-seedling"></i> \${crop}</div>
                        <div class="progress-bar"><div class="progress-fill" style="width: \${Math.min(100, (data.yield / 1500 * 100))}%"></div></div>
                        <div>\${data.yield} kg</div>
                    </div>
                \`;
            }
            container.innerHTML = html;
        }

        function logout() {
            token = '';
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('loginSection').style.display = 'block';
            showToast('Logged out', 'success');
        }

        function showToast(msg, type) {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.innerHTML = \`<i class="fas fa-\${type === 'success' ? 'check-circle' : 'exclamation-circle'}" style="color: \${type === 'success' ? '#48bb78' : '#f56565'}"></i> \${msg}\`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    </script>
</body>
</html>`;
}

// Start server
app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     📊 FARMWISE ANALYTICS DASHBOARD 🚀                        ║');
    console.log('║     Smart Farm Performance Tracking                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📡 Server: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`📊 Analytics: http://localhost:${PORT}/analytics`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log(`\n📝 Demo Account:`);
    console.log(`   Email: demo@farmwise.com`);
    console.log(`   Password: password123`);
    console.log(`\n✅ Server is ready! Press Ctrl+C to stop.\n`);
});
FarmWise Advisor is a full-stack web application designed to help beginner, first-generation, and small-scale farmers succeed in their agricultural journey. The platform provides personalized farming guidance based on farm type (crops/livestock) and climate region, with an AI-powered chatbot for instant farming advice.

## 🌟 Key Features

### 📊 Personalized Dashboard
- Farm profile management with region and farm type selection
- Customized advice based on your specific conditions
- Real-time seasonal alerts and warnings

### 🤖 AI-Powered Chatbot
- Intelligent farming assistant for instant answers
- Expert advice on crop diseases, livestock care, and seasonal planning
- 24/7 availability for all your farming questions

### ⏰ Smart Reminders
- Create and manage farm tasks
- Priority-based notifications (High/Medium/Low)
- Never miss important farming activities

### 🌍 Multi-Region Support
- Tropical climate guidance
- Arid/Semi-arid region tips
- Temperate zone advice
- Mediterranean climate insights

### 🌾 Crop Management
- Planting times and spacing guidance
- Watering schedules and irrigation tips
- Fertilizer recommendations
- Pest control strategies
- Disease identification and treatment
- Harvesting and storage techniques

### 🐄 Livestock Management
- Species-specific feeding guides
- Vaccination schedules
- Health monitoring and symptom identification
- Dry season preparation
- Feed management strategies

## 🛠️ Technology Stack

### Frontend
- HTML5, CSS3, JavaScript
- Modern responsive design with glass morphism
- Font Awesome icons
- Google Fonts (Inter)

### Backend
- Node.js with Express.js
- RESTful API architecture
- JWT authentication

### Database
- PostgreSQL (production)
- In-memory storage (development)

## 📸 Screenshots

### Login Screen
*Elegant login interface with glass morphism design*

### Dashboard
*Personalized dashboard with stats cards and farm profile*

### AI Chatbot
*Intelligent farming assistant interface*

### Smart Reminders
*Task management system for farm activities*

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (optional, uses in-memory storage by default)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/FarmWise-Advisor.git
cd FarmWise-Advisor
git clone https://github.com/ttsqldeveloper/FarmWise.git
cd FarmWise

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/FarmWise-Advisor.git
cd FarmWise-Advisor

2.Backend Setup
All server code is inside the backend/ folder.
''bash
cd backend
npm install

3. Run the Backend Server
Start the production‑ready server (v1.5) with:
'''bash
node production-server-v1.5.js

You should see:

text
╔══════════════════════════════════════════════════════════════╗
║     🚀 FARMWISE v1.5 PRODUCTION SERVER 🚀                    ║
║     Weather API | Disease Detection | Push Notifications    ║
╚══════════════════════════════════════════════════════════════╝

📡 Server: http://localhost:3001
🌐 Dashboard: http://localhost:3001/dashboard
💚 Health: http://localhost:3001/api/health


✅ Server is ready!

4. Access the Dashboard
Open your browser and go to:
👉 http://localhost:3001/dashboard

Log in with the demo account:

Email: demo@farmwise.com

Password: password123

6. Environment Variables (Optional)
Create a .env file inside the backend/ folder to override defaults:
FarmWise Advisor - Complete Step-by-Step Setup Guide
env
PORT=3001
JWT_SECRET=your-very-secret-key
WEATHER_API_KEY=your_openweathermap_api_key   # for real weather data
📋 Table of Contents
Prerequisites

Database Setup

Backend Setup

Frontend Setup

Running the Application

Testing the Application

Deployment Guide

Troubleshooting

1. Prerequisites
Required Software
Before starting, ensure you have these installed:

bash
# Check if you have Node.js (version 14 or higher)
node --version

# Check if you have npm
npm --version

# Check if you have PostgreSQL
psql --version

# If not installed, follow the installation guides below
Installation Guides
For Windows:

Node.js: Download from https://nodejs.org/ (LTS version)

PostgreSQL: Download from https://www.postgresql.org/download/windows/

Git: Download from https://git-scm.com/download/win (optional)

For macOS:

bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install PostgreSQL
brew install postgresql
brew services start postgresql
For Ubuntu/Debian:

bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
2. Database Setup
Step 2.1: Create the Database
Windows:

bash
# Open SQL Shell (psql) as administrator
# Or use command line:
psql -U postgres
macOS/Linux:

bash
sudo -u postgres psql
Run these SQL commands:

sql
-- Create the database
CREATE DATABASE farmwise;

-- Create a user (optional, for security)
CREATE USER farmwise_user WITH PASSWORD 'Farmwise2024!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE farmwise TO farmwise_user;

-- Exit PostgreSQL
\q
Step 2.2: Create Tables
Option A: Using psql command line

bash
# Connect to the database
psql -U farmwise_user -d farmwise

# Copy and paste the entire schema.sql content
Option B: Using a SQL file

bash
# Save the schema.sql file in your project
psql -U farmwise_user -d farmwise -f database/schema.sql
Step 2.3: Verify Database Setup
sql
-- Connect to database
psql -U farmwise_user -d farmwise

-- List all tables
\dt

-- You should see:
-- users, chat_history, reminders, farm_logs

-- Check if tables are empty
SELECT * FROM users;
3. Backend Setup
Step 3.1: Create Project Structure
bash
# Create main project folder
mkdir farmwise-advisor
cd farmwise-advisor

# Create backend folder
mkdir server
cd server
Step 3.2: Initialize Backend
bash
# Initialize package.json
npm init -y

# Install dependencies
npm install express cors dotenv pg bcryptjs jsonwebtoken express-validator helmet compression
npm install -D nodemon
Step 3.3: Create Backend Files
Create each file in the server folder:

1. Create .env file:

bash
# Create environment variables file
touch .env
Add this content:

env
PORT=5000
DB_USER=farmwise_user
DB_HOST=localhost
DB_NAME=farmwise
DB_PASSWORD=Farmwise2024!
DB_PORT=5432
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
NODE_ENV=development
2. Create server.js:

bash
touch server.js
Copy the server.js code provided in the previous response.

3. Create folders and files:

bash
# Create folders
mkdir routes middleware

# Create route files
touch routes/auth.js
touch routes/farm.js
touch routes/advice.js
touch routes/reminders.js
touch routes/chatbot.js

# Create middleware
touch middleware/auth.js
4. Update package.json scripts:

json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
Step 3.4: Test Backend
bash
# Start the backend server
npm run dev

# You should see:
# Server running on port 5000
# Database connected

# In another terminal, test the API:
curl http://localhost:5000/api/advice/personalized
# Should return 401 (unauthorized) which is normal
4. Frontend Setup
Step 4.1: Create React App
bash
# Go back to main project folder
cd ..

# Create React app
npx create-react-app client
cd client
Step 4.2: Install Frontend Dependencies
bash
npm install axios react-router-dom chart.js react-chartjs-2 date-fns react-hot-toast lucide-react
Step 4.3: Configure Tailwind CSS
bash
# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p
Update tailwind.config.js:

javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
Update src/index.css:

css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Add custom styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
Step 4.4: Create Component Files
bash
# Create components folder
mkdir src/components
mkdir src/context

# Create component files
touch src/App.js
touch src/components/Login.js
touch src/components/Register.js
touch src/components/Dashboard.js
touch src/components/Chatbot.js
touch src/components/Reminders.js
touch src/components/Navbar.js
touch src/context/AuthContext.js
Step 4.5: Update package.json for Proxy
In client/package.json, add:

json
{
  "proxy": "http://localhost:5000"
}
5. Running the Application
Step 5.1: Start PostgreSQL
bash
# Windows (as administrator)
net start postgresql-14

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
Step 5.2: Start Backend
bash
# In farmwise-advisor/server folder
npm run dev

# Expected output:
# Server running on port 5000
# Database connected successfully
Step 5.3: Start Frontend
bash
# In farmwise-advisor/client folder (new terminal)
npm start

# Expected output:
# Compiled successfully!
# You can now view client in the browser.
# Local: http://localhost:3000
Step 5.4: Access Application
Open browser: http://localhost:3000

You'll be redirected to login page

Click "Register" to create a new account

Fill in your farm details:

Name: Your Name

Email: your@email.com

Password: yourpassword

Region: Select your climate

Farm Type: Crops or Livestock

Click "Register"

You'll be automatically logged in

6. Testing the Application
Test 1: User Registration
bash
# Using curl or Postman
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@farmer.com",
    "password": "password123",
    "name": "Test Farmer",
    "region": "tropical",
    "farm_type": "crops"
  }'
Test 2: Dashboard Functionality
After login, you should see:

Welcome banner with your name

Seasonal alerts

Personalized tips based on your farm type

Upcoming reminders

Test 3: AI Chatbot
Navigate to "AI Assistant" in navigation

Ask questions like:

"How to treat tomato blight?"

"What vaccines do goats need?"

"How to prepare for dry season?"

Verify you get detailed, formatted responses

Test 4: Reminders
Go to "Reminders" page

Create a new reminder

Set priority and due date

Verify it appears in dashboard

7. Deployment Guide
Option A: Deploy to Vercel (Frontend) + Heroku (Backend)
Deploy Backend to Heroku:

bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create Heroku app
heroku create farmwise-api

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your-production-secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
Deploy Frontend to Vercel:

bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts
# Update API URL in frontend to point to Heroku backend
Option B: Deploy to DigitalOcean (Full Stack)
1. Create Droplet:

Ubuntu 20.04 LTS

2GB RAM minimum

Enable backups

2. SSH into Droplet:

bash
ssh root@your-server-ip
3. Install Dependencies:

bash
# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2 for process management
npm install -g pm2
4. Clone and Setup:

bash
# Clone your repository
git clone https://github.com/yourusername/farmwise-advisor.git
cd farmwise-advisor

# Setup backend
cd server
npm install
pm2 start server.js --name farmwise-api

# Setup frontend
cd ../client
npm install
npm run build
5. Configure Nginx:

bash
# Create Nginx config
nano /etc/nginx/sites-available/farmwise
Add:

nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /root/farmwise-advisor/client/build;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
Enable site:

bash
ln -s /etc/nginx/sites-available/farmwise /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
8. Troubleshooting
Common Issues and Solutions
Issue 1: Database Connection Failed

bash
# Error: role "postgres" does not exist
# Solution: Create PostgreSQL user
sudo -u postgres createuser --superuser $USER
sudo -u postgres createdb $USER

# Or reset password
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'newpassword';
Issue 2: Port Already in Use

bash
# Find process using port 5000
lsof -i :5000
# Kill process
kill -9 <PID>

# Or change port in .env file
Issue 3: CORS Errors

bash
# Make sure backend has CORS enabled
# Check server.js has:
app.use(cors());
Issue 4: JWT Token Invalid

bash
# Clear localStorage in browser
# Or re-login
Issue 5: React Build Fails

bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
Debugging Commands
bash
# Check backend logs
pm2 logs farmwise-api

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test database connection
psql -U farmwise_user -d farmwise -c "SELECT 1"
9. Quick Start Script
Create a start.sh file in the root directory:

bash
#!/bin/bash

echo "Starting FarmWise Advisor..."

# Start PostgreSQL
echo "Starting PostgreSQL..."
sudo systemctl start postgresql

# Start Backend
echo "Starting Backend Server..."
cd server
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start Frontend
echo "Starting Frontend..."
cd ../client
npm start &
FRONTEND_PID=$!

echo "FarmWise Advisor is running!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to press Ctrl+C
wait $BACKEND_PID $FRONTEND_PID
Make it executable:

bash
chmod +x start.sh
./start.sh
10. Next Steps & Enhancements
Immediate Improvements
Add image upload: Let farmers upload photos of sick plants/animals

Weather API integration: Connect to OpenWeatherMap for real-time alerts

Push notifications: Send browser notifications for reminders

Multi-language support: Add translations for local languages

Advanced Features
Mobile App: Convert to React Native for iOS/Android

Market Prices: Integrate local market price APIs

Community Forum: Add social features for farmers to share tips

IoT Integration: Connect to soil sensors and weather stations

Performance Optimization
Implement Redis: For caching frequently accessed data

CDN for images: Use Cloudinary for image storage

Database indexing: Add indexes for faster queries

GraphQL: Consider migrating to GraphQL for flexible queries

📞 Support
If you encounter any issues:

Check the Troubleshooting section above

Verify all services are running:

bash
# Check Node.js
node --version

# Check PostgreSQL
pg_isready

# Check ports
netstat -tulpn | grep -E '3000|5000'
View application logs:

bash
# Backend logs
tail -f server/nohup.out

# Browser console (F12)
# Check Network tab for API calls
Reset everything:

bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE farmwise;"
psql -U postgres -c "CREATE DATABASE farmwise;"

# Reinstall node modules
rm -rf server/node_modules client/node_modules
cd server && npm install
cd ../client && npm install
Congratulations! 🎉 You now have a fully functional FarmWise Advisor application. This system provides personalized farming advice, AI-powered chatbot assistance, smart reminders, and offline capabilities for farmers in remote areas.

The application is production-ready and can be deployed to serve real farmers. Start helping new farmers succeed today!


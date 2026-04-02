# push-v2.1.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Pushing FarmWise v2.1 to GitHub" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

cd C:\Users\TEBOHO\FarmerApp

# Check current branch
$branch = git branch --show-current
Write-Host "📌 Current branch: $branch" -ForegroundColor Yellow

# Check for uncommitted changes
$status = git status --porcelain
if (-not $status) {
    Write-Host "⚠️  No changes to commit" -ForegroundColor Red
    exit
}

# Show what will be committed
Write-Host "`n📝 Files to be committed:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Confirm
$confirm = Read-Host "Do you want to commit these changes? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "❌ Commit cancelled" -ForegroundColor Red
    exit
}

# Add all files
Write-Host "`n📂 Adding files..." -ForegroundColor Yellow
git add .

# Commit
Write-Host "💾 Committing..." -ForegroundColor Yellow
git commit -m "FarmWise v2.1 - Complete Farm Analytics Dashboard

✨ NEW FEATURES ADDED:
- 📊 Full Farm Analytics Dashboard with KPIs
- 📈 Interactive Charts (Revenue, Profit, Crop Distribution)
- 📋 Real-time Activity Tracking
- 🌾 Crop Performance Monitoring
- 💰 Financial Analytics (Revenue, Expenses, Profit)
- 🤖 AI-Powered Insights
- 📱 Fully Responsive Design

📁 NEW FILES:
- backend/web/analytics-dashboard.html - Complete analytics dashboard
- backend/serve-analytics.js - Dedicated analytics server
- backend/working-server.js - Enhanced server with all features

🔧 UPDATED:
- Improved API endpoints for analytics
- Added real-time data tracking
- Enhanced chart visualizations
- Better error handling

🚀 Full Farm Management Suite now includes:
- Contextual AI Assistant
- Multi-language Support
- Disease Detection
- Farm Analytics Dashboard
- Smart Reminders
- Community Forum

Live Demo: http://localhost:3001/dashboard"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed" -ForegroundColor Red
    exit
}

Write-Host "✅ Commit successful!" -ForegroundColor Green

# Get token
Write-Host "`n🔑 GitHub Personal Access Token Required" -ForegroundColor Yellow
Write-Host "Create one at: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "Make sure to check 'repo' scope`n" -ForegroundColor Cyan

$token = Read-Host "Paste your Personal Access Token (starts with ghp_)"

if (-not $token) {
    Write-Host "❌ No token provided. Push cancelled." -ForegroundColor Red
    exit
}

# Push to GitHub
Write-Host "`n🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push https://ttsqldeveloper:$token@github.com/ttsqldeveloper/FarmWise.git main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SUCCESS! FarmWise v2.1 is now on GitHub!" -ForegroundColor Green
    Write-Host "📂 Repository: https://github.com/ttsqldeveloper/FarmWise" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Push failed. Trying master branch..." -ForegroundColor Yellow
    git push https://ttsqldeveloper:$token@github.com/ttsqldeveloper/FarmWise.git master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Success! Pushed to master branch" -ForegroundColor Green
    } else {
        Write-Host "❌ Push failed. Check your token and internet connection." -ForegroundColor Red
        exit
    }
}

# Create tag
$tagConfirm = Read-Host "`nCreate version tag v2.1.0? (y/n)"
if ($tagConfirm -eq 'y') {
    git tag -a v2.1.0 -m "FarmWise v2.1 - Complete Farm Analytics Dashboard"
    git push origin v2.1.0
    Write-Host "✅ Tag v2.1.0 created and pushed!" -ForegroundColor Green
}

Write-Host "`n🎉 FarmWise v2.1 is live on GitHub!" -ForegroundColor Magenta
Write-Host "📊 Dashboard: https://github.com/ttsqldeveloper/FarmWise" -ForegroundColor Cyan
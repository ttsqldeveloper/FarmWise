# push-existing.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Pushing FarmWise to GitHub" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

cd C:\Users\TEBOHO\FarmerApp

# Get token
Write-Host "🔑 Create a Personal Access Token at: https://github.com/settings/tokens" -ForegroundColor Yellow
Write-Host "   Make sure to check 'repo' scope`n" -ForegroundColor Cyan

$token = Read-Host "Paste your Personal Access Token (starts with ghp_)"

if ($token -eq "") {
    Write-Host "❌ No token provided" -ForegroundColor Red
    exit
}

# Remove existing remote
Write-Host "`n🗑️  Removing existing remote..." -ForegroundColor Yellow
git remote remove origin 2>$null

# Add remote
Write-Host "➕ Adding remote..." -ForegroundColor Yellow
git remote add origin https://github.com/ttsqldeveloper/FarmWise.git
Write-Host "✅ Remote added" -ForegroundColor Green

# Add files
Write-Host "`n📂 Adding files..." -ForegroundColor Yellow
git add -A

# Check if there are changes
$stagedFiles = git diff --cached --name-only
if (-not $stagedFiles) {
    Write-Host "⚠️  No changes to commit" -ForegroundColor Red
    exit
}

Write-Host "✅ Files staged: $($stagedFiles.Count) files" -ForegroundColor Green

# Commit
Write-Host "`n💾 Committing..." -ForegroundColor Yellow
git commit -m "FarmWise v2.0 - Complete farming platform

✨ NEW FEATURES:
- 🌍 Multi-Language Support (English, Swahili, Spanish)
- 📊 Advanced Analytics Dashboard
- 🤝 Community Forum
- 💰 Market Price Integration
- 📱 React Native Mobile App
- 🔔 Push Notifications
- 🌤️ Weather API
- 📸 AI Disease Detection"

Write-Host "✅ Commit successful!" -ForegroundColor Green

# Push to main
Write-Host "`n🚀 Pushing to main branch..." -ForegroundColor Yellow
git push https://ttsqldeveloper:$token@github.com/ttsqldeveloper/FarmWise.git main 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Trying master branch..." -ForegroundColor Yellow
    git push https://ttsqldeveloper:$token@github.com/ttsqldeveloper/FarmWise.git master
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SUCCESS! FarmWise is now on GitHub!" -ForegroundColor Green
    Write-Host "📂 Repository: https://github.com/ttsqldeveloper/FarmWise" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Push failed." -ForegroundColor Red
    Write-Host "💡 Check:" -ForegroundColor Yellow
    Write-Host "   1. Token has 'repo' scope" -ForegroundColor White
    Write-Host "   2. Token is correct (starts with ghp_)" -ForegroundColor White
    Write-Host "   3. Your branch name (run: git branch)" -ForegroundColor White
}
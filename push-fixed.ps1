# push-fixed.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Pushing FarmWise v1.5 to GitHub" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

cd C:\Users\TEBOHO\FarmerApp

# Check current branch
$currentBranch = git branch --show-current
Write-Host "📌 Current branch: $currentBranch" -ForegroundColor Yellow

# Add all files
Write-Host "`n📂 Adding files..." -ForegroundColor Yellow
git add -A

# Commit
Write-Host "💾 Committing..." -ForegroundColor Yellow
git commit -m "FarmWise v1.5 Release - Weather API, Disease Detection & Push Notifications"

# Pull latest changes
Write-Host "`n📥 Pulling latest changes from GitHub..." -ForegroundColor Yellow
git pull origin main --rebase

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Pull failed. Checking status..." -ForegroundColor Red
    git status
    
    Write-Host "`n💡 If there are conflicts, resolve them and then run:" -ForegroundColor Yellow
    Write-Host "   git add ." -ForegroundColor White
    Write-Host "   git rebase --continue" -ForegroundColor White
    Write-Host "   git push -u origin main" -ForegroundColor White
    exit
}

Write-Host "✅ Pull successful!" -ForegroundColor Green

# Push
Write-Host "`n🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SUCCESS! FarmWise v1.5 is now on GitHub!" -ForegroundColor Green
    Write-Host "📂 Repository: https://github.com/ttsqldeveloper/FarmWise-Advisor" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Push failed. Trying force push..." -ForegroundColor Yellow
    git push -u origin main --force-with-lease
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Success with force push!" -ForegroundColor Green
    } else {
        Write-Host "❌ Still failed." -ForegroundColor Red
        Write-Host "`nTry manually:" -ForegroundColor Yellow
        Write-Host "   git pull origin main" -ForegroundColor White
        Write-Host "   git push -u origin main" -ForegroundColor White
    }
}
@echo off
echo ========================================
echo FarmWise PostgreSQL Setup Script
echo ========================================
echo.

echo Step 1: Checking PostgreSQL service...
sc query postgresql-x64-18 | find "RUNNING"
if errorlevel 1 (
    echo Starting PostgreSQL...
    net start postgresql-x64-18
) else (
    echo PostgreSQL is already running
)
echo.

echo Step 2: Testing connection...
cd "C:\Program Files\PostgreSQL\18\bin"
psql -U postgres -d postgres -c "SELECT 1" 2>nul
if errorlevel 1 (
    echo Password may be incorrect. Please reset password.
    echo.
    echo To reset password:
    echo 1. Stop service: net stop postgresql-x64-18
    echo 2. Edit pg_hba.conf and change md5 to trust
    echo 3. Start service: net start postgresql-x64-18
    echo 4. Run: psql -U postgres
    echo 5. Run: ALTER USER postgres WITH PASSWORD 'postgres';
    echo 6. Stop and start service again
) else (
    echo Connection successful!
)
echo.

echo Step 3: Creating database...
psql -U postgres -c "CREATE DATABASE farmwise;" 2>nul
echo Database created or already exists
echo.

echo Step 4: Running Node.js setup...
cd C:\Users\TEBOHO\FarmerApp\backend
node create-demo-user.js
echo.

echo Step 5: Testing connection...
node test-db.js
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run: node server-final.js
echo 2. Open browser to: http://localhost:3001
echo 3. Login with: demo@farmwise.com / password123
echo.
pause
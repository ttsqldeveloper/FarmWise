const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'farmwise',
  password: 'postgres',
  port: 5432,
});

async function createDemoUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await pool.query(
      `INSERT INTO users (email, password_hash, name, region, farm_type, crop_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      ['demo@farmwise.com', hashedPassword, 'Demo Farmer', 'tropical', 'crops', 'maize']
    );
    
    console.log('✅ Demo user created successfully!');
    console.log('   Email: demo@farmwise.com');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createDemoUser();
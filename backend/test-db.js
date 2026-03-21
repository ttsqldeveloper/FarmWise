const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'farmwise',
  password: '950531Mol!',
  port: 5432,
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected!');
    console.log('   Time:', result.rows[0].now);
    
    const users = await pool.query('SELECT COUNT(*) FROM users');
    console.log('   Users count:', users.rows[0].count);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
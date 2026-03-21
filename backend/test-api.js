const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/health',
  method: 'GET'
};

console.log('Testing FarmWise API...\n');

// Test health
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Health Check Response:');
    console.log(JSON.parse(data));
    console.log('\n');
    
    // Test login
    testLogin();
  });
});

req.on('error', (error) => {
  console.error('❌ Error: Cannot connect to server. Make sure server is running on port 3001');
  console.error(error.message);
});

req.end();

function testLogin() {
  const loginData = JSON.stringify({
    email: 'demo@farmwise.com',
    password: 'password123'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };
  
  const loginReq = http.request(loginOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('✅ Login Response:');
      console.log(JSON.parse(data));
    });
  });
  
  loginReq.on('error', (error) => {
    console.error('❌ Login Error:', error.message);
  });
  
  loginReq.write(loginData);
  loginReq.end();
}
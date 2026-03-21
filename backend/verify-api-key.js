const API_KEY = 'YOUR_NEW_API_KEY_HERE'; // Replace with your actual key

async function testAPIKey() {
    console.log('🔑 Testing OpenWeatherMap API Key...\n');
    
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${API_KEY}&units=metric`
        );
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ API Key is VALID!');
            console.log(`   Weather in London: ${Math.round(data.main.temp)}°C, ${data.weather[0].description}`);
            console.log('\n💡 Your API key is working correctly.');
        } else if (data.cod === 401) {
            console.log('❌ API Key is INVALID');
            console.log('   Error: Invalid API key');
            console.log('\n💡 Please:');
            console.log('   1. Go to https://home.openweathermap.org/api_keys');
            console.log('   2. Create a new API key');
            console.log('   3. Wait 10-15 minutes for it to activate');
            console.log('   4. Use the new key in your server');
        } else {
            console.log('⚠️  Unexpected response:', data);
        }
    } catch (error) {
        console.log('❌ Network error:', error.message);
    }
}

testAPIKey();
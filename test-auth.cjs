const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testAuthSearch() {
  console.log('🧪 Testing Search with Authentication...\n');

  try {
    // First, let's try to access the login page to see if we can get auth
    const loginResponse = await fetch(`${BASE_URL}/login`);
    console.log('Login page status:', loginResponse.status);
    
    // Try search with auth cookie
    const searchResponse = await fetch(`${BASE_URL}/api/search?type=manual&query=truck`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    
    console.log('Search with auth cookie status:', searchResponse.status);
    const data = await searchResponse.text();
    console.log('Search response:', data);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testAuthSearch().catch(console.error);
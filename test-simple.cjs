const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testSimpleSearch() {
  console.log('🧪 Testing Simple Search Endpoint...\n');

  try {
    // Test basic endpoint accessibility
    const response = await fetch(`${BASE_URL}/api/search`);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response data:', data);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testSimpleSearch().catch(console.error);
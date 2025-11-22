const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testSearchFunctionality() {
  console.log('🧪 Testing Smart Resume Search Functionality...\n');

  // Test 1: Manual Search
  console.log('1️⃣ Testing Manual Search...');
  try {
    const manualResponse = await fetch(`${BASE_URL}/api/search?type=manual&query=truck%20driver&paginate=true&page=1&perPage=10`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const manualData = await manualResponse.json();
    console.log('✅ Manual Search Response:', JSON.stringify(manualData, null, 2));
  } catch (error) {
    console.log('❌ Manual Search Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Smart AI Search
  console.log('2️⃣ Testing Smart AI Search...');
  try {
    const smartResponse = await fetch(`${BASE_URL}/api/search?type=smart&query=experienced%20logistics%20coordinator%20with%20fleet%20management%20skills&paginate=true&page=1&perPage=10`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const smartData = await smartResponse.json();
    console.log('✅ Smart AI Search Response:', JSON.stringify(smartData, null, 2));
  } catch (error) {
    console.log('❌ Smart AI Search Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Job Description Search
  console.log('3️⃣ Testing Job Description Search...');
  try {
    const jdResponse = await fetch(`${BASE_URL}/api/search?type=jd&jobDescription=We%20need%20a%20truck%20driver%20with%20experience%20in%20GPS%20tracking%2C%20route%20optimization%2C%20and%20fleet%20management.%20Must%20have%20CDL%20license%20and%20hazmat%20certification.&paginate=true&page=1&perPage=10`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const jdData = await jdResponse.json();
    console.log('✅ Job Description Search Response:', JSON.stringify(jdData, null, 2));
  } catch (error) {
    console.log('❌ Job Description Search Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 4: Search with specific logistics skills
  console.log('4️⃣ Testing Logistics Skills Search...');
  try {
    const logisticsResponse = await fetch(`${BASE_URL}/api/search?type=manual&query=fleet%20management%20supply%20chain%20inventory%20GPS&paginate=true&page=1&perPage=10`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const logisticsData = await logisticsResponse.json();
    console.log('✅ Logistics Skills Search Response:', JSON.stringify(logisticsData, null, 2));
  } catch (error) {
    console.log('❌ Logistics Skills Search Error:', error.message);
  }

  console.log('\n🎯 All search tests completed!');
}

// Run the tests
testSearchFunctionality().catch(console.error);
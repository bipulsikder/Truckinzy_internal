const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testEnhancedSearch() {
  console.log('🧪 Testing Enhanced Smart Resume Search...\n');

  // Test 1: Intelligent TruckinzyAI Search - Fleet Manager with Experience
  console.log('1️⃣ Testing: "Fleet manager with 5+ years experience in Delhi"');
  try {
    const response = await fetch(`${BASE_URL}/api/search?type=smart&query=Fleet%20manager%20with%205%2B%20years%20experience%20in%20Delhi&paginate=true&page=1&perPage=5`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const data = await response.json();
    console.log('✅ Results found:', data.items?.length || 0);
    if (data.items && data.items.length > 0) {
      console.log('🎯 Top match:', {
        name: data.items[0].name,
        role: data.items[0].currentRole,
        experience: data.items[0].totalExperience,
        location: data.items[0].location,
        relevanceScore: data.items[0].relevanceScore,
        matchPercentage: data.items[0].matchPercentage,
        matchingCriteria: data.items[0].matchingCriteria,
        aiUnderstanding: data.items[0].parsedRequirements
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Truck Driver with Clean License
  console.log('2️⃣ Testing: "Truck driver with clean license and CDL certification"');
  try {
    const response = await fetch(`${BASE_URL}/api/search?type=smart&query=Truck%20driver%20with%20clean%20license%20and%20CDL%20certification&paginate=true&page=1&perPage=5`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const data = await response.json();
    console.log('✅ Results found:', data.items?.length || 0);
    if (data.items && data.items.length > 0) {
      console.log('🎯 Top match:', {
        name: data.items[0].name,
        role: data.items[0].currentRole,
        skills: data.items[0].technicalSkills?.slice(0, 3),
        relevanceScore: data.items[0].relevanceScore,
        matchPercentage: data.items[0].matchPercentage,
        matchingCriteria: data.items[0].matchingCriteria
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: Manual Search with Natural Language
  console.log('3️⃣ Testing Manual Search: "Logistics coordinator with warehouse management experience"');
  try {
    const response = await fetch(`${BASE_URL}/api/search?type=manual&query=Logistics%20coordinator%20with%20warehouse%20management%20experience&paginate=true&page=1&perPage=5`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const data = await response.json();
    console.log('✅ Results found:', data.items?.length || 0);
    if (data.items && data.items.length > 0) {
      console.log('🎯 Top match:', {
        name: data.items[0].name,
        role: data.items[0].currentRole,
        experience: data.items[0].totalExperience,
        relevanceScore: data.items[0].relevanceScore,
        matchPercentage: data.items[0].matchPercentage,
        searchCriteria: data.items[0].searchCriteria
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 4: Job Description Search
  console.log('4️⃣ Testing Job Description Search');
  const jobDescription = "We are looking for an experienced Fleet Manager to oversee our transportation operations. The ideal candidate should have 5+ years of experience in fleet management, strong knowledge of GPS tracking systems, route optimization, and vehicle maintenance scheduling. Must have excellent leadership skills and experience managing a team of drivers. Knowledge of DOT regulations and safety compliance is essential.";
  
  try {
    const response = await fetch(`${BASE_URL}/api/search?type=jd&jobDescription=${encodeURIComponent(jobDescription)}&paginate=true&page=1&perPage=5`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const data = await response.json();
    console.log('✅ Results found:', data.items?.length || 0);
    if (data.items && data.items.length > 0) {
      console.log('🎯 Top match:', {
        name: data.items[0].name,
        role: data.items[0].currentRole,
        experience: data.items[0].totalExperience,
        skills: data.items[0].technicalSkills?.slice(0, 3),
        relevanceScore: data.items[0].relevanceScore,
        extractedKeywords: data.items[0].extractedKeywords
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎯 All enhanced search tests completed!');
}

testEnhancedSearch().catch(console.error);
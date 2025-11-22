const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function debugSearch() {
  console.log('🔍 Debugging Enhanced Search...\n');

  // Test with detailed debugging
  console.log('1️⃣ Testing: "Fleet manager with 5+ years experience in Delhi"');
  try {
    const response = await fetch(`${BASE_URL}/api/search?type=smart&query=Fleet%20manager%20with%205%2B%20years%20experience%20in%20Delhi&paginate=true&page=1&perPage=10`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const data = await response.json();
    console.log('✅ Results found:', data.items?.length || 0);
    
    if (data.items && data.items.length > 0) {
      data.items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.currentRole}`);
        console.log(`   📊 Relevance: ${item.relevanceScore} (${item.matchPercentage}%)`);
        console.log(`   📍 Location: ${item.location}`);
        console.log(`   ⏱️ Experience: ${item.totalExperience}`);
        console.log(`   🔍 Matching Criteria: ${item.matchingCriteria?.join(', ')}`);
        console.log(`   🧠 AI Understanding:`, item.parsedRequirements);
        console.log('');
      });
    } else {
      console.log('❌ No results found - checking why...');
      console.log('📋 Response data:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test with simpler query
  console.log('2️⃣ Testing: "Fleet manager" (simpler query)');
  try {
    const response = await fetch(`${BASE_URL}/api/search?type=smart&query=Fleet%20manager&paginate=true&page=1&perPage=5`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const data = await response.json();
    console.log('✅ Results found:', data.items?.length || 0);
    
    if (data.items && data.items.length > 0) {
      data.items.slice(0, 2).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.currentRole}`);
        console.log(`   📊 Relevance: ${item.relevanceScore} (${item.matchPercentage}%)`);
        console.log(`   📍 Location: ${item.location}`);
        console.log(`   ⏱️ Experience: ${item.totalExperience}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test manual search with natural language detection
  console.log('3️⃣ Testing Manual: "Logistics coordinator with warehouse experience"');
  try {
    const response = await fetch(`${BASE_URL}/api/search?type=manual&query=Logistics%20coordinator%20with%20warehouse%20experience&paginate=true&page=1&perPage=5`, {
      headers: {
        'Cookie': 'auth=true'
      }
    });
    const data = await response.json();
    console.log('✅ Results found:', data.items?.length || 0);
    
    if (data.items && data.items.length > 0) {
      data.items.slice(0, 2).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.currentRole}`);
        console.log(`   📊 Relevance: ${item.relevanceScore} (${item.matchPercentage}%)`);
        console.log(`   🔍 Search Criteria:`, item.searchCriteria);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugSearch().catch(console.error);
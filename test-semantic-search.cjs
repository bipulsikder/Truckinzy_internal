const axios = require('axios');

// Test the semantic search functionality with the user's specific job description
async function testSemanticSearch() {
  console.log('🚀 Testing Semantic Search Functionality');
  console.log('='.repeat(50));
  
  const baseUrl = 'http://localhost:3000';
  
  // Test job description from user
  const jobDescription = `Job Description
Location: Lodhwal, Ludhiana
Salary: Up to ₹30,000 (Based on interview performance)
Position: Warehouse Manager
Experience: Minimum 3 years

Key Skills & Requirements:

* Proficiency in SAP software
* Strong inventory management skills
* Knowledge of LIFO and FEFO inventory methods
* Excellent organizational and leadership abilities`;

  const testCases = [
    {
      name: 'JD Mode with User Job Description',
      url: `${baseUrl}/api/search?type=jd&paginate=true&page=1&perPage=5&jd=${encodeURIComponent(jobDescription)}`,
      description: 'Testing the specific job description that was failing'
    },
    {
      name: 'Smart Mode with Natural Language',
      url: `${baseUrl}/api/search?type=smart&paginate=true&page=1&perPage=5&query=${encodeURIComponent('Warehouse Manager with SAP proficiency and 3+ years experience in Ludhiana')}`,
      description: 'Testing smart search with natural language query'
    },
    {
      name: 'Manual Mode with Semantic Query',
      url: `${baseUrl}/api/search?type=manual&paginate=true&page=1&perPage=5&query=${encodeURIComponent('Fleet manager with 5+ years experience in Delhi')}`,
      description: 'Testing manual mode with semantic understanding'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`🔗 URL: ${testCase.url}`);
    
    try {
      const response = await axios.get(testCase.url, {
        headers: {
          'Cookie': 'auth=true'
        },
        timeout: 30000
      });
      
      const data = response.data;
      
      if (data.items) {
        console.log(`✅ Found ${data.items.length} candidates (Total: ${data.total})`);
        console.log(`📊 Page ${data.page} of ${Math.ceil(data.total / data.perPage)}`);
        
        if (data.items.length > 0) {
          console.log('\n🏆 Top Candidates:');
          data.items.slice(0, 3).forEach((candidate, index) => {
            console.log(`\n${index + 1}. ${candidate.name || 'Unknown Name'}`);
            console.log(`   📌 Role: ${candidate.currentRole || 'N/A'}`);
            console.log(`   📍 Location: ${candidate.location || 'N/A'}`);
            console.log(`   ⏱️ Experience: ${candidate.totalExperience || 'N/A'}`);
            console.log(`   📈 Relevance: ${candidate.relevanceScore ? (candidate.relevanceScore * 100).toFixed(1) + '%' : 'N/A'}`);
            console.log(`   🎯 Match: ${candidate.matchPercentage || 'N/A'}%`);
            
            if (candidate.searchExplanation) {
              console.log(`   💡 Explanation: ${candidate.searchExplanation}`);
            }
            
            if (candidate.matchingCriteria && candidate.matchingCriteria.length > 0) {
              console.log(`   ✅ Matching Criteria: ${candidate.matchingCriteria.join(', ')}`);
            }
            
            if (candidate.aiUnderstanding) {
              console.log(`   🧠 AI Understanding: ${JSON.stringify(candidate.aiUnderstanding, null, 2)}`);
            }
            
            if (candidate.jdUnderstanding) {
              console.log(`   📋 JD Understanding: ${JSON.stringify(candidate.jdUnderstanding, null, 2)}`);
            }
          });
        }
      } else if (Array.isArray(data)) {
        console.log(`✅ Found ${data.length} candidates`);
        
        if (data.length > 0) {
          console.log('\n🏆 Top Candidates:');
          data.slice(0, 3).forEach((candidate, index) => {
            console.log(`\n${index + 1}. ${candidate.name || 'Unknown Name'}`);
            console.log(`   📌 Role: ${candidate.currentRole || 'N/A'}`);
            console.log(`   📍 Location: ${candidate.location || 'N/A'}`);
            console.log(`   ⏱️ Experience: ${candidate.totalExperience || 'N/A'}`);
            console.log(`   📈 Relevance: ${candidate.relevanceScore ? (candidate.relevanceScore * 100).toFixed(1) + '%' : 'N/A'}`);
            console.log(`   🎯 Match: ${candidate.matchPercentage || 'N/A'}%`);
            
            if (candidate.searchExplanation) {
              console.log(`   💡 Explanation: ${candidate.searchExplanation}`);
            }
            
            if (candidate.matchingCriteria && candidate.matchingCriteria.length > 0) {
              console.log(`   ✅ Matching Criteria: ${candidate.matchingCriteria.join(', ')}`);
            }
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`📊 Status: ${error.response.status}`);
        console.error(`📝 Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    console.log('\n' + '-'.repeat(50));
  }
  
  console.log('\n🎉 Semantic Search Testing Complete!');
}

// Run the test
testSemanticSearch().catch(console.error);
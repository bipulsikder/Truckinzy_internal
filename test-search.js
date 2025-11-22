import { NextRequest } from "next/server";
import { GET } from "@/app/api/search/route";

// Test the search functionality
async function testSearch() {
  console.log("=== Testing Smart Resume Search ===");
  
  // Test 1: Manual search with keywords
  console.log("\n1. Testing Manual Search...");
  try {
    const manualSearchUrl = new URL("http://localhost:3000/api/search");
    manualSearchUrl.searchParams.set("type", "manual");
    manualSearchUrl.searchParams.set("keywords", "truck driver,fleet management");
    manualSearchUrl.searchParams.set("location", "Delhi");
    manualSearchUrl.searchParams.set("paginate", "true");
    manualSearchUrl.searchParams.set("page", "1");
    manualSearchUrl.searchParams.set("perPage", "10");
    
    const manualRequest = new NextRequest(manualSearchUrl.toString());
    manualRequest.headers.set("authorization", `Bearer ${process.env.ADMIN_TOKEN}`);
    
    const manualResponse = await GET(manualRequest);
    const manualData = await manualResponse.json();
    
    console.log("✅ Manual Search Results:", {
      status: manualResponse.status,
      resultCount: Array.isArray(manualData) ? manualData.length : manualData.items?.length || 0,
      sampleResults: Array.isArray(manualData) ? manualData.slice(0, 2) : manualData.items?.slice(0, 2)
    });
  } catch (error) {
    console.error("❌ Manual Search Error:", error);
  }
  
  // Test 2: Smart AI search
  console.log("\n2. Testing Smart AI Search...");
  try {
    const smartSearchUrl = new URL("http://localhost:3000/api/search");
    smartSearchUrl.searchParams.set("type", "smart");
    smartSearchUrl.searchParams.set("query", "fleet manager with GPS tracking experience");
    smartSearchUrl.searchParams.set("paginate", "true");
    smartSearchUrl.searchParams.set("page", "1");
    smartSearchUrl.searchParams.set("perPage", "10");
    
    const smartRequest = new NextRequest(smartSearchUrl.toString());
    smartRequest.headers.set("authorization", `Bearer ${process.env.ADMIN_TOKEN}`);
    
    const smartResponse = await GET(smartRequest);
    const smartData = await smartResponse.json();
    
    console.log("✅ Smart AI Search Results:", {
      status: smartResponse.status,
      resultCount: Array.isArray(smartData) ? smartData.length : smartData.items?.length || 0,
      sampleResults: Array.isArray(smartData) ? smartData.slice(0, 2) : smartData.items?.slice(0, 2)
    });
  } catch (error) {
    console.error("❌ Smart AI Search Error:", error);
  }
  
  // Test 3: Job Description search
  console.log("\n3. Testing Job Description Search...");
  try {
    const jdSearchUrl = new URL("http://localhost:3000/api/search");
    jdSearchUrl.searchParams.set("type", "jd");
    jdSearchUrl.searchParams.set("jobDescription", "We need a logistics coordinator with warehouse management experience and supply chain knowledge. Must have experience with GPS tracking and fleet management systems.");
    jdSearchUrl.searchParams.set("paginate", "true");
    jdSearchUrl.searchParams.set("page", "1");
    jdSearchUrl.searchParams.set("perPage", "10");
    
    const jdRequest = new NextRequest(jdSearchUrl.toString());
    jdRequest.headers.set("authorization", `Bearer ${process.env.ADMIN_TOKEN}`);
    
    const jdResponse = await GET(jdRequest);
    const jdData = await jdResponse.json();
    
    console.log("✅ Job Description Search Results:", {
      status: jdResponse.status,
      resultCount: Array.isArray(jdData) ? jdData.length : jdData.items?.length || 0,
      sampleResults: Array.isArray(jdData) ? jdData.slice(0, 2) : jdData.items?.slice(0, 2)
    });
  } catch (error) {
    console.error("❌ Job Description Search Error:", error);
  }
  
  console.log("\n=== Search Testing Complete ===");
}

// Run the test
testSearch().catch(console.error);
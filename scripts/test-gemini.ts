
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in .env.local");
    return;
  }

  console.log("Found API Key length:", apiKey.length);
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // Test REST API directly to list models
    console.log("\n--- Checking API Access via REST ---");
    const endpoints = [
      "https://generativelanguage.googleapis.com/v1beta/models",
      "https://generativelanguage.googleapis.com/v1/models"
    ];

    for (const endpoint of endpoints) {
      console.log(`Querying ${endpoint}...`);
      const response = await fetch(`${endpoint}?key=${apiKey}`);
      const data = await response.json();
      
      if (data.error) {
        console.error(`❌ Error from ${endpoint}:`, data.error.message);
      } else if (data.models) {
        console.log(`✅ Success! Found ${data.models.length} models.`);
        console.log("Available models:", data.models.map((m: any) => m.name).join(", "));
      } else {
        console.log(`⚠️ No models found or unexpected response:`, data);
      }
    }


  } catch (error) {
    console.error("Test script error:", error);
  }
}

testGemini();

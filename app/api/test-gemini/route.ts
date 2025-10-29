import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function GET(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("=== Testing Gemini API ===")
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "GEMINI_API_KEY not configured",
        details: "Please add GEMINI_API_KEY to your environment variables"
      })
    }

    console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY.length)
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // Test different models
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
    const results = []
    
    for (const modelName of models) {
      try {
        console.log(`Testing model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })
        
        const result = await model.generateContent("Hello, please respond with 'OK' if you can see this message.")
        const response = await result.response
        const text = response.text()
        
        results.push({
          model: modelName,
          status: "success",
          response: text,
          error: null
        })
        
        console.log(`✅ Model ${modelName} working`)
        
      } catch (error) {
        console.log(`❌ Model ${modelName} failed:`, error)
        results.push({
          model: modelName,
          status: "failed",
          response: null,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }
    
    const workingModels = results.filter(r => r.status === "success")
    
    return NextResponse.json({
      success: workingModels.length > 0,
      message: workingModels.length > 0 
        ? `Gemini API is working with ${workingModels.length} model(s)` 
        : "All Gemini models failed",
      results,
      workingModels: workingModels.map(r => r.model)
    })
    
  } catch (error) {
    console.error("❌ Gemini test failed:", error)
    return NextResponse.json({
      success: false,
      error: "Gemini test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
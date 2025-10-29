import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { generateEmbedding } from "@/lib/ai-utils"
import { realignSpreadsheetData, cleanupSpreadsheetData } from "@/lib/google-sheets"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      affindaConfigured: !!process.env.AFFINDA_API_KEY,
      googleSheetsConfigured: !!(
        process.env.GOOGLE_CLIENT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_SPREADSHEET_ID
      ),
      supabaseConfigured: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    },
    googleSheets: "❌ Not tested",
    supabaseStorage: "❌ Not tested",
    gemini: "❌ Not tested",
    affinda: "❌ Not tested",
    embedding: "❌ Not tested",
  }

  // Test Google Sheets
  try {
    const { getAllCandidates } = await import("@/lib/google-sheets")
    const candidates = await getAllCandidates()
    results.googleSheets = `✅ Connected and initialized (${candidates.length} candidates)`
  } catch (error) {
    results.googleSheets = `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
  }

  // Test Supabase Storage
  try {
    const testContent = `Test Supabase storage upload at ${new Date().toISOString()}`
    const testFile = new File([testContent], "test-supabase-upload.txt", { type: "text/plain" })
    
    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.some(bucket => bucket.name === 'resume-files')) {
      await supabase.storage.createBucket('resume-files', { public: true })
    }
    
    // Upload test file
    const { data, error } = await supabase.storage
      .from('resume-files')
      .upload(`test-${Date.now()}.txt`, testFile)
      
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resume-files')
      .getPublicUrl(data.path)
      
    results.supabaseStorage = `✅ Working (Uploaded: ${data.path}, URL: ${publicUrl})`
  } catch (error) {
    results.supabaseStorage = `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
  }

  // Test Gemini
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const result = await model.generateContent("Say hello in one word")
    const response = await result.response
    const text = response.text()
    results.gemini = `✅ Working (Response: ${text.trim()})`
  } catch (error) {
    results.gemini = `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
  }

  // Test Affinda
  try {
    if (!process.env.AFFINDA_API_KEY) {
      throw new Error("AFFINDA_API_KEY not configured")
    }
    results.affinda = "✅ API key configured"
  } catch (error) {
    results.affinda = `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
  }

  // Test Embedding
  try {
    const embedding = await generateEmbedding("Test embedding text")
    results.embedding = `✅ Working (Dimension: ${embedding.length})`
  } catch (error) {
    results.embedding = `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
  }

  // Data Realignment & Cleanup: SAFE BY DEFAULT
  // Run only when explicitly requested: /api/test?fix=true
  const url = new URL(request.url)
  const doFix = url.searchParams.get("fix") === "true"
  if (doFix) {
    try {
      console.log("=== Running Data Realignment (on-demand) ===")
      const realignResult = await realignSpreadsheetData()
      console.log("Realignment result:", realignResult)
      results["realignResult"] = realignResult
    } catch (error) {
      results["realignResult"] = `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }

    try {
      console.log("Running Data Cleanup (on-demand) ===")
      const cleanupResult = await cleanupSpreadsheetData()
      console.log("Cleanup result:", cleanupResult)
      results["cleanupResult"] = cleanupResult
    } catch (error) {
      results["cleanupResult"] = `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  } else {
    results["realignResult"] = "skipped (add ?fix=true to run)"
    results["cleanupResult"] = "skipped (add ?fix=true to run)"
  }

  return NextResponse.json(results)
}

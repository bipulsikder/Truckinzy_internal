import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { generateEmbedding } from "@/lib/ai-utils"

export async function GET() {
  const results = {
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
      vercelBlobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
    },
    googleSheets: "❌ Not tested",
    vercelBlob: "❌ Not tested",
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

  // Test Vercel Blob
  try {
    const testContent = `Test blob upload at ${new Date().toISOString()}`
    const blob = await put("test-blob-upload.txt", testContent, {
      access: "public",
    })
    results.vercelBlob = `✅ Working (Uploaded: ${blob.pathname})`
  } catch (error) {
    results.vercelBlob = `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
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

  return NextResponse.json(results)
}

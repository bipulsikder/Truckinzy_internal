import { type NextRequest, NextResponse } from "next/server"
import { generateJobDescriptionWithEmbeddings } from "@/lib/ai-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customInputs, useEmbeddings = true } = body

    console.log("=== Simplified JD Generation API ===")
    console.log("Job Title:", customInputs?.jobTitle)
    console.log("Use Embeddings:", useEmbeddings)

    if (!customInputs?.jobTitle?.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 })
    }

    // Generate JD purely based on job title and database search
    const result = await generateJobDescriptionWithEmbeddings(customInputs, [], useEmbeddings)

    console.log("✅ Simplified JD generation completed successfully")
    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Simplified JD generation failed:", error)
    return NextResponse.json(
      {
        error: "Failed to generate job description",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { bulkReparseCandidates, getCandidatesWithIssues } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  try {
    console.log("=== Admin Bulk Reparse Request ===")

    // Check if this is an admin request (you can add authentication here)
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()
    
    if (action === "analyze") {
      // Just analyze how many candidates have issues
      const candidatesWithIssues = await getCandidatesWithIssues()
      return NextResponse.json({ 
        success: true, 
        message: `Found ${candidatesWithIssues.length} candidates with parsing issues`,
        count: candidatesWithIssues.length,
        candidates: candidatesWithIssues.map(c => ({
          id: c.id,
          name: c.name,
          currentRole: c.currentRole,
          location: c.location,
          email: c.email,
          phone: c.phone
        }))
      })
    } else if (action === "reparse") {
      // Perform bulk reparse
      console.log("Starting bulk reparse...")
      const result = await bulkReparseCandidates()
      return NextResponse.json({ 
        success: true, 
        message: "Bulk reparse completed",
        result
      })
    } else {
      return NextResponse.json({ 
        error: "Invalid action. Use 'analyze' or 'reparse'" 
      }, { status: 400 })
    }

  } catch (error) {
    console.error("❌ Admin bulk reparse failed:", error)
    return NextResponse.json(
      { 
        error: "Failed to process admin request", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
} 
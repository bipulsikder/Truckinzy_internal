import { NextRequest, NextResponse } from "next/server"
import { reparseCandidate, getCandidateById } from "@/lib/google-sheets"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 })
    }

    console.log(`=== Reparsing Candidate ${candidateId} ===`)

    // First, get the candidate data to access blob URL
    const candidate = await getCandidateById(candidateId)
    
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    if (!candidate.driveFileUrl) {
      return NextResponse.json({ 
        error: "No original file available for reparsing",
        details: "The original resume file is not available in blob storage"
      }, { status: 400 })
    }

    // Reparse the candidate using the original file from blob storage
    const success = await reparseCandidate(
      candidateId, 
      candidate.driveFileUrl,
      candidate.fileName || "unknown.pdf"
    )

    if (success) {
      console.log(`=== Candidate ${candidateId} Reparsed Successfully ===`)
      
      // Get updated candidate data
      const updatedCandidate = await getCandidateById(candidateId)
      
      return NextResponse.json({ 
        success: true, 
        message: `Candidate ${candidate.name || candidateId} reparsed successfully from original file`,
        candidate: updatedCandidate
      })
    } else {
      throw new Error("Reparsing failed")
    }

  } catch (error) {
    console.error("❌ Failed to reparse candidate:", error)
    return NextResponse.json(
      { error: "Failed to reparse candidate", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
} 
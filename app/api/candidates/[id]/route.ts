import { NextRequest, NextResponse } from "next/server"
import { deleteCandidate, getCandidateById } from "@/lib/google-sheets"
import { deleteFileFromBlob } from "@/lib/vercel-blob-utils"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 })
    }

    console.log(`=== Deleting Candidate ${candidateId} ===`)

    // First, get the candidate data to find the file URL
    const candidate = await getCandidateById(candidateId)
    
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    // Delete from Vercel Blob if file URL exists
    if (candidate.driveFileUrl) {
      try {
        await deleteFileFromBlob(candidate.driveFileUrl)
        console.log("✅ File deleted from Vercel Blob")
      } catch (blobError) {
        console.warn("⚠️ Failed to delete from Vercel Blob:", blobError)
        // Continue with Google Sheets deletion even if blob deletion fails
      }
    }

    // Delete from Google Sheets
    await deleteCandidate(candidateId)
    console.log("✅ Candidate deleted from Google Sheets")

    console.log(`=== Candidate ${candidateId} Deleted Successfully ===`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Candidate ${candidate.name} deleted successfully` 
    })

  } catch (error) {
    console.error("❌ Failed to delete candidate:", error)
    return NextResponse.json(
      { error: "Failed to delete candidate", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 })
    }

    const candidate = await getCandidateById(candidateId)
    
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    return NextResponse.json(candidate)

  } catch (error) {
    console.error("❌ Failed to get candidate:", error)
    return NextResponse.json(
      { error: "Failed to get candidate", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

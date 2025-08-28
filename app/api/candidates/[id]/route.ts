import { NextRequest, NextResponse } from "next/server"
import { deleteCandidate, getCandidateById, updateCandidate } from "@/lib/google-sheets"
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 })
    }

    const body = await request.json()
    console.log(`=== Updating Candidate ${candidateId} ===`)
    console.log("Update data:", body)

    // Validate update data
    const allowedFields = ['status', 'notes', 'rating']
    const updates: any = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Update the candidate in Google Sheets
    await updateCandidate(candidateId, updates)
    console.log("✅ Candidate updated successfully")

    return NextResponse.json({ 
      success: true, 
      message: "Candidate updated successfully",
      updates
    })

  } catch (error) {
    console.error("❌ Failed to update candidate:", error)
    return NextResponse.json(
      { error: "Failed to update candidate", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

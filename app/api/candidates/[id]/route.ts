import { type NextRequest, NextResponse } from "next/server"
import { updateCandidate } from "@/lib/google-sheets"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const updates = await request.json()

    console.log(`=== Updating Candidate ${id} ===`)
    console.log("Updates:", updates)

    if (!id) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 })
    }

    // Update the candidate in Google Sheets
    await updateCandidate(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    console.log(`✅ Candidate ${id} updated successfully`)
    return NextResponse.json({ success: true, message: "Candidate updated successfully" })
  } catch (error) {
    console.error("❌ Failed to update candidate:", error)
    return NextResponse.json(
      {
        error: "Failed to update candidate",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 })
    }

    // You can implement get single candidate logic here if needed
    return NextResponse.json({ message: "Get single candidate endpoint" })
  } catch (error) {
    console.error("❌ Failed to get candidate:", error)
    return NextResponse.json(
      {
        error: "Failed to get candidate",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

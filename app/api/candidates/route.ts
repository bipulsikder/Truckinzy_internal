import { type NextRequest, NextResponse } from "next/server"
import { getAllCandidates } from "@/lib/google-sheets"

export async function GET(request: NextRequest) {
  try {
    console.log("=== Fetching All Candidates ===")

    const candidates = await getAllCandidates()

    // Transform the data to match the expected format in the frontend
    const transformedCandidates = candidates.map((candidate) => ({
      _id: candidate.id, // Map id to _id for frontend compatibility
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      currentRole: candidate.currentRole,
      desiredRole: candidate.desiredRole,
      currentCompany: candidate.currentCompany,
      location: candidate.location,
      totalExperience: candidate.totalExperience,
      highestQualification: candidate.highestQualification,
      degree: candidate.degree,
      university: candidate.university,
      technicalSkills: candidate.technicalSkills,
      softSkills: candidate.softSkills,
      certifications: candidate.certifications,
      resumeText: candidate.resumeText,
      fileName: candidate.fileName,
      driveFileUrl: candidate.driveFileUrl,
      tags: candidate.tags,
      status: candidate.status,
      rating: candidate.rating,
      uploadedAt: candidate.uploadedAt,
      linkedinProfile: candidate.linkedinProfile,
      summary: candidate.summary,
      notes: candidate.notes,
    }))

    console.log(`✅ Retrieved ${transformedCandidates.length} candidates`)
    return NextResponse.json(transformedCandidates)
  } catch (error) {
    console.error("❌ Failed to fetch candidates:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch candidates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getAllCandidates } from "@/lib/google-sheets"

export async function GET(request: NextRequest) {
  try {
    // console.log("=== Fetching All Candidates ===")

    const candidates = await getAllCandidates()
    // console.log(`📊 Raw candidates from Google Sheets: ${candidates.length}`)

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
      preferredLocation: candidate.preferredLocation,
      totalExperience: candidate.totalExperience,
      currentSalary: candidate.currentSalary,
      expectedSalary: candidate.expectedSalary,
      noticePeriod: candidate.noticePeriod,
      highestQualification: candidate.highestQualification,
      degree: candidate.degree,
      specialization: candidate.specialization,
      university: candidate.university,
      educationYear: candidate.educationYear,
      educationPercentage: candidate.educationPercentage,
      technicalSkills: candidate.technicalSkills,
      softSkills: candidate.softSkills,
      languagesKnown: candidate.languagesKnown,
      certifications: candidate.certifications,
      previousCompanies: candidate.previousCompanies,
      jobTitles: candidate.jobTitles,
      workDuration: candidate.workDuration,
      keyAchievements: candidate.keyAchievements,
      workExperience: candidate.workExperience,
      education: candidate.education,
      projects: candidate.projects,
      awards: candidate.awards,
      publications: candidate.publications,
      references: candidate.references,
      resumeText: candidate.resumeText,
      fileName: candidate.fileName,
      driveFileId: candidate.driveFileId,
      driveFileUrl: candidate.driveFileUrl,
      tags: candidate.tags,
      status: candidate.status,
      rating: candidate.rating,
      notes: candidate.notes,
      uploadedAt: candidate.uploadedAt,
      updatedAt: candidate.updatedAt,
      lastContacted: candidate.lastContacted,
      interviewStatus: candidate.interviewStatus,
      feedback: candidate.feedback,
      linkedinProfile: candidate.linkedinProfile,
      portfolioUrl: candidate.portfolioUrl,
      githubProfile: candidate.githubProfile,
      summary: candidate.summary,
    }))

    // console.log(`✅ Retrieved ${transformedCandidates.length} candidates`)
    // console.log("Sample candidate:", transformedCandidates[0] || "No candidates found")
    
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

import { NextRequest, NextResponse } from "next/server"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"
import { logger } from "@/lib/logger"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id: candidateId } = await params

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 })
    }

    logger.info(`=== Deleting Candidate ${candidateId} ===`)

    // First, get the candidate data to find the file URL
    const candidate = await SupabaseCandidateService.getCandidateById(candidateId)
    
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    // Delete from Supabase Storage if file URL exists
    if (candidate.fileUrl) {
      try {
        // Extract the file path from the URL
        const url = new URL(candidate.fileUrl)
        const filePath = url.pathname.split('/').pop()
        
        if (filePath) {
          const { error } = await SupabaseCandidateService.deleteFile(filePath)
          if (!error) {
            logger.info("✅ File deleted from Supabase Storage")
          } else {
            logger.warn("⚠️ Failed to delete from Supabase Storage:", error)
          }
        }
      } catch (storageError) {
        logger.warn("⚠️ Failed to delete from Supabase Storage:", storageError)
        // Continue with Google Sheets deletion even if storage deletion fails
      }
    }

    // Delete from Supabase
    await SupabaseCandidateService.deleteCandidate(candidateId)
    logger.info("✅ Candidate deleted from Supabase")

    logger.info(`=== Candidate ${candidateId} Deleted Successfully ===`)
    
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
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id: candidateId } = await params

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 })
    }

    const candidate = await SupabaseCandidateService.getCandidateById(candidateId)
    
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    // Transform the data to match the same format as the candidates list API
    const transformedCandidate = {
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
      workExperience: candidate.workExperience || [],
      education: candidate.education || [],
      projects: candidate.projects,
      awards: candidate.awards,
      publications: candidate.publications,
      references: candidate.references,
      resumeText: candidate.resumeText,
      fileName: candidate.fileName,
      filePath: candidate.filePath,
      fileUrl: candidate.fileUrl,
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
    }

    return NextResponse.json(transformedCandidate)

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
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

    // Update the candidate in Supabase
    await SupabaseCandidateService.updateCandidate(candidateId, updates)
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

import { type NextRequest, NextResponse } from "next/server"
import { parseResume } from "@/lib/resume-parser"
import { generateEmbedding } from "@/lib/ai-utils"
import { addCandidate } from "@/lib/google-sheets"
import { uploadFileToBlob } from "@/lib/vercel-blob-utils"

export async function POST(request: NextRequest) {
  console.log("=== Comprehensive Resume Upload Started ===")

  try {
    const formData = await request.formData()
    const file = formData.get("resume") as File

    if (!file) {
      console.error("No file provided in request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Only PDF, DOCX, DOC, and TXT files are allowed.` },
        { status: 400 },
      )
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size too large. Maximum 10MB allowed." }, { status: 400 })
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)

    // Upload file to Google Drive
    console.log("Uploading to Vercel Blob...")
    const { url: blobUrl, pathname: blobPathname } = await uploadFileToBlob(file)

    // Parse the resume
    console.log("Starting resume parsing...")
    const parsedData = await parseResume(file)
    console.log("Parsed data:", JSON.stringify(parsedData, null, 2))

    // Generate embedding for vector search (optional)
    console.log("Generating embedding...")
    let embedding = []
    try {
      embedding = await generateEmbedding(parsedData.resumeText)
      console.log("Generated embedding of length:", embedding.length)
    } catch (embeddingError) {
      console.warn("Embedding generation failed, continuing without it:", embeddingError)
    }

    // Prepare candidate data for Google Sheets
    const candidateData = {
      // Basic Information
      name: parsedData.name,
      email: parsedData.email,
      phone: parsedData.phone,
      dateOfBirth: parsedData.dateOfBirth || "",
      gender: parsedData.gender || "",
      maritalStatus: parsedData.maritalStatus || "",

      // Professional Information
      currentRole: parsedData.currentRole || "",
      desiredRole: parsedData.desiredRole || "",
      currentCompany: parsedData.currentCompany || "",
      location: parsedData.location || "",
      preferredLocation: parsedData.preferredLocation || "",
      totalExperience: parsedData.totalExperience || "",
      currentSalary: parsedData.currentSalary || "",
      expectedSalary: parsedData.expectedSalary || "",
      noticePeriod: parsedData.noticePeriod || "",

      // Education Details
      highestQualification: parsedData.highestQualification || "",
      degree: parsedData.degree || "",
      specialization: parsedData.specialization || "",
      university: parsedData.university || "",
      educationYear: parsedData.educationYear || "",
      educationPercentage: parsedData.educationPercentage || "",
      additionalQualifications: parsedData.additionalQualifications || "",

      // Skills & Expertise
      technicalSkills: parsedData.technicalSkills || [],
      softSkills: parsedData.softSkills || [],
      languagesKnown: parsedData.languagesKnown || [],
      certifications: parsedData.certifications || [],

      // Work Experience
      previousCompanies: parsedData.previousCompanies || [],
      jobTitles: parsedData.jobTitles || [],
      workDuration: parsedData.workDuration || [],
      keyAchievements: parsedData.keyAchievements || [],
      workExperience: parsedData.workExperience || [],
      education: parsedData.education || [],

      // Additional Information
      projects: parsedData.projects || [],
      awards: parsedData.awards || [],
      publications: parsedData.publications || [],
      references: parsedData.references || [],
      linkedinProfile: parsedData.linkedinProfile || "",
      portfolioUrl: parsedData.portfolioUrl || "",
      githubProfile: parsedData.githubProfile || "",
      summary: parsedData.summary || "",

      // File Information
      resumeText: parsedData.resumeText,
      fileName: file.name,
      driveFileId: blobPathname, // Storing pathname in Drive File ID column
      driveFileUrl: blobUrl, // Storing URL in Drive File URL column

      // System Fields
      status: "new",
      tags: [],
      rating: undefined,
      notes: "",
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContacted: "",
      interviewStatus: "not-scheduled",
      feedback: "",
    }

    // Add to Google Sheets
    console.log("Adding to Google Sheets...")
    const candidateId = await addCandidate(candidateData)

    console.log("=== Resume Upload Completed Successfully ===")

    return NextResponse.json({
      success: true,
      candidateId,
      message: "Resume processed successfully",
      driveFileUrl: blobUrl,
      ...parsedData,
    })
  } catch (error) {
    console.error("=== Resume Upload Error ===")
    console.error("Error details:", error)

    return NextResponse.json(
      {
        error: "Failed to process resume",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

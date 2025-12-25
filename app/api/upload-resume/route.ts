import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { parseResume } from "@/lib/resume-parser"
import { generateEmbedding } from "@/lib/ai-utils"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"

export async function POST(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
      // Check if it's a DOCX/DOC file with wrong MIME type
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        console.log(`⚠️ File has wrong MIME type: ${file.type}, but extension suggests Word document. Proceeding anyway...`)
      } else {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Only PDF, DOCX, DOC, and TXT files are allowed.` },
          { status: 400 },
        )
      }
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size too large. Maximum 10MB allowed." }, { status: 400 })
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)
    console.log(`File extension: ${file.name.split('.').pop()?.toLowerCase()}`)
    console.log(`MIME type validation: ${allowedTypes.includes(file.type) ? 'PASSED' : 'FAILED'}`)
    
    // Parse the resume to get candidate information
    console.log("Starting resume parsing...")
    let parsedData
    let parsingError: string | null = null
    
    try {
      parsedData = await parseResume(file)
      console.log("✅ Resume parsing successful")
      console.log("Parsed data:", JSON.stringify(parsedData, null, 2))
    } catch (parseError) {
      console.error("❌ Resume parsing failed:", parseError)
      parsingError = parseError instanceof Error ? parseError.message : "Unknown parsing error"
      
      // Return detailed parsing error information
      return NextResponse.json({
        error: "Resume parsing failed",
        parsingFailed: true,
        details: parsingError,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        suggestions: [
          "Check if the file is corrupted or password protected",
          "Ensure the file contains readable text content",
          "Try converting the file to a different format (PDF/DOCX)",
          "Verify the file is not an image-only PDF"
        ],
        timestamp: new Date().toISOString()
      }, { status: 422 })
    }

    // Check for duplicate resumes before processing
    console.log("Checking for duplicate resumes...")
    const existingCandidates = await SupabaseCandidateService.getAllCandidates()
    
    // Check for duplicates based on multiple criteria
    const duplicateChecks = [
      // Check by exact email match
      existingCandidates.find(c => c.email && c.email.toLowerCase() === parsedData.email?.toLowerCase()),
      // Check by name + phone combination
      existingCandidates.find(c => 
        c.name?.toLowerCase() === parsedData.name?.toLowerCase() && 
        c.phone && c.phone === parsedData.phone
      ),
      // Check by name + location combination
      existingCandidates.find(c => 
        c.name?.toLowerCase() === parsedData.name?.toLowerCase() && 
        c.location && c.location.toLowerCase() === parsedData.location?.toLowerCase()
      ),
      // Check by exact phone match (if phone exists)
      parsedData.phone ? existingCandidates.find(c => c.phone === parsedData.phone) : null
    ].filter(Boolean) as any[]

    if (duplicateChecks.length > 0) {
      const duplicate = duplicateChecks[0]
      console.log("Duplicate resume detected:", duplicate)
      
      return NextResponse.json({
        error: "Resume already exists",
        isDuplicate: true,
        duplicateInfo: {
          existingName: duplicate.name,
          existingId: duplicate.id,
          uploadedAt: duplicate.uploadedAt,
          reason: `Candidate with ${duplicate.email ? 'email' : duplicate.phone ? 'phone' : 'name'} already exists in database`
        }
      }, { status: 409 })
    }

    // Generate a unique ID for the candidate
    const candidateId = crypto.randomUUID()

    // Upload file to Supabase Storage
    console.log("Uploading to Supabase Storage...")
    // Always upload a new file to avoid collisions and incorrect resume mapping
    const fileUrl = await SupabaseCandidateService.uploadFile(file, candidateId)
    const filePath = fileUrl.split('/').pop() || ''

    // Generate embedding for vector search (optional)
    console.log("Generating embedding...")
    let embedding: number[] = []
    try {
      embedding = await generateEmbedding(parsedData.resumeText)
      console.log("✅ Embedding generated successfully")
    } catch (embeddingError) {
      console.warn("⚠️ Failed to generate embedding:", embeddingError)
      // Continue without embedding
    }

    // Prepare candidate data for Supabase
    const candidateData = {
      // Basic Information
      name: parsedData.name,
      email: parsedData.email || "",
      phone: parsedData.phone || "",
      dateOfBirth: parsedData.dateOfBirth || "",
      gender: parsedData.gender || "",
      maritalStatus: parsedData.maritalStatus || "",
      currentRole: parsedData.currentRole || "Not specified",
      desiredRole: parsedData.desiredRole || "",
      currentCompany: parsedData.currentCompany || "",
      location: parsedData.location || "Not specified",
      preferredLocation: parsedData.preferredLocation || "",
      totalExperience: parsedData.totalExperience || "Not specified",
      currentSalary: parsedData.currentSalary || "",
      expectedSalary: parsedData.expectedSalary || "",
      noticePeriod: parsedData.noticePeriod || "",
      highestQualification: parsedData.highestQualification || "",
      degree: parsedData.degree || "",
      specialization: parsedData.specialization || "",
      university: parsedData.university || "",
      educationYear: parsedData.educationYear || "",
      educationPercentage: parsedData.educationPercentage || "",
      additionalQualifications: parsedData.additionalQualifications || "",
      technicalSkills: parsedData.technicalSkills || [],
      softSkills: parsedData.softSkills || [],
      languagesKnown: parsedData.languagesKnown || [],
      certifications: parsedData.certifications || [],
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
      filePath: filePath, // Path in Supabase storage
      fileUrl: fileUrl, // URL to access file in Supabase storage

      // System Fields
      status: "new" as const,
      tags: [],
      rating: undefined,
      notes: "",
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContacted: "",
      interviewStatus: "not-scheduled",
      feedback: "",
      
      // Parsing metadata
      parsing_method: "gemini",
      parsing_confidence: 0.95,
      parsing_errors: [],
      
      // Vector Search
      embedding: embedding.length > 0 ? embedding : null,
    }

    // Add to Supabase
    console.log("Adding to Supabase...")
    // We already generated candidateId earlier for the file upload
    await SupabaseCandidateService.addCandidate(candidateData as any)

    console.log("=== Resume Upload Completed Successfully ===")

    return NextResponse.json({
      success: true,
      candidateId,
      message: "Resume processed successfully",
      fileUrl: fileUrl,
      reusedExistingFile: false,
      ...parsedData,
    })

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error during upload", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { parseResume } from "@/lib/resume-parser"
import { generateEmbedding } from "@/lib/ai-utils"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"
import { ensureResumeBucketExists } from "@/lib/supabase-storage-utils"

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

    // Ensure the Supabase bucket exists
    await ensureResumeBucketExists()
    
    // FIRST: Check if file already exists in Supabase storage
    console.log("Checking if file already exists in Supabase storage...")
    const fileExistsCheck = await SupabaseCandidateService.checkFileExistsInStorage(file)
    
    let fileUrl: string
    let filePath: string
    
    if (fileExistsCheck.exists && fileExistsCheck.url && fileExistsCheck.path) {
      console.log(`✅ File already exists in Supabase storage: ${file.name}`)
      fileUrl = fileExistsCheck.url
      filePath = fileExistsCheck.path
      
      // Check if this file is already associated with a candidate in the database
      console.log("Checking if file is already associated with a candidate...")
      const existingCandidates = await SupabaseCandidateService.getAllCandidates()
      const existingCandidate = existingCandidates.find(c => 
        c.fileUrl === fileUrl || c.fileName === file.name
      )
      
      if (existingCandidate) {
        console.log("File is already associated with existing candidate:", existingCandidate.name)
        return NextResponse.json({
          error: "Resume already exists",
          isDuplicate: true,
          duplicateInfo: {
            existingName: existingCandidate.name,
            existingId: existingCandidate.id,
            uploadedAt: existingCandidate.uploadedAt,
            reason: `File ${file.name} is already uploaded and associated with candidate ${existingCandidate.name}`,
            fileUrl: fileUrl
          }
        }, { status: 409 })
      }
      
      // File exists in Supabase storage but not associated with any candidate - we can reuse it
      console.log("File exists in Supabase storage but not associated with any candidate - reusing existing file")
    } else {
      // File doesn't exist in Supabase storage - need to parse and upload
      console.log("File not found in Supabase storage - proceeding with parsing and upload...")
      
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
      ].filter(Boolean)

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
      fileUrl = await SupabaseCandidateService.uploadFile(file, candidateId)
      filePath = fileUrl.split('/').pop() || ''

      // Generate embedding for vector search (optional)
      console.log("Generating embedding...")
      let embedding = []
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
        status: "new",
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
      }

      // Add to Supabase
      console.log("Adding to Supabase...")
      // We already generated candidateId earlier for the file upload
      await SupabaseCandidateService.addCandidate(candidateData)

      console.log("=== Resume Upload Completed Successfully ===")

      return NextResponse.json({
        success: true,
        candidateId,
        message: "Resume processed successfully",
        fileUrl: fileUrl,
        reusedExistingFile: false,
        ...parsedData,
      })
    }

    // If we reach here, we're reusing an existing file that's not associated with any candidate
    // We need to parse it to create a new candidate entry
    console.log("Reusing existing file - parsing to create new candidate entry...")
    
    try {
      // Download the existing file from Supabase storage to parse it
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to download existing file from Supabase storage: ${response.status}`)
      }
      
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      
      // Create a mock File object for parsing
      const mockFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        arrayBuffer: () => Promise.resolve(arrayBuffer),
        text: () => blob.text(),
        slice: (start?: number, end?: number) => {
          const slicedBuffer = arrayBuffer.slice(start || 0, end || arrayBuffer.byteLength)
          return {
            arrayBuffer: () => Promise.resolve(slicedBuffer),
            text: () => new TextDecoder().decode(slicedBuffer)
          }
        }
      }
      
      // Parse the resume using the mock file object
      console.log("Parsing existing file from Supabase storage...")
      const parsedData = await parseResume(mockFile as any)
      console.log("✅ Resume parsing successful from existing file")
      
      // Check for duplicate resumes before processing
      console.log("Checking for duplicate resumes...")
      const existingCandidates = await SupabaseCandidateService.getAllCandidates()
      
      const duplicateChecks = [
        existingCandidates.find(c => c.email && c.email.toLowerCase() === parsedData.email?.toLowerCase()),
        existingCandidates.find(c => 
          c.name?.toLowerCase() === parsedData.name?.toLowerCase() && 
          c.phone && c.phone === parsedData.phone
        ),
        existingCandidates.find(c => 
          c.name?.toLowerCase() === parsedData.name?.toLowerCase() && 
          c.location && c.location.toLowerCase() === parsedData.location?.toLowerCase()
        ),
        parsedData.phone ? existingCandidates.find(c => c.phone === parsedData.phone) : null
      ].filter(Boolean)

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

      // Generate embedding for vector search (optional)
      console.log("Generating embedding...")
      let embedding = []
      try {
        embedding = await generateEmbedding(parsedData.resumeText)
        console.log("✅ Embedding generated successfully")
      } catch (embeddingError) {
        console.warn("⚠️ Failed to generate embedding:", embeddingError)
        // Continue without embedding
      }

      // Generate a unique ID for the candidate
      const candidateId = crypto.randomUUID()

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
        filePath: filePath,
        fileUrl: fileUrl,

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
        
        // Parsing metadata
        parsing_method: "gemini",
        parsing_confidence: 0.95,
        parsing_errors: [],
      }

      // Add to Supabase
      console.log("Adding to Supabase...")
      await SupabaseCandidateService.addCandidate(candidateData)

      console.log("=== Resume Upload Completed Successfully (Reused Existing File) ===")

      return NextResponse.json({
        success: true,
        candidateId,
        message: "Resume processed successfully (reused existing file)",
        fileUrl: fileUrl,
        reusedExistingFile: true,
        ...parsedData,
      })
      
    } catch (parseError) {
      console.error("❌ Failed to parse existing file from Supabase storage:", parseError)
      return NextResponse.json({
        error: "Failed to parse existing file from Supabase storage",
        details: parseError instanceof Error ? parseError.message : "Unknown error",
        fileName: file.name,
        fileUrl: fileUrl,
        suggestions: [
          "The file may be corrupted in Supabase storage",
          "Try uploading the file again to replace the existing one",
          "Check if the file format is supported"
        ],
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

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

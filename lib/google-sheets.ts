import { google } from "googleapis"
import { checkFileExistsInBlob } from "./vercel-blob-utils"

// Initialize Google APIs
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

const sheets = google.sheets({ version: "v4", auth })
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID

export interface ComprehensiveCandidateData {
  id?: string
  // Basic Information
  name: string
  email: string
  phone: string
  dateOfBirth?: string
  gender?: string
  maritalStatus?: string
  // Professional Information
  currentRole: string
  desiredRole?: string
  currentCompany?: string
  location: string
  preferredLocation?: string
  totalExperience: string
  currentSalary?: string
  expectedSalary?: string
  noticePeriod?: string
  // Education Details
  highestQualification?: string
  degree?: string
  specialization?: string
  university?: string
  educationYear?: string
  educationPercentage?: string
  additionalQualifications?: string
  // Skills & Expertise
  technicalSkills: string[]
  softSkills: string[]
  languagesKnown?: string[]
  certifications?: string[]
  // Work Experience
  previousCompanies?: string[]
  jobTitles?: string[]
  workDuration?: string[]
  keyAchievements?: string[]
  workExperience?: Array<{
    company: string
    role: string
    duration: string
    description: string
  }>
  education?: Array<{
    degree: string
    specialization: string
    institution: string
    year: string
    percentage: string
  }>
  // Additional Information
  projects?: string[]
  awards?: string[]
  publications?: string[]
  references?: string[]
  linkedinProfile?: string
  portfolioUrl?: string
  githubProfile?: string
  summary?: string
  // File Information
  resumeText: string
  fileName: string
  driveFileId: string
  driveFileUrl: string
  // System Fields
  status: "new" | "reviewed" | "shortlisted" | "interviewed" | "selected" | "rejected" | "on-hold"
  tags: string[]
  rating?: number
  notes?: string
  uploadedAt: string
  updatedAt: string
  lastContacted?: string
  interviewStatus?: "not-scheduled" | "scheduled" | "completed" | "no-show" | "rescheduled"
  feedback?: string
}

// Initialize the spreadsheet with comprehensive headers
export async function initializeSpreadsheet() {
  try {
    const headers = [
      // Basic Information
      "ID",
      "Name",
      "Email",
      "Phone",
      "Date of Birth",
      "Gender",
      "Marital Status",
      // Professional Information
      "Current Role",
      "Desired Role",
      "Current Company",
      "Location",
      "Preferred Location",
      "Total Experience",
      "Current Salary",
      "Expected Salary",
      "Notice Period",
      // Education Details
      "Highest Qualification",
      "Degree",
      "Specialization",
      "University/College",
      "Education Year",
      "Education Percentage/CGPA",
      "Additional Qualifications",
      // Skills & Expertise
      "Technical Skills",
      "Soft Skills",
      "Languages Known",
      "Certifications",
      // Work Experience
      "Previous Companies",
      "Job Titles",
      "Work Duration",
      "Key Achievements",
      "Work Experience Details",
      "Education Details",
      // Additional Information
      "Projects",
      "Awards",
      "Publications",
      "References",
      "LinkedIn Profile",
      "Portfolio URL",
      "GitHub Profile",
      "Summary/Objective",
      // File Information
      "Resume Text",
      "File Name",
      "Drive File ID",
      "Drive File URL",
      // System Fields
      "Status",
      "Tags",
      "Rating",
      "Notes",
      "Uploaded At",
      "Updated At",
      "Last Contacted",
      "Interview Status",
      "Feedback",
    ]

    // Check if headers exist
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!A1:${String.fromCharCode(64 + headers.length)}1`,
    })

    if (!response.data.values || response.data.values.length === 0) {
      // Add headers if they don't exist
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A1:${String.fromCharCode(64 + headers.length)}1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [headers],
        },
      })
      console.log("✅ Comprehensive spreadsheet headers initialized")
    }

    return true
  } catch (error) {
    console.error("❌ Failed to initialize spreadsheet:", error)
    throw error
  }
}

// Add comprehensive candidate to Google Sheets
export async function addCandidate(candidateData: Omit<ComprehensiveCandidateData, "id">): Promise<string> {
  try {
    await initializeSpreadsheet()
    const id = generateId()

    const row = [
      // Basic Information
      id,
      candidateData.name,
      candidateData.email,
      candidateData.phone,
      candidateData.dateOfBirth || "",
      candidateData.gender || "",
      candidateData.maritalStatus || "",
      // Professional Information
      candidateData.currentRole,
      candidateData.desiredRole || "",
      candidateData.currentCompany || "",
      candidateData.location,
      candidateData.preferredLocation || "",
      candidateData.totalExperience,
      candidateData.currentSalary || "",
      candidateData.expectedSalary || "",
      candidateData.noticePeriod || "",
      // Education Details
      candidateData.highestQualification || "",
      candidateData.degree || "",
      candidateData.specialization || "",
      candidateData.university || "",
      candidateData.educationYear || "",
      candidateData.educationPercentage || "",
      candidateData.additionalQualifications || "",
      // Skills & Expertise
      candidateData.technicalSkills.join(", "),
      candidateData.softSkills.join(", "),
      candidateData.languagesKnown?.join(", ") || "",
      candidateData.certifications?.join(", ") || "",
      // Work Experience
      candidateData.previousCompanies?.join(", ") || "",
      candidateData.jobTitles?.join(", ") || "",
      candidateData.workDuration?.join(", ") || "",
      candidateData.keyAchievements?.join(", ") || "",
      // Work Experience Details & Education Details
      Array.isArray(candidateData.workExperience) ? candidateData.workExperience.map(exp => `${exp.role} at ${exp.company}`).join("; ") : "",
      Array.isArray(candidateData.education) ? candidateData.education.map(edu => `${edu.degree} from ${edu.institution}`).join("; ") : "",
      // Additional Information
      candidateData.projects?.join(", ") || "",
      candidateData.awards?.join(", ") || "",
      candidateData.publications?.join(", ") || "",
      candidateData.references?.join(", ") || "",
      candidateData.linkedinProfile || "",
      candidateData.portfolioUrl || "",
      candidateData.githubProfile || "",
      candidateData.summary || "",
      // File Information
      candidateData.resumeText,
      candidateData.fileName,
      candidateData.driveFileId,
      candidateData.driveFileUrl,
      // System Fields
      candidateData.status,
      candidateData.tags.join(", "),
      candidateData.rating || "",
      candidateData.notes || "",
      candidateData.uploadedAt,
      candidateData.updatedAt,
      candidateData.lastContacted || "",
      candidateData.interviewStatus || "not-scheduled",
      candidateData.feedback || "",
    ]

    // Log the row data for debugging
    console.log("📊 Row data being added to Google Sheets:")
    console.log(`- ID (col A): ${row[0]}`)
    console.log(`- Name (col B): ${row[1]}`)
    console.log(`- Email (col C): ${row[2]}`)
    console.log(`- Phone (col D): ${row[3]}`)
    console.log(`- Current Role (col H): ${row[7]}`)
    console.log(`- Current Company (col J): ${row[9]}`)
    console.log(`- Location (col K): ${row[10]}`)
    console.log(`- Total Experience (col M): ${row[12]}`)
    console.log(`- Education (col Q): ${row[16]}`)
    console.log(`- University (col T): ${row[19]}`)
    console.log(`- Education Year (col U): ${row[20]}`)
    console.log(`- Technical Skills (col X): ${row[23]}`)
    console.log(`- Soft Skills (col Y): ${row[24]}`)
    console.log(`- File Name (col AQ): ${row[42]}`)
    console.log(`- Drive File URL (col AS): ${row[44]}`)
    console.log(`- Status (col AT): ${row[45]}`)
    console.log(`- Uploaded At (col AX): ${row[49]}`)
    console.log(`- Row length: ${row.length} columns`)

    // Validate row data structure
    if (row.length !== 54) {
      console.error(`❌ Row data has incorrect length: ${row.length} columns, expected 54 (A-BB)`)
      console.error("Row data:", row)
      throw new Error(`Invalid row data structure: expected 54 columns, got ${row.length}`)
    }

    // Validate critical fields
    if (!row[1] || String(row[1]).trim() === "") {
      console.error("❌ Name field is empty or missing")
      throw new Error("Name field is required")
    }

    if (!row[7] || String(row[7]).trim() === "") {
      console.error("❌ Current Role field is empty or missing")
      throw new Error("Current Role field is required")
    }

    if (!row[10] || String(row[10]).trim() === "") {
      console.error("❌ Location field is empty or missing")
      throw new Error("Location field is required")
    }

    console.log("✅ Row data validation passed")

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:BB",
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    })

    console.log(`✅ Comprehensive candidate added to sheet: ${candidateData.name}`)
    return id
  } catch (error) {
    console.error("❌ Failed to add candidate:", error)
    throw error
  }
}

// Test Google Sheets connectivity
export async function testGoogleSheetsConnection(): Promise<boolean> {
  try {
    console.log("🧪 Testing Google Sheets connection...")
    
    if (!SPREADSHEET_ID) {
      console.error("❌ GOOGLE_SPREADSHEET_ID not set")
      return false
    }
    
    // Try to get just the headers to test connectivity
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:BB1", // Just the header row
    })
    
    console.log("✅ Google Sheets connection successful")
    console.log("📊 Headers found:", response.data.values?.[0]?.length || 0)
    
    return true
  } catch (error) {
    console.error("❌ Google Sheets connection failed:", error)
    return false
  }
}

// Get all candidates with comprehensive data
export async function getAllCandidates(): Promise<ComprehensiveCandidateData[]> {
  try {
    // console.log("🔍 getAllCandidates: Starting...")
    // console.log("🔍 getAllCandidates: SPREADSHEET_ID =", SPREADSHEET_ID)
    
    if (!SPREADSHEET_ID) {
      throw new Error("GOOGLE_SPREADSHEET_ID environment variable is not set")
    }
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A2:BB", // Skip header row, include all columns
    })

    // console.log("🔍 getAllCandidates: Google Sheets response:", {
    //   hasData: !!response.data.values,
    //   rowCount: response.data.values?.length || 0
    // })

    if (!response.data.values) {
      // console.log("🔍 getAllCandidates: No data returned from Google Sheets")
      return []
    }

    const candidates = response.data.values.map(
      (row): ComprehensiveCandidateData => ({
        // Basic Information
        id: row[0] || "",
        name: row[1] || "",
        email: row[2] || "",
        phone: row[3] || "",
        dateOfBirth: row[4] || "",
        gender: row[5] || "",
        maritalStatus: row[6] || "",
        // Professional Information
        currentRole: row[7] || "",
        desiredRole: row[8] || "",
        currentCompany: row[9] || "",
        location: row[10] || "",
        preferredLocation: row[11] || "",
        totalExperience: row[12] || "",
        currentSalary: row[13] || "",
        expectedSalary: row[14] || "",
        noticePeriod: row[15] || "",
        // Education Details
        highestQualification: row[16] || "",
        degree: row[17] || "",
        specialization: row[18] || "",
        university: row[19] || "",
        educationYear: row[20] || "",
        educationPercentage: row[21] || "",
        additionalQualifications: row[22] || "",
        // Skills & Expertise
        technicalSkills: row[23] ? row[23].split(", ").filter(Boolean) : [],
        softSkills: row[24] ? row[24].split(", ").filter(Boolean) : [],
        languagesKnown: row[25] ? row[25].split(", ").filter(Boolean) : [],
        certifications: row[26] ? row[26].split(", ").filter(Boolean) : [],
        // Work Experience
        previousCompanies: row[27] ? row[27].split(", ").filter(Boolean) : [],
        jobTitles: row[28] ? row[28].split(", ").filter(Boolean) : [],
        workDuration: row[29] ? row[29].split(", ").filter(Boolean) : [],
        keyAchievements: row[30] ? row[30].split(", ").filter(Boolean) : [],
        // Additional Information
        projects: row[31] ? row[31].split(", ").filter(Boolean) : [],
        awards: row[32] ? row[32].split(", ").filter(Boolean) : [],
        publications: row[33] ? row[33].split(", ").filter(Boolean) : [],
        references: row[34] ? row[34].split(", ").filter(Boolean) : [],
        linkedinProfile: row[37] || "",
        portfolioUrl: row[38] || "",
        githubProfile: row[39] || "",
        summary: row[40] || "",
        // File Information
        resumeText: row[41] || "",
        fileName: row[42] || "",
        driveFileId: row[43] || "",
        driveFileUrl: row[44] || "",
        // System Fields
        status: (row[45] as any) || "new",
        tags: row[46] ? row[46].split(", ").filter(Boolean) : [],
        rating: row[47] ? Number.parseInt(row[47]) : undefined,
        notes: row[48] || "",
        uploadedAt: row[49] || "",
        updatedAt: row[50] || "",
        lastContacted: row[51] || "",
        interviewStatus: (row[52] as any) || "not-scheduled",
        feedback: row[53] || "",
      }),
    )

    // console.log("🔍 getAllCandidates: Processed candidates:", candidates.length)
    // if (candidates.length > 0) {
    //   console.log("🔍 getAllCandidates: Sample candidate:", {
    //     id: candidates[0].id,
    //     name: candidates[0].name,
    //     email: candidates[0].email
    //   })
    // }

    // Sort candidates by upload date (newest first)
    const sortedCandidates = candidates.sort((a, b) => {
      const dateA = new Date(a.uploadedAt || 0).getTime()
      const dateB = new Date(b.uploadedAt || 0).getTime()
      return dateB - dateA // Newest first
    })

    console.log(`🔍 getAllCandidates: Sorted ${sortedCandidates.length} candidates by upload date (newest first)`)
    
    return sortedCandidates
  } catch (error) {
    console.error("❌ getAllCandidates failed:", error)
    throw error
  }
}

// Enhanced search with relevance scoring
export async function searchCandidates(query: string): Promise<ComprehensiveCandidateData[]> {
  try {
    const allCandidates = await getAllCandidates()
    const queryLower = query.toLowerCase()
    const searchTerms = queryLower.split(/\s+/).filter((term) => term.length > 2)

    const results = allCandidates.map((candidate) => {
      let relevanceScore = 0
      const matchedFields: string[] = []

      // Define search fields with weights
      const searchFields = [
        { field: "currentRole", weight: 3, value: candidate.currentRole },
        { field: "desiredRole", weight: 2.5, value: candidate.desiredRole || "" },
        { field: "technicalSkills", weight: 2, value: candidate.technicalSkills.join(" ") },
        { field: "location", weight: 2, value: candidate.location },
        { field: "degree", weight: 1.5, value: candidate.degree || "" },
        { field: "certifications", weight: 1.5, value: candidate.certifications?.join(" ") || "" },
        { field: "softSkills", weight: 1.5, value: candidate.softSkills.join(" ") },
        { field: "currentCompany", weight: 1.2, value: candidate.currentCompany || "" },
        { field: "resumeText", weight: 1, value: candidate.resumeText },
      ]

      // Calculate relevance score
      searchTerms.forEach((term) => {
        searchFields.forEach(({ field, weight, value }) => {
          if (value.toLowerCase().includes(term)) {
            relevanceScore += weight
            if (!matchedFields.includes(field)) {
              matchedFields.push(field)
            }
          }
        })
      })

      // Bonus for exact phrase matches
      const fullText = searchFields
        .map((f) => f.value)
        .join(" ")
        .toLowerCase()
      if (fullText.includes(queryLower)) {
        relevanceScore += 5
      }

      return {
        ...candidate,
        relevanceScore,
        matchedFields,
      }
    })

    // Filter and sort by relevance
    return results
      .filter((candidate) => candidate.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  } catch (error) {
    console.error("❌ Failed to search candidates:", error)
    throw error
  }
}

// Update candidate with comprehensive data - IMPROVED VERSION
export async function updateCandidate(id: string, updates: Partial<ComprehensiveCandidateData>): Promise<void> {
  try {
    // console.log(`🔍 Searching for candidate with ID: ${id}`)
    const candidates = await getAllCandidates()
    // console.log(`📊 Total candidates found: ${candidates.length}`)

    // Find candidate by ID (more flexible matching)
    const candidateIndex = candidates.findIndex((c) => {
      const candidateId = c.id || ""
      // console.log(`🔍 Comparing: "${candidateId}" with "${id}"`)
      return candidateId === id || candidateId.toString() === id.toString()
    })

    // console.log(`📍 Candidate index found: ${candidateIndex}`)

    if (candidateIndex === -1) {
      console.error(`❌ Candidate not found with ID: ${id}`)
      // console.log("Available candidate IDs:", candidates.map((c) => c.id).slice(0, 10))
      throw new Error(`Candidate not found with ID: ${id}`)
    }

    const candidate = candidates[candidateIndex]
    const updatedCandidate = { ...candidate, ...updates, updatedAt: new Date().toISOString() }
    const rowNumber = candidateIndex + 2 // +2 because array is 0-indexed and we skip header

    // console.log(`📝 Updating row number: ${rowNumber}`)

    // First, let's ensure the headers are correct
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:BB1",
    })

    const currentHeaders = headerResponse.data.values?.[0] || []
    // console.log("Current headers:", currentHeaders)

    // Define the expected column structure
    const expectedColumns = [
      "ID", "Name", "Email", "Phone", "Date of Birth", "Gender", "Marital Status",
      "Current Role", "Desired Role", "Current Company", "Location", "Preferred Location",
      "Total Experience", "Current Salary", "Expected Salary", "Notice Period",
      "Highest Qualification", "Degree", "Specialization", "University/College",
      "Education Year", "Education Percentage/CGPA", "Additional Qualifications",
      "Technical Skills", "Soft Skills", "Languages Known", "Certifications",
      "Previous Companies", "Job Titles", "Work Duration", "Key Achievements",
      "Work Experience Details", "Education Details", "Projects", "Awards",
      "Publications", "References", "LinkedIn Profile", "Portfolio URL",
      "GitHub Profile", "Summary/Objective", "Resume Text", "File Name",
      "Drive File ID", "Drive File URL", "Status", "Tags", "Rating",
      "Notes", "Uploaded At", "Updated At", "Last Contacted", "Interview Status", "Feedback"
    ]

    // Check if headers need to be updated
    let headersNeedUpdate = false
    if (currentHeaders.length !== expectedColumns.length) {
      headersNeedUpdate = true
    } else {
      for (let i = 0; i < expectedColumns.length; i++) {
        if (currentHeaders[i] !== expectedColumns[i]) {
          headersNeedUpdate = true
          break
        }
      }
    }

    if (headersNeedUpdate) {
      console.log("Updating headers to match expected structure...")
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A1:BB1",
        valueInputOption: "RAW",
        requestBody: {
          values: [expectedColumns],
        },
      })
      console.log("✅ Headers updated")
    }

    // Create the complete row data with proper column alignment
    const row = new Array(expectedColumns.length).fill("")
    
    // Map data to correct columns based on expected structure
    row[0] = updatedCandidate.id || generateId() // ID
    row[1] = updatedCandidate.name || "Unknown Name" // Name
    row[2] = updatedCandidate.email || "" // Email
    row[3] = updatedCandidate.phone || "" // Phone
    row[4] = updatedCandidate.dateOfBirth || "" // Date of Birth
    row[5] = updatedCandidate.gender || "" // Gender
    row[6] = updatedCandidate.maritalStatus || "" // Marital Status
    row[7] = updatedCandidate.currentRole || "Not specified" // Current Role
    row[8] = updatedCandidate.desiredRole || "" // Desired Role
    row[9] = updatedCandidate.currentCompany || "" // Current Company
    row[10] = updatedCandidate.location || "Not specified" // Location
    row[11] = updatedCandidate.preferredLocation || "" // Preferred Location
    row[12] = updatedCandidate.totalExperience || "Not specified" // Total Experience
    row[13] = updatedCandidate.currentSalary || "" // Current Salary
    row[14] = updatedCandidate.expectedSalary || "" // Expected Salary
    row[15] = updatedCandidate.noticePeriod || "" // Notice Period
    row[16] = updatedCandidate.highestQualification || "" // Highest Qualification
    row[17] = updatedCandidate.degree || "" // Degree
    row[18] = updatedCandidate.specialization || "" // Specialization
    row[19] = updatedCandidate.university || "" // University/College
    row[20] = updatedCandidate.educationYear || "" // Education Year
    row[21] = updatedCandidate.educationPercentage || "" // Education Percentage/CGPA
    row[22] = updatedCandidate.additionalQualifications || "" // Additional Qualifications
    row[23] = Array.isArray(updatedCandidate.technicalSkills) ? updatedCandidate.technicalSkills.join(", ") : "" // Technical Skills
    row[24] = Array.isArray(updatedCandidate.softSkills) ? updatedCandidate.softSkills.join(", ") : "" // Soft Skills
    row[25] = Array.isArray(updatedCandidate.languagesKnown) ? updatedCandidate.languagesKnown.join(", ") : "" // Languages Known
    row[26] = Array.isArray(updatedCandidate.certifications) ? updatedCandidate.certifications.join(", ") : "" // Certifications
    row[27] = Array.isArray(updatedCandidate.previousCompanies) ? updatedCandidate.previousCompanies.join(", ") : "" // Previous Companies
    row[28] = Array.isArray(updatedCandidate.jobTitles) ? updatedCandidate.jobTitles.join(", ") : "" // Job Titles
    row[29] = Array.isArray(updatedCandidate.workDuration) ? updatedCandidate.workDuration.join(", ") : "" // Work Duration
    row[30] = Array.isArray(updatedCandidate.keyAchievements) ? updatedCandidate.keyAchievements.join(", ") : "" // Key Achievements
    row[31] = Array.isArray(updatedCandidate.workExperience) ? updatedCandidate.workExperience.map(exp => `${exp.role} at ${exp.company}`).join("; ") : "" // Work Experience Details
    row[32] = Array.isArray(updatedCandidate.education) ? updatedCandidate.education.map(edu => `${edu.degree} from ${edu.institution}`).join("; ") : "" // Education Details
    row[33] = Array.isArray(updatedCandidate.projects) ? updatedCandidate.projects.join(", ") : "" // Projects
    row[34] = Array.isArray(updatedCandidate.awards) ? updatedCandidate.awards.join(", ") : "" // Awards
    row[35] = Array.isArray(updatedCandidate.publications) ? updatedCandidate.publications.join(", ") : "" // Publications
    row[36] = Array.isArray(updatedCandidate.references) ? updatedCandidate.references.join(", ") : "" // References
    row[37] = updatedCandidate.linkedinProfile || "" // LinkedIn Profile
    row[38] = updatedCandidate.portfolioUrl || "" // Portfolio URL
    row[39] = updatedCandidate.githubProfile || "" // GitHub Profile
    row[40] = updatedCandidate.summary || "" // Summary/Objective
    row[41] = updatedCandidate.resumeText || "" // Resume Text
    row[42] = updatedCandidate.fileName || "" // File Name
    row[43] = updatedCandidate.driveFileId || "" // Drive File ID
    row[44] = updatedCandidate.driveFileUrl || "" // Drive File URL
    row[45] = updatedCandidate.status || "new" // Status
    row[46] = Array.isArray(updatedCandidate.tags) ? updatedCandidate.tags.join(", ") : "" // Tags
    row[47] = updatedCandidate.rating || "" // Rating
    row[48] = updatedCandidate.notes || "" // Notes
    row[49] = updatedCandidate.uploadedAt || new Date().toISOString() // Uploaded At
    row[50] = updatedCandidate.updatedAt || new Date().toISOString() // Updated At
    row[51] = updatedCandidate.lastContacted || "" // Last Contacted
    row[52] = updatedCandidate.interviewStatus || "not-scheduled" // Interview Status
    row[53] = updatedCandidate.feedback || "" // Feedback

    console.log("Row data prepared with proper alignment:")
    console.log("- Name (col 1):", row[1])
    console.log("- Email (col 2):", row[2])
    console.log("- Phone (col 3):", row[3])
    console.log("- Current Role (col 7):", row[7])
    console.log("- Current Company (col 9):", row[9])
    console.log("- Location (col 10):", row[10])
    console.log("- Total Experience (col 12):", row[12])
    console.log("- Education (col 16):", row[16])
    console.log("- Technical Skills (col 23):", row[23])
    console.log("- Soft Skills (col 24):", row[24])
    console.log("- File Name (col 42):", row[42])
    console.log("- Drive File URL (col 44):", row[44])
    console.log("- Status (col 45):", row[45])
    console.log("- Uploaded At (col 49):", row[49])

    // Update the specific row in Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!A${rowNumber}:BB${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    })

    console.log(`✅ Candidate ${id} updated successfully in row ${rowNumber}`)

  } catch (error) {
    console.error(`❌ Failed to update candidate ${id}:`, error)
    throw error
  }
}

// Generate analytics with comprehensive data
export async function getAnalytics(period = "all"): Promise<any> {
  try {
    const candidates = await getAllCandidates()

    // Filter by period if needed
    let filteredCandidates = candidates
    if (period !== "all") {
      const now = new Date()
      const periodMs =
        {
          "1d": 24 * 60 * 60 * 1000,
          "7d": 7 * 24 * 60 * 60 * 1000,
          "30d": 30 * 24 * 60 * 60 * 1000,
        }[period] || 0

      if (periodMs > 0) {
        const cutoffDate = new Date(now.getTime() - periodMs)
        filteredCandidates = candidates.filter((c) => new Date(c.uploadedAt) >= cutoffDate)
      }
    }

    // Calculate comprehensive statistics
    const statusBreakdown = filteredCandidates.reduce(
      (acc, candidate) => {
        acc[candidate.status] = (acc[candidate.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const roleBreakdown = filteredCandidates.reduce(
      (acc, candidate) => {
        acc[candidate.currentRole] = (acc[candidate.currentRole] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const locationBreakdown = filteredCandidates.reduce(
      (acc, candidate) => {
        acc[candidate.location] = (acc[candidate.location] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const educationBreakdown = filteredCandidates.reduce(
      (acc, candidate) => {
        const education = candidate.highestQualification || "Not specified"
        acc[education] = (acc[education] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const experienceBreakdown = filteredCandidates.reduce(
      (acc, candidate) => {
        const exp = candidate.totalExperience || "Not specified"
        acc[exp] = (acc[exp] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalResumes: filteredCandidates.length,
      totalCandidates: filteredCandidates.length,
      statusBreakdown,
      roleBreakdown,
      locationBreakdown,
      educationBreakdown,
      experienceBreakdown,
      recentUploads: filteredCandidates
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(0, 10)
        .map((c) => ({
          _id: c.id,
          id: c.id,
          name: c.name,
          currentRole: c.currentRole,
          location: c.location,
          status: c.status,
          uploadedAt: c.uploadedAt,
          email: c.email,
          phone: c.phone,
          technicalSkills: c.technicalSkills,
          driveFileUrl: c.driveFileUrl,
          fileName: c.fileName,
          resumeText: c.resumeText,
          totalExperience: c.totalExperience,
          currentCompany: c.currentCompany,
        })),
    }
  } catch (error) {
    console.error("❌ Failed to get analytics:", error)
    throw error
  }
}

// Helper function to generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Export candidates to CSV with comprehensive data
export async function exportCandidatesToCSV(): Promise<string> {
  try {
    const candidates = await getAllCandidates()

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Current Role",
      "Location",
      "Total Experience",
      "Highest Qualification",
      "Technical Skills",
      "Status",
      "Uploaded At",
    ]

    const csvRows = candidates.map((candidate) => [
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.currentRole,
      candidate.location,
      candidate.totalExperience,
      candidate.highestQualification || "",
      candidate.technicalSkills.join("; "),
      candidate.status,
      candidate.uploadedAt,
    ])

    const csvContent = [headers, ...csvRows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    return csvContent
  } catch (error) {
    console.error("❌ Failed to export candidates:", error)
    throw error
  }
}

// Delete candidate from Google Sheets by ID
export async function deleteCandidate(candidateId: string): Promise<boolean> {
  try {
    // First, find the row number for the candidate
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:A", // Check ID column
    })

    if (!response.data.values) {
      throw new Error("No data found in spreadsheet")
    }

    // Find the row index (1-based, but we need to account for header row)
    let rowIndex = -1
    for (let i = 1; i < response.data.values.length; i++) {
      if (response.data.values[i][0] === candidateId) {
        rowIndex = i + 1 // +1 because sheets are 1-indexed
        break
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Candidate with ID ${candidateId} not found`)
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming Sheet1 has ID 0
                dimension: "ROWS",
                startIndex: rowIndex - 1, // 0-indexed for the API
                endIndex: rowIndex, // Delete one row
              },
            },
          },
        ],
      },
    })

    console.log(`✅ Candidate ${candidateId} deleted from Google Sheets`)
    return true
  } catch (error) {
    console.error("❌ Failed to delete candidate from Google Sheets:", error)
    throw error
  }
}

// Get candidate by ID
export async function getCandidateById(candidateId: string): Promise<ComprehensiveCandidateData | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:BB", // Include all columns
    })

    if (!response.data.values) {
      return null
    }

    // Find the candidate by ID (skip header row)
    for (let i = 1; i < response.data.values.length; i++) {
      const row = response.data.values[i]
      if (row[0] === candidateId) {
        return mapRowToCandidateData(row)
      }
    }

    return null
  } catch (error) {
    console.error("❌ Failed to get candidate by ID:", error)
    throw error
  }
}

// Helper function to map row data to candidate data
function mapRowToCandidateData(row: any[]): ComprehensiveCandidateData {
  return {
    id: row[0] || "",
    name: row[1] || "",
    email: row[2] || "",
    phone: row[3] || "",
    dateOfBirth: row[4] || "",
    gender: row[5] || "",
    maritalStatus: row[6] || "",
    currentRole: row[7] || "",
    desiredRole: row[8] || "",
    currentCompany: row[9] || "",
    location: row[10] || "",
    preferredLocation: row[11] || "",
    totalExperience: row[12] || "",
    currentSalary: row[13] || "",
    expectedSalary: row[14] || "",
    noticePeriod: row[15] || "",
    highestQualification: row[16] || "",
    degree: row[17] || "",
    specialization: row[18] || "",
    university: row[19] || "",
    educationYear: row[20] || "",
    educationPercentage: row[21] || "",
    additionalQualifications: row[22] || "",
    technicalSkills: row[23] ? row[23].split(", ").filter(Boolean) : [],
    softSkills: row[24] ? row[24].split(", ").filter(Boolean) : [],
    languagesKnown: row[25] ? row[25].split(", ").filter(Boolean) : [],
    certifications: row[26] ? row[26].split(", ").filter(Boolean) : [],
    previousCompanies: row[27] ? row[27].split(", ").filter(Boolean) : [],
    jobTitles: row[28] ? row[28].split(", ").filter(Boolean) : [],
    workDuration: row[29] ? row[29].split(", ").filter(Boolean) : [],
    keyAchievements: row[30] ? row[30].split(", ").filter(Boolean) : [],
    workExperience: [], // Parse from workExperienceDetails if needed
    education: [], // Parse from educationDetails if needed
    projects: row[31] ? row[31].split(", ").filter(Boolean) : [],
    awards: row[32] ? row[32].split(", ").filter(Boolean) : [],
    publications: row[33] ? row[33].split(", ").filter(Boolean) : [],
    references: row[34] ? row[34].split(", ").filter(Boolean) : [],
    linkedinProfile: row[35] || "",
    portfolioUrl: row[36] || "",
    githubProfile: row[37] || "",
    summary: row[38] || "",
    resumeText: row[39] || "",
    fileName: row[40] || "",
    driveFileId: row[41] || "",
    driveFileUrl: row[42] || "",
    status: (row[43] as any) || "new",
    tags: row[44] ? row[44].split(", ").filter(Boolean) : [],
    rating: row[45] ? parseFloat(row[45]) : undefined,
    notes: row[46] || "",
    uploadedAt: row[47] || "",
    updatedAt: row[48] || "",
    lastContacted: row[49] || "",
    interviewStatus: (row[50] as any) || "not-scheduled",
    feedback: row[51] || "",
  }
}

// Realign and clean up Google Sheets data structure
export async function realignSpreadsheetData(): Promise<boolean> {
  try {
    console.log("=== Starting Google Sheets Data Realignment ===")
    
    // First, get all current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:BB", // Include all columns
    })

    if (!response.data.values || response.data.values.length === 0) {
      console.log("No data found to realign")
      return true
    }

    const rows = response.data.values
    const headers = rows[0] // First row should be headers
    const dataRows = rows.slice(1) // Skip header row

    console.log(`Found ${dataRows.length} data rows to realign`)

    // Define the expected column structure
    const expectedColumns = [
      "ID", "Name", "Email", "Phone", "Date of Birth", "Gender", "Marital Status",
      "Current Role", "Desired Role", "Current Company", "Location", "Preferred Location",
      "Total Experience", "Current Salary", "Expected Salary", "Notice Period",
      "Highest Qualification", "Degree", "Specialization", "University/College",
      "Education Year", "Education Percentage/CGPA", "Additional Qualifications",
      "Technical Skills", "Soft Skills", "Languages Known", "Certifications",
      "Previous Companies", "Job Titles", "Work Duration", "Key Achievements",
      "Work Experience Details", "Education Details", "Projects", "Awards",
      "Publications", "References", "LinkedIn Profile", "Portfolio URL",
      "GitHub Profile", "Summary/Objective", "Resume Text", "File Name",
      "Drive File ID", "Drive File URL", "Status", "Tags", "Rating",
      "Notes", "Uploaded At", "Updated At", "Last Contacted", "Interview Status", "Feedback"
    ]

    // Check if headers need to be updated
    let headersNeedUpdate = false
    if (headers.length !== expectedColumns.length) {
      headersNeedUpdate = true
    } else {
      for (let i = 0; i < expectedColumns.length; i++) {
        if (headers[i] !== expectedColumns[i]) {
          headersNeedUpdate = true
          break
        }
      }
    }

    if (headersNeedUpdate) {
      console.log("Updating headers to match expected structure...")
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A1:BB1",
        valueInputOption: "RAW",
        requestBody: {
          values: [expectedColumns],
        },
      })
      console.log("✅ Headers updated")
    }

    // Process each data row to ensure proper alignment
    const realignedRows = dataRows.map((row, index) => {
      const realignedRow = new Array(expectedColumns.length).fill("")
      
      // Map existing data to correct columns
      for (let i = 0; i < Math.min(row.length, expectedColumns.length); i++) {
        realignedRow[i] = row[i] || ""
      }

      // Ensure ID is present
      if (!realignedRow[0]) {
        realignedRow[0] = generateId()
      }

      // Ensure required fields have default values
      if (!realignedRow[1]) realignedRow[1] = "Unknown Name"
      if (!realignedRow[7]) realignedRow[7] = "Not specified"
      if (!realignedRow[10]) realignedRow[10] = "Not specified"
      if (!realignedRow[12]) realignedRow[12] = "Not specified"
      if (!realignedRow[45]) realignedRow[45] = "new"
      if (!realignedRow[46]) realignedRow[46] = ""
      if (!realignedRow[49]) realignedRow[49] = new Date().toISOString()
      if (!realignedRow[50]) realignedRow[50] = new Date().toISOString()
      if (!realignedRow[52]) realignedRow[52] = "not-scheduled"

      return realignedRow
    })

    // Clear existing data (excluding headers)
    if (dataRows.length > 0) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A2:BB",
      })
      console.log("✅ Existing data cleared")
    }

    // Add realigned data
    if (realignedRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A2:BB",
        valueInputOption: "RAW",
        requestBody: {
          values: realignedRows,
        },
      })
      console.log("✅ Realigned data added")
    }

    console.log("=== Google Sheets Data Realignment Completed ===")
    return true

  } catch (error) {
    console.error("❌ Failed to realign spreadsheet data:", error)
    throw error
  }
}

// Clean up duplicate entries and fix data inconsistencies
export async function cleanupSpreadsheetData(): Promise<boolean> {
  try {
    console.log("=== Starting Google Sheets Data Cleanup ===")
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:BB",
    })

    if (!response.data.values || response.data.values.length <= 1) {
      console.log("No data to clean up")
      return true
    }

    const rows = response.data.values
    const headers = rows[0]
    const dataRows = rows.slice(1)

    // Remove duplicate entries based on email OR combination of name + phone + location
    const seenEmails = new Set<string>()
    const seenNamePhoneLocation = new Set<string>()
    const uniqueRows = [headers]

    for (const row of dataRows) {
      const email = row[2] || "" // Email column
      const name = row[1] || "" // Name column
      const phone = row[3] || "" // Phone column
      const location = row[10] || "" // Location column
      
      // Always remove exact email duplicates (same person, multiple uploads)
      if (email && seenEmails.has(email)) {
        console.log(`Removing duplicate email: ${email}`)
        continue
      }
      
      // For name duplicates, check if they're actually the same person
      // by looking at phone and location combination
      if (name && name.trim()) {
        const namePhoneLocationKey = `${name.toLowerCase().trim()}_${phone.toLowerCase().trim()}_${location.toLowerCase().trim()}`
        
        if (seenNamePhoneLocation.has(namePhoneLocationKey)) {
          console.log(`Removing duplicate person: ${name} (same phone: ${phone}, location: ${location})`)
          continue
        }
        
        // Only add to seen set if we have meaningful phone or location data
        if (phone.trim() || location.trim()) {
          seenNamePhoneLocation.add(namePhoneLocationKey)
        }
      }

      if (email) seenEmails.add(email)
      uniqueRows.push(row)
    }

    if (uniqueRows.length !== rows.length) {
      console.log(`Removed ${rows.length - uniqueRows.length} duplicate entries`)
      
      // Clear and rewrite the entire sheet
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A:BB",
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A1:BB",
        valueInputOption: "RAW",
        requestBody: {
          values: uniqueRows,
        },
      })
    }

    console.log("=== Google Sheets Data Cleanup Completed ===")
    return true
  } catch (error) {
    console.error("❌ Failed to cleanup spreadsheet data:", error)
    throw error
  }
}

// Function to restore potentially lost profiles by checking for missing data
export async function restoreMissingProfiles(): Promise<{ restored: number; errors: string[] }> {
  try {
    console.log("=== Starting Profile Restoration Check ===")
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:BB",
    })

    if (!response.data.values || response.data.values.length <= 1) {
      console.log("No data to check for restoration")
      return { restored: 0, errors: [] }
    }

    const rows = response.data.values
    const headers = rows[0]
    const dataRows = rows.slice(1)
    
    let restored = 0
    const errors: string[] = []

    // Check for rows with missing critical data that might indicate lost profiles
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowIndex = i + 2 // +2 because we start from row 2 and i is 0-based
      
      const name = row[1] || "" // Name column
      const email = row[2] || "" // Email column
      const phone = row[3] || "" // Phone column
      const currentRole = row[7] || "" // Current Role column
      const location = row[10] || "" // Location column
      
      // Check if this row has suspiciously missing data that might indicate a lost profile
      const hasCriticalData = name.trim() && (email.trim() || phone.trim() || currentRole.trim() || location.trim())
      
      if (!hasCriticalData) {
        console.log(`Row ${rowIndex} has missing critical data - might be a lost profile`)
        console.log(`Name: "${name}", Email: "${email}", Phone: "${phone}", Role: "${currentRole}", Location: "${location}"`)
        
        // Try to infer missing data from other fields
        let updated = false
        
        // If name is missing but we have other data, try to extract from resume text
        if (!name.trim() && row[40]) { // Resume Text column
          const resumeText = row[40]
          const extractedName = extractNameFromResumeText(resumeText)
          if (extractedName) {
            row[1] = extractedName
            updated = true
            console.log(`Restored name "${extractedName}" for row ${rowIndex}`)
          }
        }
        
        // If location is missing but we have resume text, try to extract
        if (!location.trim() && row[40]) {
          const resumeText = row[40]
          const extractedLocation = extractLocationFromResumeText(resumeText)
          if (extractedLocation) {
            row[10] = extractedLocation
            updated = true
            console.log(`Restored location "${extractedLocation}" for row ${rowIndex}`)
          }
        }
        
        if (updated) {
          restored++
        }
      }
    }

    // If we made changes, update the sheet
    if (restored > 0) {
      console.log(`Restoring ${restored} profiles...`)
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A2:BB",
        valueInputOption: "RAW",
        requestBody: {
          values: dataRows,
        },
      })
      
      console.log(`✅ Successfully restored ${restored} profiles`)
    } else {
      console.log("No profiles needed restoration")
    }

    return { restored, errors }

  } catch (error) {
    console.error("❌ Failed to restore missing profiles:", error)
    return { restored: 0, errors: [error instanceof Error ? error.message : "Unknown error"] }
  }
}

// Helper function to extract name from resume text
function extractNameFromResumeText(resumeText: string): string | null {
  if (!resumeText) return null
  
  const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Look for name patterns in the first few lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i]
    
    // Skip common resume headers
    if (line.toLowerCase().includes('resume') || 
        line.toLowerCase().includes('curriculum') || 
        line.toLowerCase().includes('vitae') ||
        line.toLowerCase().includes('cv') ||
        line.includes('@') ||
        line.match(/^\d/)) {
      continue
    }
    
    // Look for name patterns (2-4 words, starts with capital)
    const namePattern = /^[A-Z][a-zA-Z\s]{2,40}$/
    if (namePattern.test(line) && line.split(' ').length >= 2 && line.split(' ').length <= 4) {
      return line
    }
  }
  
  return null
}

// Helper function to extract location from resume text
function extractLocationFromResumeText(resumeText: string): string | null {
  if (!resumeText) return null
  
  const locationPatterns = [
    /(?:location|address|city)[:\s]*([A-Z][a-zA-Z\s,]+(?:City|Town|District|State|Country|India|INDIA))/i,
    /(?:in|at|from)\s+([A-Z][a-zA-Z\s]+(?:City|Town|District|State|Country|India|INDIA))/i,
    /([A-Z][a-zA-Z\s]+(?:City|Town|District|State|Country|India|INDIA))/i
  ]
  
  for (const pattern of locationPatterns) {
    const match = resumeText.match(pattern)
    if (match && match[1]) {
      const location = match[1].trim()
      if (location.length > 3 && location.length < 100) {
        return location
      }
    }
  }
  
  return null
}

// Reparse individual candidate data
export async function reparseCandidate(candidateId: string, blobUrl: string, fileName: string): Promise<boolean> {
  try {
    console.log(`=== Reparsing Candidate ${candidateId} from original file ===`)
    
    // Resolve a valid blob URL even if older rows stored only a filename/pathname
    let resolvedUrl = blobUrl
    const looksLikeUrl = typeof resolvedUrl === "string" && /^https?:\/\//i.test(resolvedUrl)
    if (!looksLikeUrl) {
      console.log("Blob URL is not a valid URL. Attempting to resolve via Vercel Blob...")
      // Try using driveFileId (often a pathname) first
      if (blobUrl && typeof blobUrl === "string") {
        const attempt1 = await checkFileExistsInBlob(blobUrl)
        if (attempt1.exists && attempt1.url) {
          resolvedUrl = attempt1.url
          console.log("Resolved from driveFileId/pathname:", resolvedUrl)
        }
      }
      // Try using provided fileName
      if (!/^https?:\/\//i.test(resolvedUrl) && fileName) {
        const attempt2 = await checkFileExistsInBlob(fileName)
        if (attempt2.exists && attempt2.url) {
          resolvedUrl = attempt2.url
          console.log("Resolved from fileName:", resolvedUrl)
        }
      }
      if (!/^https?:\/\//i.test(resolvedUrl)) {
        throw new Error(`Unable to resolve a valid blob URL for reparsing. Got "${blobUrl}"`) 
      }
    }

    // Download the original file from blob storage
    console.log("Downloading original file from blob storage...", resolvedUrl)
    const response = await fetch(resolvedUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to download file from blob storage: ${response.status}`)
    }
    
    const blob = await response.blob()

    // Determine a reliable MIME type for the file (blob.type can be empty)
    const lowerName = (fileName || "").toLowerCase()
    const inferredType = (() => {
      if (lowerName.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      if (lowerName.endsWith(".doc")) return "application/msword"
      if (lowerName.endsWith(".pdf")) return "application/pdf"
      if (lowerName.endsWith(".txt")) return "text/plain"
      return "application/octet-stream"
    })()

    const reliableType = blob.type && blob.type !== "application/octet-stream" ? blob.type : inferredType

    // Convert blob to Buffer for Node.js compatibility
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`✅ Downloaded file: ${fileName} (${blob.size} bytes)`)
    
    // Import the parseResume function dynamically to avoid circular dependencies
    const { parseResume } = await import("./resume-parser")
    
    // Create a proper mock File object that implements all required methods
    const mockFile = {
      name: fileName,
      type: reliableType,
      size: blob.size,
      arrayBuffer: () => Promise.resolve(arrayBuffer),
      text: () => blob.text(),
      // Add any other File methods that might be needed
      slice: (start?: number, end?: number) => {
        const slicedBuffer = arrayBuffer.slice(start || 0, end || arrayBuffer.byteLength)
        return {
          arrayBuffer: () => Promise.resolve(slicedBuffer),
          text: () => new TextDecoder().decode(slicedBuffer)
        }
      }
    }
    
    // Reparse the resume using the mock file object
    console.log("Reparsing resume from original file...")
    const reparsedData = await parseResume(mockFile as any)
    
    if (!reparsedData || !reparsedData.name || reparsedData.name.toLowerCase() === "unknown") {
      throw new Error("Reparsing failed to extract valid candidate information")
    }

    console.log(`✅ Successfully reparsed: ${reparsedData.name}`)

    // Update the candidate in Google Sheets
    await updateCandidate(candidateId, {
      name: reparsedData.name,
      email: reparsedData.email || "",
      phone: reparsedData.phone || "",
      currentRole: reparsedData.currentRole || "Not specified",
      desiredRole: reparsedData.desiredRole || "",
      currentCompany: reparsedData.currentCompany || "",
      location: reparsedData.location || "Not specified",
      preferredLocation: reparsedData.preferredLocation || "",
      totalExperience: reparsedData.totalExperience || "Not specified",
      currentSalary: reparsedData.currentSalary || "",
      expectedSalary: reparsedData.expectedSalary || "",
      noticePeriod: reparsedData.noticePeriod || "",
      highestQualification: reparsedData.highestQualification || "",
      degree: reparsedData.degree || "",
      specialization: reparsedData.specialization || "",
      university: reparsedData.university || "",
      educationYear: reparsedData.educationYear || "",
      educationPercentage: reparsedData.educationPercentage || "",
      technicalSkills: reparsedData.technicalSkills || [],
      softSkills: reparsedData.softSkills || [],
      languagesKnown: reparsedData.languagesKnown || [],
      certifications: reparsedData.certifications || [],
      previousCompanies: reparsedData.previousCompanies || [],
      keyAchievements: reparsedData.keyAchievements || [],
      projects: reparsedData.projects || [],
      linkedinProfile: reparsedData.linkedinProfile || "",
      summary: reparsedData.summary || "",
      resumeText: reparsedData.resumeText || "",
      updatedAt: new Date().toISOString(),
    })

    console.log(`✅ Candidate ${candidateId} reparsed and updated successfully`)
    return true

  } catch (error) {
    console.error(`❌ Failed to reparse candidate ${candidateId}:`, error)
    throw error
  }
}

// Get candidates with parsing issues (unknown names, missing data)
export async function getCandidatesWithIssues(): Promise<ComprehensiveCandidateData[]> {
  try {
    const allCandidates = await getAllCandidates()
    
    return allCandidates.filter(candidate => {
      // Check for common parsing issues
      return !candidate.name || 
             candidate.name.toLowerCase() === "unknown" ||
             candidate.name.toLowerCase() === "not specified" ||
             candidate.name.trim() === "" ||
             candidate.name.length < 2 ||
             (!candidate.email && !candidate.phone && !candidate.currentRole) ||
             candidate.currentRole === "Not specified" ||
             candidate.location === "Not specified"
    })
  } catch (error) {
    console.error("❌ Failed to get candidates with issues:", error)
    throw error
  }
}

// Bulk reparse all candidates with issues
export async function bulkReparseCandidates(): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    console.log("=== Starting Bulk Reparse of Candidates with Issues ===")
    
    const candidatesWithIssues = await getCandidatesWithIssues()
    console.log(`Found ${candidatesWithIssues.length} candidates with parsing issues`)
    
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []
    
    for (const candidate of candidatesWithIssues) {
      try {
        if (candidate.driveFileUrl && candidate.fileName) {
          await reparseCandidate(candidate.id!, candidate.driveFileUrl, candidate.fileName)
          successCount++
          console.log(`✅ Reparsed candidate: ${candidate.name || candidate.id}`)
        } else {
          failedCount++
          errors.push(`Candidate ${candidate.id}: No original file available for reparsing`)
        }
      } catch (error) {
        failedCount++
        const errorMsg = `Candidate ${candidate.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
      
      // Add a small delay to avoid overwhelming the APIs
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`=== Bulk Reparse Completed: ${successCount} success, ${failedCount} failed ===`)
    
    return {
      success: successCount,
      failed: failedCount,
      errors
    }
    
  } catch (error) {
    console.error("❌ Bulk reparse failed:", error)
    throw error
  }
}

// Realign all existing data to ensure proper column structure
export async function realignAllData(): Promise<boolean> {
  try {
    console.log("=== Starting Complete Data Realignment ===")
    
    // First, get all current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:BB", // Include all columns
    })

    if (!response.data.values || response.data.values.length === 0) {
      console.log("No data found to realign")
      return true
    }

    const rows = response.data.values
    const headers = rows[0] // First row should be headers
    const dataRows = rows.slice(1) // Skip header row

    console.log(`Found ${dataRows.length} data rows to realign`)

    // Define the expected column structure
    const expectedColumns = [
      "ID", "Name", "Email", "Phone", "Date of Birth", "Gender", "Marital Status",
      "Current Role", "Desired Role", "Current Company", "Location", "Preferred Location",
      "Total Experience", "Current Salary", "Expected Salary", "Notice Period",
      "Highest Qualification", "Degree", "Specialization", "University/College",
      "Education Year", "Education Percentage/CGPA", "Additional Qualifications",
      "Technical Skills", "Soft Skills", "Languages Known", "Certifications",
      "Previous Companies", "Job Titles", "Work Duration", "Key Achievements",
      "Work Experience Details", "Education Details", "Projects", "Awards",
      "Publications", "References", "LinkedIn Profile", "Portfolio URL",
      "GitHub Profile", "Summary/Objective", "Resume Text", "File Name",
      "Drive File ID", "Drive File URL", "Status", "Tags", "Rating",
      "Notes", "Uploaded At", "Updated At", "Last Contacted", "Interview Status", "Feedback"
    ]

    // Always update headers to ensure consistency
    console.log("Updating headers to match expected structure...")
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:BB1",
      valueInputOption: "RAW",
      requestBody: {
        values: [expectedColumns],
      },
    })
    console.log("✅ Headers updated")

    // Process each data row to ensure proper alignment
    const realignedRows = dataRows.map((row, index) => {
      const realignedRow = new Array(expectedColumns.length).fill("")
      
      // Map existing data to correct columns
      for (let i = 0; i < Math.min(row.length, expectedColumns.length); i++) {
        realignedRow[i] = row[i] || ""
      }

      // Ensure ID is present
      if (!realignedRow[0]) {
        realignedRow[0] = generateId()
      }

      // Ensure required fields have default values
      if (!realignedRow[1]) realignedRow[1] = "Unknown Name"
      if (!realignedRow[7]) realignedRow[7] = "Not specified"
      if (!realignedRow[10]) realignedRow[10] = "Not specified"
      if (!realignedRow[12]) realignedRow[12] = "Not specified"
      if (!realignedRow[45]) realignedRow[45] = "new"
      if (!realignedRow[46]) realignedRow[46] = ""
      if (!realignedRow[49]) realignedRow[49] = new Date().toISOString()
      if (!realignedRow[50]) realignedRow[50] = new Date().toISOString()
      if (!realignedRow[52]) realignedRow[52] = "not-scheduled"

      return realignedRow
    })

    // Update all rows at once for better performance
    console.log("Updating all data rows with proper alignment...")
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A2:BB" + (realignedRows.length + 1),
      valueInputOption: "RAW",
      requestBody: {
        values: realignedRows,
      },
    })

    console.log(`✅ Successfully realigned ${realignedRows.length} data rows`)
    return true

  } catch (error) {
    console.error("❌ Failed to realign data:", error)
    throw error
  }
}

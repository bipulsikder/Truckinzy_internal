import { google } from "googleapis"

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

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:AZ",
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

// Get all candidates with comprehensive data
export async function getAllCandidates(): Promise<ComprehensiveCandidateData[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A2:AZ", // Skip header row, include all columns
    })

    if (!response.data.values) {
      return []
    }

    return response.data.values.map(
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
        linkedinProfile: row[35] || "",
        portfolioUrl: row[36] || "",
        githubProfile: row[37] || "",
        summary: row[38] || "",
        // File Information
        resumeText: row[39] || "",
        fileName: row[40] || "",
        driveFileId: row[41] || "",
        driveFileUrl: row[42] || "",
        // System Fields
        status: (row[43] as any) || "new",
        tags: row[44] ? row[44].split(", ").filter(Boolean) : [],
        rating: row[45] ? Number.parseInt(row[45]) : undefined,
        notes: row[46] || "",
        uploadedAt: row[47] || "",
        updatedAt: row[48] || "",
        lastContacted: row[49] || "",
        interviewStatus: (row[50] as any) || "not-scheduled",
        feedback: row[51] || "",
      }),
    )
  } catch (error) {
    console.error("❌ Failed to get candidates:", error)
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
    console.log(`🔍 Searching for candidate with ID: ${id}`)
    const candidates = await getAllCandidates()
    console.log(`📊 Total candidates found: ${candidates.length}`)

    // Find candidate by ID (more flexible matching)
    const candidateIndex = candidates.findIndex((c) => {
      const candidateId = c.id || ""
      console.log(`🔍 Comparing: "${candidateId}" with "${id}"`)
      return candidateId === id || candidateId.toString() === id.toString()
    })

    console.log(`📍 Candidate index found: ${candidateIndex}`)

    if (candidateIndex === -1) {
      console.error(`❌ Candidate not found with ID: ${id}`)
      console.log("Available candidate IDs:", candidates.map((c) => c.id).slice(0, 10))
      throw new Error(`Candidate not found with ID: ${id}`)
    }

    const candidate = candidates[candidateIndex]
    const updatedCandidate = { ...candidate, ...updates, updatedAt: new Date().toISOString() }
    const rowNumber = candidateIndex + 2 // +2 because array is 0-indexed and we skip header

    console.log(`📝 Updating row number: ${rowNumber}`)

    // Create the complete row data
    const row = [
      // Basic Information
      updatedCandidate.id,
      updatedCandidate.name,
      updatedCandidate.email,
      updatedCandidate.phone,
      updatedCandidate.dateOfBirth || "",
      updatedCandidate.gender || "",
      updatedCandidate.maritalStatus || "",
      // Professional Information
      updatedCandidate.currentRole,
      updatedCandidate.desiredRole || "",
      updatedCandidate.currentCompany || "",
      updatedCandidate.location,
      updatedCandidate.preferredLocation || "",
      updatedCandidate.totalExperience,
      updatedCandidate.currentSalary || "",
      updatedCandidate.expectedSalary || "",
      updatedCandidate.noticePeriod || "",
      // Education Details
      updatedCandidate.highestQualification || "",
      updatedCandidate.degree || "",
      updatedCandidate.specialization || "",
      updatedCandidate.university || "",
      updatedCandidate.educationYear || "",
      updatedCandidate.educationPercentage || "",
      updatedCandidate.additionalQualifications || "",
      // Skills & Expertise
      updatedCandidate.technicalSkills.join(", "),
      updatedCandidate.softSkills.join(", "),
      updatedCandidate.languagesKnown?.join(", ") || "",
      updatedCandidate.certifications?.join(", ") || "",
      // Work Experience
      updatedCandidate.previousCompanies?.join(", ") || "",
      updatedCandidate.jobTitles?.join(", ") || "",
      updatedCandidate.workDuration?.join(", ") || "",
      updatedCandidate.keyAchievements?.join(", ") || "",
      // Additional Information
      updatedCandidate.projects?.join(", ") || "",
      updatedCandidate.awards?.join(", ") || "",
      updatedCandidate.publications?.join(", ") || "",
      updatedCandidate.references?.join(", ") || "",
      updatedCandidate.linkedinProfile || "",
      updatedCandidate.portfolioUrl || "",
      updatedCandidate.githubProfile || "",
      updatedCandidate.summary || "",
      // File Information
      updatedCandidate.resumeText,
      updatedCandidate.fileName,
      updatedCandidate.driveFileId,
      updatedCandidate.driveFileUrl,
      // System Fields
      updatedCandidate.status,
      updatedCandidate.tags.join(", "),
      updatedCandidate.rating || "",
      updatedCandidate.notes || "",
      updatedCandidate.uploadedAt,
      updatedCandidate.updatedAt,
      updatedCandidate.lastContacted || "",
      updatedCandidate.interviewStatus || "not-scheduled",
      updatedCandidate.feedback || "",
    ]

    // Update the specific row in Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!A${rowNumber}:AZ${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    })

    console.log(`✅ Candidate updated successfully: ${id}`)
  } catch (error) {
    console.error("❌ Failed to update candidate:", error)
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

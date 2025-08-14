import { GoogleGenerativeAI } from "@google/generative-ai"
import { emailRegex, phoneRegex } from "./regexPatterns"
import pdfParse from "pdf-parse"
import mammoth from "mammoth"
import { ComprehensiveCandidateData } from "./google-sheets"

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null

export async function parseResume(file: File): Promise<ComprehensiveCandidateData> {
  try {
    console.log(`=== Starting Resume Parsing for ${file.name} ===`)
    
    // First try Gemini parsing
    try {
      if (genAI) {
        console.log("Attempting Gemini parsing...")
        const result = await parseResumeWithGemini(file)
        if (isValidParsedData(result)) {
          console.log("✅ Gemini parsing successful")
          return result
        } else {
          console.log("⚠️ Gemini parsing failed validation, trying OpenAI...")
        }
      }
    } catch (error) {
      console.log("⚠️ Gemini parsing failed:", error)
    }

    // Try OpenAI parsing as alternative
    try {
      console.log("Attempting OpenAI parsing...")
      const result = await parseResumeWithOpenAI(file)
      if (isValidParsedData(result)) {
        console.log("✅ OpenAI parsing successful")
        return result
      } else {
        console.log("⚠️ OpenAI parsing failed validation, trying Affinda...")
      }
    } catch (error) {
      console.log("⚠️ OpenAI parsing failed:", error)
    }

    // Try Affinda parsing
    try {
      if (process.env.AFFINDA_API_KEY) {
        console.log("Attempting Affinda parsing...")
        const result = await parseResumeWithAffinda(file)
        if (isValidParsedData(result)) {
          console.log("✅ Affinda parsing successful")
          return result
        } else {
          console.log("⚠️ Affinda parsing failed validation, trying basic parsing...")
        }
      }
    } catch (error) {
      console.log("⚠️ Affinda parsing failed:", error)
    }

    // Fallback to enhanced basic parsing
    console.log("Falling back to enhanced basic parsing...")
    const result = await parseResumeBasic(file)
    
    if (isValidParsedData(result)) {
      console.log("✅ Enhanced basic parsing successful")
      return result
    } else {
      console.log("❌ All parsing methods failed validation")
      throw new Error("Failed to extract valid candidate information from resume")
    }
    
  } catch (error) {
    console.error("❌ Resume parsing completely failed:", error)
    throw error
  }
}

// Function to validate parsed data quality
function isValidParsedData(data: any): boolean {
  // Must have a valid name (not empty, not "unknown", not just whitespace)
  if (!data.name || 
      data.name.trim() === "" || 
      data.name.toLowerCase() === "unknown" ||
      data.name.toLowerCase() === "not specified" ||
      data.name.length < 2) {
    console.log("❌ Invalid name:", data.name)
    return false
  }

  // Must have at least one of: email, phone, or current role
  if (!data.email && !data.phone && !data.currentRole) {
    console.log("❌ Missing essential contact/professional information")
    return false
  }

  // Name should not be the same as filename (indicates extraction failure)
  if (data.name && data.fileName) {
    const cleanFileName = data.fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
    if (data.name.toLowerCase() === cleanFileName.toLowerCase()) {
      console.log("❌ Name appears to be extracted from filename, likely parsing failure")
      return false
    }
  }

  console.log("✅ Data validation passed for:", data.name)
  return true
}

// Parse resume using Google Gemini
async function parseResumeWithGemini(file: File): Promise<ComprehensiveCandidateData> {
  try {
    console.log("Using Google Gemini for parsing...")
    
    const text = await extractTextFromFile(file)
    if (!text || text.length < 50) {
      throw new Error("Insufficient text extracted from file")
    }

    // Limit text to avoid token limits
    const limitedText = text.substring(0, 3000)
    
    const prompt = `Please parse this resume and extract the following information in JSON format:

{
  "name": "Full name of the person",
  "email": "Email address if found",
  "phone": "Phone number if found",
  "currentRole": "Current job title/role",
  "currentCompany": "Current company name",
  "location": "City, State, Country",
  "totalExperience": "Total years of experience (e.g., '5 years')",
  "highestQualification": "Highest education level (e.g., 'Master's', 'Bachelor's')",
  "degree": "Specific degree (e.g., 'B.Tech Computer Science')",
  "university": "University/College name",
  "educationYear": "Year of graduation",
  "technicalSkills": ["skill1", "skill2", "skill3"],
  "softSkills": ["skill1", "skill2", "skill3"],
  "languagesKnown": ["language1", "language2"],
  "certifications": ["cert1", "cert2"],
  "previousCompanies": ["company1", "company2"],
  "keyAchievements": ["achievement1", "achievement2"],
  "projects": ["project1", "project2"],
  "summary": "Professional summary or objective"
}

Resume text:
${limitedText}

Please ensure the JSON is valid and all fields are properly extracted. If a field is not found, use an empty string or empty array as appropriate.`

    // Try different Gemini models with fallback
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
    let lastError = null

    for (const model of models) {
      try {
        console.log(`Trying Gemini model: ${model}`)
        
        const geminiModel = genAI!.getGenerativeModel({ model })
        
        const result = await Promise.race([
          geminiModel.generateContent(prompt),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 30000)
          )
        ])

        const response = await (result as any).response
        const content = response.text()

        if (!content) {
          throw new Error("No content received from Gemini")
        }

        // Extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error("No valid JSON found in Gemini response")
        }

        const parsedData = JSON.parse(jsonMatch[0])
        
        // Map to ComprehensiveCandidateData format
        const candidateData: ComprehensiveCandidateData = {
          name: parsedData.name || "Unknown Name",
          email: parsedData.email || "",
          phone: parsedData.phone || "",
          dateOfBirth: "",
          gender: "",
          maritalStatus: "",
          currentRole: parsedData.currentRole || "Not specified",
          desiredRole: "",
          currentCompany: parsedData.currentCompany || "",
          location: parsedData.location || "Not specified",
          preferredLocation: "",
          totalExperience: parsedData.totalExperience || "Not specified",
          currentSalary: "",
          expectedSalary: "",
          noticePeriod: "",
          highestQualification: parsedData.highestQualification || "",
          degree: parsedData.degree || "",
          specialization: "",
          university: parsedData.university || "",
          educationYear: parsedData.educationYear || "",
          educationPercentage: "",
          additionalQualifications: "",
          technicalSkills: Array.isArray(parsedData.technicalSkills) ? parsedData.technicalSkills : [],
          softSkills: Array.isArray(parsedData.softSkills) ? parsedData.softSkills : [],
          languagesKnown: Array.isArray(parsedData.languagesKnown) ? parsedData.languagesKnown : [],
          certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications : [],
          previousCompanies: Array.isArray(parsedData.previousCompanies) ? parsedData.previousCompanies : [],
          jobTitles: [],
          workDuration: [],
          keyAchievements: Array.isArray(parsedData.keyAchievements) ? parsedData.keyAchievements : [],
          workExperience: [],
          education: [],
          projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
          awards: [],
          publications: [],
          references: [],
          linkedinProfile: "",
          portfolioUrl: "",
          githubProfile: "",
          summary: parsedData.summary || "",
          resumeText: text,
          fileName: file.name,
          driveFileId: "",
          driveFileUrl: "",
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

        console.log("✅ Gemini parsing completed successfully")
        return candidateData

      } catch (error) {
        console.log(`Gemini model ${model} failed:`, error)
        lastError = error
        continue
      }
    }

    throw lastError || new Error("All Gemini models failed")

  } catch (error) {
    console.error("❌ Gemini parsing failed:", error)
    throw error
  }
}

// Function to categorize skills into technical and soft skills
function categorizeSkills(skills: string[]): { technicalSkills: string[], softSkills: string[] } {
  const technicalSkills = [
    // Logistics & Supply Chain Technical Skills
    "Supply Chain Management", "Logistics Management", "Logistics Operations", "Warehouse Operations",
    "Transportation Management", "Fleet Management", "Inventory Management", "Distribution Management",
    "Procurement", "FASTag", "GPS Tracking", "Route Optimization", "WMS", "TMS", "ERP Systems",
    "SAP", "Microsoft Excel", "Data Analysis", "Reporting Tools", "Automation",
    // IT & Programming Skills
    "JavaScript", "Python", "Java", "React", "Node.js", "SQL", "MongoDB", "AWS", "Docker", "Git",
    "HTML", "CSS", "TypeScript", "Angular", "Vue.js", "PHP", "C++", "C#", "Ruby", "Go", "Rust",
    "Kubernetes", "Jenkins", "Jira", "Confluence"
  ]

  const softSkills = [
    // Leadership & Management
    "Leadership", "Team Leadership", "Team Leads", "Management", "Supervision", "Mentoring", "Coaching",
    // Communication & Interpersonal
    "Communication", "Customer Service", "Customer Relationship Management", "Interpersonal Skills",
    "Presentation Skills", "Negotiation", "Conflict Resolution",
    // Problem Solving & Analytical
    "Problem Solving", "Problem Resolution", "Critical Thinking", "Analytical Skills", "Decision Making",
    "Strategic Thinking",
    // Organization & Planning
    "Organization", "Organizational Skills", "Planning", "Time Management", "Project Management",
    "Resource Management", "Resource Balancing", "Multi-tasking",
    // Teamwork & Collaboration
    "Teamwork", "Collaboration", "Relationship Management", "Cross-functional Collaboration",
    "Stakeholder Management",
    // Adaptability & Learning
    "Adaptability", "Flexibility", "Learning Agility", "Continuous Learning", "Innovation", "Creativity",
    // Work Ethic
    "Attention to Detail", "Quality Focus", "Results-oriented", "Self-motivated", "Initiative", "Reliability"
  ]

  const categorized = { technicalSkills: [] as string[], softSkills: [] as string[] }

  for (const skill of skills) {
    const lowerSkill = skill.toLowerCase()
    
    // Check if it's a technical skill
    if (technicalSkills.some(techSkill => 
      lowerSkill.includes(techSkill.toLowerCase()) || 
      techSkill.toLowerCase().includes(lowerSkill)
    )) {
      if (categorized.technicalSkills.length < 8) {
        categorized.technicalSkills.push(skill)
      }
    }
    // Check if it's a soft skill
    else if (softSkills.some(softSkill => 
      lowerSkill.includes(softSkill.toLowerCase()) || 
      softSkill.toLowerCase().includes(lowerSkill)
    )) {
      if (categorized.softSkills.length < 8) {
        categorized.softSkills.push(skill)
      }
    }
    // If unclear, add to technical skills if it sounds technical
    else if (lowerSkill.includes('management') || 
             lowerSkill.includes('system') || 
             lowerSkill.includes('software') || 
             lowerSkill.includes('technology') ||
             lowerSkill.includes('operation') ||
             lowerSkill.includes('logistics') ||
             lowerSkill.includes('supply') ||
             lowerSkill.includes('warehouse') ||
             lowerSkill.includes('transport')) {
      if (categorized.technicalSkills.length < 8) {
        categorized.technicalSkills.push(skill)
      }
    }
    // Otherwise add to soft skills
    else {
      if (categorized.softSkills.length < 8) {
        categorized.softSkills.push(skill)
      }
    }
  }

  return categorized
}

// Enhanced name extraction function
function extractNameFromText(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Look for name patterns in the first few lines
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i]
    
    // Skip common resume headers and contact info
    if (line.toLowerCase().includes('resume') || 
        line.toLowerCase().includes('curriculum') || 
        line.toLowerCase().includes('vitae') ||
        line.toLowerCase().includes('cv') ||
        line.toLowerCase().includes('phone') ||
        line.toLowerCase().includes('email') ||
        line.toLowerCase().includes('address') ||
        line.toLowerCase().includes('mobile') ||
        line.toLowerCase().includes('contact') ||
        line.toLowerCase().includes('roll') ||
        line.toLowerCase().includes('bachelor') ||
        line.toLowerCase().includes('technology') ||
        line.toLowerCase().includes('engineering') ||
        line.toLowerCase().includes('university') ||
        line.toLowerCase().includes('college') ||
        line.toLowerCase().includes('institute') ||
        line.toLowerCase().includes('school') ||
        line.includes('@') ||
        line.match(/^\d/) ||
        line.match(/^[A-Z\s]{0,3}$/) || // Skip very short all-caps lines
        line.match(/^\d{4}$/) || // Skip years
        line.match(/^\d{2}$/)) { // Skip short numbers
      continue
    }
    
    // Look for name patterns (2-4 words, no special characters except spaces and dots)
    const namePattern = /^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/
    if (namePattern.test(line) && line.length > 3 && line.length < 50) {
      return line
    }
    
    // Look for name with middle initial
    const nameWithInitial = /^[A-Z][a-z]+\s[A-Z]\.\s[A-Z][a-z]+$/
    if (nameWithInitial.test(line)) {
      return line
    }
    
    // Look for name in ALL CAPS (common in resumes)
    const allCapsName = /^[A-Z\s]{3,40}$/
    if (allCapsName.test(line) && !line.includes('@') && !line.match(/\d/) && line.split(' ').length >= 2) {
      return line
    }
    
    // Look for name with some flexibility (allows for some special characters)
    const flexibleNamePattern = /^[A-Z][a-zA-Z\s\.\-']{2,50}$/
    if (flexibleNamePattern.test(line) && line.split(' ').length >= 2 && line.split(' ').length <= 4) {
      return line
    }
    
    // Look for name with numbers (some resumes have names with years)
    const nameWithNumbers = /^[A-Z][a-zA-Z\s\.\-']{2,50}\s\d{4}$/
    if (nameWithNumbers.test(line)) {
      return line.replace(/\s\d{4}$/, '').trim()
    }
  }
  
  // If no name found in first lines, try to find any line that looks like a name
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip lines that are clearly not names
    if (line.length < 3 || line.length > 50 || 
        line.toLowerCase().includes('resume') || 
        line.toLowerCase().includes('curriculum') || 
        line.toLowerCase().includes('vitae') ||
        line.toLowerCase().includes('cv') ||
        line.toLowerCase().includes('phone') ||
        line.toLowerCase().includes('email') ||
        line.toLowerCase().includes('address') ||
        line.toLowerCase().includes('mobile') ||
        line.toLowerCase().includes('contact') ||
        line.toLowerCase().includes('roll') ||
        line.toLowerCase().includes('bachelor') ||
        line.toLowerCase().includes('technology') ||
        line.toLowerCase().includes('engineering') ||
        line.toLowerCase().includes('university') ||
        line.toLowerCase().includes('college') ||
        line.toLowerCase().includes('institute') ||
        line.toLowerCase().includes('school') ||
        line.includes('@') ||
        line.match(/^\d/) ||
        line.match(/^[A-Z\s]{0,3}$/)) {
      continue
    }
    
    // Look for any line that starts with capital letter and has reasonable length
    if (/^[A-Z][a-zA-Z\s\.\-']{2,50}$/.test(line) && line.split(' ').length >= 2 && line.split(' ').length <= 5) {
      return line
    }
  }
  
  return ""
}

// Parse resume using Affinda API
async function parseResumeWithAffinda(file: File): Promise<ComprehensiveCandidateData> {
  try {
    console.log("Using Affinda API for parsing...")
    
    const text = await extractTextFromFile(file)
    if (!text || text.length < 50) {
      throw new Error("Insufficient text extracted from file")
    }

    const response = await fetch("https://api.affinda.com/v3/documents/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.AFFINDA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: text,
        fileName: file.name,
        fileType: "resume",
      }),
    })

    if (!response.ok) {
      throw new Error(`Affinda API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Map Affinda response to ComprehensiveCandidateData format
    const result: ComprehensiveCandidateData = {
      name: data.name || "Unknown Name",
      email: data.email || "",
      phone: data.phone || "",
      dateOfBirth: "",
      gender: "",
      maritalStatus: "",
      currentRole: data.currentRole || "Not specified",
      desiredRole: "",
      currentCompany: data.currentCompany || "",
      location: data.location || "Not specified",
      preferredLocation: "",
      totalExperience: data.totalExperience || "Not specified",
      currentSalary: "",
      expectedSalary: "",
      noticePeriod: "",
      highestQualification: data.highestQualification || "",
      degree: data.degree || "",
      specialization: "",
      university: data.university || "",
      educationYear: data.educationYear || "",
      educationPercentage: "",
      additionalQualifications: "",
      technicalSkills: Array.isArray(data.technicalSkills) ? data.technicalSkills : [],
      softSkills: Array.isArray(data.softSkills) ? data.softSkills : [],
      languagesKnown: Array.isArray(data.languagesKnown) ? data.languagesKnown : [],
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
      previousCompanies: Array.isArray(data.previousCompanies) ? data.previousCompanies : [],
      jobTitles: [],
      workDuration: [],
      keyAchievements: Array.isArray(data.keyAchievements) ? data.keyAchievements : [],
      workExperience: [],
      education: [],
      projects: Array.isArray(data.projects) ? data.projects : [],
      awards: [],
      publications: [],
      references: [],
      linkedinProfile: "",
      portfolioUrl: "",
      githubProfile: "",
      summary: data.summary || "",
      resumeText: text,
      fileName: file.name,
      driveFileId: "",
      driveFileUrl: "",
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

    console.log("✅ Affinda parsing completed successfully")
    return result

  } catch (error) {
    console.error("❌ Affinda parsing failed:", error)
    throw error
  }
}

// Helper function to extract string values from Affinda objects
function extractStringValue(field: any): string {
  if (!field) return ""
  if (typeof field === "string") return field
  if (field.raw) return field.raw
  if (field.parsed) return field.parsed
  if (field.rawLocation) return field.rawLocation
  if (field.city) return field.city
  return ""
}

// Helper function to extract education section
function extractEducationSection(text: string) {
  const education = []
  let highestQualification = ""
  let degree = ""
  let specialization = ""
  let university = ""
  let year = ""
  let percentage = ""

  // Look for education section with multiple patterns
  const educationPatterns = [
    /education[:\s]*([^]*?)(?=work|experience|skills|projects|achievements|$)/i,
    /academic[:\s]*([^]*?)(?=work|experience|skills|projects|achievements|$)/i,
    /qualification[:\s]*([^]*?)(?=work|experience|skills|projects|achievements|$)/i,
    /degree[:\s]*([^]*?)(?=work|experience|skills|projects|achievements|$)/i
  ]

  for (const pattern of educationPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const educationText = match[1]
      const lines = educationText.split('\n').filter(line => line.trim().length > 0)
      
      for (const line of lines) {
        const cleanLine = line.trim()
        
        // Extract degree with more patterns
        if (cleanLine.toLowerCase().includes('b.tech') || cleanLine.toLowerCase().includes('bachelor') || cleanLine.toLowerCase().includes('ba')) {
          degree = "Bachelor's"
          highestQualification = "Bachelor's"
        } else if (cleanLine.toLowerCase().includes('master') || cleanLine.toLowerCase().includes('ms')) {
          degree = "Master's"
          highestQualification = "Master's"
        } else if (cleanLine.toLowerCase().includes('mba')) {
          degree = "MBA"
          highestQualification = "MBA"
        } else if (cleanLine.toLowerCase().includes('phd') || cleanLine.toLowerCase().includes('doctorate')) {
          degree = "PhD"
          highestQualification = "PhD"
        } else if (cleanLine.toLowerCase().includes('diploma')) {
          degree = "Diploma"
          highestQualification = "Diploma"
        } else if (cleanLine.toLowerCase().includes('12th') || cleanLine.toLowerCase().includes('hsc') || cleanLine.toLowerCase().includes('intermediate')) {
          degree = "12th"
          if (!highestQualification || highestQualification === "Diploma") highestQualification = "12th"
        } else if (cleanLine.toLowerCase().includes('10th') || cleanLine.toLowerCase().includes('ssc') || cleanLine.toLowerCase().includes('matric')) {
          degree = "10th"
          if (!highestQualification || highestQualification === "Diploma") highestQualification = "10th"
        }
        
        // Extract university/college name with more patterns
        if (!university) {
          const uniMatch = cleanLine.match(/([A-Z][a-zA-Z\s&]+(?:University|College|Institute|School|Academy|Polytechnic))/i)
          if (uniMatch) university = uniMatch[1]
        }
        
        // Extract year with more patterns
        if (!year) {
          const yearMatch = cleanLine.match(/(\d{4})/)
          if (yearMatch) year = yearMatch[1]
        }
        
        // Extract percentage/grade with more patterns
        if (!percentage) {
          const percentMatch = cleanLine.match(/(\d+(?:\.\d+)?%?|pass|fail|distinction|first|second|third)/i)
          if (percentMatch) percentage = percentMatch[1]
        }
        
        // Add to education array if we have meaningful data
        if (degree && (university || year)) {
          education.push({
            degree: degree,
            specialization: specialization,
            institution: university || "Not specified",
            year: year || "Not specified",
            percentage: percentage || "Not specified"
          })
        }
      }
      break
    }
  }

  // If no education section found, try to find education info scattered in text
  if (education.length === 0) {
    const lines = text.split('\n')
    for (const line of lines) {
      const cleanLine = line.trim()
      
      // Look for degree patterns
      if (cleanLine.toLowerCase().includes('b.tech') || cleanLine.toLowerCase().includes('bachelor') || cleanLine.toLowerCase().includes('ba')) {
        degree = "Bachelor's"
        highestQualification = "Bachelor's"
      } else if (cleanLine.toLowerCase().includes('master') || cleanLine.toLowerCase().includes('ms')) {
        degree = "Master's"
        highestQualification = "Master's"
      } else if (cleanLine.toLowerCase().includes('mba')) {
        degree = "MBA"
        highestQualification = "MBA"
      } else if (cleanLine.toLowerCase().includes('phd')) {
        degree = "PhD"
        highestQualification = "PhD"
      } else if (cleanLine.toLowerCase().includes('diploma')) {
        degree = "Diploma"
        highestQualification = "Diploma"
      }
      
      // Look for university names
      if (!university) {
        const uniMatch = cleanLine.match(/([A-Z][a-zA-Z\s&]+(?:University|College|Institute|School))/i)
        if (uniMatch) university = uniMatch[1]
      }
      
      // Look for years
      if (!year) {
        const yearMatch = cleanLine.match(/(\d{4})/)
        if (yearMatch) year = yearMatch[1]
      }
    }
    
    // Add found education if any
    if (degree) {
      education.push({
        degree: degree,
        specialization: specialization,
        institution: university || "Not specified",
        year: year || "Not specified",
        percentage: percentage || "Not specified"
      })
    }
  }

  return {
    education,
    highestQualification: highestQualification || "Not specified",
    degree: degree || "Not specified",
    specialization: specialization || "Not specified",
    university: university || "Not specified",
    year: year || "Not specified",
    percentage: percentage || "Not specified"
  }
}

// Helper function to extract work experience
function extractWorkExperience(text: string) {
  const workExperience = []

  // Look for work experience section with multiple patterns
  const experiencePatterns = [
    /work\s+experience[:\-]?\s*([^]*?)(?=education|skills|projects|achievements|$)/i,
    /experience[:\-]?\s*([^]*?)(?=education|skills|projects|achievements|$)/i,
    /employment[:\-]?\s*([^]*?)(?=education|skills|projects|achievements|$)/i,
    /work\s+history[:\-]?\s*([^]*?)(?=education|skills|projects|achievements|$)/i,
    /professional\s+experience[:\-]?\s*([^]*?)(?=education|skills|projects|achievements|$)/i
  ]

  for (const pattern of experiencePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const experienceText = match[1]
      const lines = experienceText.split('\n').filter(line => line.trim().length > 0)
      
      let currentCompany = ""
      let currentRole = ""
      let currentDuration = ""
      let currentDescription = ""
      
      for (const line of lines) {
        const cleanLine = line.trim()
        
        // Look for company names (usually in caps or followed by dates)
        if (cleanLine.match(/^[A-Z][A-Z\s&]+$/) && cleanLine.length > 3) {
          if (currentCompany && currentRole) {
            workExperience.push({
              company: currentCompany,
              role: currentRole,
              duration: currentDuration,
              description: currentDescription
            })
          }
          currentCompany = cleanLine
          currentRole = ""
          currentDuration = ""
          currentDescription = ""
        }
        
        // Look for job titles with more patterns
        if (cleanLine.toLowerCase().includes('executive') || 
            cleanLine.toLowerCase().includes('manager') || 
            cleanLine.toLowerCase().includes('engineer') || 
            cleanLine.toLowerCase().includes('developer') || 
            cleanLine.toLowerCase().includes('analyst') ||
            cleanLine.toLowerCase().includes('specialist') ||
            cleanLine.toLowerCase().includes('coordinator') ||
            cleanLine.toLowerCase().includes('assistant') ||
            cleanLine.toLowerCase().includes('officer') ||
            cleanLine.toLowerCase().includes('supervisor') ||
            cleanLine.toLowerCase().includes('lead') ||
            cleanLine.toLowerCase().includes('operator') ||
            cleanLine.toLowerCase().includes('technician') ||
            cleanLine.toLowerCase().includes('consultant') ||
            cleanLine.toLowerCase().includes('director') ||
            cleanLine.toLowerCase().includes('head') ||
            cleanLine.toLowerCase().includes('chief')) {
          currentRole = cleanLine
        }
        
        // Look for duration (dates) with more patterns
        if (cleanLine.match(/\d{4}/) && (cleanLine.includes('-') || cleanLine.includes('to') || cleanLine.includes('present'))) {
          currentDuration = cleanLine
        }
        
        // Collect description
        if (cleanLine.length > 20 && !currentRole && !currentDuration) {
          currentDescription += cleanLine + " "
        }
      }
      
      // Add the last experience
      if (currentCompany && currentRole) {
        workExperience.push({
          company: currentCompany,
          role: currentRole,
          duration: currentDuration,
          description: currentDescription.trim()
        })
      }
      
      break
    }
  }

  // If no experience section found, try to find experience info scattered in text
  if (workExperience.length === 0) {
    const lines = text.split('\n')
    let currentCompany = ""
    let currentRole = ""
    let currentDuration = ""
    
    for (const line of lines) {
      const cleanLine = line.trim()
      
      // Look for company names in caps
      if (cleanLine.match(/^[A-Z][A-Z\s&]+$/) && cleanLine.length > 3 && 
          !cleanLine.toLowerCase().includes('resume') && 
          !cleanLine.toLowerCase().includes('curriculum') &&
          !cleanLine.toLowerCase().includes('vitae')) {
        if (currentCompany && currentRole) {
          workExperience.push({
            company: currentCompany,
            role: currentRole,
            duration: currentDuration,
            description: ""
          })
        }
        currentCompany = cleanLine
        currentRole = ""
        currentDuration = ""
      }
      
      // Look for job titles
      if (cleanLine.toLowerCase().includes('executive') || 
          cleanLine.toLowerCase().includes('manager') || 
          cleanLine.toLowerCase().includes('engineer') || 
          cleanLine.toLowerCase().includes('developer') || 
          cleanLine.toLowerCase().includes('analyst') ||
          cleanLine.toLowerCase().includes('specialist') ||
          cleanLine.toLowerCase().includes('coordinator') ||
          cleanLine.toLowerCase().includes('assistant') ||
          cleanLine.toLowerCase().includes('officer') ||
          cleanLine.toLowerCase().includes('supervisor') ||
          cleanLine.toLowerCase().includes('lead') ||
          cleanLine.toLowerCase().includes('operator') ||
          cleanLine.toLowerCase().includes('technician') ||
          cleanLine.toLowerCase().includes('consultant') ||
          cleanLine.toLowerCase().includes('director') ||
          cleanLine.toLowerCase().includes('head') ||
          cleanLine.toLowerCase().includes('chief')) {
        currentRole = cleanLine
      }
      
      // Look for duration
      if (cleanLine.match(/\d{4}/) && (cleanLine.includes('-') || cleanLine.includes('to') || cleanLine.includes('present'))) {
        currentDuration = cleanLine
      }
    }
    
    // Add the last experience
    if (currentCompany && currentRole) {
      workExperience.push({
        company: currentCompany,
        role: currentRole,
        duration: currentDuration,
        description: ""
      })
    }
  }

  return workExperience
}

// Helper function to extract skills from text
function extractSkillsFromText(text: string) {
  const technicalSkills = []
  const softSkills = []

  // Look for skills section with multiple patterns
  const skillPatterns = [
    /skills?[:\-]?\s*([^]*?)(?=education|work|experience|projects|achievements|$)/i,
    /technical\s+skills?[:\-]?\s*([^]*?)(?=education|work|experience|projects|achievements|$)/i,
    /competencies?[:\-]?\s*([^]*?)(?=education|work|experience|projects|achievements|$)/i,
    /expertise[:\-]?\s*([^]*?)(?=education|work|experience|projects|achievements|$)/i,
    /key\s+skills?[:\-]?\s*([^]*?)(?=education|work|experience|projects|achievements|$)/i,
    /core\s+skills?[:\-]?\s*([^]*?)(?=education|work|experience|projects|achievements|$)/i
  ]

  for (const pattern of skillPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      const skillsText = matches[1]
      const extractedSkills = skillsText
        .split(/[,;|]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 2 && skill.length < 50)
      
      // Categorize skills
      for (const skill of extractedSkills) {
        const lowerSkill = skill.toLowerCase()
        
        // Technical skills
        if (lowerSkill.includes('management') || 
            lowerSkill.includes('system') || 
            lowerSkill.includes('software') || 
            lowerSkill.includes('technology') ||
            lowerSkill.includes('operation') ||
            lowerSkill.includes('logistics') ||
            lowerSkill.includes('supply') ||
            lowerSkill.includes('warehouse') ||
            lowerSkill.includes('transport') ||
            lowerSkill.includes('fleet') ||
            lowerSkill.includes('inventory') ||
            lowerSkill.includes('tracking') ||
            lowerSkill.includes('gps') ||
            lowerSkill.includes('erp') ||
            lowerSkill.includes('sap') ||
            lowerSkill.includes('excel') ||
            lowerSkill.includes('analysis') ||
            lowerSkill.includes('reporting') ||
            lowerSkill.includes('automation') ||
            lowerSkill.includes('database') ||
            lowerSkill.includes('sql') ||
            lowerSkill.includes('javascript') ||
            lowerSkill.includes('python') ||
            lowerSkill.includes('java') ||
            lowerSkill.includes('react') ||
            lowerSkill.includes('node') ||
            lowerSkill.includes('aws') ||
            lowerSkill.includes('docker') ||
            lowerSkill.includes('git') ||
            lowerSkill.includes('html') ||
            lowerSkill.includes('css') ||
            lowerSkill.includes('typescript') ||
            lowerSkill.includes('angular') ||
            lowerSkill.includes('vue') ||
            lowerSkill.includes('php') ||
            lowerSkill.includes('c++') ||
            lowerSkill.includes('c#') ||
            lowerSkill.includes('ruby') ||
            lowerSkill.includes('go') ||
            lowerSkill.includes('rust') ||
            lowerSkill.includes('kubernetes') ||
            lowerSkill.includes('jenkins') ||
            lowerSkill.includes('jira') ||
            lowerSkill.includes('confluence')) {
          if (technicalSkills.length < 8) {
            technicalSkills.push(skill)
          }
        }
        // Soft skills
        else if (lowerSkill.includes('leadership') || 
                 lowerSkill.includes('communication') || 
                 lowerSkill.includes('teamwork') || 
                 lowerSkill.includes('problem') ||
                 lowerSkill.includes('planning') ||
                 lowerSkill.includes('organization') ||
                 lowerSkill.includes('time') ||
                 lowerSkill.includes('project') ||
                 lowerSkill.includes('customer') ||
                 lowerSkill.includes('relationship') ||
                 lowerSkill.includes('multi') ||
                 lowerSkill.includes('adaptability') ||
                 lowerSkill.includes('flexibility') ||
                 lowerSkill.includes('creativity') ||
                 lowerSkill.includes('innovation') ||
                 lowerSkill.includes('critical') ||
                 lowerSkill.includes('analytical') ||
                 lowerSkill.includes('decision') ||
                 lowerSkill.includes('strategic') ||
                 lowerSkill.includes('mentoring') ||
                 lowerSkill.includes('coaching') ||
                 lowerSkill.includes('supervision') ||
                 lowerSkill.includes('negotiation') ||
                 lowerSkill.includes('presentation') ||
                 lowerSkill.includes('interpersonal') ||
                 lowerSkill.includes('collaboration') ||
                 lowerSkill.includes('stakeholder') ||
                 lowerSkill.includes('attention') ||
                 lowerSkill.includes('quality') ||
                 lowerSkill.includes('results') ||
                 lowerSkill.includes('self') ||
                 lowerSkill.includes('initiative') ||
                 lowerSkill.includes('reliability')) {
          if (softSkills.length < 8) {
            softSkills.push(skill)
          }
        }
        // Default to technical if unclear
        else {
          if (technicalSkills.length < 8) {
            technicalSkills.push(skill)
          }
        }
      }
      break
    }
  }

  // If no skills found in sections, try to extract from scattered text
  if (technicalSkills.length === 0 && softSkills.length === 0) {
    const lines = text.split('\n')
    for (const line of lines) {
      const cleanLine = line.trim()
      
      // Look for skill-like patterns
      if (cleanLine.length > 3 && cleanLine.length < 50 && 
          !cleanLine.includes('@') && 
          !cleanLine.match(/\d{4}/) &&
          !cleanLine.toLowerCase().includes('resume') &&
          !cleanLine.toLowerCase().includes('curriculum') &&
          !cleanLine.toLowerCase().includes('vitae') &&
          !cleanLine.toLowerCase().includes('phone') &&
          !cleanLine.toLowerCase().includes('email') &&
          !cleanLine.toLowerCase().includes('location') &&
          !cleanLine.toLowerCase().includes('address')) {
        
        const lowerLine = cleanLine.toLowerCase()
        
        // Technical skills
        if (lowerLine.includes('management') || 
            lowerLine.includes('system') || 
            lowerLine.includes('software') || 
            lowerLine.includes('technology') ||
            lowerLine.includes('operation') ||
            lowerLine.includes('logistics') ||
            lowerLine.includes('supply') ||
            lowerLine.includes('warehouse') ||
            lowerLine.includes('transport') ||
            lowerLine.includes('fleet') ||
            lowerLine.includes('inventory') ||
            lowerLine.includes('tracking') ||
            lowerLine.includes('gps') ||
            lowerLine.includes('erp') ||
            lowerLine.includes('sap') ||
            lowerLine.includes('excel') ||
            lowerLine.includes('analysis') ||
            lowerLine.includes('reporting')) {
          if (technicalSkills.length < 8) {
            technicalSkills.push(cleanLine)
          }
        }
        // Soft skills
        else if (lowerLine.includes('leadership') || 
                 lowerLine.includes('communication') || 
                 lowerLine.includes('teamwork') || 
                 lowerLine.includes('problem') ||
                 lowerLine.includes('planning') ||
                 lowerLine.includes('organization') ||
                 lowerLine.includes('time') ||
                 lowerLine.includes('project') ||
                 lowerLine.includes('customer') ||
                 lowerLine.includes('relationship') ||
                 lowerLine.includes('multi') ||
                 lowerLine.includes('adaptability') ||
                 lowerLine.includes('flexibility')) {
          if (softSkills.length < 8) {
            softSkills.push(cleanLine)
          }
        }
      }
    }
  }

  return { technicalSkills, softSkills }
}

// Helper function to extract languages
function extractLanguages(text: string): string[] {
  const languages = []
  
  // Look for language section
  const languagePatterns = [
    /languages?[:\-]?\s*([^]*?)(?=education|work|experience|skills|projects|$)/i,
    /language[:\-]?\s*([^]*?)(?=education|work|experience|skills|projects|$)/i
  ]

  for (const pattern of languagePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const languageText = match[1]
      const extractedLanguages = languageText
        .split(/[,;|]/)
        .map(lang => lang.trim())
        .filter(lang => lang.length > 2 && lang.length < 20)
      
      languages.push(...extractedLanguages)
      break
    }
  }

  // Default languages if none found
  if (languages.length === 0) {
    languages.push("English")
  }

  return languages
}

// Helper function to extract certifications
function extractCertifications(text: string): string[] {
  const certifications = []
  
  // Look for certification section
  const certPatterns = [
    /certifications?[:\-]?\s*([^]*?)(?=education|work|experience|skills|projects|$)/i,
    /certificates?[:\-]?\s*([^]*?)(?=education|work|experience|skills|projects|$)/i
  ]

  for (const pattern of certPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const certText = match[1]
      const extractedCerts = certText
        .split(/[,;|]/)
        .map(cert => cert.trim())
        .filter(cert => cert.length > 2 && cert.length < 100)
      
      certifications.push(...extractedCerts)
      break
    }
  }

  return certifications
}

// Helper function to extract achievements
function extractAchievements(text: string): string[] {
  const achievements = []
  
  // Look for achievements section
  const achievementPatterns = [
    /achievements?[:\-]?\s*([^]*?)(?=education|work|experience|skills|projects|$)/i,
    /accomplishments?[:\-]?\s*([^]*?)(?=education|work|experience|skills|projects|$)/i
  ]

  for (const pattern of achievementPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const achievementText = match[1]
      const extractedAchievements = achievementText
        .split(/[,;|]/)
        .map(achievement => achievement.trim())
        .filter(achievement => achievement.length > 5 && achievement.length < 200)
      
      achievements.push(...extractedAchievements)
      break
    }
  }

  return achievements
}

// Helper function to extract projects
function extractProjects(text: string): string[] {
  const projects = []
  
  // Look for projects section
  const projectPatterns = [
    /projects?[:\-]?\s*([^]*?)(?=education|work|experience|skills|achievements|$)/i
  ]

  for (const pattern of projectPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const projectText = match[1]
      const extractedProjects = projectText
        .split(/[,;|]/)
        .map(project => project.trim())
        .filter(project => project.length > 5 && project.length < 200)
      
      projects.push(...extractedProjects)
      break
    }
  }

  return projects
}

// Helper function to extract summary
function extractSummary(text: string): string {
  // Look for summary section
  const summaryPatterns = [
    /summary[:\-]?\s*([^]*?)(?=education|work|experience|skills|projects|$)/i,
    /objective[:\-]?\s*([^]*?)(?=education|work|experience|skills|projects|$)/i,
    /profile[:\-]?\s*([^]*?)(?=education|work|experience|skills|projects|$)/i
  ]

  for (const pattern of summaryPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const summary = match[1].trim()
      if (summary.length > 10 && summary.length < 500) {
        return summary
      }
    }
  }

  return ""
}

async function parseResumeBasic(file: File) {
  console.log("Using enhanced basic parsing method...")

  try {
    const text = await extractTextFromFile(file)
    console.log("Basic parsing - extracted text length:", text.length)

    // Enhanced name extraction - look for actual person names, not section headers
    let name = extractNameFromText(text) || ""
    
    // If the enhanced method didn't work, try to find the actual person name
    if (!name || name === "Unknown" || name.toLowerCase().includes("skills") || name.toLowerCase().includes("resume")) {
      console.log("Enhanced name extraction failed, trying pattern-based extraction...")
      
      // Look for patterns like "DEEPAK KUMAR" (all caps names)
      const allCapsNameMatch = text.match(/([A-Z]{2,}\s+[A-Z]{2,})/g)
      if (allCapsNameMatch && allCapsNameMatch.length > 0) {
        // Filter out common non-name patterns
        const validNames = allCapsNameMatch.filter(n => 
          !n.toLowerCase().includes("resume") && 
          !n.toLowerCase().includes("curriculum") && 
          !n.toLowerCase().includes("vitae") &&
          !n.toLowerCase().includes("skills") &&
          !n.toLowerCase().includes("experience") &&
          !n.toLowerCase().includes("education") &&
          n.split(' ').length >= 2 &&
          n.split(' ').length <= 4
        )
        if (validNames.length > 0) {
          name = validNames[0]
          console.log("Found name from all-caps pattern:", name)
        }
      }
      
      // If still no name, try to find it near contact information
      if (!name || name === "Unknown") {
        const phoneMatch = text.match(/(?:phone|mobile|tel)[:\s]*(\+?\d[\d\s\-\(\)]+)/i)
        if (phoneMatch) {
          // Look for name above or below phone number
          const lines = text.split('\n')
          const phoneLineIndex = lines.findIndex(line => line.toLowerCase().includes('phone') || line.toLowerCase().includes('mobile'))
          if (phoneLineIndex > 0) {
            // Check lines above phone for name
            for (let i = phoneLineIndex - 1; i >= Math.max(0, phoneLineIndex - 3); i--) {
              const line = lines[i].trim()
              if (line.length > 3 && line.length < 50 && 
                  !line.toLowerCase().includes('@') && 
                  !line.toLowerCase().includes('phone') &&
                  !line.toLowerCase().includes('mobile') &&
                  !line.toLowerCase().includes('email') &&
                  !line.toLowerCase().includes('location') &&
                  !line.toLowerCase().includes('address') &&
                  !line.toLowerCase().includes('experience') &&
                  !line.toLowerCase().includes('education') &&
                  !line.toLowerCase().includes('skills')) {
                name = line
                console.log("Found name near phone:", name)
                break
              }
            }
          }
        }
      }
    }
    
    // Final fallback: use filename if still no name found
    if (!name || name === "Unknown" || name.trim() === "" || name.toLowerCase().includes("skills")) {
      const fileName = file.name.replace(/\.[^/.]+$/, "")
      name = fileName.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).replace(/\d+/g, "").trim()
      console.log("Using filename as name:", name)
    }

    // Enhanced email extraction
    const emails = text.match(emailRegex) || []
    const email = emails[0] || ""

    // Enhanced phone extraction
    const phones = text.match(phoneRegex) || []
    const phone = phones[0] || ""

    // Enhanced location extraction
    let location = "Not specified"
    const locationPatterns = [
      /(?:location|address|city)[:\s]*([A-Z][a-zA-Z\s,]+(?:City|Town|District|State|Country|India|INDIA))/i,
      /(?:in|at|from)\s+([A-Z][a-zA-Z\s]+(?:City|Town|District|State|Country|India|INDIA))/i,
      /([A-Z][a-zA-Z\s]+(?:City|Town|District|State|Country|India|INDIA))/i,
      /(?:location|address|city)[:\s]*([A-Z][a-zA-Z\s,]+)/i,
      /(?:in|at|from)\s+([A-Z][a-zA-Z\s]+)/i
    ]
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const extractedLocation = match[1].trim()
        // Filter out common non-location patterns
        if (extractedLocation.length > 3 && 
            extractedLocation.length < 100 &&
            !extractedLocation.toLowerCase().includes('phone') &&
            !extractedLocation.toLowerCase().includes('email') &&
            !extractedLocation.toLowerCase().includes('resume') &&
            !extractedLocation.toLowerCase().includes('curriculum') &&
            !extractedLocation.toLowerCase().includes('vitae')) {
          location = extractedLocation
          break
        }
      }
    }

    // Enhanced education extraction
    const educationSection = extractEducationSection(text)
    
    // Enhanced work experience extraction
    const workExperience = extractWorkExperience(text)
    
    // Enhanced skills extraction
    const { technicalSkills, softSkills } = extractSkillsFromText(text)
    
    // Determine current role from work experience with better logic
    let currentRole = "Not specified"
    if (workExperience.length > 0) {
      currentRole = workExperience[0].role || "Not specified"
    } else {
      // Try to find role from text if no work experience found
      const rolePatterns = [
        /(?:current\s+role|current\s+position|current\s+job)[:\s]*([^.\n]+)/i,
        /(?:role|position|job)[:\s]*([^.\n]+)/i,
        /(?:working\s+as|employed\s+as)[:\s]*([^.\n]+)/i
      ]
      
      for (const pattern of rolePatterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
          const extractedRole = match[1].trim()
          if (extractedRole.length > 3 && extractedRole.length < 100) {
            currentRole = extractedRole
            break
          }
        }
      }
      
      // If still no role found, look for common job titles in text
      if (currentRole === "Not specified") {
        const commonRoles = [
          'executive', 'manager', 'engineer', 'developer', 'analyst', 'specialist',
          'coordinator', 'assistant', 'officer', 'supervisor', 'lead', 'operator',
          'technician', 'consultant', 'director', 'head', 'chief', 'associate'
        ]
        
        for (const role of commonRoles) {
          const roleMatch = text.match(new RegExp(`\\b${role}\\b`, 'i'))
          if (roleMatch) {
            // Get the full job title
            const line = text.split('\n').find(line => 
              line.toLowerCase().includes(role.toLowerCase())
            )
            if (line) {
              currentRole = line.trim()
              break
            }
          }
        }
      }
    }
    
    // Determine total experience
    let totalExperience = "Not specified"
    const experienceMatch = text.match(/(?:experience|exp)[:\s]*(\d+)\s*(?:years?|yrs?)/i)
    if (experienceMatch) {
      totalExperience = `${experienceMatch[1]} years`
    } else if (workExperience.length > 0) {
      // Try to calculate from work experience dates
      const totalYears = workExperience.reduce((total: number, exp: any) => {
        if (exp.duration) {
          const yearMatch = exp.duration.match(/(\d+)/)
          if (yearMatch) total += parseInt(yearMatch[1])
        }
        return total
      }, 0)
      if (totalYears > 0) {
        totalExperience = `${totalYears} years`
      }
    }

    // Determine current company from work experience
    let currentCompany = ""
    if (workExperience.length > 0) {
      currentCompany = workExperience[0].company || ""
    } else {
      // Try to find company from text if no work experience found
      const companyPatterns = [
        /(?:current\s+company|current\s+employer|company)[:\s]*([^.\n]+)/i,
        /(?:working\s+at|employed\s+at|at)[:\s]*([^.\n]+)/i
      ]
      
      for (const pattern of companyPatterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
          const extractedCompany = match[1].trim()
          if (extractedCompany.length > 2 && extractedCompany.length < 100) {
            currentCompany = extractedCompany
            break
          }
        }
      }
    }

    // Create the final parsed data object with proper field mapping
    const parsedData = {
      name: name || "Unknown Name",
      email: email || "",
      phone: phone || "",
      dateOfBirth: "",
      gender: "",
      maritalStatus: "",
      currentRole: currentRole || "Not specified",
      desiredRole: "",
      currentCompany: currentCompany || "",
      location: location || "Not specified",
      preferredLocation: "",
      totalExperience: totalExperience || "Not specified",
      currentSalary: "",
      expectedSalary: "",
      noticePeriod: "",
      highestQualification: educationSection.highestQualification || "",
      degree: educationSection.degree || "",
      specialization: educationSection.specialization || "",
      university: educationSection.university || "",
      educationYear: educationSection.year || "",
      educationPercentage: educationSection.percentage || "",
      additionalQualifications: "",
      technicalSkills: technicalSkills,
      softSkills: softSkills,
      languagesKnown: extractLanguages(text),
      certifications: extractCertifications(text),
      previousCompanies: workExperience.map(exp => exp.company).filter(Boolean),
      jobTitles: workExperience.map(exp => exp.role).filter(Boolean),
      workDuration: workExperience.map(exp => exp.duration).filter(Boolean),
      keyAchievements: extractAchievements(text),
      workExperience: workExperience,
      education: educationSection.education,
      projects: extractProjects(text),
      awards: [],
      publications: [],
      references: [],
      linkedinProfile: "",
      portfolioUrl: "",
      githubProfile: "",
      summary: extractSummary(text),
      resumeText: text,
      fileName: file.name,
      driveFileId: "",
      driveFileUrl: "",
      status: "new" as const,
      tags: [],
      rating: undefined,
      notes: "",
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContacted: "",
      interviewStatus: "not-scheduled" as const,
      feedback: "",
    }

    console.log("✅ Enhanced basic parsing completed:", parsedData.name)
    console.log("Extracted data summary:")
    console.log("- Name:", parsedData.name)
    console.log("- Email:", parsedData.email)
    console.log("- Phone:", parsedData.phone)
    console.log("- Current Role:", parsedData.currentRole)
    console.log("- Current Company:", parsedData.currentCompany)
    console.log("- Location:", parsedData.location)
    console.log("- Total Experience:", parsedData.totalExperience)
    console.log("- Education:", parsedData.highestQualification)
    console.log("- University:", parsedData.university)
    console.log("- Education Year:", parsedData.educationYear)
    console.log("- Technical Skills:", parsedData.technicalSkills.length, "->", parsedData.technicalSkills)
    console.log("- Soft Skills:", parsedData.softSkills.length, "->", parsedData.softSkills)
    console.log("- Work Experience:", parsedData.workExperience.length, "->", parsedData.workExperience.map(exp => `${exp.role} at ${exp.company}`))
    console.log("- Languages:", parsedData.languagesKnown)
    console.log("- Certifications:", parsedData.certifications)
    console.log("- Achievements:", parsedData.keyAchievements)
    console.log("- Projects:", parsedData.projects)
    console.log("- Summary:", parsedData.summary ? parsedData.summary.substring(0, 100) + "..." : "None")
    
    return parsedData
  } catch (error) {
    console.error("❌ Enhanced basic parsing failed:", error)
    throw error
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  try {
    console.log(`Extracting text from ${file.type} file...`)

    if (file.type === "text/plain") {
      const text = await file.text()
      console.log("✅ Text file extracted successfully")
      return text
    } else if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer()
      const text = await extractPDFText(arrayBuffer)
      console.log("✅ PDF text extracted")
      return text
    } else if (file.type.includes("word") || file.type.includes("document") || file.type.includes("docx") || file.type.includes("doc")) {
      console.log(`Processing DOCX file: ${file.name} (${file.type})`)
      const arrayBuffer = await file.arrayBuffer()
      const text = await extractDocxText(arrayBuffer)
      console.log("✅ DOCX text extracted")
      return text
    } else {
      throw new Error(`Unsupported file type: ${file.type}`)
    }
  } catch (error) {
    console.error("❌ Text extraction error:", error)
    return `Error extracting text from ${file.name}: ${error}`
  }
}

async function extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Use pdf-parse for robust PDF text extraction
    const data = await pdfParse(Buffer.from(arrayBuffer))
    return data.text
  } catch (error) {
    console.error("PDF extraction error with pdf-parse:", error)
    // Fallback to basic text extraction if pdf-parse fails
    const uint8Array = new Uint8Array(arrayBuffer)
    const text = new TextDecoder("latin1").decode(uint8Array)
    const readableText = text
      .replace(/[^\x20-\x7E\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    return readableText.length > 50 ? readableText : `PDF processing error: ${error}`
  }
}

async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("Attempting DOCX extraction with mammoth.js...")
    console.log("ArrayBuffer size:", arrayBuffer.byteLength)
    console.log("ArrayBuffer constructor:", arrayBuffer.constructor.name)
    
    // Validate ArrayBuffer
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error("Invalid or empty ArrayBuffer")
    }
    
    // Check if it's a valid DOCX file by checking the file signature
    const uint8Array = new Uint8Array(arrayBuffer)
    const signature = Array.from(uint8Array.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('')
    console.log("File signature:", signature)
    
    // DOCX files start with PK (50 4B) - ZIP file format
    if (!signature.startsWith('504b')) {
      throw new Error("File does not appear to be a valid DOCX file (missing ZIP signature)")
    }
    
    // Check if mammoth is available
    if (!mammoth || typeof mammoth.extractRawText !== 'function') {
      throw new Error("Mammoth.js not properly loaded")
    }
    
    console.log("Mammoth.js is available, calling extractRawText...")
    
    // Try different approaches for mammoth.js
    let result = null
    
    try {
      // First attempt: standard approach
      result = await mammoth.extractRawText({ arrayBuffer })
    } catch (mammothError) {
      console.log("Standard mammoth approach failed, trying alternative...")
      
      // Second attempt: try with Buffer conversion
      try {
        const buffer = Buffer.from(arrayBuffer)
        result = await mammoth.extractRawText({ arrayBuffer: buffer as any })
      } catch (bufferError) {
        console.log("Buffer conversion approach also failed")
        throw mammothError // Throw the original error
      }
    }
    
    console.log("Mammoth result:", result)
    
    if (result && result.value) {
      console.log("✅ DOCX text extracted successfully with mammoth")
      console.log("Extracted text length:", result.value.length)
      return result.value
    } else {
      throw new Error("No text content found in DOCX")
    }
  } catch (error) {
    console.error("DOCX extraction error with mammoth:", error)
    console.error("Error name:", error instanceof Error ? error.name : "Unknown")
    console.error("Error message:", error instanceof Error ? error.message : "Unknown")
    
    // Fallback to basic text extraction if mammoth fails
    console.log("Using fallback DOCX text extraction...")
    try {
      const uint8Array = new Uint8Array(arrayBuffer)
      const text = new TextDecoder().decode(uint8Array)
      const cleanText = text
        .replace(/<[^>]*>/g, " ")
        .replace(/[^\x20-\x7E\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      
      if (cleanText.length > 50) {
        console.log("✅ DOCX text extracted with fallback method")
        console.log("Fallback text length:", cleanText.length)
        return cleanText
      } else {
        throw new Error("Fallback extraction produced insufficient text")
      }
    } catch (fallbackError) {
      console.error("Fallback DOCX extraction also failed:", fallbackError)
      return `DOCX processing error: ${error}. Fallback error: ${fallbackError}`
    }
  }
}

function getFallbackParsedData(file: File) {
  const fileName = file.name.replace(/\.[^/.]+$/, "")

  return {
    name: fileName.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).replace(/\d+/g, "").trim(),
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    currentRole: "Not specified",
    desiredRole: "",
    currentCompany: "",
    location: "Not specified",
    preferredLocation: "",
    totalExperience: "Not specified",
    currentSalary: "",
    expectedSalary: "",
    noticePeriod: "",
    highestQualification: "",
    degree: "",
    specialization: "",
    university: "",
    educationYear: "",
    educationPercentage: "",
    technicalSkills: [],
    softSkills: [],
    languagesKnown: [],
    certifications: [],
    previousCompanies: [],
    keyAchievements: [],
    projects: [],
    linkedinProfile: "",
    summary: "",
    resumeText: `Resume file: ${file.name} (${file.size} bytes, ${file.type})`,
    fileName: file.name, // Add fileName to the fallback data
  }
}

// Parse resume using OpenAI GPT-3.5-turbo (Free tier alternative)
async function parseResumeWithOpenAI(file: File): Promise<ComprehensiveCandidateData> {
  try {
    console.log("Using OpenAI GPT-3.5-turbo for parsing...")
    
    const text = await extractTextFromFile(file)
    if (!text || text.length < 50) {
      throw new Error("Insufficient text extracted from file")
    }

    // Limit text to avoid token limits (GPT-3.5-turbo has 4096 token limit)
    const limitedText = text.substring(0, 3000)
    
    const prompt = `Please parse this resume and extract the following information in JSON format:

{
  "name": "Full name of the person",
  "email": "Email address if found",
  "phone": "Phone number if found",
  "currentRole": "Current job title/role",
  "currentCompany": "Current company name",
  "location": "City, State, Country",
  "totalExperience": "Total years of experience (e.g., '5 years')",
  "highestQualification": "Highest education level (e.g., 'Master's', 'Bachelor's')",
  "degree": "Specific degree (e.g., 'B.Tech Computer Science')",
  "university": "University/College name",
  "educationYear": "Year of graduation",
  "technicalSkills": ["skill1", "skill2", "skill3"],
  "softSkills": ["skill1", "skill2", "skill3"],
  "languagesKnown": ["language1", "language2"],
  "certifications": ["cert1", "cert2"],
  "previousCompanies": ["company1", "company2"],
  "keyAchievements": ["achievement1", "achievement2"],
  "projects": ["project1", "project2"],
  "summary": "Professional summary or objective"
}

Resume text:
${limitedText}

Please ensure the JSON is valid and all fields are properly extracted. If a field is not found, use an empty string or empty array as appropriate.`

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured")
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        timeout: 30000
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error("No content received from OpenAI")
    }

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No valid JSON found in OpenAI response")
    }

    const parsedData = JSON.parse(jsonMatch[0])
    
    // Map to ComprehensiveCandidateData format
    const result: ComprehensiveCandidateData = {
      name: parsedData.name || "Unknown Name",
      email: parsedData.email || "",
      phone: parsedData.phone || "",
      dateOfBirth: "",
      gender: "",
      maritalStatus: "",
      currentRole: parsedData.currentRole || "Not specified",
      desiredRole: "",
      currentCompany: parsedData.currentCompany || "",
      location: parsedData.location || "Not specified",
      preferredLocation: "",
      totalExperience: parsedData.totalExperience || "Not specified",
      currentSalary: "",
      expectedSalary: "",
      noticePeriod: "",
      highestQualification: parsedData.highestQualification || "",
      degree: parsedData.degree || "",
      specialization: "",
      university: parsedData.university || "",
      educationYear: parsedData.educationYear || "",
      educationPercentage: "",
      additionalQualifications: "",
      technicalSkills: Array.isArray(parsedData.technicalSkills) ? parsedData.technicalSkills : [],
      softSkills: Array.isArray(parsedData.softSkills) ? parsedData.softSkills : [],
      languagesKnown: Array.isArray(parsedData.languagesKnown) ? parsedData.languagesKnown : [],
      certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications : [],
      previousCompanies: Array.isArray(parsedData.previousCompanies) ? parsedData.previousCompanies : [],
      jobTitles: [],
      workDuration: [],
      keyAchievements: Array.isArray(parsedData.keyAchievements) ? parsedData.keyAchievements : [],
      workExperience: [],
      education: [],
      projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
      awards: [],
      publications: [],
      references: [],
      linkedinProfile: "",
      portfolioUrl: "",
      githubProfile: "",
      summary: parsedData.summary || "",
      resumeText: text,
      fileName: file.name,
      driveFileId: "",
      driveFileUrl: "",
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

    console.log("✅ OpenAI parsing completed successfully")
    return result

  } catch (error) {
    console.error("❌ OpenAI parsing failed:", error)
    throw error
  }
}

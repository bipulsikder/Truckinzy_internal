import { GoogleGenerativeAI } from "@google/generative-ai"
import { emailRegex, phoneRegex } from "./regexPatterns"
import pdfParse from "pdf-parse"
import mammoth from "mammoth"
import JSZip from "jszip"
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
          console.log("⚠️ Gemini parsing failed validation, trying basic parsing...")
        }
      }
    } catch (error) {
      console.log("⚠️ Gemini parsing failed:", error)
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
  if (!genAI) {
    throw new Error("Gemini API not configured")
  }
    
  try {
    console.log("🔄 Starting Gemini parsing...")
    const text = await extractTextFromFile(file)
    console.log(`📄 Extracted text length: ${text.length} characters`)
    console.log(`📄 First 200 characters: ${text.substring(0, 200)}...`)

    // Limit text to avoid token limits but provide enough context
    const limitedText = text.substring(0, 5000)
    
    const prompt = `You are an expert resume parser with 10+ years of experience in HR and recruitment. Your task is to extract accurate information from this resume and return ONLY a valid JSON object.

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - no explanations, no markdown, no extra text
2. If a field is not found, use empty string "" for text or empty array [] for lists
3. For arrays, ensure each item is a string
4. For experience, calculate total years from all work experience and use format like "5 years" or "3.5 years"
5. For skills, extract ONLY actual skills mentioned in the resume, don't make up generic ones
6. For location, use format like "Mumbai, Maharashtra" or "Delhi, India"
7. For name, extract the actual person's name from the resume header or personal details section
8. For current role, extract the job title they currently hold (most recent position)
9. For current company, extract the company they currently work for (most recent employer)
10. For education, focus on the highest qualification achieved
11. For previous companies, list all companies mentioned in work experience (excluding current)
12. Be very careful with name extraction - look for patterns like "Name:", "Full Name:", or prominent text at the top

NAME EXTRACTION RULES:
- Look for the person's name at the very top of the resume, usually in large/bold text
- Common patterns: "Name: [Name]", "Full Name: [Name]", or just the name prominently displayed
- The name is usually the first thing you see, not project names or company names
- If you see "Bipul Sikder" at the top, that's the name, not "Railway infrastructure projects"
- Look for personal contact information section which usually contains the name
- The name is typically followed by contact details like phone, email, or address
- DO NOT extract project names, company names, or other text as the person's name
- The name should be a person's name (2-4 words), not a company, project, or section header
- Common Indian names like "Bipul Sikder", "Deepak Kumar", "Priya Sharma" are what you're looking for
- If you see text like "Railway infrastructure projects" or "Tech Lead", that's NOT a person's name

EXTRACT THESE FIELDS WITH HIGH ACCURACY:
{
  "name": "Full name (required - must be extracted from resume header or personal details)",
  "email": "Email address if found (look for @ symbol)",
  "phone": "Phone number with country code if available (look for patterns like +91, 10 digits)",
  "currentRole": "Current job title/position (most recent work experience)",
  "currentCompany": "Current employer company name (most recent work experience)",
  "location": "Current location (city, state, country) - look for address or location fields",
  "totalExperience": "Total years of experience calculated from all work experience",
  "highestQualification": "Highest education level achieved (e.g., 'Master's Degree', 'Bachelor's Degree')",
  "degree": "Specific degree name (e.g., 'B.Tech Computer Science', 'MBA Finance')",
  "university": "University/College name where highest degree was obtained",
  "educationYear": "Year of graduation for highest degree",
  "technicalSkills": ["actual technical skills mentioned in resume"],
  "softSkills": ["actual soft skills mentioned in resume"],
  "languagesKnown": ["languages mentioned in resume"],
  "certifications": ["certifications mentioned in resume"],
  "previousCompanies": ["all companies from work experience excluding current"],
  "keyAchievements": ["key achievements mentioned in resume"],
  "projects": ["projects mentioned in resume"],
  "summary": "Professional summary or objective statement if present"
}

RESUME TEXT:
${limitedText}

Return ONLY the JSON object:`

    // Try different Gemini models with fallback
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
    let lastError = null

    for (const modelName of models) {
      try {
        console.log(`🔄 Trying Gemini model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })
        
        const result = await model.generateContent(prompt)
        const content = result.response.text()
        
        console.log("Raw Gemini response:", content)
        console.log("🔍 Looking for name in response...")

        // Extract JSON from the response - try multiple approaches
        let parsedData = null
        
        // Method 1: Look for JSON between curly braces
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0])
            console.log("✅ JSON extracted using method 1")
          } catch (e) {
            console.log("Method 1 failed, trying method 2")
          }
        }
        
        // Method 2: Look for JSON after "Return ONLY the JSON object:"
        if (!parsedData) {
          const afterPrompt = content.split("Return ONLY the JSON object:")
          if (afterPrompt.length > 1) {
            try {
              const jsonPart = afterPrompt[1].trim()
              const jsonMatch2 = jsonPart.match(/\{[\s\S]*\}/)
              if (jsonMatch2) {
                parsedData = JSON.parse(jsonMatch2[0])
                console.log("✅ JSON extracted using method 2")
              }
            } catch (e) {
              console.log("Method 2 failed, trying method 3")
            }
          }
        }
        
        // Method 3: Try to find any valid JSON in the content
        if (!parsedData) {
          const jsonMatches = content.match(/\{[^{}]*\}/g)
          if (jsonMatches) {
            for (const match of jsonMatches) {
              try {
                parsedData = JSON.parse(match)
                if (parsedData.name && parsedData.name !== "Unknown") {
                  console.log("✅ JSON extracted using method 3")
                  break
                }
              } catch (e) {
                continue
              }
            }
          }
        }

        if (!parsedData) {
          throw new Error("No valid JSON found in Gemini response")
        }

        console.log("Parsed JSON data:", parsedData)
        
        // Validate the extracted name - it should not be a project name or company name
        if (parsedData.name) {
          const suspiciousNames = [
            'railway', 'infrastructure', 'projects', 'tech', 'company', 'ltd', 'pvt', 'inc',
            'corporation', 'enterprise', 'solutions', 'systems', 'platform', 'app', 'web',
            'resume', 'curriculum', 'vitae', 'cv', 'skills', 'experience', 'education',
            'lead', 'engineer', 'developer', 'manager', 'specialist', 'coordinator'
          ]
          
          const nameLower = parsedData.name.toLowerCase()
          const isSuspicious = suspiciousNames.some(word => nameLower.includes(word))
          
          if (isSuspicious) {
            console.log("⚠️ Suspicious name detected, likely incorrect extraction")
            console.log("Suspicious name:", parsedData.name)
            // Try to find a better name in the text
            const namePatterns = [
              /name\s*:\s*([^\n]+)/i,
              /full\s*name\s*:\s*([^\n]+)/i,
              /^([A-Z][a-z]+\s+[A-Z][a-z]+)/m,
              /^([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/m
            ]
            
            for (const pattern of namePatterns) {
              const match = text.match(pattern)
              if (match && match[1]) {
                const potentialName = match[1].trim()
                if (potentialName.length > 2 && !suspiciousNames.some(word => potentialName.toLowerCase().includes(word))) {
                  console.log("✅ Found better name using pattern:", potentialName)
                  parsedData.name = potentialName
                  break
                }
              }
            }
            
            // If still suspicious, try to find the actual person's name from the resume
            if (isSuspicious) {
              console.log("🔍 Attempting to extract actual person name from resume text...")
              const actualName = extractActualPersonName(text)
              if (actualName) {
                console.log("✅ Found actual person name:", actualName)
                parsedData.name = actualName
              }
            }
          }
        }

        // Validate and clean the parsed data
        const cleanedData = {
          name: cleanString(parsedData.name),
          email: cleanString(parsedData.email),
          phone: cleanString(parsedData.phone),
          currentRole: cleanString(parsedData.currentRole),
          currentCompany: cleanString(parsedData.currentCompany),
          location: cleanString(parsedData.location),
          totalExperience: cleanString(parsedData.totalExperience),
          highestQualification: cleanString(parsedData.highestQualification),
          degree: cleanString(parsedData.degree),
          university: cleanString(parsedData.university),
          educationYear: cleanString(parsedData.educationYear),
          technicalSkills: cleanArray(parsedData.technicalSkills),
          softSkills: cleanArray(parsedData.softSkills),
          languagesKnown: cleanArray(parsedData.languagesKnown),
          certifications: cleanArray(parsedData.certifications),
          previousCompanies: cleanArray(parsedData.previousCompanies),
          keyAchievements: cleanArray(parsedData.keyAchievements),
          projects: cleanArray(parsedData.projects),
          summary: cleanString(parsedData.summary)
        }

        // Enhanced validation and correction
        if (!cleanedData.name || cleanedData.name === "Unknown" || cleanedData.name.length < 2) {
          // Try to extract name from resume text if Gemini failed
          const nameFromText = extractNameFromText(text)
          if (nameFromText) {
            cleanedData.name = nameFromText
            console.log("✅ Name corrected from text analysis:", cleanedData.name)
          }
        }

        // Improve location if not found
        if (!cleanedData.location || cleanedData.location === "Not specified") {
          const locationFromText = extractLocationFromText(text)
          if (locationFromText) {
            cleanedData.location = locationFromText
            console.log("✅ Location corrected from text analysis:", cleanedData.location)
          }
        }

        // Improve current role if not found
        if (!cleanedData.currentRole || cleanedData.currentRole === "Not specified") {
          const roleFromText = extractRoleFromText(text)
          if (roleFromText) {
            cleanedData.currentRole = roleFromText
            console.log("✅ Current role corrected from text analysis:", cleanedData.currentRole)
          }
        }

        // Improve experience if not found
        if (!cleanedData.totalExperience || cleanedData.totalExperience === "Not specified") {
          const expFromText = extractExperienceFromText(text)
          if (expFromText) {
            cleanedData.totalExperience = expFromText
            console.log("✅ Experience corrected from text analysis:", cleanedData.totalExperience)
          }
        }
        
        // Map to ComprehensiveCandidateData format with CORRECT field mapping
        const candidateData: ComprehensiveCandidateData = {
          // Basic Information - Columns A-G
          name: cleanedData.name || "Unknown Name",                    // Column B: Name
          email: cleanedData.email || "",                              // Column C: Email
          phone: cleanedData.phone || "",                              // Column D: Phone
          dateOfBirth: "",                                             // Column E: Date of Birth
          gender: "",                                                  // Column F: Gender
          maritalStatus: "",                                           // Column G: Marital Status
          
          // Professional Information - Columns H-P
          currentRole: cleanedData.currentRole || "Not specified",     // Column H: Current Role
          desiredRole: "",                                             // Column I: Desired Role
          currentCompany: cleanedData.currentCompany || "",            // Column J: Current Company
          location: cleanedData.location || "Not specified",          // Column K: Location
          preferredLocation: "",                                       // Column L: Preferred Location
          totalExperience: cleanedData.totalExperience || "Not specified", // Column M: Total Experience
          currentSalary: "",                                           // Column N: Current Salary
          expectedSalary: "",                                          // Column O: Expected Salary
          noticePeriod: "",                                            // Column P: Notice Period
          
          // Education Details - Columns Q-V
          highestQualification: cleanedData.highestQualification || "", // Column Q: Highest Qualification
          degree: cleanedData.degree || "",                            // Column R: Degree
          specialization: "",                                          // Column S: Specialization
          university: cleanedData.university || "",                    // Column T: University/College
          educationYear: cleanedData.educationYear || "",              // Column U: Education Year
          educationPercentage: "",                                     // Column V: Education Percentage/CGPA
          additionalQualifications: "",                                // Column W: Additional Qualifications
          
          // Skills & Expertise - Columns X-AA
          technicalSkills: cleanedData.technicalSkills,                // Column X: Technical Skills
          softSkills: cleanedData.softSkills,                         // Column Y: Soft Skills
          languagesKnown: cleanedData.languagesKnown,                  // Column Z: Languages Known
          certifications: cleanedData.certifications,                  // Column AA: Certifications
          
          // Work Experience - Columns AB-AE
          previousCompanies: cleanedData.previousCompanies,            // Column AB: Previous Companies
          jobTitles: [],                                               // Column AC: Job Titles
          workDuration: [],                                            // Column AD: Work Duration
          keyAchievements: cleanedData.keyAchievements,                // Column AE: Key Achievements
          workExperience: [],                                          // Column AF: Work Experience Details
          education: [],                                               // Column AG: Education Details
          
          // Additional Information - Columns AH-AM
          projects: cleanedData.projects,                              // Column AH: Projects
          awards: [],                                                  // Column AI: Awards
          publications: [],                                            // Column AJ: Publications
          references: [],                                              // Column AK: References
          linkedinProfile: "",                                         // Column AL: LinkedIn Profile
          portfolioUrl: "",                                            // Column AM: Portfolio URL
          githubProfile: "",                                           // Column AN: GitHub Profile
          summary: cleanedData.summary || "",                          // Column AO: Summary/Objective
          
          // File Information - Columns AP-AT
          resumeText: text,                                            // Column AP: Resume Text
          fileName: file.name,                                         // Column AQ: File Name
          driveFileId: "",                                             // Column AR: Drive File ID
          driveFileUrl: "",                                            // Column AS: Drive File URL
          
          // System Fields - Columns AT-BB
          status: "new" as const,                                     // Column AT: Status
          tags: [],                                                    // Column AU: Tags
          rating: undefined,                                           // Column AV: Rating
          notes: "",                                                   // Column AW: Notes
          uploadedAt: new Date().toISOString(),                        // Column AX: Uploaded At
          updatedAt: new Date().toISOString(),                         // Column AY: Updated At
          lastContacted: "",                                           // Column AZ: Last Contacted
          interviewStatus: "not-scheduled" as const,                   // Column BA: Interview Status
          feedback: "",                                                // Column BB: Feedback
        }

        console.log("✅ Gemini parsing completed successfully")
        console.log("Final parsed data:", {
          name: candidateData.name,
          email: candidateData.email,
          phone: candidateData.phone,
          currentRole: candidateData.currentRole,
          currentCompany: candidateData.currentCompany,
          location: candidateData.location,
          totalExperience: candidateData.totalExperience,
          technicalSkills: candidateData.technicalSkills.length,
          softSkills: candidateData.softSkills.length
        })
        
        return candidateData

      } catch (error) {
        console.log(`⚠️ Gemini model ${modelName} failed:`, error)
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
  const lines = text.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip empty lines and common headers
    if (!trimmedLine || 
        trimmedLine.toLowerCase().includes('resume') ||
        trimmedLine.toLowerCase().includes('cv') ||
        trimmedLine.toLowerCase().includes('curriculum vitae') ||
        trimmedLine.toLowerCase().includes('phone') ||
        trimmedLine.toLowerCase().includes('email') ||
        trimmedLine.toLowerCase().includes('address')) {
      continue
    }
    
    // Look for name patterns with more flexibility
    const namePattern = /^[A-Z][a-zA-Z\s\.\-']{2,50}$/
    if (namePattern.test(trimmedLine) && trimmedLine.split(' ').length >= 2 && trimmedLine.split(' ').length <= 4) {
      return trimmedLine
    }
  }
  
  return "Unknown Name"
}

// Function to extract the actual person's name from resume text
function extractActualPersonName(text: string): string | null {
  if (!text) return null
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Look for name patterns in the first few lines (resume headers)
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i]
    
    // Skip common resume headers and non-name content
    if (line.toLowerCase().includes('resume') || 
        line.toLowerCase().includes('curriculum') || 
        line.toLowerCase().includes('vitae') ||
        line.toLowerCase().includes('cv') ||
        line.includes('@') ||
        line.match(/^\d/) ||
        line.toLowerCase().includes('phone') ||
        line.toLowerCase().includes('mobile') ||
        line.toLowerCase().includes('email') ||
        line.toLowerCase().includes('location') ||
        line.toLowerCase().includes('address') ||
        line.toLowerCase().includes('skills') ||
        line.toLowerCase().includes('experience') ||
        line.toLowerCase().includes('education') ||
        line.toLowerCase().includes('projects') ||
        line.toLowerCase().includes('achievements')) {
      continue
    }
    
    // Look for name patterns (2-4 words, starts with capital, no special chars)
    const namePattern = /^[A-Z][a-zA-Z\s]{2,40}$/
    if (namePattern.test(line) && line.split(' ').length >= 2 && line.split(' ').length <= 4) {
      // Additional validation: should not contain common non-name words
      const lowerLine = line.toLowerCase()
      const nonNameWords = ['railway', 'infrastructure', 'projects', 'tech', 'company', 'ltd', 'pvt', 'inc']
      if (!nonNameWords.some(word => lowerLine.includes(word))) {
        return line
      }
    }
  }
  
  // If no name found in headers, try to find it near contact information
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Look for contact info patterns
    if (line.includes('@') || line.match(/\+?\d/) || line.toLowerCase().includes('phone')) {
      // Check lines above and below for name
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
        const checkLine = lines[j].trim()
        if (checkLine.length > 3 && checkLine.length < 50) {
          const namePattern = /^[A-Z][a-zA-Z\s]{2,40}$/
          if (namePattern.test(checkLine) && checkLine.split(' ').length >= 2 && checkLine.split(' ').length <= 4) {
            const lowerCheckLine = checkLine.toLowerCase()
            const nonNameWords = ['railway', 'infrastructure', 'projects', 'tech', 'company', 'ltd', 'pvt', 'inc']
            if (!nonNameWords.some(word => lowerCheckLine.includes(word))) {
              return checkLine
            }
          }
        }
      }
    }
  }
  
  return null
}

// Enhanced location extraction function
function extractLocationFromText(text: string): string {
  const locationPatterns = [
    /(?:from|at|in|based in|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*[A-Z]{2}/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+[A-Z]{2}/g,
    /(?:address|location):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  ]
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[1].trim().length > 2) {
      return match[1].trim()
    }
  }
  
  return "Not specified"
}

// Enhanced role extraction function
function extractRoleFromText(text: string): string {
  const rolePatterns = [
    /(?:currently|presently|working as|employed as)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /(?:position|role|title):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /(?:job|work|employment):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  ]
  
  for (const pattern of rolePatterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[1].trim().length > 3) {
      return match[1].trim()
    }
  }
  
  return "Not specified"
}

// Enhanced experience extraction function
function extractExperienceFromText(text: string): string {
  const expPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:of\s+)?experience/gi,
    /experience[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/gi,
    /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*in\s+[A-Za-z\s]+/gi,
    /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*work/gi,
  ]
  
  for (const pattern of expPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return `${match[1]} years`
    }
  }
  
  return "Not specified"
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
                 lowerSkill.includes('flexibility')) {
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
    
    // If the enhanced method didn't work, try the new actual person name extraction
    if (!name || name === "Unknown" || name.toLowerCase().includes("skills") || name.toLowerCase().includes("resume")) {
      console.log("Enhanced name extraction failed, trying actual person name extraction...")
      
      const actualName = extractActualPersonName(text)
      if (actualName) {
        name = actualName
        console.log("✅ Found actual person name:", name)
      } else {
        console.log("Actual person name extraction failed, trying pattern-based extraction...")
        
        // First, try to find name in the first few lines (most resumes have name at top)
        const lines = text.split('\n').slice(0, 10)
        for (const line of lines) {
          const trimmedLine = line.trim()
          // Look for lines that look like names (2-4 words, proper case, no special chars)
          if (trimmedLine.length > 3 && trimmedLine.length < 50 &&
              /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(trimmedLine) &&
              !trimmedLine.toLowerCase().includes('resume') &&
              !trimmedLine.toLowerCase().includes('curriculum') &&
              !trimmedLine.toLowerCase().includes('vitae') &&
              !trimmedLine.toLowerCase().includes('skills') &&
              !trimmedLine.toLowerCase().includes('experience') &&
              !trimmedLine.toLowerCase().includes('education') &&
              !trimmedLine.toLowerCase().includes('phone') &&
              !trimmedLine.toLowerCase().includes('email') &&
              !trimmedLine.toLowerCase().includes('@') &&
              !trimmedLine.toLowerCase().includes('+91') &&
              !trimmedLine.toLowerCase().includes('github') &&
              !trimmedLine.toLowerCase().includes('linkedin')) {
            name = trimmedLine
            console.log("Found name in first lines:", name)
            break
          }
        }
        
        // If still no name, look for patterns like "DEEPAK KUMAR" (all caps names)
        if (!name || name === "Unknown") {
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
              !n.toLowerCase().includes("phone") &&
              !n.toLowerCase().includes("email") &&
              !n.toLowerCase().includes("github") &&
              !n.toLowerCase().includes("linkedin") &&
              n.split(' ').length >= 2 &&
              n.split(' ').length <= 4
            )
            if (validNames.length > 0) {
              name = validNames[0]
              console.log("Found name from all-caps pattern:", name)
            }
          }
        }
        
        // If still no name, try to find it near contact information
        if (!name || name === "Unknown") {
          // Look for specific name patterns like "Bipul Sikder"
          const specificNameMatch = text.match(/(?:Name|Full Name)[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/i)
          if (specificNameMatch && specificNameMatch[1]) {
            name = specificNameMatch[1].trim()
            console.log("Found name from specific pattern:", name)
          }
          
          // If still no name, try to find it near phone number
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
      }
    }
    
    // Final fallback: use filename if still no name found
    if (!name || name === "Unknown" || name.trim() === "" || name.toLowerCase().includes("skills")) {
      // Last resort: look for any name-like pattern in the text
      const nameLikePatterns = [
        /([A-Z][a-z]+\s+[A-Z][a-z]+)/g,
        /([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/g
      ]
      
      for (const pattern of nameLikePatterns) {
        const matches = text.match(pattern)
        if (matches && matches.length > 0) {
          // Filter out common non-name patterns
          const potentialNames = matches.filter(match => 
            match.length > 3 && match.length < 50 &&
            !match.toLowerCase().includes('resume') &&
            !match.toLowerCase().includes('curriculum') &&
            !match.toLowerCase().includes('vitae') &&
            !match.toLowerCase().includes('skills') &&
            !match.toLowerCase().includes('experience') &&
            !match.toLowerCase().includes('education') &&
            !match.toLowerCase().includes('phone') &&
            !match.toLowerCase().includes('email') &&
            !match.toLowerCase().includes('github') &&
            !match.toLowerCase().includes('linkedin') &&
            !match.toLowerCase().includes('railway') &&
            !match.toLowerCase().includes('infrastructure') &&
            !match.toLowerCase().includes('projects')
          )
          
          if (potentialNames.length > 0) {
            name = potentialNames[0]
            console.log("Found name from fallback pattern:", name)
            break
          }
        }
      }
      
      // If still no name, use filename
      if (!name || name === "Unknown" || name.trim() === "" || name.toLowerCase().includes("skills")) {
        const fileName = file.name.replace(/\.[^/.]+$/, "")
        name = fileName.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).replace(/\d+/g, "").trim()
        console.log("Using filename as name:", name)
      }
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

    // Create the final parsed data object with CORRECT field mapping to match Google Sheets columns
    const parsedData = {
      // Basic Information - Columns A-G
      name: name || "Unknown Name",                                    // Column B: Name
      email: email || "",                                              // Column C: Email
      phone: phone || "",                                              // Column D: Phone
      dateOfBirth: "",                                                 // Column E: Date of Birth
      gender: "",                                                      // Column F: Gender
      maritalStatus: "",                                               // Column G: Marital Status
      
      // Professional Information - Columns H-P
      currentRole: currentRole || "Not specified",                     // Column H: Current Role
      desiredRole: "",                                                 // Column I: Desired Role
      currentCompany: currentCompany || "",                            // Column J: Current Company
      location: location || "Not specified",                          // Column K: Location
      preferredLocation: "",                                           // Column L: Preferred Location
      totalExperience: totalExperience || "Not specified",             // Column M: Total Experience
      currentSalary: "",                                               // Column N: Current Salary
      expectedSalary: "",                                              // Column O: Expected Salary
      noticePeriod: "",                                                // Column P: Notice Period
      
      // Education Details - Columns Q-V
      highestQualification: educationSection.highestQualification || "", // Column Q: Highest Qualification
      degree: educationSection.degree || "",                            // Column R: Degree
      specialization: educationSection.specialization || "",            // Column S: Specialization
      university: educationSection.university || "",                    // Column T: University/College
      educationYear: educationSection.year || "",                       // Column U: Education Year
      educationPercentage: educationSection.percentage || "",           // Column V: Education Percentage/CGPA
      additionalQualifications: "",                                     // Column W: Additional Qualifications
      
      // Skills & Expertise - Columns X-AA
      technicalSkills: technicalSkills,                                // Column X: Technical Skills
      softSkills: softSkills,                                          // Column Y: Soft Skills
      languagesKnown: extractLanguages(text),                          // Column Z: Languages Known
      certifications: extractCertifications(text),                      // Column AA: Certifications
      
      // Work Experience - Columns AB-AE
      previousCompanies: workExperience.map(exp => exp.company).filter(Boolean), // Column AB: Previous Companies
      jobTitles: workExperience.map(exp => exp.role).filter(Boolean),           // Column AC: Job Titles
      workDuration: workExperience.map(exp => exp.duration).filter(Boolean),    // Column AD: Work Duration
      keyAchievements: extractAchievements(text),                               // Column AE: Key Achievements
      workExperience: workExperience,                                           // Column AF: Work Experience Details
      education: educationSection.education,                                    // Column AG: Education Details
      
      // Additional Information - Columns AH-AM
      projects: extractProjects(text),                                 // Column AH: Projects
      awards: [],                                                       // Column AI: Awards
      publications: [],                                                 // Column AJ: Publications
      references: [],                                                   // Column AK: References
      linkedinProfile: "",                                              // Column AL: LinkedIn Profile
      portfolioUrl: "",                                                 // Column AM: Portfolio URL
      githubProfile: "",                                                // Column AN: GitHub Profile
      summary: extractSummary(text),                                    // Column AO: Summary/Objective
      
      // File Information - Columns AP-AT
      resumeText: text,                                                 // Column AP: Resume Text
      fileName: file.name,                                              // Column AQ: File Name
      driveFileId: "",                                                  // Column AR: Drive File ID
      driveFileUrl: "",                                                 // Column AS: Drive File URL
      
                // System Fields - Columns AT-BB
          status: "new" as const,                                          // Column AT: Status
          tags: [],                                                         // Column AU: Tags
          rating: undefined,                                                // Column AV: Rating
          notes: "",                                                        // Column AW: Notes
          uploadedAt: new Date().toISOString(),                             // Column AX: Uploaded At
          updatedAt: new Date().toISOString(),                              // Column AY: Updated At
          lastContacted: "",                                                // Column AZ: Last Contacted
          interviewStatus: "not-scheduled" as const,                        // Column BA: Interview Status
          feedback: "",                                                     // Column BB: Feedback
    }

    // Enhanced field validation and correction
    console.log("🔍 Validating parsed data fields...")
    
    // Ensure critical fields have meaningful values
    if (parsedData.name === "Unknown Name" || parsedData.name.trim().length < 2) {
      // Try to extract name from other patterns
      const namePatterns = [
        /(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\s*[-|]\s*|$)/,
        /(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\s*[A-Z][a-z]+)/,
      ]
      
      for (const pattern of namePatterns) {
        const match = text.match(pattern)
        if (match && match[1] && match[1].trim().length > 2) {
          parsedData.name = match[1].trim()
          console.log("✅ Name corrected from pattern:", parsedData.name)
          break
        }
      }
    }

    // Improve location extraction if not found
    if (!parsedData.location || parsedData.location === "Not specified") {
      const locationPatterns = [
        /(?:from|at|in|based in|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*[A-Z]{2}/g,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+[A-Z]{2}/g,
      ]
      
      for (const pattern of locationPatterns) {
        const match = text.match(pattern)
        if (match && match[1] && match[1].trim().length > 2) {
          parsedData.location = match[1].trim()
          console.log("✅ Location corrected from pattern:", parsedData.location)
          break
        }
      }
    }

    // Improve current role extraction
    if (!parsedData.currentRole || parsedData.currentRole === "Not specified") {
      const rolePatterns = [
        /(?:currently|presently|working as|employed as)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        /(?:position|role|title):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      ]
      
      for (const pattern of rolePatterns) {
        const match = text.match(pattern)
        if (match && match[1] && match[1].trim().length > 3) {
          parsedData.currentRole = match[1].trim()
          console.log("✅ Current role corrected from pattern:", parsedData.currentRole)
          break
        }
      }
    }

    // Improve experience extraction
    if (!parsedData.totalExperience || parsedData.totalExperience === "Not specified") {
      const expPatterns = [
        /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:of\s+)?experience/gi,
        /experience[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/gi,
        /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*in\s+[A-Za-z\s]+/gi,
      ]
      
      for (const pattern of expPatterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
          parsedData.totalExperience = `${match[1]} years`
          console.log("✅ Experience corrected from pattern:", parsedData.totalExperience)
          break
        }
      }
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
    console.log(`🔄 Extracting text from ${file.type} file: ${file.name}`)
    console.log(`📁 File details: name=${file.name}, type=${file.type}, size=${file.size} bytes`)

    // Enhanced file type detection
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    
    // Check for text files
    if (fileType === "text/plain" || fileName.endsWith('.txt')) {
      console.log("📝 Processing as text file...")
      const text = await file.text()
      console.log("✅ Text file extracted successfully")
      return text
    }
    
    // Check for PDF files
    if (fileType === "application/pdf" || fileName.endsWith('.pdf')) {
      console.log("📄 Processing as PDF file...")
      const arrayBuffer = await file.arrayBuffer()
      const text = await extractPDFText(arrayBuffer)
      console.log("✅ PDF text extracted")
      return text
    }
    
    // Check for Word documents (DOCX, DOC)
    if (fileType.includes("word") || 
        fileType.includes("document") || 
        fileType.includes("docx") || 
        fileType.includes("doc") ||
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc')) {
      console.log(`📝 Processing Word document: ${file.name} (${file.type})`)
      const arrayBuffer = await file.arrayBuffer()
      const text = await extractDocxText(arrayBuffer)
      console.log("✅ Word document text extracted")
      return text
    }
    
    // If file type is unknown but filename suggests a supported format, try to process it
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileName.endsWith('.pdf')) {
      console.log(`⚠️ Unknown file type but filename suggests supported format: ${fileName}`)
      console.log(`🔄 Attempting to process as: ${fileName.endsWith('.docx') ? 'DOCX' : fileName.endsWith('.doc') ? 'DOC' : 'PDF'}`)
      
      const arrayBuffer = await file.arrayBuffer()
      
      if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        return await extractDocxText(arrayBuffer)
      } else if (fileName.endsWith('.pdf')) {
        return await extractPDFText(arrayBuffer)
      }
    }
    
    // If we get here, the file type is not supported
    throw new Error(`Unsupported file type: ${file.type}. Supported types: PDF, DOCX, DOC, TXT`)
    
  } catch (error) {
    console.error("❌ Text extraction error:", error)
    console.error(`File: ${file.name}, Type: ${file.type}, Size: ${file.size}`)
    
    // Return a more helpful error message
    const errorMessage = error instanceof Error ? error.message : String(error)
    return `Error extracting text from ${file.name}: ${errorMessage}`
  }
}

async function extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Use pdf-parse for robust PDF text extraction
    const data = await pdfParse(Buffer.from(arrayBuffer))
    return sanitizeExtractedText(data.text)
  } catch (error) {
    console.error("PDF extraction error with pdf-parse:", error)
    // Fallback to basic text extraction if pdf-parse fails
    const uint8Array = new Uint8Array(arrayBuffer)
    const text = new TextDecoder("latin1").decode(uint8Array)
    const readableText = sanitizeExtractedText(text)
    return readableText.length > 50 ? readableText : `PDF processing error: ${error}`
  }
}

async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("🔄 Starting DOCX text extraction...")
    console.log("ArrayBuffer size:", arrayBuffer.byteLength)
    console.log("ArrayBuffer constructor:", arrayBuffer.constructor.name)
    
    // Environment checks
    console.log("Environment check - Node.js:", typeof process !== 'undefined' && process.versions && process.versions.node)
    console.log("Environment check - Browser:", typeof window !== 'undefined')
    console.log("Environment check - Global:", typeof global !== 'undefined')
    
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
      console.warn("⚠️ File signature doesn't match DOCX format, but attempting extraction anyway...")
      // Don't throw error immediately, try to extract anyway
    }
    
    // Check if mammoth is available
    if (!mammoth) {
      console.error("❌ Mammoth.js library not available")
      console.error("Mammoth import result:", mammoth)
      throw new Error("Mammoth.js library not available")
    }
    
    if (typeof mammoth.extractRawText !== 'function') {
      console.error("❌ Mammoth.js extractRawText function not available")
      console.error("Available mammoth properties:", Object.getOwnPropertyNames(mammoth))
      console.error("Mammoth type:", typeof mammoth)
      throw new Error("Mammoth.js extractRawText function not available")
    }
    
    console.log("✅ Mammoth.js is available, attempting text extraction...")
    console.log("Mammoth object:", mammoth)
    console.log("extractRawText function:", mammoth.extractRawText)
    
    // Try multiple approaches for mammoth.js
    let result = null
    let lastError = null
    
    // Approach 1: Direct arrayBuffer
    try {
      console.log("🔄 Attempt 1: Direct arrayBuffer...")
      result = await mammoth.extractRawText({ arrayBuffer })
      console.log("✅ Direct arrayBuffer approach successful")
    } catch (error1) {
      console.log("❌ Direct arrayBuffer failed:", error1 instanceof Error ? error1.message : error1)
      lastError = error1
      
      // Approach 2: Buffer conversion
      try {
        console.log("🔄 Attempt 2: Buffer conversion...")
        const buffer = Buffer.from(arrayBuffer)
        result = await mammoth.extractRawText({ arrayBuffer: buffer as any })
        console.log("✅ Buffer conversion approach successful")
      } catch (error2) {
        console.log("❌ Buffer conversion failed:", error2 instanceof Error ? error2.message : error2)
        lastError = error2
        
        // Approach 3: Uint8Array conversion
        try {
          console.log("🔄 Attempt 3: Uint8Array conversion...")
          result = await mammoth.extractRawText({ arrayBuffer: uint8Array as any })
          console.log("✅ Uint8Array conversion approach successful")
        } catch (error3) {
          console.log("❌ Uint8Array conversion failed:", error3 instanceof Error ? error3.message : error3)
          lastError = error3
        }
      }
    }
    
    if (result && result.value && result.value.trim().length > 0) {
      console.log("✅ DOCX text extracted successfully!")
      console.log("Extracted text length:", result.value.length)
      console.log("First 200 characters:", result.value.substring(0, 200))
      return sanitizeExtractedText(result.value)
    } else {
      console.warn("⚠️ Mammoth extraction returned empty or invalid result")
      throw new Error("No text content found in DOCX file")
    }
    
  } catch (error) {
    console.error("❌ All mammoth.js approaches failed:", error)

    // Robust fallback using ZIP parsing to read document.xml
    console.log("🔄 Attempting ZIP-based DOCX text extraction fallback...")
    try {
      const zip = await JSZip.loadAsync(arrayBuffer)
      const xmlFiles = [
        "word/document.xml",
        "word/header1.xml",
        "word/header2.xml",
        "word/footer1.xml",
        "word/footer2.xml"
      ]
      let combined = ""
      for (const path of xmlFiles) {
        if (zip.file(path)) {
          const xmlContent = await zip.file(path)!.async("string")
          // Extract all text nodes from w:t tags
          const matches = xmlContent.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || []
          const textNodes = matches
            .map((m) => m.replace(/<w:t[^>]*>/i, "").replace(/<\/w:t>/i, ""))
            .join(" ")
          combined += " " + textNodes
        }
      }
      const cleaned = sanitizeExtractedText(combined)
      if (cleaned && cleaned.length > 50) {
        console.log("✅ ZIP-based DOCX text extraction successful!")
        console.log("Fallback text length:", cleaned.length)
        console.log("First 200 characters:", cleaned.substring(0, 200))
        return cleaned
      }
      throw new Error("ZIP fallback produced insufficient text")
    } catch (fallbackError) {
      console.error("❌ ZIP-based DOCX extraction failed:", fallbackError)
      const details = {
        originalError: error instanceof Error ? error.message : String(error),
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      }
      throw new Error(`DOCX processing completely failed. Details: ${JSON.stringify(details)}`)
    }
  }
}

function sanitizeExtractedText(input: string): string {
  if (!input) return ""
  // Replace non-printable/binary, collapse whitespace, trim
  let text = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  // Guard against extremely long content causing Sheets 50k cell limit.
  const MAX_LEN = 30000
  if (text.length > MAX_LEN) {
    text = text.slice(0, MAX_LEN)
  }
  return text
}

function getFallbackParsedData(file: File) {
  const fileName = file.name.replace(/\.[^/.]+$/, "")

  return {
    // Basic Information - Columns A-G
    name: fileName.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).replace(/\d+/g, "").trim(), // Column B: Name
    email: "",                                                                                                   // Column C: Email
    phone: "",                                                                                                   // Column D: Phone
    dateOfBirth: "",                                                                                            // Column E: Date of Birth
    gender: "",                                                                                                  // Column F: Gender
    maritalStatus: "",                                                                                           // Column G: Marital Status
    
    // Professional Information - Columns H-P
    currentRole: "Not specified",                                                                                // Column H: Current Role
    desiredRole: "",                                                                                             // Column I: Desired Role
    currentCompany: "",                                                                                          // Column J: Current Company
    location: "Not specified",                                                                                   // Column K: Location
    preferredLocation: "",                                                                                       // Column L: Preferred Location
    totalExperience: "Not specified",                                                                            // Column M: Total Experience
    currentSalary: "",                                                                                           // Column N: Current Salary
    expectedSalary: "",                                                                                          // Column O: Expected Salary
    noticePeriod: "",                                                                                            // Column P: Notice Period
    
    // Education Details - Columns Q-V
    highestQualification: "",                                                                                    // Column Q: Highest Qualification
    degree: "",                                                                                                  // Column R: Degree
    specialization: "",                                                                                          // Column S: Specialization
    university: "",                                                                                              // Column T: University/College
    educationYear: "",                                                                                           // Column U: Education Year
    educationPercentage: "",                                                                                     // Column V: Education Percentage/CGPA
    additionalQualifications: "",                                                                                // Column W: Additional Qualifications
    
    // Skills & Expertise - Columns X-AA
    technicalSkills: [],                                                                                         // Column X: Technical Skills
    softSkills: [],                                                                                              // Column Y: Soft Skills
    languagesKnown: [],                                                                                          // Column Z: Languages Known
    certifications: [],                                                                                          // Column AA: Certifications
    
    // Work Experience - Columns AB-AE
    previousCompanies: [],                                                                                       // Column AB: Previous Companies
    jobTitles: [],                                                                                               // Column AC: Job Titles
    workDuration: [],                                                                                            // Column AD: Work Duration
    keyAchievements: [],                                                                                         // Column AE: Key Achievements
    workExperience: [],                                                                                          // Column AF: Work Experience Details
    education: [],                                                                                               // Column AG: Education Details
    
    // Additional Information - Columns AH-AM
    projects: [],                                                                                                // Column AH: Projects
    awards: [],                                                                                                  // Column AI: Awards
    publications: [],                                                                                            // Column AJ: Publications
    references: [],                                                                                              // Column AK: References
    linkedinProfile: "",                                                                                         // Column AL: LinkedIn Profile
    portfolioUrl: "",                                                                                            // Column AM: Portfolio URL
    githubProfile: "",                                                                                           // Column AN: GitHub Profile
    summary: "",                                                                                                 // Column AO: Summary/Objective
    
    // File Information - Columns AP-AT
    resumeText: `Resume file: ${file.name} (${file.size} bytes, ${file.type})`,                                   // Column AP: Resume Text
    fileName: file.name,                                                                                         // Column AQ: File Name
    driveFileId: "",                                                                                             // Column AR: Drive File ID
    driveFileUrl: "",                                                                                            // Column AS: Drive File URL
    
    // System Fields - Columns AT-BB
    status: "new" as const,                                                                                     // Column AT: Status
    tags: [],                                                                                                    // Column AU: Tags
    rating: undefined,                                                                                           // Column AV: Rating
    notes: "",                                                                                                   // Column AW: Notes
    uploadedAt: new Date().toISOString(),                                                                        // Column AX: Uploaded At
    updatedAt: new Date().toISOString(),                                                                         // Column AY: Updated At
    lastContacted: "",                                                                                           // Column AZ: Last Contacted
    interviewStatus: "not-scheduled" as const,                                                                   // Column BA: Interview Status
    feedback: "",                                                                                                // Column BB: Feedback
  }
}

// Helper functions for data cleaning and extraction
function cleanString(value: any): string {
  if (!value || typeof value !== 'string') return ""
  const cleaned = value.trim()
  if (cleaned.toLowerCase() === 'unknown' || cleaned.toLowerCase() === 'not specified' || cleaned.toLowerCase() === 'n/a') {
    return ""
  }
  return cleaned
}

function cleanArray(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(item => item && typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim())
    .filter(item => item.toLowerCase() !== 'unknown' && item.toLowerCase() !== 'not specified' && item.toLowerCase() !== 'n/a')
}

// Parse resume using OpenAI GPT-3.5-turbo (Free tier alternative)




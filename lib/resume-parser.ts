import { GoogleGenerativeAI } from "@google/generative-ai"
import { emailRegex, phoneRegex } from "./regexPatterns"
import pdfParse from "pdf-parse"
import mammoth from "mammoth"

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null

export async function parseResume(file: File) {
  console.log(`=== Starting comprehensive resume parsing for: ${file.name} ===`)

  try {
    // Check if we have API keys
    console.log("API Key Status:")
    console.log("- GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✅ Configured" : "❌ Missing")
    console.log("- AFFINDA_API_KEY:", process.env.AFFINDA_API_KEY ? "✅ Configured" : "❌ Missing")

    // Try Gemini first for better comprehensive parsing
    if (process.env.GEMINI_API_KEY && genAI) {
      try {
        console.log("Attempting Gemini comprehensive parsing...")
        const result = await parseResumeWithGemini(file)
        console.log("✅ Gemini parsing successful")
        return result
      } catch (geminiError) {
        console.log("❌ Gemini parsing failed:", geminiError)
        console.log("Falling back to Affinda parsing...")
      }
    }

    // Try Affinda as fallback
    if (process.env.AFFINDA_API_KEY) {
      try {
        console.log("Attempting Affinda parsing...")
        const result = await parseResumeWithAffinda(file)
        console.log("✅ Affinda parsing successful")
        return result
      } catch (affindaError) {
        console.log("❌ Affinda parsing failed:", affindaError)
        console.log("Falling back to basic parsing...")
      }
    }

    // Fallback to basic parsing
    console.log("Using fallback parsing method...")
    return await parseResumeBasic(file)
  } catch (error) {
    console.error("❌ All parsing methods failed:", error)
    return getFallbackParsedData(file)
  }
}

async function parseResumeWithGemini(file: File) {
  try {
    if (!genAI) {
      throw new Error("Gemini AI not initialized - API key missing")
    }

    const text = await extractTextFromFile(file)
    console.log("Extracted text length:", text.length)
    console.log("Text preview:", text.substring(0, 300) + "...")

    if (text.length < 50) {
      throw new Error("Extracted text too short, likely extraction failed")
    }

    // Use the correct model name for Gemini 1.5
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Comprehensive prompt for detailed extraction
    const prompt = `
Extract comprehensive information from this resume and return ONLY valid JSON. Analyze the text carefully and extract specific information:

RESUME TEXT:
${text.substring(0, 4000)}

Return this exact JSON format with all available information:
{
  "name": "full name of the person",
  "email": "email address",
  "phone": "phone number with country code if available",
  "dateOfBirth": "date of birth if mentioned",
  "gender": "gender if mentioned",
  "currentRole": "current job title or most recent position",
  "desiredRole": "desired position if mentioned",
  "currentCompany": "current or most recent company",
  "location": "current city/location",
  "preferredLocation": "preferred work location if mentioned",
  "totalExperience": "total years of experience (e.g., '5 years', '2-3 years')",
  "currentSalary": "current salary if mentioned",
  "expectedSalary": "expected salary if mentioned",
  "noticePeriod": "notice period if mentioned",
  "highestQualification": "highest degree (e.g., 'Bachelor's', 'Master's', 'PhD')",
  "degree": "specific degree name (e.g., 'B.Tech', 'MBA', 'B.Com')",
  "specialization": "field of study/specialization",
  "university": "university or college name",
  "educationYear": "graduation year",
  "educationPercentage": "percentage or CGPA if mentioned",
  "technicalSkills": ["skill1", "skill2", "skill3"],
  "softSkills": ["communication", "leadership", "teamwork"],
  "languagesKnown": ["English", "Hindi", "etc"],
  "certifications": ["certification1", "certification2"],
  "previousCompanies": ["company1", "company2"],
  "keyAchievements": ["achievement1", "achievement2"],
  "projects": ["project1", "project2"],
  "linkedinProfile": "LinkedIn URL if mentioned",
  "summary": "professional summary or objective",
  "resumeText": "complete resume text"
}

IMPORTANT RULES:
1. Extract actual information from the resume text
2. If information is not found, use empty string "" for text fields and empty array [] for arrays
3. For experience, try to calculate total years from work history if not explicitly mentioned
4. For skills, extract both technical and soft skills separately
5. Infer current role from work experience if not explicitly stated
6. Return only valid JSON, no additional text
7. Ensure all fields are present in the response
`

    console.log("Sending comprehensive request to Gemini...")
    const result = await model.generateContent(prompt)
    const response = await result.response
    let responseText = response.text()

    console.log("Gemini raw response length:", responseText.length)
    console.log("Gemini response preview:", responseText.substring(0, 500))

    // Clean the response
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^\s*[\r\n]/gm, "")
      .trim()

    // Extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in Gemini response")
    }

    let parsedData
    try {
      parsedData = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Attempted to parse:", jsonMatch[0].substring(0, 500))
      throw new Error("Invalid JSON from Gemini")
    }

    // Ensure resumeText is the full extracted text
    parsedData.resumeText = text

    // Validate and provide defaults for required fields
    const validatedData = {
      name: parsedData.name || "Unknown",
      email: parsedData.email || "",
      phone: parsedData.phone || "",
      dateOfBirth: parsedData.dateOfBirth || "",
      gender: parsedData.gender || "",
      currentRole: parsedData.currentRole || parsedData.desiredRole || "Not specified",
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
      technicalSkills: Array.isArray(parsedData.technicalSkills) ? parsedData.technicalSkills : [],
      softSkills: Array.isArray(parsedData.softSkills) ? parsedData.softSkills : [],
      languagesKnown: Array.isArray(parsedData.languagesKnown) ? parsedData.languagesKnown : [],
      certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications : [],
      previousCompanies: Array.isArray(parsedData.previousCompanies) ? parsedData.previousCompanies : [],
      keyAchievements: Array.isArray(parsedData.keyAchievements) ? parsedData.keyAchievements : [],
      projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
      linkedinProfile: parsedData.linkedinProfile || "",
      summary: parsedData.summary || "",
      resumeText: text,
    }

    console.log("✅ Successfully parsed with Gemini:", validatedData.name)
    console.log(
      "Extracted skills:",
      validatedData.technicalSkills.length,
      "technical,",
      validatedData.softSkills.length,
      "soft",
    )
    return validatedData
  } catch (error) {
    console.error("❌ Gemini parsing error:", error)
    throw error
  }
}

async function parseResumeWithAffinda(file: File) {
  try {
    console.log("Creating FormData for Affinda...")
    const formData = new FormData()
    formData.append("file", file)

    // Add workspace if available
    if (process.env.AFFINDA_WORKSPACE) {
      formData.append("workspace", process.env.AFFINDA_WORKSPACE)
    }

    console.log("Sending request to Affinda API...")
    const response = await fetch("https://api.affinda.com/v3/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AFFINDA_API_KEY}`,
      },
      body: formData,
    })

    console.log("Affinda response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Affinda API error response:", errorText)
      throw new Error(`Affinda API error ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log("Affinda response received, processing...")
    console.log("Affinda data keys:", Object.keys(result.data || {}))

    const data = result.data
    if (!data) {
      throw new Error("No data returned from Affinda")
    }

    // Enhanced Affinda data extraction with proper field handling
    const parsedData = {
      name: extractStringValue(data.name) || "Unknown",
      email: data.emails?.[0]?.email || "",
      phone: data.phoneNumbers?.[0]?.rawPhoneNumber || data.phoneNumbers?.[0]?.phoneNumber || "",
      dateOfBirth: extractStringValue(data.dateOfBirth) || "",
      gender: extractStringValue(data.gender) || "",
      currentRole:
        extractStringValue(data.profession) ||
        extractStringValue(data.jobTitle) ||
        data.workExperience?.[0]?.jobTitle ||
        "",
      desiredRole: extractStringValue(data.objective) || "",
      currentCompany: data.workExperience?.[0]?.organization || "",
      location: extractStringValue(data.location) || "",
      preferredLocation: "",
      totalExperience: data.totalYearsExperience ? `${data.totalYearsExperience} years` : "",
      currentSalary: "",
      expectedSalary: "",
      noticePeriod: "",
      highestQualification: data.education?.[0]?.accreditation?.education || "",
      degree: data.education?.[0]?.accreditation?.educationLevel || "",
      specialization: data.education?.[0]?.accreditation?.inputStr || "",
      university: data.education?.[0]?.organization || "",
      educationYear: data.education?.[0]?.dates?.completionDate || "",
      educationPercentage: data.education?.[0]?.grade?.raw || "",
      technicalSkills:
        data.skills
          ?.filter((skill: any) => skill.type === "technical" || skill.name?.toLowerCase().includes("technical"))
          .map((skill: any) => skill.name) || [],
      softSkills:
        data.skills?.filter((skill: any) => skill.type === "soft" || !skill.type).map((skill: any) => skill.name) || [],
      languagesKnown: data.languages?.map((lang: any) => lang.name || lang) || [],
      certifications: data.certifications?.map((cert: any) => cert.name || cert.organization) || [],
      previousCompanies: data.workExperience?.map((exp: any) => exp.organization).filter(Boolean) || [],
      keyAchievements:
        data.workExperience?.flatMap((exp: any) => (exp.jobDescription ? [exp.jobDescription] : [])) || [],
      projects: [],
      linkedinProfile: data.websites?.find((site: any) => site.url?.includes("linkedin"))?.url || "",
      summary: extractStringValue(data.summary) || extractStringValue(data.objective) || "",
      resumeText: data.rawText || "",
    }

    // If technical skills is empty, try to get all skills
    if (parsedData.technicalSkills.length === 0 && data.skills) {
      parsedData.technicalSkills = data.skills.slice(0, 10).map((skill: any) => skill.name)
    }

    console.log("✅ Successfully parsed with Affinda:", parsedData.name)
    console.log("Affinda extracted - Technical skills:", parsedData.technicalSkills.length)
    console.log("Affinda extracted - Education:", parsedData.degree, parsedData.university)
    return parsedData
  } catch (error) {
    console.error("❌ Affinda parsing error:", error)
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

async function parseResumeBasic(file: File) {
  console.log("Using basic parsing method...")

  try {
    const text = await extractTextFromFile(file)
    console.log("Basic parsing - extracted text length:", text.length)

    // Basic regex patterns for common resume fields
    const emails = text.match(emailRegex) || []
    const phones = text.match(phoneRegex) || []

    // Extract name (usually first line or after common headers)
    const lines = text.split("\n").filter((line) => line.trim().length > 0)
    let name = "Unknown"

    for (const line of lines.slice(0, 5)) {
      const cleanLine = line.trim()
      if (
        cleanLine.length > 2 &&
        cleanLine.length < 50 &&
        !cleanLine.includes("@") &&
        !cleanLine.match(/\d{3}/) &&
        !cleanLine.toLowerCase().includes("resume") &&
        !cleanLine.toLowerCase().includes("curriculum")
      ) {
        name = cleanLine
        break
      }
    }

    // Enhanced skill extraction for logistics domain
    const logisticsSkills = [
      "Supply Chain Management",
      "Logistics",
      "Transportation",
      "Fleet Management",
      "Warehouse Management",
      "Inventory Management",
      "Distribution",
      "Procurement",
      "FASTag",
      "GPS Tracking",
      "Route Optimization",
      "Customer Service",
      "Team Leadership",
      "Project Management",
      "Communication",
      "Problem Solving",
      "Microsoft Excel",
      "SAP",
      "ERP",
      "WMS",
      "TMS",
    ]

    const foundSkills = logisticsSkills.filter((skill) => text.toLowerCase().includes(skill.toLowerCase())).slice(0, 8)

    const parsedData = {
      name,
      email: emails[0] || "",
      phone: phones[0] || "",
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
      technicalSkills: foundSkills,
      softSkills: [],
      languagesKnown: [],
      certifications: [],
      previousCompanies: [],
      keyAchievements: [],
      projects: [],
      linkedinProfile: "",
      summary: "",
      resumeText: text,
    }

    console.log("✅ Basic parsing completed:", parsedData.name)
    return parsedData
  } catch (error) {
    console.error("❌ Basic parsing failed:", error)
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
    } else if (file.type.includes("word") || file.type.includes("document")) {
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
    // Use mammoth.js for robust DOCX text extraction
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer })
    return result.value
  } catch (error) {
    console.error("DOCX extraction error with mammoth:", error)
    // Fallback to basic text extraction if mammoth fails
    const uint8Array = new Uint8Array(arrayBuffer)
    const text = new TextDecoder().decode(uint8Array)
    const cleanText = text
      .replace(/<[^>]*>/g, " ")
      .replace(/[^\x20-\x7E\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    return cleanText.length > 50 ? cleanText : `DOCX processing error: ${error}`
  }
}

function getFallbackParsedData(file: File) {
  const fileName = file.name.replace(/\.[^/.]+$/, "")

  return {
    name: fileName.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
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
  }
}

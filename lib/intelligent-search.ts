import { GoogleGenerativeAI } from "@google/generative-ai"
import { SupabaseCandidateService } from "./supabase-candidates"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash"

export interface SearchRequirement {
  role?: string;
  experience?: {
    min?: number;
    max?: number;
    exact?: number;
  };
  location?: string;
  skills?: string[];
  education?: string;
  certifications?: string[];
  industry?: string;
  specificRequirements?: string[];
  impliedResponsibilities?: string[];
}

export async function parseSearchRequirement(naturalLanguageQuery: string): Promise<SearchRequirement> {
  console.log("=== Parsing Search Requirement with Gemini ===")
  console.log("Query:", naturalLanguageQuery)

  if (!process.env.GEMINI_API_KEY) {
    console.log("⚠️ GEMINI_API_KEY not configured, using keyword extraction")
    return extractBasicRequirements(naturalLanguageQuery)
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: DEFAULT_GEMINI_MODEL
    })
    
    const prompt = `You are an expert HR recruiter with deep knowledge of logistics and transportation industry. Parse this job requirement and extract structured information with semantic understanding.
    
    CRITICAL INSTRUCTION: Analyze the job role deeply to understand what this person actually DOES. Generate a list of "impliedResponsibilities" that are standard for this role in logistics, even if not explicitly mentioned.

"${naturalLanguageQuery}"

Extract and return ONLY a JSON object with this exact structure:
{
  "role": "Job title/position (e.g., 'Fleet Manager', 'Truck Driver', 'Warehouse Manager')",
  "experience": {
    "min": minimum years of experience (number or null),
    "max": maximum years of experience (number or null),
    "exact": exact years if specified (number or null)
  },
  "location": "Required location/city/region",
  "skills": ["Array of required technical and soft skills"],
  "education": "Education requirement",
  "certifications": ["Required certifications"],
  "industry": "Industry type (logistics, transportation, warehousing, supply chain)",
  "specificRequirements": ["Any other specific requirements including salary info"],
  "impliedResponsibilities": ["Array of 5-7 specific daily tasks, KPIs, and responsibilities for this role in logistics (e.g., for 'Ops Exec': 'driver coordination', 'route planning', 'POD collection')"]
}

Advanced Semantic Parsing Rules:
- "Warehouse Manager" → role: "Warehouse Manager", skills: ["warehouse management", "inventory control"], impliedResponsibilities: ["inventory audit", "staff supervision", "safety compliance", "inward/outward management"]
- "SAP software" → skills: ["SAP"], specificRequirements: ["SAP proficiency"]
- "LIFO and FEFO" → skills: ["inventory management", "LIFO", "FEFO"]
- "Minimum 3 years" → experience: {min: 3}
- "Up to ₹30,000" → specificRequirements: ["salary up to 30000 INR"]
- "Lodhwal, Ludhiana" → location: "Ludhiana"
- "organizational and leadership abilities" → skills: ["organizational skills", "leadership"]
- "proficiency in" → skills: [extract the skill]
- "strong knowledge of" → skills: [extract the knowledge area]
- "excellent" → skills: [extract the following skill/ability]
- "5+ years" means min: 5
- "2-5 years" means min: 2, max: 5
- "Clean license" means certifications: ["Clean Driving License"]
- "CDL" means certifications: ["Commercial Driver License"]
- "Hazmat" means certifications: ["Hazmat Certification"]
- Location names should be extracted as-is
- Include both hard skills and soft skills
- Be precise and don't make assumptions

Semantic Understanding:
- Extract implicit skills from job titles
- Recognize salary information and ranges
- Identify inventory management methods (LIFO, FIFO, FEFO)
- Understand software requirements (SAP, ERP, etc.)
- Extract location information accurately including area names
- Parse experience requirements (minimum, maximum, range)
- Identify soft skills and leadership requirements
- GENERATE implied responsibilities based on the role to help match candidates who mention these tasks in their resume/summary.

Return ONLY the JSON object, no additional text.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    
    console.log("Gemini parsing response:", text)
    
    try {
      const parsed = JSON.parse(text)
      console.log("✅ Successfully parsed requirements:", parsed)
      return parsed
    } catch (parseError) {
      console.log("❌ Failed to parse Gemini response, using fallback")
      return extractBasicRequirements(naturalLanguageQuery)
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error("❌ Gemini parsing failed:", errorMessage)
    
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      console.error("⚠️ Model not found. Check GEMINI_MODEL env var or API key permissions.")
    }

    console.log("🔄 Falling back to basic requirement extraction")
    return extractBasicRequirements(naturalLanguageQuery)
  }
}

function extractBasicRequirements(query: string): SearchRequirement {
  const lowerQuery = query.toLowerCase()
  const requirements: SearchRequirement = {}

  // Extract experience with various patterns including salary-based experience hints
  const expPatterns = [
    /(\d+)\+?\s*years?/,           // "5+ years", "5 years"
    /(\d+)-(\d+)\s*years?/,        // "2-5 years"
    /minimum\s*(\d+)\s*years?/,    // "minimum 5 years"
    /at\s*least\s*(\d+)\s*years?/  // "at least 5 years"
  ]
  
  for (const pattern of expPatterns) {
    const match = lowerQuery.match(pattern)
    if (match) {
      if (match.length === 3) { // Range pattern
        requirements.experience = { min: parseInt(match[1]), max: parseInt(match[2]) }
      } else {
        requirements.experience = { min: parseInt(match[1]) }
      }
      break
    }
  }

  // Extract location with better coverage including area/locality names
  const locationKeywords = [
    'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'pune', 'hyderabad', 'ahmedabad',
    'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'navi mumbai', 'thane',
    'jaipur', 'lucknow', 'chandigarh', 'indore', 'bhopal', 'patna', 'ranchi', 'ludhiana',
    'lodhwal', 'manesar', 'bawal', 'dharuhera', 'bhiwadi', 'neemrana'
  ]
  
  for (const location of locationKeywords) {
    if (lowerQuery.includes(location)) {
      requirements.location = location
      break
    }
  }

  // Extract role with comprehensive coverage including new logistics roles
  const roleKeywords = [
    'fleet manager', 'truck driver', 'logistics coordinator', 'warehouse manager', 
    'supply chain manager', 'transport manager', 'operations manager', 'delivery manager',
    'fleet supervisor', 'logistics executive', 'warehouse executive', 'transport coordinator',
    'inventory manager', 'store manager', 'godown manager', 'warehouse incharge', 
    'logistics manager', 'supply chain executive', 'procurement manager',
    'transport executive', 'transport supervisor', 'fleet executive', 'operations executive',
    // Singular/Plural variations
    'operation executive', 'operation manager', 'logistic executive', 'logistic manager'
  ]
  
  for (const role of roleKeywords) {
    if (lowerQuery.includes(role)) {
      requirements.role = role
      break
    }
  }

  // Extract skills with semantic understanding
  const skillKeywords = [
    'gps tracking', 'fleet management', 'route optimization', 'supply chain', 'inventory management',
    'warehouse management', 'transportation', 'logistics', 'vehicle tracking', 'driver management',
    'fuel management', 'maintenance scheduling', 'compliance', 'safety regulations', 'dot regulations',
    'clean license', 'cdl', 'commercial driver license', 'hazmat', 'hazmat certification',
    'sap', 'erp', 'lifo', 'fefo', 'fifo', 'organizational skills', 'leadership', 'team management',
    'data analysis', 'problem solving', 'communication skills'
  ]
  
  const foundSkills = skillKeywords.filter(skill => lowerQuery.includes(skill))
  if (foundSkills.length > 0) {
    requirements.skills = foundSkills
  }

  // Extract certifications with comprehensive coverage
  const certKeywords = [
    'cdl', 'commercial driver license', 'hazmat', 'hazmat certification', 'clean license',
    'dot certification', 'safety certification', 'forklift certification', 'driving license'
  ]
  
  const foundCerts = certKeywords.filter(cert => lowerQuery.includes(cert))
  if (foundCerts.length > 0) {
    requirements.certifications = foundCerts
  }

  // Extract education
  const educationKeywords = ['bachelor', 'master', 'diploma', 'degree', 'b.tech', 'mba', 'graduate']
  for (const edu of educationKeywords) {
    if (lowerQuery.includes(edu)) {
      requirements.education = edu
      break
    }
  }

  // Extract salary information
  const salaryPatterns = [
    /₹?(\d+(?:,\d+)*)/,  // ₹30,000 or 30000
    /rs\.?\s*(\d+(?:,\d+)*)/,  // Rs. 30000
    /salary.*?₹?(\d+(?:,\d+)*)/  // "salary up to ₹30,000"
  ]
  
  for (const pattern of salaryPatterns) {
    const match = lowerQuery.match(pattern)
    if (match) {
      requirements.specificRequirements = requirements.specificRequirements || []
      requirements.specificRequirements.push(`salary ${match[1].replace(/,/g, '')} INR`)
      break
    }
  }

  console.log("📋 Basic requirement extraction results:", requirements)
  return requirements
}

export async function intelligentCandidateSearch(
  requirements: SearchRequirement, 
  candidates: any[]
): Promise<any[]> {
  console.log("=== Intelligent Candidate Search ===")
  console.log("Requirements:", JSON.stringify(requirements, null, 2))
  console.log("Total candidates:", candidates.length)

  // First, try Supabase skill-based search if we have skills
  let supabaseResults: any[] = []
  if (requirements.skills && requirements.skills.length > 0) {
    try {
      console.log("Trying Supabase skill-based search with skills:", requirements.skills)
      supabaseResults = await SupabaseCandidateService.searchCandidatesBySkills(requirements.skills)
      console.log(`Supabase found ${supabaseResults.length} candidates with matching skills`)
    } catch (error) {
      console.log("Supabase skill search failed, continuing with local filtering:", error)
    }
  }

  // If no Supabase results, use all candidates
  const candidatesToFilter = supabaseResults.length > 0 ? supabaseResults : candidates
  console.log(`Filtering through ${candidatesToFilter.length} candidates`)

  // Intelligent filtering based on parsed requirements
  const filteredCandidates = candidatesToFilter.map(candidate => {
    let score = 0
    let matchingCriteria: string[] = []
    
    console.log(`\n📝 Analyzing candidate: ${candidate.name} (${candidate.currentRole})`)
    console.log(`📍 Location: ${candidate.location}`)
    console.log(`⏱️ Experience: ${candidate.totalExperience}`)
    console.log(`🛠️ Skills: ${(candidate.technicalSkills || []).join(', ')}`)

    // Role matching
    if (requirements.role) {
      const roleMatch = calculateRoleMatch(requirements.role, candidate)
      console.log(`🎯 Role match score: ${roleMatch} (${requirements.role} vs ${candidate.currentRole})`)
      
      // STRICT PREFERENCE: High weight for role match, penalty for mismatch
      if (roleMatch > 0.3) { // Slightly higher threshold
        score += roleMatch * 45 // High weight for role match
        matchingCriteria.push(`Role: ${candidate.currentRole} (${Math.round(roleMatch * 100)}%)`)
      } else {
        // If role doesn't match, apply penalty but allow recovery via deep responsibility match
        // This ensures "must be in profile" preference while allowing some semantic flexibility
        score -= 20 
      }
    }

    // Implied Responsibilities Matching (Deep Semantic Understanding)
    if (requirements.impliedResponsibilities && requirements.impliedResponsibilities.length > 0) {
      const respScore = calculateResponsibilityMatch(requirements.impliedResponsibilities, candidate)
      console.log(`📋 Responsibility match score: ${respScore}`)
      
      if (respScore > 0.1) {
        score += respScore * 30 // Significant weight for deep understanding
        matchingCriteria.push(`Responsibility Match: ${Math.round(respScore * 100)}%`)
      }
    }

    // Experience matching
    if (requirements.experience) {
      const expScore = calculateExperienceScore(requirements.experience, candidate.totalExperience)
      console.log(`⏱️ Experience score: ${expScore} (${JSON.stringify(requirements.experience)} vs ${candidate.totalExperience})`)
      score += expScore * 20 // Adjusted weight
      if (expScore > 0.2) {
        matchingCriteria.push(`Experience: ${candidate.totalExperience} (${Math.round(expScore * 100)}%)`)
      }
    }

    // Location matching
    if (requirements.location) {
      const locationScore = calculateLocationScore(requirements.location, candidate.location)
      console.log(`📍 Location score: ${locationScore} (${requirements.location} vs ${candidate.location})`)
      score += locationScore * 15
      if (locationScore > 0.2) {
        matchingCriteria.push(`Location: ${candidate.location} (${Math.round(locationScore * 100)}%)`)
      }
    }

    // Skills matching
    if (requirements.skills && requirements.skills.length > 0) {
      const skillsScore = calculateSkillsScore(requirements.skills, candidate)
      console.log(`🛠️ Skills score: ${skillsScore} (${requirements.skills.join(', ')} vs ${(candidate.technicalSkills || []).join(', ')})`)
      score += skillsScore * 15 // Adjusted weight
      if (skillsScore > 0.1) {
        matchingCriteria.push(`Skills match: ${Math.round(skillsScore * 100)}%`)
      }
    }

    // Education matching
    if (requirements.education) {
      const eduScore = calculateEducationScore(requirements.education, candidate)
      console.log(`🎓 Education score: ${eduScore} (${requirements.education} vs ${candidate.highestQualification})`)
      score += eduScore * 5 // Adjusted weight
      if (eduScore > 0.2) {
        matchingCriteria.push(`Education: ${candidate.highestQualification} (${Math.round(eduScore * 100)}%)`)
      }
    }

    console.log(`📊 Total score: ${score}/100 (${Math.round(score)}%)`)

    return {
      ...candidate,
      relevanceScore: Math.min(0.95, score / 100),
      matchPercentage: Math.round((score / 100) * 100),
      matchingCriteria,
      parsedRequirements: requirements
    }
  })

  // Sort by relevance score and filter out poor matches
  const relevantCandidates = filteredCandidates
    .filter(candidate => candidate.relevanceScore >= 0.15) // Minimum 15% relevance for semantic search
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  console.log(`Found ${relevantCandidates.length} relevant candidates`)
  return relevantCandidates
}

function calculateRoleMatch(requiredRole: string, candidate: any): number {
  const candidateRole = (candidate.currentRole || candidate.desiredRole || '').toLowerCase()
  const required = requiredRole.toLowerCase()
  
  if (!candidateRole) return 0

  // Normalize helper to handle singular/plural variations (e.g. "operations" vs "operation")
  const normalize = (str: string) => str.replace(/s\b/g, '').replace(/\s+/g, ' ').trim()
  
  const normCandidate = normalize(candidateRole)
  const normRequired = normalize(required)

  // Exact match (including normalized)
  if (candidateRole.includes(required) || required.includes(candidateRole) || 
      normCandidate.includes(normRequired) || normRequired.includes(normCandidate)) return 1

  // Comprehensive role synonyms mapping with semantic understanding
  const roleSynonyms: { [key: string]: string[] } = {
    'fleet manager': ['fleet management', 'transportation manager', 'logistics manager', 'operations manager', 'fleet operations manager', 'vehicle fleet manager'],
    'truck driver': ['driver', 'heavy vehicle driver', 'commercial driver', 'truck operator', 'heavy truck driver', 'delivery driver', 'commercial vehicle driver'],
    'logistics coordinator': ['logistics executive', 'supply chain coordinator', 'logistics specialist', 'operations coordinator', 'logistics officer'],
    'warehouse manager': ['warehouse executive', 'store manager', 'inventory manager', 'warehouse supervisor', 'store incharge', 'warehouse incharge', 'godown manager'],
    'supply chain manager': ['supply chain executive', 'procurement manager', 'operations manager', 'logistics manager', 'scm manager'],
    'transport manager': ['transportation manager', 'fleet manager', 'logistics manager', 'dispatch manager', 'transport operations manager'],
    'transport executive': ['transport manager', 'logistics executive', 'fleet executive', 'transport coordinator', 'operations executive', 'operation executive'],
    'operations manager': ['operations executive', 'operations head', 'operations supervisor', 'fleet manager', 'logistics manager', 'operations incharge', 'operation manager'],
    'warehouse executive': ['warehouse manager', 'store executive', 'inventory executive', 'warehouse supervisor', 'store keeper', 'godown executive'],
    'inventory manager': ['inventory executive', 'stock manager', 'warehouse manager', 'store manager', 'inventory controller'],
    'logistics manager': ['logistics executive', 'logistics coordinator', 'logistics head', 'logistics operations manager', 'supply chain manager'],
    'operations executive': ['operations manager', 'operation executive', 'operations officer', 'operations coordinator'],
    'operation executive': ['operations executive', 'operations manager', 'operations officer', 'operations coordinator']
  }

  // Check synonyms against both original and normalized requirement
  const synonyms = roleSynonyms[required] || roleSynonyms[normRequired] || []
  for (const synonym of synonyms) {
    if (candidateRole.includes(synonym) || normalize(synonym).includes(normCandidate)) return 0.8
  }

  // Check if candidate has relevant skills for the role
  const allSkills = [
    ...(candidate.technicalSkills || []),
    ...(candidate.softSkills || []),
    ...(candidate.tags || [])
  ].map(skill => skill.toLowerCase())

  const roleSkillMap: { [key: string]: string[] } = {
    'fleet manager': ['fleet', 'transportation', 'logistics', 'vehicle', 'route', 'driver management', 'fuel management'],
    'truck driver': ['driving', 'vehicle', 'transportation', 'license', 'delivery', 'logistics', 'commercial driving'],
    'logistics coordinator': ['logistics', 'supply chain', 'coordination', 'planning', 'inventory', 'transportation'],
    'warehouse manager': ['warehouse', 'inventory', 'store', 'logistics', 'supply chain', 'operations'],
    'supply chain manager': ['supply chain', 'procurement', 'logistics', 'inventory', 'operations', 'vendor management'],
    'transport manager': ['transportation', 'fleet', 'logistics', 'route', 'dispatch', 'vehicle management'],
    'transport executive': ['transportation', 'logistics', 'fleet', 'coordination', 'operations', 'vehicle']
  }

  const requiredSkills = roleSkillMap[required] || []
  const skillMatches = allSkills.filter(skill => 
    requiredSkills.some(reqSkill => skill.includes(reqSkill))
  )

  return skillMatches.length > 0 ? 0.6 : 0.1 // Lowered floor for non-matching roles
}

function calculateExperienceScore(requiredExp: any, candidateExp: string): number {
  if (!candidateExp) return 0.3
  
  // More robust experience parsing
  const expPatterns = [
    /(\d+(?:\.\d+)?)\s*years?/,           // "5 years", "3.5 years"
    /(\d+(?:\.\d+)?)\s*yr/,               // "5 yr", "3.5 yr"
    /(\d+)\s*years?\s*(\d+)\s*months?/,  // "2 years 6 months"
    /(\d+)\s*months?/                     // "18 months"
  ]
  
  let candidateYears = 0
  let foundMatch = false
  
  for (const pattern of expPatterns) {
    const match = candidateExp.match(pattern)
    if (match) {
      if (match.length === 3 && candidateExp.includes('months')) {
        // Handle "2 years 6 months" format
        candidateYears = parseFloat(match[1]) + (parseFloat(match[2]) / 12)
      } else if (candidateExp.includes('months') && !candidateExp.includes('years')) {
        // Handle "18 months" format
        candidateYears = parseFloat(match[1]) / 12
      } else {
        // Handle "5 years" or "5 yr" format
        candidateYears = parseFloat(match[1])
      }
      foundMatch = true
      break
    }
  }
  
  if (!foundMatch) return 0.3
  
  if (requiredExp.exact) {
    return Math.abs(candidateYears - requiredExp.exact) <= 1 ? 1 : 0.3
  }
  
  if (requiredExp.min && candidateYears >= requiredExp.min) {
    return requiredExp.max && candidateYears <= requiredExp.max ? 1 : 0.8
  }
  
  // If no specific requirement, give some score based on having experience
  return candidateYears > 0 ? 0.5 : 0.2
}

function calculateLocationScore(requiredLocation: string, candidateLocation: string): number {
  if (!candidateLocation) return 0.3
  
  const required = requiredLocation.toLowerCase()
  const candidate = candidateLocation.toLowerCase()
  
  if (candidate.includes(required) || required.includes(candidate)) return 1
  
  // Check for major cities and their variations
  const locationVariations: { [key: string]: string[] } = {
    'delhi': ['delhi', 'ncr', 'new delhi', 'gurgaon', 'noida', 'faridabad'],
    'mumbai': ['mumbai', 'bombay', 'navi mumbai', 'thane'],
    'bangalore': ['bangalore', 'bengaluru'],
    'chennai': ['chennai', 'madras']
  }
  
  for (const [city, variations] of Object.entries(locationVariations)) {
    if (required.includes(city)) {
      for (const variation of variations) {
        if (candidate.includes(variation)) return 0.9
      }
    }
  }
  
  return 0.1
}

function calculateResponsibilityMatch(responsibilities: string[], candidate: any): number {
  // Aggregate all relevant text from the candidate profile
  const textToSearch = [
    candidate.resumeText || '',
    candidate.summary || '',
    candidate.currentRole || '',
    candidate.keyAchievements ? candidate.keyAchievements.join(' ') : '',
    ...(candidate.workExperience || []).map((w: any) => `${w.role} ${w.description}`),
    ...(candidate.projects || []).map((p: any) => p.description)
  ].join(' ').toLowerCase();

  if (!textToSearch.trim()) return 0;

  let matchCount = 0;
  let totalWeight = 0;

  for (const resp of responsibilities) {
    const phrase = resp.toLowerCase();
    
    // Exact phrase match gets high score
    if (textToSearch.includes(phrase)) {
      matchCount += 1.5;
    } else {
      // Keyword matching: split responsibility into keywords
      const keywords = phrase.split(/\s+/).filter(w => w.length > 3 && !['with', 'that', 'this', 'from', 'into', 'manage', 'handle'].includes(w));
      
      if (keywords.length > 0) {
        const matchedKeywords = keywords.filter(k => textToSearch.includes(k));
        const matchRatio = matchedKeywords.length / keywords.length;
        
        // If more than 60% of significant keywords match, count it
        if (matchRatio >= 0.6) {
          matchCount += matchRatio;
        }
      }
    }
    totalWeight += 1;
  }

  // Normalize score between 0 and 1
  // We don't expect 100% match of all AI-generated responsibilities, so we scale it
  const finalScore = Math.min(1, matchCount / Math.max(1, totalWeight * 0.7));
  
  return finalScore;
}

function calculateSkillsScore(requiredSkills: string[], candidate: any): number {
  const allCandidateSkills = [
    ...(candidate.technicalSkills || []),
    ...(candidate.softSkills || []),
    ...(candidate.tags || [])
  ].map(skill => skill.toLowerCase())
  
  if (allCandidateSkills.length === 0) return 0.2
  
  let matches = 0
  for (const requiredSkill of requiredSkills) {
    const required = requiredSkill.toLowerCase()
    
    // Semantic skill matching with synonyms and related concepts
    const skillSynonyms: { [key: string]: string[] } = {
      'sap': ['sap', 'erp', 'enterprise resource planning', 'sap software'],
      'inventory management': ['inventory', 'stock management', 'inventory control', 'stock control', 'inventory tracking'],
      'lifo': ['lifo', 'inventory method', 'inventory management'],
      'fefo': ['fefo', 'fifo', 'inventory method', 'inventory management'],
      'warehouse management': ['warehouse', 'godown', 'store management', 'warehouse operations'],
      'organizational skills': ['organization', 'organizational', 'planning', 'coordination'],
      'leadership': ['leadership', 'leader', 'team management', 'people management', 'supervisory'],
      'fleet management': ['fleet', 'vehicle management', 'transportation management', 'fleet operations'],
      'gps tracking': ['gps', 'vehicle tracking', 'fleet tracking', 'gps monitoring'],
      'route optimization': ['route planning', 'route optimization', 'logistics planning', 'delivery planning']
    }
    
    // Check for direct match or synonym match
    const hasMatch = allCandidateSkills.some(skill => {
      if (skill.includes(required) || required.includes(skill)) return true
      
      // Check synonyms
      const synonyms = skillSynonyms[required] || []
      return synonyms.some(synonym => skill.includes(synonym) || synonym.includes(skill))
    })
    
    if (hasMatch) matches++
  }
  
  return matches / requiredSkills.length
}

function calculateEducationScore(requiredEducation: string, candidate: any): number {
  const candidateEducation = (candidate.highestQualification || candidate.degree || '').toLowerCase()
  const required = requiredEducation.toLowerCase()
  
  if (!candidateEducation) return 0.3
  
  if (candidateEducation.includes(required) || required.includes(candidateEducation)) return 1
  
  // Education level matching
  const educationLevels = ['high school', 'diploma', 'bachelor', 'master', 'phd']
  const candidateLevel = educationLevels.findIndex(level => candidateEducation.includes(level))
  const requiredLevel = educationLevels.findIndex(level => required.includes(level))
  
  if (candidateLevel >= 0 && requiredLevel >= 0) {
    return candidateLevel >= requiredLevel ? 0.8 : 0.4
  }
  
  return 0.2
}

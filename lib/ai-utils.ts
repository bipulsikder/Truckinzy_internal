import { GoogleGenerativeAI } from "@google/generative-ai"
import { getAllCandidates } from "./google-sheets"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log("=== Generating Embedding ===")
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured")
  }

  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(text)
    const embedding = result.embedding

    console.log("✅ Embedding generated successfully")
    return embedding.values || []
  } catch (error) {
    console.error("❌ Embedding generation failed:", error)
    throw error
  }
}

// Enhanced function to calculate similarity between embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function generateJobDescriptionWithEmbeddings(
  customInputs: any,
  referenceCandidates: any[] = [],
  useEmbeddings = true,
): Promise<any> {
  console.log("=== Enhanced JD Generation with Embeddings ===")
  console.log("Job Title:", customInputs.jobTitle)
  console.log("Use Embeddings:", useEmbeddings)

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured")
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Get all candidates from database
    const allCandidates = await getAllCandidates()
    console.log(`📊 Total candidates in database: ${allCandidates.length}`)

    let similarCandidates: any[] = []
    let databaseInsights: string[] = []
    let matchedCandidates = 0

    if (useEmbeddings && allCandidates.length > 0) {
      try {
        // Generate embedding for the job title
        const jobTitleEmbedding = await generateEmbedding(customInputs.jobTitle)

        // Find similar candidates using embeddings and fuzzy matching
        const candidatesWithSimilarity = await Promise.all(
          allCandidates.map(async (candidate) => {
            let similarity = 0

            // Text-based similarity for role matching
            const roleText = `${candidate.currentRole} ${candidate.desiredRole || ""}`
            const jobTitle = customInputs.jobTitle.toLowerCase()

            // Fuzzy matching for role names
            if (
              roleText.toLowerCase().includes(jobTitle) ||
              jobTitle.includes(candidate.currentRole?.toLowerCase() || "")
            ) {
              similarity += 0.8
            }

            // Check for similar keywords
            const jobKeywords = jobTitle.split(/\s+/)
            const roleKeywords = roleText.toLowerCase().split(/\s+/)
            const commonKeywords = jobKeywords.filter((keyword) =>
              roleKeywords.some((roleKeyword) => roleKeyword.includes(keyword) || keyword.includes(roleKeyword)),
            )
            similarity += (commonKeywords.length / jobKeywords.length) * 0.5

            // Try embedding similarity if possible
            try {
              const candidateEmbedding = await generateEmbedding(roleText)
              const embeddingSimilarity = cosineSimilarity(jobTitleEmbedding, candidateEmbedding)
              similarity = Math.max(similarity, embeddingSimilarity)
            } catch (embeddingError) {
              console.log("Embedding similarity failed, using text similarity")
            }

            return {
              ...candidate,
              similarity,
            }
          }),
        )

        // Filter and sort by similarity
        similarCandidates = candidatesWithSimilarity
          .filter((c) => c.similarity > 0.3) // Threshold for relevance
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 15) // Top 15 most similar

        matchedCandidates = similarCandidates.length
        console.log(`🎯 Found ${matchedCandidates} similar candidates`)

        // Generate database insights
        if (similarCandidates.length > 0) {
          const commonSkills = new Map<string, number>()
          const commonCompanies = new Map<string, number>()
          const experienceLevels: string[] = []

          similarCandidates.forEach((candidate) => {
            // Count skills
            candidate.technicalSkills?.forEach((skill: string) => {
              commonSkills.set(skill, (commonSkills.get(skill) || 0) + 1)
            })

            // Count companies
            if (candidate.currentCompany) {
              commonCompanies.set(candidate.currentCompany, (commonCompanies.get(candidate.currentCompany) || 0) + 1)
            }

            // Collect experience
            if (candidate.totalExperience) {
              experienceLevels.push(candidate.totalExperience)
            }
          })

          // Top skills
          const topSkills = Array.from(commonSkills.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([skill]) => skill)

          // Top companies
          const topCompanies = Array.from(commonCompanies.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([company]) => company)

          databaseInsights = [
            `Most common skills: ${topSkills.join(", ")}`,
            `Common previous companies: ${topCompanies.join(", ")}`,
            `Experience range: ${Math.min(...experienceLevels.map((exp) => Number.parseInt(exp) || 0))} - ${Math.max(...experienceLevels.map((exp) => Number.parseInt(exp) || 0))} years`,
            `${similarCandidates.filter((c) => c.certifications?.length > 0).length} candidates have relevant certifications`,
          ]
        }
      } catch (embeddingError) {
        console.log("Embedding search failed, using basic text matching")
        // Fallback to basic text matching
        similarCandidates = allCandidates
          .filter((candidate) => {
            const roleText = `${candidate.currentRole} ${candidate.desiredRole || ""}`.toLowerCase()
            const jobTitle = customInputs.jobTitle.toLowerCase()
            return roleText.includes(jobTitle) || jobTitle.includes(candidate.currentRole?.toLowerCase() || "")
          })
          .slice(0, 10)

        matchedCandidates = similarCandidates.length
        databaseInsights = [`Found ${matchedCandidates} candidates with similar roles using text matching`]
      }
    }

    // Combine reference candidates with similar candidates from database
    const allReferenceCandidates = [
      ...referenceCandidates,
      ...similarCandidates.slice(0, 10), // Add top 10 from database
    ]

    // Create comprehensive prompt
    const prompt = `You are an expert HR professional creating a comprehensive job description. Use the provided information to create a realistic, industry-specific job description.

JOB REQUIREMENTS:
- Job Title: ${customInputs.jobTitle}
- Company: ${customInputs.company || "Company Name"}
- Location: ${customInputs.location || "Location"}
- Experience Required: ${customInputs.experience || "As per requirement"}
- Salary Range: ${customInputs.salaryRange || "Competitive"}
- Additional Requirements: ${customInputs.additionalRequirements || "None"}

DATABASE INSIGHTS (${matchedCandidates} similar profiles found):
${databaseInsights.map((insight) => `• ${insight}`).join("\n")}

REFERENCE CANDIDATES:
${allReferenceCandidates
  .slice(0, 10)
  .map(
    (candidate) => `
- Name: ${candidate.name}
- Role: ${candidate.currentRole}
- Experience: ${candidate.totalExperience}
- Skills: ${(candidate.technicalSkills || []).slice(0, 10).join(", ")}
- Company: ${candidate.currentCompany || "Not specified"}
- Achievements: ${(candidate.keyAchievements || []).slice(0, 3).join("; ")}
- Certifications: ${(candidate.certifications || []).slice(0, 3).join(", ")}
`,
  )
  .join("\n")}

Create a comprehensive job description that includes:

1. **Job Description**: 2-3 paragraph overview that accurately describes the role based on database insights
2. **Key Responsibilities**: 6-8 specific, actionable responsibilities based on what similar candidates actually do
3. **Requirements**: 6-8 requirements including education, experience, and certifications found in similar profiles
4. **Required Skills**: Technical and soft skills commonly found in similar roles in your database
5. **Benefits**: Competitive benefits package appropriate for this role level and industry

IMPORTANT GUIDELINES:
- Use insights from the database to make the JD realistic and accurate
- Include responsibilities that similar candidates in your database actually perform
- Make requirements achievable based on your candidate pool
- Use industry-specific terminology found in similar profiles
- Consider the experience level and adjust complexity accordingly
- Include both technical skills and soft skills from database analysis

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Job title",
  "company": "Company name", 
  "location": "Location",
  "type": "Full-time",
  "experience": "Experience requirement",
  "salary": "Salary range",
  "description": "Detailed job description (2-3 paragraphs)",
  "responsibilities": ["Array of 6-8 key responsibilities"],
  "requirements": ["Array of 6-8 requirements"],
  "skills": ["Array of 10-15 required skills"],
  "benefits": ["Array of 6-8 benefits"]
}`

    console.log("Sending enhanced JD generation request to Gemini...")
    const result = await model.generateContent(prompt)
    const response = await result.response
    let responseText = response.text()

    // Clean the response
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    console.log("✅ Enhanced JD generation response received")

    try {
      const parsedJD = JSON.parse(responseText)

      // Ensure all required fields exist with defaults
      const jobDescription = {
        title: parsedJD.title || customInputs.jobTitle,
        company: parsedJD.company || customInputs.company || "Company Name",
        location: parsedJD.location || customInputs.location || "Location",
        type: parsedJD.type || "Full-time",
        experience: parsedJD.experience || customInputs.experience || "As per requirement",
        salary: parsedJD.salary || customInputs.salaryRange || "",
        description: parsedJD.description || "Job description will be provided.",
        responsibilities: Array.isArray(parsedJD.responsibilities) ? parsedJD.responsibilities : [],
        requirements: Array.isArray(parsedJD.requirements) ? parsedJD.requirements : [],
        skills: Array.isArray(parsedJD.skills) ? parsedJD.skills : [],
        benefits: Array.isArray(parsedJD.benefits) ? parsedJD.benefits : [],
        matchedCandidates,
        databaseInsights,
      }

      console.log("✅ Enhanced JD generation successful")
      return { jobDescription }
    } catch (parseError) {
      console.error("❌ Failed to parse JD JSON response:", parseError)
      throw new Error("Invalid JSON response from Gemini")
    }
  } catch (error) {
    console.error("❌ Enhanced JD generation failed:", error)
    throw error
  }
}

// Legacy function for backward compatibility
export async function generateJobDescription(candidateProfiles: any[], customInputs?: any): Promise<any> {
  return generateJobDescriptionWithEmbeddings(customInputs || {}, candidateProfiles, false)
}

export async function searchCandidates(query: string, candidates: any[]): Promise<any[]> {
  console.log("=== AI-Powered Search ===")
  console.log("Search query:", query)
  console.log("Total candidates:", candidates.length)

  if (!process.env.GEMINI_API_KEY) {
    console.log("⚠️ GEMINI_API_KEY not configured, using basic search")
    return basicSearch(query, candidates)
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Create candidate summaries for AI analysis
    const candidateSummaries = candidates.map((candidate) => ({
      id: candidate.id || candidate._id,
      name: candidate.name,
      role: candidate.currentRole,
      skills: candidate.technicalSkills?.join(", ") || "",
      experience: candidate.totalExperience,
      location: candidate.location,
      summary: candidate.summary || candidate.resumeText?.substring(0, 500) || "",
    }))

    const prompt = `Analyze the search query and rank candidates by relevance. Return ONLY a valid JSON array of candidate IDs ordered by relevance (most relevant first).

Search Query: "${query}"

Candidates:
${JSON.stringify(candidateSummaries, null, 2)}

Consider:
1. Job role match
2. Skills alignment  
3. Experience level
4. Location preference
5. Overall profile fit

Return format: ["candidate_id_1", "candidate_id_2", ...]`

    console.log("Sending search request to Gemini...")
    const result = await model.generateContent(prompt)
    const response = await result.response
    let responseText = response.text()

    // Clean the response
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    try {
      const rankedIds = JSON.parse(responseText)
      if (!Array.isArray(rankedIds)) {
        throw new Error("Invalid response format")
      }

      // Reorder candidates based on AI ranking and add relevance scores
      const rankedCandidates = rankedIds
        .map((id: string, index: number) => {
          const candidate = candidates.find((c) => (c.id || c._id) === id)
          if (candidate) {
            return {
              ...candidate,
              relevanceScore: Math.max(0.1, 1 - index / rankedIds.length),
              matchingKeywords: extractMatchingKeywords(query, candidate),
            }
          }
          return null
        })
        .filter(Boolean)

      console.log("✅ AI search completed, returning", rankedCandidates.length, "results")
      return rankedCandidates
    } catch (parseError) {
      console.error("❌ Failed to parse AI search response, falling back to basic search")
      return basicSearch(query, candidates)
    }
  } catch (error) {
    console.error("❌ AI search failed, falling back to basic search:", error)
    return basicSearch(query, candidates)
  }
}

function basicSearch(query: string, candidates: any[]): any[] {
  const queryLower = query.toLowerCase()
  const searchTerms = queryLower.split(/\s+/).filter((term) => term.length > 2)

  const results = candidates.map((candidate) => {
    let relevanceScore = 0
    const matchedFields: string[] = []

    // Define search fields with weights
    const searchFields = [
      { field: "currentRole", weight: 3, value: candidate.currentRole || "" },
      { field: "technicalSkills", weight: 2, value: (candidate.technicalSkills || []).join(" ") },
      { field: "location", weight: 2, value: candidate.location || "" },
      { field: "currentCompany", weight: 1.5, value: candidate.currentCompany || "" },
      { field: "resumeText", weight: 1, value: candidate.resumeText || "" },
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

    return {
      ...candidate,
      relevanceScore: relevanceScore / 10, // Normalize to 0-1 range
      matchingKeywords: extractMatchingKeywords(query, candidate),
    }
  })

  // Filter and sort by relevance
  return results.filter((candidate) => candidate.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore)
}

function extractMatchingKeywords(query: string, candidate: any): string[] {
  const queryTerms = query.toLowerCase().split(/\s+/)
  const candidateText = [
    candidate.currentRole || "",
    candidate.location || "",
    ...(candidate.technicalSkills || []),
    candidate.currentCompany || "",
  ]
    .join(" ")
    .toLowerCase()

  return queryTerms.filter((term) => term.length > 2 && candidateText.includes(term))
}

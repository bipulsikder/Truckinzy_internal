import { GoogleGenerativeAI } from "@google/generative-ai"
import { SupabaseCandidateService } from "./supabase-candidates"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest"

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
    const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL })

    // Get all candidates from Supabase database
    const allCandidates = await SupabaseCandidateService.getAllCandidates()
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
            const commonKeywords = jobKeywords.filter((keyword: string) =>
              roleKeywords.some((roleKeyword: string) => roleKeyword.includes(keyword) || keyword.includes(roleKeyword)),
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
      } catch (error) {
        console.log("Embedding-based similarity failed, continuing without embeddings:", error)
      }
    }

    // Create prompt with insights from database
    const databaseInsightsText = similarCandidates
      .map((candidate, index) => {
        const topSkills = (candidate.technicalSkills || []).slice(0, 6).join(", ")
        return `${index + 1}. ${candidate.name} – Role: ${candidate.currentRole || "N/A"} – Skills: ${topSkills}`
      })
      .join("\n")

    const prompt = `You are an expert HR assistant.
Generate a detailed job description tailored for the role: "${customInputs.jobTitle}".
Use relevant insights from our database of candidates:
${databaseInsightsText || "No exact matches found; infer based on role."}

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
    let responseText: string | null = null
    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      responseText = response.text()
      responseText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
      console.log("✅ Enhanced JD generation response received")
    } catch (genError) {
      const msg = String(genError instanceof Error ? genError.message : genError)
      console.log("⚠️ Gemini generateContent failed, using rule-based fallback:", msg)
      return { jobDescription: buildFallbackJD(customInputs, matchedCandidates, databaseInsights) }
    }

    try {
      const parsedJD = JSON.parse(responseText || "{}")
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
      console.log("⚠️ Invalid JSON from Gemini, falling back to rule-based JD")
      return { jobDescription: buildFallbackJD(customInputs, matchedCandidates, databaseInsights) }
    }
  } catch (error) {
    console.error("❌ Enhanced JD generation failed:", error)
    return { jobDescription: buildFallbackJD(customInputs, 0, []) }
  }
}

function buildFallbackJD(customInputs: any, matchedCandidates: number, databaseInsights: string[]) {
  const baseSkills = [
    'gps tracking','fleet management','route optimization','driver management','communication','team management','problem solving','data analysis'
  ]
  const title = customInputs.jobTitle || 'Role'
  const company = customInputs.company || 'Company Name'
  const location = customInputs.location || 'Location'
  const experience = customInputs.experience || 'As per requirement'
  const salary = customInputs.salaryRange || ''
  const description = `We are hiring a ${title} at ${company} in ${location}. The role involves coordinating drivers, optimizing routes, monitoring GPS and compliance, and collaborating with operations. Candidates should have ${experience} and strong communication skills.`
  return {
    title,
    company,
    location,
    type: 'Full-time',
    experience,
    salary,
    description,
    responsibilities: [
      'Coordinate daily driver assignments and schedules',
      'Monitor GPS and route adherence',
      'Optimize routes for efficiency and cost',
      'Ensure compliance with safety and DOT regulations',
      'Communicate with drivers and resolve on-road issues',
      'Maintain logs and reports for fleet operations',
      'Collaborate with warehouse and dispatch teams',
      'Escalate critical incidents and follow SOPs'
    ],
    requirements: [
      'Graduate or equivalent experience in logistics',
      '3+ years in fleet/transport operations',
      'Hands-on with GPS/fleet tools',
      'Knowledge of safety and compliance',
      'Strong communication and problem solving',
      'Ability to work shifts and on-call as needed'
    ],
    skills: baseSkills,
    benefits: [
      'Competitive salary',
      'Health insurance',
      'Paid time off',
      'Performance incentives',
      'Growth opportunities'
    ],
    matchedCandidates,
    databaseInsights,
  }
}

// Legacy function for backward compatibility
export async function generateJobDescription(candidateProfiles: any[], customInputs?: any): Promise<any> {
  return generateJobDescriptionWithEmbeddings(customInputs || {}, candidateProfiles, false)
}

export function extractKeywordsFromSentence(sentence: string): string[] {
  if (!sentence || typeof sentence !== 'string') return [];
  
  // Comprehensive stop words list including irrelevant words
  const stopWords = new Set([
    // Basic articles, prepositions, conjunctions
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 
    'by', 'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between', 
    'out', 'of', 'from', 'up', 'down', 'under', 'above', 'below', 'across', 'around',
    
    // Verbs and auxiliary verbs
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 
    'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might', 
    'must', 'can', 'could', 'get', 'got', 'getting', 'go', 'going', 'went', 'gone',
    
    // Pronouns
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 
    'my', 'your', 'his', 'hers', 'its', 'our', 'their', 'mine', 'yours', 'theirs',
    
    // Question words and demonstratives
    'who', 'whom', 'which', 'what', 'where', 'when', 'why', 'how', 'this', 'that', 
    'these', 'those', 'here', 'there', 'now', 'then',
    
    // Common irrelevant words mentioned by user
    'okay', 'ok', 'all', 'not', 'no', 'yes', 'well', 'so', 'just', 'only', 'also', 
    'too', 'very', 'much', 'many', 'more', 'most', 'some', 'any', 'each', 'every',
    
    // Search-related filler words
    'search', 'find', 'look', 'filter', 'sort', 'show', 'hide', 'view', 'display',
  ]);

  // Split into words and basic normalization
  const words = sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !stopWords.has(w));

  // Extract multi-word phrases commonly found in logistics
  const phrases = [] as string[];
  const phrasePatterns = [
    /fleet management/gi,
    /route optimization/gi,
    /supply chain management/gi,
    /inventory management/gi,
    /warehouse management/gi,
    /transportation management/gi,
    /driver management/gi,
    /fuel management/gi,
    /maintenance scheduling/gi,
    /international fuel tax agreement/gi,
  ];

  const blacklist = new Set([
    'manager', 'management', 'team', 'lead', 'leader', 'good', 'bad', 'best', 'ok', 'okay',
    'work', 'worked', 'working', 'experience', 'experienced', 'years', 'year', 'month', 'months',
  ]);

  for (const pattern of phrasePatterns) {
    const match = sentence.toLowerCase().match(pattern);
    if (match) {
      phrases.push(match[0].toLowerCase());
    }
  }

  // Extract domain-specific terms
  const foundTerms = [] as string[];
  const domainTerms = [
    'gps', 'gps tracking', 'tracking', 'fleet', 'fleet management', 'route', 'route optimization',
    'supply chain', 'supply chain management', 'inventory', 'inventory management', 'warehouse', 'warehouse management',
    'transportation', 'transportation management', 'driver', 'driver management', 'fuel', 'fuel management',
    'maintenance', 'maintenance scheduling', 'compliance', 'safety', 'dot', 'ifta', 'international fuel tax agreement',
  ];

  for (const term of domainTerms) {
    if (sentence.toLowerCase().includes(term)) {
      foundTerms.push(term);
    }
  }

  const locationMatch = sentence.toLowerCase().match(/in ([a-zA-Z\s]+)/);
  if (locationMatch) {
    phrases.push(locationMatch[1].toLowerCase());
  }
  
  // Combine all keywords and remove duplicates
  let allKeywords = [...new Set([...words, ...phrases, ...foundTerms])];
  
  // Final filter: remove blacklisted and overly generic terms
  allKeywords = allKeywords.filter(k => k && !blacklist.has(k));
  
  return allKeywords;
}

export async function searchCandidates(query: string, candidates: any[]): Promise<any[]> {
  console.log("=== AI-Powered Search ===")
  console.log("Search query:", query)
  console.log("Total candidates:", candidates.length)

  if (!process.env.GEMINI_API_KEY) {
    console.log("⚠️ GEMINI_API_KEY not configured, using weighted local search")
    return weightedLocalSearch(query, candidates)
  }

  try {
    const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL })

    // Create candidate summaries for AI analysis (cap size and field lengths to avoid 5xx/overload)
    const safeStr = (v: any, max = 120): string => {
      const s = (v || "").toString()
      return s.length > max ? s.slice(0, max) : s
    }
    const candidateSummaries = candidates.slice(0, 200).map((candidate) => ({
      id: candidate.id || candidate._id,
      name: safeStr(candidate.name, 80),
      role: safeStr(candidate.currentRole, 100),
      skills: safeStr((candidate.technicalSkills || []).join(", "), 200),
      experience: safeStr(candidate.totalExperience, 30),
      location: safeStr(candidate.location, 60),
      summary: safeStr(candidate.summary || candidate.resumeText || "", 400),
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
    // Minimal retry for transient 5xx/overload with hard timeout
    const withTimeout = <T>(promise: Promise<T>, ms: number, label = "operation"): Promise<T> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
        promise
          .then((val) => {
            clearTimeout(timer)
            resolve(val)
          })
          .catch((err) => {
            clearTimeout(timer)
            reject(err)
          })
      })
    }

    const attempt = async () => withTimeout(model.generateContent(prompt), 8000, "Gemini search")
    let result
    try {
      result = await attempt()
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (/(503|overloaded|timeout|temporarily unavailable)/i.test(msg)) {
        console.log("Gemini transient error, retrying once in 800ms...")
        await new Promise(r => setTimeout(r, 800))
        result = await attempt()
      } else {
        throw e
      }
    }
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
            const matchingKeywords = extractMatchingKeywords(query, candidate)
            const relevanceScore = Math.max(0.1, 1 - index / rankedIds.length)
            // Calculate a realistic match percentage based on position and keyword matches
            const matchPercentage = Math.min(
              100, 
              Math.round(relevanceScore * 80 + Math.min(matchingKeywords.length * 3, 20))
            )

            return {
              ...candidate,
              relevanceScore,
              matchPercentage,
              matchingKeywords,
            }
          }
          return null
        })
        .filter(Boolean)

      return rankedCandidates
    } catch (parseError) {
      console.log("AI ranking parse failed, using weighted local search")
      return weightedLocalSearch(query, candidates)
    }
  } catch (error) {
    console.error("Gemini search failed, falling back to weighted local search:", error)
    return weightedLocalSearch(query, candidates)
  }
}

function weightedLocalSearch(query: string, candidates: any[]): any[] {
  const q = (query || '').toLowerCase()
  const terms = q.split(/\s+/).filter(Boolean)

  const scoreCandidate = (c: any): number => {
    let s = 0
    const fields = [
      c.currentRole, c.desiredRole, (c.technicalSkills || []).join(' '), c.location, c.summary || '', c.resumeText || ''
    ].map(v => (v || '').toLowerCase())
    for (const t of terms) {
      for (const f of fields) {
        if (f.includes(t)) s += 1
      }
    }
    s += Math.min(terms.length, 8) * 0.5
    return s
  }

  const sorted = [...candidates]
    .map(c => ({ c, s: scoreCandidate(c) }))
    .sort((a, b) => b.s - a.s)
    .map(({ c }, i, arr) => {
      const matchingKeywords = extractMatchingKeywords(query, c)
      const relevanceScore = Math.max(0.1, 1 - i / arr.length)
      const matchPercentage = Math.min(
        100, 
        Math.round(relevanceScore * 80 + Math.min(matchingKeywords.length * 3, 20))
      )
      return { ...c, relevanceScore, matchPercentage, matchingKeywords }
    })

  return sorted
}

function extractMatchingKeywords(query: string, candidate: any): string[] {
  const q = (query || '').toLowerCase()
  const terms = q.split(/\s+/).filter(Boolean)
  const profileText = [
    candidate.currentRole, candidate.desiredRole, (candidate.technicalSkills || []).join(' '), candidate.location,
    candidate.summary || '', candidate.resumeText || ''
  ].join(' ').toLowerCase()

  const matches = new Set<string>()
  for (const t of terms) {
    if (profileText.includes(t)) matches.add(t)
  }
  return Array.from(matches)
}

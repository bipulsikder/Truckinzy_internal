import { type NextRequest, NextResponse } from "next/server"
import { searchCandidates } from "@/lib/ai-utils"
import { getAllCandidates } from "@/lib/google-sheets"

// Simple in-memory cache to reduce repeated full-sheet reads during rapid searches
let candidatesCache: any[] | null = null
let candidatesCacheAt = 0
const CANDIDATES_CACHE_MS = 60_000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, jobDescription, searchType, filters } = body

    console.log("=== Enhanced Search API ===")
    console.log("Search Type:", searchType)
    console.log("Query:", query)
    console.log("Job Description:", jobDescription ? "Provided" : "Not provided")
    console.log("Filters:", filters)

    // Get all candidates from Google Sheets (with short cache)
    const now = Date.now()
    if (!candidatesCache || now - candidatesCacheAt > CANDIDATES_CACHE_MS) {
      const fresh = await getAllCandidates()
      candidatesCache = fresh
      candidatesCacheAt = now
    }
    const allCandidates = candidatesCache
    console.log("Total candidates:", allCandidates.length)

    // Transform data to ensure consistency
    const transformedCandidates = allCandidates.map((candidate) => ({
      ...candidate,
      _id: candidate.id,
      technicalSkills: Array.isArray(candidate.technicalSkills) ? candidate.technicalSkills : [],
      softSkills: Array.isArray(candidate.softSkills) ? candidate.softSkills : [],
      tags: Array.isArray(candidate.tags) ? candidate.tags : [],
      certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
      languagesKnown: Array.isArray(candidate.languagesKnown) ? candidate.languagesKnown : [],
    }))

    let results = []

    switch (searchType) {
      case "smart":
        // Smart AI search
        if (!query || query.trim().length === 0) {
          return NextResponse.json({ error: "Search query is required" }, { status: 400 })
        }
        results = await searchCandidates(query, transformedCandidates)
        break

      case "jd":
        // JD-based search - SEPARATE from manual search
        if (!jobDescription || jobDescription.trim().length === 0) {
          return NextResponse.json({ error: "Job description is required" }, { status: 400 })
        }
        results = await jdBasedSearch(jobDescription, transformedCandidates)
        break

      case "manual":
        // Manual search with minimal filters
        if (!filters || !filters.keywords || filters.keywords.length === 0) {
          return NextResponse.json({ error: "Keywords are required for manual search" }, { status: 400 })
        }
        results = await minimalManualSearch(filters, transformedCandidates)
        break

      default:
        return NextResponse.json({ error: "Invalid search type" }, { status: 400 })
    }

    console.log("Search results:", results.length)
    return NextResponse.json(results)
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

async function jdBasedSearch(jobDescription: string, candidates: any[]): Promise<any[]> {
  console.log("=== JD-Based Search (Separate from Manual) ===")

  try {
    // Extract requirements from JD using AI
    const extractedQuery = await extractRequirementsFromJD(jobDescription)
    console.log("Extracted requirements:", extractedQuery)

    // Use the extracted requirements to search candidates
    return await searchCandidates(extractedQuery, candidates)
  } catch (error) {
    console.error("JD analysis failed, falling back to keyword search:", error)
    // Fallback: Use JD text directly for search
    return await searchCandidates(jobDescription, candidates)
  }
}

async function extractRequirementsFromJD(jobDescription: string): Promise<string> {
  const jdLower = jobDescription.toLowerCase()
  const requirements: string[] = []

  // Extract role-related keywords
  const roleKeywords = [
    "fleet manager",
    "logistics coordinator",
    "transport manager",
    "supply chain",
    "warehouse manager",
    "delivery executive",
    "truck driver",
    "operations manager",
    "route planner",
    "dispatcher",
    "cargo manager",
    "inventory manager",
  ]

  roleKeywords.forEach((keyword) => {
    if (jdLower.includes(keyword)) {
      requirements.push(keyword)
    }
  })

  // Extract experience requirements
  const expMatch = jdLower.match(/(\d+)[\s]*(?:to|-)[\s]*(\d+)[\s]*years?|(\d+)\+?[\s]*years?/)
  if (expMatch) {
    requirements.push(`${expMatch[0]} experience`)
  }

  // Extract location
  const locationMatch = jdLower.match(
    /(mumbai|delhi|bangalore|chennai|kolkata|hyderabad|pune|ahmedabad|gurgaon|noida)/g,
  )
  if (locationMatch) {
    requirements.push(...locationMatch)
  }

  // Extract skills
  const skillKeywords = [
    "gps tracking",
    "fleet management",
    "route optimization",
    "fastag",
    "wms",
    "tms",
    "supply chain management",
    "inventory management",
    "logistics planning",
    "vehicle tracking",
    "warehouse management",
    "transportation management",
    "cargo handling",
    "load planning",
  ]

  skillKeywords.forEach((skill) => {
    if (jdLower.includes(skill)) {
      requirements.push(skill)
    }
  })

  return requirements.join(" ")
}

async function minimalManualSearch(filters: any, candidates: any[]): Promise<any[]> {
  console.log("=== Minimal Manual Search ===")
  console.log("Filters:", filters)

  let filteredCandidates = candidates

  // Filter by keywords (required)
  if (filters.keywords && filters.keywords.length > 0) {
    filteredCandidates = filteredCandidates.filter((candidate) => {
      const searchableText = [
        candidate.name || "",
        candidate.currentRole || "",
        candidate.desiredRole || "",
        candidate.currentCompany || "",
        ...(candidate.technicalSkills || []),
        ...(candidate.softSkills || []),
        candidate.resumeText || "",
        candidate.summary || "",
      ]
        .join(" \n ")
        .toLowerCase()

      return filters.keywords.some((keyword: string) => searchableText.includes(keyword.toLowerCase()))
    })
  }

  // Filter by experience type
  if (filters.experienceType === "freshers") {
    filteredCandidates = filteredCandidates.filter((candidate) => {
      const exp = Number.parseInt(candidate.totalExperience) || 0
      return exp <= 1
    })
  } else if (filters.experienceType === "experienced") {
    filteredCandidates = filteredCandidates.filter((candidate) => {
      const exp = Number.parseInt(candidate.totalExperience) || 0
      return exp > 1
    })
  }

  // Filter by location
  if (filters.location && filters.location.trim()) {
    filteredCandidates = filteredCandidates.filter((candidate) =>
      (candidate.location || "").toLowerCase().includes(filters.location.toLowerCase()),
    )
  }

  // Filter by experience range
  if (filters.minExperience) {
    const minExp = Number.parseInt(filters.minExperience)
    filteredCandidates = filteredCandidates.filter((candidate) => {
      const exp = Number.parseInt(candidate.totalExperience) || 0
      return exp >= minExp
    })
  }

  if (filters.maxExperience) {
    const maxExp = Number.parseInt(filters.maxExperience)
    filteredCandidates = filteredCandidates.filter((candidate) => {
      const exp = Number.parseInt(candidate.totalExperience) || 0
      return exp <= maxExp
    })
  }

  // Filter by education
  if (filters.education && filters.education.trim()) {
    filteredCandidates = filteredCandidates.filter((candidate) => {
      const candidateEducation = (candidate.highestQualification || "").toLowerCase()
      const filterEducation = filters.education.toLowerCase()

      if (filterEducation.includes("10th")) {
        return candidateEducation.includes("10th") || candidateEducation.includes("secondary")
      }
      if (filterEducation.includes("12th")) {
        return candidateEducation.includes("12th") || candidateEducation.includes("higher secondary")
      }
      if (filterEducation.includes("diploma")) {
        return candidateEducation.includes("diploma")
      }
      if (filterEducation.includes("graduate")) {
        return candidateEducation.includes("graduate") || candidateEducation.includes("bachelor")
      }
      if (filterEducation.includes("postgraduate")) {
        return candidateEducation.includes("post graduate") || candidateEducation.includes("master")
      }

      return candidateEducation.includes(filterEducation)
    })
  }

  // Enhanced relevance scoring for better results
  const resultsWithScores = filteredCandidates.map((candidate) => {
    let score = 0
    const matches: string[] = []

    const fieldWeights: Record<string, number> = {
      name: 0.25,
      currentRole: 0.3,
      desiredRole: 0.2,
      currentCompany: 0.15,
      technicalSkills: 0.25,
      softSkills: 0.1,
      resumeText: 0.15,
      summary: 0.1,
    }

    const addMatch = (kw: string, weight: number) => {
      score += weight
      matches.push(kw)
    }

    // Keyword scoring by field with weights and occurrence boost
    if (filters.keywords && filters.keywords.length > 0) {
      const klist = filters.keywords.map((k: string) => (k || "").toLowerCase()).filter(Boolean)
      for (const kw of klist) {
        const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")

        const name = (candidate.name || "").toLowerCase()
        if (re.test(name)) addMatch(kw, fieldWeights.name)

        const role = (candidate.currentRole || "").toLowerCase()
        if (re.test(role)) addMatch(kw, fieldWeights.currentRole)

        const desired = (candidate.desiredRole || "").toLowerCase()
        if (re.test(desired)) addMatch(kw, fieldWeights.desiredRole)

        const company = (candidate.currentCompany || "").toLowerCase()
        if (re.test(company)) addMatch(kw, fieldWeights.currentCompany)

        const techSkills = (candidate.technicalSkills || []).map((s: string) => s.toLowerCase()).join(" ")
        if (re.test(techSkills)) addMatch(kw, fieldWeights.technicalSkills)

        const softSkills = (candidate.softSkills || []).map((s: string) => s.toLowerCase()).join(" ")
        if (re.test(softSkills)) addMatch(kw, fieldWeights.softSkills)

        const resume = (candidate.resumeText || "").toLowerCase()
        const resumeMatches = resume.match(re)?.length || 0
        if (resumeMatches > 0) addMatch(kw, fieldWeights.resumeText * Math.min(1, 0.25 * resumeMatches))

        const summary = (candidate.summary || "").toLowerCase()
        if (re.test(summary)) addMatch(kw, fieldWeights.summary)
      }
    }

    // Location bonus
    if (filters.location && filters.location.trim()) {
      const loc = filters.location.toLowerCase()
      if ((candidate.location || "").toLowerCase().includes(loc)) {
        addMatch(filters.location, 0.15)
      }
    }

    // Experience alignment bonus
    if (filters.experienceType !== "any") {
      const exp = Number.parseInt(candidate.totalExperience) || 0
      if ((filters.experienceType === "freshers" && exp <= 1) || (filters.experienceType === "experienced" && exp > 1)) {
        score += 0.05
      }
    }

    // Education bonus
    if (filters.education && filters.education.trim()) {
      const ce = (candidate.highestQualification || "").toLowerCase()
      const fe = filters.education.toLowerCase()
      if (ce.includes(fe)) score += 0.05
    }

    // Normalize score to 0..1
    const normalized = Math.max(0, Math.min(1, score))

    return {
      ...candidate,
      relevanceScore: normalized,
      matchingKeywords: [...new Set(matches)],
    }
  })

  // Sort by relevance score (higher is better)
  return resultsWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore)
}

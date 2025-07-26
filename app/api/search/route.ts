import { type NextRequest, NextResponse } from "next/server"
import { searchCandidates } from "@/lib/ai-utils"
import { getAllCandidates } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, jobDescription, searchType, filters } = body

    console.log("=== Enhanced Search API ===")
    console.log("Search Type:", searchType)
    console.log("Query:", query)
    console.log("Job Description:", jobDescription ? "Provided" : "Not provided")
    console.log("Filters:", filters)

    // Get all candidates from Google Sheets
    const allCandidates = await getAllCandidates()
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
        .join(" ")
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
    let relevanceScore = 0.3 // Base score
    const matchingKeywords: string[] = []

    // Keyword matching with higher weight
    if (filters.keywords && filters.keywords.length > 0) {
      const searchableText = [
        candidate.name || "",
        candidate.currentRole || "",
        candidate.desiredRole || "",
        candidate.currentCompany || "",
        ...(candidate.technicalSkills || []),
        ...(candidate.softSkills || []),
      ]
        .join(" ")
        .toLowerCase()

      let keywordMatches = 0
      filters.keywords.forEach((keyword: string) => {
        const keywordLower = keyword.toLowerCase()
        if (searchableText.includes(keywordLower)) {
          keywordMatches++
          matchingKeywords.push(keyword)

          // Higher score for role matches
          if ((candidate.currentRole || "").toLowerCase().includes(keywordLower)) {
            relevanceScore += 0.25
          } else if (
            (candidate.technicalSkills || []).some((skill: string) => skill.toLowerCase().includes(keywordLower))
          ) {
            relevanceScore += 0.15
          } else {
            relevanceScore += 0.1
          }
        }
      })

      // Bonus for multiple keyword matches
      if (keywordMatches > 1) {
        relevanceScore += 0.1 * (keywordMatches - 1)
      }
    }

    // Location match bonus
    if (filters.location && filters.location.trim()) {
      const locationQuery = filters.location.toLowerCase()
      if ((candidate.location || "").toLowerCase().includes(locationQuery)) {
        relevanceScore += 0.1
        matchingKeywords.push(filters.location)
      }
    }

    // Experience match bonus
    if (filters.experienceType !== "any") {
      const exp = Number.parseInt(candidate.totalExperience) || 0
      if (
        (filters.experienceType === "freshers" && exp <= 1) ||
        (filters.experienceType === "experienced" && exp > 1)
      ) {
        relevanceScore += 0.05
      }
    }

    // Education match bonus
    if (filters.education && filters.education.trim()) {
      const candidateEducation = (candidate.highestQualification || "").toLowerCase()
      const filterEducation = filters.education.toLowerCase()
      if (candidateEducation.includes(filterEducation)) {
        relevanceScore += 0.05
      }
    }

    return {
      ...candidate,
      relevanceScore: Math.min(relevanceScore, 1), // Cap at 1.0
      matchingKeywords: [...new Set(matchingKeywords)], // Remove duplicates
    }
  })

  // Sort by relevance score (higher is better)
  return resultsWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore)
}

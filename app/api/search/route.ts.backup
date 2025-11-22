import { type NextRequest, NextResponse } from "next/server"
import { searchCandidates, extractKeywordsFromSentence } from "@/lib/ai-utils"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"
import { logger } from "@/lib/logger"
import { parseSearchRequirement, intelligentCandidateSearch } from "@/lib/intelligent-search"

// JD-based search function for job description analysis
async function jdBasedSearch(jobDescription: string, candidates: any[]): Promise<any[]> {
  console.log("=== JD-Based Search (Skill-Only, Logistics Domain) ===")

  try {
    const jdText = (jobDescription || '').toLowerCase();
    
    // Use ONLY the provided logistics skill list for JD search
    const LOGISTICS_SKILLS = [
      'gps tracking',
      'fleet management',
      'route optimization',
      'supply chain management',
      'inventory management',
      'logistics planning',
      'vehicle tracking',
      'warehouse management',
      'transportation management',
      'driver management',
      'fuel management',
      'maintenance scheduling',
      'compliance',
      'safety regulations',
      'dot regulations',
      'international fuel tax agreement',
      'communication',
      'problem solving',
      'leadership',
      'team management',
      'data analysis',
    ];
    
    // Match skills appearing in the JD text (strict intersection)
    const matchedSkills = LOGISTICS_SKILLS.filter(skill => jdText.includes(skill.toLowerCase()));
    console.log('JD matched skills:', matchedSkills);
    
    const skillsForSearch = matchedSkills.length > 0 ? matchedSkills : LOGISTICS_SKILLS;
    console.log('Using Supabase skill-based search with skills:', skillsForSearch);
    
    // Primary: Supabase skill-based search
    try {
      const supabaseResults = await SupabaseCandidateService.searchCandidatesBySkills(skillsForSearch);
      
      if (supabaseResults && supabaseResults.length > 0) {
        // Score candidates by matched skill count and distribution across fields
        const scored = supabaseResults.map(candidate => {
          const text = [
            (candidate.currentRole || ''),
            (candidate.summary || ''),
            (candidate.resumeText || ''),
            (candidate.currentCompany || ''),
            ...(candidate.technicalSkills || []),
            ...(candidate.softSkills || []),
          ].join(' ').toLowerCase();
          
          const candidateSkills = new Set((candidate.technicalSkills || []).map((s: string) => s.toLowerCase()));
          let hits = 0;
          skillsForSearch.forEach(skill => {
            const s = skill.toLowerCase();
            if (candidateSkills.has(s) || text.includes(s)) hits += 1;
          });
          
          // Relevance based on ratio of matched skills and slight text boost
          const base = hits / skillsForSearch.length; // 0..1
          const boost = Math.min(0.15, hits * 0.02);
          const relevanceScore = Math.max(0, Math.min(1, base + boost));
          const matchPercentage = Math.round(base * 100);
          
          return {
            ...candidate,
            relevanceScore,
            matchPercentage,
            matchingKeywords: matchedSkills.length > 0 ? matchedSkills : skillsForSearch,
          };
        });
        
        // Sort by relevance and return
        return scored.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      }
    } catch (error) {
      console.error('Supabase skill search failed, falling back to local/AI search:', error);
    }
    
    // Fallback: local weighted search using skill phrases as query
    const fallbackQuery = skillsForSearch.join(' ');
    const aiResults = await searchCandidates(fallbackQuery, candidates);
    return aiResults.map(c => ({
      ...c,
      matchingKeywords: matchedSkills.length > 0 ? matchedSkills : skillsForSearch,
    }));
  } catch (error) {
    console.error('JD analysis failed:', error);
    // Final fallback: return empty array rather than noisy matches
    return [];
  }
}

// Simple in-memory cache to reduce repeated full-sheet reads during rapid searches
let candidatesCache: any[] | null = null
let candidatesCacheAt = 0
const CANDIDATES_CACHE_MS = 60_000

export async function GET(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const searchType   = searchParams.get('type') ?? 'smart'
    const query        = searchParams.get('keywords') ?? searchParams.get('query') ?? ''
    const jobDescription = searchParams.get('jobDescription') ?? ''
    const paginate     = searchParams.get('paginate') === 'true'
    const page         = Number(searchParams.get('page') ?? '1')
    const perPage      = Number(searchParams.get('perPage') ?? '20')

    // Build filters object from individual keys
    const filters: any = {}
    if (searchParams.get('location')) filters.location = searchParams.get('location')
    if (searchParams.get('education')) filters.education = searchParams.get('education')
    if (searchParams.get('minExperience')) filters.minExperience = Number(searchParams.get('minExperience'))
    if (searchParams.get('maxExperience')) filters.maxExperience = Number(searchParams.get('maxExperience'))

    console.log("=== Enhanced Search API ===")
    console.log("Search Type:", searchType)
    console.log("Query:", query)
    console.log("Job Description:", jobDescription ? "Provided" : "Not provided")
    console.log("Filters:", filters)
    logger.info(`Search request: type=${searchType} query="${query}" jd=${!!jobDescription} filters=${JSON.stringify(filters)}`)

    // Get all candidates from Supabase (with short cache)
    const now = Date.now()
    if (!candidatesCache || now - candidatesCacheAt > CANDIDATES_CACHE_MS) {
      try {
        const fresh = await SupabaseCandidateService.getAllCandidates()
        candidatesCache = fresh
        candidatesCacheAt = now
      } catch (error) {
        console.error("Error fetching candidates from Supabase:", error)
        // Return empty array if Supabase fails
        candidatesCache = []
        candidatesCacheAt = now
      }
    }
    const allCandidates = candidatesCache
    console.log("Total candidates:", allCandidates.length)
    logger.info(`Supabase returned: rows=${candidatesCache.length}`)

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

    let results: any[] = []

    switch (searchType) {
      case "smart":
        // Enhanced TruckinzyAI search with deep requirement understanding
        logger.info(`TruckinzyAI search validation: query="${query}" jobDescription="${jobDescription}"`)
        if (!query.trim() && !jobDescription.trim()) {
          return NextResponse.json({ error: "Invalid search parameters", details: "Missing keywords or job description" }, { status: 400 })
        }
        
        console.log("🧠 Processing TruckinzyAI search query:", query)
        
        // Use Gemini API to deeply understand the requirement
        const parsedRequirements = await parseSearchRequirement(query)
        console.log("📋 Parsed requirements:", JSON.stringify(parsedRequirements, null, 2))
        
        // Use intelligent candidate search with parsed requirements
        results = await intelligentCandidateSearch(parsedRequirements, transformedCandidates)
        
        // Add explanation of why candidates were matched
        results = results.map(candidate => ({
          ...candidate,
          searchExplanation: `Matched based on: ${candidate.matchingCriteria?.join(', ') || 'profile analysis'}`,
          aiUnderstanding: parsedRequirements
        }))
        
        console.log(`🎯 Found ${results.length} relevant candidates with intelligent matching`)
        break

      case "jd":
        // JD-based search - SEPARATE from manual search
        if (!jobDescription || jobDescription.trim().length === 0) {
          return NextResponse.json({ error: "Job description is required" }, { status: 400 })
        }
        
        // Extract keywords from job description for better matching
        const extractedJDKeywords = extractKeywordsFromSentence(jobDescription);
        console.log("Extracted keywords from JD:", extractedJDKeywords);
        
        // Use jdBasedSearch with the original job description
        results = await jdBasedSearch(jobDescription, transformedCandidates)
        
        // Add extracted keywords to the results
        results = results.map(candidate => ({
          ...candidate,
          extractedKeywords: extractedJDKeywords
        }))
        break

      case "manual":
        // Enhanced manual search with intelligent filtering
        logger.info(`Enhanced manual search validation: query="${query}" jobDescription="${jobDescription}" filters=${JSON.stringify(filters)}`)
        if (!query.trim() && !jobDescription.trim()) {
          return NextResponse.json({ error: "Invalid search parameters", details: "Provide keywords or job description" }, { status: 400 })
        }
        
        // If job description is provided, treat it as a natural language query
        if (jobDescription.trim()) {
          console.log("Using job description for intelligent search")
          const requirements = await parseSearchRequirement(jobDescription)
          results = await intelligentCandidateSearch(requirements, transformedCandidates)
        } else {
          // Check if query contains natural language (has spaces and meaningful words)
          const hasNaturalLanguage = query.trim().includes(' ') && query.trim().length > 5
          
          if (hasNaturalLanguage) {
            console.log("Detected natural language in manual search, using intelligent parsing")
            const requirements = await parseSearchRequirement(query)
            results = await intelligentCandidateSearch(requirements, transformedCandidates)
          } else {
            console.log("Using simple keyword search for short query")
            // Use simple keyword-based search for short queries
            results = await simpleKeywordSearch(query, transformedCandidates)
          }
        }
        break

      default:
        return NextResponse.json({ error: "Invalid search type" }, { status: 400 })
    }

    console.log("Search results:", results.length)

    // Optional server-side pagination (already parsed from query above)

    if (paginate) {
      const total = results.length
      const totalPages = Math.max(1, Math.ceil(total / perPage))
      const currentPage = Math.min(page, totalPages)
      const startIdx = (currentPage - 1) * perPage
      const items = results.slice(startIdx, startIdx + perPage)
      return NextResponse.json({ items, total, page: currentPage, perPage })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

async function extractRequirementsFromJD(jobDescription: string): Promise<string> {
  // Only extract requirements list without external API calls
  try {
    const text = (jobDescription || '').toLowerCase();
    
    const requirements: string[] = [];
    
    // Extract common logistics requirements heuristically
    const patterns = [
      { keyword: 'gps', match: 'GPS tracking proficiency' },
      { keyword: 'fleet', match: 'Fleet operations management' },
      { keyword: 'route', match: 'Route planning and optimization' },
      { keyword: 'supply chain', match: 'Supply chain coordination' },
      { keyword: 'inventory', match: 'Inventory control and tracking' },
      { keyword: 'warehouse', match: 'Warehouse management systems' },
      { keyword: 'transportation', match: 'Transportation and dispatch' },
      { keyword: 'driver', match: 'Driver scheduling and oversight' },
      { keyword: 'fuel', match: 'Fuel usage monitoring' },
      { keyword: 'maintenance', match: 'Maintenance scheduling' },
      { keyword: 'compliance', match: 'Compliance with DOT and safety' },
      { keyword: 'communication', match: 'Strong communication skills' },
      { keyword: 'leadership', match: 'Team leadership and coordination' },
      { keyword: 'analysis', match: 'Data analysis skills' },
    ];
    
    patterns.forEach(({ keyword, match }) => {
      if (text.includes(keyword)) requirements.push(match);
    });

    if (requirements.length === 0) {
      requirements.push(
        'Basic logistics operations understanding',
        'Ability to learn trucking platform tools',
        'Attention to detail and compliance awareness',
      );
    }

    return requirements.join(', ');
  } catch (error) {
    console.error('JD requirements extraction failed:', error);
    return '';
  }
}

async function simpleKeywordSearch(query: string, candidates: any[]): Promise<any[]> {
  try {
    console.log("=== Simple Keyword Search ===")
    console.log("Query:", query)
    
    const searchTerm = query.toLowerCase().trim()
    
    const results = candidates
      .filter(candidate => {
        const searchableText = [
          candidate.name || '',
          candidate.currentRole || '',
          candidate.summary || '',
          candidate.resumeText || '',
          candidate.location || '',
          ...(candidate.technicalSkills || []),
          ...(candidate.softSkills || []),
          ...(candidate.tags || [])
        ].join(' ').toLowerCase()
        
        return searchableText.includes(searchTerm)
      })
      .map(candidate => ({
        ...candidate,
        relevanceScore: 0.5,
        matchPercentage: 50,
        matchingKeywords: [query],
        searchType: 'simple-keyword'
      }))
      .sort((a, b) => {
        // Sort by upload date (newest first)
        const dateA = new Date(a.uploadedAt || 0).getTime()
        const dateB = new Date(b.uploadedAt || 0).getTime()
        return dateB - dateA
      })
    
    console.log(`Simple keyword search found ${results.length} candidates`)
    return results
  } catch (error) {
    console.error('Simple keyword search failed:', error)
    return []
  }
}

async function enhancedManualSearch(filters: any, candidates: any[]): Promise<any[]> {
  try {
    console.log("=== Enhanced Manual Search ===")
    console.log("Filters:", filters)

    const keywords = (filters.keywords || filters.query || '').toLowerCase().split(' ').filter((k: string) => k.length > 2);
    const location = (filters.location || '').toLowerCase();
    const minExp = parseFloat(filters.minExperience || '0');
    const maxExp = parseFloat(filters.maxExperience || '100');
    const education = (filters.education || '').toLowerCase();

    // Use intelligent parsing if keywords contain natural language
    const hasNaturalLanguage = keywords.some((k: string) => 
      k.includes('experience') || k.includes('years') || k.includes('manager') || k.includes('driver')
    );

    if (hasNaturalLanguage && keywords.length > 2) {
      console.log("Detected natural language query, using intelligent parsing")
      const query = filters.keywords || filters.query || ''
      const requirements = await parseSearchRequirement(query)
      return await intelligentCandidateSearch(requirements, candidates)
    }

    // Traditional keyword-based search with improved relevance scoring
    const results = candidates.map((c: any) => {
      const textBlob = [
        (c.currentRole || ''),
        (c.summary || ''),
        (c.resumeText || ''),
        (c.currentCompany || ''),
        ...(Array.isArray(c.technicalSkills) ? c.technicalSkills : []),
        ...(Array.isArray(c.softSkills) ? c.softSkills : []),
      ].join(' ').toLowerCase();

      // Calculate keyword relevance score
      let keywordScore = 0;
      let matchedKeywords: string[] = [];
      
      if (keywords.length > 0) {
        const keywordMatches = keywords.filter((k: string) => textBlob.includes(k));
        matchedKeywords = keywordMatches;
        keywordScore = keywordMatches.length / keywords.length;
      }

      // Location matching
      let locationScore = 0;
      if (location) {
        const candidateLocation = (c.location || '').toLowerCase();
        if (candidateLocation.includes(location)) {
          locationScore = 1;
        } else if (location.includes(candidateLocation)) {
          locationScore = 0.8;
        }
      }

      // Experience matching
      let experienceScore = 0;
      let candidateYears = 0;
      const expText = (c.totalExperience || '').toLowerCase();
      const expMatch = expText.match(/([0-9]+(?:\.[0-9]+)?)\s*year/);
      if (expMatch) {
        candidateYears = parseFloat(expMatch[1]);
        if ((!filters.minExperience && !filters.maxExperience) || 
            (candidateYears >= minExp && candidateYears <= maxExp)) {
          experienceScore = 1;
        }
      }

      // Education matching
      let educationScore = 0;
      if (education) {
        const candidateEducation = ((c.highestQualification || '') + ' ' + (c.degree || '')).toLowerCase();
        if (candidateEducation.includes(education)) {
          educationScore = 1;
        }
      }

      // Calculate overall relevance score
      const totalScore = (keywordScore * 0.5) + (locationScore * 0.2) + (experienceScore * 0.2) + (educationScore * 0.1);

      return {
        ...c,
        relevanceScore: Math.min(0.95, totalScore),
        matchPercentage: Math.round(totalScore * 100),
        matchingKeywords: matchedKeywords,
        searchCriteria: {
          keywords: matchedKeywords,
          location: locationScore > 0 ? c.location : null,
          experience: experienceScore > 0 ? c.totalExperience : null,
          education: educationScore > 0 ? c.highestQualification : null
        }
      };
    });

    // Filter out candidates with very low relevance and sort by relevance
    const filteredResults = results
      .filter((c: any) => c.relevanceScore >= 0.3) // Minimum 30% relevance
      .sort((a: any, b: any) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        const dateA = new Date(a.uploadedAt || 0).getTime();
        const dateB = new Date(b.uploadedAt || 0).getTime();
        return dateB - dateA;
      });

    console.log(`Enhanced manual search found ${filteredResults.length} relevant candidates`);
    return filteredResults;
  } catch (error) {
    console.error('Enhanced manual search failed:', error);
    return [];
  }
}

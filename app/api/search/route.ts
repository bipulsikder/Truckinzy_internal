import { type NextRequest, NextResponse } from "next/server"
import { searchCandidates, extractKeywordsFromSentence } from "@/lib/ai-utils"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"

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
    const body = await request.json()
    const { query, jobDescription, searchType, filters } = body

    console.log("=== Enhanced Search API ===")
    console.log("Search Type:", searchType)
    console.log("Query:", query)
    console.log("Job Description:", jobDescription ? "Provided" : "Not provided")
    console.log("Filters:", filters)

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
        // Smart AI search with enhanced keyword processing
        if (!query || query.trim().length === 0) {
          return NextResponse.json({ error: "Search query is required" }, { status: 400 })
        }
        
        // Extract and filter relevant keywords from the query
        console.log("Processing TruckinzyAI search query:", query)
        const relevantKeywords = extractKeywordsFromSentence(query)
        const processedQuery = relevantKeywords.length > 0 ? relevantKeywords.join(' ') : query
        console.log("Filtered keywords for AI search:", relevantKeywords)
        console.log("Processed query:", processedQuery)
        
        try {
          // First try to use Supabase full-text search with processed query
          const supabaseResults = await SupabaseCandidateService.searchCandidates(processedQuery)
          if (supabaseResults && supabaseResults.length > 0) {
            // Transform results to match expected format with better matching keywords
            results = supabaseResults.map(candidate => {
              const candidateText = [
                candidate.currentRole || '',
                candidate.desiredRole || '',
                candidate.currentCompany || '',
                (candidate.summary || ''),
                (candidate.resumeText || ''),
                ...(candidate.technicalSkills || []),
                ...(candidate.softSkills || []),
              ].join(' ').toLowerCase();
              
              const exactMatches = (relevantKeywords || []).filter(kw => 
                kw && candidateText.includes(kw.toLowerCase())
              );
              const coverage = (relevantKeywords || []).length > 0 
                ? exactMatches.length / relevantKeywords.length 
                : 0.6;
              const relevanceScore = Math.max(0.5, Math.min(0.95, coverage + 0.3));
              const matchPercentage = Math.round(Math.min(100, coverage * 100));
              
              return {
                ...candidate,
                relevanceScore,
                matchPercentage,
                matchingKeywords: exactMatches.length > 0 ? exactMatches : (relevantKeywords.length > 0 ? relevantKeywords : [query])
              }
            })
            break
          }
        } catch (error) {
          console.error("Supabase search failed, falling back to AI search:", error)
          // Continue to AI search fallback
        }
        
        // Use processed query for AI search
        results = await searchCandidates(processedQuery, transformedCandidates)
        
        // Enhance results with better matching keywords
        results = results.map(candidate => ({
          ...candidate,
          matchingKeywords: relevantKeywords.length > 0 ? relevantKeywords : [query]
        }))
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

    // Optional server-side pagination
    const paginate = Boolean(body?.paginate)
    const page = Math.max(1, Number(body?.page) || 1)
    const perPage = Math.max(1, Math.min(100, Number(body?.perPage) || 20))

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

async function minimalManualSearch(filters: any, candidates: any[]): Promise<any[]> {
  try {
    const keywords = (filters.keywords || []).map((k: string) => k.toLowerCase());
    const location = (filters.location || '').toLowerCase();
    const minExp = parseFloat(filters.minExperience || '0');
    const maxExp = parseFloat(filters.maxExperience || '100');
    const education = (filters.education || '').toLowerCase();

    const results = candidates.filter((c: any) => {
      const textBlob = [
        (c.currentRole || ''),
        (c.summary || ''),
        (c.resumeText || ''),
        (c.currentCompany || ''),
        ...(Array.isArray(c.technicalSkills) ? c.technicalSkills : []),
        ...(Array.isArray(c.softSkills) ? c.softSkills : []),
      ].join(' ').toLowerCase();

      const hasKeywords = keywords.length === 0 || keywords.some((k: string) => textBlob.includes(k));
      const hasLocation = !location || (c.location || '').toLowerCase().includes(location);
      const hasEducation = !education || (c.highestQualification || '').toLowerCase().includes(education) || (c.degree || '').toLowerCase().includes(education);
      
      // Naive experience parsing (expects "X years")
      let years = 0;
      const expText = (c.totalExperience || '').toLowerCase();
      const match = expText.match(/([0-9]+)\s*year/);
      if (match) years = parseFloat(match[1]);

      const hasExperience = (!filters.minExperience && !filters.maxExperience) || (years >= minExp && years <= maxExp);

      return hasKeywords && hasLocation && hasEducation && hasExperience;
    }).map((c: any) => ({
      ...c,
      relevanceScore: 0.6, // basic default score
      matchingKeywords: keywords,
    }));

    // Sort by relevance then recent uploads
    return results.sort((a: any, b: any) => {
      if ((b.relevanceScore || 0) !== (a.relevanceScore || 0)) {
        return (b.relevanceScore || 0) - (a.relevanceScore || 0)
      }
      const dateA = new Date(a.uploadedAt || 0).getTime()
      const dateB = new Date(b.uploadedAt || 0).getTime()
      return dateB - dateA
    });
  } catch (error) {
    console.error('Manual search failed:', error);
    return [];
  }
}

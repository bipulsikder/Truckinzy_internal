// Enhanced Search API Implementation
// Add these functions and modifications to your app/api/search/route.ts

// 1. Enhanced parameter parsing function
function getSearchParameters(searchParams) {
  return {
    searchType: searchParams.get('type') ?? searchParams.get('searchType') ?? 'smart',
    query: searchParams.get('keywords') ?? searchParams.get('query') ?? searchParams.get('q') ?? '',
    jobDescription: searchParams.get('jobDescription') ?? searchParams.get('jd') ?? searchParams.get('description') ?? '',
    paginate: searchParams.get('paginate') === 'true',
    page: Number(searchParams.get('page') ?? '1'),
    perPage: Number(searchParams.get('perPage') ?? '20')
  }
}

// 2. Enhanced semantic search with fallback
async function performSemanticSearch(searchText, candidates, searchType) {
  console.log(\`🧠 Semantic search for \${searchType}: \${searchText.substring(0, 100)}...\`)
  
  try {
    const parsedRequirements = await parseSearchRequirement(searchText)
    console.log("📋 Parsed requirements:", JSON.stringify(parsedRequirements, null, 2))
    
    const results = await intelligentCandidateSearch(parsedRequirements, candidates)
    
    return results.map(candidate => ({
      ...candidate,
      searchExplanation: \`Semantic \${searchType} match: \${candidate.matchingCriteria?.join(', ') || 'profile analysis'}\`,
      aiUnderstanding: parsedRequirements,
      semanticScore: candidate.relevanceScore,
      searchMethod: 'ai-semantic'
    }))
    
  } catch (error) {
    console.error('❌ Semantic search failed, falling back to keyword search:', error)
    return await performEnhancedKeywordSearch(searchText, candidates, searchType)
  }
}

// 3. Enhanced keyword search with semantic elements
async function performEnhancedKeywordSearch(searchText, candidates, searchType) {
  console.log(\`🔍 Enhanced keyword search for \${searchType}\`)
  
  const searchTerms = searchText.toLowerCase().trim().split(/\\s+/)
  const semanticTerms = extractSemanticTerms(searchText)
  
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
      
      const keywordMatches = searchTerms.some(term => searchableText.includes(term))
      const semanticMatches = semanticTerms.some(term => searchableText.includes(term.toLowerCase()))
      
      return keywordMatches || semanticMatches
    })
    .map(candidate => {
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
      
      const matchedTerms = searchTerms.filter(term => searchableText.includes(term))
      const matchedSemantic = semanticTerms.filter(term => searchableText.includes(term.toLowerCase()))
      
      const keywordScore = matchedTerms.length / searchTerms.length
      const semanticScore = matchedSemantic.length / semanticTerms.length
      const combinedScore = (keywordScore * 0.7) + (semanticScore * 0.3)
      
      return {
        ...candidate,
        relevanceScore: 0.2 + combinedScore * 0.6,
        matchPercentage: Math.round(20 + combinedScore * 60),
        matchingKeywords: [...matchedTerms, ...matchedSemantic],
        searchMethod: 'enhanced-keyword',
        semanticTerms: matchedSemantic
      }
    })
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      const dateA = new Date(a.uploadedAt || 0).getTime()
      const dateB = new Date(b.uploadedAt || 0).getTime()
      return dateB - dateA
    })
  
  console.log(\`✅ Enhanced keyword search found \${results.length} candidates\`)
  return results
}

// 4. Semantic term extraction
function extractSemanticTerms(query) {
  const terms = []
  const lowerQuery = query.toLowerCase()
  
  const semanticMappings = {
    'warehouse': ['inventory', 'storage', 'logistics', 'supply chain', 'stock management'],
    'inventory': ['stock', 'warehouse', 'supply', 'logistics', 'storage'],
    'sap': ['erp', 'software', 'system', 'enterprise resource planning'],
    'manager': ['management', 'leadership', 'supervisor', 'team lead', 'head'],
    'driver': ['driving', 'transport', 'vehicle', 'fleet', 'operator'],
    'fleet': ['vehicle', 'transport', 'logistics', 'management', 'transportation'],
    'logistics': ['supply chain', 'transportation', 'warehouse', 'distribution'],
    'transportation': ['transport', 'logistics', 'fleet', 'vehicle'],
    'experience': ['years', 'expertise', 'background', 'knowledge']
  }
  
  Object.entries(semanticMappings).forEach(([keyword, relatedTerms]) => {
    if (lowerQuery.includes(keyword)) {
      terms.push(...relatedTerms)
    }
  })
  
  if (lowerQuery.includes('lifo') || lowerQuery.includes('fefo')) {
    terms.push('inventory management', 'stock rotation', 'inventory methods')
  }
  
  if (lowerQuery.includes('leadership') || lowerQuery.includes('organizational')) {
    terms.push('team management', 'people management', 'supervisory skills')
  }
  
  return [...new Set(terms)]
}

// 5. Replace the main GET function parameters section
// In your existing GET function, replace the parameter parsing:
/*
const searchParams = new URL(request.url)
const params = getSearchParameters(searchParams)

// Build filters (keep existing)
const filters = {}
if (searchParams.get('location')) filters.location = searchParams.get('location')
if (searchParams.get('education')) filters.education = searchParams.get('education')
if (searchParams.get('minExperience')) filters.minExperience = Number(searchParams.get('minExperience'))
if (searchParams.get('maxExperience')) filters.maxExperience = Number(searchParams.get('maxExperience'))

console.log("=== Enhanced Semantic Search API ===")
console.log("Search Type:", params.searchType)
console.log("Query:", params.query)
console.log("Job Description:", params.jobDescription ? `Provided (${params.jobDescription.length} chars)` : "Not provided")
console.log("Filters:", filters)
*/

// 6. Enhanced switch case for search types
/*
let results = []
const searchText = params.query.trim() || params.jobDescription.trim()

switch (params.searchType) {
  case "smart":
  case "ai":
    if (!searchText) {
      return NextResponse.json({ error: "Invalid search parameters", details: "Provide search query or job description" }, { status: 400 })
    }
    results = await performSemanticSearch(searchText, transformedCandidates, params.searchType)
    break

  case "jd":
  case "semantic":
    if (!params.jobDescription.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 })
    }
    results = await performSemanticSearch(params.jobDescription, transformedCandidates, params.searchType)
    break

  case "manual":
  case "keyword":
    if (!searchText) {
      return NextResponse.json({ error: "Invalid search parameters", details: "Provide search query or job description" }, { status: 400 })
    }
    
    if (searchText.length > 20 && (searchText.includes(' with ') || searchText.includes(' experience ') || searchText.includes(' in '))) {
      console.log("Detected complex query, using semantic parsing")
      results = await performSemanticSearch(searchText, transformedCandidates, params.searchType)
    } else {
      console.log("Using enhanced keyword search")
      results = await performEnhancedKeywordSearch(searchText, transformedCandidates, params.searchType)
    }
    break

  default:
    return NextResponse.json({ error: "Invalid search type" }, { status: 400 })
}
*/

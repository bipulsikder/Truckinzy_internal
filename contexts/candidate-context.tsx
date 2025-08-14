"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

interface Candidate {
  _id: string
  name: string
  email: string
  phone: string
  currentRole: string
  desiredRole?: string
  currentCompany?: string
  location: string
  totalExperience: string
  highestQualification?: string
  degree?: string
  university?: string
  technicalSkills: string[]
  softSkills: string[]
  certifications?: string[]
  resumeText: string
  fileName: string
  driveFileUrl: string
  tags: string[]
  status: "new" | "reviewed" | "shortlisted" | "interviewed" | "selected" | "rejected" | "on-hold"
  rating?: number
  uploadedAt: string
  linkedinProfile?: string
  summary?: string
  notes?: string
}

interface CandidateContextType {
  candidates: Candidate[]
  setCandidates: (candidates: Candidate[]) => void
  addCandidate: (candidate: Candidate) => void
  updateCandidate: (id: string, updates: Partial<Candidate>) => void
  removeCandidate: (id: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  lastFetched: Date | null
  setLastFetched: (date: Date | null) => void
  hasMore: boolean
  setHasMore: (hasMore: boolean) => void
  page: number
  setPage: (page: number) => void
  refreshCandidates: (forceRefresh?: boolean) => Promise<void>
  loadMoreCandidates: () => Promise<void>
  cacheEnabled: boolean
  setCacheEnabled: (enabled: boolean) => void
}

const CandidateContext = createContext<CandidateContextType | undefined>(undefined)

export function CandidateProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [isInitialized, setIsInitialized] = useState(false)
  const [cacheEnabled, setCacheEnabled] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const addCandidate = (candidate: Candidate) => {
    setCandidates(prev => [...prev, candidate])
  }

  const updateCandidate = (id: string, updates: Partial<Candidate>) => {
    setCandidates(prev => 
      prev.map(c => c._id === id ? { ...c, ...updates } : c)
    )
  }

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c._id !== id))
  }

  // Load cached data from localStorage
  const loadCachedData = () => {
    if (typeof window === 'undefined') return null
    
    try {
      const cached = localStorage.getItem('candidate-cache')
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        const cacheAge = Date.now() - timestamp
        const maxAge = 5 * 60 * 1000 // 5 minutes cache
        
        if (cacheAge < maxAge) {
          console.log('📦 Loading candidates from cache')
          return data
        } else {
          console.log('⏰ Cache expired, will fetch fresh data')
          localStorage.removeItem('candidate-cache')
        }
      }
    } catch (error) {
      console.error('Failed to load cached data:', error)
    }
    return null
  }

  // Save data to localStorage cache
  const saveToCache = (data: Candidate[]) => {
    if (typeof window === 'undefined' || !cacheEnabled) return
    
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem('candidate-cache', JSON.stringify(cacheData))
      console.log('💾 Candidates cached successfully')
    } catch (error) {
      console.error('Failed to save to cache:', error)
    }
  }

  const refreshCandidates = useCallback(async (forceRefresh = false) => {
    // Prevent multiple simultaneous calls
    if (isLoading) {
      console.log('⏳ Already loading candidates, skipping...')
      return
    }
    
    setIsLoading(true)
    
    // Try to load from cache first (unless force refresh)
    if (!forceRefresh && cacheEnabled) {
      const cachedData = loadCachedData()
      if (cachedData) {
        console.log('📦 Using cached data')
        setCandidates(cachedData)
        setLastFetched(new Date())
        setPage(1)
        setHasMore(cachedData.length === 20)
        setIsLoading(false)
        return
      }
    }
    
    try {
      console.log('🌐 Fetching candidates from API')
      const response = await fetch("/api/candidates")
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Fetched ${data.length} candidates`)
        setCandidates(data)
        setLastFetched(new Date())
        setPage(1)
        setHasMore(data.length === 20)
        
        // Save to cache if enabled
        if (cacheEnabled) {
          saveToCache(data)
        }
      }
    } catch (error) {
      console.error("Failed to refresh candidates:", error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, cacheEnabled])

  const loadMoreCandidates = useCallback(async () => {
    if (isLoading || !hasMore) return
    
    setIsLoading(true)
    try {
      const nextPage = page + 1
      const response = await fetch(`/api/candidates?page=${nextPage}`)
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setCandidates(prev => [...prev, ...data])
          setPage(nextPage)
          setHasMore(data.length === 20) // Assuming 20 is the page size
        } else {
          setHasMore(false)
        }
      }
    } catch (error) {
      console.error("Failed to load more candidates:", error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page])

  // Check for existing cookie consent on mount
  useEffect(() => {
    // Delay to avoid hydration mismatch
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const consent = localStorage.getItem('cookie-consent')
        console.log('🍪 Cookie consent status:', consent)
        if (consent === 'accepted') {
          setCacheEnabled(true)
          console.log('✅ Caching enabled from previous consent')
        } else if (consent === 'rejected') {
          setCacheEnabled(false)
          console.log('❌ Caching disabled from previous consent')
        }
      }
    }, 100) // Small delay to ensure hydration is complete

    return () => clearTimeout(timer)
  }, [])

  // Initialize candidates if not already loaded
  useEffect(() => {
    if (!isInitialized) {
      refreshCandidates()
      setIsInitialized(true)
    }
  }, [isInitialized, refreshCandidates])

  const value: CandidateContextType = {
    candidates,
    setCandidates,
    addCandidate,
    updateCandidate,
    removeCandidate,
    isLoading,
    setIsLoading,
    lastFetched,
    setLastFetched,
    hasMore,
    setHasMore,
    page,
    setPage,
    refreshCandidates,
    loadMoreCandidates,
    cacheEnabled,
    setCacheEnabled,
  }

  // Don't render context on server-side to prevent hydration mismatch
  if (!isClient) {
    return <>{children}</>
  }

  return (
    <CandidateContext.Provider value={value}>
      {children}
    </CandidateContext.Provider>
  )
}

export function useCandidates() {
  const context = useContext(CandidateContext)
  if (context === undefined) {
    throw new Error("useCandidates must be used within a CandidateProvider")
  }
  return context
} 
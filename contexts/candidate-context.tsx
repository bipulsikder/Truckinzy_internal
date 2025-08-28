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
  isLoading: boolean
  hasMore: boolean
  refreshCandidates: () => Promise<void>
  loadMoreCandidates: () => Promise<void>
  lastFetched: Date | null
}

const CandidateContext = createContext<CandidateContextType | undefined>(undefined)

export function CandidateProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchCandidates = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log("🔄 Fetching candidates from API...")
      
      const response = await fetch('/api/candidates')
      if (response.ok) {
        const data = await response.json()
        console.log("📊 API Response:", data)
        
        // Handle both array and object responses
        const candidatesData = Array.isArray(data) ? data : (data.candidates || [])
        console.log(`✅ Fetched ${candidatesData.length} candidates`)
        
        setCandidates(candidatesData)
        setHasMore(false) // No pagination needed, always load all
        setLastFetched(new Date())
      } else {
        console.error('Failed to fetch candidates:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Error fetching candidates:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshCandidates = useCallback(async () => {
    console.log("🔄 Refreshing candidates...")
    await fetchCandidates()
  }, [fetchCandidates])

  const loadMoreCandidates = useCallback(async () => {
    // No pagination needed, always load all candidates
    await fetchCandidates()
  }, [fetchCandidates])

  // Always fetch fresh data when component mounts
  useEffect(() => {
    console.log("🚀 CandidateProvider mounted, fetching candidates...")
    fetchCandidates()
  }, [fetchCandidates])

  const value = {
    candidates,
    isLoading,
    hasMore,
    refreshCandidates,
    loadMoreCandidates,
    lastFetched,
  }

  console.log("📊 Context value updated:", {
    candidatesCount: candidates.length,
    isLoading,
    lastFetched
  })

  return (
    <CandidateContext.Provider value={value}>
      {children}
    </CandidateContext.Provider>
  )
}

export function useCandidates() {
  const context = useContext(CandidateContext)
  if (context === undefined) {
    throw new Error('useCandidates must be used within a CandidateProvider')
  }
  return context
} 
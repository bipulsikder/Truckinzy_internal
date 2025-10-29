"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { logger } from "@/lib/logger"

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
  fileUrl: string
  tags: string[]
  status: "new" | "reviewed" | "shortlisted" | "interviewed" | "selected" | "rejected" | "on-hold"
  rating?: number
  uploadedAt: string
  linkedinProfile?: string
  summary?: string
  notes?: string
  // Detailed sections
  workExperience?: Array<{ company: string; role: string; duration: string; description: string; responsibilities?: string[]; achievements?: string[]; technologies?: string[] }>
  education?: Array<{ degree: string; specialization: string; institution: string; year: string; percentage: string; grade?: string; coursework?: string[]; projects?: string[] }>
}

interface CandidateContextType {
  candidates: Candidate[]
  isLoading: boolean
  hasMore: boolean
  currentPage: number
  pageSize: number
  total: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const fetchCandidates = useCallback(async (page = currentPage, perPage = pageSize) => {
    try {
      setIsLoading(true)
      logger.info(`Fetching candidates from API (paginated): page=${page} perPage=${perPage}`)
      const url = `/api/candidates?paginate=true&page=${page}&perPage=${perPage}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        logger.debug("API Response:", data)

        // Expect { items, page, perPage, total }
        const items = Array.isArray(data) ? data : (data.items || [])
        const totalCount = Array.isArray(data) ? items.length : (data.total || items.length)
        const pageNum = Array.isArray(data) ? page : (data.page || page)
        const per = Array.isArray(data) ? perPage : (data.perPage || perPage)

        logger.info(`Fetched ${items.length} candidates of total ${totalCount}`)

        setCandidates(items)
        setTotal(totalCount)
        setHasMore(pageNum * per < totalCount)
        setLastFetched(new Date())
      } else {
        logger.error('Failed to fetch candidates:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        logger.error('Error details:', errorData)
      }
    } catch (error) {
      logger.error('Error fetching candidates:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize])

  const refreshCandidates = useCallback(async () => {
    logger.info("Refreshing candidates...")
    await fetchCandidates(1, pageSize)
    setCurrentPage(1)
  }, [fetchCandidates, pageSize])

  const loadMoreCandidates = useCallback(async () => {
    // Advance page if more results are available
    if (!hasMore) {
      logger.info("No more candidates to load")
      return
    }
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    await fetchCandidates(nextPage, pageSize)
  }, [hasMore, currentPage, pageSize, fetchCandidates])

  // Fetch on mount and when page/pageSize changes
  useEffect(() => {
    logger.info("CandidateProvider mounted or pagination changed, fetching candidates...")
    fetchCandidates(currentPage, pageSize)
  }, [fetchCandidates, currentPage, pageSize])

  const setPage = (page: number) => {
    setCurrentPage(page)
  }

  const value = {
    candidates,
    isLoading,
    hasMore,
    currentPage,
    pageSize,
    total,
    setPage,
    setPageSize,
    refreshCandidates,
    loadMoreCandidates,
    lastFetched,
  }

  logger.debug("Context value updated:", {
    candidatesCount: candidates.length,
    isLoading,
    lastFetched,
    currentPage,
    pageSize,
    total,
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
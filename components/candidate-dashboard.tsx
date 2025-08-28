"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Download, Eye, Filter, User, MapPin, Briefcase, Building, Trash2, RefreshCw, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CandidatePreviewDialog } from "./candidate-preview-dialog"
import { useCandidates } from "@/contexts/candidate-context"

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

export function CandidateDashboard() {
  const { 
    candidates, 
    isLoading, 
    refreshCandidates, 
    lastFetched
  } = useCandidates()
  
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("recent")
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [reparsingCandidates, setReparsingCandidates] = useState<Set<string>>(new Set())
  const [fixingAll, setFixingAll] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [updatingStatuses, setUpdatingStatuses] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  const filterCandidates = useCallback(() => {
    console.log("🔍 Filtering candidates:", { 
      totalCandidates: candidates.length, 
      searchTerm, 
      statusFilter,
      sortBy
    })
    
    let filtered = candidates

    if (searchTerm) {
      filtered = filtered.filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.currentRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.technicalSkills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase())) ||
          candidate.currentCompany?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((candidate) => candidate.status === statusFilter)
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          // Sort by upload date (newest first) - this should already be the default from API
          const dateA = new Date(a.uploadedAt || 0).getTime()
          const dateB = new Date(b.uploadedAt || 0).getTime()
          return dateB - dateA
        case "name":
          // Sort by name A-Z
          return (a.name || "").localeCompare(b.name || "")
        case "status":
          // Sort by status
          return (a.status || "").localeCompare(b.status || "")
        default:
          return 0
      }
    })

    console.log("✅ Filtered and sorted candidates:", filtered.length)
    setFilteredCandidates(filtered)
  }, [candidates, searchTerm, statusFilter, sortBy])

  useEffect(() => {
    if (mounted) {
      console.log("🎯 Component mounted, filtering candidates...")
      filterCandidates()
    }
  }, [mounted, filterCandidates])

  // Auto-refresh candidates every time the component is accessed
  useEffect(() => {
    if (mounted) {
      console.log("🔄 Auto-refreshing candidates...")
      refreshCandidates()
    }
  }, [mounted, refreshCandidates])

  // Debug logging
  useEffect(() => {
    console.log("📊 Candidates state updated:", {
      candidatesCount: candidates.length,
      filteredCount: filteredCandidates.length,
      isLoading,
      mounted
    })
  }, [candidates, filteredCandidates, isLoading, mounted])

  const updateCandidateStatus = async (candidateId: string, newStatus: string) => {
    try {
      // Add loading state
      setUpdatingStatuses(prev => new Set(prev).add(candidateId))
      
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state if needed
        if (selectedCandidate && selectedCandidate._id === candidateId) {
          setSelectedCandidate({ ...selectedCandidate, status: newStatus as any })
        }
        
        // Refresh candidates to get updated data
        await refreshCandidates()
        
        toast({
          title: "Status Updated",
          description: "Candidate status updated successfully",
        })
      } else {
        throw new Error("Failed to update status")
      }
    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive",
      })
    } finally {
      // Remove loading state
      setUpdatingStatuses(prev => {
        const newSet = new Set(prev)
        newSet.delete(candidateId)
        return newSet
      })
    }
  }

  const updateCandidateNotes = async (candidateId: string, notes: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })

      if (response.ok) {
        // Update selected candidate if it's the same one
        if (selectedCandidate && selectedCandidate._id === candidateId) {
          setSelectedCandidate({ ...selectedCandidate, notes })
        }
        
        // Refresh candidates to get updated data
        await refreshCandidates()
        
        toast({
          title: "Notes Updated",
          description: "Candidate notes updated successfully",
        })
      } else {
        throw new Error("Failed to update notes")
      }
    } catch (error) {
      console.error("Notes update error:", error)
      toast({
        title: "Error",
        description: "Failed to update candidate notes",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateCandidateRating = async (candidateId: string, rating: number) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      })

      if (response.ok) {
        // Update selected candidate if it's the same one
        if (selectedCandidate && selectedCandidate._id === candidateId) {
          setSelectedCandidate({ ...selectedCandidate, rating })
        }
        
        // Refresh candidates to get updated data
        await refreshCandidates()
        
        toast({
          title: "Rating Updated",
          description: "Candidate rating updated successfully",
        })
      } else {
        throw new Error("Failed to update rating")
      }
    } catch (error) {
      console.error("Rating update error:", error)
      toast({
        title: "Error",
        description: "Failed to update candidate rating",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteCandidate = async (candidateId: string, candidateName: string) => {
    if (!confirm(`Are you sure you want to delete ${candidateName}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Remove from local state if needed
        if (selectedCandidate && selectedCandidate._id === candidateId) {
          setSelectedCandidate(null)
        }
        toast({
          title: "Candidate Deleted",
          description: `${candidateName} has been deleted successfully`,
        })
      } else {
        throw new Error("Failed to delete candidate")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete candidate",
        variant: "destructive",
      })
    }
  }

  const reparseCandidate = async (candidateId: string, candidateName: string) => {
    if (!confirm(`Reparse ${candidateName}? This will attempt to extract better information from their resume.`)) {
      return
    }

    // Add to reparsing set immediately
    setReparsingCandidates(prev => new Set(prev).add(candidateId))

    try {
      const response = await fetch(`/api/candidates/${candidateId}/reparse`, {
        method: "POST",
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh the candidates list to show updated data
        await refreshCandidates()
        
        toast({
          title: "✅ Reparse Successful",
          description: result.message,
        })
      } else {
        // Handle specific error cases without throwing
        let errorMessage = "Failed to reparse candidate"
        let errorTitle = "❌ Reparse Failed"
        
        if (result.error === "No original file available for reparsing") {
          errorMessage = "This candidate's original resume file is not available in blob storage. Cannot reparse without the original file."
          errorTitle = "⚠️ Cannot Reparse"
        } else if (result.error === "Candidate not found") {
          errorMessage = "Candidate not found in database."
          errorTitle = "❌ Candidate Not Found"
        } else if (result.details) {
          errorMessage = result.details
        } else if (result.error) {
          errorMessage = result.error
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Reparse error:", error)
      toast({
        title: "❌ Reparse Failed",
        description: error instanceof Error ? error.message : "Failed to reparse candidate",
        variant: "destructive",
      })
    } finally {
      // Remove from reparsing set
      setReparsingCandidates(prev => {
        const newSet = new Set(prev)
        newSet.delete(candidateId)
        return newSet
      })
    }
  }

  const fixAllCandidates = async () => {
    const candidatesWithIssues = filteredCandidates.filter(hasParsingIssues)
    const candidatesThatCanReparse = candidatesWithIssues.filter(canReparse)
    const candidatesThatCannotReparse = candidatesWithIssues.filter(c => !canReparse(c))
    
    if (candidatesWithIssues.length === 0) {
      toast({
        title: "No Issues Found",
        description: "All candidates have been parsed correctly!",
      })
      return
    }

    let confirmMessage = `Reparse ${candidatesThatCanReparse.length} candidates with parsing issues?`
    if (candidatesThatCannotReparse.length > 0) {
      confirmMessage += `\n\nNote: ${candidatesThatCannotReparse.length} candidates cannot be reparsed (no original file available).`
    }
    confirmMessage += "\n\nThis may take a few minutes."

    if (!confirm(confirmMessage)) {
      return
    }

    if (candidatesThatCanReparse.length === 0) {
      toast({
        title: "No Candidates Can Be Reparsed",
        description: "All candidates with issues have no original file available for reparsing.",
        variant: "destructive",
      })
      return
    }

    setFixingAll(true)
    setBulkProgress({ current: 0, total: candidatesThatCanReparse.length })

    try {
      let successCount = 0
      let errorCount = 0
      let noResumeTextCount = 0

      for (let i = 0; i < candidatesThatCanReparse.length; i++) {
        const candidate = candidatesThatCanReparse[i]
        
        try {
          // Update progress
          setBulkProgress({ current: i + 1, total: candidatesThatCanReparse.length })
          
          // Add to reparsing set
          setReparsingCandidates(prev => new Set(prev).add(candidate._id))

          const response = await fetch(`/api/candidates/${candidate._id}/reparse`, {
            method: "POST",
          })

          const result = await response.json()

          if (response.ok) {
            successCount++
          } else {
            errorCount++
            if (result.error === "No original file available for reparsing") {
              noResumeTextCount++
            }
          }
        } catch (error) {
          errorCount++
          console.error(`Failed to reparse ${candidate.name}:`, error)
        } finally {
          // Remove from reparsing set
          setReparsingCandidates(prev => {
            const newSet = new Set(prev)
            newSet.delete(candidate._id)
            return newSet
          })
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Refresh candidates list
              await refreshCandidates()

      // Create detailed summary message
      let summaryMessage = `Successfully reparsed ${successCount} candidates.`
      if (errorCount > 0) {
        summaryMessage += ` ${errorCount} failed.`
        if (noResumeTextCount > 0) {
          summaryMessage += ` ${noResumeTextCount} had no original file available.`
        }
      }
      if (candidatesThatCannotReparse.length > 0) {
        summaryMessage += ` ${candidatesThatCannotReparse.length} candidates were skipped (no original file).`
      }

      toast({
        title: "Bulk Reparse Completed",
        description: summaryMessage,
        variant: errorCount > 0 ? "destructive" : "default",
      })

    } catch (error) {
      console.error("Bulk reparse error:", error)
      toast({
        title: "Bulk Reparse Failed",
        description: "An error occurred during bulk reparsing",
        variant: "destructive",
      })
    } finally {
      setFixingAll(false)
      setBulkProgress({ current: 0, total: 0 })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "reviewed":
        return "bg-yellow-100 text-yellow-800"
      case "shortlisted":
        return "bg-green-100 text-green-800"
      case "interviewed":
        return "bg-purple-100 text-purple-800"
      case "selected":
        return "bg-emerald-100 text-emerald-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "on-hold":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const hasParsingIssues = (candidate: Candidate) => {
    return !candidate.name || 
           candidate.name.toLowerCase() === "unknown" ||
           candidate.name.toLowerCase() === "not specified" ||
           candidate.name.trim() === "" ||
           candidate.name.length < 2 ||
           (!candidate.email && !candidate.phone && !candidate.currentRole) ||
           candidate.currentRole === "Not specified" ||
           candidate.location === "Not specified"
  }

  const canReparse = (candidate: Candidate) => {
    return candidate.driveFileUrl && candidate.driveFileUrl.length > 0
  }

  const getCandidateDisplayName = (candidate: Candidate) => {
    if (hasParsingIssues(candidate)) {
      return candidate.name || "Unknown Candidate"
    }
    return candidate.name
  }

  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!mounted) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Loading candidates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Candidate Database</h2>
          <p className="text-gray-600">Manage and review all uploaded candidates</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshCandidates}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              console.log("🧪 Testing API manually...")
              try {
                const response = await fetch('/api/candidates')
                const data = await response.json()
                console.log("🧪 Manual API test result:", data)
                toast({
                  title: "API Test",
                  description: `API returned ${Array.isArray(data) ? data.length : 'unknown'} candidates`,
                })
              } catch (error) {
                console.error("🧪 Manual API test failed:", error)
                toast({
                  title: "API Test Failed",
                  description: "Check console for details",
                  variant: "destructive",
                })
              }
            }}
            className="flex items-center space-x-2"
          >
            🧪 Test API
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              console.log("🔍 Checking debug info...")
              try {
                const response = await fetch('/api/debug')
                const data = await response.json()
                console.log("🔍 Debug info:", data)
                toast({
                  title: "Debug Info",
                  description: "Check console for environment variables",
                })
              } catch (error) {
                console.error("🔍 Debug check failed:", error)
                toast({
                  title: "Debug Failed",
                  description: "Check console for details",
                  variant: "destructive",
                })
              }
            }}
            className="flex items-center space-x-2"
          >
            🔍 Debug
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              console.log("🏥 Checking system health...")
              try {
                const response = await fetch('/api/health')
                const data = await response.json()
                console.log("🏥 Health check result:", data)
                toast({
                  title: "Health Check",
                  description: data.googleSheets.connected ? "System healthy" : "Google Sheets issue",
                  variant: data.googleSheets.connected ? "default" : "destructive",
                })
              } catch (error) {
                console.error("🏥 Health check failed:", error)
                toast({
                  title: "Health Check Failed",
                  description: "Check console for details",
                  variant: "destructive",
                })
              }
            }}
            className="flex items-center space-x-2"
          >
            🏥 Health
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            Grid
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            List
          </Button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, role, company, location, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="interviewed">Interviewed</SelectItem>
                <SelectItem value="selected">Selected</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{filteredCandidates.length}</span> of{" "}
            <span className="font-medium">{candidates.length}</span> candidates
          </p>
          {(() => {
            const issuesCount = filteredCandidates.filter(hasParsingIssues).length
            const canReparseCount = filteredCandidates.filter(hasParsingIssues).filter(canReparse).length
            const cannotReparseCount = filteredCandidates.filter(hasParsingIssues).filter(c => !canReparse(c)).length
            
            if (issuesCount > 0) {
              return (
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive" className="text-xs">
                    {issuesCount} candidates with parsing issues
                  </Badge>
                  {canReparseCount > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fixAllCandidates}
                      className="text-xs h-6 px-2"
                      disabled={fixingAll}
                    >
                      {fixingAll ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                          {bulkProgress.total > 0 ? `${bulkProgress.current}/${bulkProgress.total}` : "Fixing..."}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Fix All ({canReparseCount})
                        </>
                      )}
                    </Button>
                  )}
                  {cannotReparseCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {cannotReparseCount} no original file
                    </Badge>
                  )}
                </div>
              )
            }
            return null
          })()}
        </div>
        {filteredCandidates.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Candidates Display */}
      {filteredCandidates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {candidates.length === 0 ? "No candidates found" : "No candidates match your search"}
            </h3>
            <p className="text-gray-600 mb-4">
              {candidates.length === 0 
                ? "Upload some resumes to get started or check if the Google Sheets connection is working." 
                : "Try adjusting your search criteria or status filter."
              }
            </p>
            {candidates.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Total candidates in context: {candidates.length}
                </p>
                <p className="text-sm text-gray-500">
                  Loading state: {isLoading ? "Loading..." : "Not loading"}
                </p>
                <p className="text-sm text-gray-500">
                  Last fetched: {lastFetched ? lastFetched.toLocaleString() : "Never"}
                </p>
                <Button 
                  variant="outline" 
                  onClick={refreshCandidates}
                  disabled={isLoading}
                  className="mt-2"
                >
                  {isLoading ? "Loading..." : "Try Again"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((candidate, index) => (
              <Card 
                key={`${candidate._id}-${index}`}
                className="hover:shadow-lg transition-all duration-300 group max-w-sm"
              >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {getInitials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-gray-900 truncate ${hasParsingIssues(candidate) ? 'text-red-600' : ''}`}>
                        {getCandidateDisplayName(candidate)}
                      </h3>
                      <p className="text-sm text-gray-600 truncate max-w-full" title={candidate.currentRole}>
                        {truncateText(candidate.currentRole)}
                      </p>
                      {hasParsingIssues(candidate) && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Parsing Issues
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(candidate.status)} text-xs flex-shrink-0`}>{candidate.status}</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate" title={candidate.currentCompany || "Not specified"}>
                      {candidate.currentCompany || "Not specified"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate" title={candidate.location}>
                      {candidate.location}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate" title={candidate.totalExperience}>
                      {candidate.totalExperience}
                    </span>
                  </div>
                </div>

                {/* Skills Preview */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {candidate.technicalSkills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {candidate.technicalSkills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{candidate.technicalSkills.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedCandidate(candidate)}>
                      <Eye className="h-4 w-4" />
                    </Button>

                    {candidate.driveFileUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={candidate.driveFileUrl} download={candidate.fileName}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteCandidate(candidate._id, candidate.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => reparseCandidate(candidate._id, candidate.name)}
                      className={`${
                        canReparse(candidate) 
                          ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                      disabled={reparsingCandidates.has(candidate._id) || !canReparse(candidate)}
                      title={!canReparse(candidate) ? "No original file available for reparsing" : "Reparse candidate from original file"}
                    >
                      {reparsingCandidates.has(candidate._id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          Parsing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  <Select
                    value={candidate.status}
                    onValueChange={(value) => updateCandidateStatus(candidate._id, value)}
                    disabled={updatingStatuses.has(candidate._id)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      {updatingStatuses.has(candidate._id) ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          <span className="text-xs">Updating...</span>
                        </div>
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="shortlisted">Shortlisted</SelectItem>
                      <SelectItem value="interviewed">Interviewed</SelectItem>
                      <SelectItem value="selected">Selected</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // List View
                  <div className="space-y-4">
            {filteredCandidates.map((candidate, index) => (
              <Card 
                key={`${candidate._id}-${index}`}
                className="hover:shadow-md transition-shadow"
              >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {getInitials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className={`font-semibold text-gray-900 truncate ${hasParsingIssues(candidate) ? 'text-red-600' : ''}`}>
                          {getCandidateDisplayName(candidate)}
                        </h3>
                        <Badge className={`${getStatusColor(candidate.status)} text-xs flex-shrink-0`}>{candidate.status}</Badge>
                        {hasParsingIssues(candidate) && (
                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                            Parsing Issues
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 truncate" title={candidate.currentRole}>
                        {truncateText(candidate.currentRole)}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center min-w-0">
                          <Building className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate" title={candidate.currentCompany || "Not specified"}>
                            {candidate.currentCompany || "Not specified"}
                          </span>
                        </span>
                        <span className="flex items-center min-w-0">
                          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate" title={candidate.location}>
                            {candidate.location}
                          </span>
                        </span>
                        <span className="flex items-center min-w-0">
                          <Briefcase className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate" title={candidate.totalExperience}>
                            {candidate.totalExperience}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:block min-w-0">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(candidate.technicalSkills || []).slice(0, 4).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs truncate max-w-20">
                            {skill}
                          </Badge>
                        ))}
                        {(candidate.technicalSkills || []).length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{(candidate.technicalSkills || []).length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedCandidate(candidate)}>
                      <Eye className="h-4 w-4" />
                    </Button>

                    {candidate.driveFileUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={candidate.driveFileUrl} download={candidate.fileName}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteCandidate(candidate._id, candidate.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => reparseCandidate(candidate._id, candidate.name)}
                      className={`${
                        canReparse(candidate) 
                          ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                      disabled={reparsingCandidates.has(candidate._id) || !canReparse(candidate)}
                      title={!canReparse(candidate) ? "No original file available for reparsing" : "Reparse candidate from original file"}
                    >
                      {reparsingCandidates.has(candidate._id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          Parsing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <Select
                      value={candidate.status}
                      onValueChange={(value) => updateCandidateStatus(candidate._id, value)}
                      disabled={updatingStatuses.has(candidate._id)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        {updatingStatuses.has(candidate._id) ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            <span className="text-xs">Updating...</span>
                          </div>
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="interviewed">Interviewed</SelectItem>
                        <SelectItem value="selected">Selected</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        {/* Candidate Preview Dialog */}
        <CandidatePreviewDialog
        candidate={selectedCandidate}
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onStatusUpdate={updateCandidateStatus}
        onNotesUpdate={updateCandidateNotes}
        onRatingUpdate={updateCandidateRating}
      />
    </div>
  )
}

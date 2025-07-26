"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Download, Eye, Filter, User, MapPin, Briefcase, Building } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CandidatePreviewDialog } from "./candidate-preview-dialog"

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
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
    fetchCandidates()
  }, [])

  useEffect(() => {
    if (mounted) {
      filterCandidates()
    }
  }, [candidates, searchTerm, statusFilter, mounted])

  const fetchCandidates = async () => {
    try {
      const response = await fetch("/api/candidates")
      if (response.ok) {
        const data = await response.json()
        setCandidates(data)
      } else {
        throw new Error("Failed to fetch candidates")
      }
    } catch (error) {
      console.error("Fetch error:", error)
      toast({
        title: "Error",
        description: "Failed to fetch candidates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterCandidates = () => {
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

    setFilteredCandidates(filtered)
  }

  const updateCandidateStatus = async (candidateId: string, status: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setCandidates((prev) => prev.map((c) => (c._id === candidateId ? { ...c, status: status as any } : c)))
        // Update selected candidate if it's the same one
        if (selectedCandidate && selectedCandidate._id === candidateId) {
          setSelectedCandidate({ ...selectedCandidate, status: status as any })
        }
      } else {
        throw new Error("Failed to update status")
      }
    } catch (error) {
      throw error
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
        setCandidates((prev) => prev.map((c) => (c._id === candidateId ? { ...c, notes } : c)))
        // Update selected candidate if it's the same one
        if (selectedCandidate && selectedCandidate._id === candidateId) {
          setSelectedCandidate({ ...selectedCandidate, notes })
        }
      } else {
        throw new Error("Failed to update notes")
      }
    } catch (error) {
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
        setCandidates((prev) => prev.map((c) => (c._id === candidateId ? { ...c, rating } : c)))
        // Update selected candidate if it's the same one
        if (selectedCandidate && selectedCandidate._id === candidateId) {
          setSelectedCandidate({ ...selectedCandidate, rating })
        }
      } else {
        throw new Error("Failed to update rating")
      }
    } catch (error) {
      throw error
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      new: "bg-blue-100 text-blue-800 border-blue-200",
      reviewed: "bg-yellow-100 text-yellow-800 border-yellow-200",
      shortlisted: "bg-green-100 text-green-800 border-green-200",
      interviewed: "bg-purple-100 text-purple-800 border-purple-200",
      selected: "bg-emerald-100 text-emerald-800 border-emerald-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      "on-hold": "bg-gray-100 text-gray-800 border-gray-200",
    }
    return colors[status as keyof typeof colors] || colors.new
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

  if (loading) {
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
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{filteredCandidates.length}</span> of{" "}
          <span className="font-medium">{candidates.length}</span> candidates
        </p>
        {filteredCandidates.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Sort by:</span>
            <Select defaultValue="recent">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600">
              {candidates.length === 0 ? "Upload some resumes to get started." : "Try adjusting your search criteria."}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <Card key={candidate._id} className="hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {getInitials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{candidate.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{candidate.currentRole}</p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(candidate.status)} text-xs`}>{candidate.status}</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="h-4 w-4 mr-2" />
                    <span className="truncate">{candidate.currentCompany || "Not specified"}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{candidate.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Briefcase className="h-4 w-4 mr-2" />
                    <span>{candidate.totalExperience}</span>
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
                  </div>

                  <Select
                    value={candidate.status}
                    onValueChange={(value) => updateCandidateStatus(candidate._id, value)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
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
          {filteredCandidates.map((candidate) => (
            <Card key={candidate._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {getInitials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{candidate.name}</h3>
                        <Badge className={`${getStatusColor(candidate.status)} text-xs`}>{candidate.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{candidate.currentRole}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Building className="h-4 w-4 mr-1" />
                          {candidate.currentCompany || "Not specified"}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {candidate.location}
                        </span>
                        <span className="flex items-center">
                          <Briefcase className="h-4 w-4 mr-1" />
                          {candidate.totalExperience}
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:block">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(candidate.technicalSkills || []).slice(0, 4).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
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

                    <Select
                      value={candidate.status}
                      onValueChange={(value) => updateCandidateStatus(candidate._id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
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

"use client"

import { useState, useEffect } from "react"
import BulkImportUrls from "@/components/bulk-import-urls"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, FileText, TrendingUp, MapPin, Briefcase, Calendar, Download, RefreshCw, Eye, Database, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CandidatePreviewDialog } from "./candidate-preview-dialog"
import { logger } from "@/lib/logger"

interface AdminStats {
  totalResumes: number
  totalCandidates: number
  statusBreakdown: Record<string, number>
  roleBreakdown: Record<string, number>
  locationBreakdown: Record<string, number>
  recentUploads: Array<{
    _id: string
    id?: string
    name: string
    currentRole: string
    desiredRole?: string
    currentCompany?: string
    location: string
    preferredLocation?: string
    totalExperience: string
    currentSalary?: string
    expectedSalary?: string
    noticePeriod?: string
    highestQualification?: string
    degree?: string
    specialization?: string
    university?: string
    educationYear?: string
    educationPercentage?: string
    technicalSkills: string[]
    softSkills: string[]
    languagesKnown?: string[]
    certifications?: string[]
    previousCompanies?: string[]
    projects?: string[]
    awards?: string[]
    uploadedAt: string
    status: string
    email: string
    phone: string
    fileUrl?: string
    fileName?: string
    resumeText: string
    linkedinProfile?: string
    portfolioUrl?: string
    githubProfile?: string
    summary?: string
    notes?: string
    tags?: string[]
    rating?: number
  }>
}

export function AdminPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState("all")
  const [mounted, setMounted] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
    fetchStats()
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchStats()
    }
  }, [filterPeriod, mounted])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Use the Supabase API endpoint instead of Google Sheets
      const response = await fetch(`/api/admin/stats-supabase?period=${filterPeriod}`)
      if (response.ok) {
        const data = await response.json()

        // Ensure all array properties are properly initialized
        if (data.recentUploads) {
          data.recentUploads = data.recentUploads.map((upload: any) => ({
            ...upload,
            technicalSkills: upload.technicalSkills || [],
            softSkills: upload.softSkills || [],
            languagesKnown: upload.languagesKnown || [],
            certifications: upload.certifications || [],
            previousCompanies: upload.previousCompanies || [],
            projects: upload.projects || [],
            awards: upload.awards || [],
            tags: upload.tags || [],
          }))
        }

        setStats(data)
      } else {
        throw new Error("Failed to fetch stats")
      }
    } catch (error) {
      logger.error("Failed to fetch stats:", error)
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (type: string) => {
    try {
      // Use the Supabase API endpoint instead of Google Sheets
      const response = await fetch(`/api/admin/export-supabase?type=${type}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${type}_export_${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error("Failed to export data")
      }
    } catch (error) {
      logger.error("Failed to export data:", error)
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      })
    }
  }

  const realignAllData = async () => {
    try {
      // Use the Supabase API endpoint instead of Google Sheets
      const response = await fetch("/api/admin/realign-all-data-supabase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: result.message || "Data realignment completed successfully",
        })
        // Refresh stats after realignment
        fetchStats()
      } else {
        throw new Error("Failed to realign data")
      }
    } catch (error) {
      logger.error("Failed to realign data:", error)
      toast({
        title: "Error",
        description: "Failed to realign data",
        variant: "destructive",
      })
    }
  }

  const restoreMissingProfiles = async () => {
    try {
      // Use the Supabase API endpoint instead of Google Sheets
      const response = await fetch("/api/admin/restore-profiles-supabase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: result.message || "Profile restoration process completed",
        })
        // Refresh stats after restoration
        fetchStats()
      } else {
        throw new Error("Failed to restore profiles")
      }
    } catch (error) {
      logger.error("Failed to restore profiles:", error)
      toast({
        title: "Error",
        description: "Failed to restore missing profiles",
        variant: "destructive",
      })
    }
  }

  const updateCandidateStatus = async (candidateId: string, status: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        // Update the stats if needed
        if (stats) {
          const updatedUploads = stats.recentUploads.map((upload) =>
            upload._id === candidateId || upload.id === candidateId ? { ...upload, status } : upload,
          )
          setStats({ ...stats, recentUploads: updatedUploads })
        }
        // Update selected candidate if it's the same one
        if (selectedCandidate && (selectedCandidate._id === candidateId || selectedCandidate.id === candidateId)) {
          setSelectedCandidate({ ...selectedCandidate, status })
        }

        toast({
          title: "Success",
          description: "Candidate status updated successfully",
        })
      } else {
        throw new Error("Failed to update status")
      }
    } catch (error) {
      logger.error("Status update failed:", error)
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive",
      })
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
        // Update the stats if needed
        if (stats) {
          const updatedUploads = stats.recentUploads.map((upload) =>
            upload._id === candidateId || upload.id === candidateId ? { ...upload, notes } : upload,
          )
          setStats({ ...stats, recentUploads: updatedUploads })
        }
        // Update selected candidate if it's the same one
        if (selectedCandidate && (selectedCandidate._id === candidateId || selectedCandidate.id === candidateId)) {
          setSelectedCandidate({ ...selectedCandidate, notes })
        }

        toast({
          title: "Success",
          description: "Notes updated successfully",
        })
      } else {
        throw new Error("Failed to update notes")
      }
    } catch (error) {
      logger.error("Notes update failed:", error)
      toast({
        title: "Error",
        description: "Failed to update notes",
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
        // Update the stats if needed
        if (stats) {
          const updatedUploads = stats.recentUploads.map((upload) =>
            upload._id === candidateId || upload.id === candidateId ? { ...upload, rating } : upload,
          )
          setStats({ ...stats, recentUploads: updatedUploads })
        }
        // Update selected candidate if it's the same one
        if (selectedCandidate && (selectedCandidate._id === candidateId || selectedCandidate.id === candidateId)) {
          setSelectedCandidate({ ...selectedCandidate, rating })
        }

        toast({
          title: "Success",
          description: "Rating updated successfully",
        })
      } else {
        throw new Error("Failed to update rating")
      }
    } catch (error) {
      logger.error("Rating update failed:", error)
      toast({
        title: "Error",
        description: "Failed to update rating",
        variant: "destructive",
      })
      throw error
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleCandidateClick = (upload: any) => {
    // Transform the upload data to match CandidatePreviewDialog expectations
    const candidateData = {
      _id: upload._id,
      id: upload.id,
      name: upload.name || "",
      email: upload.email || "",
      phone: upload.phone || "",
      currentRole: upload.currentRole || "",
      desiredRole: upload.desiredRole || "",
      currentCompany: upload.currentCompany || "",
      location: upload.location || "",
      totalExperience: upload.totalExperience || "",
      highestQualification: upload.highestQualification || "",
      degree: upload.degree || "",
      university: upload.university || "",
      technicalSkills: Array.isArray(upload.technicalSkills) ? upload.technicalSkills : [],
      softSkills: Array.isArray(upload.softSkills) ? upload.softSkills : [],
      certifications: Array.isArray(upload.certifications) ? upload.certifications : [],
      resumeText: upload.resumeText || "",
      fileName: upload.fileName || "",
      fileUrl: upload.fileUrl || "",
      tags: Array.isArray(upload.tags) ? upload.tags : [],
      status: upload.status || "new",
      rating: upload.rating || 0,
      uploadedAt: upload.uploadedAt || "",
      linkedinProfile: upload.linkedinProfile || "",
      summary: upload.summary || "",
      notes: upload.notes || "",
    }

    setSelectedCandidate(candidateData)
  }

  if (!mounted) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Initializing...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Failed to load analytics data.</p>
        <Button onClick={fetchStats} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <div className="flex gap-2">
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="1d">Today</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={realignAllData}>
            <Database className="h-4 w-4 mr-2" />
            Realign Data
          </Button>
          <Button variant="outline" onClick={restoreMissingProfiles}>
            <Users className="h-4 w-4 mr-2" />
            Restore Profiles
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resumes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResumes}</div>
            <p className="text-xs text-muted-foreground">Uploaded resumes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">Unique candidates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.statusBreakdown.shortlisted || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for interview</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.statusBreakdown.selected || 0}</div>
            <p className="text-xs text-muted-foreground">Hired candidates</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <Badge className={getStatusColor(status)}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.roleBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([role, count]) => (
                  <div key={role} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{role}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Top Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.locationBreakdown)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([location, count]) => (
                <div key={location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{location}</span>
                  </div>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Uploads</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => exportData("candidates")}>
                <Download className="h-4 w-4 mr-2" />
                Export Candidates
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportData("analytics")}>
                <Download className="h-4 w-4 mr-2" />
                Export Analytics
              </Button>
              <Button variant="outline" size="sm" onClick={realignAllData}>
                <Database className="h-4 w-4 mr-2" />
                Fix Alignment
              </Button>
              <Button variant="outline" size="sm" onClick={restoreMissingProfiles}>
                <Users className="h-4 w-4 mr-2" />
                Restore Profiles
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentUploads.map((upload) => (
                <TableRow key={upload._id || upload.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {getInitials(upload.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{upload.name}</p>
                        <p className="text-sm text-gray-500">{upload.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{upload.currentRole}</TableCell>
                  <TableCell>{upload.location}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(upload.status)}>{upload.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {new Date(upload.uploadedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleCandidateClick(upload)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Candidate Preview Dialog */}
      <CandidatePreviewDialog
        candidate={selectedCandidate}
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onStatusUpdate={updateCandidateStatus}
        onNotesUpdate={updateCandidateNotes}
        onRatingUpdate={updateCandidateRating}
      />

      {/* Bulk Import URLs */}
      <BulkImportUrls />

    </div>
  )
}

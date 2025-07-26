"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Download,
  Copy,
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  Phone,
  Mail,
  Building,
  Award,
  Code,
  Heart,
  Globe,
  FileText,
  ExternalLink,
  Star,
  Edit,
  Save,
  X,
  Tag,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CandidateData {
  _id: string
  id?: string
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
  relevanceScore?: number
  matchingKeywords?: string[]
}

interface CandidatePreviewDialogProps {
  candidate: CandidateData | null
  isOpen: boolean
  onClose: () => void
  onStatusUpdate?: (candidateId: string, status: string) => Promise<void>
  onNotesUpdate?: (candidateId: string, notes: string) => Promise<void>
  onRatingUpdate?: (candidateId: string, rating: number) => Promise<void>
  showRelevanceScore?: boolean
}

export function CandidatePreviewDialog({
  candidate,
  isOpen,
  onClose,
  onStatusUpdate,
  onNotesUpdate,
  onRatingUpdate,
  showRelevanceScore = false,
}: CandidatePreviewDialogProps) {
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingStatus, setPendingStatus] = useState("")
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const [rating, setRating] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  // Initialize state when candidate changes
  // This effect ensures that `notes` and `rating` states are in sync with `candidate` props
  // when the dialog opens or the candidate data changes.
  // Using a direct assignment in the render function is generally discouraged for state updates,
  // but for initial sync on prop change, it's a common pattern with a guard.
  if (candidate && notes !== (candidate.notes || "")) {
    setNotes(candidate.notes || "")
  }
  if (candidate && rating !== (candidate.rating || 0)) {
    setRating(candidate.rating || 0)
  }

  if (!candidate) return null

  // Ensure all array properties have default values to prevent map errors
  const safeCandidate = {
    ...candidate,
    technicalSkills: Array.isArray(candidate.technicalSkills) ? candidate.technicalSkills : [],
    softSkills: Array.isArray(candidate.softSkills) ? candidate.softSkills : [],
    certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
    tags: Array.isArray(candidate.tags) ? candidate.tags : [],
    matchingKeywords: Array.isArray(candidate.matchingKeywords) ? candidate.matchingKeywords : [],
  }

  const candidateId = safeCandidate._id || safeCandidate.id || ""

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === safeCandidate.status) return
    setPendingStatus(newStatus)
    setShowStatusConfirm(true)
  }

  const confirmStatusChange = async () => {
    if (!onStatusUpdate) return
    setIsUpdating(true)
    try {
      await onStatusUpdate(candidateId, pendingStatus)
      toast({
        title: "Success",
        description: "Candidate status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
      setShowStatusConfirm(false)
      setPendingStatus("")
    }
  }

  const handleNotesUpdate = async () => {
    if (!onNotesUpdate) return
    setIsUpdating(true)
    try {
      await onNotesUpdate(candidateId, notes)
      setIsEditingNotes(false)
      toast({
        title: "Success",
        description: "Notes updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRatingUpdate = async (newRating: number) => {
    if (!onRatingUpdate) return
    setRating(newRating)
    setIsUpdating(true)
    try {
      await onRatingUpdate(candidateId, newRating)
      toast({
        title: "Success",
        description: "Rating updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update rating",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.8) return "High Match"
    if (score >= 0.6) return "Medium Match"
    return "Low Match"
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {getInitials(safeCandidate.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{safeCandidate.name}</h2>
                  <p className="text-gray-600">{safeCandidate.currentRole}</p>
                  {safeCandidate.currentCompany && (
                    <p className="text-sm text-gray-500">@ {safeCandidate.currentCompany}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {showRelevanceScore && safeCandidate.relevanceScore && (
                  <Badge className={`${getRelevanceColor(safeCandidate.relevanceScore)} font-medium`}>
                    {getRelevanceLabel(safeCandidate.relevanceScore)} ({Math.round(safeCandidate.relevanceScore * 100)}
                    %)
                  </Badge>
                )}
                <Badge className={`${getStatusColor(safeCandidate.status)} font-medium`}>{safeCandidate.status}</Badge>
                {onRatingUpdate && (
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 cursor-pointer transition-colors ${
                          star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
                        }`}
                        onClick={() => handleRatingUpdate(star)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Email</p>
                        <a href={`mailto:${safeCandidate.email}`} className="text-blue-600 hover:underline">
                          {safeCandidate.email}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Phone</p>
                        <a href={`tel:${safeCandidate.phone}`} className="text-blue-600 hover:underline">
                          {safeCandidate.phone}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-gray-600">{safeCandidate.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Professional Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Briefcase className="h-5 w-5 mr-2" />
                      Professional Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Current Role</p>
                      <p className="text-gray-600">{safeCandidate.currentRole}</p>
                    </div>
                    {safeCandidate.desiredRole && (
                      <div>
                        <p className="text-sm font-medium">Desired Role</p>
                        <p className="text-gray-600">{safeCandidate.desiredRole}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">Total Experience</p>
                      <p className="text-gray-600">{safeCandidate.totalExperience}</p>
                    </div>
                    {safeCandidate.currentCompany && (
                      <div>
                        <p className="text-sm font-medium">Current Company</p>
                        <p className="text-gray-600">{safeCandidate.currentCompany}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* System Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">File Name</p>
                      <p className="text-gray-600">{safeCandidate.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Uploaded</p>
                      <p className="text-gray-600">{new Date(safeCandidate.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <Badge className={getStatusColor(safeCandidate.status)}>{safeCandidate.status}</Badge>
                    </div>
                    {safeCandidate.rating && (
                      <div>
                        <p className="text-sm font-medium">Rating</p>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= safeCandidate.rating! ? "text-yellow-400 fill-current" : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Professional Summary Text */}
              {safeCandidate.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Professional Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{safeCandidate.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              {safeCandidate.tags && safeCandidate.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Tag className="h-5 w-5 mr-2" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {safeCandidate.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Social Links */}
              {safeCandidate.linkedinProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Globe className="h-5 w-5 mr-2" />
                      Online Presence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      <Button variant="outline" asChild>
                        <a href={safeCandidate.linkedinProfile} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          LinkedIn
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="professional" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Professional Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm font-medium">Current Role</p>
                        <p className="text-gray-600">{safeCandidate.currentRole}</p>
                      </div>
                      {safeCandidate.desiredRole && (
                        <div>
                          <p className="text-sm font-medium">Desired Role</p>
                          <p className="text-gray-600">{safeCandidate.desiredRole}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">Total Experience</p>
                        <p className="text-gray-600">{safeCandidate.totalExperience}</p>
                      </div>
                      {safeCandidate.currentCompany && (
                        <div>
                          <p className="text-sm font-medium">Current Company</p>
                          <p className="text-gray-600">{safeCandidate.currentCompany}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-gray-600">{safeCandidate.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">File Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">File Name</p>
                      <p className="text-gray-600">{safeCandidate.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Drive File URL</p>
                      {safeCandidate.driveFileUrl ? (
                        <a
                          href={safeCandidate.driveFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all"
                        >
                          View File
                        </a>
                      ) : (
                        <p className="text-gray-500">Not available</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Uploaded Date</p>
                      <p className="text-gray-600">{new Date(safeCandidate.uploadedAt).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="education" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <GraduationCap className="h-5 w-5 mr-2" />
                      Education Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {safeCandidate.highestQualification && (
                      <div>
                        <p className="text-sm font-medium">Highest Qualification</p>
                        <p className="text-gray-600">{safeCandidate.highestQualification}</p>
                      </div>
                    )}
                    {safeCandidate.degree && (
                      <div>
                        <p className="text-sm font-medium">Degree</p>
                        <p className="text-gray-600">{safeCandidate.degree}</p>
                      </div>
                    )}
                    {safeCandidate.university && (
                      <div>
                        <p className="text-sm font-medium">University/College</p>
                        <p className="text-gray-600">{safeCandidate.university}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {safeCandidate.certifications && safeCandidate.certifications.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Award className="h-5 w-5 mr-2" />
                        Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {safeCandidate.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="text-sm">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Code className="h-5 w-5 mr-2" />
                      Technical Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {safeCandidate.technicalSkills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant={
                            safeCandidate.matchingKeywords?.includes(skill.toLowerCase()) ? "default" : "secondary"
                          }
                          className={`text-sm ${
                            safeCandidate.matchingKeywords?.includes(skill.toLowerCase())
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : ""
                          }`}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Heart className="h-5 w-5 mr-2" />
                      Soft Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {safeCandidate.softSkills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {showRelevanceScore && safeCandidate.matchingKeywords && safeCandidate.matchingKeywords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Search Match Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium text-gray-700 mb-2">Matching Keywords</p>
                        <div className="flex flex-wrap gap-2">
                          {safeCandidate.matchingKeywords.map((keyword, index) => (
                            <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {safeCandidate.relevanceScore && (
                        <div>
                          <p className="font-medium text-gray-700 mb-2">Relevance Score</p>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${safeCandidate.relevanceScore * 100}%` }}
                              />
                            </div>
                            <span className="font-medium">{Math.round(safeCandidate.relevanceScore * 100)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="resume" className="space-y-4">
              {safeCandidate.driveFileUrl ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="flex items-center">
                          <FileText className="h-5 w-5 mr-2" />
                          Resume Preview
                        </span>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={safeCandidate.driveFileUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={safeCandidate.driveFileUrl} download={safeCandidate.fileName}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <iframe
                        src={safeCandidate.driveFileUrl}
                        className="w-full h-96 border rounded"
                        title="Resume Preview"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        Resume Content
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(safeCandidate.resumeText)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea value={safeCandidate.resumeText} readOnly className="min-h-[384px] text-sm" />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Resume file not available for preview</p>
                    {safeCandidate.resumeText && (
                      <div className="mt-4">
                        <Button variant="outline" onClick={() => copyToClipboard(safeCandidate.resumeText)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Resume Text
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Current Status</p>
                      <Badge className={`${getStatusColor(safeCandidate.status)} font-medium`}>
                        {safeCandidate.status}
                      </Badge>
                    </div>
                    {onStatusUpdate && (
                      <div>
                        <p className="text-sm font-medium mb-2">Change Status</p>
                        <Select value={safeCandidate.status} onValueChange={handleStatusChange}>
                          <SelectTrigger>
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
                    )}
                  </CardContent>
                </Card>

                {/* Notes Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Notes
                      {onNotesUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingNotes(!isEditingNotes)}
                          disabled={isUpdating}
                        >
                          {isEditingNotes ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditingNotes ? (
                      <div className="space-y-3">
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add notes about this candidate..."
                          className="min-h-[100px]"
                        />
                        <div className="flex space-x-2">
                          <Button onClick={handleNotesUpdate} disabled={isUpdating} size="sm">
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditingNotes(false)
                              setNotes(safeCandidate.notes || "")
                            }}
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-[100px] p-3 bg-gray-50 rounded border">
                        {safeCandidate.notes || notes || "No notes added yet."}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <a href={`mailto:${safeCandidate.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`tel:${safeCandidate.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </a>
                    </Button>
                    {safeCandidate.driveFileUrl && (
                      <Button variant="outline" asChild>
                        <a href={safeCandidate.driveFileUrl} download={safeCandidate.fileName}>
                          <Download className="h-4 w-4 mr-2" />
                          Download Resume
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => copyToClipboard(safeCandidate.resumeText)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Resume Text
                    </Button>
                    {safeCandidate.linkedinProfile && (
                      <Button variant="outline" asChild>
                        <a href={safeCandidate.linkedinProfile} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {isUpdating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
              {isUpdating ? "Updating Status..." : "Confirm Status Change"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isUpdating ? (
                <span className="flex items-center gap-2 text-blue-600">
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></span>
                  Updating status for <strong>{safeCandidate.name}</strong>...
                </span>
              ) : (
                <>
                  Are you sure you want to change the status of <strong>{safeCandidate.name}</strong> from{" "}
                  <strong>{safeCandidate.status}</strong> to <strong>{pendingStatus}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>{isUpdating ? "Please wait..." : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={isUpdating}
              className={isUpdating ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isUpdating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  Updating...
                </span>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

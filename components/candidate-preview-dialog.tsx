"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
  Calendar,
  Clock,
  Target,
  BookOpen,
  Trophy,
  Zap,
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
  keyAchievements?: string[]
  workExperience?: Array<{
    company: string
    role: string
    duration: string
    description: string
    responsibilities?: string[]
    achievements?: string[]
    technologies?: string[]
  }>
  education?: Array<{
    degree: string
    specialization: string
    institution: string
    year: string
    percentage: string
    grade?: string
    coursework?: string[]
    projects?: string[]
  }>
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
  const [rating, setRating] = useState(candidate?.rating || 0)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  // Initialize state when candidate changes
  useEffect(() => {
    if (candidate) {
      setNotes(candidate.notes || "")
      setRating(candidate.rating || 0)
    }
  }, [candidate])

  if (!candidate) return null

  // Ensure all array properties have default values to prevent map errors
  const safeCandidate = {
    ...candidate,
    technicalSkills: Array.isArray(candidate.technicalSkills) ? candidate.technicalSkills : [],
    softSkills: Array.isArray(candidate.softSkills) ? candidate.softSkills : [],
    certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
    keyAchievements: Array.isArray(candidate.keyAchievements) ? candidate.keyAchievements : [],
    workExperience: Array.isArray(candidate.workExperience) ? candidate.workExperience : [],
    education: Array.isArray(candidate.education) ? candidate.education : [],
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

  const formatExperience = (experience: any): string => {
    if (typeof experience === 'string') {
      return experience
    }
    if (typeof experience === 'object' && experience !== null) {
      if (experience.years) return `${experience.years} years`
      if (experience.total) return `${experience.total} years`
      if (experience.text) return experience.text
      return JSON.stringify(experience)
    }
    return experience?.toString() || "Not specified"
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                    {getInitials(safeCandidate.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">{safeCandidate.name}</h2>
                  <p className="text-lg text-gray-600 font-medium">{safeCandidate.currentRole}</p>
                  {safeCandidate.currentCompany && (
                    <p className="text-sm text-gray-500">@ {safeCandidate.currentCompany}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {showRelevanceScore && safeCandidate.relevanceScore && (
                  <Badge className={`${getRelevanceColor(safeCandidate.relevanceScore)} font-medium text-sm px-3 py-1`}>
                    {getRelevanceLabel(safeCandidate.relevanceScore)} ({Math.round(safeCandidate.relevanceScore * 100)}%)
                  </Badge>
                )}
                <Badge className={`${getStatusColor(safeCandidate.status)} font-medium text-sm px-3 py-1`}>
                  {safeCandidate.status.toUpperCase()}
                </Badge>
                {onRatingUpdate && (
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-6 w-6 cursor-pointer transition-all duration-200 hover:scale-110 ${
                          star <= rating ? "text-yellow-400 fill-current" : "text-gray-300 hover:text-yellow-200"
                        }`}
                        onClick={() => handleRatingUpdate(star)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="professional" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Professional
                </TabsTrigger>
                <TabsTrigger value="education" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Education
                </TabsTrigger>
                <TabsTrigger value="skills" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Skills
                </TabsTrigger>
                <TabsTrigger value="resume" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume
                </TabsTrigger>
                <TabsTrigger value="actions" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Actions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Contact Information */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center text-blue-700">
                        <User className="h-5 w-5 mr-2" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Email</p>
                          <a href={`mailto:${safeCandidate.email}`} className="text-blue-600 hover:underline font-medium">
                            {safeCandidate.email}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Phone</p>
                          <a href={`tel:${safeCandidate.phone}`} className="text-blue-600 hover:underline font-medium">
                            {safeCandidate.phone}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="h-5 w-5 text-red-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Location</p>
                          <p className="text-gray-600 font-medium">{safeCandidate.location}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Professional Summary */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center text-purple-700">
                        <Briefcase className="h-5 w-5 mr-2" />
                        Professional Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Current Role</p>
                        <p className="text-gray-800 font-semibold">{safeCandidate.currentRole}</p>
                      </div>
                      {safeCandidate.desiredRole && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700">Desired Role</p>
                          <p className="text-gray-800 font-semibold">{safeCandidate.desiredRole}</p>
                        </div>
                      )}
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Total Experience</p>
                        <p className="text-gray-800 font-semibold">{formatExperience(safeCandidate.totalExperience)}</p>
                      </div>
                      {safeCandidate.currentCompany && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700">Current Company</p>
                          <p className="text-gray-800 font-semibold">{safeCandidate.currentCompany}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* System Information */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center text-green-700">
                        <FileText className="h-5 w-5 mr-2" />
                        System Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">File Name</p>
                        <p className="text-gray-800 font-medium truncate" title={safeCandidate.fileName}>
                          {safeCandidate.fileName}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Uploaded</p>
                        <p className="text-gray-800 font-medium">
                          {new Date(safeCandidate.uploadedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Status</p>
                        <Badge className={`${getStatusColor(safeCandidate.status)} mt-1`}>
                          {safeCandidate.status.toUpperCase()}
                        </Badge>
                      </div>
                      {safeCandidate.rating && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700">Rating</p>
                          <div className="flex items-center mt-1">
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
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center text-gray-800">
                        <BookOpen className="h-6 w-6 mr-2" />
                        Professional Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <p className="text-gray-700 leading-relaxed text-base">{safeCandidate.summary}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tags */}
                {safeCandidate.tags && safeCandidate.tags.length > 0 && (
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center text-indigo-700">
                        <Tag className="h-5 w-5 mr-2" />
                        Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {safeCandidate.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="px-3 py-1 text-sm bg-indigo-50 border-indigo-200 text-indigo-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Social Links */}
                {safeCandidate.linkedinProfile && (
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center text-blue-700">
                        <Globe className="h-5 w-5 mr-2" />
                        Online Presence
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" asChild className="hover:bg-blue-50">
                        <a href={safeCandidate.linkedinProfile} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          LinkedIn Profile
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="professional" className="space-y-6">
                {/* Current Professional Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center text-purple-700">
                        <Building className="h-6 w-6 mr-2" />
                        Current Professional Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                          <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Current Role</p>
                          <p className="text-gray-800 font-bold text-lg mt-1">{safeCandidate.currentRole}</p>
                        </div>
                        {safeCandidate.desiredRole && (
                          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Desired Role</p>
                            <p className="text-gray-800 font-bold text-lg mt-1">{safeCandidate.desiredRole}</p>
                          </div>
                        )}
                        <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                          <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Total Experience</p>
                          <p className="text-gray-800 font-bold text-lg mt-1">{formatExperience(safeCandidate.totalExperience)}</p>
                        </div>
                        {safeCandidate.currentCompany && (
                          <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                            <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Current Company</p>
                            <p className="text-gray-800 font-bold text-lg mt-1">{safeCandidate.currentCompany}</p>
                          </div>
                        )}
                        <div className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-400">
                          <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">Location</p>
                          <p className="text-gray-800 font-bold text-lg mt-1">{safeCandidate.location}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center text-gray-700">
                        <FileText className="h-6 w-6 mr-2" />
                        File Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">File Name</p>
                        <p className="text-gray-800 font-medium mt-1 break-all">{safeCandidate.fileName}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Drive File URL</p>
                        {safeCandidate.driveFileUrl ? (
                          <a
                            href={safeCandidate.driveFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium mt-1 block break-all"
                          >
                            View Original File
                          </a>
                        ) : (
                          <p className="text-gray-500 mt-1">Not available</p>
                        )}
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Uploaded Date</p>
                        <p className="text-gray-800 font-medium mt-1">
                          {new Date(safeCandidate.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Complete Work Experience History */}
                {safeCandidate.workExperience && safeCandidate.workExperience.length > 0 && (
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center text-blue-700">
                        <Briefcase className="h-7 w-7 mr-3" />
                        Complete Work Experience History
                        <Badge className="ml-3 bg-blue-100 text-blue-800">
                          {safeCandidate.workExperience.length} {safeCandidate.workExperience.length === 1 ? 'Position' : 'Positions'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-8">
                        {safeCandidate.workExperience.map((experience, index) => (
                          <div key={index} className="relative">
                            {/* Timeline connector */}
                            {index < safeCandidate.workExperience!.length - 1 && (
                              <div className="absolute left-6 top-16 w-0.5 h-full bg-blue-200"></div>
                            )}
                            
                            <div className="flex items-start space-x-4">
                              {/* Timeline dot */}
                              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {index + 1}
                              </div>
                              
                              {/* Experience content */}
                              <div className="flex-1 bg-white border-2 border-blue-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{experience.role}</h3>
                                    <p className="text-xl text-blue-600 font-semibold mb-1">{experience.company}</p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-5 w-5 text-gray-500" />
                                    <Badge variant="outline" className="text-base px-3 py-1 bg-blue-50 border-blue-200 text-blue-700 font-medium">
                                      {experience.duration}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {experience.description && (
                                  <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
                                      <FileText className="h-5 w-5 mr-2" />
                                      Role Description
                                    </h4>
                                    <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400">
                                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{experience.description}</p>
                                    </div>
                                  </div>
                                )}

                                {experience.responsibilities && experience.responsibilities.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                                      <Target className="h-5 w-5 mr-2" />
                                      Key Responsibilities
                                    </h4>
                                    <ul className="space-y-2">
                                      {experience.responsibilities.map((responsibility, respIndex) => (
                                        <li key={respIndex} className="flex items-start">
                                          <span className="text-blue-500 mr-3 mt-1">•</span>
                                          <span className="text-gray-700 leading-relaxed">{responsibility}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {experience.achievements && experience.achievements.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                                      <Trophy className="h-5 w-5 mr-2" />
                                      Key Achievements
                                    </h4>
                                    <ul className="space-y-2">
                                      {experience.achievements.map((achievement, achIndex) => (
                                        <li key={achIndex} className="flex items-start">
                                          <span className="text-green-500 mr-3 mt-1">★</span>
                                          <span className="text-gray-700 leading-relaxed">{achievement}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {experience.technologies && experience.technologies.length > 0 && (
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                                      <Code className="h-5 w-5 mr-2" />
                                      Technologies Used
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {experience.technologies.map((tech, techIndex) => (
                                        <Badge key={techIndex} variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                                          {tech}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Key Achievements */}
                {safeCandidate.keyAchievements && safeCandidate.keyAchievements.length > 0 && (
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center text-gold-700">
                        <Award className="h-7 w-7 mr-3" />
                        Key Career Achievements
                        <Badge className="ml-3 bg-yellow-100 text-yellow-800">
                          {safeCandidate.keyAchievements.length} Achievements
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4">
                        {safeCandidate.keyAchievements.map((achievement, index) => (
                          <div key={index} className="flex items-start p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-l-4 border-yellow-400">
                            <Trophy className="h-6 w-6 text-yellow-600 mr-3 mt-1 flex-shrink-0" />
                            <span className="text-gray-700 font-medium leading-relaxed">{achievement}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="education" className="space-y-6">
                {/* Basic Education Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center text-green-700">
                        <GraduationCap className="h-6 w-6 mr-2" />
                        Basic Education Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {safeCandidate.highestQualification && (
                        <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                          <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Highest Qualification</p>
                          <p className="text-gray-800 font-bold text-lg mt-1">{safeCandidate.highestQualification}</p>
                        </div>
                      )}
                      {safeCandidate.degree && (
                        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Primary Degree</p>
                          <p className="text-gray-800 font-bold text-lg mt-1">{safeCandidate.degree}</p>
                        </div>
                      )}
                      {safeCandidate.university && (
                        <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                          <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Primary Institution</p>
                          <p className="text-gray-800 font-bold text-lg mt-1">{safeCandidate.university}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {safeCandidate.certifications && safeCandidate.certifications.length > 0 && (
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center text-orange-700">
                          <Award className="h-6 w-6 mr-2" />
                          Certifications & Credentials
                          <Badge className="ml-3 bg-orange-100 text-orange-800">
                            {safeCandidate.certifications.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-3">
                          {safeCandidate.certifications.map((cert, index) => (
                            <div key={index} className="flex items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <Award className="h-5 w-5 text-orange-600 mr-3 flex-shrink-0" />
                              <span className="text-gray-800 font-medium">{cert}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Complete Education History */}
                {safeCandidate.education && safeCandidate.education.length > 0 && (
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center text-green-700">
                        <GraduationCap className="h-7 w-7 mr-3" />
                        Complete Education History
                        <Badge className="ml-3 bg-green-100 text-green-800">
                          {safeCandidate.education.length} {safeCandidate.education.length === 1 ? 'Degree' : 'Degrees'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-8">
                        {safeCandidate.education.map((edu, index) => (
                          <div key={index} className="relative">
                            {/* Timeline connector */}
                            {index < safeCandidate.education!.length - 1 && (
                              <div className="absolute left-6 top-16 w-0.5 h-full bg-green-200"></div>
                            )}
                            
                            <div className="flex items-start space-x-4">
                              {/* Timeline dot */}
                              <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {index + 1}
                              </div>
                              
                              {/* Education content */}
                              <div className="flex-1 bg-white border-2 border-green-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{edu.degree}</h3>
                                    {edu.specialization && (
                                      <p className="text-xl text-green-600 font-semibold mb-2">{edu.specialization}</p>
                                    )}
                                    <p className="text-lg text-gray-600 font-medium">{edu.institution}</p>
                                  </div>
                                  <div className="text-right space-y-2">
                                    {edu.year && (
                                      <div className="flex items-center space-x-2">
                                        <Calendar className="h-5 w-5 text-gray-500" />
                                        <Badge variant="outline" className="text-base px-3 py-1 bg-green-50 border-green-200 text-green-700 font-medium">
                                          {edu.year}
                                        </Badge>
                                      </div>
                                    )}
                                    {edu.percentage && (
                                      <div className="flex items-center space-x-2">
                                        <Zap className="h-5 w-5 text-gray-500" />
                                        <Badge className="bg-yellow-100 text-yellow-800 text-sm font-semibold">
                                          {edu.percentage}
                                        </Badge>
                                      </div>
                                    )}
                                    {edu.grade && (
                                      <div className="flex items-center space-x-2">
                                        <Star className="h-5 w-5 text-gray-500" />
                                        <Badge className="bg-blue-100 text-blue-800 text-sm font-semibold">
                                          {edu.grade}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {edu.coursework && edu.coursework.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                                      <BookOpen className="h-5 w-5 mr-2" />
                                      Key Coursework
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {edu.coursework.map((course, courseIndex) => (
                                        <Badge key={courseIndex} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-sm">
                                          {course}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {edu.projects && edu.projects.length > 0 && (
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                                      <Code className="h-5 w-5 mr-2" />
                                      Academic Projects
                                    </h4>
                                    <ul className="space-y-2">
                                      {edu.projects.map((project, projIndex) => (
                                        <li key={projIndex} className="flex items-start">
                                          <span className="text-green-500 mr-3 mt-1">▶</span>
                                          <span className="text-gray-700 leading-relaxed">{project}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="skills" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center text-blue-700">
                        <Code className="h-6 w-6 mr-2" />
                        Technical Skills
                        <Badge className="ml-3 bg-blue-100 text-blue-800">
                          {safeCandidate.technicalSkills.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        {safeCandidate.technicalSkills.map((skill, index) => (
                          <Badge
                            key={index}
                            variant={
                              safeCandidate.matchingKeywords?.includes(skill.toLowerCase()) ? "default" : "secondary"
                            }
                            className={`text-sm px-3 py-1 font-medium ${
                              safeCandidate.matchingKeywords?.includes(skill.toLowerCase())
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center text-pink-700">
                        <Heart className="h-6 w-6 mr-2" />
                        Soft Skills
                        <Badge className="ml-3 bg-pink-100 text-pink-800">
                          {safeCandidate.softSkills.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        {safeCandidate.softSkills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-sm px-3 py-1 bg-pink-50 border-pink-200 text-pink-700 font-medium">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {showRelevanceScore && safeCandidate.matchingKeywords && safeCandidate.matchingKeywords.length > 0 && (
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl text-green-700">Search Match Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3 text-lg">Matching Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {safeCandidate.matchingKeywords.map((keyword, index) => (
                              <Badge key={index} variant="default" className="bg-green-600 text-white px-3 py-1 shadow-md">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {safeCandidate.relevanceScore && (
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3 text-lg">Relevance Score</h4>
                            <div className="flex items-center space-x-4">
                              <div className="flex-1 bg-gray-200 rounded-full h-4">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500 shadow-inner"
                                  style={{ width: `${safeCandidate.relevanceScore * 100}%` }}
                                />
                              </div>
                              <span className="font-bold text-xl text-gray-800">
                                {Math.round(safeCandidate.relevanceScore * 100)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="resume" className="space-y-6">
                {safeCandidate.driveFileUrl ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center justify-between">
                          <span className="flex items-center text-blue-700">
                            <FileText className="h-6 w-6 mr-2" />
                            Resume Preview
                          </span>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" asChild className="hover:bg-blue-50">
                              <a href={safeCandidate.driveFileUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Full
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild className="hover:bg-green-50">
                              <a href={safeCandidate.driveFileUrl} download={safeCandidate.fileName}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                          <iframe
                            src={safeCandidate.driveFileUrl}
                            className="w-full h-[500px]"
                            title="Resume Preview"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center justify-between">
                          <span className="text-gray-700">Resume Content</span>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(safeCandidate.resumeText)} className="hover:bg-gray-50">
                            <Copy className="h-4 w-4 mr-2" />
                            Copy All
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[500px] w-full border rounded-lg p-4 bg-gray-50">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                            {safeCandidate.resumeText}
                          </pre>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="shadow-md">
                    <CardContent className="p-12 text-center">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">Resume file not available for preview</h3>
                      <p className="text-gray-500 mb-6">The original resume file cannot be displayed, but you can still access the extracted text content.</p>
                      {safeCandidate.resumeText && (
                        <div className="space-y-4">
                          <Button variant="outline" onClick={() => copyToClipboard(safeCandidate.resumeText)} className="hover:bg-blue-50">
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Resume Text Content
                          </Button>
                          <Card className="mt-6">
                            <CardHeader>
                              <CardTitle className="text-lg">Extracted Resume Text</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ScrollArea className="h-64 w-full border rounded-lg p-4 bg-gray-50">
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap">{safeCandidate.resumeText}</pre>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status Management */}
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl text-purple-700">Status Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Current Status</p>
                        <Badge className={`${getStatusColor(safeCandidate.status)} font-semibold text-base px-4 py-2`}>
                          {safeCandidate.status.toUpperCase()}
                        </Badge>
                      </div>
                      {onStatusUpdate && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Change Status</p>
                          <Select value={safeCandidate.status} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-full">
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
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center justify-between text-green-700">
                        Notes & Comments
                        {onNotesUpdate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingNotes(!isEditingNotes)}
                            disabled={isUpdating}
                            className="hover:bg-green-50"
                          >
                            {isEditingNotes ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isEditingNotes ? (
                        <div className="space-y-4">
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add your notes about this candidate..."
                            className="min-h-[120px] text-base"
                          />
                          <div className="flex space-x-3">
                            <Button onClick={handleNotesUpdate} disabled={isUpdating} className="bg-green-600 hover:bg-green-700">
                              <Save className="h-4 w-4 mr-2" />
                              Save Notes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditingNotes(false)
                                setNotes(safeCandidate.notes || "")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="min-h-[120px] p-4 bg-gray-50 rounded-lg border text-base">
                          {safeCandidate.notes || notes || (
                            <span className="text-gray-400 italic">No notes added yet. Click the edit button to add notes about this candidate.</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl text-blue-700">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Button asChild className="h-12 bg-blue-600 hover:bg-blue-700">
                        <a href={`mailto:${safeCandidate.email}`}>
                          <Mail className="h-5 w-5 mr-2" />
                          Send Email
                        </a>
                      </Button>
                      <Button variant="outline" asChild className="h-12 hover:bg-green-50">
                        <a href={`tel:${safeCandidate.phone}`}>
                          <Phone className="h-5 w-5 mr-2" />
                          Call
                        </a>
                      </Button>
                      {safeCandidate.driveFileUrl && (
                        <Button variant="outline" asChild className="h-12 hover:bg-purple-50">
                          <a href={safeCandidate.driveFileUrl} download={safeCandidate.fileName}>
                            <Download className="h-5 w-5 mr-2" />
                            Download
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => copyToClipboard(safeCandidate.resumeText)} className="h-12 hover:bg-orange-50">
                        <Copy className="h-5 w-5 mr-2" />
                        Copy Text
                      </Button>
                      {safeCandidate.linkedinProfile && (
                        <Button variant="outline" asChild className="h-12 hover:bg-blue-50 col-span-2 lg:col-span-1">
                          <a href={safeCandidate.linkedinProfile} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-5 w-5 mr-2" />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
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
                  <strong className="uppercase">{safeCandidate.status}</strong> to <strong className="uppercase">{pendingStatus}</strong>?
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
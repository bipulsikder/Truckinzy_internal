"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sparkles,
  FileText,
  Copy,
  Download,
  Building,
  MapPin,
  Briefcase,
  Code,
  Heart,
  CheckCircle,
  DollarSign,
  Target,
  Award,
  Zap,
  Database,
  Search,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EnhancedJobDescription {
  title: string
  company: string
  location: string
  type: string
  experience: string
  salary?: string
  description: string
  responsibilities: string[]
  requirements: string[]
  skills: string[]
  benefits: string[]
  matchedCandidates: number
  databaseInsights: string[]
}

export function JDGenerator() {
  const [jobDescription, setJobDescription] = useState<EnhancedJobDescription | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [customInputs, setCustomInputs] = useState({
    jobTitle: "",
    company: "",
    location: "",
    experience: "",
    salaryRange: "",
    additionalRequirements: "",
  })

  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  const generateJobDescription = async () => {
    if (!customInputs.jobTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a job title",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customInputs,
          useEmbeddings: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate job description")
      }

      const data = await response.json()
      setJobDescription(data.jobDescription)

      toast({
        title: "Success",
        description: `Job description generated successfully! Found ${data.jobDescription.matchedCandidates} similar profiles in database.`,
      })
    } catch (error) {
      console.error("Generation error:", error)
      toast({
        title: "Error",
        description: "Failed to generate job description. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: "Job description copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const downloadJobDescription = () => {
    if (!jobDescription) return

    const content = `JOB DESCRIPTION

Title: ${jobDescription.title}
Company: ${jobDescription.company}
Location: ${jobDescription.location}
Type: ${jobDescription.type}
Experience: ${jobDescription.experience}
${jobDescription.salary ? `Salary: ${jobDescription.salary}` : ""}

DESCRIPTION:
${jobDescription.description}

RESPONSIBILITIES:
${jobDescription.responsibilities.map((r, i) => `${i + 1}. ${r}`).join("\n")}

REQUIREMENTS:
${jobDescription.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

REQUIRED SKILLS:
${jobDescription.skills.join(", ")}

BENEFITS:
${jobDescription.benefits.map((b, i) => `${i + 1}. ${b}`).join("\n")}

DATABASE INSIGHTS:
${jobDescription.databaseInsights.map((insight, i) => `• ${insight}`).join("\n")}
`.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${jobDescription.title.replace(/\s+/g, "_")}_JD.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!mounted) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Sparkles className="h-8 w-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-gray-900">AI Job Description Generator</h2>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Generate tailored job descriptions using AI and your candidate database. Our system automatically analyzes
          similar roles to create accurate, industry-specific JDs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Job Details Only */}
        <div className="space-y-6">
          {/* Job Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Job Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g., Fleet Incharge, Senior Fleet Manager"
                    value={customInputs.jobTitle}
                    onChange={(e) => setCustomInputs({ ...customInputs, jobTitle: e.target.value })}
                    className="font-medium"
                  />
                  <div className="flex items-center space-x-2 mt-2 text-xs text-blue-600">
                    <Database className="h-3 w-3" />
                    <span>AI will automatically search candidate database for similar roles</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Truckinzy Logistics"
                    value={customInputs.company}
                    onChange={(e) => setCustomInputs({ ...customInputs, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Delhi, India"
                    value={customInputs.location}
                    onChange={(e) => setCustomInputs({ ...customInputs, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience">Experience Required</Label>
                  <Select
                    value={customInputs.experience}
                    onValueChange={(value) => setCustomInputs({ ...customInputs, experience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-2 years">0-2 years</SelectItem>
                      <SelectItem value="2-5 years">2-5 years</SelectItem>
                      <SelectItem value="5-8 years">5-8 years</SelectItem>
                      <SelectItem value="8+ years">8+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="salaryRange">CTC / Salary Package</Label>
                  <Input
                    id="salaryRange"
                    placeholder="e.g., ₹5-8 LPA, $50k-70k"
                    value={customInputs.salaryRange}
                    onChange={(e) => setCustomInputs({ ...customInputs, salaryRange: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="additionalRequirements">Additional Requirements</Label>
                <Textarea
                  id="additionalRequirements"
                  placeholder="Any specific requirements, certifications, or preferences..."
                  value={customInputs.additionalRequirements}
                  onChange={(e) => setCustomInputs({ ...customInputs, additionalRequirements: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Database Search Preview */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Search className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Candidate Database Analysis</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    When you enter a job title, our AI will automatically search your candidate database for similar
                    roles and extract relevant experience, skills, and responsibilities using Gemini AI.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-700">Embedding-based role matching</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-700">Skills & experience extraction</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-700">Industry-specific insights</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-700">Gemini AI refinement</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={generateJobDescription}
            disabled={isGenerating || !customInputs.jobTitle.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                Analyzing Database & Generating JD...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Generate Smart Job Description
              </>
            )}
          </Button>
        </div>

        {/* Right Column - Generated Job Description */}
        <div className="space-y-6">
          {jobDescription ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Generated Job Description
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(jobDescription, null, 2))}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadJobDescription}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Job Header */}
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-gray-900">{jobDescription.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Building className="h-4 w-4 mr-1" />
                      {jobDescription.company}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {jobDescription.location}
                    </span>
                    <span className="flex items-center">
                      <Briefcase className="h-4 w-4 mr-1" />
                      {jobDescription.experience}
                    </span>
                    {jobDescription.salary && (
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {jobDescription.salary}
                      </span>
                    )}
                  </div>

                  {/* Database Insights */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-900 mb-2 flex items-center">
                      <Database className="h-4 w-4 mr-2" />
                      Database Analysis Results ({jobDescription.matchedCandidates} similar profiles found)
                    </p>
                    <div className="text-xs text-green-800 space-y-1">
                      {jobDescription.databaseInsights.map((insight, index) => (
                        <p key={index}>• {insight}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Job Description */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Job Description
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{jobDescription.description}</p>
                </div>

                <Separator />

                {/* Responsibilities */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Key Responsibilities
                  </h4>
                  <ul className="space-y-2">
                    {jobDescription.responsibilities.map((responsibility, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Requirements */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Award className="h-4 w-4 mr-2" />
                    Requirements
                  </h4>
                  <ul className="space-y-2">
                    {jobDescription.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Award className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Skills */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {jobDescription.skills.map((skill, index) => (
                      <Badge key={index} variant="default" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Benefits */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Heart className="h-4 w-4 mr-2" />
                    Benefits
                  </h4>
                  <ul className="space-y-2">
                    {jobDescription.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Heart className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart JD Generation Ready</h3>
                <p className="text-gray-600 mb-4">
                  Enter job details and click "Generate Smart Job Description" to create a tailored JD using AI and
                  candidate database insights.
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>
                    <strong>AI will automatically analyze:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Similar roles in your candidate database</li>
                    <li>Industry-specific responsibilities and requirements</li>
                    <li>Skills and experience patterns from existing candidates</li>
                    <li>Refined output using Gemini AI</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AI Configuration Notice */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-6 w-6 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-900 mb-2">Candidate Database + Gemini AI Integration</h4>
              <p className="text-sm text-purple-800 mb-3">
                Our system directly analyzes your candidate database and uses Gemini AI to create highly
                accurate, industry-specific job descriptions based on real candidate data.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-purple-700">Direct database access</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-purple-700">Gemini AI refinement</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-purple-700">Real candidate insights</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

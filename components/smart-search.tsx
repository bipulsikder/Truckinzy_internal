"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Search,
  Sparkles,
  User,
  MapPin,
  Briefcase,
  Download,
  Eye,
  Building,
  Mail,
  Phone,
  GraduationCap,
  Code,
  TrendingUp,
  SortDesc,
  Filter,
  Bot,
  FileText,
  Truck,
  X,
  Plus,
  ChevronDown,
  Clock,
  Languages,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CandidatePreviewDialog } from "./candidate-preview-dialog"

interface SearchResult {
  _id: string
  id?: string
  name: string
  currentRole: string
  location: string
  totalExperience: string
  technicalSkills: string[]
  softSkills: string[]
  email: string
  phone: string
  currentCompany?: string
  degree?: string
  university?: string
  certifications?: string[]
  relevanceScore: number
  matchingKeywords: string[]
  driveFileUrl?: string
  fileName?: string
  summary?: string
  linkedinProfile?: string
  resumeText: string
  status?: "new" | "reviewed" | "shortlisted" | "interviewed" | "selected" | "rejected" | "on-hold"
  uploadedAt?: string
  currentSalary?: string
  expectedSalary?: string
  highestQualification?: string
  languagesKnown?: string[]
  noticePeriod?: string
  preferredLocation?: string
  gender?: string
  age?: number
  maritalStatus?: string
}

interface MinimalSearchFilters {
  experienceType: "freshers" | "experienced" | "any"
  keywords: string[]
  location: string
  minExperience: string
  maxExperience: string
  education: string
}

interface SidebarFilters {
  hideInactive: boolean
  showOnlyAvailable: boolean
  mustHaveKeywords: string[]
  excludeKeywords: string[]
  currentCity: string[]
  experience: { min: string; max: string }
  industries: string[]
  companies: string[]
  salaryRange: { min: string; max: string }
  degrees: string[]
  education: string[]
  gender: string[]
  ageRange: { min: string; max: string }
  languages: string[]
  englishFluency: string[]
}

export function SmartSearch() {
  const [searchMode, setSearchMode] = useState<"manual" | "smart" | "jd">("manual")
  const [smartSearchQuery, setSmartSearchQuery] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<SearchResult | null>(null)
  const [sortBy, setSortBy] = useState<"relevance" | "experience" | "name">("relevance")
  const [showFilters, setShowFilters] = useState(true)

  // AI keyword suggestions
  const [keywordInput, setKeywordInput] = useState("")
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  // Manual search filters (minimal)
  const [manualFilters, setManualFilters] = useState<MinimalSearchFilters>({
    experienceType: "any",
    keywords: [],
    location: "",
    minExperience: "",
    maxExperience: "",
    education: "",
  })

  // Sidebar filters
  const [sidebarFilters, setSidebarFilters] = useState<SidebarFilters>({
    hideInactive: false,
    showOnlyAvailable: false,
    mustHaveKeywords: [],
    excludeKeywords: [],
    currentCity: [],
    experience: { min: "", max: "" },
    industries: [],
    companies: [],
    salaryRange: { min: "", max: "" },
    degrees: [],
    education: [],
    gender: [],
    ageRange: { min: "", max: "" },
    languages: [],
    englishFluency: [],
  })

  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({})

  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Apply sidebar filters to search results
  useEffect(() => {
    if (searchResults.length === 0) {
      setFilteredResults([])
      return
    }

    let filtered = [...searchResults]

    // Apply all sidebar filters
    if (sidebarFilters.hideInactive) {
      filtered = filtered.filter((candidate) => candidate.status !== "inactive")
    }

    if (sidebarFilters.showOnlyAvailable) {
      filtered = filtered.filter(
        (candidate) =>
          candidate.noticePeriod &&
          (candidate.noticePeriod.toLowerCase().includes("immediate") ||
            candidate.noticePeriod.toLowerCase().includes("15 days")),
      )
    }

    if (sidebarFilters.mustHaveKeywords.length > 0) {
      filtered = filtered.filter((candidate) => {
        const searchText = [
          candidate.name,
          candidate.currentRole,
          candidate.resumeText,
          ...(candidate.technicalSkills || []),
          ...(candidate.softSkills || []),
        ]
          .join(" ")
          .toLowerCase()

        return sidebarFilters.mustHaveKeywords.every((keyword) => searchText.includes(keyword.toLowerCase()))
      })
    }

    if (sidebarFilters.excludeKeywords.length > 0) {
      filtered = filtered.filter((candidate) => {
        const searchText = [
          candidate.name,
          candidate.currentRole,
          candidate.resumeText,
          ...(candidate.technicalSkills || []),
          ...(candidate.softSkills || []),
        ]
          .join(" ")
          .toLowerCase()

        return !sidebarFilters.excludeKeywords.some((keyword) => searchText.includes(keyword.toLowerCase()))
      })
    }

    if (sidebarFilters.currentCity.length > 0) {
      filtered = filtered.filter((candidate) =>
        sidebarFilters.currentCity.some((city) =>
          (candidate.location || "").toLowerCase().includes(city.toLowerCase()),
        ),
      )
    }

    if (sidebarFilters.experience.min || sidebarFilters.experience.max) {
      filtered = filtered.filter((candidate) => {
        const exp = Number.parseInt(candidate.totalExperience) || 0
        const minExp = Number.parseInt(sidebarFilters.experience.min) || 0
        const maxExp = Number.parseInt(sidebarFilters.experience.max) || 999
        return exp >= minExp && exp <= maxExp
      })
    }

    if (sidebarFilters.salaryRange.min || sidebarFilters.salaryRange.max) {
      filtered = filtered.filter((candidate) => {
        const salary = Math.max(
          Number.parseFloat(candidate.currentSalary) || 0,
          Number.parseFloat(candidate.expectedSalary) || 0,
        )
        const minSalary = Number.parseFloat(sidebarFilters.salaryRange.min) || 0
        const maxSalary = Number.parseFloat(sidebarFilters.salaryRange.max) || 999
        return salary === 0 || (salary >= minSalary && salary <= maxSalary)
      })
    }

    if (sidebarFilters.education.length > 0) {
      filtered = filtered.filter((candidate) =>
        sidebarFilters.education.some((edu) =>
          (candidate.highestQualification || "").toLowerCase().includes(edu.toLowerCase()),
        ),
      )
    }

    if (sidebarFilters.gender.length > 0) {
      filtered = filtered.filter((candidate) => sidebarFilters.gender.includes(candidate.gender || ""))
    }

    if (sidebarFilters.languages.length > 0) {
      filtered = filtered.filter((candidate) =>
        sidebarFilters.languages.some((lang) =>
          (candidate.languagesKnown || []).some((candidateLang) =>
            candidateLang.toLowerCase().includes(lang.toLowerCase()),
          ),
        ),
      )
    }

    setFilteredResults(filtered)
  }, [searchResults, sidebarFilters])

  // Get AI keyword suggestions
  const getAISuggestions = async (input: string) => {
    if (!input.trim() || input.length < 2) {
      setAiSuggestions([])
      return
    }

    setIsLoadingSuggestions(true)
    try {
      const response = await fetch("/api/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, context: "logistics" }),
      })

      if (response.ok) {
        const suggestions = await response.json()
        setAiSuggestions(suggestions.slice(0, 6)) // Show max 6 suggestions
      }
    } catch (error) {
      console.error("Failed to get AI suggestions:", error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // Debounced AI suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      getAISuggestions(keywordInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [keywordInput])

  const handleSmartSearch = async () => {
    if (!smartSearchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: smartSearchQuery,
          searchType: "smart",
        }),
      })

      if (!response.ok) throw new Error("Search failed")

      const results = await response.json()
      setSearchResults(processSearchResults(results))
      toast({
        title: "Search Complete",
        description: `Found ${results.length} matching candidates`,
      })
    } catch (error) {
      console.error("Search error:", error)
      toast({
        title: "Error",
        description: "Search failed. Please try again.",
        variant: "destructive",
      })
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleJDSearch = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Error",
        description: "Please paste a job description",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jobDescription,
          searchType: "jd",
        }),
      })

      if (!response.ok) throw new Error("JD Search failed")

      const results = await response.json()
      setSearchResults(processSearchResults(results))
      toast({
        title: "JD Analysis Complete",
        description: `Found ${results.length} candidates matching the job requirements`,
      })
    } catch (error) {
      console.error("JD Search error:", error)
      toast({
        title: "Error",
        description: "JD analysis failed. Please try again.",
        variant: "destructive",
      })
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleManualSearch = async () => {
    if (manualFilters.keywords.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one keyword",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchType: "manual",
          filters: manualFilters,
        }),
      })

      if (!response.ok) throw new Error("Manual search failed")

      const results = await response.json()
      setSearchResults(processSearchResults(results))
      toast({
        title: "Search Complete",
        description: `Found ${results.length} matching candidates`,
      })
    } catch (error) {
      console.error("Manual search error:", error)
      toast({
        title: "Error",
        description: "Search failed. Please try again.",
        variant: "destructive",
      })
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const processSearchResults = (results: any[]) => {
    return Array.isArray(results)
      ? results.map((result) => ({
          ...result,
          technicalSkills: Array.isArray(result.technicalSkills) ? result.technicalSkills : [],
          softSkills: Array.isArray(result.softSkills) ? result.softSkills : [],
          matchingKeywords: Array.isArray(result.matchingKeywords) ? result.matchingKeywords : [],
          certifications: Array.isArray(result.certifications) ? result.certifications : [],
          languagesKnown: Array.isArray(result.languagesKnown) ? result.languagesKnown : [],
          relevanceScore: typeof result.relevanceScore === "number" ? result.relevanceScore : 0,
          status: result.status || "new",
          uploadedAt: result.uploadedAt || new Date().toISOString(),
        }))
      : []
  }

  const addKeyword = (keyword: string) => {
    if (!manualFilters.keywords.includes(keyword)) {
      setManualFilters((prev) => ({
        ...prev,
        keywords: [...prev.keywords, keyword],
      }))
    }
    setKeywordInput("")
    setAiSuggestions([])
  }

  const removeKeyword = (keyword: string) => {
    setManualFilters((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keyword),
    }))
  }

  const resetSearch = () => {
    setSmartSearchQuery("")
    setJobDescription("")
    setManualFilters({
      experienceType: "any",
      keywords: [],
      location: "",
      minExperience: "",
      maxExperience: "",
      education: "",
    })
    setKeywordInput("")
    setAiSuggestions([])
    setSearchResults([])
    setFilteredResults([])
    setHasSearched(false)
  }

  const updateCandidateStatus = async (candidateId: string, status: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setSearchResults((prev) =>
          prev.map((c) => (c._id === candidateId || c.id === candidateId ? { ...c, status: status as any } : c)),
        )
        setFilteredResults((prev) =>
          prev.map((c) => (c._id === candidateId || c.id === candidateId ? { ...c, status: status as any } : c)),
        )
        if (selectedCandidate && (selectedCandidate._id === candidateId || selectedCandidate.id === candidateId)) {
          setSelectedCandidate({ ...selectedCandidate, status: status as any })
        }
      } else {
        throw new Error("Failed to update status")
      }
    } catch (error) {
      throw error
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case "relevance":
        return (b.relevanceScore || 0) - (a.relevanceScore || 0)
      case "experience":
        return (b.totalExperience || "").localeCompare(a.totalExperience || "")
      case "name":
        return (a.name || "").localeCompare(b.name || "")
      default:
        return 0
    }
  })

  if (!mounted) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Left Sidebar Filters - Only show when there are search results */}
      {hasSearched && searchResults.length > 0 && (
        <div className={`transition-all duration-300 ${showFilters ? "w-80" : "w-12"} flex-shrink-0`}>
          <Card className="sticky top-4 h-fit">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                {showFilters && (
                  <h3 className="font-semibold text-lg flex items-center">
                    <Filter className="h-5 w-5 mr-2" />
                    Filters
                  </h3>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="p-2">
                  {showFilters ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>

              {showFilters && (
                <div className="space-y-3">
                  {/* Hide candidates that are */}
                  <Collapsible
                    open={openFilters.hideInactive}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, hideInactive: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">Hide candidates that are</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hide-inactive"
                            checked={sidebarFilters.hideInactive}
                            onCheckedChange={(checked) =>
                              setSidebarFilters((prev) => ({ ...prev, hideInactive: checked as boolean }))
                            }
                          />
                          <Label htmlFor="hide-inactive" className="text-sm">
                            Inactive
                          </Label>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Show only candidates who */}
                  <Collapsible
                    open={openFilters.showOnly}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, showOnly: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">Show only candidates who</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="show-available"
                            checked={sidebarFilters.showOnlyAvailable}
                            onCheckedChange={(checked) =>
                              setSidebarFilters((prev) => ({ ...prev, showOnlyAvailable: checked as boolean }))
                            }
                          />
                          <Label htmlFor="show-available" className="text-sm">
                            Are immediately available
                          </Label>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Current City / Area */}
                  <Collapsible
                    open={openFilters.currentCity}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, currentCity: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">Current City / Area</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2">
                      <Input
                        placeholder="Enter city name"
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            const city = e.currentTarget.value.trim()
                            if (!sidebarFilters.currentCity.includes(city)) {
                              setSidebarFilters((prev) => ({
                                ...prev,
                                currentCity: [...prev.currentCity, city],
                              }))
                            }
                            e.currentTarget.value = ""
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sidebarFilters.currentCity.map((city) => (
                          <Badge key={city} variant="secondary" className="text-xs">
                            {city}
                            <X
                              className="h-3 w-3 ml-1 cursor-pointer"
                              onClick={() =>
                                setSidebarFilters((prev) => ({
                                  ...prev,
                                  currentCity: prev.currentCity.filter((c) => c !== city),
                                }))
                              }
                            />
                          </Badge>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Experience */}
                  <Collapsible
                    open={openFilters.experience}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, experience: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">Experience</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Min years"
                          type="number"
                          value={sidebarFilters.experience.min}
                          onChange={(e) =>
                            setSidebarFilters((prev) => ({
                              ...prev,
                              experience: { ...prev.experience, min: e.target.value },
                            }))
                          }
                        />
                        <Input
                          placeholder="Max years"
                          type="number"
                          value={sidebarFilters.experience.max}
                          onChange={(e) =>
                            setSidebarFilters((prev) => ({
                              ...prev,
                              experience: { ...prev.experience, max: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Annual Salary */}
                  <Collapsible
                    open={openFilters.salary}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, salary: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">Annual Salary</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Min LPA"
                          type="number"
                          value={sidebarFilters.salaryRange.min}
                          onChange={(e) =>
                            setSidebarFilters((prev) => ({
                              ...prev,
                              salaryRange: { ...prev.salaryRange, min: e.target.value },
                            }))
                          }
                        />
                        <Input
                          placeholder="Max LPA"
                          type="number"
                          value={sidebarFilters.salaryRange.max}
                          onChange={(e) =>
                            setSidebarFilters((prev) => ({
                              ...prev,
                              salaryRange: { ...prev.salaryRange, max: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Education */}
                  <Collapsible
                    open={openFilters.education}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, education: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">Education</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2">
                      <div className="space-y-2">
                        {["10th Pass", "12th Pass", "Diploma", "Graduate", "Post Graduate"].map((edu) => (
                          <div key={edu} className="flex items-center space-x-2">
                            <Checkbox
                              id={edu}
                              checked={sidebarFilters.education.includes(edu)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSidebarFilters((prev) => ({
                                    ...prev,
                                    education: [...prev.education, edu],
                                  }))
                                } else {
                                  setSidebarFilters((prev) => ({
                                    ...prev,
                                    education: prev.education.filter((e) => e !== edu),
                                  }))
                                }
                              }}
                            />
                            <Label htmlFor={edu} className="text-sm">
                              {edu}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Gender */}
                  <Collapsible
                    open={openFilters.gender}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, gender: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">Gender</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2">
                      <div className="space-y-2">
                        {["Male", "Female", "Other"].map((gender) => (
                          <div key={gender} className="flex items-center space-x-2">
                            <Checkbox
                              id={gender}
                              checked={sidebarFilters.gender.includes(gender)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSidebarFilters((prev) => ({
                                    ...prev,
                                    gender: [...prev.gender, gender],
                                  }))
                                } else {
                                  setSidebarFilters((prev) => ({
                                    ...prev,
                                    gender: prev.gender.filter((g) => g !== gender),
                                  }))
                                }
                              }}
                            />
                            <Label htmlFor={gender} className="text-sm">
                              {gender}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Languages */}
                  <Collapsible
                    open={openFilters.languages}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, languages: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">Languages</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2">
                      <div className="space-y-2">
                        {["English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi", "Gujarati"].map((lang) => (
                          <div key={lang} className="flex items-center space-x-2">
                            <Checkbox
                              id={lang}
                              checked={sidebarFilters.languages.includes(lang)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSidebarFilters((prev) => ({
                                    ...prev,
                                    languages: [...prev.languages, lang],
                                  }))
                                } else {
                                  setSidebarFilters((prev) => ({
                                    ...prev,
                                    languages: prev.languages.filter((l) => l !== lang),
                                  }))
                                }
                              }}
                            />
                            <Label htmlFor={lang} className="text-sm">
                              {lang}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* Clear All Filters */}
              {showFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 bg-transparent"
                  onClick={() =>
                    setSidebarFilters({
                      hideInactive: false,
                      showOnlyAvailable: false,
                      mustHaveKeywords: [],
                      excludeKeywords: [],
                      currentCity: [],
                      experience: { min: "", max: "" },
                      industries: [],
                      companies: [],
                      salaryRange: { min: "", max: "" },
                      degrees: [],
                      education: [],
                      gender: [],
                      ageRange: { min: "", max: "" },
                      languages: [],
                      englishFluency: [],
                    })
                  }
                >
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Enhanced Search Header - Only show when not searched */}
        {!hasSearched && (
          <>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Truck className="h-8 w-8 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">Truckinzy Smart Search</h2>
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Find the perfect logistics and transportation candidates with AI-powered search.
              </p>
            </div>

            {/* Search Mode Toggle */}
            <Card className="border-2 border-blue-100">
              <CardContent className="p-6">
                <div className="flex justify-center space-x-4 mb-6">
                  <Button
                    variant={searchMode === "manual" ? "default" : "outline"}
                    onClick={() => setSearchMode("manual")}
                    className="flex items-center space-x-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Search manually</span>
                  </Button>
                  <Button
                    variant={searchMode === "smart" ? "default" : "outline"}
                    onClick={() => setSearchMode("smart")}
                    className="flex items-center space-x-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Use TruckinzyAI</span>
                  </Button>
                  <Button
                    variant={searchMode === "jd" ? "default" : "outline"}
                    onClick={() => setSearchMode("jd")}
                    className="flex items-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Use Job Description</span>
                  </Button>
                </div>

                {/* Manual Search Interface */}
                {searchMode === "manual" && (
                  <div className="space-y-6">
                    {/* Searching for */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Searching for</Label>
                      <RadioGroup
                        value={manualFilters.experienceType}
                        onValueChange={(value: "freshers" | "experienced" | "any") =>
                          setManualFilters((prev) => ({ ...prev, experienceType: value }))
                        }
                        className="flex space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="freshers" id="freshers" />
                          <Label htmlFor="freshers">Freshers only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="experienced" id="experienced" />
                          <Label htmlFor="experienced">Experienced only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="any" id="any" />
                          <Label htmlFor="any">Any</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Keywords */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">
                        Keywords <span className="text-red-500">*</span>
                      </Label>
                      <div className="border-2 border-blue-200 rounded-lg p-4 min-h-[80px]">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {manualFilters.keywords.map((keyword) => (
                            <Badge key={keyword} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                              {keyword}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => removeKeyword(keyword)} />
                            </Badge>
                          ))}
                          <Input
                            placeholder="Type to search keyword"
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && keywordInput.trim()) {
                                addKeyword(keywordInput.trim())
                              }
                            }}
                            className="border-none shadow-none focus-visible:ring-0 flex-1 min-w-[200px]"
                          />
                        </div>
                      </div>

                      {/* AI Recommendations */}
                      {(aiSuggestions.length > 0 || isLoadingSuggestions) && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Recommended by AI</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {isLoadingSuggestions ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                Getting suggestions...
                              </div>
                            ) : (
                              aiSuggestions.map((suggestion) => (
                                <Button
                                  key={suggestion}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addKeyword(suggestion)}
                                  className="flex items-center gap-1 text-sm"
                                >
                                  {suggestion}
                                  <Plus className="h-3 w-3" />
                                </Button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Current city/region */}
                    <div>
                      <Label htmlFor="location" className="text-base font-semibold">
                        Current city/region
                      </Label>
                      <Input
                        id="location"
                        placeholder="Type to search city/region"
                        value={manualFilters.location}
                        onChange={(e) => setManualFilters((prev) => ({ ...prev, location: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    {/* Experience */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Experience</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Select
                          value={manualFilters.minExperience}
                          onValueChange={(value) => setManualFilters((prev) => ({ ...prev, minExperience: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Minimum experience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0 years</SelectItem>
                            <SelectItem value="1">1 year</SelectItem>
                            <SelectItem value="2">2 years</SelectItem>
                            <SelectItem value="3">3 years</SelectItem>
                            <SelectItem value="5">5 years</SelectItem>
                            <SelectItem value="10">10+ years</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={manualFilters.maxExperience}
                          onValueChange={(value) => setManualFilters((prev) => ({ ...prev, maxExperience: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Maximum experience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 year</SelectItem>
                            <SelectItem value="2">2 years</SelectItem>
                            <SelectItem value="5">5 years</SelectItem>
                            <SelectItem value="10">10 years</SelectItem>
                            <SelectItem value="15">15+ years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Minimum education */}
                    <div>
                      <Label className="text-base font-semibold">Minimum education</Label>
                      <Select
                        value={manualFilters.education}
                        onValueChange={(value) => setManualFilters((prev) => ({ ...prev, education: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select minimum education" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10th">10th Pass</SelectItem>
                          <SelectItem value="12th">12th Pass</SelectItem>
                          <SelectItem value="diploma">Diploma</SelectItem>
                          <SelectItem value="graduate">Graduate</SelectItem>
                          <SelectItem value="postgraduate">Post Graduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Search Actions */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button variant="outline" onClick={resetSearch}>
                        Reset
                      </Button>
                      <Button onClick={handleManualSearch} disabled={isSearching} size="lg">
                        {isSearching ? (
                          <>
                            <Search className="h-4 w-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Search candidates
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Smart Search Interface */}
                {searchMode === "smart" && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                      <div className="flex items-start space-x-3">
                        <Bot className="h-8 w-8 text-purple-600 mt-1" />
                        <div>
                          <h3 className="text-lg font-semibold text-purple-900 mb-2">Smart AI Search</h3>
                          <p className="text-purple-800">
                            Use natural language to describe your ideal candidate. Our AI understands logistics
                            terminology and context.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            placeholder="e.g., 'Fleet manager with 5+ years experience in Delhi' or 'Truck driver with clean license'"
                            value={smartSearchQuery}
                            onChange={(e) => setSmartSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSmartSearch()}
                            className="pl-12 h-12 text-lg"
                          />
                        </div>
                        <Button onClick={handleSmartSearch} disabled={isSearching} size="lg" className="px-8">
                          {isSearching ? (
                            <>
                              <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                              Searching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-5 w-5 mr-2" />
                              Smart Search
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={resetSearch}>
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* JD Search Interface */}
                {searchMode === "jd" && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-start space-x-3">
                        <FileText className="h-8 w-8 text-green-600 mt-1" />
                        <div>
                          <h3 className="text-lg font-semibold text-green-900 mb-2">Job Description Analysis</h3>
                          <p className="text-green-800">
                            Paste your job description and our AI will extract requirements and find matching candidates
                            automatically.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Textarea
                          placeholder="Paste your complete job description here. Include role requirements, skills needed, experience level, location, etc."
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                          className="min-h-[120px]"
                        />
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={resetSearch}>
                          Reset
                        </Button>
                        <Button onClick={handleJDSearch} disabled={isSearching} size="lg">
                          {isSearching ? (
                            <>
                              <FileText className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing JD...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Analyze & Search
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search Examples - Only for Smart Search */}
            {searchMode === "smart" && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Try these logistics-specific searches:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      "Fleet manager with GPS tracking experience",
                      "Truck driver Delhi NCR with clean license",
                      "Logistics coordinator with WMS knowledge",
                      "Supply chain manager with ERP experience",
                      "Warehouse supervisor with forklift certification",
                      "Transport planner with route optimization skills",
                    ].map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setSmartSearchQuery(example)}
                        className="text-blue-700 border-blue-200 hover:bg-blue-100 text-left justify-start"
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Search Results */}
        {hasSearched && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h3 className="text-xl font-semibold flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  {filteredResults.length} profiles found
                  {searchMode === "smart" && smartSearchQuery && ` for "${smartSearchQuery}"`}
                  {searchMode === "jd" && " for Job Description Analysis"}
                  {searchMode === "manual" &&
                    manualFilters.keywords.length > 0 &&
                    ` for "${manualFilters.keywords.join(", ")}"`}
                </h3>
                {filteredResults.length !== searchResults.length && (
                  <p className="text-sm text-gray-600 mt-1">
                    Showing {filteredResults.length} of {searchResults.length} total results (filtered)
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={resetSearch}>
                  New Search
                </Button>
                {filteredResults.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <SortDesc className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="experience">Experience</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {filteredResults.length === 0 && !isSearching ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search criteria or filters.</p>
                  <Button onClick={resetSearch}>Try New Search</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {sortedResults.map((result) => (
                  <Card
                    key={result._id || result.id}
                    className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4 flex-1">
                          <Avatar className="h-14 w-14">
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-lg">
                              {getInitials(result.name || "Unknown")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-900">{result.name || "Unknown"}</h3>
                              {(searchMode === "smart" || searchMode === "jd") && (
                                <Badge className={`${getRelevanceColor(result.relevanceScore || 0)} font-medium`}>
                                  {getRelevanceLabel(result.relevanceScore || 0)} (
                                  {Math.round((result.relevanceScore || 0) * 100)}%)
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="flex items-center text-gray-600">
                                <Briefcase className="h-4 w-4 mr-2" />
                                <span className="font-medium">{result.currentRole || "Not specified"}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Building className="h-4 w-4 mr-2" />
                                <span>{result.currentCompany || "Not specified"}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-4 w-4 mr-2" />
                                <span>{result.location || "Not specified"}</span>
                              </div>
                            </div>
                            <div className="flex items-center text-gray-600 mb-4">
                              <User className="h-4 w-4 mr-2" />
                              <span>{result.totalExperience || "Not specified"} experience</span>
                              {result.degree && (
                                <>
                                  <span className="mx-2">•</span>
                                  <GraduationCap className="h-4 w-4 mr-1" />
                                  <span>{result.degree}</span>
                                </>
                              )}
                              {result.noticePeriod && (
                                <>
                                  <span className="mx-2">•</span>
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>{result.noticePeriod} notice</span>
                                </>
                              )}
                            </div>
                            {/* Contact Info */}
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-1" />
                                <span>{result.email || "Not provided"}</span>
                              </div>
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-1" />
                                <span>{result.phone || "Not provided"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" onClick={() => setSelectedCandidate(result)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          {result.driveFileUrl && (
                            <Button variant="outline" asChild>
                              <a href={result.driveFileUrl} download={result.fileName}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Skills Preview */}
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <Code className="h-4 w-4 mr-1" />
                            Technical Skills:
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {(result.technicalSkills || []).slice(0, 8).map((skill, index) => (
                              <Badge
                                key={index}
                                variant={
                                  (result.matchingKeywords || []).includes(skill.toLowerCase())
                                    ? "default"
                                    : "secondary"
                                }
                                className={`text-xs ${
                                  (result.matchingKeywords || []).includes(skill.toLowerCase())
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : ""
                                }`}
                              >
                                {skill}
                              </Badge>
                            ))}
                            {(result.technicalSkills || []).length > 8 && (
                              <Badge variant="outline" className="text-xs">
                                +{(result.technicalSkills || []).length - 8} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Languages */}
                        {(result.languagesKnown || []).length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Languages className="h-4 w-4 mr-1" />
                              Languages:
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {(result.languagesKnown || []).map((language, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {language}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Matching Keywords */}
                        {(result.matchingKeywords || []).length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              Matching Keywords:
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {(result.matchingKeywords || []).map((keyword, index) => (
                                <Badge
                                  key={index}
                                  variant="default"
                                  className="text-xs bg-green-100 text-green-700 border-green-200"
                                >
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Truckinzy Features Notice - Only show when not searched */}
        {!hasSearched && (
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Truck className="h-6 w-6 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900 mb-2">Truckinzy Logistics Intelligence</h4>
                  <p className="text-sm text-purple-800 mb-3">
                    Our platform is specifically designed for logistics, transportation, and supply chain recruitment
                    with industry-specific filters and AI understanding.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-purple-700">Logistics-specific roles & skills</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-purple-700">Vehicle & transport expertise</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-purple-700">Industry certifications & licenses</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Candidate Preview Dialog */}
        <CandidatePreviewDialog
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onStatusUpdate={updateCandidateStatus}
          showRelevanceScore={searchMode === "smart" || searchMode === "jd"}
        />
      </div>
    </div>
  )
}

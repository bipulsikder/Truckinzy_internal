"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Eye,
  Download,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Clock,
  FileCheck,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UploadedFile {
  file: File
  status: "uploading" | "processing" | "completed" | "error" | "duplicate"
  progress: number
  result?: any
  error?: string
  duplicateInfo?: {
    existingName: string
    existingId: string
    uploadedAt: string
  }
}

export function UploadSection() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedPreview, setSelectedPreview] = useState<any>(null)
  const { toast } = useToast()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      console.log("Files dropped:", acceptedFiles.length)

      if (acceptedFiles.length === 0) {
        toast({
          title: "Invalid Files",
          description: "Please select valid PDF, DOCX, DOC, or TXT files",
          variant: "destructive",
        })
        return
      }

      const newFiles = acceptedFiles.map((file) => ({
        file,
        status: "uploading" as const,
        progress: 0,
      }))

      setUploadedFiles((prev) => [...prev, ...newFiles])
      setIsProcessing(true)

      // Process files sequentially to avoid overwhelming the API
      for (let i = 0; i < newFiles.length; i++) {
        const fileIndex = uploadedFiles.length + i
        await processFile(newFiles[i].file, fileIndex)

        // Small delay between files
        if (i < newFiles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      setIsProcessing(false)

      const successCount = uploadedFiles.filter((f) => f.status === "completed").length
      const duplicateCount = uploadedFiles.filter((f) => f.status === "duplicate").length

      toast({
        title: "Upload Complete",
        description: `Processed ${acceptedFiles.length} file(s). ${successCount} new, ${duplicateCount} duplicates`,
      })
    },
    [uploadedFiles.length, toast],
  )

  const processFile = async (file: File, index: number) => {
    console.log(`Processing file ${index}: ${file.name}`)

    try {
      // Update status to processing
      setUploadedFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "processing", progress: 30 } : f)))

      const formData = new FormData()
      formData.append("resume", file)

      console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadedFiles((prev) =>
          prev.map((f, i) => (i === index && f.progress < 90 ? { ...f, progress: f.progress + 10 } : f)),
        )
      }, 500)

      const response = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      console.log(`Upload response status: ${response.status}`)

      const result = await response.json()
      console.log("Upload result:", result)

      if (!response.ok) {
        // Check if it's a duplicate error
        if (result.isDuplicate) {
          setUploadedFiles((prev) =>
            prev.map((f, i) =>
              i === index
                ? {
                    ...f,
                    status: "duplicate",
                    progress: 100,
                    duplicateInfo: result.duplicateInfo,
                  }
                : f,
            ),
          )
          return
        }
        throw new Error(result.error || result.details || `HTTP ${response.status}`)
      }

      // Update status to completed
      setUploadedFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: "completed", progress: 100, result } : f)),
      )

      console.log(`✅ Successfully processed: ${file.name}`)

      toast({
        title: "Success",
        description: `${file.name} processed successfully`,
      })
    } catch (error) {
      console.error(`❌ Error processing ${file.name}:`, error)

      // Update status to error
      setUploadedFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "error",
                progress: 0,
                error: error instanceof Error ? error.message : "Unknown error",
              }
            : f,
        ),
      )

      toast({
        title: "Upload Failed",
        description: `Failed to process ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setUploadedFiles([])
  }

  const retryFile = async (index: number) => {
    const file = uploadedFiles[index]
    if (file) {
      setUploadedFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: "uploading", progress: 0, error: undefined } : f)),
      )
      await processFile(file.file, index)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case "processing":
        return <Sparkles className="h-4 w-4 animate-pulse text-purple-600" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "duplicate":
        return <FileCheck className="h-4 w-4 text-orange-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploading":
        return "border-blue-200 bg-blue-50"
      case "processing":
        return "border-purple-200 bg-purple-50"
      case "completed":
        return "border-green-200 bg-green-50"
      case "duplicate":
        return "border-orange-200 bg-orange-50"
      case "error":
        return "border-red-200 bg-red-50"
      default:
        return "border-gray-200 bg-white"
    }
  }

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isProcessing,
  })

  return (
    <div className="space-y-6">
      {/* Enhanced Upload Area */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-blue-500 bg-blue-50 scale-105 shadow-lg"
            : isProcessing
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md"
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <div className="relative">
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-purple-600 animate-pulse" />
            </div>
          ) : (
            <div className="relative">
              <Upload className="h-16 w-16 text-gray-400" />
              {isDragActive && <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-25" />}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {isDragActive ? "Drop the files here..." : isProcessing ? "Processing files..." : "Upload Resume Files"}
            </h3>
            <p className="text-gray-600">Drag & drop or click to select files</p>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                PDF, DOCX, DOC, TXT
              </span>
              <span>•</span>
              <span>Max 10MB each</span>
              <span>•</span>
              <span>Multiple files supported</span>
            </div>
          </div>

          {!isProcessing && (
            <Button variant="outline" className="mt-4 bg-transparent">
              <Upload className="h-4 w-4 mr-2" />
              Select Files
            </Button>
          )}
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <Clock className="h-4 w-4" />
              <span>AI is analyzing your resumes...</span>
            </div>
          </div>
        )}
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Some files were rejected:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              {fileRejections.map(({ file, errors }, index) => (
                <li key={index} className="text-sm">
                  <strong>{file.name}:</strong> {errors.map((e) => e.message).join(", ")}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* File Processing Status */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Processing Files ({uploadedFiles.length})
            </h3>
            {uploadedFiles.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {uploadedFiles.map((uploadedFile, index) => (
              <Card key={index} className={`transition-all duration-300 ${getStatusColor(uploadedFile.status)}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(uploadedFile.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{uploadedFile.file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB •{" "}
                          {uploadedFile.file.type.split("/")[1].toUpperCase()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          uploadedFile.status === "completed"
                            ? "default"
                            : uploadedFile.status === "duplicate"
                              ? "secondary"
                              : uploadedFile.status === "error"
                                ? "destructive"
                                : "outline"
                        }
                        className="capitalize"
                      >
                        {uploadedFile.status === "duplicate" ? "Already Exists" : uploadedFile.status}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2">
                      {uploadedFile.status === "error" && (
                        <Button variant="outline" size="sm" onClick={() => retryFile(index)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {uploadedFile.result?.driveFileUrl && (
                        <>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Resume Preview - {uploadedFile.result.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <iframe
                                  src={uploadedFile.result.driveFileUrl}
                                  className="w-full h-96 border rounded"
                                  title="Resume Preview"
                                />
                                <div className="flex justify-end">
                                  <Button asChild>
                                    <a href={uploadedFile.result.driveFileUrl} download={uploadedFile.file.name}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="sm" asChild>
                            <a href={uploadedFile.result.driveFileUrl} download={uploadedFile.file.name}>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(uploadedFile.status === "uploading" || uploadedFile.status === "processing") && (
                    <div className="space-y-2">
                      <Progress value={uploadedFile.progress} className="h-2" />
                      <p className="text-xs text-gray-600 text-center">
                        {uploadedFile.status === "uploading" ? "Uploading..." : "AI is extracting data..."}
                      </p>
                    </div>
                  )}

                  {/* Success Result */}
                  {uploadedFile.status === "completed" && uploadedFile.result && (
                    <div className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">Successfully processed</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-green-700">Name:</span>
                          <p className="text-green-600">{uploadedFile.result.name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Role:</span>
                          <p className="text-green-600">{uploadedFile.result.currentRole}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Experience:</span>
                          <p className="text-green-600">{uploadedFile.result.totalExperience}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Location:</span>
                          <p className="text-green-600">{uploadedFile.result.location}</p>
                        </div>
                        {uploadedFile.result.email && (
                          <div>
                            <span className="font-medium text-green-700">Email:</span>
                            <p className="text-green-600">{uploadedFile.result.email}</p>
                          </div>
                        )}
                        {uploadedFile.result.phone && (
                          <div>
                            <span className="font-medium text-green-700">Phone:</span>
                            <p className="text-green-600">{uploadedFile.result.phone}</p>
                          </div>
                        )}
                      </div>
                      {uploadedFile.result.technicalSkills && uploadedFile.result.technicalSkills.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium text-green-700">Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {uploadedFile.result.technicalSkills
                              .slice(0, 6)
                              .map((skill: string, skillIndex: number) => (
                                <Badge
                                  key={skillIndex}
                                  variant="secondary"
                                  className="text-xs bg-green-100 text-green-700"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            {uploadedFile.result.technicalSkills.length > 6 && (
                              <Badge variant="outline" className="text-xs">
                                +{uploadedFile.result.technicalSkills.length - 6} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Duplicate Warning */}
                  {uploadedFile.status === "duplicate" && uploadedFile.duplicateInfo && (
                    <div className="mt-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileCheck className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-orange-800">Duplicate File Detected</span>
                      </div>
                      <p className="text-sm text-orange-700">
                        This resume was already uploaded as <strong>{uploadedFile.duplicateInfo.existingName}</strong>{" "}
                        on {new Date(uploadedFile.duplicateInfo.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadedFile.status === "error" && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Processing failed:</strong> {uploadedFile.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">AI-Powered Processing</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Advanced AI extracts comprehensive data including education, skills, experience, and more from your
                  resumes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <FileCheck className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900">Smart Duplicate Detection</h4>
                <p className="text-sm text-green-800 mt-1">
                  Automatically detects and prevents duplicate uploads, keeping your database clean and organized.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

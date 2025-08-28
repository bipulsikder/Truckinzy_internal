"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Upload, AlertCircle, CheckCircle } from "lucide-react"

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      console.log("Testing file upload:", {
        name: file.name,
        type: file.type,
        size: file.size,
        extension: file.name.split('.').pop()
      })

      const response = await fetch("/api/test-docx", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        console.log("✅ Upload successful:", data)
      } else {
        setError(data.error || data.details || "Upload failed")
        console.error("❌ Upload failed:", data)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      console.error("❌ Upload error:", err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">File Upload Test</h1>
        <p className="text-gray-600">Test file parsing and upload functionality</p>
      </div>

      <div className="grid gap-6">
        {/* File Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file">Choose a file to test</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileChange}
                className="mt-2"
              />
            </div>
            
            {file && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Selected File:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Name:</strong> {file.name}</p>
                  <p><strong>Type:</strong> {file.type}</p>
                  <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p><strong>Extension:</strong> {file.name.split('.').pop()}</p>
                </div>
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Test File
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-800">File Info</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>Name:</strong> {result.fileInfo.name}</p>
                      <p><strong>Type:</strong> {result.fileInfo.type}</p>
                      <p><strong>Size:</strong> {result.fileInfo.size} bytes</p>
                      <p><strong>Extension:</strong> {result.fileInfo.extension}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800">Parsing Results</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>Name:</strong> {result.parsedData.name}</p>
                      <p><strong>Email:</strong> {result.parsedData.email || "Not found"}</p>
                      <p><strong>Phone:</strong> {result.parsedData.phone || "Not found"}</p>
                      <p><strong>Role:</strong> {result.parsedData.currentRole || "Not found"}</p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-green-700">
                  <p><strong>Parsing Time:</strong> {result.parsingTime}ms</p>
                  <p><strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Test Failed:</strong> {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}


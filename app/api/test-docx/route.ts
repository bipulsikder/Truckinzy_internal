import { NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { parseResume } from "@/lib/resume-parser"

export async function POST(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("=== Testing DOCX File Parsing ===")
    
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: "No file provided"
      }, { status: 400 })
    }

    console.log(`Testing DOCX parsing for file: ${file.name}`)
    console.log(`File type: ${file.type}`)
    console.log(`File size: ${file.size} bytes`)
    
    // Check file extension
    const fileName = file.name.toLowerCase()
    const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc')
    const isPdf = fileName.endsWith('.pdf')
    const isText = fileName.endsWith('.txt')
    
    console.log(`File extension check: DOCX=${isDocx}, PDF=${isPdf}, TXT=${isText}`)
    
    // Test the parsing
    const startTime = Date.now()
    const parsedData = await parseResume(file)
    const endTime = Date.now()
    
    console.log(`✅ Parsing completed in ${endTime - startTime}ms`)
    
    return NextResponse.json({
      success: true,
      message: "DOCX parsing test completed successfully",
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size,
        extension: fileName.split('.').pop(),
        isDocx,
        isPdf,
        isText
      },
      parsedData: {
        name: parsedData.name,
        email: parsedData.email,
        phone: parsedData.phone,
        currentRole: parsedData.currentRole,
        currentCompany: parsedData.currentCompany,
        location: parsedData.location,
        totalExperience: parsedData.totalExperience,
        technicalSkills: parsedData.technicalSkills?.slice(0, 5) || [],
        softSkills: parsedData.softSkills?.slice(0, 5) || [],
        fileName: parsedData.fileName,
        status: parsedData.status
      },
      parsingTime: endTime - startTime,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("❌ DOCX parsing test failed:", error)
    
    return NextResponse.json({
      success: false,
      error: "DOCX parsing test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}


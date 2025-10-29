import { NextRequest, NextResponse } from "next/server"
import { parseResume } from "../../../lib/resume-parser"

export async function POST(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("=== Testing Resume Parsing ===")
    
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: "No file provided"
      }, { status: 400 })
    }

    console.log(`Testing parsing for file: ${file.name} (${file.type})`)
    
    // Test the parsing
    const parsedData = await parseResume(file)
    
    return NextResponse.json({
      success: true,
      message: "Parsing test completed successfully",
      data: {
        name: parsedData.name,
        email: parsedData.email,
        phone: parsedData.phone,
        currentRole: parsedData.currentRole,
        currentCompany: parsedData.currentCompany,
        location: parsedData.location,
        totalExperience: parsedData.totalExperience,
        highestQualification: parsedData.highestQualification,
        university: parsedData.university,
        technicalSkills: parsedData.technicalSkills,
        softSkills: parsedData.softSkills,
        fileName: parsedData.fileName,
        status: parsedData.status,
        tags: parsedData.tags
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("❌ Parsing test failed:", error)
    return NextResponse.json({
      success: false,
      error: "Parsing test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
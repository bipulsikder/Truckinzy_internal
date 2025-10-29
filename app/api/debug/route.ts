import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 })
  }

  try {
    console.log("=== Debug Endpoint Started ===")
    
    const envVars = {
      GOOGLE_SPREADSHEET_ID: process.env.GOOGLE_SPREADSHEET_ID ? "Set" : "Missing",
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? "Set" : "Missing",
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? "Set" : "Missing",
      NODE_ENV: process.env.NODE_ENV,
    }
    
    console.log("🔍 Environment variables:", envVars)
    
    return NextResponse.json({
      status: "debug",
      timestamp: new Date().toISOString(),
      environment: envVars,
      message: "Debug information retrieved"
    })
  } catch (error) {
    console.error("❌ Debug endpoint failed:", error)
    
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Debug endpoint failed"
    }, { status: 500 })
  }
}


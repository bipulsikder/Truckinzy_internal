import { NextResponse } from "next/server"
import { testGoogleSheetsConnection } from "@/lib/google-sheets"

export async function GET() {
  try {
    console.log("=== Health Check Started ===")
    
    // Test Google Sheets connectivity
    const sheetsConnected = await testGoogleSheetsConnection()
    
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      googleSheets: {
        connected: sheetsConnected,
        message: sheetsConnected ? "Connected successfully" : "Connection failed"
      },
      message: sheetsConnected ? "All systems operational" : "Google Sheets connection failed"
    })
  } catch (error) {
    console.error("❌ Health check failed:", error)
    
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      googleSheets: {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      message: "Health check failed"
    }, { status: 500 })
  }
}

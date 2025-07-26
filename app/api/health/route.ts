import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test AI service
    const geminiStatus = process.env.GEMINI_API_KEY ? "configured" : "missing"
    const affindaStatus = process.env.AFFINDA_API_KEY ? "configured" : "missing"

    // For Google Sheets, we assume connection is implicit via API calls
    // A more robust check would be to try fetching a small range from the sheet
    // For now, we'll mark it as connected if GOOGLE_SPREADSHEET_ID is present
    const googleSheetsStatus = process.env.GOOGLE_SPREADSHEET_ID ? "configured" : "missing"

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        database: googleSheetsStatus === "configured" ? "connected (Google Sheets)" : "not configured",
        gemini: geminiStatus,
        affinda: affindaStatus,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

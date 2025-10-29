import { NextRequest, NextResponse } from "next/server"
import { realignSpreadsheetData, cleanupSpreadsheetData } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  try {
    console.log("=== Admin Data Realignment Request ===")

    // Authorization: require login cookie or valid admin token
    const authCookie = request.cookies.get("auth")?.value
    const authHeader = request.headers.get("authorization")
    const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
    if (authCookie !== "true" && !hasAdminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()
    
    if (action === "realign") {
      console.log("Starting data realignment...")
      await realignSpreadsheetData()
      return NextResponse.json({ 
        success: true, 
        message: "Google Sheets data realigned successfully" 
      })
    } else if (action === "cleanup") {
      console.log("Starting data cleanup...")
      await cleanupSpreadsheetData()
      return NextResponse.json({ 
        success: true, 
        message: "Google Sheets data cleaned up successfully" 
      })
    } else if (action === "both") {
      console.log("Starting both realignment and cleanup...")
      await realignSpreadsheetData()
      await cleanupSpreadsheetData()
      return NextResponse.json({ 
        success: true, 
        message: "Google Sheets data realigned and cleaned up successfully" 
      })
    } else {
      return NextResponse.json({ 
        error: "Invalid action. Use 'realign', 'cleanup', or 'both'" 
      }, { status: 400 })
    }

  } catch (error) {
    console.error("❌ Admin data realignment failed:", error)
    return NextResponse.json(
      { 
        error: "Failed to process admin request", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}
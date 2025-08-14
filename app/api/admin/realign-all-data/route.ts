import { NextResponse } from "next/server"
import { realignAllData } from "../../../../lib/google-sheets"

export async function POST(request: Request) {
  try {
    console.log("=== Admin Request: Realign All Data ===")
    
    // Basic authentication check
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized - Bearer token required"
      }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    // You can add more sophisticated token validation here
    
    console.log("Starting complete data realignment...")
    const result = await realignAllData()
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: "All data successfully realigned",
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Data realignment failed"
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error("❌ Data realignment failed:", error)
    return NextResponse.json({
      success: false,
      error: "Data realignment failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 
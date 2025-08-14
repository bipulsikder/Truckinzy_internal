import { NextResponse } from "next/server"
import { restoreMissingProfiles } from "@/lib/google-sheets"

export async function POST() {
  try {
    console.log("=== Admin Profile Restoration Request ===")
    
    const result = await restoreMissingProfiles()
    
    return NextResponse.json({
      success: true,
      message: `Profile restoration completed. ${result.restored} profiles restored.`,
      result
    })
    
  } catch (error) {
    console.error("❌ Profile restoration failed:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Profile restoration failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
} 
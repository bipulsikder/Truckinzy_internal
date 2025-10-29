import { NextRequest, NextResponse } from "next/server"
import { restoreMissingProfiles } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
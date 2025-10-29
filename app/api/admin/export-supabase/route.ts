import { NextRequest, NextResponse } from "next/server"
import { SupabaseCandidateService } from "@/lib/supabase-candidates"

export async function GET(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "candidates"

    // Get all candidates from Supabase
    const candidates = await SupabaseCandidateService.getAllCandidates()

    // Convert to CSV based on type
    let csv = ""
    
    if (type === "candidates") {
      // Headers
      csv = "Name,Email,Phone,Current Role,Location,Status\n"
      
      // Data rows
      candidates.forEach(candidate => {
        csv += `"${candidate.name || ''}","${candidate.email || ''}","${candidate.phone || ''}","${candidate.currentRole || ''}","${candidate.location || ''}","${candidate.status || ''}"\n`
      })
    } else {
      // Headers for skills
      csv = "Name,Email,Technical Skills,Soft Skills\n"
      
      // Data rows
      candidates.forEach(candidate => {
        const technicalSkills = Array.isArray(candidate.technicalSkills) 
          ? candidate.technicalSkills.join("; ") 
          : ""
        
        const softSkills = Array.isArray(candidate.softSkills) 
          ? candidate.softSkills.join("; ") 
          : ""
        
        csv += `"${candidate.name || ''}","${candidate.email || ''}","${technicalSkills}","${softSkills}"\n`
      })
    }

    // Return CSV as a downloadable file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=${type}_export.csv`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 })
  }
}
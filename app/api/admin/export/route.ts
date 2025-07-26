import { NextResponse } from "next/server"
import { exportCandidatesToCSV } from "@/lib/google-sheets"

export async function GET() {
  try {
    const csvContent = await exportCandidatesToCSV()

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="candidates-export-${Date.now()}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export candidates" }, { status: 500 })
  }
}

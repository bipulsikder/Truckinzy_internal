import { NextResponse } from "next/server"
import { getAnalytics } from "@/lib/google-sheets"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "all"

    const analytics = await getAnalytics(period)
    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}

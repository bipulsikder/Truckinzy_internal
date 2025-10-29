import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Authorization: require login cookie or valid admin token
  const authCookie = request.cookies.get("auth")?.value
  const authHeader = request.headers.get("authorization")
  const hasAdminToken = authHeader === `Bearer ${process.env.ADMIN_TOKEN}`
  if (authCookie !== "true" && !hasAdminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { input, context } = await request.json()

    console.log("=== AI Suggestions API ===")
    console.log("Input:", input)
    console.log("Context:", context)

    // Enhanced AI-powered keyword suggestions for logistics
    const logisticsSuggestions = [
      // Fleet Management
      "Fleet Manager",
      "Fleet Administrator",
      "Fleet Coordinator",
      "Fleet Supervisor",
      "Fleet Director",
      "Fleet Operations Manager",
      "Fleet Maintenance Manager",
      "Vehicle Fleet Manager",

      // Logistics Roles
      "Logistics Manager",
      "Logistics Coordinator",
      "Logistics Executive",
      "Logistics Supervisor",
      "Logistics Analyst",
      "Logistics Operations Manager",
      "Logistics Planning Manager",
      "International Logistics Manager",

      // Supply Chain
      "Supply Chain Manager",
      "Supply Chain Coordinator",
      "Supply Chain Executive",
      "Supply Chain Analyst",
      "Supply Chain Planning Manager",
      "Supply Chain Operations Manager",

      // Transportation
      "Transport Manager",
      "Transport Coordinator",
      "Transport Executive",
      "Transport Planner",
      "Transport Supervisor",
      "Transportation Manager",
      "Transportation Coordinator",
      "Transportation Operations Manager",

      // Warehouse & Distribution
      "Warehouse Manager",
      "Warehouse Supervisor",
      "Warehouse Executive",
      "Warehouse Coordinator",
      "Warehouse Operations Manager",
      "Distribution Manager",
      "Distribution Coordinator",
      "Distribution Executive",

      // Operations
      "Operations Manager",
      "Operations Executive",
      "Operations Coordinator",
      "Operations Supervisor",
      "Operations Analyst",

      // Specialized Roles
      "Route Planner",
      "Route Optimizer",
      "Load Planner",
      "Freight Coordinator",
      "Cargo Manager",
      "Inventory Manager",
      "Procurement Manager",
      "Dispatcher",
      "Delivery Manager",
      "Delivery Executive",
      "Delivery Coordinator",

      // Driver Roles
      "Truck Driver",
      "Heavy Vehicle Driver",
      "Commercial Vehicle Driver",
      "LCV Driver",
      "HCV Driver",
      "Trailer Driver",
      "Container Driver",

      // Technical Skills
      "GPS Tracking",
      "Fleet Management Software",
      "Route Optimization",
      "FASTag",
      "Vehicle Tracking Systems",
      "Warehouse Management System",
      "WMS",
      "Transportation Management System",
      "TMS",
      "Supply Chain Management",
      "SCM",
      "Inventory Management",
      "Load Planning",
      "Freight Management",
      "Cargo Handling",
      "Vehicle Maintenance",
      "Fuel Management",
      "Driver Management",
      "Compliance Management",
      "Safety Management",
      "Cost Optimization",
      "Performance Analytics",
      "Logistics Planning",
      "Distribution Management",
      "Cold Chain Management",
      "Last Mile Delivery",
      "Cross Docking",
      "3PL Operations",
      "4PL Operations",

      // Certifications & Licenses
      "Commercial Driving License",
      "CDL",
      "Heavy Vehicle License",
      "Forklift Certification",
      "Crane Operator License",
      "Hazmat Certification",
      "Safety Certification",
      "ISO Certification",
      "Logistics Certification",

      // Software & Tools
      "SAP",
      "Oracle WMS",
      "Manhattan WMS",
      "JDA",
      "Blue Yonder",
      "Descartes",
      "Trimble",
      "Samsara",
      "Fleetio",
      "Verizon Connect",
      "Geotab",
      "Fleet Complete",
      "Teletrac Navman",

      // Industry Specific
      "E-commerce Logistics",
      "Retail Logistics",
      "Automotive Logistics",
      "Pharmaceutical Logistics",
      "Food & Beverage Logistics",
      "Chemical Logistics",
      "Construction Logistics",
      "Oil & Gas Logistics",
      "Mining Logistics",
      "Textile Logistics",
    ]

    // Smart filtering based on input
    const inputLower = input.toLowerCase()
    let filteredSuggestions = []

    // Exact matches first
    const exactMatches = logisticsSuggestions.filter((suggestion) => suggestion.toLowerCase().includes(inputLower))

    // Partial matches
    const partialMatches = logisticsSuggestions.filter((suggestion) => {
      const words = inputLower.split(" ")
      return words.some((word: string) => word.length > 2 && suggestion.toLowerCase().includes(word))
    })

    // Combine and deduplicate
    filteredSuggestions = [...new Set([...exactMatches, ...partialMatches])]

    // If no matches, provide contextual suggestions based on common logistics terms
    if (filteredSuggestions.length === 0) {
      const contextualSuggestions = [
        "Fleet Manager",
        "Logistics Coordinator",
        "Transport Manager",
        "Warehouse Supervisor",
        "Supply Chain Manager",
        "Route Planner",
        "Truck Driver",
        "Operations Manager",
        "Delivery Executive",
      ]
      filteredSuggestions = contextualSuggestions
    }

    // Return top 6 suggestions
    const suggestions = filteredSuggestions.slice(0, 6)

    console.log("Generated suggestions:", suggestions)
    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("AI suggestions error:", error)
    return NextResponse.json({ error: "Failed to get suggestions" }, { status: 500 })
  }
}

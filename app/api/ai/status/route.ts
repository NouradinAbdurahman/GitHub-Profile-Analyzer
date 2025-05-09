import { type NextRequest, NextResponse } from "next/server"
import { isDakaeiApiKeyConfigured } from "@/lib/env-utils"

export async function GET(request: NextRequest) {
  try {
    const isConfigured = isDakaeiApiKeyConfigured()
    
    return NextResponse.json({
      status: isConfigured ? "configured" : "not_configured",
      message: isConfigured 
        ? "DAKAEI_API_KEY is configured" 
        : "DAKAEI_API_KEY is not configured"
    })
  } catch (error) {
    console.error("Error checking API key status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

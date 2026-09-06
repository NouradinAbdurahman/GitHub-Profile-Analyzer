import { type NextRequest, NextResponse } from "next/server"
import { isOpenRouterApiKeyConfigured } from "@/lib/env-utils"

export async function GET(request: NextRequest) {
  try {
    const isConfigured = isOpenRouterApiKeyConfigured()

    return NextResponse.json({
      status: isConfigured ? "configured" : "not_configured",
      message: isConfigured
        ? "OPENROUTER_API_KEY is configured"
        : "OPENROUTER_API_KEY is not configured"
    })
  } catch (error) {
    console.error("Error checking API key status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

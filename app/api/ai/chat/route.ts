import { type NextRequest, NextResponse } from "next/server"
import { getOpenRouterApiKey } from "@/lib/env-utils"
import { preprocessAIResponse } from "@/lib/server-text-processor"
import { chatWithFallback, type ChatMessage } from "@/lib/openrouter"

export async function POST(request: NextRequest) {
  try {
    // Get the API key from environment variables (server-side only)
    const apiKey = getOpenRouterApiKey()

    if (!apiKey) {
      console.error("OPENROUTER_API_KEY environment variable is not configured")
      return NextResponse.json(
        { error: "API key not configured on the server" },
        { status: 500 }
      )
    }

    // Parse the request body
    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request format. 'messages' array is required." },
        { status: 400 }
      )
    }

    try {
      const { content, modelUsed } = await chatWithFallback(apiKey, messages as ChatMessage[])

      // Pre-process the AI response text to fix any character duplication or word repetition issues
      const processedContent = preprocessAIResponse(content)
      if (content !== processedContent) {
        console.log("Server-side text preprocessing applied to AI response")
      }

      console.log(`AI chat served by OpenRouter model: ${modelUsed}`)

      return NextResponse.json({
        choices: [{ message: { content: processedContent } }],
        model: modelUsed,
      })
    } catch (aiError: any) {
      console.error("All OpenRouter fallback attempts failed:", aiError)
      return NextResponse.json(
        { error: aiError.message || "AI service is currently unavailable" },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error("Error in AI chat API route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

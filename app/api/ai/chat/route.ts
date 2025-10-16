import { type NextRequest, NextResponse } from "next/server"
import { getDakaeiApiKey } from "@/lib/env-utils"
import { preprocessAIResponse } from "@/lib/server-text-processor"

export async function POST(request: NextRequest) {
  try {
    // Get the API key from environment variables (server-side only)
    const apiKey = getDakaeiApiKey()

    if (!apiKey) {
      console.error("DAKAEI_API_KEY environment variable is not configured")
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

    // Forward the request to the AI service
    const res = await fetch("https://console.dakaei.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ model: "qwen-3", messages }),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error")
      console.error(`AI API error: ${res.status} ${errorText}`)
      return NextResponse.json(
        { error: `API returned ${res.status}: ${errorText}` },
        { status: res.status }
      )
    }

    // Get the AI service response
    const data = await res.json()

    // Pre-process the AI response text to fix any character duplication or word repetition issues
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      const originalContent = data.choices[0].message.content

      // Apply server-side text preprocessing
      const processedContent = preprocessAIResponse(originalContent)

      // Update the response with the processed content
      data.choices[0].message.content = processedContent

      // Log if we made changes to help with debugging
      if (originalContent !== processedContent) {
        console.log("Server-side text preprocessing applied to AI response")
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in AI chat API route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  // Fix for Next.js 15 dynamic API routes - properly await params
  const params_resolved = await Promise.resolve(params);
  const username = params_resolved.username;

  if (!username) {
    return NextResponse.json({ error: "Username parameter is missing" }, { status: 400 })
  }

  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization')

    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Profile-Analyzer",
      Authorization: authHeader || `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
    }
    // Get query parameters
    const perPage = request.nextUrl.searchParams.get('per_page') || '100'
    const sort = request.nextUrl.searchParams.get('sort') || 'updated'
    const direction = request.nextUrl.searchParams.get('direction') || 'desc'

    // Add caching headers for performance improvement
    const responseHeaders = {
      'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
      'Content-Type': 'application/json'
    };

    // Use the specific user's repos endpoint
    const url = `https://api.github.com/users/${username}/repos?per_page=${perPage}&sort=${sort}&direction=${direction}`
    const response = await fetch(url, { 
      headers,
      next: { revalidate: 1800 } // 30 minutes cache
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: `GitHub API error: ${response.statusText}` }, { 
        status: response.status,
        headers: {
          'Cache-Control': 'public, max-age=60', // Cache errors for 1 minute
          'Content-Type': 'application/json'
        }
      })
    }
    
    const data = await response.json()
    return NextResponse.json(data, { headers: responseHeaders })
  } catch (error) {
    console.error("Error fetching repos:", error)
    return NextResponse.json({ error: "Failed to fetch repositories" }, { 
      status: 500,
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache errors for 1 minute
        'Content-Type': 'application/json'
      }
    })
  }
}
import { type NextRequest, NextResponse } from "next/server"

// GraphQL query to fetch user contributions
const CONTRIBUTIONS_QUERY = `
query($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            color
          }
        }
      }
    }
  }
}
`

export async function GET(request: NextRequest) {
  try {
    // Debug: Log cookies
    console.log("Cookies:", request.cookies);
    // Get the session cookie
    const sessionCookie = request.cookies.get("github_session")?.value;
    console.log("Session cookie:", sessionCookie);
    let access_token = null;
    let login = null; // Define login variable
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie);
        access_token = session.user?.access_token;
        login = session.user?.login || session.user?.username; // Extract login from session
        console.log("Session object:", session);
        console.log("Access token:", access_token);
        console.log("Login:", login);
      } catch (e) {
        console.error("Failed to parse session cookie", e);
      }
    }
    
    // Get username from query params if not found in session
    if (!login) {
      login = request.nextUrl.searchParams.get("username");
      console.log("Using username from query param:", login);
    }
    
    // Fallback: Use PAT for dev if no session
    if (!access_token && process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
      access_token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
      console.log("Using fallback PAT from .env");
    }
    
    if (!access_token) {
      return NextResponse.json({ error: "Not authenticated (no access token)" }, { status: 401 });
    }
    
    if (!login) {
      return NextResponse.json({ error: "Username not provided" }, { status: 400 });
    }
    
    // Get the year from query params or use current year
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get("year") || new Date().getFullYear().toString()
    
    // Calculate date range for the year
    const fromDate = new Date(`${year}-01-01T00:00:00Z`)
    const toDate = new Date(`${year}-12-31T23:59:59Z`)
    
    // If it's the current year, use today as the end date
    if (year === new Date().getFullYear().toString()) {
      toDate.setTime(new Date().getTime())
    }
    
    // Format dates for GraphQL
    const from = fromDate.toISOString()
    const to = toDate.toISOString()
    
    // Make GraphQL request to GitHub API
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "User-Agent": "GitHub-Profile-Analyzer"
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: { username: login, from, to }
      })
    })
    
    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`)
      return NextResponse.json({ error: "Failed to fetch from GitHub API" }, { status: response.status })
    }
    
    const data = await response.json()
    
    // Check for GraphQL errors
    if (data.errors) {
      console.error("GraphQL errors:", data.errors)
      return NextResponse.json({ error: "GraphQL query error", details: data.errors }, { status: 500 })
    }
    
    // Process the contribution data
    const contributionCalendar = data.data?.user?.contributionsCollection?.contributionCalendar
    
    if (!contributionCalendar) {
      return NextResponse.json({ error: "No contribution data found" }, { status: 404 })
    }
    
    // Transform the data into a more usable format
    const contributions: Record<string, number> = {}
    
    contributionCalendar.weeks.forEach((week: any) => {
      week.contributionDays.forEach((day: any) => {
        contributions[day.date] = day.contributionCount
      })
    })
    
    return NextResponse.json({
      contributions,
      total: contributionCalendar.totalContributions,
      source: "github_graphql_api"
    })
    
  } catch (error) {
    console.error("Error fetching authenticated user contributions:", error)
    return NextResponse.json({ error: "Failed to fetch contribution data" }, { status: 500 })
  }
}

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
    const token = authHeader 
      ? authHeader.replace('Bearer ', '').replace('token ', '') 
      : process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '';
    
    // If this is for the authenticated user and we have a token, use the /user/repos endpoint
    // which will include private repositories (if the token has the 'repo' scope)
    const isAuthenticatedUser = authHeader && token && username.toLowerCase() === await getAuthenticatedUsername(token);
    
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Profile-Analyzer",
      Authorization: `token ${token}`,
    }
    
    // Get query parameters
    const perPage = request.nextUrl.searchParams.get('per_page') || '100'
    const sort = request.nextUrl.searchParams.get('sort') || 'updated'
    const direction = request.nextUrl.searchParams.get('direction') || 'desc'
    const visibility = request.nextUrl.searchParams.get('visibility') || 'all'
    const type = request.nextUrl.searchParams.get('type') || 'all'
    const affiliation = request.nextUrl.searchParams.get('affiliation') || 'owner,collaborator,organization_member'

    // Add caching headers for performance improvement
    const responseHeaders = {
      'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
      'Content-Type': 'application/json'
    };

    // Use the authenticated user repos endpoint if this is the current user to get private repos
    // Otherwise use the standard user repos endpoint which only returns public repos
    let url;
    if (isAuthenticatedUser) {
      // For the authenticated user, use the /user/repos endpoint which includes private repos
      // Note: According to GitHub API docs, we can't use both visibility and type parameters together
      url = `https://api.github.com/user/repos?per_page=${perPage}&sort=${sort}&direction=${direction}&visibility=${visibility}&affiliation=${affiliation}`
      console.log("Using authenticated user endpoint to get private repos:", url);
    } else {
      // For other users, we can only get their public repos
      url = `https://api.github.com/users/${username}/repos?per_page=${perPage}&sort=${sort}&direction=${direction}`
      console.log("Using public user endpoint (private repos not available):", url);
    }
    
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

// Helper function to get the authenticated username from the token
async function getAuthenticatedUsername(token: string): Promise<string> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Profile-Analyzer'
      }
    });

    if (response.ok) {
      const userData = await response.json();
      return userData.login.toLowerCase();
    }
  } catch (error) {
    console.error("Error getting authenticated username:", error);
  }
  
  return '';
}
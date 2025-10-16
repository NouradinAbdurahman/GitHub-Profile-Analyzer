import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string; reponame: string } }
) {
  // Get username and repo name from params using proper destructuring
  const { username, reponame } = params;

  if (!username || !reponame) {
    return NextResponse.json(
      { error: "Username or repository name is missing" },
      { status: 400 }
    );
  }

  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get("authorization");

    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Profile-Analyzer",
      Authorization: authHeader || `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
    };

    // Add caching headers for performance improvement
    const responseHeaders = {
      "Cache-Control": "public, max-age=86400", // Cache for 24 hours (languages rarely change)
      "Content-Type": "application/json",
    };

    // Use the GitHub API endpoint for repo languages
    const url = `https://api.github.com/repos/${username}/${reponame}/languages`;
    
    const response = await fetch(url, {
      headers,
      next: { revalidate: 86400 }, // 24 hours cache
    });

    if (!response.ok) {
      console.error(`GitHub API error for ${reponame} languages: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `GitHub API error: ${response.statusText}` },
        {
          status: response.status,
          headers: {
            "Cache-Control": "public, max-age=300", // Cache errors for 5 minutes
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    console.error(`Error fetching languages for repo ${reponame}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch repository languages" },
      {
        status: 500,
        headers: {
          "Cache-Control": "public, max-age=60", // Cache errors for 1 minute
          "Content-Type": "application/json",
        },
      }
    );
  }
} 
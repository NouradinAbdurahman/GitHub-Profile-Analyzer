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

    // Add caching headers for performance improvement
    const responseHeaders = {
      'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
      'Content-Type': 'application/json'
    };

    // First get all repos for the user
    const reposUrl = `https://api.github.com/users/${username}/repos?per_page=100`
    const reposResponse = await fetch(reposUrl, { 
      headers,
      next: { revalidate: 1800 } // 30 minutes cache
    })
    
    if (!reposResponse.ok) {
      return NextResponse.json({ error: `GitHub API error: ${reposResponse.statusText}` }, { 
        status: reposResponse.status,
        headers: {
          'Cache-Control': 'public, max-age=60', // Cache errors for 1 minute
          'Content-Type': 'application/json'
        }
      })
    }
    
    const repos = await reposResponse.json()
    
    // Collect languages from all repos
    const languages: Record<string, number> = {}
    const languagePromises: Promise<void>[] = []
    
    // Only process non-fork repos that have a languages_url
    const nonForkRepos = repos.filter((repo: any) => !repo.fork && repo.languages_url)
    
    for (const repo of nonForkRepos) {
      const langPromise = fetch(repo.languages_url, { 
        headers,
        next: { revalidate: 1800 } // 30 minutes cache
      })
        .then(res => {
          if (res.ok) return res.json()
          return {}
        })
        .then((langData: Record<string, number>) => {
          // Accumulate language bytes across all repos
          for (const [lang, bytes] of Object.entries(langData)) {
            languages[lang] = (languages[lang] || 0) + bytes
          }
        })
        .catch(error => {
          console.error(`Error fetching languages for ${repo.name}:`, error)
        })
      
      languagePromises.push(langPromise)
    }
    
    // Wait for all language requests to complete
    await Promise.all(languagePromises)
    
    // Calculate percentages and total bytes
    const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0)
    const languageStats = Object.entries(languages).map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0
    })).sort((a, b) => b.bytes - a.bytes)
    
    return NextResponse.json({
      languages: languageStats,
      totalBytes,
      repoCount: nonForkRepos.length
    }, { headers: responseHeaders })
  } catch (error) {
    console.error("Error fetching user languages:", error)
    return NextResponse.json({ error: "Failed to fetch user languages" }, { 
      status: 500,
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache errors for 1 minute
        'Content-Type': 'application/json'
      }
    })
  }
} 
import { type NextRequest, NextResponse } from "next/server";
import { serverGitHubService, needsRefresh } from "@/lib/github-data-service";
import { getAdminDb } from "@/lib/firebase-admin-wrapper";

// Improve cache time based on data staleness
const CACHE_TIMES = {
  FRESH: 60 * 60, // 1 hour for fresh data
  STALE: 5 * 60,  // 5 minutes for stale data
  ERROR: 30       // 30 seconds on error
};

// Function to acquire rate limit
async function acquireRateLimit(operation: string, cost: number = 1): Promise<boolean> {
  try {
    const adminDb = await getAdminDb();
    if (!adminDb) {
      return true; // Allow the operation if we can't check rate limits
    }
    
    // Simple implementation just for API protection
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // On error, allow operation to proceed
  }
}

export async function GET(
  request: NextRequest, 
  { params }: { params: { username: string } }
) {
  // Fix for Next.js 15 dynamic API routes - properly await params
  const params_resolved = await Promise.resolve(params);
  const username = params_resolved.username;

  if (!username) {
    return NextResponse.json({ error: "Username parameter is missing" }, { status: 400 });
  }

  // Clean up username and normalize (GitHub usernames are case-insensitive)
  const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();

  // Check if username is valid GitHub format (alphanumeric with dashes, not starting with dash)
  if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/.test(cleanUsername)) {
    return NextResponse.json({ 
      error: "Invalid GitHub username format" 
    }, { status: 400 });
  }

  // Track performance
  const startTime = Date.now();
  
  try {
    // Add Cache-Control headers to prevent browser caching
    const requestHeaders = request.headers.get('cache-control') || '';
    const noCache = requestHeaders.includes('no-cache') || request.nextUrl.searchParams.has('nocache');
    
    // Set up response object for proper caching
    const responseInit: ResponseInit = {
      headers: {
        'Cache-Control': noCache ? 'no-cache, no-store' : `public, max-age=${CACHE_TIMES.FRESH}`,
        'Content-Type': 'application/json'
      }
    };
    
    // First, try to get cached data from Firestore if we're not forcing a refresh
    if (!noCache) {
      try {
        const cachedUserData = await serverGitHubService.getUser(cleanUsername);
        
        if (cachedUserData) {
          // Check if we need to refresh the data
          const needsRefreshing = await needsRefresh(cleanUsername);
          
          if (!needsRefreshing) {
            console.log(`Using cached data for ${cleanUsername} (${Date.now() - startTime}ms)`);
            return NextResponse.json(cachedUserData, {
              headers: {
                'Cache-Control': `public, max-age=${CACHE_TIMES.FRESH}`,
                'Content-Type': 'application/json'
              }
            });
          } else {
            // Data is stale but usable - return quickly while triggering background refresh
            console.log(`Using stale data for ${cleanUsername} while refreshing`);
            
            // Trigger background refresh without blocking response
            refreshInBackground(cleanUsername);
            
            return NextResponse.json({
              ...cachedUserData,
              _cache: 'stale-while-revalidate'
            }, {
              headers: {
                'Cache-Control': `public, max-age=${CACHE_TIMES.STALE}`,
                'Content-Type': 'application/json'
              }
            });
          }
        }
      } catch (cacheError) {
        console.warn("Failed to access cached data, continuing with GitHub API:", cacheError);
      }
    }
    
    // Check if we can make a request based on rate limits
    const canMakeRequest = await acquireRateLimit('github_user', 1);
    if (!canMakeRequest) {
      return NextResponse.json({ 
        error: "GitHub API rate limit exceeded. Please try again later." 
      }, { 
        status: 429,
        headers: {
          'Cache-Control': 'public, max-age=60', // Cache rate limit errors for 1 minute
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Fetch fresh data from GitHub API
    console.log(`Fetching fresh data for ${cleanUsername}`);
    
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Profile-Analyzer",
      Authorization: `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
    };
    
    const response = await fetch(`https://api.github.com/users/${cleanUsername}`, {
      headers,
      // Add caching params at fetch level
      next: noCache ? { revalidate: 0 } : { revalidate: 3600 } // 0 = no cache or 1 hour
    }).catch(fetchError => {
      console.error(`Network error fetching GitHub data for ${cleanUsername}:`, fetchError);
      throw new Error(`Network error: ${fetchError.message || 'Failed to connect to GitHub API'}`);
    });

    if (response.status === 404) {
      return NextResponse.json({ 
        error: `The GitHub username "${cleanUsername}" could not be found.`
      }, { 
        status: 404,
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache not found responses for 5 minutes
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!response.ok) {
      // Try to get response body for better error reporting
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (textError) {
        console.error('Failed to read error response body:', textError);
      }
      
      console.error(`GitHub API error (${response.status}): ${response.statusText}`, errorBody);
      
      return NextResponse.json({ 
        error: `GitHub API error: ${response.statusText || response.status}`,
        details: errorBody ? errorBody.substring(0, 200) : undefined // Truncate long error messages
      }, { 
        status: response.status,
        headers: {
          'Cache-Control': `public, max-age=${CACHE_TIMES.ERROR}`,
          'Content-Type': 'application/json'
        }
      });
    }

    // Parse the JSON with error handling
    let userData;
    try {
      userData = await response.json();
    } catch (jsonError) {
      console.error(`Error parsing user data for ${cleanUsername}:`, jsonError);
      throw new Error('Failed to parse GitHub API response');
    }
    
    // Validate the response contains expected data
    if (!userData || typeof userData !== 'object' || !userData.login) {
      console.error(`Invalid GitHub API response for ${cleanUsername}:`, userData);
      throw new Error('Invalid response from GitHub API');
    }

    // Fetch repos in a separate non-blocking request
    fetchReposInBackground(cleanUsername, headers);

    // Save the user data to Firestore in background
    try {
      serverGitHubService.saveUser(userData).catch(err => 
        console.warn(`Background save failed for ${cleanUsername}:`, err)
      );
    } catch (saveUserError) {
      console.warn(`Failed to queue cache for ${cleanUsername}:`, saveUserError);
    }

    console.log(`Completed request for ${cleanUsername} in ${Date.now() - startTime}ms`);
    return NextResponse.json(userData, {
      headers: {
        'Cache-Control': noCache ? 'no-cache, no-store' : `public, max-age=${CACHE_TIMES.FRESH}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error:", error);
    
    // On error, try cached data as fallback with short cache time
    try {
      const cachedUserData = await serverGitHubService.getUser(cleanUsername);
      if (cachedUserData) {
        return NextResponse.json({
          ...cachedUserData,
          _fromCache: true,
          _error: "Live data unavailable"
        }, {
          headers: {
            'Cache-Control': `public, max-age=${CACHE_TIMES.ERROR}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (cacheError) {
      console.error("Error retrieving cached data:", cacheError);
    }
    
    return NextResponse.json({ 
      error: `Failed to fetch GitHub user data for "${cleanUsername}"`
    }, { 
      status: 500,
      headers: {
        'Cache-Control': `public, max-age=${CACHE_TIMES.ERROR}`,
        'Content-Type': 'application/json'
      }
    });
  }
}

// Function to fetch repos in background without blocking
async function fetchReposInBackground(username: string, headers: HeadersInit) {
  try {
    setTimeout(async () => {
      try {
        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
          headers,
          next: { revalidate: 3600 } // 1 hour cache
        }).catch(fetchError => {
          console.error(`Network error fetching repos for ${username}:`, fetchError);
          return null;
        });

        if (!reposResponse) {
          console.error(`Failed to fetch repos for ${username}: Network error`);
          return;
        }

        if (!reposResponse.ok) {
          console.error(`Failed to fetch repos for ${username}: ${reposResponse.status} ${reposResponse.statusText}`);
          return;
        }

        // Parse the JSON with error handling
        let reposData;
        try {
          reposData = await reposResponse.json();
        } catch (jsonError) {
          console.error(`Error parsing repos data for ${username}:`, jsonError);
          return;
        }

        // Validate repos data is an array
        if (!Array.isArray(reposData)) {
          console.error(`Invalid repos data format for ${username}:`, reposData);
          return;
        }

        // Save repos to Firestore
        await serverGitHubService.saveRepositories(username, reposData)
          .catch(err => console.warn(`Failed to save repos for ${username}:`, err));
          
        console.log(`Successfully processed ${reposData.length} repositories for ${username}`);
      } catch (innerError) {
        console.error(`Error in background repos fetch for ${username}:`, innerError);
      }
    }, 10); // Start almost immediately but don't block
  } catch (error) {
    console.error(`Error in background repos fetch for ${username}:`, error);
  }
}

// Function to refresh data in background
async function refreshInBackground(username: string) {
  try {
    setTimeout(async () => {
      try {
        const canRefresh = await acquireRateLimit('github_user_refresh', 1);
        if (!canRefresh) {
          console.log(`Skipping background refresh for ${username} due to rate limits`);
          return; // Skip if rate limited
        }
        
        const headers = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitHub-Profile-Analyzer",
          Authorization: `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
        };
        
        const response = await fetch(`https://api.github.com/users/${username}`, { headers })
          .catch(fetchError => {
            console.error(`Network error refreshing data for ${username}:`, fetchError);
            return null;
          });
        
        if (!response) {
          console.error(`Failed to refresh data for ${username}: Network error`);
          return;
        }
        
        if (!response.ok) {
          console.error(`Failed to refresh data for ${username}: ${response.status} ${response.statusText}`);
          return;
        }
        
        // Parse the JSON with error handling
        let userData;
        try {
          userData = await response.json();
        } catch (jsonError) {
          console.error(`Error parsing refreshed data for ${username}:`, jsonError);
          return;
        }
        
        // Validate the response contains expected data
        if (!userData || typeof userData !== 'object' || !userData.login) {
          console.error(`Invalid GitHub API response for refresh of ${username}:`, userData);
          return;
        }
        
        await serverGitHubService.saveUser(userData);
        console.log(`Background refresh completed for ${username}`);
        
        // Also refresh repositories for complete data
        fetchReposInBackground(username, headers);
      } catch (innerError) {
        console.error(`Error in background refresh for ${username}:`, innerError);
      }
    }, 100); // Start after response is sent
  } catch (error) {
    console.error(`Error setting up background refresh for ${username}:`, error);
  }
}

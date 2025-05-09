import { NextResponse } from 'next/server';
import { z } from 'zod'; // Using Zod for validation

// --- Server-side GitHub Data Fetching Helpers ---

// Helper to create authenticated fetch options
function getGitHubFetchOptions() {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  // Use GitHub token if available for higher rate limits
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return { headers, cache: 'no-store' as RequestCache }; // Avoid caching GitHub data on the server route
}

async function getGitHubUserData(username: string): Promise<any> {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}`;
  console.log(`Fetching GitHub user data from: ${url}`);

  try {
    const response = await fetch(url, getGitHubFetchOptions());

    if (response.status === 404) {
      console.warn(`GitHub user not found: ${username}`);
      throw new Error(`GitHub user '${username}' not found.`);
    }
    if (response.status === 403 || response.status === 429) {
      console.warn(`GitHub API rate limit hit or forbidden for user: ${username}`);
      throw new Error('GitHub API rate limit exceeded or access forbidden. Check your GITHUB_TOKEN.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub API error for user ${username}: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch GitHub user data: ${response.statusText}`);
    }

    const userData = await response.json();
    return userData;

  } catch (error: any) {
    console.error(`Error in getGitHubUserData for ${username}:`, error);
    // Re-throw the error to be caught by the main handler
    throw error;
  }
}

async function getGitHubUserRepos(username: string, count: number = 6): Promise<any[]> {
  // Fetch recent repos, sorted by push date, limit count
  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=${count}&type=owner`;
  console.log(`Fetching GitHub repos from: ${url}`);

  try {
    const response = await fetch(url, getGitHubFetchOptions());

    if (response.status === 404) {
      // A 404 for repos might just mean the user exists but has 0 repos, which is okay
      console.log(`No repositories found for user ${username} (or user not found).`);
      return []; // Return empty array, not an error
    }
     if (response.status === 403 || response.status === 429) {
      console.warn(`GitHub API rate limit hit or forbidden for repos: ${username}`);
      // Don't necessarily throw, maybe AI can work with just user data
      return []; // Return empty array
    }
    if (!response.ok) {
       const errorText = await response.text();
      console.error(`GitHub API error for repos ${username}: ${response.status} ${response.statusText}`, errorText);
      // Don't necessarily throw, maybe AI can work with just user data
      return []; // Return empty array
    }

    const reposData = await response.json();
    return Array.isArray(reposData) ? reposData : []; // Ensure it's an array

  } catch (error: any) {
    console.error(`Error in getGitHubUserRepos for ${username}:`, error);
    // Don't throw here, allow the process to continue if user data was fetched
    return []; // Return empty array on fetch failure
  }
}

// --- AI Model Interaction ---

interface AIModelResponse {
  stream?: ReadableStream<Uint8Array>; // Return stream if successful stream request
  error?: string; // Return error message if failed
  result?: string; // Return full result if non-streaming succeeds
}

// Modified to handle potential stream or error/full result
async function callAIModel(
  apiKey: string, 
  prompt: string, 
  maxTokens: number = 1500, // Keep a high limit, stream controls actual length
  requestStream: boolean = false // Flag to request stream
): Promise<AIModelResponse> {
  const endpoint = "https://console.dakaei.com/api/chat";
  const modelToUse = "deepseek-chat"; 

  console.log(`Calling DAKAEI API (${modelToUse}) at: ${endpoint} with stream: ${requestStream}, max_tokens: ${maxTokens}`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens, // Use potentially high limit
        temperature: 0.7, 
        stream: requestStream, // Set based on parameter
      }),
      // Important for Cloudflare/Vercel edge environments: prevent duplex streaming issues
      // @ts-ignore
      duplex: 'half' 
    });

    // If response is not OK, try to parse error and return
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error("DAKAEI API Error:", response.status, JSON.stringify(errorData.error || errorData, null, 2));
        const errorMessage = errorData.error?.message || `DAKAEI API request failed with status ${response.status}`;
        return { error: errorMessage };
      } catch (parseError) {
        // If parsing error fails, return status text
        console.error("DAKAEI API Error: Status", response.status, "Failed to parse error body.");
        return { error: `DAKAEI API request failed with status ${response.status}` };
      }
    }

    // If streaming was requested and response body exists
    if (requestStream && response.body) {
      console.log("DAKAEI API returned a stream.");
      return { stream: response.body }; // Return the readable stream
    }

    // If not streaming, parse the full response
    if (!requestStream) {
       const data = await response.json();
       const resultText = data.choices?.[0]?.message?.content;
       if (!resultText) {
          console.error("Could not find result text in DAKAEI non-stream response:", JSON.stringify(data, null, 2));
          return { error: "AI response format was unexpected." };
       }
       return { result: resultText.trim() };
    }
    
    // Should not happen if stream: true and response.ok, but handle defensively
    return { error: "AI response handling error." };

  } catch (error: any) {
    console.error("Error calling DAKAEI model (fetch failed):", error); 
    return { error: `Failed to call AI model: ${error.message}` };
  }
}

// --- Prompt Generation ---

function generatePrompt(type: string, userData: any, reposData: any[]): string {
  // Basic profile info string
  const profileInfo = `
User: ${userData.login} (${userData.name || 'N/A'})
Bio: ${userData.bio || 'N/A'}
Repositories: ${userData.public_repos || 0}
Followers: ${userData.followers || 0}
Following: ${userData.following || 0}
Member Since: ${new Date(userData.created_at).toLocaleDateString()}
`.trim();

  // Basic repo info string (customize as needed)
  const repoSummary = reposData.slice(0, 5).map(repo =>
    `- ${repo.name}: ${repo.description || 'No description'} (Lang: ${repo.language || 'N/A'}, Stars: ${repo.stargazers_count || 0})`
  ).join('\n');

  switch (type) {
    case 'summary':
      return `
Generate a concise, professional summary (2-3 sentences) for the following GitHub profile. Highlight key aspects like primary languages or overall developer persona based ONLY on the provided user profile information. Do not invent information.

Profile Information:
${profileInfo}

Summary:`;

    case 'optimizer':
      return `
Analyze the following GitHub profile information and provide 2-4 actionable suggestions for improvement. Focus on areas like the bio, pinned repositories (if known), activity patterns (if inferrable), and overall presentation based ONLY on the provided data.

Profile Information:
${profileInfo}

Recent Repositories Summary:
${repoSummary}

Optimization Suggestions:`;

    case 'recommendations':
      return `
Based on the following GitHub profile and repository information, suggest 1-2 relevant open-source projects, potential collaborators, or learning resources that might interest this user. Justify each recommendation briefly based ONLY on the provided data (e.g., based on languages used, repository topics).

Profile Information:
${profileInfo}

Recent Repositories Summary:
${repoSummary}

Recommendations:`;

    default:
      throw new Error(`Invalid AI tool type: ${type}`);
  }
}

// --- API Route Handler ---

// Removed Zod schema for context validation here, will validate manually
// const routeContextSchema = z.object({ ... });

export async function GET(
  req: Request,
  context: { params: { type: string } }
) {
  const startTime = Date.now(); 
  const type = context?.params?.type;
  console.log(`[${type}] Request received (Streaming).`);

  // 1. Check API Key
  const apiKey = process.env.DAKAEI_API_KEY;
  if (!apiKey) {
    console.error("DAKAEI_API_KEY is not configured.");
    return NextResponse.json({ error: 'DAKAEI_API_KEY is not configured on the server.' }, { status: 500 });
  }

  // 2. Validate Input Type Manually
  const allowedTypes = ['summary', 'optimizer', 'recommendations'];
  if (!type || !allowedTypes.includes(type)) {
    console.error(`Invalid AI tool type received in URL: '${type}'`);
    return NextResponse.json({ error: `Invalid AI tool type requested. Received: ${type}` }, { status: 400 });
  }

  // 3. Get Username from Query Params
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username query parameter is required.' }, { status: 400 });
  }
  console.log(`[${type}] Processing request for username: ${username}`);

  // 4. Fetch Data and Call AI Model
  try {
    // Fetch GitHub User Data
    const githubUserStartTime = Date.now();
    console.log(`[${type}] Fetching GitHub user data...`);
    const userData = await getGitHubUserData(username);
    console.log(`[${type}] Fetched GitHub user data. Time: ${Date.now() - githubUserStartTime}ms`);

    // Fetch GitHub Repo Data
    const githubRepoStartTime = Date.now();
    console.log(`[${type}] Fetching GitHub repo data...`);
    const reposData = await getGitHubUserRepos(username);
    console.log(`[${type}] Fetched GitHub repo data. Count: ${reposData.length}. Time: ${Date.now() - githubRepoStartTime}ms`);

    // Generate Prompt
    const prompt = generatePrompt(type, userData, reposData);
    // console.log(`[${type}] Generated Prompt:`, prompt); // Optional: log full prompt

    // Set token limit based on type
    let maxTokens;
    if (type === 'summary') {
      maxTokens = 500; // Shorter limit for concise summaries
    } else {
      maxTokens = 1500; // Keep a reasonable limit for longer tools, stream controls actual length
    }

    // Call AI Model requesting a stream
    const aiCallStartTime = Date.now();
    console.log(`[${type}] Calling AI model (streaming) with maxTokens=${maxTokens}...`);
    const aiResponse = await callAIModel(apiKey, prompt, maxTokens, true); // Request stream = true
    console.log(`[${type}] AI model call initiated/responded. Time: ${Date.now() - aiCallStartTime}ms`);

    // Check for immediate errors from the call
    if (aiResponse.error) {
      console.error(`[${type}] AI Model call failed immediately: ${aiResponse.error}`);
      return NextResponse.json({ error: `AI Error: ${aiResponse.error}` }, { status: 500 });
    }

    // Check if we got a stream back
    if (aiResponse.stream) {
        // Return the stream directly to the client
        console.log(`[${type}] Returning stream to client. Total setup time: ${Date.now() - startTime}ms`);
        return new Response(aiResponse.stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } else {
        // This case should not happen if stream: true was requested and no error occurred
        console.error(`[${type}] AI Model call succeeded but did not return a stream.`);
        return NextResponse.json({ error: 'AI failed to provide a stream.' }, { status: 500 });
    }

  } catch (error: any) {
    // Catch errors from GitHub fetching or other setup issues
    const totalTime = Date.now() - startTime;
    console.error(`[${type}] Error during processing: ${error.message}. Total time: ${totalTime}ms`, error);
    return NextResponse.json({ error: error.message || 'Internal server error processing request.' }, { status: 500 });
  }
}

// Optional: Prevent caching of AI results
export const revalidate = 0; 
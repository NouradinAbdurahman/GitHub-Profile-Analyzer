import { type NextRequest, NextResponse } from "next/server"

// Define how many pages of events to fetch - Maximize to 10 (300 events total)
const MAX_EVENT_PAGES = 10; // GitHub typically limits pagination to 300 events for this endpoint

// Define the structure for monthly counts including breakdown
interface MonthlyActivity {
    month: string; // Ensure month is part of the object
    commits: number;
    issues: number;
    prs: number;
    total: number;
}

// --- Mock Data Generator (Updated) ---
function generateMockActivityData(username: string): MonthlyActivity[] {
    const mockData: MonthlyActivity[] = [];
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) { // Loop backwards to generate chronologically
        const date = new Date(currentDate);
        date.setMonth(currentDate.getMonth() - i);
        const monthStr = date.toLocaleString('default', { month: 'short', year: '2-digit' });

        // Generate random counts for each type
        const commits = Math.floor(Math.random() * 8); // 0-7 commits
        const issues = Math.floor(Math.random() * 3);  // 0-2 issues
        const prs = Math.floor(Math.random() * 4);     // 0-3 PRs
        const total = commits + issues + prs;

        // Only add month if there was some activity
        if (total > 0) {
             mockData.push({
                month: monthStr,
                commits: commits,
                issues: issues,
                prs: prs,
                total: total,
             });
        } else {
            // Optionally add months with 0 activity if desired for chart continuity
             mockData.push({ month: monthStr, commits: 0, issues: 0, prs: 0, total: 0 });
        }
    }
     // Ensure data is sorted correctly just in case loop logic changes
     return mockData.sort((a, b) => {
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
        const aDate = new Date(`${aMonth} 1, 20${aYear}`);
        const bDate = new Date(`${bMonth} 1, 20${bYear}`);
        return aDate.getTime() - bDate.getTime();
    });
}

// Helper function to fetch a single page of events
async function fetchEventPage(url: string, headers: Record<string, string>): Promise<any[] | null> {
    try {
        const response = await fetch(url, { headers, next: { revalidate: 3600 } }); // 1 hour cache per page

        // Log rate limit for each page fetch
        const rateLimit = response.headers.get('X-RateLimit-Remaining');
        const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
        console.log(`[ACTIVITY API - Page Fetch] URL: ${url}, Status: ${response.status}, Rate limit: ${rateLimit}/${rateLimitLimit}`);

        if (!response.ok) {
            // Handle specific errors for this page fetch, but don't stop fetching other pages yet
            if (response.status === 404) {
                console.error(`[ACTIVITY API] User not found during page fetch: ${url}`);
                // Propagate 404 specifically if it's the first page potentially
            } else if (response.status === 401) {
                console.error(`[ACTIVITY API] Unauthorized on page fetch: ${url}`);
            } else if (response.status === 403 || response.status === 429) {
                console.error(`[ACTIVITY API] Rate limit hit or forbidden on page fetch: ${url}`);
            } else {
                console.error(`[ACTIVITY API] GitHub API error on page fetch: ${response.status} - ${response.statusText}, URL: ${url}`);
            }
            return null; // Indicate failure for this page
        }
        const data = await response.json();
        return Array.isArray(data) ? data : null; // Return data array or null on parse error/unexpected format
    } catch (pageError) {
        console.error(`[ACTIVITY API] Network error fetching event page ${url}:`, pageError);
        return null; // Indicate failure
    }
}

// --- GraphQL Processing --- 
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

// Function to process GraphQL contribution data into monthly counts with breakdown
function processContributionData(contributions: any): any[] { 
    const eventsByMonth: Record<string, Omit<MonthlyActivity,'month'>> = {}; 
    const contributionTypeMap: Record<string, keyof Omit<MonthlyActivity, 'total'|'month'>> = {
        'commitContributionsByRepository': 'commits',
        'issueContributionsByRepository': 'issues',
        'pullRequestContributionsByRepository': 'prs',
    };

    try {
        Object.entries(contributionTypeMap).forEach(([gqlType, countKey]) => {
            if (contributions[gqlType] && Array.isArray(contributions[gqlType])) { 
                contributions[gqlType].forEach((repoContribution: any) => {
                    if (repoContribution?.contributions?.nodes && Array.isArray(repoContribution.contributions.nodes)) {
                        repoContribution.contributions.nodes.forEach((contribution: any) => {
                            if (contribution.occurredAt) {
                                try {
                                    const month = new Date(contribution.occurredAt).toLocaleString('default', { month: 'short', year: '2-digit' });
                                    if (!eventsByMonth[month]) {
                                        eventsByMonth[month] = { commits: 0, issues: 0, prs: 0, total: 0 };
                                    }
                                    eventsByMonth[month][countKey]++;
                                    eventsByMonth[month].total++;
                                } catch (dateError) {
                                    console.error("Error parsing contribution date:", contribution.occurredAt, dateError);
                                }
                            }
                        });
                    } else if (repoContribution?.contributions?.nodes) {
                       console.warn(`[ACTIVITY API - GraphQL Proc] contributions.nodes for ${gqlType} was not an array:`, repoContribution.contributions.nodes);
                    }
                });
            } else if (contributions[gqlType]) {
               console.warn(`[ACTIVITY API - GraphQL Proc] Contribution type ${gqlType} was not an array:`, contributions[gqlType]);
            }
        });
    } catch (processingError) {
        console.error("[ACTIVITY API - GraphQL Proc] Error processing contribution data:", processingError, contributions);
        return []; 
    }

    // Sort months chronologically
     return Object.entries(eventsByMonth)
        .map(([month, counts]) => ({ month, ...counts })) 
        .sort((a, b) => {
             const [aMonth, aYear] = a.month.split(' ');
             const [bMonth, bYear] = b.month.split(' ');
             if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
             const aDate = new Date(`${aMonth} 1, 20${aYear}`);
             const bDate = new Date(`${bMonth} 1, 20${bYear}`);
             return aDate.getTime() - bDate.getTime();
        });
}

// --- API Route Handler (Update Fallbacks) --- 
export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
    const params_resolved = await Promise.resolve(params);
    const username = params_resolved.username;
    console.log(`[ACTIVITY API - GraphQL] Attempting to fetch activity for user: ${username}`);
    if (!username) { return NextResponse.json({ error: "Username parameter is missing" }, { status: 400 }); }

    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

    if (!githubToken) {
        console.warn("[ACTIVITY API - GraphQL] No GitHub token found. Returning mock data.");
        return NextResponse.json(generateMockActivityData(username), {
            headers: { 'Cache-Control': 'public, max-age=300', 'Content-Type': 'application/json', 'X-Data-Source': 'mock-no-token' }
        });
    }

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(toDate.getMonth() - 6);
    const graphqlQuery = `
    query UserContributions($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        login
        contributionsCollection(from: $from, to: $to) {
           commitContributionsByRepository(maxRepositories: 100) {
             contributions(first: 100) { nodes { occurredAt } } 
           }
           issueContributionsByRepository(maxRepositories: 100) {
             contributions(first: 100) { nodes { occurredAt } }
           }
           pullRequestContributionsByRepository(maxRepositories: 100) {
             contributions(first: 100) { nodes { occurredAt } }
           }
        }
      }
    }`;

    try {
        console.log(`[ACTIVITY API - GraphQL] Sending query for ${username} from ${fromDate.toISOString()} to ${toDate.toISOString()}`);
        const response = await fetch(GITHUB_GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${githubToken}`,
                'User-Agent': 'GitHub-Profile-Analyzer',
            },
            body: JSON.stringify({
                query: graphqlQuery,
                variables: { username: username, from: fromDate.toISOString(), to: toDate.toISOString() },
            }),
             next: { revalidate: 3600 } 
        });

        const rateLimit = response.headers.get('X-RateLimit-Remaining');
        const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
        console.log(`[ACTIVITY API - GraphQL] Status: ${response.status}, Rate limit: ${rateLimit}/${rateLimitLimit}`);
        const result = await response.json();

        // DEBUG: Log the raw GraphQL response to diagnose empty activity
        console.log('[ACTIVITY API - GraphQL] Raw GraphQL response:', JSON.stringify(result, null, 2));

        if (!response.ok) {
            console.error(`[ACTIVITY API - GraphQL] GitHub API error: ${response.status}`, result);
             if (result?.errors?.some((err: any) => err.type === 'NOT_FOUND')) {
                 console.warn(`[ACTIVITY API - GraphQL] User ${username} not found via GraphQL.`);
                 return NextResponse.json({ error: 'User not found' }, { status: 404 });
             }
            return NextResponse.json({ error: 'GitHub API error', details: result }, { status: response.status });
        }
        if (!result.data?.user) {
             console.error(`[ACTIVITY API - GraphQL] User not found in GraphQL response data for ${username}.`);
              return NextResponse.json({ error: 'User not found in data' }, { status: 404 });
        }
        if (result.errors || !result.data.user.contributionsCollection) {
             console.error(`[ACTIVITY API - GraphQL] GraphQL query errors or missing contributionsCollection:`, result.errors || 'Missing contributionsCollection');
             return NextResponse.json({ error: 'GraphQL query error or missing contributionsCollection', details: result.errors }, { status: 500 });
        }

        const processedData = processContributionData(result.data.user.contributionsCollection);

        if (processedData.length === 0) {
             console.log(`[ACTIVITY API - GraphQL] No contributions found for ${username}. Returning empty array.`);
             return NextResponse.json([], {
                 headers: { 'Cache-Control': 'public, max-age=300', 'Content-Type': 'application/json', 'X-Data-Source': 'github-graphql-empty' }
             });
        }

         console.log(`[ACTIVITY API - GraphQL] Returning ${processedData.length} months of processed contribution data with breakdown.`);
        return NextResponse.json(processedData, {
            headers: {
                'Cache-Control': 'public, max-age=3600',
                'Content-Type': 'application/json',
                'X-Data-Source': 'github-graphql'
            }
        });

    } catch (error) {
        console.error("[ACTIVITY API - GraphQL] Error fetching or processing activity:", error);
        return NextResponse.json({ error: 'Exception fetching or processing activity', details: error?.toString?.() }, { status: 500 });
    }
}
import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from 'cheerio'

// Function to scrape GitHub contribution data
async function scrapeGitHubContributions(username: string) {
  try {
    // Fetch the GitHub profile page
    const response = await fetch(`https://github.com/${username}`, {
      headers: {
        'User-Agent': 'GitHub-Profile-Analyzer',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub profile: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Extract contribution data from the SVG graph
    const contributionData: Record<string, number> = {}
    let totalContributions = 0
    
    // Find contribution calendar cells
    $('svg.js-calendar-graph-svg rect.ContributionCalendar-day').each((_, element) => {
      const date = $(element).attr('data-date')
      const count = parseInt($(element).attr('data-count') || '0', 10)
      
      if (date) {
        contributionData[date] = count
        totalContributions += count
      }
    })
    
    // Try to extract the total contributions count from the page
    const contributionCountText = $('.js-yearly-contributions h2').text().trim()
    const countMatch = contributionCountText.match(/^([\d,]+)\s+contributions/)
    
    if (countMatch && countMatch[1]) {
      totalContributions = parseInt(countMatch[1].replace(/,/g, ''), 10)
    }
    
    return {
      contributions: contributionData,
      total: totalContributions,
    }
  } catch (error) {
    console.error('Error scraping GitHub contributions:', error)
    throw error
  }
}

export async function GET(request: NextRequest, context: { params: { username: string } }) {
  const { params } = context;
  const { username } = await params;

  if (!username) {
    return NextResponse.json(
      { error: "Username parameter is missing" },
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
      "Cache-Control": "public, max-age=10800", // Cache for 3 hours
      "Content-Type": "application/json",
    };

    // Get contributions data using GitHub API
    // We'll simulate a more detailed contributions view by aggregating events
    // Actual contribution data is not directly exposed by GitHub API
    const eventsUrl = `https://api.github.com/users/${username}/events`;

    const response = await fetch(eventsUrl, {
      headers,
      next: { revalidate: 3600 }, // 1 hour cache
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${response.statusText}` },
        {
          status: response.status,
          headers: {
            "Cache-Control": "public, max-age=60", // Cache errors for 1 minute
            "Content-Type": "application/json",
          },
        }
      );
    }

    const events = await response.json();

    // Calculate contributions by date
    const contributionsByDate: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    let total = 0;

    events.forEach((event: any) => {
      if (!event.created_at) return;

      // Extract date (YYYY-MM-DD)
      const date = event.created_at.split("T")[0];
      const eventYear = parseInt(date.substring(0, 4), 10);

      // Only count current year contributions
      if (eventYear !== currentYear) return;

      // Count contributions based on event type
      let count = 0;
      if (event.type === "PushEvent") {
        count = event.payload?.commits?.length || 0;
      } else if (
        ["PullRequestEvent", "IssuesEvent", "CreateEvent"].includes(event.type)
      ) {
        count = 1;
      }

      if (count > 0) {
        contributionsByDate[date] = (contributionsByDate[date] || 0) + count;
        total += count;
      }
    });

    return NextResponse.json(
      {
        username,
        total,
        contributions: contributionsByDate,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Error fetching contributions:", error);
    return NextResponse.json(
      { error: "Failed to fetch contributions data" },
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

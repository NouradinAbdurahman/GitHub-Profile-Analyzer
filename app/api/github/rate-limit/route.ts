import { NextRequest, NextResponse } from "next/server";
import { acquireRateLimit } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    // Check if we have available rate limit tokens
    const canMakeRequest = await acquireRateLimit('github_rate_check', 1);
    
    if (!canMakeRequest) {
      return NextResponse.json({ 
        error: "GitHub API rate limit exceeded. Please try again later." 
      }, { 
        status: 429,
        headers: {
          'Cache-Control': 'public, max-age=60', // 1 minute cache for rate limit info
          'Content-Type': 'application/json'
        }
      });
    }

    // Check GitHub API rate limit directly
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Profile-Analyzer",
      Authorization: `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
    };
    
    const response = await fetch("https://api.github.com/rate_limit", { headers });
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `GitHub API error: ${response.statusText}` 
      }, { 
        status: response.status,
        headers: {
          'Cache-Control': 'public, max-age=30', // 30 seconds for error
          'Content-Type': 'application/json'
        }
      });
    }
    
    const data = await response.json();
    const { rate, resources } = data;
    
    // Check if we're close to being rate limited
    const isLimited = rate.remaining < 10;
    
    return NextResponse.json({
      remaining: rate.remaining,
      limit: rate.limit,
      reset: rate.reset,
      used: rate.used,
      isLimited,
      resources
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60', // 1 minute cache for rate limit info
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error checking GitHub rate limit:", error);
    return NextResponse.json({ 
      error: "Failed to check GitHub API rate limit status"
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'public, max-age=30', // 30 seconds error cache
        'Content-Type': 'application/json'
      }
    });
  }
} 
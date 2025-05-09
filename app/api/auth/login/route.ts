import { NextResponse } from "next/server"
import { cookies } from 'next/headers'
import crypto from 'crypto' // For nonce generation

// GitHub OAuth configuration - Ensure these are set in your .env.local or environment
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
// Use the specific redirect URI environment variable
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI

export async function GET(req: Request) {
  if (!GITHUB_CLIENT_ID || !GITHUB_REDIRECT_URI) {
    console.error("GitHub OAuth environment variables (CLIENT_ID, REDIRECT_URI) are not configured.")
    return NextResponse.json({ error: "GitHub OAuth is not configured on the server" }, { status: 500 })
  }

  // --- State and Nonce Handling ---
  const { searchParams } = new URL(req.url)
  const returnTo = searchParams.get('returnTo') || '/dashboard' // Default redirect if none provided

  // Generate a secure random nonce
  const nonce = crypto.randomBytes(16).toString('hex')

  // Combine nonce and returnTo, then Base64 encode for the state parameter
  const statePayload = `${nonce}:${returnTo}`
  const state = Buffer.from(statePayload).toString('base64url') // Use base64url for safety

  // --- Construct GitHub URL ---
  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize")
  githubAuthUrl.searchParams.append("client_id", GITHUB_CLIENT_ID)
  githubAuthUrl.searchParams.append("redirect_uri", GITHUB_REDIRECT_URI)
  // Request necessary scopes (adjust if needed)
  githubAuthUrl.searchParams.append("scope", "read:user user:email")
  githubAuthUrl.searchParams.append("state", state)

  // --- Set Nonce Cookie and Redirect ---
  // Create the response object first to set the cookie
  const response = NextResponse.redirect(githubAuthUrl.toString());

  // Set the nonce cookie on the response
  response.cookies.set("oauth_state_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: '/', // Ensure cookie is available on the callback path
    maxAge: 60 * 10, // 10 minutes expiry, match state validity window
  });

  // Return the response with the redirect and the cookie
  return response;
}

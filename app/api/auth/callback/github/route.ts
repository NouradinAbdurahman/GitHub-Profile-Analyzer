import { type NextRequest, NextResponse } from "next/server"
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const APP_URL = process.env.APP_URL

// Helper function to validate the returnTo URL
function validateReturnTo(returnTo: string | null | undefined, appUrl: string): string {
  const defaultRedirect = '/dashboard' // Default safe redirect
  if (!returnTo) return defaultRedirect

  try {
    // Ensure it's a relative path within the app
    const url = new URL(returnTo, appUrl) // Construct full URL to check origin
    if (url.origin !== appUrl) {
      console.warn(`Invalid redirect origin detected: ${url.origin}. Using default.`)
      return defaultRedirect
    }
    // Basic check for relative paths, disallow absolute URLs or protocol relative URLs
    if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
      console.warn(`Invalid redirect path format detected: ${returnTo}. Using default.`)
      return defaultRedirect
    }
    // Additional checks can be added (e.g., regex for allowed characters)
    return returnTo
  } catch (e) {
    console.warn(`Error validating returnTo URL '${returnTo}':`, e)
    return defaultRedirect // Fallback on any parsing error
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state") // This is base64url encoded 'nonce:returnTo'

  // --- State and Nonce Verification ---
  const nonceCookie = cookies().get("oauth_state_nonce")
  const storedNonce = nonceCookie?.value

  // Immediately delete the nonce cookie after retrieving it
  if (nonceCookie) {
    cookies().delete("oauth_state_nonce")
  }

  let decodedReturnTo: string | undefined

  if (!storedNonce || !state) {
    console.error("OAuth callback missing state or nonce cookie.")
    return NextResponse.redirect(new URL("/auth/error?error=state_mismatch", request.url))
  }

  try {
    const decodedState = Buffer.from(state, 'base64url').toString('utf8')
    const [receivedNonce, ...returnToParts] = decodedState.split(':')
    decodedReturnTo = returnToParts.join(':') // Re-join in case returnTo had ':'

    if (receivedNonce !== storedNonce) {
      console.error("OAuth state nonce mismatch (CSRF detected).")
      return NextResponse.redirect(new URL("/auth/error?error=state_mismatch", request.url))
    }

  } catch (error) {
    console.error("Error decoding OAuth state:", error)
    return NextResponse.redirect(new URL("/auth/error?error=state_decode_error", request.url))
  }
  // --- End State Verification ---

  if (!code) {
    console.error("OAuth callback missing code.")
    return NextResponse.redirect(new URL("/auth/error?error=no_code", request.url))
  }

  // --- GitHub Token Exchange ---
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !APP_URL) {
    console.error("GitHub OAuth or APP_URL environment variables are not configured for callback.")
    return NextResponse.redirect(new URL("/auth/error?error=server_config_error", request.url))
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || tokenData.error) {
      console.error("GitHub token exchange failed:", tokenData)
      return NextResponse.redirect(new URL(`/auth/error?error=${tokenData.error || 'token_exchange_failed'}`, request.url))
    }

    const { access_token } = tokenData

    if (!access_token) {
      console.error("Access token not found in GitHub response.")
      return NextResponse.redirect(new URL(`/auth/error?error=no_access_token`, request.url))
    }

    // --- Fetch GitHub User ---
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${access_token}`, // Use Bearer for API calls
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!userResponse.ok) {
      console.error("Failed to fetch GitHub user data:", userResponse.status, await userResponse.text())
      return NextResponse.redirect(new URL(`/auth/error?error=user_fetch_failed`, request.url))
    }

    const ghUser = await userResponse.json()

    // --- Create Session using iron-session ---
    const session = await getIronSession(cookies(), sessionOptions)

    // Store relevant user data and token in the encrypted session
    session.isLoggedIn = true
    session.user = {
      login: ghUser.login,
      name: ghUser.name,
      avatar_url: ghUser.avatar_url,
      html_url: ghUser.html_url,
      bio: ghUser.bio,
      public_repos: ghUser.public_repos,
      followers: ghUser.followers,
      following: ghUser.following,
      access_token: access_token, // Store token if needed for server-side API calls
    }
    await session.save() // Save the session data, encrypting it and setting the cookie

    // --- Redirect User ---
    const validatedReturnTo = validateReturnTo(decodedReturnTo, APP_URL)
    console.log(`GitHub OAuth successful for ${ghUser.login}. Redirecting to: ${validatedReturnTo}`)

    // Use NextResponse.redirect for navigation after setting session
    return NextResponse.redirect(new URL(validatedReturnTo, APP_URL).toString())

  } catch (error) {
    console.error("Error during GitHub OAuth callback:", error)
    // Generic error during token exchange or user fetch
    return NextResponse.redirect(new URL("/auth/error?error=callback_server_error", request.url))
  }
} 
import { type NextRequest, NextResponse } from "next/server"
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'

export async function GET(request: NextRequest) {
  // Use iron-session to securely get session data
  const session = await getIronSession(cookies(), sessionOptions)

  if (!session.isLoggedIn || !session.user) {
    // No active session or user data missing
    return NextResponse.json({ user: null })
  }

  // Return the user data from the session
  // Note: The access token is included if it was saved during callback
  return NextResponse.json({ user: session.user })
}

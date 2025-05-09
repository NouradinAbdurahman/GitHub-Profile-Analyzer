import { NextResponse } from "next/server"
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session' // Your session configuration

export async function POST() {
  // Get the current session
  const session = await getIronSession(cookies(), sessionOptions)

  // Destroy the session data
  await session.destroy()

  // The act of destroying the session with iron-session handles
  // clearing the cookie by setting its maxAge to 0 or similar.
  // We don't need to manually set the cookie to be empty.

  console.log("User session destroyed.")
  return NextResponse.json({ success: true, message: "Logged out successfully" })
}

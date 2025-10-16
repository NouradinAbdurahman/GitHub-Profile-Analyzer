import { NextResponse } from 'next/server';

/**
 * Checks if the DAKAEI_API_KEY environment variable is configured on the server.
 * This endpoint is used by the frontend to determine if AI tools can be run.
 */
export async function GET() {
  const apiKey = process.env.DAKAEI_API_KEY;

  if (apiKey && apiKey.length > 0) {
    // Key is present
    return NextResponse.json({ configured: true });
  } else {
    // Key is missing or empty
    console.warn("DAKAEI_API_KEY is not configured in environment variables.");
    return NextResponse.json({ configured: false });
  }
}

// Optional: Add revalidation settings if needed, though unlikely for a status check
// export const revalidate = 0; // Force dynamic evaluation 
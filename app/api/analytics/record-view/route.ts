import { NextRequest, NextResponse } from 'next/server';
import { adminDb, recordProfileView } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // Get data from request
    const { profileUsername } = await req.json();
    
    if (!profileUsername) {
      return NextResponse.json({ error: 'Profile username is required' }, { status: 400 });
    }
    
    // Get userId from request headers or cookies
    // For Firebase auth, you would typically send user info in a header or cookie
    const authHeader = req.headers.get('authorization');
    const userId = authHeader?.split(' ')[1]; // Bearer <userId>
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Record view using server-side function
    await recordProfileView(userId, profileUsername);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording view:', error);
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
  }
} 
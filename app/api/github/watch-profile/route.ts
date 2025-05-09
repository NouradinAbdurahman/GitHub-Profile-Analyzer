import { NextRequest, NextResponse } from 'next/server';
import { setupProfileWatcher } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // Get data from request
    const { username } = await req.json();
    
    if (!username) {
      return NextResponse.json({ error: 'GitHub username is required' }, { status: 400 });
    }
    
    // Get userId from request headers or cookies
    const authHeader = req.headers.get('authorization');
    const userId = authHeader?.split(' ')[1]; // Bearer <userId>
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Set up the profile watcher for this user
    await setupProfileWatcher(userId, username);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting up profile watcher:', error);
    return NextResponse.json({ error: 'Failed to watch profile' }, { status: 500 });
  }
} 
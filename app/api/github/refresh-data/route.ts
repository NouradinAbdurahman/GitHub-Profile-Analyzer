import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { serverGitHubService } from '@/lib/github-data-service';

// This endpoint should only be accessible by authorized services (e.g., via a secret key)
const API_SECRET = process.env.BACKGROUND_REFRESH_API_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Verify API secret
    const authHeader = req.headers.get('authorization');
    const providedSecret = authHeader?.split(' ')[1];
    
    if (!API_SECRET || providedSecret !== API_SECRET) {
      console.error('Unauthorized access attempt to refresh API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get item to refresh
    const { itemId, type } = await req.json();
    
    if (!itemId || !type) {
      return NextResponse.json({ error: 'Item ID and type are required' }, { status: 400 });
    }
    
    // Process based on type
    if (type === 'profile') {
      // Fetch fresh GitHub data
      const githubResponse = await fetch(`https://api.github.com/users/${itemId}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          // Use GitHub token if available
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
          })
        }
      });
      
      if (githubResponse.ok) {
        const profileData = await githubResponse.json();
        
        // Save to Firebase
        await serverGitHubService.saveUser({
          login: profileData.login,
          name: profileData.name,
          avatar_url: profileData.avatar_url,
          bio: profileData.bio,
          public_repos: profileData.public_repos,
          followers: profileData.followers,
          following: profileData.following,
          htmlUrl: profileData.html_url,
          email: profileData.email,
        });
        
        // Notify any watching users
        await notifyWatchers(itemId);
        
        return NextResponse.json({ success: true, message: 'Profile refreshed successfully' });
      } else {
        const errorText = await githubResponse.text();
        console.error(`GitHub API error: ${errorText}`);
        return NextResponse.json(
          { error: `GitHub API error: ${githubResponse.status}` }, 
          { status: 500 }
        );
      }
    } else if (type === 'repos') {
      // Similar implementation for refreshing repositories
      // ...
      return NextResponse.json({ success: true, message: 'Repositories refresh not yet implemented' });
    } else {
      return NextResponse.json({ error: `Unknown refresh type: ${type}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error refreshing data:', error);
    return NextResponse.json({ error: 'Failed to refresh data' }, { status: 500 });
  }
}

// Helper function to notify users watching this profile
async function notifyWatchers(username: string) {
  if (!adminDb) return;
  
  try {
    // Find all users watching this profile
    const watchersSnapshot = await adminDb.collectionGroup('watchedProfiles')
      .where('username', '==', username)
      .where('watching', '==', true)
      .get();
    
    if (watchersSnapshot.empty) {
      return; // No watchers
    }
    
    // For each watcher, create a notification
    const promises = watchersSnapshot.docs.map(async (doc) => {
      // Extract user ID from the document path
      const userIdMatch = doc.ref.path.match(/users\/([^\/]+)\/watchedProfiles/);
      if (!userIdMatch) return null;
      
      const userId = userIdMatch[1];
      
      // Add notification
      return adminDb.collection('users').doc(userId).collection('notifications').add({
        type: 'profile_update',
        message: `${username}'s GitHub profile has been updated`,
        profileUsername: username,
        read: false,
        timestamp: adminDb.FieldValue.serverTimestamp(),
      });
    });
    
    await Promise.all(promises.filter(Boolean));
    console.log(`Sent notifications to ${promises.length} watchers for ${username}`);
  } catch (error) {
    console.error('Error notifying watchers:', error);
  }
} 
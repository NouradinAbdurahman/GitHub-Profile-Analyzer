import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * Scheduled function that runs daily to refresh cached GitHub data
 * for frequently viewed profiles
 */
export const scheduledRefreshPopularProfiles = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoffTime = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    );

    // Find profiles with views in the last 7 days
    const popularProfiles = await db
      .collection('github-users')
      .where('lastViewed', '>', cutoffTime)
      .orderBy('lastViewed', 'desc')
      .limit(50) // Only refresh the 50 most recently viewed profiles
      .get();

    if (popularProfiles.empty) {
      console.log('No recently viewed profiles to refresh');
      return null;
    }

    console.log(`Refreshing ${popularProfiles.size} popular profiles`);

    // Process each profile (with rate limiting)
    const promises = popularProfiles.docs.map(async (profileDoc, index) => {
      // Add a small delay between requests to avoid hitting GitHub API rate limits
      await new Promise(resolve => setTimeout(resolve, index * 2000));
      
      try {
        const username = profileDoc.id;
        const githubResponse = await fetch(`https://api.github.com/users/${username}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            // Use GitHub token if available through Firebase Functions config
            ...(functions.config().github?.token && {
              'Authorization': `token ${functions.config().github.token}`
            })
          }
        });

        if (!githubResponse.ok) {
          throw new Error(`GitHub API error: ${githubResponse.status}`);
        }

        const profileData = await githubResponse.json();
        
        // Update the profile in Firestore
        await profileDoc.ref.update({
          login: profileData.login,
          name: profileData.name,
          avatar_url: profileData.avatar_url,
          bio: profileData.bio,
          public_repos: profileData.public_repos,
          followers: profileData.followers,
          following: profileData.following,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Successfully refreshed profile for ${username}`);
        return { username, success: true };
      } catch (error) {
        console.error(`Error refreshing profile: ${error}`);
        return { username: profileDoc.id, success: false, error };
      }
    });

    const results = await Promise.all(promises);
    
    console.log(`Profile refresh completed. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
    
    return null;
  });

/**
 * Process the refresh queue for on-demand data updates
 */
export const processRefreshQueue = functions.pubsub
  .schedule('every 10 minutes')
  .onRun(async (context) => {
    // Get the pending refresh requests, ordered by priority and creation time
    const refreshQueue = await db
      .collection('refreshQueue')
      .where('status', '==', 'pending')
      .orderBy('priority', 'desc') // high, normal, low
      .orderBy('createdAt', 'asc')
      .limit(20) // Process 20 at a time
      .get();

    if (refreshQueue.empty) {
      console.log('No pending refresh requests');
      return null;
    }

    console.log(`Processing ${refreshQueue.size} refresh requests`);

    const promises = refreshQueue.docs.map(async (queueItem, index) => {
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, index * 1000));
      
      const data = queueItem.data();
      const { itemId, type } = data;
      
      try {
        // Mark as in-progress
        await queueItem.ref.update({
          status: 'processing',
          processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
          attempts: admin.firestore.FieldValue.increment(1)
        });

        let success = false;

        if (type === 'profile') {
          // Refresh a user profile
          success = await refreshUserProfile(itemId);
        } else if (type === 'repos') {
          // Refresh repositories for a user
          success = await refreshUserRepositories(itemId);
        }

        if (success) {
          // Mark as completed
          await queueItem.ref.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          return { itemId, type, success: true };
        } else {
          throw new Error('Refresh operation failed');
        }
      } catch (error) {
        console.error(`Error processing refresh request for ${type} ${itemId}: ${error}`);
        
        // Update status based on retry count
        if (data.attempts >= 3) {
          await queueItem.ref.update({
            status: 'failed',
            error: error.toString(),
            failedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          await queueItem.ref.update({
            status: 'pending', // Reset to pending for retry
            error: error.toString(),
            lastErrorAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        return { itemId, type, success: false, error };
      }
    });

    const results = await Promise.all(promises);
    
    console.log(`Refresh queue processing completed. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
    
    return null;
  });

/**
 * Listen for profile updates and notify watchers
 */
export const notifyProfileWatchers = functions.firestore
  .document('github-users/{username}')
  .onUpdate(async (change, context) => {
    const username = context.params.username;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Check if there are meaningful changes worth notifying about
    const hasSignificantChanges = 
      afterData.followers !== beforeData.followers ||
      afterData.public_repos !== beforeData.public_repos ||
      afterData.bio !== beforeData.bio;
    
    if (!hasSignificantChanges) {
      console.log(`No significant changes for ${username}, skipping notifications`);
      return null;
    }
    
    // Find users watching this profile
    const watchersSnapshot = await db
      .collectionGroup('watchedProfiles')
      .where('username', '==', username)
      .where('watching', '==', true)
      .get();
    
    if (watchersSnapshot.empty) {
      console.log(`No watchers for ${username}`);
      return null;
    }
    
    console.log(`Found ${watchersSnapshot.size} watchers for ${username}`);
    
    // Generate a meaningful notification message
    let message = `${username}'s GitHub profile has been updated`;
    
    if (afterData.followers > beforeData.followers) {
      const diff = afterData.followers - beforeData.followers;
      message = `${username} gained ${diff} new follower${diff > 1 ? 's' : ''}`;
    } else if (afterData.public_repos > beforeData.public_repos) {
      const diff = afterData.public_repos - beforeData.public_repos;
      message = `${username} added ${diff} new repositor${diff > 1 ? 'ies' : 'y'}`;
    } else if (afterData.bio !== beforeData.bio) {
      message = `${username} updated their GitHub bio`;
    }
    
    // Create notifications for each watcher
    const notificationPromises = watchersSnapshot.docs.map(async (watcherDoc) => {
      try {
        // Extract user ID from the document path
        const userIdMatch = watcherDoc.ref.path.match(/users\/([^\/]+)\/watchedProfiles/);
        if (!userIdMatch) return null;
        
        const userId = userIdMatch[1];
        
        // Add notification
        await db.collection('users').doc(userId).collection('notifications').add({
          type: 'profile_update',
          message,
          profileUsername: username,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          changes: {
            followers: {
              before: beforeData.followers,
              after: afterData.followers
            },
            repos: {
              before: beforeData.public_repos,
              after: afterData.public_repos
            },
            bioChanged: afterData.bio !== beforeData.bio
          }
        });
        
        return { userId, success: true };
      } catch (error) {
        console.error(`Error creating notification: ${error}`);
        return { error, success: false };
      }
    });
    
    const notificationResults = await Promise.all(notificationPromises.filter(Boolean));
    
    console.log(`Sent notifications to ${notificationResults.filter(r => r?.success).length} watchers for ${username}`);
    
    return null;
  });

/**
 * Helper function to refresh a user profile
 */
async function refreshUserProfile(username: string): Promise<boolean> {
  try {
    const githubResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(functions.config().github?.token && {
          'Authorization': `token ${functions.config().github.token}`
        })
      }
    });
    
    if (!githubResponse.ok) {
      throw new Error(`GitHub API error: ${githubResponse.status}`);
    }
    
    const profileData = await githubResponse.json();
    
    // Update the profile in Firestore
    await db.collection('github-users').doc(username).set({
      login: profileData.login,
      name: profileData.name,
      avatar_url: profileData.avatar_url,
      bio: profileData.bio,
      public_repos: profileData.public_repos,
      followers: profileData.followers,
      following: profileData.following,
      htmlUrl: profileData.html_url,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error(`Error refreshing profile for ${username}: ${error}`);
    return false;
  }
}

/**
 * Helper function to refresh a user's repositories
 */
async function refreshUserRepositories(username: string): Promise<boolean> {
  try {
    const githubResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(functions.config().github?.token && {
          'Authorization': `token ${functions.config().github.token}`
        })
      }
    });
    
    if (!githubResponse.ok) {
      throw new Error(`GitHub API error: ${githubResponse.status}`);
    }
    
    const reposData = await githubResponse.json();
    
    // Batch write repositories to Firestore
    const batch = db.batch();
    
    reposData.forEach((repo: any) => {
      const repoRef = db
        .collection('github-users')
        .doc(username)
        .collection('repositories')
        .doc(repo.id.toString());
      
      batch.set(repoRef, {
        id: repo.id,
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        language: repo.language,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
    
    // Also update languages in the user document
    const languages = Array.from(
      new Set(
        reposData
          .map((repo: any) => repo.language)
          .filter(Boolean)
      )
    );
    
    if (languages.length > 0) {
      batch.update(db.collection('github-users').doc(username), {
        languages,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error(`Error refreshing repositories for ${username}: ${error}`);
    return false;
  }
} 
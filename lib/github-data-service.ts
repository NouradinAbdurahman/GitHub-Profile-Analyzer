// GitHub Data Service for Firestore
import { db } from './firebase';
import { getAdminDb, Timestamp as AdminTimestamp, FieldValue } from './firebase-admin-wrapper';
import type { Firestore } from 'firebase-admin/firestore';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  Timestamp as ClientTimestamp,
  serverTimestamp
} from 'firebase/firestore';

// Client-side methods (for authenticated users)
export interface GitHubUserData {
  login: string;
  name?: string | null;
  avatar_url?: string;
  bio?: string | null;
  public_repos?: number;
  followers?: number;
  following?: number;
  total_stars?: number;
  total_forks?: number;
  total_issues?: number;
  languages?: string[];
  lastUpdated?: any; // Make this flexible to handle both types of Timestamps
  htmlUrl?: string;
  email?: string | null;
}

// Repository data interface
export interface RepositoryData {
  id: number;
  name: string;
  full_name: string;
  description?: string | null;
  language?: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

// Save GitHub user data (client-side)
export async function saveGitHubUserData(userData: GitHubUserData): Promise<void> {
  try {
    if (!userData.login) {
      throw new Error('User login name is required');
    }
    
    // Add a timestamp for when this data was cached
    const dataToSave = {
      ...userData,
      lastUpdated: serverTimestamp(),
    };
    
    // Save to users collection
    const userDocRef = doc(db, 'github-users', userData.login);
    await setDoc(userDocRef, dataToSave, { merge: true });
    
    console.log(`Successfully saved GitHub data for user: ${userData.login}`);
  } catch (error) {
    console.error('Error saving GitHub user data:', error);
    throw error;
  }
}

// Get GitHub user data from Firestore (client-side)
export async function getGitHubUserData(username: string): Promise<GitHubUserData | null> {
  try {
    const userDocRef = doc(db, 'github-users', username);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as GitHubUserData;
      
      // Check if the data is recent (less than 24 hours old)
      const lastUpdated = userData.lastUpdated as unknown as ClientTimestamp;
      const isRecent = lastUpdated && 
        (lastUpdated.toDate ? 
          (new Date().getTime() - lastUpdated.toDate().getTime() < 24 * 60 * 60 * 1000) :
          (new Date().getTime() - new Date(lastUpdated).getTime() < 24 * 60 * 60 * 1000));
      
      if (isRecent) {
        console.log(`Retrieved cached GitHub data for ${username}`);
        return userData;
      } else {
        console.log(`Cached data for ${username} is stale`);
        return null; // Stale data, should fetch fresh data
      }
    }
    
    return null; // No data found
  } catch (error) {
    console.error(`Error retrieving GitHub data for ${username}:`, error);
    return null;
  }
}

// Save repos for a GitHub user (client-side)
export async function saveUserRepositories(username: string, repos: any[]): Promise<void> {
  try {
    if (!username) {
      throw new Error('Username is required');
    }
    
    // Process all repositories in a batch
    const batch = db.batch();
    
    repos.forEach(repo => {
      const repoDoc = doc(db, 'github-users', username, 'repositories', repo.name);
      batch.set(repoDoc, {
        ...repo,
        lastUpdated: serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`Successfully saved ${repos.length} repositories for ${username}`);
  } catch (error) {
    console.error(`Error saving repositories for ${username}:`, error);
    throw error;
  }
}

// Get repositories for a user from Firestore
export async function getUserRepositories(
  username: string, 
  options: { limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
): Promise<RepositoryData[]> {
  try {
    const { limit: queryLimit = 100, sortBy = 'stargazers_count', sortOrder = 'desc' } = options;
    
    const userReposCollectionRef = collection(db, 'github-users', username, 'repositories');
    const reposQuery = query(
      userReposCollectionRef,
      orderBy(sortBy, sortOrder),
      limit(queryLimit)
    );
    
    const querySnapshot = await getDocs(reposQuery);
    
    if (querySnapshot.empty) {
      return [];
    }
    
    return querySnapshot.docs.map(doc => doc.data() as RepositoryData);
  } catch (error) {
    console.error(`Error retrieving repositories for ${username}:`, error);
    return [];
  }
}

// Check if the user data needs to be refreshed (older than 24 hours)
export async function needsRefresh(username: string): Promise<boolean> {
  const userData = await getGitHubUserData(username);
  if (!userData) return true;
  
  const lastUpdated = userData.lastUpdated;
  if (!lastUpdated) return true;
  
  // Handle both client and admin timestamp types
  const lastUpdatedDate = lastUpdated.toDate ? lastUpdated.toDate() : new Date(lastUpdated);
  
  // If last updated is more than 24 hours ago, needs refresh
  const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return (new Date().getTime() - lastUpdatedDate.getTime()) > ONE_DAY;
}

// Server-side functions (these will be used in API routes)
export const serverGitHubService = {
  // Save a GitHub user from the server-side
  async saveUser(userData: GitHubUserData): Promise<void> {
    try {
      const adminDb = await getAdminDb();
      if (!adminDb) {
        console.warn('Firebase Admin is not initialized. Cannot save user data.');
        return;
      }
      
      if (!userData.login) {
        throw new Error('User login name is required');
      }
      
      // Remove any existing timestamp to avoid type conflicts
      const { lastUpdated, ...cleanedUserData } = userData;
      
      // Add server timestamp
      const dataToSave = {
        ...cleanedUserData,
        lastUpdated: AdminTimestamp.now()
      };
      
      // Save to users collection
      const userDocRef = adminDb.collection('github-users').doc(userData.login);
      await userDocRef.set(dataToSave, { merge: true });
      
      console.log(`Successfully saved GitHub data for user: ${userData.login} (server-side)`);
    } catch (error) {
      console.error('Error saving GitHub user data (server-side):', error);
    }
  },
  
  // Get a GitHub user from server-side
  async getUser(username: string): Promise<GitHubUserData | null> {
    try {
      const adminDb = await getAdminDb();
      if (!adminDb) {
        console.warn('Firebase Admin is not initialized. Cannot retrieve user data.');
        return null;
      }
      
      const userDocRef = adminDb.collection('github-users').doc(username);
      const userDoc = await userDocRef.get();
      
      if (userDoc.exists) {
        return userDoc.data() as GitHubUserData;
      }
      
      return null;
    } catch (error) {
      console.error(`Error retrieving GitHub data for ${username} (server-side):`, error);
      return null;
    }
  },
  
  // Save repositories for a GitHub user (server-side)
  async saveRepositories(username: string, repos: any[]): Promise<void> {
    try {
      const adminDb = await getAdminDb();
      if (!adminDb) {
        console.warn('Firebase Admin is not initialized. Cannot save repositories.');
        return;
      }
      
      if (!username) {
        throw new Error('Username is required');
      }
      
      // Create the user document if it doesn't exist
      const userDocRef = adminDb.collection('github-users').doc(username);
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        await userDocRef.set({
          login: username,
          lastUpdated: AdminTimestamp.now()
        });
      }
      
      // Use batch writes for better performance
      const batch = adminDb.batch();
      
      repos.forEach(repo => {
        const repoDoc = adminDb.collection('github-users').doc(username).collection('repositories').doc(repo.name);
        batch.set(repoDoc, {
          ...repo,
          lastUpdated: AdminTimestamp.now()
        }, { merge: true });
      });
      
      await batch.commit();
      console.log(`Successfully saved ${repos.length} repositories for ${username} (server-side)`);
    } catch (error) {
      console.error(`Error saving repositories for ${username} (server-side):`, error);
    }
  }
};
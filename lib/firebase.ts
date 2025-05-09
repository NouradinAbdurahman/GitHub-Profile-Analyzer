// Firebase Client (used in frontend)
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  getDocs,
  setDoc,
  deleteDoc,
  Firestore
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, Auth, signInAnonymously } from "firebase/auth";
import { getAnalytics, logEvent, isSupported, Analytics } from "firebase/analytics";

// Get Firebase configuration with fallback for development
const firebaseConfig = (() => {
  try {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA1234567890abcdefghijklmnopqrstuv",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "github-profile-analyzer-dev.firebaseapp.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "github-profile-analyzer-dev",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "github-profile-analyzer-dev.appspot.com",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890",
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ABC1234567"
    };
  } catch (error) {
    console.warn('Error getting Firebase config, using fallback:', error);
    // Fallback configuration for development
    return {
      apiKey: "AIzaSyA1234567890abcdefghijklmnopqrstuv",
      authDomain: "github-profile-analyzer-dev.firebaseapp.com",
      projectId: "github-profile-analyzer-dev",
      storageBucket: "github-profile-analyzer-dev.appspot.com",
      messagingSenderId: "123456789012",
      appId: "1:123456789012:web:abcdef1234567890",
      measurementId: "G-ABC1234567"
    };
  }
})();

// Use `any` for broader compatibility at module scope, rely on runtime checks in functions.
let app: any;
let db: any;
let auth: any;
let analytics: any = null;
let firebaseAuthUser: any = null; // Variable to hold Firebase Auth user state

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Initialize Firebase only in browser
if (isBrowser) {
  try {
    const existingApp = getApps().find(app => app.name === '[DEFAULT]');
    app = existingApp || initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Listen to Firebase Auth state changes
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in (anonymously or otherwise)
        firebaseAuthUser = user;
        console.log("[Firebase Auth] User signed in. UID:", user.uid, "Anonymous:", user.isAnonymous);
      } else {
        // User is signed out
        firebaseAuthUser = null;
        console.log("[Firebase Auth] User signed out.");
        // Attempt anonymous sign-in if signed out
        signInAnonymously(auth)
          .then(() => {
            console.log("[Firebase Auth] Signed in anonymously after detecting sign out.");
          })
          .catch((error) => {
            console.error("[Firebase Auth] Anonymous sign-in error after sign out:", error);
          });
      }
    });

    // Initial anonymous sign-in attempt
    // Check if there's already a user before signing in anonymously
    // This might happen if using persistence and user was already signed in
    if (!auth.currentUser) {
        signInAnonymously(auth)
          .then(() => {
            console.log("[Firebase Auth] Signed in anonymously on initial load.");
          })
          .catch((error) => {
            console.error("[Firebase Auth] Initial anonymous sign-in error:", error);
          });
    } else {
       console.log("[Firebase Auth] User already signed in on load. UID:", auth.currentUser.uid)
       firebaseAuthUser = auth.currentUser;
    }
    
    // Initialize Analytics conditionally
    isSupported().then(supported => {
      if (supported && app) {
        try {
          analytics = getAnalytics(app as FirebaseApp);
          console.log('Firebase Analytics initialized');
        } catch (error) {
          console.warn('Firebase Analytics initialization failed:', error);
        }
      }
    }).catch(error => {
      console.warn('Firebase Analytics support check failed:', error);
    });
  } catch (error) {
    console.error('Error initializing Firebase client:', error);
  }
} else {
  console.log('Firebase client SDK not initialized (server environment)');
}

// Export Firebase services
export { db, auth };

// Ensure db is of type Firestore for internal use after checks
function getDb(): Firestore {
  if (!db) {
    console.error("Firestore instance (db) is not available. Ensure Firebase is initialized.");
    throw new Error("Database not initialized.");
  }
  return db as Firestore;
}

// Analytics function - only logs events if analytics is available
export function trackEvent(eventName: string, eventParams = {}) {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
    } catch (error) {
      console.warn('Analytics event logging failed:', error);
    }
  } else {
    console.log('Analytics not available, would track:', eventName, eventParams);
  }
}

// Helper function to check connection - fixed to use v9 SDK syntax
export async function checkFirebaseConnection(): Promise<boolean> {
  if (!isBrowser || !db) {
    return false;
  }
  
  try {
    // Try to access Firestore using v9 syntax (this will throw if not connected)
    const docRef = doc(db, '_connection_test', 'test');
    await getDoc(docRef);
    return true;
  } catch (error) {
    console.error("Firebase connection check failed:", error);
    return false;
  }
}

/* USER FEATURES */

// Record a profile view on the client side (with rate limiting)
export async function recordProfileView(userId: string, profileUsername: string) {
  if (!isBrowser || !db) {
    return;
  }
  
  try {
    // Only record once per hour per profile to prevent spamming
    const viewRef = doc(db, 'users', userId, 'viewHistory', `${profileUsername}_latest`);
    const viewSnapshot = await getDoc(viewRef);
    
    if (viewSnapshot.exists()) {
      const lastView = viewSnapshot.data()?.timestamp?.toDate();
      if (lastView && ((Date.now() - lastView.getTime()) < 60 * 60 * 1000)) {
        // Less than an hour ago, don't record again
        return;
      }
    }
    
    // Record the latest view with a specific ID for rate limiting
    await setDoc(viewRef, {
      profileUsername,
      timestamp: serverTimestamp(),
    });
    
    // Also add to history collection for tracking all views
    await addDoc(collection(db, 'users', userId, 'viewHistory'), {
      profileUsername,
      timestamp: serverTimestamp(),
    });
    
    // Track event
    trackEvent('profile_view', { profileUsername });
    
    // Send to server API for incrementing view count
    fetch('/api/analytics/record-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
      body: JSON.stringify({ profileUsername }),
    }).catch(err => console.error('Failed to notify server of view:', err));
    
  } catch (error) {
    console.error('Error recording profile view:', error);
  }
}

// Add a GitHub profile to favorites
export async function toggleFavoriteProfile(userId: string, profile: any) {
  try {
    const favRef = doc(db, 'users', userId, 'favorites', profile.login);
    const favDoc = await getDoc(favRef);
    
    if (favDoc.exists()) {
      // Remove from favorites
      await updateDoc(favRef, {
        isFavorite: false,
        updatedAt: serverTimestamp(),
      });
      trackEvent('unfavorite_profile', { username: profile.login });
      return false;
    } else {
      // Add to favorites
      await setDoc(favRef, {
        username: profile.login,
        avatarUrl: profile.avatar_url,
        name: profile.name,
        isFavorite: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      trackEvent('favorite_profile', { username: profile.login });
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
}

// Save an AI analysis result
export async function saveAnalysisResult(userId: string, type: string, data: any, profileUsername: string) {
  const currentDb = getDb(); 
  console.log(`[saveAnalysisResult] Attempting to save for userId: ${userId}, type: ${type}, profileUsername: ${profileUsername}`);
  console.log(`[saveAnalysisResult] Data to save:`, data);
  console.log(`[saveAnalysisResult] Firestore path: users/${userId}/savedAnalyses`);

  if (typeof data !== 'string' || data.trim() === '') {
    console.error('[saveAnalysisResult] Invalid or empty data for analysis content. Aborting save.');
    throw new Error('Analysis content is invalid or empty.');
  }

  try {
    const docToSave = {
      type,
      data, // AI content string
      profileUsername, // Username of the analyzed profile
      createdAt: serverTimestamp(),
    };
    console.log('[saveAnalysisResult] Document to be saved:', docToSave);

    const result = await addDoc(collection(currentDb, 'users', userId, 'savedAnalyses'), docToSave);
    console.log(`[saveAnalysisResult] Successfully saved document with ID: ${result.id} for userId: ${userId}`);
    trackEvent('save_analysis', { type, profileUsername });
    return result.id;
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
}

// Get all saved analyses
export function getSavedAnalyses(userId: string, callback: (data: any[]) => void) {
  if (!userId) {
    console.log("getSavedAnalyses: userId is missing, returning no-op unsubscribe.");
    return () => {}; // Return a no-op function if no userId
  }
  if (!db) {
    console.error("getSavedAnalyses: Firestore instance (db) is not available.");
    callback([]); // Call callback with empty data
    return () => {}; // Return a no-op function
  }
  
  console.log(`getSavedAnalyses: Setting up listener for userId: ${userId}`);

  const currentDb = getDb();
  // Temporarily remove orderBy to test real-time updates
  const analysesQuery = query(
    collection(currentDb, 'users', userId, 'savedAnalyses')
    // orderBy('createdAt', 'desc') // Temporarily commented out
  );
  
  return onSnapshot(analysesQuery, 
    (snapshot) => {
      const analyses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`getSavedAnalyses: Data received for userId ${userId}:`, analyses);
      callback(analyses);
    },
    (error) => {
      console.error(`getSavedAnalyses: Error fetching analyses for userId ${userId}:`, error);
      // Optionally, call callback with empty array or error state
      callback([]); // Example: clear data on error
    }
  );
}

// Create or update a custom dashboard
export async function saveCustomDashboard(userId: string, dashboard: any) {
  const currentDb = getDb();
  try {
    if (dashboard.id) {
      // Update existing dashboard
      const dashboardRef = doc(currentDb, 'users', userId, 'dashboards', dashboard.id);
      await updateDoc(dashboardRef, {
        ...dashboard,
        updatedAt: serverTimestamp(),
      });
      
      trackEvent('update_dashboard', { dashboardId: dashboard.id });
      return dashboard.id;
    } else {
      // Create new dashboard
      const result = await addDoc(collection(currentDb, 'users', userId, 'dashboards'), {
        ...dashboard,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      trackEvent('create_dashboard', { dashboardId: result.id });
      return result.id;
    }
  } catch (error) {
    console.error('Error saving dashboard:', error);
    throw error;
  }
}

// Get user's notifications (real-time)
export function getNotifications(userId: string, callback: (data: any[]) => void) {
  if (!userId) return () => {};
  
  const notificationsQuery = query(
    collection(db, 'users', userId, 'notifications'),
    where('read', '==', false),
    orderBy('timestamp', 'desc'),
    limit(20)
  );
  
  return onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    callback(notifications);
  });
}

// Mark a notification as read
export async function markNotificationAsRead(userId: string, notificationId: string) {
  try {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Save a comparison between profiles
export async function saveProfileComparison(userId: string, title: string, profiles: string[]) {
  try {
    const result = await addDoc(collection(db, 'users', userId, 'comparisons'), {
      title,
      profiles,
      createdAt: serverTimestamp(),
      lastViewedAt: serverTimestamp(),
    });
    
    trackEvent('save_comparison', { profileCount: profiles.length });
    return result.id;
  } catch (error) {
    console.error('Error saving profile comparison:', error);
    throw error;
  }
}

// Watch a profile for updates
export async function watchProfile(userId: string, username: string) {
  try {
    await setDoc(doc(db, 'users', userId, 'watchedProfiles', username), {
      username,
      watching: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Also call server API to ensure server-side watcher is set up
    await fetch('/api/github/watch-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
      body: JSON.stringify({ username }),
    });
    
    trackEvent('watch_profile', { username });
  } catch (error) {
    console.error('Error watching profile:', error);
    throw error;
  }
}

// Unwatch a profile
export async function unwatchProfile(userId: string, username: string) {
  try {
    await updateDoc(doc(db, 'users', userId, 'watchedProfiles', username), {
      watching: false,
      updatedAt: serverTimestamp(),
    });
    
    trackEvent('unwatch_profile', { username });
  } catch (error) {
    console.error('Error unwatching profile:', error);
    throw error;
  }
}

// Delete a saved analysis
export async function deleteAnalysis(userId: string, analysisId: string): Promise<void> {
  const currentDb = getDb();
  console.log(`[deleteAnalysis] Attempting to delete analysis ID: ${analysisId} for userId: ${userId}`);
  try {
    const docRef = doc(currentDb, 'users', userId, 'savedAnalyses', analysisId);
    await deleteDoc(docRef);
    console.log(`[deleteAnalysis] Successfully deleted analysis ID: ${analysisId} for userId: ${userId}`);
    // trackEvent('delete_analysis', { analysisId }); // Optional tracking
  } catch (error) {
    console.error(`[deleteAnalysis] Error deleting analysis ID: ${analysisId} for userId: ${userId}:`, error);
    // Re-throw the error so the caller can handle UI feedback
    throw new Error('Failed to delete analysis from database.');
  }
}

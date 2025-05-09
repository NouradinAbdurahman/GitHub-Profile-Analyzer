// WARNING: Do NOT import this file from any client code or shared code. Only import in API routes or server-only utilities.
// This file uses firebase-admin which depends on Node.js built-ins like fs, net, etc.

import { initializeApp, cert, getApps, AppOptions } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as fs from 'fs';
import * as path from 'path';
import { ServiceAccount as FirebaseServiceAccount } from "firebase-admin/app";

// Add performance monitoring
const ENABLE_PERF_LOGGING = true;
const firebaseAdminPerfStart = Date.now();

// Enhanced memory caching
// TTL values in milliseconds
const CACHE_TTL = {
  SHORT: 60 * 1000,        // 1 minute
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 30 * 60 * 1000,    // 30 minutes
  VERY_LONG: 12 * 60 * 60 * 1000 // 12 hours
};

// Interface for cache entries with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Interface for user data with lastUpdated field
interface FirestoreDocument {
  lastUpdated?: any;
  [key: string]: any;
}

// Global memory cache with TTL-based eviction
const memoryCache = new Map<string, CacheEntry<any>>();

// Function to clean up expired cache entries
function cleanupExpiredCacheEntries() {
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      memoryCache.delete(key);
      expiredCount++;
    }
  }
  
  if (ENABLE_PERF_LOGGING && expiredCount > 0) {
    console.log(`Cache cleanup: removed ${expiredCount} expired entries`);
  }
}

// Schedule cleanup to run every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredCacheEntries, 60000);
}

// Define a type for the service account that matches firebase's expectations
type ServiceAccount = FirebaseServiceAccount;

// Initialize Firebase Admin
let serviceAccount: ServiceAccount | undefined;
let app;
let adminDb: Firestore | null = null;

// Flag to enable mock implementation when running in development
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const useMockImplementation = isDevelopment && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

// Create mock Firestore implementation for development
const createMockFirestore = () => {
  console.log('Creating mock Firestore implementation for development');
  
  // In-memory storage for the mock
  const mockDocuments = new Map<string, any>();
  
  // Helper to get collection/document path
  const getPath = (collection: string, doc?: string) => {
    return doc ? `${collection}/${doc}` : collection;
  };
  
  const mockFirestore = {
    collection: (collectionName: string) => ({
      doc: (docId: string) => ({
        get: async () => {
          const path = getPath(collectionName, docId);
          const data = mockDocuments.get(path);
          return {
            exists: !!data,
            data: () => data || null,
            id: docId
          };
        },
        set: async (data: any, options: any = {}) => {
          const path = getPath(collectionName, docId);
          const merge = options.merge;
          
          if (merge && mockDocuments.has(path)) {
            mockDocuments.set(path, { 
              ...mockDocuments.get(path), 
              ...data, 
              lastUpdated: new Date()
            });
          } else {
            mockDocuments.set(path, { 
              ...data, 
              lastUpdated: new Date()
            });
          }
          
          return true;
        },
        update: async (data: any) => {
          const path = getPath(collectionName, docId);
          
          if (mockDocuments.has(path)) {
            mockDocuments.set(path, { 
              ...mockDocuments.get(path), 
              ...data, 
              lastUpdated: new Date()
            });
          } else {
            mockDocuments.set(path, { 
              ...data, 
              lastUpdated: new Date()
            });
          }
          
          return true;
        },
        collection: (subCollectionName: string) => 
          mockFirestore.collection(`${collectionName}/${docId}/${subCollectionName}`)
      }),
      add: async (data: any) => {
        const mockId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const path = getPath(collectionName, mockId);
        mockDocuments.set(path, { 
          ...data, 
          id: mockId, 
          lastUpdated: new Date()
        });
        return { id: mockId };
      },
      limit: () => ({
        get: async () => ({
          empty: true,
          docs: []
        })
      })
    }),
    batch: () => {
      const batch = {
        set: (docRef: any, data: any) => {
          docRef.set(data);
          return batch;
        },
        update: (docRef: any, data: any) => {
          docRef.update(data);
          return batch;
        },
        commit: async () => true
      };
      return batch;
    },
    runTransaction: async (callback: (transaction: any) => Promise<any>) => {
      const mockTransaction = {
        get: async (docRef: any) => await docRef.get(),
        set: (docRef: any, data: any) => docRef.set(data),
        update: (docRef: any, data: any) => docRef.update(data)
      };
      
      return callback(mockTransaction);
    }
  };
  
  return mockFirestore as unknown as Firestore;
};

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  try {
    // Try loading from service account file first
    try {
      // Get the absolute path to the service account file
      const serviceAccountPath = path.join(process.cwd(), 'config', 'firebase-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf8');
        serviceAccount = JSON.parse(serviceAccountFile) as ServiceAccount;
        console.log('Loaded Firebase Admin credentials from file');
      }
    } catch (error) {
      console.warn('Error loading Firebase service account from file:', error);
    }

    // If file loading failed, try environment variable
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
        console.log('Loaded Firebase Admin credentials from environment variable');
      } catch (error) {
        console.error('Error parsing Firebase service account from env variable:', error);
      }
    }

    // Initialize with credentials if we have them
    if (serviceAccount) {
      try {
        // Only initialize the app if it hasn't been initialized already
        if (getApps().length === 0) {
          app = initializeApp({
            credential: cert(serviceAccount)
          });
          console.log('Firebase Admin SDK initialized successfully');
        } else {
          app = getApps()[0];
          console.log('Firebase Admin SDK was already initialized');
        }
        
        try {
          // Get Firestore instance with extra error handling
          adminDb = getFirestore(app);
          console.log('Firebase Admin Firestore initialized successfully');
          
          // Initialize Firestore collections and indexes
          initializeRequiredCollections().catch(err => {
            console.warn('Error initializing Firestore collections:', err);
          });
          
          return adminDb;
        } catch (firestoreError) {
          console.error('Error initializing Firestore:', firestoreError);
          throw firestoreError;
        }
      } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
        throw error;
      }
    } else {
      throw new Error('No Firebase credentials found');
    }
  } catch (error) {
    console.warn('Firebase Admin initialization error:', error);
    
    if (useMockImplementation) {
      console.warn('Falling back to mock implementation');
      adminDb = createMockFirestore();
      return adminDb;
    } else {
      console.error('Firebase Admin initialization failed and mock implementation not enabled');
      return null;
    }
  }
}

// Initialize required Firestore collections and documents
async function initializeRequiredCollections() {
  if (!adminDb) return;
  
  try {
    // Create system collection with rate limit document
    const rateLimitRef = adminDb.collection('system').doc('rateLimit');
    const rateLimitDoc = await rateLimitRef.get();
    
    if (!rateLimitDoc.exists) {
      await rateLimitRef.set({
        remaining: 5000,
        resetAt: Date.now() + 3600000,
        operations: {},
        lastUpdated: FieldValue.serverTimestamp()
      });
      console.log('Created rate limit document');
    }
    
    // Create github-users collection to avoid "No document to update" errors
    const userCollectionRef = adminDb.collection('github-users');
    // We don't need to create any documents, just the collection
    
    console.log('Firestore collections initialized successfully');
  } catch (error: any) {
    console.warn(`Error initializing Firestore collections: ${error.message}`);
    
    // If the error is about indexes, show a helpful message
    if (error.message && error.message.includes('requires an index')) {
      console.error('⚠️ Firestore index required. Visit the URL to create the index:');
      const indexUrl = error.message.match(/(https:\/\/console\.firebase\.google\.com\/[^\s]+)/);
      if (indexUrl) {
        console.error(`🔗 ${indexUrl[0]}`);
      }
    }
  }
}

// Try to initialize Firebase Admin, but use mock implementation as fallback
try {
  adminDb = initializeFirebaseAdmin();
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  if (useMockImplementation) {
    console.warn('Using mock implementation due to initialization failure');
    adminDb = createMockFirestore();
  }
}

// Export the Firestore instance
export { adminDb, Timestamp };

// Function to get from cache or Firestore with automatic caching
export async function getWithCache<T extends FirestoreDocument>(
  collectionName: string, 
  docId: string, 
  ttl = CACHE_TTL.MEDIUM
): Promise<T | null> {
  if (!adminDb) {
    console.warn('Firestore adminDb is not initialized for cache operation');
    return null;
  }
  
  const cacheKey = `${collectionName}/${docId}`;
  const now = Date.now();
  
  // Check memory cache first
  const cachedItem = memoryCache.get(cacheKey);
  if (cachedItem && (now - cachedItem.timestamp < cachedItem.ttl)) {
    if (ENABLE_PERF_LOGGING) {
      console.log(`Memory cache hit for ${cacheKey}`);
    }
    return cachedItem.data as T;
  }
  
  try {
    // Not in memory cache or expired, get from Firestore
    if (ENABLE_PERF_LOGGING) {
      console.log(`Fetching from Firestore: ${cacheKey}`);
    }
    
    const perfStart = Date.now();
    const docRef = adminDb.collection(collectionName).doc(docId);
    const doc = await docRef.get();
    
    if (ENABLE_PERF_LOGGING) {
      console.log(`Firestore fetch took ${Date.now() - perfStart}ms for ${cacheKey}`);
    }
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data() as T;
    
    // Store in memory cache
    memoryCache.set(cacheKey, {
      data,
      timestamp: now,
      ttl
    });
    
    return data;
  } catch (error) {
    console.error(`Error getting cached doc ${cacheKey}:`, error);
    return null;
  }
}

// Function to cache results of a function call
export async function cachedFunction<T>(
  cacheKey: string, 
  fn: () => Promise<T>, 
  ttl = CACHE_TTL.MEDIUM
): Promise<T> {
  const now = Date.now();
  
  // Check memory cache first
  const cachedItem = memoryCache.get(cacheKey);
  if (cachedItem && (now - cachedItem.timestamp < cachedItem.ttl)) {
    if (ENABLE_PERF_LOGGING) {
      console.log(`Function cache hit for ${cacheKey}`);
    }
    return cachedItem.data as T;
  }
  
  try {
    // Call the function and cache its result
    const perfStart = Date.now();
    const result = await fn();
    
    if (ENABLE_PERF_LOGGING) {
      console.log(`Function execution took ${Date.now() - perfStart}ms for ${cacheKey}`);
    }
    
    // Cache the result
    memoryCache.set(cacheKey, {
      data: result,
      timestamp: now,
      ttl
    });
    
    return result;
  } catch (error) {
    console.error(`Error executing cached function ${cacheKey}:`, error);
    throw error;
  }
}

// Improved getUserWithTieredCache with memory caching
export async function getUserWithTieredCache(username: string) {
  try {
    // Try the cache first with a medium TTL
    const userData = await getWithCache<FirestoreDocument>('github-users', username, CACHE_TTL.MEDIUM);
    
    if (!userData) {
      return null;
    }
    
    // Add cache status based on age
    if (userData.lastUpdated) {
      const lastUpdated = userData.lastUpdated.toDate ? 
        userData.lastUpdated.toDate() : 
        new Date(userData.lastUpdated);
      
      const now = new Date();
      const ageInMillis = now.getTime() - lastUpdated.getTime();
      
      // Define cache tiers
      const HOUR_IN_MS = 60 * 60 * 1000;
      const DAY_IN_MS = 24 * HOUR_IN_MS;
      
      if (ageInMillis < HOUR_IN_MS) {
        return { ...userData, cacheStatus: 'fresh' };
      } else if (ageInMillis < DAY_IN_MS) {
        // Schedule a background refresh but return cached data
        scheduleBackgroundRefresh(username, 'normal');
        return { ...userData, cacheStatus: 'stale' };
      } else {
        // Very old data, consider it expired
        scheduleBackgroundRefresh(username, 'high');
        return { ...userData, cacheStatus: 'expired' };
      }
    }
    
    return userData;
  } catch (error) {
    console.error(`Error getting user with tiered cache: ${username}`, error);
    return null;
  }
}

// Schedule background refresh of data
export async function scheduleBackgroundRefresh(itemId: string, priority: 'low' | 'normal' | 'high' = 'normal', type: string = 'profile') {
  if (!adminDb) {
    console.error('Firestore adminDb is not initialized');
    return;
  }

  try {
    await adminDb.collection('refreshQueue').add({
      itemId,
      type,
      priority,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      attempts: 0,
    });
    
    console.log(`Scheduled background refresh for ${type} ${itemId} with ${priority} priority`);
  } catch (error) {
    console.error('Error scheduling background refresh:', error);
  }
}

/* RATE LIMIT MANAGEMENT */

// Acquire a rate limit token for GitHub API requests
export async function acquireRateLimit(operation: string, cost: number = 1): Promise<boolean> {
  if (!adminDb) {
    console.warn('Firestore adminDb is not initialized for rate limiting');
    return true; // Allow the operation in development
  }

  try {
    // Initialize Firestore if not already done
    if (!adminDb) {
      initializeFirebaseAdmin();
      if (!adminDb) {
        console.warn('Could not initialize Firebase admin for rate limiting');
        return true; // Allow operation to proceed
      }
    }

    const rateLimitRef = adminDb.collection('system').doc('rateLimit');
    
    // First check if the document exists and create it with an index if it doesn't
    const docSnapshot = await rateLimitRef.get().catch(error => {
      console.warn(`Error getting rate limit document: ${error.message}`);
      return null;
    });
    
    if (!docSnapshot || !docSnapshot.exists) {
      // Create the document first to avoid the "query requires an index" error
      try {
        await rateLimitRef.set({ 
          remaining: 5000 - cost, 
          resetAt: Date.now() + 3600000, 
          operations: {} 
        });
        console.log('Created new rate limit document with default values');
        
        // Log the index creation requirement but don't fail
        console.log('Note: You may need to create an index for the query. Check the Firebase console.');
        return true;
      } catch (createError: any) {
        console.error(`Error creating rate limit document: ${createError.message}`);
        return true; // Allow operation to proceed despite error
      }
    }
    
    // Use a try-catch block for the transaction
    try {
      return await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(rateLimitRef);
        
        // If document doesn't exist, create it with default values
        if (!doc.exists) {
          try {
            transaction.set(rateLimitRef, { 
              remaining: 5000 - cost, 
              resetAt: Date.now() + 3600000,
              operations: {
                [operation]: {
                  count: 1,
                  lastRequest: Date.now()
                }
              }
            });
            console.log('Created new rate limit document during transaction');
            return true;
          } catch (err: any) {
            console.warn(`Transaction failed to create rate limit: ${err.message}`);
            return true; // Allow operation despite error
          }
        }
        
        const data = doc.data() || {};
        const now = Date.now();
        
        // Reset rate limit if time has passed
        if (data.resetAt && data.resetAt < now) {
          transaction.update(rateLimitRef, {
            remaining: 5000 - cost,
            resetAt: now + 3600000, // Reset in 1 hour
            operations: {
              ...data.operations,
              [operation]: {
                count: 1,
                lastRequest: now
              }
            }
          });
          return true;
        }
        
        // Check if enough rate limit tokens are available
        if (data.remaining < cost) {
          console.warn(`Rate limit exceeded for ${operation}`);
          return false;
        }
        
        // Track operation usage
        const operationData = (data.operations && data.operations[operation]) || { count: 0 };
        transaction.update(rateLimitRef, {
          remaining: data.remaining - cost,
          [`operations.${operation}`]: {
            count: (operationData.count || 0) + 1,
            lastRequest: now
          }
        });
        
        return true;
      });
    } catch (transactionError: any) {
      // If there's a transaction error related to index, provide helpful error
      if (transactionError.message && transactionError.message.includes('requires an index')) {
        console.error('Firebase Firestore index error. Please create the required index:');
        console.error(transactionError.message);
        
        // Continue operation despite index error in development
        return true;
      }
      
      console.error('Rate limit transaction error:', transactionError);
      
      // In case of any error, allow the operation
      return true;
    }
  } catch (error) {
    console.error('General rate limit error:', error);
    return true; // On error, default to allowing the operation
  }
}

/* COMPARISON COLLECTIONS */

// Save a comparison between GitHub profiles
export async function saveProfileComparison(
  userId: string,
  title: string, 
  profiles: string[],
  description?: string
) {
  if (!adminDb) {
    console.error('Firestore adminDb is not initialized');
    return;
  }

  try {
    const result = await adminDb.collection('users').doc(userId).collection('comparisons').add({
      title,
      profiles,
      description,
      createdAt: FieldValue.serverTimestamp(),
      lastViewedAt: FieldValue.serverTimestamp(),
    });
    
    console.log(`Saved profile comparison "${title}" for user ${userId}`);
    return result.id;
  } catch (error) {
    console.error('Error saving profile comparison:', error);
    throw error;
  }
}

// Mock implementation for development environment
const createMockFunction = (name: string) => {
  return async (...args: any[]) => {
    if (useMockImplementation) {
      console.log(`[MOCK] ${name} called with:`, args);
      return Promise.resolve({ id: 'mock-id-' + Date.now() });
    }
    
    if (!adminDb) {
      console.error(`${name}: Firestore adminDb is not initialized`);
      return Promise.resolve(false);
    }
    
    console.error(`${name} not implemented properly yet`);
    return Promise.resolve(false);
  };
};

// Helper function to check if a collection exists
export async function collectionExists(collectionName: string): Promise<boolean> {
  if (useMockImplementation) {
    console.log(`[MOCK] collectionExists called for: ${collectionName}`);
    return Promise.resolve(true);
  }
  
  if (!adminDb) {
    console.error('Firestore adminDb is not initialized');
    return false;
  }
  
  try {
    const collection = adminDb.collection(collectionName);
    const snapshot = await collection.limit(1).get();
    return !snapshot.empty;
  } catch (error) {
    console.error(`Error checking if collection ${collectionName} exists:`, error);
    return false;
  }
}

/* USER ENGAGEMENT FEATURES */

// Activity History: Track which profiles users view
export async function recordProfileView(userId: string, profileUsername: string) {
  if (useMockImplementation) {
    console.log(`[MOCK] recordProfileView: User ${userId} viewed profile ${profileUsername}`);
    return Promise.resolve();
  }
  
  if (!adminDb) {
    console.error('Firestore adminDb is not initialized');
    return;
  }

  try {
    // Record the view in user's history
    await adminDb.collection('users').doc(userId).collection('viewHistory').add({
      profileUsername,
      timestamp: FieldValue.serverTimestamp(),
    });

    // Increment the view count on the profile
    const profileRef = adminDb.collection('github-users').doc(profileUsername);
    await profileRef.set({
      viewCount: FieldValue.increment(1),
      lastViewed: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Recorded profile view of ${profileUsername} by user ${userId}`);
  } catch (error) {
    console.error('Error recording profile view:', error);
  }
}

// Custom Analysis Saving: Let users save specific analysis results
export async function saveAnalysisResult(
  userId: string, 
  type: 'summary' | 'optimizer' | 'recommendations',
  targetUsername: string,
  content: Record<string, any>,
  title?: string
) {
  if (useMockImplementation) {
    console.log(`[MOCK] saveAnalysisResult: Saved ${type} analysis for ${targetUsername} by user ${userId}`);
    return Promise.resolve('mock-analysis-id-' + Date.now());
  }
  
  if (!adminDb) {
    console.error('Firestore adminDb is not initialized');
    return;
  }

  try {
    const result = await adminDb.collection('users').doc(userId).collection('savedAnalyses').add({
      type,
      targetUsername,
      content,
      title: title || `${type} for ${targetUsername}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    console.log(`Saved ${type} analysis for ${targetUsername} by user ${userId}`);
    return result.id;
  } catch (error) {
    console.error('Error saving analysis result:', error);
    throw error;
  }
}

// Notifications: Watch specific profiles for updates
export async function setupProfileWatcher(userId: string, username: string) {
  if (useMockImplementation) {
    console.log(`[MOCK] setupProfileWatcher: User ${userId} is now watching profile ${username}`);
    return Promise.resolve();
  }
  
  if (!adminDb) {
    console.error('Firestore adminDb is not initialized');
    return;
  }

  try {
    // Store the watched profile
    await adminDb.collection('users').doc(userId).collection('watchedProfiles').doc(username).set({
      watching: true,
      lastUpdated: FieldValue.serverTimestamp(),
    });
    
    console.log(`User ${userId} is now watching profile ${username}`);
  } catch (error) {
    console.error('Error setting up profile watcher:', error);
    throw error;
  }
}

// Add a notification for a user
export const addNotification = useMockImplementation ? 
  createMockFunction('addNotification') :
  async function(
    userId: string,
    type: 'profile_update' | 'repo_update' | 'system',
    message: string,
    metadata: Record<string, any> = {}
  ) {
    if (!adminDb) {
      console.error('Firestore adminDb is not initialized');
      return;
    }

    try {
      const result = await adminDb.collection('users').doc(userId).collection('notifications').add({
        type,
        message,
        read: false,
        timestamp: FieldValue.serverTimestamp(),
        ...metadata
      });
      
      console.log(`Added ${type} notification for user ${userId}`);
      return result.id;
    } catch (error) {
      console.error('Error adding notification:', error);
      throw error;
    }
  };

// Save repositories for a user
export async function saveRepositories(username: string, repos: any[]): Promise<boolean> {
  try {
    if (!adminDb) {
      console.warn('Firebase Admin not initialized for saveRepositories');
      return false;
    }

    // Normalize username to lowercase for consistent keys
    const normalizedUsername = username.toLowerCase();
    
    // First check if the user document exists and create it if it doesn't
    const userRef = adminDb.collection('github-users').doc(normalizedUsername);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create the user document first to avoid "No document to update" error
      await userRef.set({
        username: normalizedUsername,
        createdAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp(),
        reposCount: repos.length,
        reposLastUpdated: FieldValue.serverTimestamp()
      });
      console.log(`Created user document for ${normalizedUsername}`);
    }
    
    // Use batch writes for better performance and atomicity
    const batch = adminDb.batch();
    const reposRef = userRef.collection('repositories');
    
    // Process repositories in smaller batches if needed (Firestore has a limit of 500 operations per batch)
    const batchSize = 450; // Leave room for other operations
    
    for (let i = 0; i < repos.length; i += batchSize) {
      const batchRepos = repos.slice(i, i + batchSize);
      
      // Process each repository in the current batch
      for (const repo of batchRepos) {
        if (!repo.id || !repo.name) continue;
        
        const repoRef = reposRef.doc(repo.id.toString());
        batch.set(repoRef, {
          ...repo,
          owner_username: normalizedUsername,
          last_updated: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      
      // Update the user document
      batch.update(userRef, {
        reposCount: repos.length,
        reposLastUpdated: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp()
      });
      
      // Execute the batch
      await batch.commit();
      console.log(`[Server] Successfully saved ${batchRepos.length} repositories for ${username}`);
    }
    
    return true;
  } catch (error: any) {
    console.error(`[Server] Error saving repositories for ${username}:`, error);
    
    // Handle specific errors
    if (error.code === 5 && error.message.includes('No document to update')) {
      console.warn(`Creating user document for ${username} and retrying...`);
      
      try {
        // Create the user document and try again
        const userRef = adminDb?.collection('github-users').doc(username.toLowerCase());
        if (userRef) {
          await userRef.set({
            username: username.toLowerCase(),
            createdAt: FieldValue.serverTimestamp(),
            lastUpdated: FieldValue.serverTimestamp()
          });
          
          // Retry saving repositories (but only once to avoid infinite recursion)
          return saveRepositories(username, repos);
        }
      } catch (retryError) {
        console.error(`Failed retry saving repositories for ${username}:`, retryError);
      }
    }
    
    return false;
  }
}

// Mock Firebase API key for development if needed
const MOCK_API_KEY = 'mock-firebase-api-key-for-development-only';

// Initialize the Firebase app for client-side
export function getFirebaseClientConfig() {
  try {
    // Generate a config object for the Firebase client SDK
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || MOCK_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'github-profile-analyzer.firebaseapp.com',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'github-profile-analyzer',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'github-profile-analyzer.appspot.com',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-0000000000',
    };
  } catch (error) {
    console.error('Error generating Firebase client config:', error);
    
    // Provide a fallback configuration for development
    if (isDevelopment) {
      return {
        apiKey: MOCK_API_KEY,
        authDomain: 'github-profile-analyzer.firebaseapp.com',
        projectId: 'github-profile-analyzer',
        storageBucket: 'github-profile-analyzer.appspot.com',
        messagingSenderId: '000000000000',
        appId: '1:000000000000:web:0000000000000000000000',
        measurementId: 'G-0000000000',
      };
    }
    
    // In production, rethrow the error
    throw error;
  }
}

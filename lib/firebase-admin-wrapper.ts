"use server";

import { initializeApp, cert, getApps, AppOptions } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";

let adminDb: Firestore | null = null;
let isInitialized = false;

// Initialize the Firebase Admin SDK safely
export async function initializeAdminDb() {
  if (isInitialized) {
    return adminDb;
  }
  
  try {
    let serviceAccount;
    
    // Try to load service account from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
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
          const app = initializeApp({
            credential: cert(serviceAccount)
          });
          console.log('Firebase Admin SDK initialized successfully');
          
          // Get Firestore instance
          adminDb = getFirestore(app);
          console.log('Firebase Admin Firestore initialized successfully');
        } else {
          const app = getApps()[0];
          adminDb = getFirestore(app);
          console.log('Firebase Admin SDK was already initialized');
        }
        
        isInitialized = true;
        return adminDb;
      } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
        return createMockFirestore();
      }
    } else {
      console.warn('No Firebase credentials found, using mock implementation');
      return createMockFirestore();
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    return createMockFirestore();
  }
}

// Create mock Firestore implementation for development
function createMockFirestore() {
  console.log('Creating mock Firestore implementation');
  
  // Simple in-memory mock
  const mockDb = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: async () => Promise.resolve(),
        update: async () => Promise.resolve()
      }),
      add: async () => ({ id: `mock-${Date.now()}` })
    })
  };
  
  return mockDb as unknown as Firestore;
}

// Get the admin database (initializing if needed)
export async function getAdminDb() {
  if (!adminDb) {
    return initializeAdminDb();
  }
  return adminDb;
}

export { Timestamp, FieldValue }; 
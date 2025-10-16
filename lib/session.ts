// lib/session.ts
import type { IronSessionOptions } from 'iron-session';
// import { User } from './types'; // Removed import

// Define the shape of your session data
// export interface SessionData { ... } // Not strictly needed if using declare module

// Define the User type directly within session data if not defined elsewhere
// export type User = { ... }; // Removed separate User type


export const sessionOptions: IronSessionOptions = {
  password: process.env.SESSION_SECRET as string, // MUST be set in environment variables
  cookieName: 'app_session', // Choose a name for your session cookie
  // secure: true should be used in production (HTTPS)
  // It error on localhost unsecured links
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true, // Protect cookie from client-side scripts
    sameSite: 'lax', // Good default for CSRF protection
    // maxAge: undefined, // Session cookie (expires when browser closes) - or set an expiry
  },
};

// Ensure SESSION_SECRET is set
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.warn(
    'SESSION_SECRET environment variable is missing or too short (requires 32+ characters). Session security is compromised.'
  );
  // In a real app, you might want to throw an error here during build or startup
  // throw new Error("SESSION_SECRET environment variable is missing or too short.");
}

// Define the session data structure directly here
declare module 'iron-session' {
  interface IronSessionData {
    isLoggedIn?: boolean;
    user?: { // Define user structure inline
        login: string;
        name: string;
        avatar_url: string;
        html_url: string;
        bio?: string | null;
        public_repos?: number;
        followers?: number;
        following?: number;
        access_token?: string; // Keep token in session if needed for server-side API calls
    };
  }
} 
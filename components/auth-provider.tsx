"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { FavoritesProvider } from "@/components/favorites-provider"
import { RepoComparisonProvider } from "@/components/repo-comparison-provider"

// Align User type with the structure defined in lib/session.ts 
// and returned by /api/auth/session
export type User = {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  bio?: string | null;
  public_repos?: number;
  followers?: number;
  following?: number;
  access_token?: string; // Token might still be passed from the session endpoint
} | null

type AuthContextType = {
  user: User
  isLoading: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const { toast } = useToast()

  useEffect(() => {
    setIsMounted(true)
    
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/session")
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setUser(data.user)
          }
        }
      } catch (error) {
        console.error("Failed to check authentication status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
    
    return () => {
      setIsMounted(false)
    }
  }, [])

  const login = () => {
    // Only redirect on client side
    if (typeof window !== 'undefined') {
      // Capture the current path
      const returnTo = window.location.pathname + window.location.search + window.location.hash;
      // Encode it and append to the login initiation URL
      const loginUrl = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
      console.log(`Initiating login, will return to: ${returnTo}`); // Debug log
      window.location.href = loginUrl;
    }
  }

  const logout = async () => {
    if (!isMounted) return;
    
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (response.ok) {
        setUser(null)
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your GitHub account.",
        })
      }
    } catch (error) {
      console.error("Failed to logout:", error)
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Don't render children until mounted to prevent hydration issues
  if (!isMounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      <FavoritesProvider>
        <RepoComparisonProvider>{children}</RepoComparisonProvider>
      </FavoritesProvider>
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

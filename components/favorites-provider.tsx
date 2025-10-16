"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"

type FavoriteProfile = {
  username: string
  name: string | null
  avatar_url: string
  bio: string | null
  addedAt: string
}

type FavoritesContextType = {
  favorites: FavoriteProfile[]
  addFavorite: (profile: Omit<FavoriteProfile, "addedAt">) => void
  removeFavorite: (username: string) => void
  isFavorite: (username: string) => boolean
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  addFavorite: () => {},
  removeFavorite: () => {},
  isFavorite: () => false,
})

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteProfile[]>([])
  const [mounted, setMounted] = useState<boolean>(false)
  const { toast } = useToast()

  // Set mounted state to true when component mounts
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Load favorites from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;

    try {
      const storedFavorites = localStorage.getItem("github-profile-favorites")
      if (storedFavorites) {
        try {
          const parsed = JSON.parse(storedFavorites)
          if (Array.isArray(parsed)) {
            setFavorites(parsed)
          } else {
            console.error("Stored favorites is not an array")
            localStorage.removeItem("github-profile-favorites")
          }
        } catch (error) {
          console.error("Failed to parse stored favorites:", error)
          localStorage.removeItem("github-profile-favorites")
        }
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
    }
  }, [mounted])

  // Save favorites to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;

    try {
      localStorage.setItem("github-profile-favorites", JSON.stringify(favorites))
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }
  }, [favorites, mounted])

  const addFavorite = (profile: Omit<FavoriteProfile, "addedAt">) => {
    if (isFavorite(profile.username)) {
      toast({
        title: "Already in favorites",
        description: `${profile.username} is already in your favorites.`,
      })
      return
    }

    const newFavorite: FavoriteProfile = {
      ...profile,
      addedAt: new Date().toISOString(),
    }

    setFavorites((prev) => [...prev, newFavorite])
    toast({
      title: "Added to favorites",
      description: `${profile.username} has been added to your favorites.`,
    })
  }

  const removeFavorite = (username: string) => {
    setFavorites((prev) => prev.filter((fav) => fav.username !== username))
    toast({
      title: "Removed from favorites",
      description: `${username} has been removed from your favorites.`,
    })
  }

  const isFavorite = (username: string) => {
    return favorites.some((fav) => fav.username === username)
  }

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { doc, getDoc, onSnapshot } from "firebase/firestore"
import { db, watchProfile, unwatchProfile } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface WatchProfileButtonProps {
  username: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
}

export function WatchProfileButton({
  username,
  variant = "outline"
}: WatchProfileButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isWatching, setIsWatching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!user?.login) {
      setIsLoading(false)
      return
    }

    // Check if already watching and set up real-time listener
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.login, 'watchedProfiles', username),
      (doc) => {
        setIsWatching(doc.exists() && doc.data()?.watching === true)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error setting up watch status listener:", error)
        setIsLoading(false)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [user?.login, username])

  const handleToggleWatch = async () => {
    if (!user?.login) {
      toast({
        title: "Authentication required",
        description: "Please sign in to watch profiles.",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    try {
      if (isWatching) {
        await unwatchProfile(user.login, username)
        toast({
          title: "Profile unwatched",
          description: `You'll no longer receive notifications for ${username}.`,
        })
      } else {
        await watchProfile(user.login, username)
        toast({
          title: "Profile watched",
          description: `You'll be notified when ${username}'s profile updates.`,
        })
      }
    } catch (error) {
      console.error("Failed to toggle watch status:", error)
      toast({
        title: "Failed to update watch status",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <Button variant={variant} size="sm" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </Button>
    )
  }

  return (
    <Button 
      variant={variant} 
      size="sm" 
      className="gap-2"
      onClick={handleToggleWatch}
      disabled={isUpdating}
    >
      {isUpdating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Updating...</span>
        </>
      ) : isWatching ? (
        <>
          <BellOff className="h-4 w-4" />
          <span>Unwatch</span>
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          <span>Watch</span>
        </>
      )}
    </Button>
  )
} 
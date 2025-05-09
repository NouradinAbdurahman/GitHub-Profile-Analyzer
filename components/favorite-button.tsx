"use client"

import { Button } from "@/components/ui/button"
import { useFavorites } from "@/components/favorites-provider"
import { useAuth } from "@/components/auth-provider"
import { Star } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog"

type FavoriteButtonProps = {
  profile: {
    username: string
    name: string | null
    avatar_url: string
    bio: string | null
  }
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

export function FavoriteButton({ profile, variant = "outline", size = "default" }: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const { user, login } = useAuth()
  const isProfileFavorite = isFavorite(profile.username)
  const [animate, setAnimate] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  const isLoggedIn = !!user?.login

  const handleToggleFavorite = () => {
    if (!isLoggedIn) {
      setShowLoginDialog(true)
      return
    }

    if (isProfileFavorite) {
      removeFavorite(profile.username)
    } else {
      addFavorite(profile)
      setAnimate(true)
      setTimeout(() => setAnimate(false), 400)
    }
  }

  const handleLoginClick = () => {
    setShowLoginDialog(false)
    login()
  }

  const buttonContent = (
    <>
      <motion.span
        animate={animate ? { scale: [1, 1.4, 0.9, 1.1, 1] } : {}}
        transition={{ duration: 0.4 }}
        className={size === "icon" ? "flex items-center justify-center" : "mr-2"}
      >
        <Star 
          className={`${size === "icon" ? "" : "mr-2"} h-4 w-4 ${isProfileFavorite ? "fill-current" : ""}`} 
        />
      </motion.span>
      {size !== "icon" && (isProfileFavorite ? "Favorited" : "Add to Favorites")}
    </>
  )

  // Login dialog
  const loginDialog = (
    <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GitHub Login Required</DialogTitle>
          <DialogDescription>
            You need to be logged in with GitHub to add profiles to your favorites.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            Logging in with GitHub allows you to save favorites across devices and sessions.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowLoginDialog(false)}>Cancel</Button>
          <Button variant="default" onClick={handleLoginClick}>
            Login with GitHub
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // Use tooltip when in icon mode
  if (size === "icon") {
    return (
      <>
        {loginDialog}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isProfileFavorite ? "default" : variant}
                size={size}
                onClick={handleToggleFavorite}
                className={`${isProfileFavorite ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""} ${!isLoggedIn ? "opacity-70 cursor-help" : ""}`}
              >
                {buttonContent}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!isLoggedIn ? "Login with GitHub to add favorites" : isProfileFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </>
    )
  }

  // Standard button for non-icon sizes
  return (
    <>
      {loginDialog}
      <Button
        variant={isProfileFavorite ? "default" : variant}
        size={size}
        onClick={handleToggleFavorite}
        className={`${isProfileFavorite ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""} ${!isLoggedIn ? "opacity-70" : ""}`}
      >
        {buttonContent}
      </Button>
    </>
  )
}

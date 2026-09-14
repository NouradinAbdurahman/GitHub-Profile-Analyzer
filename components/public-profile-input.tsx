"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Github, Search, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function PublicProfileInput() {
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Clean the username - remove @ and whitespace
  const cleanUsername = (input: string) => {
    return input.trim().replace(/^@/, '');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanedUsername = cleanUsername(username);

    if (!cleanedUsername) {
      setHasError(true)
      toast({
        title: "Enter a username",
        description: "Type a GitHub username to analyze.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // First, check if we can make API requests at all (in case of rate limiting)
      const rateCheckResponse = await fetch('/api/github/rate-limit', {
        method: 'GET',
        cache: 'no-store'
      }).catch(() => null);

      if (rateCheckResponse && !rateCheckResponse.ok) {
        const rateData = await rateCheckResponse.json();
        if (rateData.error && rateData.error.includes("rate limit")) {
          throw new Error("GitHub API rate limit exceeded. Please try again later.");
        }
      }

      // Check if the user exists before navigating
      const response = await fetch(`/api/github/user/${cleanedUsername}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (response.status === 404) {
        throw new Error(`The GitHub username "${cleanedUsername}" could not be found.`);
      }

      if (response.status === 429) {
        throw new Error("GitHub API rate limit exceeded. Please try again later.");
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Error fetching data for "${cleanedUsername}"`);
      }

      // If we get here, the username exists
      router.push(`/profile/${cleanedUsername}`)
    } catch (error: any) {
      console.error("Error checking username:", error)
      setHasError(true)
      const errorMessage = error.message || "The GitHub username you entered could not be found. Please check and try again.";
      toast({
        title: "Couldn't find that profile",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md gap-2">
      <motion.div
        className="relative flex-1"
        animate={hasError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        onAnimationComplete={() => setHasError(false)}
      >
        <Input
          type="text"
          placeholder="Enter GitHub username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setHasError(false);
          }}
          className={cn(
            "peer h-11 pl-10 pr-4 text-sm transition-all duration-200",
            "border-border/80 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-0",
            hasError && "border-red-500/70 focus-visible:border-red-500 focus-visible:ring-red-500/40"
          )}
        />
        <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus-visible:text-indigo-500" />
      </motion.div>
      <Button
        type="submit"
        disabled={isLoading}
        className="h-11 gap-2 bg-indigo-600 px-5 text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing…</span>
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            <span>Analyze</span>
          </>
        )}
      </Button>
    </form>
  )
}

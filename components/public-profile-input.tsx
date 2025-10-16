"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Github, Search, Loader2, XCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function PublicProfileInput() {
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Clean the username - remove @ and whitespace
  const cleanUsername = (input: string) => {
    return input.trim().replace(/^@/, '');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanedUsername = cleanUsername(username);
    
    if (!cleanedUsername) {
      setError("Please enter a GitHub username to analyze.")
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
      const errorMessage = error.message || "The GitHub username you entered could not be found. Please check and try again.";
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Enter GitHub username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            className={`pl-10 text-[10px] sm:text-base h-8 sm:h-10 px-2 sm:px-4 transition-all duration-300 ${error ? "focus-within:ring-red-500 border-red-400" : ""} max-[530px]:text-sm`} // Increased text size for <530px
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-gray-900 hover:bg-gray-800 text-white transition-all duration-200 text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4 max-[530px]:px-2 max-[530px]:py-1" // Reduced padding for <530px
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin max-[530px]:h-3 max-[530px]:w-3 max-[530px]:mr-1" /> {/* Adjusted icon size and margin for <530px */}
              Loading...
            </>
          ) : (
            <>
              <Search className="mr-2 h-3 w-3 sm:h-4 sm:w-4 max-[530px]:h-3 max-[530px]:w-3 max-[530px]:mr-1" /> {/* Adjusted icon size and margin for <530px */}
              Analyze
            </>
          )}
        </Button>
      </form>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ 
              duration: 0.4, 
              type: "spring", 
              stiffness: 300, 
              damping: 25 
            }}
            className="relative rounded-xl overflow-hidden"
          >
            <div className="relative bg-[#FFF1F1] rounded-xl p-4 border border-red-200 shadow-md">
              <div className="flex items-start gap-3">
                <div className="bg-red-500 p-2.5 rounded-full flex-none">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                
                <div className="flex-1 pt-1">
                  <h3 className="text-red-600 text-lg font-semibold mb-1">Error</h3>
                  <p className="text-red-500 font-medium">{error}</p>
                </div>
                
                <button 
                  onClick={() => setError(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors mt-1 ml-1 flex-none"
                  aria-label="Close error message"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <motion.div 
                className="absolute bottom-0 left-0 h-1 bg-red-500"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 7, ease: "linear" }}
                onAnimationComplete={() => setError(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

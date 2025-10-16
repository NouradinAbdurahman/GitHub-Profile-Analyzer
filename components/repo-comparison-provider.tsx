"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"

// Define the repository type
export type Repository = {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
    avatar_url: string
  }
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  size: number
  created_at: string
  updated_at: string
  pushed_at: string
  topics: string[]
  html_url: string
}

type RepoComparisonContextType = {
  comparedRepos: Repository[]
  addRepo: (repo: Repository) => void
  removeRepo: (repoId: number) => void
  clearRepos: () => void
  isComparing: (repoId: number) => boolean
  maxReposReached: boolean
}

const MAX_REPOS_TO_COMPARE = 4

const RepoComparisonContext = createContext<RepoComparisonContextType>({
  comparedRepos: [],
  addRepo: () => {},
  removeRepo: () => {},
  clearRepos: () => {},
  isComparing: () => false,
  maxReposReached: false,
})

export function RepoComparisonProvider({ children }: { children: React.ReactNode }) {
  const [comparedRepos, setComparedRepos] = useState<Repository[]>([])
  const [mounted, setMounted] = useState<boolean>(false)
  const { toast } = useToast()

  // Set mounted state to true when component mounts
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Load compared repos from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;

    try {
      const storedRepos = localStorage.getItem("github-repo-comparison")
      if (storedRepos) {
        try {
          const parsed = JSON.parse(storedRepos)
          if (Array.isArray(parsed)) {
            setComparedRepos(parsed)
          } else {
            console.error("Stored repos is not an array")
            localStorage.removeItem("github-repo-comparison")
          }
        } catch (error) {
          console.error("Failed to parse stored repos:", error)
          localStorage.removeItem("github-repo-comparison")
        }
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
    }
  }, [mounted])

  // Save compared repos to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;

    try {
      localStorage.setItem("github-repo-comparison", JSON.stringify(comparedRepos))
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }
  }, [comparedRepos, mounted])

  const addRepo = (repo: Repository) => {
    if (isComparing(repo.id)) {
      toast({
        title: "Already comparing",
        description: `${repo.name} is already in your comparison list.`,
      })
      return
    }

    if (comparedRepos.length >= MAX_REPOS_TO_COMPARE) {
      toast({
        title: "Maximum repositories reached",
        description: `You can compare up to ${MAX_REPOS_TO_COMPARE} repositories at once.`,
        variant: "destructive",
      })
      return
    }

    setComparedRepos((prev) => [...prev, repo])
    toast({
      title: "Added to comparison",
      description: `${repo.name} has been added to your comparison list.`,
    })
  }

  const removeRepo = (repoId: number) => {
    setComparedRepos((prev) => prev.filter((repo) => repo.id !== repoId))
    toast({
      title: "Removed from comparison",
      description: "Repository has been removed from your comparison list.",
    })
  }

  const clearRepos = () => {
    setComparedRepos([])
    toast({
      title: "Comparison cleared",
      description: "All repositories have been removed from your comparison list.",
    })
  }

  const isComparing = (repoId: number) => {
    return comparedRepos.some((repo) => repo.id === repoId)
  }

  const maxReposReached = comparedRepos.length >= MAX_REPOS_TO_COMPARE

  return (
    <RepoComparisonContext.Provider
      value={{
        comparedRepos,
        addRepo,
        removeRepo,
        clearRepos,
        isComparing,
        maxReposReached,
      }}
    >
      {children}
    </RepoComparisonContext.Provider>
  )
}

export const useRepoComparison = () => useContext(RepoComparisonContext)

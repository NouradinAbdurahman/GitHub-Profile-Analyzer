"use client"

import { Button } from "@/components/ui/button"
import { useRepoComparison, type Repository } from "@/components/repo-comparison-provider"
import { GitCompare } from "lucide-react"

type ComparisonButtonProps = {
  repo: Repository
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ComparisonButton({ repo, variant = "outline", size = "sm" }: ComparisonButtonProps) {
  const { isComparing, addRepo, removeRepo, maxReposReached } = useRepoComparison()
  const isBeingCompared = isComparing(repo.id)

  const handleToggleComparison = () => {
    if (isBeingCompared) {
      removeRepo(repo.id)
    } else {
      addRepo(repo)
    }
  }

  return (
    <Button
      variant={isBeingCompared ? "default" : variant}
      size={size}
      onClick={handleToggleComparison}
      disabled={!isBeingCompared && maxReposReached}
      className={isBeingCompared ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
    >
      <GitCompare className="mr-2 h-4 w-4" />
      {isBeingCompared ? "Remove from Comparison" : "Add to Comparison"}
    </Button>
  )
}

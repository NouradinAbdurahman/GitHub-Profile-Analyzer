"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, GitFork, Eye, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ComparisonButton } from "@/components/comparison-button"
import { SimpleLoadingSpinner } from "@/components/loading-spinner"

type Repository = {
  id: number
  name: string
  full_name: string
  html_url: string
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
  owner: {
    login: string
    avatar_url: string
  }
  topics: string[]
}

export function RepositoriesTab({ username }: { username: string }) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(10) // Initially show 10 repositories
  const REPOS_PER_PAGE = 10 // Number of repositories to load each time

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/github/user/${username}/repos`)

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`)
        }

        const data = await response.json()
        setRepositories(data)
      } catch (error) {
        console.error("Error fetching repositories:", error)
        setError("Failed to load repositories. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRepositories()
  }, [username])

  // Function to load more repositories
  const loadMoreRepos = () => {
    setVisibleCount(prev => prev + REPOS_PER_PAGE)
  }

  // Get the repositories to display based on the current visible count
  const getDisplayRepos = () => {
    return repositories.slice(0, visibleCount)
  }

  // Check if there are more repositories to load
  const hasMoreRepos = () => {
    return repositories.length > visibleCount
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <SimpleLoadingSpinner size="md" text="Loading repositories" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {repositories.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No public repositories found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {getDisplayRepos().map((repo: Repository) => (
            <Card key={repo.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-xl">
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {repo.name}
                  </a>
                </CardTitle>
                {repo.description && <CardDescription className="text-[10px] sm:text-sm">{repo.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-[10px] sm:text-xs">
                  {repo.language && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      {repo.language}
                    </Badge>
                  )}

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4" />
                    <span>{repo.stargazers_count}</span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <GitFork className="h-4 w-4" />
                    <span>{repo.forks_count}</span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{repo.watchers_count}</span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Updated {new Date(repo.updated_at).toLocaleDateString()}
                  </div>
                </div>

                {repo.topics && repo.topics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] sm:text-xs">
                    {repo.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 text-xs sm:text-base">
                  <ComparisonButton repo={repo} />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Show Load More button if there are more repositories to load */}
          {hasMoreRepos() && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={loadMoreRepos}
                className="px-8"
              >
                <Plus className="mr-2 h-4 w-4" />
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

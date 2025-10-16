"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Star, GitFork, Eye, Search, Loader2, RefreshCw, FilterX, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RepoFilter, type RepoFilters } from "./repo-filter"
import { ComparisonButton } from "./comparison-button"
import { useAuth } from "@/components/auth-provider"
import { AuthReconnect } from "@/components/auth-reconnect"

// Define repository type
type Repository = {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  size: number
  private: boolean
  updated_at: string
  created_at: string
  pushed_at: string
  topics: string[]
  html_url: string
  owner: {
    login: string
    avatar_url: string
  }
}

export function RepoList({ type = "all" }: { type?: "all" | "public" | "private" | "starred" }) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(10) // Initially show 10 repositories
  const REPOS_PER_PAGE = 10 // Number of repositories to load each time
  
  // Initialize filters with default values that won't filter out repositories
  const [filters, setFilters] = useState<RepoFilters>({
    languages: [], // Empty array means no language filtering
    minStars: 0,   // Zero means no minimum stars filtering
    sort: "updated",
    order: "desc",
  })

  // Fetch repositories based on the type
  useEffect(() => {
    async function fetchRepositories() {
      if (!user || !user.login) {
        console.log("No user or user.login available:", user)
        return
      }

      if (!user.access_token) {
        console.error("No access token available for user:", user.login)
        setError("Authentication token missing. Please log out and log in again.")
        return
      }

      // Check if the token has the necessary scopes
      let hasScopeForPrivateRepos = false;
      try {
        const scopeCheckResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${user.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Profile-Analyzer'
          }
        });

        // Check the scopes in the response headers
        const scopes = scopeCheckResponse.headers.get('x-oauth-scopes') || '';
        console.log("Available GitHub scopes:", scopes);
        
        hasScopeForPrivateRepos = scopes.includes('repo');
        if (!hasScopeForPrivateRepos) {
          console.warn("Missing 'repo' scope in GitHub token - private repositories will not be available");
          if (type === "private") {
            setError("Your GitHub token doesn't have permission to access private repositories. Please reconnect with the 'repo' scope.");
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error checking token scopes:", err);
      }

      setLoading(true)
      setError(null)

      try {
        console.log(`Fetching ${type} repositories for user:`, user.login)

        // Use direct GitHub API endpoints with additional parameters
        let githubEndpoint = `https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc&visibility=all&affiliation=owner,collaborator,organization_member`

        // Use the appropriate endpoint based on the type
        if (type === "starred") {
          githubEndpoint = `https://api.github.com/user/starred?per_page=100&sort=updated&direction=desc`
        }

        console.log("Using GitHub endpoint:", githubEndpoint)
        console.log("With access token:", user.access_token ? "Available" : "Missing")

        const response = await fetch(githubEndpoint, {
          headers: {
            'Authorization': `token ${user.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Profile-Analyzer'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`GitHub API error (${response.status}):`, errorText)

          // Try fallback to our API endpoints
          console.log("Trying fallback to our API endpoints...")

          let fallbackEndpoint = `/api/github/user/${user.login}/repos?per_page=100`

          if (type === "starred") {
            fallbackEndpoint = `/api/github/user/${user.login}/starred?per_page=100`
          }

          console.log("Using fallback endpoint:", fallbackEndpoint)

          const fallbackResponse = await fetch(fallbackEndpoint, {
            headers: {
              'Authorization': `token ${user.access_token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          })

          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text()
            console.error(`Fallback API error (${fallbackResponse.status}):`, fallbackErrorText)
            throw new Error(`Failed to fetch repositories: ${response.status} - ${errorText}`)
          }

          const fallbackData = await fallbackResponse.json()

          // Check if fallbackData is an array
          if (Array.isArray(fallbackData)) {
            console.log(`Received ${fallbackData.length} repositories from fallback API`)
            setRepositories(fallbackData)
          } else {
            console.error("Unexpected response format from fallback API:", fallbackData)
            setError("Received invalid data format from API")
            setRepositories([])
          }
        } else {
          const data = await response.json()

          // Check if data is an array (GitHub API returns an array of repositories)
          if (Array.isArray(data)) {
            console.log(`Received ${data.length} repositories from GitHub API`)
            setRepositories(data)
          } else {
            console.error("Unexpected response format from GitHub API:", data)
            setError("Received invalid data format from GitHub API")
            setRepositories([])
          }
        }
      } catch (err) {
        console.error("Error fetching repositories:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch repositories")
      } finally {
        setLoading(false)
        // Add logging to help with debugging
        if (type === "private") {
          console.log("Private repos count:", repositories.filter(repo => repo.private).length);
        }
      }
    }

    if (user?.login) {
      fetchRepositories()
    } else {
      console.log("No user logged in or missing login property")
    }
  }, [user, type])

  // Filter repositories based on type, search query, and filters
  const filteredRepos = useMemo(() => {
    // Log the repositories we're filtering
    console.log(`Filtering ${repositories.length} repositories for type: ${type}`)
    console.log("Repositories data:", repositories)

    // If repositories is empty, return empty array
    if (repositories.length === 0) {
      return []
    }

    // Check if any filters are active
    const hasActiveFilters =
      searchQuery.trim() !== '' ||
      filters.languages.length > 0 ||
      filters.minStars > 0;

    // If no filters are active, return all repositories for the current type
    if (!hasActiveFilters) {
      return repositories.filter((repo) => {
        // Filter by type only
        if (type === "public") return !repo.private
        if (type === "private") return repo.private
        return true // "all" or "starred" type (starred already filtered by API)
      });
    }

    return repositories
      .filter((repo) => {
        // Filter by type
        if (type === "public") return !repo.private
        if (type === "private") return repo.private
        return true // "all" or "starred" type (starred already filtered by API)
      })
      .filter(
        (repo) =>
          // Filter by search query
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())),
      )
      .filter((repo) => {
        // Filter by languages
        if (filters.languages.length > 0 && repo.language) {
          return filters.languages.includes(repo.language)
        }
        return true
      })
      .filter((repo) => {
        // Filter by minimum stars
        return repo.stargazers_count >= filters.minStars
      })
      .sort((a, b) => {
        // Sort repositories
        const sortField = filters.sort
        let valueA, valueB

        switch (sortField) {
          case "stars":
            valueA = a.stargazers_count
            valueB = b.stargazers_count
            break
          case "forks":
            valueA = a.forks_count
            valueB = b.forks_count
            break
          case "name":
            valueA = a.name.toLowerCase()
            valueB = b.name.toLowerCase()
            break
          case "created":
            valueA = new Date(a.created_at).getTime()
            valueB = new Date(b.created_at).getTime()
            break
          case "updated":
          default:
            valueA = new Date(a.updated_at).getTime()
            valueB = new Date(b.updated_at).getTime()
            break
        }

        // Apply sort order
        const sortOrder = filters.order === "asc" ? 1 : -1

        // Handle string comparison separately
        if (typeof valueA === "string" && typeof valueB === "string") {
          return sortOrder * valueA.localeCompare(valueB)
        }

        // Handle number comparison
        return sortOrder * (valueA > valueB ? 1 : valueA < valueB ? -1 : 0)
      })
  }, [searchQuery, filters, type, repositories])

  const resetFilters = () => {
    setFilters({
      languages: [],
      minStars: 0,
      sort: "updated",
      order: "desc",
    })
    setSearchQuery("")
    console.log("Filters reset to default values")
  }

  // Ensure filters are reset when component mounts
  useEffect(() => {
    resetFilters()
  }, [])

  // Function to load more repositories
  const loadMoreRepos = () => {
    setVisibleCount(prev => prev + REPOS_PER_PAGE)
  }

  // Get the repositories to display based on the current filters
  const getDisplayRepos = () => {
    if (filteredRepos.length === 0 && repositories.length > 0) {
      // Fallback to show repositories filtered by type only
      return repositories
        .filter((repo) => {
          if (type === "public") return !repo.private
          if (type === "private") return repo.private
          return true
        })
        .slice(0, visibleCount)
    }
    
    return filteredRepos.slice(0, visibleCount)
  }

  // Check if there are more repositories to load
  const hasMoreRepos = () => {
    if (filteredRepos.length === 0 && repositories.length > 0) {
      const typeFilteredRepos = repositories.filter((repo) => {
        if (type === "public") return !repo.private
        if (type === "private") return repo.private
        return true
      })
      return typeFilteredRepos.length > visibleCount
    }
    
    return filteredRepos.length > visibleCount
  }

  // Error state
  if (error) {
    const isRepoScopeError = error.includes("doesn't have permission to access private repositories");

    return (
      <Card>
        <CardContent className="p-6">
          {isRepoScopeError ? (
            <AuthReconnect message={error} />
          ) : (
            <p className="text-center text-muted-foreground">Error: {error}</p>
          )}
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                if (user?.login) {
                  setLoading(true);
                  setError(null);
                  // Call the fetchRepositories function from the useEffect
                  const fetchRepos = async () => {
                    if (!user || !user.login) return;

                    try {
                      // Use direct GitHub API endpoints with additional parameters
                      let githubEndpoint = `https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc&visibility=all&affiliation=owner,collaborator,organization_member`

                      if (type === "starred") {
                        githubEndpoint = `https://api.github.com/user/starred?per_page=100&sort=updated&direction=desc`
                      }

                      const response = await fetch(githubEndpoint, {
                        headers: {
                          'Authorization': `token ${user.access_token}`,
                          'Accept': 'application/vnd.github.v3+json',
                          'User-Agent': 'GitHub-Profile-Analyzer'
                        }
                      });

                      if (response.ok) {
                        const data = await response.json();
                        if (Array.isArray(data)) {
                          setRepositories(data);
                        }
                      }
                    } catch (err) {
                      console.error("Error fetching repositories:", err);
                      setError("Failed to fetch repositories");
                    } finally {
                      setLoading(false);
                    }
                  };

                  fetchRepos();
                }
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <RepoFilter filters={filters} onFilterChange={setFilters} onReset={resetFilters} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : repositories.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              {type === "all" && "You don't have any repositories yet."}
              {type === "public" && "You don't have any public repositories yet."}
              {type === "private" && "You don't have any private repositories yet."}
              {type === "starred" && "You haven't starred any repositories yet."}
            </p>
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  if (user?.login) {
                    setLoading(true);
                    setError(null);
                    // Call the fetchRepositories function from the useEffect
                    const fetchRepos = async () => {
                      if (!user || !user.login) return;

                      try {
                        // Use direct GitHub API endpoints with additional parameters
                        let githubEndpoint = `https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc&visibility=all&affiliation=owner,collaborator,organization_member`

                        if (type === "starred") {
                          githubEndpoint = `https://api.github.com/user/starred?per_page=100&sort=updated&direction=desc`
                        }

                        const response = await fetch(githubEndpoint, {
                          headers: {
                            'Authorization': `token ${user.access_token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'GitHub-Profile-Analyzer'
                          }
                        });

                        if (response.ok) {
                          const data = await response.json();
                          if (Array.isArray(data)) {
                            setRepositories(data);
                          }
                        }
                      } catch (err) {
                        console.error("Error fetching repositories:", err);
                        setError("Failed to fetch repositories");
                      } finally {
                        setLoading(false);
                      }
                    };

                    fetchRepos();
                  }
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredRepos.length === 0 && (searchQuery.trim() !== '' || filters.languages.length > 0 || filters.minStars > 0) ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No repositories match your search criteria.</p>
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={resetFilters}>
                <FilterX className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {getDisplayRepos().map((repo) => (
            <Card key={repo.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {repo.name}
                    {repo.private && (
                      <Badge variant="outline" className="ml-2">
                        Private
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                {repo.description && <CardDescription>{repo.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {repo.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4">
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

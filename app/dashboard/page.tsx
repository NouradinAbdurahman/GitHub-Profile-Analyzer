"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LanguageChart } from "@/components/language-chart"
import { ActivityChart } from "@/components/activity-chart"
import { RepoList } from "@/components/repo-list"
import { LanguageTrendsChart } from "@/components/language-trends-chart"
import { ContributionCalendar } from "@/components/contribution-calendar"
import { Badge } from "@/components/ui/badge"
import { Star, FolderGit2, Users, GitCommitHorizontal } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { StatTile } from "@/components/stat-tile"
import { getLanguageColor } from "@/lib/language-colors"

type UserStats = {
  repoCount: number;
  starCount: number;
  followers: number;
  contributions: number;
  topRepos: Array<{
    name: string;
    language: string | null;
    stars: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push("/")
    }
  }, [mounted, isLoading, user, router])

  // Fetch user stats when the component mounts
  useEffect(() => {
    async function fetchUserStats() {
      if (!user || !user.login) return

      setStatsLoading(true)
      
      try {
        let userData = null;
        let userResponse = null;
        
        try {
          // Get user data with full details
          userResponse = await fetch(`/api/github/user/${user.login}`, {
            headers: {
              'Authorization': `token ${user.access_token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Cache-Control': 'no-cache'
            }
          }).catch(error => {
            console.error('Network error fetching user data:', error);
            return null;
          });
          
          if (!userResponse) {
            throw new Error('Network error: Failed to connect to API');
          }
          
          if (!userResponse.ok) {
            const errorText = await userResponse.text().catch(() => 'Unknown error');
            console.error(`API error (${userResponse.status}):`, errorText);
            throw new Error(`Failed to fetch user data: ${userResponse.status}`);
          }
          
          // Parse the JSON response with error handling
          try {
            userData = await userResponse.json();
          } catch (jsonError) {
            console.error('Error parsing user data JSON:', jsonError);
            throw new Error('Failed to parse user data response');
          }
        } catch (userError) {
          console.error('Error fetching user data:', userError);
          // Continue with fallback approach
        }
        
        // Initialize stats with user data or defaults
        let starCount = userData?.total_stars || 0;
        let contributionCount = userData?.contributions_count || 0;
        let topRepos: any[] = [];
        let followerCount = userData?.followers || user?.followers || 0;
        let repoCount = userData?.public_repos || user?.public_repos || 0;
        
        // If stats are zero or we didn't get user data, try getting repos
        if (!userData || starCount === 0 || topRepos.length === 0) {
          try {
            // Get all repos data including private repos (if the access token has permission)
            const reposResponse = await fetch(`/api/github/user/${user.login}/repos?per_page=100`, {
              headers: {
                'Authorization': `token ${user.access_token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-cache'
              }
            }).catch(error => {
              console.error('Network error fetching repos:', error);
              return null;
            });
            
            if (reposResponse && reposResponse.ok) {
              const reposData = await reposResponse.json().catch(error => {
                console.error('Error parsing repos JSON:', error);
                return [];
              });
              
              if (Array.isArray(reposData)) {
                // Update repo count if we have data
                repoCount = reposData.length;
                
                // Calculate total stars
                starCount = reposData.reduce((total: number, repo: any) => total + (repo.stargazers_count || 0), 0);
                
                // Get top 3 repos by stars
                topRepos = [...reposData]
                  .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
                  .slice(0, 3)
                  .map(repo => ({
                    name: repo.name,
                    language: repo.language,
                    stars: repo.stargazers_count || 0
                  }));
              }
            }
          } catch (repoError) {
            console.error('Error fetching repos data:', repoError);
            // Continue with whatever data we have
          }
        }
        
        // Try to get a more accurate contributions count if it's zero
        if (contributionCount === 0) {
          try {
            // Calculate total contributions from all activity
            const activityResponse = await fetch(`/api/github/user/${user.login}/activity`, {
              headers: {
                'Authorization': `token ${user.access_token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-cache'
              }
            }).catch(error => {
              console.error('Network error fetching activity:', error);
              return null;
            });
            
            if (activityResponse && activityResponse.ok) {
              try {
                const events = await activityResponse.json();
                
                if (Array.isArray(events)) {
                  events.forEach((event: any) => {
                    if (!event.created_at) return
                    
                    if (event.type === 'PushEvent') {
                      contributionCount += event.payload?.commits?.length || 0
                    } else if (['PullRequestEvent', 'IssuesEvent', 'CreateEvent'].includes(event.type)) {
                      contributionCount += 1
                    }
                  });
                }
              } catch (jsonError) {
                console.error('Error parsing activity data JSON:', jsonError);
              }
            }
          } catch (activityError) {
            console.error('Unable to fetch activity data:', activityError);
            // Continue with whatever data we have
          }
          
          // Try to get a more accurate count by fetching the contribution calendar data
          try {
            const contributionResponse = await fetch(`/api/github/user/${user.login}/contributions`, {
              headers: {
                'Authorization': `token ${user.access_token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }).catch(error => {
              console.error('Network error fetching contributions:', error);
              return null;
            });
            
            if (contributionResponse && contributionResponse.ok) {
              try {
                const contributionData = await contributionResponse.json();
                if (contributionData && contributionData.total) {
                  contributionCount = Math.max(contributionCount, contributionData.total);
                }
              } catch (jsonError) {
                console.error('Error parsing contributions data JSON:', jsonError);
              }
            }
          } catch (contributionError) {
            // Fall back to the previously calculated count
            console.warn('Unable to fetch detailed contribution data:', contributionError);
          }
        }
        
        // Use pre-calculated contributions if available from user data
        if (userData?.contributions_count) {
          contributionCount = Math.max(contributionCount, userData.contributions_count);
        }
        
        // Get total repos count (public + private if available)
        if (userData) {
          repoCount = userData.public_repos + (userData.owned_private_repos || 0);
        }
        
        setUserStats({
          repoCount,
          starCount,
          followers: followerCount,
          contributions: contributionCount,
          topRepos: topRepos.length > 0 ? topRepos : [] // Ensure we have a valid array even if empty
        });
      } catch (error: any) {
        console.error('Error fetching user stats:', error);
        
        // Set minimal stats to prevent zeros, with fallbacks if user data is missing
        setUserStats({
          repoCount: user?.public_repos || 0,
          starCount: 0,
          followers: user?.followers || 0,
          contributions: 0,
          topRepos: []
        });
      } finally {
        setStatsLoading(false);
      }
    }
    
    if (user?.login) {
      fetchUserStats()
    }
  }, [user])

  // Show loading state or nothing while checking authentication
  if (!mounted || isLoading || !user) {
    return (
      <div className="container py-8">
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-8 w-48 rounded bg-muted"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-32 rounded bg-muted"></div>
              ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="mb-6 font-display text-2xl sm:text-3xl font-semibold tracking-tight max-[530px]:text-lg max-[530px]:mb-3">Dashboard</h1>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={FolderGit2} accent="violet" label="Repositories" value={userStats?.repoCount ?? 0} description="Total repositories" loading={statsLoading} />
        <StatTile icon={Star} accent="ember" label="Stars" value={userStats?.starCount ?? 0} description="Total stars received" loading={statsLoading} />
        <StatTile icon={Users} accent="teal" label="Followers" value={userStats?.followers ?? 0} description="GitHub followers" loading={statsLoading} />
        <StatTile icon={GitCommitHorizontal} accent="signal" label="Contributions" value={userStats?.contributions ?? 0} description="Total contributions" loading={statsLoading} />
      </div>

      <div className="mt-8">
        <ContributionCalendar username={user.login} />
      </div>

      <div className="mt-8 grid gap-y-16 gap-x-10 grid-cols-1 md:grid-cols-2">
        <Card className="mb-8 md:mb-0 p-5 max-[530px]:p-0">
          <CardHeader className="max-[530px]:p-2">
            <CardTitle className="max-[530px]:text-[15px]">Language Distribution</CardTitle>
            <CardDescription className="max-[530px]:text-[12px]">Your most used programming languages</CardDescription>
          </CardHeader>
          <CardContent className="max-[530px]:p-2">
            <div className="h-80 mb-4 max-[530px]:h-40 max-[530px]:mb-2 max-[530px]:pb-3">
              <LanguageChart />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 md:mb-0 p-5 max-[530px]:p-0">
          <CardHeader className="max-[530px]:p-2">
            <CardTitle className="max-[530px]:text-[15px]">Activity Overview</CardTitle>
            <CardDescription className="max-[530px]:text-[12px]">Your GitHub activity over time</CardDescription>
          </CardHeader>
          <CardContent className="max-[530px]:p-2">
            <div className="min-h-[200px] max-h-[320px] h-80 md:h-80 w-full max-[530px]:h-40 max-[530px]:mb-2 max-[530px]:pb-3">
              <ActivityChart />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 md:mb-0">
          <CardHeader className="max-[530px]:p-2">
            <CardTitle className="max-[530px]:text-[15px]">Top Repositories</CardTitle>
            <CardDescription className="max-[530px]:text-[11px]">Your most starred repositories</CardDescription>
          </CardHeader>
          <CardContent className="max-[530px]:p-2">
            <div className="space-y-4">
              {statsLoading ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex h-6 animate-pulse items-center justify-between">
                      <div className="h-4 w-24 rounded bg-muted"></div>
                      <div className="h-4 w-12 rounded bg-muted"></div>
                    </div>
                  ))
              ) : userStats?.topRepos && userStats.topRepos.length > 0 ? (
                userStats.topRepos.map((repo, i) => (
                  <div key={i} className="flex items-center justify-between max-[530px]:gap-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium max-[530px]:text-[13px]">{repo.name}</div>
                      {repo.language && (
                        <Badge variant="outline" className="flex items-center gap-1.5 text-xs max-[530px]:text-[10px]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getLanguageColor(repo.language) }} />
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground max-[530px]:text-[11px]">
                      <Star className="h-4 w-4 max-[530px]:h-3 max-[530px]:w-3" />
                      <span>{repo.stars}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No repositories found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 md:mb-0 max-[530px]:p-0">
          <CardHeader className="max-[530px]:p-2">
            <CardTitle className="max-[530px]:text-[16px]">Language Trends</CardTitle>
            <CardDescription className="max-[530px]:text-[13px]">Programming language usage over time (percentage)</CardDescription>
          </CardHeader>
          <CardContent className="max-[530px]:p-2">
            <div className="h-80 mb-4 max-[530px]:h-40 max-[530px]:mb-2 max-[530px]:pb-3">
              <LanguageTrendsChart />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repository tabs section - moved outside the grid to take full width */}
      <div className="mt-16 w-full">
        <Tabs defaultValue="all">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all">All Repositories</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <RepoList type="all" />
          </TabsContent>

          <TabsContent value="private" className="mt-4">
            <RepoList type="private" />
          </TabsContent>

          <TabsContent value="public" className="mt-4">
            <RepoList type="public" />
          </TabsContent>

          <TabsContent value="starred" className="mt-4">
            <RepoList type="starred" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

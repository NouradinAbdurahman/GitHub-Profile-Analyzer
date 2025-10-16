"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

type ActivityDataPoint = {
  name: string;
  commits: number;
  prs: number;
  issues: number;
}

export function ActivityChart() {
  const { user } = useAuth()
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActivityData() {
      if (!user?.login) return

      setIsLoading(true)
      setError(null)

      try {
        // Create monthly data points for the last 12 months
        const monthlyActivity = createEmptyMonthlyData();
        
        // Try to get cached user contributions data first
        let hasCachedData = false;
        
        try {
          const contributionsResponse = await fetch(`/api/github/user/${user.login}/contributions`, {
            headers: {
              'Authorization': `token ${user.access_token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          
          if (contributionsResponse.ok) {
            const contributionsData = await contributionsResponse.json();
            if (contributionsData && contributionsData.contributions) {
              // Process contribution data into monthly buckets
              Object.entries(contributionsData.contributions).forEach(([dateStr, count]: [string, any]) => {
                const date = new Date(dateStr);
                const now = new Date();
                const monthKey = date.toLocaleString('default', { month: 'short' }) + 
                  (date.getFullYear() !== now.getFullYear() ? ' ' + date.getFullYear().toString().slice(-2) : '');
                
                if (monthlyActivity[monthKey]) {
                  monthlyActivity[monthKey].commits += count;
                  hasCachedData = true;
                }
              });
              
              if (hasCachedData) {
                // If we got data from contributions, update the UI immediately
                const chartData = Object.values(monthlyActivity).reverse();
                setActivityData(chartData);
                setIsLoading(false);
              }
            }
          }
        } catch (contributionsError) {
          console.error('Error fetching contributions:', contributionsError);
          // Continue to try the events API
        }
        
        // Fetch user activity from the GitHub API
        const activityResponse = await fetch(`/api/github/user/${user.login}/activity`, {
          headers: {
            'Authorization': `token ${user.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache'
          }
        })

        if (!activityResponse.ok) {
          // If we already have cached data and this fails, we can still show the cached data
          if (hasCachedData) {
            return; // We've already set the data
          }
          throw new Error(`Failed to fetch activity data: ${activityResponse.status}`)
        }

        const events = await activityResponse.json()
        
        // If we didn't have cached data or want to update it, reset the monthly activity
        if (!hasCachedData) {
          // Reset to empty data
          Object.keys(monthlyActivity).forEach(key => {
            monthlyActivity[key].commits = 0;
            monthlyActivity[key].prs = 0;
            monthlyActivity[key].issues = 0;
          });
        }
        
        // Process GitHub events into our monthly activity data
        const now = new Date();
        events.forEach((event: any) => {
          if (!event.created_at) return
          
          const eventDate = new Date(event.created_at)
          const monthKey = eventDate.toLocaleString('default', { month: 'short' }) + 
            (eventDate.getFullYear() !== now.getFullYear() ? ' ' + eventDate.getFullYear().toString().slice(-2) : '')
          
          // Skip events older than our target range
          if (!monthlyActivity[monthKey]) return
          
          // Increment counts based on event type
          if (event.type === 'PushEvent') {
            monthlyActivity[monthKey].commits += event.payload?.commits?.length || 0
          } else if (event.type === 'PullRequestEvent') {
            if (event.payload?.action === 'opened' || event.payload?.action === 'reopened') {
              monthlyActivity[monthKey].prs += 1
            }
          } else if (event.type === 'IssuesEvent') {
            if (event.payload?.action === 'opened' || event.payload?.action === 'reopened') {
              monthlyActivity[monthKey].issues += 1
            }
          }
        })
        
        // Convert to array ordered by date (most recent last)
        const chartData = Object.values(monthlyActivity).reverse()
        
        setActivityData(chartData)
      } catch (error) {
        console.error('Error fetching activity data:', error)
        setError('Failed to load activity data')
      } finally {
        setIsLoading(false)
      }
    }
    
    // Helper function to create empty monthly data
    function createEmptyMonthlyData(): Record<string, ActivityDataPoint> {
      const monthlyActivity: Record<string, ActivityDataPoint> = {}
      const now = new Date()
      
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = date.toLocaleString('default', { month: 'short' }) + 
          (date.getFullYear() !== now.getFullYear() ? ' ' + date.getFullYear().toString().slice(-2) : '')
        
        monthlyActivity[monthKey] = {
          name: monthKey,
          commits: 0,
          prs: 0,
          issues: 0
        }
      }
      
      return monthlyActivity;
    }

    if (user?.login) {
      fetchActivityData()
    }
  }, [user])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <p>{error}</p>
      </div>
    )
  }

  // Empty data state
  if (activityData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <p>No activity data available</p>
      </div>
    )
  }

  return (
    <ChartContainer
      config={{
        commits: {
          label: "Commits",
          color: "hsl(var(--chart-1))",
        },
        prs: {
          label: "Pull Requests",
          color: "hsl(var(--chart-2))",
        },
        issues: {
          label: "Issues",
          color: "hsl(var(--chart-3))",
        },
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={activityData} margin={{ top: 5, right: 5, left: 5, bottom: window.innerWidth < 530 ? 30 : 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="commits" stroke="var(--color-commits)" strokeWidth={2} />
          <Line type="monotone" dataKey="prs" stroke="var(--color-prs)" strokeWidth={2} />
          <Line type="monotone" dataKey="issues" stroke="var(--color-issues)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

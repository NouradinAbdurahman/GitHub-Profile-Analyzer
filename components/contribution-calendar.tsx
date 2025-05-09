"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Get contribution level (0-4) based on count
function getContributionLevel(count: number) {
  if (count === 0) return 0
  if (count <= 3) return 1
  if (count <= 6) return 2
  if (count <= 9) return 3
  return 4
}

// Define month label type
interface MonthLabel {
  month: string
  year: number
  index: number
}

// Get month names for the calendar
function getMonthLabels(startDate: Date, endDate: Date): MonthLabel[] {
  const months: MonthLabel[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const monthName = currentDate.toLocaleString("default", { month: "short" })
    const year = currentDate.getFullYear()

    // Only add if it's a new month
    if (months.length === 0 || months[months.length - 1].month !== monthName) {
      months.push({ month: monthName, year, index: currentDate.getMonth() })
    }

    // Move to the next month
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return months
}

interface ContributionCalendarProps {
  username?: string
}

export function ContributionCalendar({ username }: ContributionCalendarProps) {
  const { user } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [contributions, setContributions] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // We keep debugInfo for console debugging but don't display it in the UI
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // Determine if we're viewing the authenticated user's profile
  const isAuthenticatedUser = user && (!username || username === user.login)
  const effectiveUsername = isAuthenticatedUser ? user?.login : username

  // Fetch contribution data
  useEffect(() => {
    async function fetchContributionData() {
      if (!effectiveUsername) return

      setLoading(true)
      setError(null)
      setDebugInfo(null)

      try {
        if (isAuthenticatedUser) {
          // Only use GraphQL API for authenticated users
          const debugMsg = "Using authenticated user GraphQL API"
          setDebugInfo(debugMsg)
          console.debug("[Contribution Calendar]", debugMsg)

          const contributionsResponse = await fetch(`/api/github/contributions?year=${year}&username=${effectiveUsername}`, {
            headers: { 'Cache-Control': 'no-cache' },
            credentials: 'include',
          })

          if (contributionsResponse.ok) {
            const contributionsData = await contributionsResponse.json()
            if (contributionsData.contributions) {
              const yearContributions: Record<string, number> = {}
              Object.entries(contributionsData.contributions).forEach(([date, count]) => {
                if (date.startsWith(year)) {
                  yearContributions[date] = typeof count === 'number' ? count : 0
                }
              })
              setContributions(yearContributions)
              setLoading(false)
              return
            }
          } else {
            const errorData = await contributionsResponse.json().catch(() => ({}))
            const errorMsg = `GraphQL API error: ${JSON.stringify(errorData)}`
            console.error(errorMsg)
            setError(errorMsg)
            setDebugInfo(errorMsg)
            setLoading(false)
            return
          }
        } else {
          // Try to fetch comprehensive contribution data from our enhanced endpoint
          const scrapingMsg = "Using web scraping method"
          setDebugInfo(scrapingMsg)
          console.debug("[Contribution Calendar]", scrapingMsg)
          const contributionsResponse = await fetch(`/api/github/user/${effectiveUsername}/contributions`, {
            headers: {
              'Cache-Control': 'no-cache'
            }
          })

          if (contributionsResponse.ok) {
            const contributionsData = await contributionsResponse.json()

            if (contributionsData.contributions) {
              // Filter contributions for the selected year
              const yearContributions: Record<string, number> = {}

              Object.entries(contributionsData.contributions).forEach(([date, count]) => {
                if (date.startsWith(year)) {
                  yearContributions[date] = typeof count === 'number' ? count : 0
                }
              })

              if (Object.keys(yearContributions).length > 0) {
                setContributions(yearContributions)
                setLoading(false)
                return
              }
            }
          } else {
            // Log the error for debugging
            const errorData = await contributionsResponse.json().catch(() => ({}))
            const errorMsg = `Web scraping error: ${JSON.stringify(errorData)}`
            console.error(errorMsg)
            setDebugInfo(errorMsg)
          }

          // Fallback: If the enhanced endpoint fails, use the original approach
          const fallbackMsg = "Using GitHub API events fallback method"
          setDebugInfo(fallbackMsg)
          console.debug("[Contribution Calendar]", fallbackMsg)

          // Fetch activity data for the user
          const activityResponse = await fetch(`/api/github/user/${effectiveUsername}/activity`)

          if (!activityResponse.ok) {
            throw new Error(activityResponse.statusText || 'Failed to fetch activity data')
          }

          const events = await activityResponse.json()

          // Fetch repository data to supplement contribution info
          const reposResponse = await fetch(`/api/github/user/${effectiveUsername}/repos`)
          let repoData = []

          if (reposResponse.ok) {
            repoData = await reposResponse.json()
          }

          // Process GitHub events into contribution data
          const contributionData: Record<string, number> = {}

          // Process public events
          events.forEach((event: any) => {
            if (!event.created_at) return

            // Extract date (YYYY-MM-DD)
            const date = event.created_at.split('T')[0]

            // Only include events from the selected year
            if (!date.startsWith(year)) return

            // Count various event types as contributions
            if (event.type === 'PushEvent') {
              // Count each commit in the push
              const commitCount = event.payload?.commits?.length || 0
              contributionData[date] = (contributionData[date] || 0) + commitCount
            } else if (['PullRequestEvent', 'IssuesEvent', 'CreateEvent'].includes(event.type)) {
              // Count PRs, issues, and repo/branch creation as contributions
              contributionData[date] = (contributionData[date] || 0) + 1
            }
          })

          // Calculate contributions based on repository creation dates
          repoData.forEach((repo: any) => {
            if (repo.created_at) {
              const creationDate = repo.created_at.split('T')[0]
              if (creationDate.startsWith(year)) {
                contributionData[creationDate] = (contributionData[creationDate] || 0) + 1
              }
            }
          })

          // If we're getting data for the current year, fetch user overview data
          if (year === new Date().getFullYear().toString()) {
            try {
              const userResponse = await fetch(`/api/github/user/${effectiveUsername}`)
              if (userResponse.ok) {
                const userData = await userResponse.json()

                // If the API returns contribution data, merge it
                if (userData.contributions_current_year) {
                  // For current year add any additional contributions we might have missed
                  Object.entries(userData.contributions_current_year).forEach(([date, count]) => {
                    if (date.startsWith(year)) {
                      contributionData[date] = Math.max(
                        contributionData[date] || 0,
                        typeof count === 'number' ? count : 0
                      )
                    }
                  })
                }
              }
            } catch (err) {
              console.error("Failed to fetch user overview data", err)
              // Continue with what we have - this is supplementary data
            }
          }

          setContributions(contributionData)
        }
      } catch (err) {
        console.error('Error fetching contribution data:', err)
        setError('Failed to load contribution data')
      } finally {
        setLoading(false)
      }
    }

    if (effectiveUsername) {
      fetchContributionData()
    }
  }, [effectiveUsername, year, isAuthenticatedUser])

  // Calculate date range for the selected year
  const startDate = new Date(`${year}-01-01`)
  const endDate = new Date(`${year}-12-31`)

  // Adjust if the selected year is the current year
  if (year === new Date().getFullYear().toString()) {
    endDate.setTime(new Date().getTime())
  }

  // Get month labels for the calendar
  const monthLabels = getMonthLabels(startDate, endDate)

  // Calculate total contributions for the selected year
  const totalContributions = Object.entries(contributions)
    .filter(([date]) => date.startsWith(year))
    .reduce((sum, [_, count]) => sum + count, 0)

  // Generate calendar data
  const calendarData = []

  // Start with the first Sunday before or on the start date
  const calendarStart = new Date(startDate)
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay())

  // End with the last Saturday after or on the end date
  const calendarEnd = new Date(endDate)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()))

  // Generate weeks
  for (let day = new Date(calendarStart); day <= calendarEnd; day.setDate(day.getDate() + 7)) {
    const week = []

    // Generate days in the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(day)
      date.setDate(date.getDate() + i)

      const dateStr = date.toISOString().split("T")[0]
      const count = contributions[dateStr] || 0
      const level = getContributionLevel(count)

      week.push({
        date: dateStr,
        count,
        level,
        isCurrentYear: date.getFullYear().toString() === year,
      })
    }

    calendarData.push(week)
  }

  // Available years for the dropdown
  const availableYears = []
  const currentYear = new Date().getFullYear()
  for (let y = currentYear; y >= currentYear - 5; y--) {
    availableYears.push(y.toString())
  }

  // Handle year navigation
  const handlePrevYear = () => {
    const prevYear = Number.parseInt(year) - 1
    if (prevYear >= currentYear - 5) {
      setYear(prevYear.toString())
    }
  }

  const handleNextYear = () => {
    const nextYear = Number.parseInt(year) + 1
    if (nextYear <= currentYear) {
      setYear(nextYear.toString())
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="max-[530px]:text-[15px]">Contribution Activity</CardTitle>
            <CardDescription className="max-[530px]:text-[11px]">
              {totalContributions} contributions in {year}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevYear}
              disabled={year === (currentYear - 5).toString()}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Year</span>
            </Button>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder={year} />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextYear}
              disabled={year === currentYear.toString()}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Year</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-muted-foreground">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="text-base font-medium">{error}</p>
                <p className="text-sm mt-2">Try refreshing the page or check your connection</p>
              </AlertDescription>
            </Alert>

            {/* Debug info hidden but still available in console */}

            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setLoading(true)
                setError(null)
                // Re-trigger the useEffect by changing its dependency slightly
                setYear(prev => {
                  setTimeout(() => setYear(prev), 100)
                  return prev
                })
              }}
            >
              Try Again
            </Button>
          </div>
        ) : !effectiveUsername ? (
          <div className="py-12 text-center">
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sign in with GitHub to view your contribution activity
              </AlertDescription>
            </Alert>
          </div>
        ) : Object.keys(contributions).length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-base font-medium">No contributions found</p>
            <p className="text-sm mt-2">
              {isAuthenticatedUser
                ? "We couldn't find any contributions for this time period."
                : "We couldn't find public contribution data for this user."}
            </p>
            {/* Debug info hidden but still available in console */}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[750px]">
              {/* Month labels */}
              <div className="mb-1 flex text-xs text-muted-foreground max-[530px]:text-[10px]">
                <div className="w-8" /> {/* Empty space for day labels */}
                <div className="flex flex-1 justify-start">
                  {monthLabels.map((month) => (
                    <div
                      key={`${month.month}-${month.year}`}
                      className="flex-1"
                      style={{
                        // Adjust width based on number of days in the month
                        maxWidth: `${new Date(month.year, month.index + 1, 0).getDate() * 3}%`,
                      }}
                    >
                      {month.month}
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar grid */}
              <div className="flex">
                {/* Day labels */}
                <div className="mr-2 flex w-6 flex-col justify-between text-xs text-muted-foreground max-[530px]:text-[10px]">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                </div>

                {/* Contribution cells */}
                <div className="flex-1">
                  <TooltipProvider>
                    <div className="grid grid-flow-col grid-rows-7 gap-1">
                      {calendarData.map((week, weekIndex) =>
                        week.map((day, dayIndex) => (
                          <Tooltip key={`${weekIndex}-${dayIndex}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={`h-3 w-3 rounded-sm ${
                                  !day.isCurrentYear
                                    ? "bg-muted"
                                    : day.level === 0
                                      ? "bg-muted"
                                      : day.level === 1
                                        ? "bg-emerald-200 dark:bg-emerald-900"
                                        : day.level === 2
                                          ? "bg-emerald-300 dark:bg-emerald-700"
                                          : day.level === 3
                                            ? "bg-emerald-500 dark:bg-emerald-500"
                                            : "bg-emerald-700 dark:bg-emerald-300"
                                }`}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div className="font-medium">
                                  {day.count} contribution{day.count !== 1 ? "s" : ""}
                                </div>
                                <div className="text-muted-foreground">
                                  {new Date(day.date).toLocaleDateString(undefined, {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )),
                      )}
                    </div>
                  </TooltipProvider>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground max-[530px]:text-[10px]">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="h-3 w-3 rounded-sm bg-muted" />
                  <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
                  <div className="h-3 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-700" />
                  <div className="h-3 w-3 rounded-sm bg-emerald-500 dark:bg-emerald-500" />
                  <div className="h-3 w-3 rounded-sm bg-emerald-700 dark:bg-emerald-300" />
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

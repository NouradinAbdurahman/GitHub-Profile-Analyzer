"use client";

import { useParams } from "next/navigation"
import { ProfileCard } from "@/components/profile-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RepositoriesTabWrapper } from "@/components/repositories-tab-wrapper"
import dynamic from "next/dynamic"
import { useEffect, useState, useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import { StatsDashboard } from "@/components/stats-dashboard";
import { LoadingSpinner, SimpleLoadingSpinner } from "@/components/loading-spinner";
import { WatchProfileButton } from "@/components/watch-profile-button";
import { recordProfileView } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { CalendarDays, FolderGit2, Activity as ActivityIcon, Code2, BarChart3, Sparkles } from "lucide-react";
import { getLanguageColor } from "@/lib/language-colors";

// Simple dynamic import with SSR disabled
const ProfileAITools = dynamic(
  () => import("@/components/profile-ai-tools"), 
  { 
    ssr: false,
    loading: () => <div className="py-4 text-center">Loading AI Tools...</div> 
  }
);

// This needs to be outside the component since we can't use async functions directly in client components
async function fetchGitHubUser(username: string) {
  try {
    // Clean username - remove @ and trim whitespace (for consistency with backend)
    const cleanUsername = username.trim().replace(/^@/, '');
    
    // Use cache: 'no-store' to prevent browser caching which can cause stale data
    const response = await fetch(`/api/github/user/${cleanUsername}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    // Handle different error cases
    if (response.status === 404) {
      console.error(`GitHub user ${cleanUsername} not found`);
      return { error: "User not found", status: 404 };
    }
    
    if (response.status === 429) {
      console.error("GitHub API rate limit exceeded");
      return { error: "GitHub API rate limit exceeded. Please try again later.", status: 429 };
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `GitHub API error: ${response.statusText}`;
      console.error(errorMessage);
      return { error: errorMessage, status: response.status };
    }
    
    // Successfully fetched data
    const data = await response.json();
    
    // Verify the data has expected structure
    if (!data || typeof data !== 'object') {
      console.error("Invalid user data format");
      return { error: "Invalid data format received from GitHub API", status: 500 };
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching GitHub user:", error);
    return { error: "Failed to fetch GitHub user data. Please try again.", status: 500 };
  }
}

// Function to fetch languages data for the user
async function fetchLanguageData(username: string) {
  try {
    // Clean username for consistency
    const cleanUsername = username.trim().replace(/^@/, '');
    
    // Set a timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 15000);
    });

    // Create the fetch promise with cache control
    const fetchPromise = fetch(`/api/github/user/${cleanUsername}/languages`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    // Race the fetch against the timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || response.statusText || 'Failed to fetch language data');
    }

    const data = await response.json();
    return data.languages || [];
  } catch (error) {
    console.error('Error fetching language data:', error);
    throw error;
  }
}

interface LanguageData {
  name: string;
  value: number;
}

// Define the new data structure type
interface MonthlyActivityData {
  month: string;
  commits: number;
  issues: number;
  prs: number;
  total: number;
}

// Updated function to process various activity events
function processActivityEvents(events: any[]): any[] {
  // Count relevant events per month
  const eventsByMonth: Record<string, number> = {};
  const relevantEventTypes = ['PushEvent', 'CreateEvent', 'IssuesEvent', 'PullRequestEvent'];

  if (Array.isArray(events)) {
    events.forEach((event: any) => {
      if (!event || !event.created_at || !relevantEventTypes.includes(event.type)) {
        return; // Skip irrelevant or malformed events
      }

      try {
        let countEvent = false;
        switch (event.type) {
          case 'PushEvent':
            // Count the push itself as one activity unit, regardless of commit count
            if (event.payload?.commits?.length > 0) {
              countEvent = true;
            }
            break;
          case 'CreateEvent':
            // Count repo or branch creation
            if (event.payload?.ref_type === 'repository' || event.payload?.ref_type === 'branch') {
              countEvent = true;
            }
            break;
          case 'IssuesEvent':
            // Count opened issues
            if (event.payload?.action === 'opened') {
              countEvent = true;
            }
            break;
          case 'PullRequestEvent':
            // Count opened pull requests
            if (event.payload?.action === 'opened') {
              countEvent = true;
            }
            break;
        }

        if (countEvent) {
          const month = new Date(event.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
          eventsByMonth[month] = (eventsByMonth[month] || 0) + 1;
        }
      } catch (e) {
        console.error('Error processing event:', event.type, e);
        // Skip this event but continue processing others
      }
    });
  } else {
    console.error('Events data is not an array:', events);
  }

  // Sort months chronologically (same logic as before)
  return Object.entries(eventsByMonth)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => {
      const [aMonth, aYear] = a.month.split(' ');
      const [bMonth, bYear] = b.month.split(' ');
      if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
      const aDate = new Date(`${aMonth} 1, 20${aYear}`);
      const bDate = new Date(`${bMonth} 1, 20${bYear}`);
      return aDate.getTime() - bDate.getTime();
    });
}

// Updated helper function to generate diverse mock activity data
function generateMockActivityData(username: string) {
  const currentDate = new Date();
  const mockData = [];
  const eventTypes = ['PushEvent', 'CreateEvent', 'IssuesEvent', 'PullRequestEvent'];

  // Generate mock events over the last 6 months
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentDate);
    date.setMonth(currentDate.getMonth() - i);

    // Generate 1 to 5 events per month
    const eventsThisMonth = Math.max(1, Math.floor(Math.random() * 5) + 1);

    for (let k = 0; k < eventsThisMonth; k++) {
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const eventDate = new Date(date);
        // Slightly randomize day within the month
        eventDate.setDate(Math.max(1, Math.floor(Math.random() * 28) + 1));

        const mockEvent: any = {
            id: `mock-event-${i}-${k}`,
            type: eventType,
            actor: {
                login: username,
                display_login: username,
                avatar_url: 'https://github.com/identicons/' + username,
            },
            repo: {
                name: `${username}/mock-repository-${i}`,
                url: `https://api.github.com/repos/${username}/mock-repository-${i}`
            },
            payload: {},
            public: true,
            created_at: eventDate.toISOString(),
        };

        // Add type-specific payloads
        switch (eventType) {
            case 'PushEvent':
                const commitsCount = Math.max(1, Math.floor(Math.random() * 5) + 1);
                mockEvent.payload = {
                    push_id: Math.random() * 1000000000,
                    size: commitsCount,
                    distinct_size: commitsCount,
                    ref: 'refs/heads/main',
                    head: 'mocksha',
                    before: 'mocksha',
                    commits: Array(commitsCount).fill(null).map((_, j) => ({
                      sha: `mock-commit-${i}-${k}-${j}`,
                      message: `Mock commit message ${j}`,
                      author: { name: username, email: 'mock@example.com' },
                      url: 'mockurl',
                      distinct: true,
                    })),
                };
                break;
            case 'CreateEvent':
                mockEvent.payload = {
                    ref: Math.random() > 0.5 ? 'main' : `feature-branch-${k}`,
                    ref_type: Math.random() > 0.3 ? 'branch' : 'repository',
                    master_branch: 'main',
                    description: 'Mock repository description',
                    pusher_type: 'user'
                };
                break;
            case 'IssuesEvent':
                mockEvent.payload = {
                    action: 'opened', // Focus on opened events
                    issue: {
                        id: Math.random() * 1000000,
                        number: k + 1,
                        title: `Mock issue title ${k}`,
                        user: { login: username },
                        state: 'open',
                        comments: 0,
                        created_at: eventDate.toISOString(),
                        updated_at: eventDate.toISOString(),
                        body: 'Mock issue body'
                    }
                };
                break;
            case 'PullRequestEvent':
                mockEvent.payload = {
                    action: 'opened', // Focus on opened events
                    number: k + 1,
                    pull_request: {
                        id: Math.random() * 1000000,
                        number: k + 1,
                        title: `Mock PR title ${k}`,
                        user: { login: username },
                        state: 'open',
                        merged: false,
                        comments: 0,
                        review_comments: 0,
                        commits: Math.floor(Math.random()*5)+1,
                        additions: Math.floor(Math.random()*100),
                        deletions: Math.floor(Math.random()*50),
                        changed_files: Math.floor(Math.random()*10)+1,
                        created_at: eventDate.toISOString(),
                        updated_at: eventDate.toISOString(),
                        body: 'Mock PR body'
                    }
                };
                break;
        }
        mockData.push(mockEvent);
    }
  }

  return mockData;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius = 0, outerRadius = 0, percent, index, name, value }: any) => {
  // Calculate position slightly outside the pie
  const radius = outerRadius + (outerRadius - innerRadius) * 0.6; // Position labels outside
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Always return the text label
  return (
    <text
      x={x}
      y={y}
      fill="currentColor" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs" 
    >
      {`${name}`} 
    </text>
  );
};

export default function ProfilePage() {
  // Use the useParams hook to properly get the username parameter
  const params = useParams()
  const username = typeof params.username === 'string' ? params.username : Array.isArray(params.username) ? params.username[0] : ''
  const { user, login } = useAuth()

  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activityData, setActivityData] = useState<MonthlyActivityData[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [isMockData, setIsMockData] = useState(false)
  const [languageData, setLanguageData] = useState<LanguageData[]>([])
  const [languageLoading, setLanguageLoading] = useState(false)
  const [languageError, setLanguageError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserData() {
      if (!username) {
        setError("Invalid username")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await fetchGitHubUser(username)
        
        if (data.error) {
          setError(data.error)
          setUserData(null)
        } else {
          setUserData(data)
          setError(null)
        }
      } catch (err) {
        setError("Failed to load user data")
        console.error(err)
      } finally {
        // Ensure loading state is properly turned off
        setTimeout(() => {
          setLoading(false)
        }, 300) // Small delay to ensure smooth transition
      }
    }

    loadUserData()
  }, [username])

  // Record profile view when authenticated user views a profile
  useEffect(() => {
    if (user?.login && userData && userData.login && username && username !== user.login) {
      // Don't record views of your own profile
      try {
        recordProfileView(user.login, username);
      } catch (err) {
        console.error("Failed to record profile view:", err);
        // Don't throw - this is a non-critical operation
      }
    }
  }, [user?.login, userData, username]);

  useEffect(() => {
    if (!username) return;
    async function fetchActivityData() {
      try {
        setActivityLoading(true);
        const cleanUsername = username.trim().replace(/^@/, '');
        const response = await fetch(`/api/github/user/${cleanUsername}/activity`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to fetch activity data: ${response.statusText}`);
        }

        // Get data (should now be in MonthlyActivityData[] format directly from backend)
        const events: MonthlyActivityData[] = await response.json();
        const isDataFromMock = response.headers.get('X-Data-Source')?.startsWith('mock');
        setIsMockData(!!isDataFromMock);

        // Check if we received an empty array, even if mock
        if (events.length === 0 && isDataFromMock) {
             console.warn("Received empty mock data array from backend.");
             setActivityData([]); // Ensure state is empty array
             setActivityError(null); // No explicit error, just no data
        } else {
             setActivityData(events); // <<< Set state directly with received data
             setActivityError(null);
        }
      } catch (error: any) {
        console.error('Error fetching activity data:', error);
        setActivityError(error.message || 'Failed to load activity. Please try refreshing the page.');
         setActivityData([]); // Clear data on error
      } finally {
        setActivityLoading(false);
      }
    }
    fetchActivityData();
  }, [username]);

  // Add an effect to fetch language data
  useEffect(() => {
    // Don't attempt to fetch if username is not available
    if (!username) return;

    async function loadLanguageData() {
      try {
        setLanguageLoading(true);
        const languages = await fetchLanguageData(username);
        
        // Transform the language data for the pie chart
        const formattedLanguageData = languages.map((lang: any) => ({
          name: lang.name,
          value: lang.percentage || 1
        }));
        
        setLanguageData(formattedLanguageData);
        setLanguageError(null);
      } catch (error: any) {
        console.error('Error loading language data:', error);
        setLanguageError(error.message || 'Failed to load language data');
      } finally {
        setLanguageLoading(false);
      }
    }

    loadLanguageData();
  }, [username]);

  // Set a maximum loading time of 10 seconds
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
        if (!userData && !error) {
          setError("Loading timed out. Please try again.");
        }
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [loading, userData, error]);

  // Custom Tooltip Content Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyActivityData; // Type assertion
      return (
        <div className="glass-panel rounded-lg px-3 py-2.5 text-sm shadow-lg shadow-black/20">
          <p className="mb-1.5 font-medium">{label}</p>
          <ul className="list-none space-y-1 p-0 font-mono text-xs">
             {data.commits > 0 && <li className="text-signal">{`Commits  ${data.commits}`}</li>}
             {data.issues > 0 && <li className="text-teal">{`Issues   ${data.issues}`}</li>}
             {data.prs > 0 && <li className="text-violet">{`PRs      ${data.prs}`}</li>}
             <li className="mt-1 border-t border-border/60 pt-1.5 font-medium text-foreground">{`Total  ${data.total}`}</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  // Section header used inside each tab panel — icon chip + title + one-line description.
  const PanelHeading = ({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) => (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal/10">
        <Icon className="h-4 w-4 text-signal" />
      </span>
      <div>
        <h3 className="font-display text-base sm:text-lg font-semibold leading-tight">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <LoadingSpinner size="lg" text="Loading profile data" />
      </div>
    )
  }

  if (error || !userData) {
    return <div className="container py-8">Error: {error || "User not found"}</div>
  }

  return (
    <div className="container py-8 text-sm sm:text-base">
      <div className="grid grid-cols-1 gap-y-8 gap-x-8 sm:gap-x-8 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="min-w-0 w-full h-full flex flex-col lg:sticky lg:top-20 lg:self-start">
          <ProfileCard user={userData} />
          {/* Display watch profile button only when user is viewing someone else's profile */}
          {user?.login && user.login !== username && (
            <div className="mt-4">
              <WatchProfileButton username={username} variant="outline" />
            </div>
          )}
        </div>

        <div className="min-w-0 w-full h-full flex flex-col">
          <Tabs defaultValue="repositories">
            <div className="overflow-x-auto">
              <TabsList className="mb-4 sm:mb-6 w-full min-w-0 flex-nowrap justify-start overflow-x-auto">
                <TabsTrigger value="repositories" className="whitespace-nowrap text-xs sm:text-sm">
                  <FolderGit2 className="h-3.5 w-3.5" /> Repositories
                </TabsTrigger>
                <TabsTrigger value="activity" className="whitespace-nowrap text-xs sm:text-sm">
                  <ActivityIcon className="h-3.5 w-3.5" /> Activity
                </TabsTrigger>
                <TabsTrigger value="languages" className="whitespace-nowrap text-xs sm:text-sm">
                  <Code2 className="h-3.5 w-3.5" /> Languages
                </TabsTrigger>
                <TabsTrigger value="stats" className="whitespace-nowrap text-xs sm:text-sm">
                  <BarChart3 className="h-3.5 w-3.5" /> Stats
                </TabsTrigger>
                <TabsTrigger value="ai-tools" className="whitespace-nowrap text-xs sm:text-sm">
                  <Sparkles className="h-3.5 w-3.5" /> AI Tools
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="repositories">
              <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-6 w-full">
                <PanelHeading icon={FolderGit2} title="Repositories" description="Public projects, ranked by recent activity" />
                <RepositoriesTabWrapper username={username} />
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-6 w-full">
                <div className="flex items-center justify-between mb-4">
                  <PanelHeading icon={ActivityIcon} title="Activity" description="Commits, issues and PRs opened over recent months" />
                  {activityData.length > 0 && isMockData && (
                    <span className="text-xs bg-ember/15 text-ember px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                      </svg>
                      Sample Data
                    </span>
                  )}
                </div>

                {activityLoading ? (
                  <div className="flex items-center justify-center h-[250px]">
                    <SimpleLoadingSpinner size="md" text="Loading activity data" />
                  </div>
                ) : activityError ? (
                  <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/10 text-destructive">
                    <p className="mb-2 font-semibold">Error loading activity</p>
                    <p className="text-sm">{activityError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => { /* Implement refetch logic here if desired */ }}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : activityData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-muted rounded-full p-3 mb-4">
                      <CalendarDays className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium mb-2">No recent activity found</p>
                    <p className="text-xs sm:text-base text-muted-foreground max-w-md">
                      This could be because the user hasn't been active recently, their activity is private, or GitHub API rate limits have been reached.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => {
                        setActivityLoading(true);
                        setTimeout(() => {
                          const mockData = generateMockActivityData(username);
                          const formattedData: MonthlyActivityData[] = mockData.map((item: any) => ({
                            month: item.created_at.split('T')[0],
                            commits: item.payload?.commits?.length || 0,
                            issues: item.type === 'IssuesEvent' ? 1 : 0,
                            prs: item.type === 'PullRequestEvent' ? 1 : 0,
                            total: 1
                          }));
                          setActivityData(formattedData);
                          setIsMockData(true);
                          setActivityLoading(false);
                        }, 1000);
                      }}
                    >
                      Show Sample Data
                    </Button>
                  </div>
                ) : (
                  <div>
                    {isMockData && (
                      <div className="mb-4 p-3 border border-ember/30 bg-ember/10 rounded-lg text-xs text-ember">
                        <p className="font-medium">Sample data</p>
                        <p className="text-ember/90">This is generated sample data and does not represent actual GitHub activity.</p>
                        <p className="mt-1 text-ember/90">To see real data, check that your GitHub token is valid in your environment variables.</p>
                      </div>
                    )}
                    <div className="p-1 sm:p-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={activityData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="month" className="text-xs sm:text-sm" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} className="text-xs sm:text-sm" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={28} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }}/>
                          <Bar
                            dataKey="total"
                            fill={isMockData ? "hsl(var(--muted-foreground))" : "hsl(var(--signal))"}
                            name="Total events"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={40}
                            animationDuration={1000}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="languages">
              <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-6 w-full">
                <PanelHeading icon={Code2} title="Languages" description="Share of each language across public repositories" />
                {languageLoading ? (
                  <div className="flex items-center justify-center h-[250px]">
                    <SimpleLoadingSpinner size="md" text="Loading language data" />
                  </div>
                ) : languageError ? (
                  <p className="text-destructive">{languageError}</p>
                ) : languageData.length === 0 ? (
                  <p className="text-muted-foreground">No language data available.</p>
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={languageData}
                          cx="50%"
                          cy="50%"
                          innerRadius={54}
                          outerRadius={92}
                          paddingAngle={2}
                          cornerRadius={4}
                          dataKey="value"
                          nameKey="name"
                          labelLine={false}
                          label={false}
                          isAnimationActive={true}
                          animationDuration={800}
                        >
                          {languageData.map((entry: LanguageData, index: number) => (
                            <Cell key={`cell-${index}`} fill={getLanguageColor(entry.name)} stroke="hsl(var(--card))" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                          wrapperStyle={{ paddingTop: '20px', textAlign: 'center', fontSize: '0.85rem' }}
                        />
                        <RechartsTooltip
                          content={({ active, payload }: any) =>
                            active && payload?.length ? (
                              <div className="glass-panel rounded-lg px-3 py-2 text-sm shadow-lg shadow-black/20">
                                <span className="font-medium">{payload[0].name}</span>{" "}
                                <span className="font-mono text-muted-foreground">
                                  {payload[0].payload?.percent ? (payload[0].payload.percent * 100).toFixed(1) : "?"}%
                                </span>
                              </div>
                            ) : null
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats">
              <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-6 w-full text-sm sm:text-base">
                <StatsDashboard username={username} />
              </div>
            </TabsContent>

            <TabsContent value="ai-tools">
              <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-6 w-full text-sm sm:text-base">
                <PanelHeading icon={Sparkles} title="AI Tools" description="Generate a summary, resume bullets, and profile tips" />
                {userData ? (
                  <ProfileAITools 
                    user={userData} 
                    onLoginClick={login} 
                  />
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-muted-foreground">User data not available. Please try again later.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
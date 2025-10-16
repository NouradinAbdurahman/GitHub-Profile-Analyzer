"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

// Color mapping for common languages
const languageColors: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#2b7489",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  Go: "#00ADD8",
  PHP: "#4F5D95",
  Swift: "#ffac45",
  Kotlin: "#A97BFF",
  Rust: "#dea584",
  Dart: "#00B4AB",
  Scala: "#c22d40",
  Objective_C: "#438eff",
  Shell: "#89e051",
  Vue: "#41b883",
  // Add more languages as needed
}

// Get a color for any language, with fallbacks for unknown languages
function getLanguageColor(language: string): string {
  return languageColors[language] || 
    // Use hash of language name to generate a consistent color for unknown languages
    `hsl(${Math.abs(language.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360}, 65%, 50%)`
}

export function LanguageChart() {
  const { user } = useAuth()
  const [languageData, setLanguageData] = useState<{ name: string; value: number; color: string }[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLanguageData() {
      if (!user?.login) return

      setIsLoading(true)
      setError(null)

      try {
        // First try to get user data with languages from the main endpoint
        const userResponse = await fetch(`/api/github/user/${user.login}`, {
          headers: {
            'Authorization': `token ${user.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache'
          }
        }).catch(error => {
          console.error('Network error fetching user data:', error);
          return null;
        });
        
        if (userResponse && userResponse.ok) {
          try {
            const userData = await userResponse.json();
            
            // If we have languages cached in the user data, use them
            if (userData.languages && userData.languages.length > 0) {
              const chartData = userData.languages
                .map((lang: any) => {
                  // Handle both array of strings and array of objects with name/value
                  const name = typeof lang === 'string' ? lang : lang.name;
                  const value = typeof lang === 'string' ? 1 : (lang.value || 1);
                  
                  return {
                    name,
                    value,
                    color: getLanguageColor(name)
                  };
                });
                
              setLanguageData(chartData);
              setIsLoading(false);
              
              // Still fetch repos in the background for more data
              fetchRepoLanguages(false);
              return;
            }
          } catch (jsonError) {
            console.error('Error parsing user data:', jsonError);
            // Continue to fetch language data from repos
          }
        }
        
        // If we don't have languages in user data, fetch from repos
        await fetchRepoLanguages(true);
      } catch (error) {
        console.error('Error fetching language data:', error);
        setError('Failed to load language data');
        setIsLoading(false);
      }
    }
    
    async function fetchRepoLanguages(updateLoadingState: boolean) {
      try {
        // Fetch user repositories
        const reposResponse = await fetch(`/api/github/user/${user!.login}/repos?per_page=100`, {
          headers: {
            'Authorization': `token ${user!.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache'
          }
        }).catch(error => {
          console.error('Network error fetching repositories:', error);
          return null;
        });

        if (!reposResponse || !reposResponse.ok) {
          throw new Error(`Failed to fetch repositories: ${reposResponse?.status || 'Network Error'}`);
        }

        let repos;
        try {
          repos = await reposResponse.json();
        } catch (jsonError) {
          console.error('Error parsing repositories JSON:', jsonError);
          throw new Error('Failed to parse repositories response');
        }
        
        if (!Array.isArray(repos)) {
          console.error('Invalid repository data format:', repos);
          throw new Error('Invalid repository data format');
        }
        
        // Count bytes of each language across all repos
        const languagesMap: Record<string, number> = {};
        
        // First gather all language data from repo.language property
        for (const repo of repos) {
          if (repo.language) {
            languagesMap[repo.language] = (languagesMap[repo.language] || 0) + (repo.size || 1);
          }
        }
        
        // Then try to get detailed language breakdown for each repo
        // Use a limit to avoid too many API calls
        const topRepos = repos
          .filter(repo => repo.size > 0)
          .sort((a, b) => b.size - a.size)
          .slice(0, 20); // Limit to top 20 repos by size
        
        for (const repo of topRepos) {
          try {
            const languageResponse = await fetch(`/api/github/user/${user!.login}/repos/${repo.name}/languages`, {
              headers: {
                'Authorization': `token ${user!.access_token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }).catch(error => {
              console.error(`Network error fetching languages for ${repo.name}:`, error);
              return null;
            });
            
            if (languageResponse && languageResponse.ok) {
              try {
                const languageBreakdown = await languageResponse.json();
                
                // Add detailed language bytes
                Object.entries(languageBreakdown).forEach(([lang, bytes]: [string, any]) => {
                  languagesMap[lang] = (languagesMap[lang] || 0) + (Number(bytes) || 0);
                });
              } catch (jsonError) {
                console.error(`Error parsing language data for ${repo.name}:`, jsonError);
                // Continue with the next repository
              }
            } else {
              console.warn(`Could not fetch language data for ${repo.name}: ${languageResponse?.status || 'Network Error'}`);
            }
          } catch (error) {
            console.error(`Error processing languages for ${repo.name}:`, error);
            // Continue with the next repository
          }
        }
        
        // Convert to chart data format
        let chartData = Object.entries(languagesMap)
          .map(([name, value]) => ({
            name,
            value,
            color: getLanguageColor(name)
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10); // Limit to top 10 languages
        
        // Fallback data if no languages found
        if (chartData.length === 0 && repos.length > 0) {
          // Generate fallback language data based on repos 
          chartData = Array.from(new Set(
            repos
              .filter(repo => repo.language)
              .map(repo => repo.language)
          ))
          .slice(0, 10)
          .map(name => ({
            name,
            value: 1,
            color: getLanguageColor(name)
          }));
        }

        setLanguageData(chartData);
      } catch (error) {
        console.error('Error fetching repo language data:', error);
        if (updateLoadingState) {
          setError('Failed to load language data');
        }
      } finally {
        if (updateLoadingState) {
          setIsLoading(false);
        }
      }
    }

    if (user?.login) {
      fetchLanguageData();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <p>{error}</p>
      </div>
    )
  }

  if (languageData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <p>No language data available</p>
      </div>
    )
  }

  return (
    <ChartContainer
      config={{
        ...Object.fromEntries(
          languageData.map((item) => [
            item.name,
            {
              label: item.name,
              color: item.color,
            },
          ]),
        ),
      }}
    >
      <div className="w-full h-full max-[530px]:h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={languageData} 
              cx="50%" 
              cy="50%" 
              labelLine={false} 
              outerRadius={window.innerWidth < 530 ? 50 : 80}
              fill="#8884d8" 
              dataKey="value"
            >
              {languageData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: window.innerWidth < 530 ? '10px' : '14px', paddingTop: window.innerWidth < 530 ? 4 : 20, textAlign: 'center' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  )
}

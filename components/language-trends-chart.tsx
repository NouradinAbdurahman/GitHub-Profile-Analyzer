"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

// Common language colors
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
  // Add more as needed
}

// Generate a vibrant color based on the language name
function getLanguageColor(language: string): string {
  // Use fixed colors for common languages if available
  if (languageColors[language]) {
    return languageColors[language];
  }
  
  // Generate a hash from the language name for consistent but random-seeming colors
  const hash = language
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Use golden ratio to help distribute colors evenly
  const hue = (hash * 0.618033988749895) % 1;
  
  // Create vibrant HSL colors with good distribution
  return `hsl(${Math.floor(hue * 360)}, 80%, 65%)`; 
}

type LanguageTrendsDataPoint = {
  year: number | string;
  [language: string]: number | string;
}

type RepoWithLanguages = {
  name: string;
  createdAt: string;
  languages: Record<string, number>;
  primaryLanguage?: string | null;
}

export function LanguageTrendsChart() {
  const { user } = useAuth()
  const [trendsData, setTrendsData] = useState<LanguageTrendsDataPoint[]>([])
  const [topLanguages, setTopLanguages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLanguageTrends() {
      if (!user?.login) return

      setIsLoading(true)
      setError(null)
      setDebugInfo(null)

      try {
        console.log("Fetching repositories for language trends...")
        
        // Fetch repositories with increased page size
        const reposResponse = await fetch(`/api/github/user/${user.login}/repos?per_page=100`, {
          headers: {
            // Only include Authorization header if access_token exists
            ...(user.access_token && {
              'Authorization': `token ${user.access_token}`
            }),
            'Accept': 'application/vnd.github.v3+json'
          }
        }).catch(error => {
          console.error('Network error fetching repositories:', error);
          throw new Error('Network error: Failed to fetch repositories');
        });

        if (!reposResponse.ok) {
          throw new Error(`Failed to fetch repositories: ${reposResponse.status}`);
        }

        let repos;
        try {
          repos = await reposResponse.json();
        } catch (jsonError) {
          console.error('Error parsing repositories data:', jsonError);
          throw new Error('Failed to parse repositories data');
        }
        
        console.log(`Fetched ${repos.length} repositories`);
        
        if (!Array.isArray(repos) || repos.length === 0) {
          setDebugInfo("No repositories found or invalid data format. Check GitHub account.");
          setIsLoading(false);
          return;
        }
        
        const reposWithLanguages: RepoWithLanguages[] = [];
        let fetchCount = 0;
        let successCount = 0;

        // Process the most recent 30 repos for more relevant trends
        const recentRepos = [...repos]
          .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
          .slice(0, 30);
        
        // Use primary language from repo object as fallback
        for (const repo of recentRepos) {
          if (!repo.name || !repo.created_at) continue;
          
          const repoWithLang: RepoWithLanguages = {
            name: repo.name,
            createdAt: repo.created_at,
            languages: {},
            primaryLanguage: repo.language
          };
          
          // If repo already has a primary language, add it to our data
          if (repo.language) {
            repoWithLang.languages[repo.language] = 1;
          }
          
          // Get detailed language breakdown if possible
          try {
            fetchCount++;
            const languagesResponse = await fetch(
              `/api/github/user/${user.login}/repos/${repo.name}/languages`,
              {
                headers: {
                  ...(user.access_token && {
                    'Authorization': `token ${user.access_token}`
                  }),
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            ).catch(error => {
              console.error(`Network error fetching languages for ${repo.name}:`, error);
              return null;
            });

            if (languagesResponse && languagesResponse.ok) {
              try {
                const languagesData = await languagesResponse.json();
                successCount++;
                
                // If we got language data, use it
                if (Object.keys(languagesData).length > 0) {
                  repoWithLang.languages = languagesData;
                }
              } catch (jsonError) {
                console.error(`Error parsing language data for ${repo.name}:`, jsonError);
                // Continue with next repo, using primary language as fallback
              }
            }
          } catch (error) {
            console.error(`Error fetching languages for ${repo.name}:`, error);
            // Continue with next repo, using primary language as fallback
          }
          
          reposWithLanguages.push(repoWithLang);
        }

        console.log(`Successfully processed ${successCount}/${fetchCount} language requests`);
        
        // If we didn't get any language data at all, use primary language as fallback for all repos
        if (reposWithLanguages.every(repo => Object.keys(repo.languages).length === 0)) {
          reposWithLanguages.forEach(repo => {
            if (repo.primaryLanguage) {
              repo.languages[repo.primaryLanguage] = 1;
            }
          });
        }
        
        // If we still don't have any language data, show debug message
        if (reposWithLanguages.length === 0 || 
            reposWithLanguages.every(repo => Object.keys(repo.languages).length === 0)) {
          setDebugInfo(`No language data found in any repositories. API success rate: ${successCount}/${fetchCount}`);
          setIsLoading(false);
          return;
        }

        // Process repo data to generate yearly language trends
        const yearlyData: Record<number, Record<string, number>> = {};
        const allLanguages = new Set<string>();

        reposWithLanguages.forEach(repo => {
          const year = new Date(repo.createdAt).getFullYear();
          
          // Initialize year data if not exists
          if (!yearlyData[year]) {
            yearlyData[year] = {};
          }

          // If no detailed language data but we have primary language
          if (Object.keys(repo.languages).length === 0 && repo.primaryLanguage) {
            allLanguages.add(repo.primaryLanguage);
            yearlyData[year][repo.primaryLanguage] = 
              (yearlyData[year][repo.primaryLanguage] || 0) + 1;
          }
          else {
            // Add language bytes to yearly total
            Object.entries(repo.languages).forEach(([lang, bytes]) => {
              allLanguages.add(lang);
              yearlyData[year][lang] = (yearlyData[year][lang] || 0) + Number(bytes);
            });
          }
        });

        // Add current year if missing
        const currentYear = new Date().getFullYear();
        if (!yearlyData[currentYear] && Object.keys(yearlyData).length > 0) {
          // Use the most recent year's data as estimate
          const mostRecentYear = Math.max(...Object.keys(yearlyData).map(Number));
          if (yearlyData[mostRecentYear]) {
            yearlyData[currentYear] = {...yearlyData[mostRecentYear]};
          }
        }

        // If we don't have any yearly data, show debug message
        if (Object.keys(yearlyData).length === 0) {
          setDebugInfo("Could not generate yearly language trends. Check repository creation dates.");
          setIsLoading(false);
          return;
        }

        // Convert language bytes to percentages for each year
        const trendsDataPoints: LanguageTrendsDataPoint[] = [];

        Object.entries(yearlyData)
          .sort(([yearA], [yearB]) => Number(yearA) - Number(yearB))
          .forEach(([year, languages]) => {
            const total = Object.values(languages).reduce((sum, bytes) => sum + Number(bytes), 0);
            
            const dataPoint: LanguageTrendsDataPoint = { year: Number(year) };
            
            Object.entries(languages).forEach(([lang, bytes]) => {
              const percentage = total > 0 ? Math.round((Number(bytes) / total) * 100) : 0;
              dataPoint[lang] = percentage;
            });
            
            trendsDataPoints.push(dataPoint);
          });

        // Get top 5 languages
        const languageTotals: Record<string, number> = {};
        
        reposWithLanguages.forEach(repo => {
          if (Object.keys(repo.languages).length === 0 && repo.primaryLanguage) {
            languageTotals[repo.primaryLanguage] = 
              (languageTotals[repo.primaryLanguage] || 0) + 1;
          } else {
            Object.entries(repo.languages).forEach(([lang, bytes]) => {
              languageTotals[lang] = (languageTotals[lang] || 0) + Number(bytes);
            });
          }
        });
        
        const topLangs = Object.entries(languageTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([lang]) => lang);

        // If we don't have any top languages, use all available languages
        if (topLangs.length === 0 && allLanguages.size > 0) {
          Array.from(allLanguages).slice(0, 5).forEach(lang => {
            topLangs.push(lang);
          });
        }

        // If we still don't have any languages, show debug message
        if (topLangs.length === 0) {
          setDebugInfo("No languages detected in repositories.");
          setIsLoading(false);
          return;
        }

        // Fill in missing languages with 0 for each year
        trendsDataPoints.forEach(dataPoint => {
          topLangs.forEach(lang => {
            if (dataPoint[lang] === undefined) {
              dataPoint[lang] = 0;
            }
          });
        });

        console.log(`Generated trend data for ${trendsDataPoints.length} years and ${topLangs.length} languages`);
        setTopLanguages(topLangs);
        setTrendsData(trendsDataPoints);
      } catch (error) {
        console.error("Error fetching language trends:", error);
        setError("Failed to load language trends data");
        setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    }

    if (user?.login) {
      fetchLanguageTrends();
    }
  }, [user]);
  
  // Generate random vibrant colors for each language - moved outside of conditional rendering
  const languageColorMap = useMemo(() => {
    // Create a map of languages to colors
    return Object.fromEntries(
      topLanguages.map((lang, index) => {
        // Use different generation methods to ensure variety
        let color;
        
        if (languageColors[lang]) {
          // Use predefined color if available
          color = languageColors[lang];
        } else if (index < 10) {
          // For first 10 languages, use evenly spaced hues for maximum distinction
          color = `hsl(${index * 36}, 85%, 65%)`;
        } else {
          // For additional languages, use the hash function
          color = getLanguageColor(lang);
        }
        
        return [lang, color];
      })
    );
  }, [topLanguages]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p>{error}</p>
        {debugInfo && <p className="text-xs">{debugInfo}</p>}
      </div>
    );
  }

  if (trendsData.length === 0 || topLanguages.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p>No language trend data available</p>
        {debugInfo && <p className="text-xs">{debugInfo}</p>}
      </div>
    );
  }

  const config = Object.fromEntries(
    topLanguages.map((lang) => [
      lang,
      {
        label: lang,
        color: languageColorMap[lang],
      },
    ])
  );

  return (
    <ChartContainer config={config}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={trendsData}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: window.innerWidth < 530 ? 30 : 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="year" />
          <YAxis unit="%" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          {topLanguages.map((language) => (
            <Line
              key={language}
              type="monotone"
              dataKey={language}
              strokeWidth={2}
              stroke={languageColorMap[language]}
              dot={{ r: 3, fill: languageColorMap[language] }}
              activeDot={{ r: 5, fill: languageColorMap[language] }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

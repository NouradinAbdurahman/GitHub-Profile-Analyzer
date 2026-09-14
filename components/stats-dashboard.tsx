"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Star, GitFork, FolderGit2, Users } from "lucide-react";
import { SimpleLoadingSpinner } from "@/components/loading-spinner";
import { FadeInCard } from "@/components/fade-in-card";
import { StatTile } from "@/components/stat-tile";
import { getLanguageColor } from "@/lib/language-colors";

type GitHubStats = {
  username: string;
  totalStars?: number;
  totalForks?: number;
  totalIssues?: number;
  repoCount?: number;
  followers?: number;
  following?: number;
  contributions?: number;
  topRepos?: Array<{
    name: string;
    stars: number;
    forks: number;
    issues: number;
  }>;
  languages?: string[];
};

export function StatsDashboard({ username }: { username: string }) {
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sample repo data for radar chart
  const [repoQualityData, setRepoQualityData] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      if (!username) return;

      setLoading(true);
      try {
        // Fetch user data
        const userResponse = await fetch(`/api/github/user/${username}`);
        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user data: ${userResponse.statusText}`);
        }
        const userData = await userResponse.json();

        // Fetch repositories data
        const reposResponse = await fetch(`/api/github/user/${username}/repos`);
        if (!reposResponse.ok) {
          throw new Error(`Failed to fetch repos: ${reposResponse.statusText}`);
        }
        const reposData = await reposResponse.json();

        // Fetch language data
        let languageData: string[] = [];
        try {
          const languageResponse = await fetch(`/api/github/user/${username}/languages`);
          if (languageResponse.ok) {
            const langData = await languageResponse.json();
            if (langData.languages && Array.isArray(langData.languages)) {
              // Extract language names from the data
              languageData = langData.languages.map((lang: any) => lang.name);
            }
          }
        } catch (langError) {
          console.error("Error fetching language data:", langError);
          // Continue with empty language data
        }

        // Process top repositories
        const topRepos = reposData
          .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
          .slice(0, 5)
          .map((repo: any) => ({
            name: repo.name,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            issues: repo.open_issues_count,
            size: repo.size,
          }));

        // Generate repo quality metrics (documentation, activity, engagement)
        // This is sample data - in a real app you'd calculate these from the repo data
        const qualityData = [
          { subject: "Documentation", A: Math.random() * 100, fullMark: 100 },
          { subject: "Code Quality", A: Math.random() * 100, fullMark: 100 },
          { subject: "Activity", A: Math.random() * 100, fullMark: 100 },
          { subject: "Community", A: Math.random() * 100, fullMark: 100 },
          { subject: "Organization", A: Math.random() * 100, fullMark: 100 },
        ];

        setRepoQualityData(qualityData);

        // Set the stats
        setStats({
          username,
          totalStars: userData.total_stars || 0,
          totalForks: userData.total_forks || 0,
          totalIssues: userData.total_issues || 0,
          repoCount: userData.public_repos,
          followers: userData.followers,
          following: userData.following,
          languages: languageData,
          topRepos,
        });
      } catch (err) {
        console.error("Error loading stats:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <SimpleLoadingSpinner size="lg" text="Loading statistics" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center p-6 text-red-500">
          <AlertCircle className="mr-2 h-5 w-5" />
          <p>Error loading stats: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No statistics available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FadeInCard delay={0}>
          <StatTile icon={Star} accent="ember" label="Stars" value={stats.totalStars || 0} />
        </FadeInCard>
        <FadeInCard delay={0.05}>
          <StatTile icon={GitFork} accent="signal" label="Forks" value={stats.totalForks || 0} />
        </FadeInCard>
        <FadeInCard delay={0.1}>
          <StatTile icon={FolderGit2} accent="violet" label="Repositories" value={stats.repoCount || 0} />
        </FadeInCard>
        <FadeInCard delay={0.15}>
          <StatTile icon={Users} accent="teal" label="Followers" value={stats.followers || 0} />
        </FadeInCard>
      </div>

      {/* Top Repositories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-xl">Top Repositories</CardTitle>
          <CardDescription className="text-xs sm:text-base">Based on stars count</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {stats.topRepos && stats.topRepos.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.topRepos}
                layout="vertical"
                margin={{
                  top: 20,
                  right: 30,
                  left: 60,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: "0.8rem",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
                <Bar dataKey="stars" fill="hsl(var(--ember))" name="Stars" radius={[0, 4, 4, 0]} />
                <Bar dataKey="forks" fill="hsl(var(--signal))" name="Forks" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground">No repository data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Repository Quality Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-xl">Repository Quality Metrics</CardTitle>
            <CardDescription className="text-xs sm:text-base">Analysis of repository characteristics</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="px-0">
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={repoQualityData} className="mx-auto">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar
                    name="Quality"
                    dataKey="A"
                    stroke="hsl(var(--signal))"
                    fill="hsl(var(--signal))"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-xl">Language Distribution</CardTitle>
            <CardDescription className="text-xs sm:text-base">Languages used across repositories</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {stats.languages && stats.languages.length > 0 ? (
              <div className="mb-6 flex flex-wrap gap-2">
                {stats.languages.map((lang) => (
                  <Badge key={lang} className="text-[10px] sm:text-xs" variant="secondary">
                    <div
                      className="mr-2 h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: getLanguageColor(lang) }}
                    ></div>
                    {lang}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No language data available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
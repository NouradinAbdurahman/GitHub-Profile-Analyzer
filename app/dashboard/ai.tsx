"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api-client";

const AISummary = dynamic(() => import("@/components/ai/AISummary"), { ssr: false });
const ProfileOptimizer = dynamic(() => import("@/components/ai/ProfileOptimizer"), { ssr: false });
const Recommendations = dynamic(() => import("@/components/ai/Recommendations"), { ssr: false });

interface UserStats {
  stars: number;
  forks: number;
  issues: number;
  languages: string[];
  contributions: number;
}

export default function AIDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push("/");
    }
  }, [mounted, isLoading, user, router]);

  // Fetch user stats when the component mounts
  useEffect(() => {
    async function fetchUserStats() {
      if (!user || !user.login) return;

      setStatsLoading(true);
      
      try {
        // Get all repos data using the api-client
        const reposData = await get<any[]>(`/api/github/repos/${user.login}`);
        
        // Calculate stars and forks
        const stars = reposData.reduce((total: number, repo: any) => total + (repo.stargazers_count || 0), 0);
        const forks = reposData.reduce((total: number, repo: any) => total + (repo.forks_count || 0), 0);
        const issues = reposData.reduce((total: number, repo: any) => total + (repo.open_issues_count || 0), 0);
        
        // Extract unique languages
        const languages = Array.from(new Set(
          reposData.map((repo: any) => repo.language).filter(Boolean)
        )) as string[];

        // Fetch user data
        const userData = await get<any>(`/api/github/user/${user.login}`);
        const contributions = userData.contributions || userData.public_repos || 0;
        
        setUserStats({
          stars,
          forks,
          issues,
          languages,
          contributions
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setStatsLoading(false);
      }
    }
    
    if (user?.login) {
      fetchUserStats();
    }
  }, [user]);

  // Show loading state or nothing while checking authentication
  if (!mounted || isLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-8 w-48 rounded bg-muted"></div>
          <div className="grid gap-6 md:grid-cols-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-64 rounded bg-muted"></div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">AI Tools</h1>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {statsLoading ? (
          Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex h-64 animate-pulse items-center justify-center rounded bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ))
        ) : (
          <>
            <AISummary stats={userStats || {
              stars: 0,
              forks: 0,
              issues: 0,
              languages: [],
              contributions: 0
            }} />
            
            <ProfileOptimizer
              followers={user.followers || 0}
              following={user.following || 0}
              publicRepos={user.public_repos || 0}
              stars={userStats?.stars || 0}
              bio={user.bio || ""}
            />
            
            <Recommendations 
              username={user.login} 
              languages={userStats?.languages || []} 
            />
          </>
        )}
      </div>
    </div>
  );
} 
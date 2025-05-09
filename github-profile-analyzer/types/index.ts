// filepath: /github-profile-analyzer/github-profile-analyzer/types/index.ts
export type User = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  total_stars?: number;
  total_forks?: number;
  total_issues?: number;
  languages?: string[];
};

export type UserStats = {
  stars: number;
  forks: number;
  issues: number;
  languages: string[];
  contributions: number;
  public_repos: number;
  followers: number;
  following: number;
  bio: string;
  username: string;
};
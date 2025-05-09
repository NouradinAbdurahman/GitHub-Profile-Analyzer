import React from 'react';

type AISummaryProps = {
  stats: {
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
};

const AISummary: React.FC<AISummaryProps> = ({ stats }) => {
  return (
    <div className="p-4 border rounded-lg shadow-md">
      <h4 className="text-xl font-semibold">Profile Summary for {stats.username}</h4>
      <p className="mt-2"><strong>Bio:</strong> {stats.bio || 'No bio available'}</p>
      <p><strong>Followers:</strong> {stats.followers}</p>
      <p><strong>Following:</strong> {stats.following}</p>
      <p><strong>Public Repositories:</strong> {stats.public_repos}</p>
      <p><strong>Contributions:</strong> {stats.contributions}</p>
      <p><strong>Total Stars:</strong> {stats.stars}</p>
      <p><strong>Total Forks:</strong> {stats.forks}</p>
      <p><strong>Total Issues:</strong> {stats.issues}</p>
      <p><strong>Languages:</strong> {stats.languages.length > 0 ? stats.languages.join(', ') : 'No languages specified'}</p>
    </div>
  );
};

export default AISummary;
import React from 'react';

type RecommendationsProps = {
  username: string;
  languages: string[];
  isResponding?: boolean;
};

const Recommendations: React.FC<RecommendationsProps> = ({ username, languages, isResponding }) => {
  // Placeholder for recommendations logic
  const recommendedRepos = [
    // Example data structure for recommended repositories
    { name: 'Repo 1', url: 'https://github.com/example/repo1' },
    { name: 'Repo 2', url: 'https://github.com/example/repo2' },
    { name: 'Repo 3', url: 'https://github.com/example/repo3' },
  ];

  return (
    <div className={`transition-all duration-300 ${isResponding ? "w-[600px] h-[400px]" : "w-[400px] h-auto"}`}>
      <h4 className="text-xl font-semibold">Recommended Repositories for {username}</h4>
      <ul className="mt-4 space-y-2">
        {recommendedRepos.map((repo) => (
          <li key={repo.url}>
            <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {repo.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Recommendations;
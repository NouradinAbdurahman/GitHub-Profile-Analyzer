import React from 'react';

type ProfileOptimizerProps = {
  followers: number;
  following: number;
  publicRepos: number;
  stars: number;
  bio: string;
  isResponding?: boolean;
};

const ProfileOptimizer: React.FC<ProfileOptimizerProps> = ({ followers, following, publicRepos, stars, bio, isResponding }) => {
  return (
    <div className={`space-y-4 transition-all duration-300 ${isResponding ? "w-[600px] h-[400px]" : "w-[400px] h-auto"}`}>
      <h4 className="text-xl font-semibold">Profile Optimization Suggestions</h4>
      <ul className="list-disc pl-5">
        {followers < 100 && <li>Consider engaging more with the community to increase your followers.</li>}
        {following < 50 && <li>Follow more developers to expand your network.</li>}
        {publicRepos < 5 && <li>Try to create more public repositories to showcase your work.</li>}
        {stars < 10 && <li>Promote your repositories to gain more stars.</li>}
        {bio.length < 50 && <li>Enhance your bio to better reflect your skills and interests.</li>}
      </ul>
    </div>
  );
};

export default ProfileOptimizer;
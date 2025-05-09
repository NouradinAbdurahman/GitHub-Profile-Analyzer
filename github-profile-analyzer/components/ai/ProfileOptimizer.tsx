import React from 'react';

type ProfileOptimizerProps = {
  followers: number;
  following: number;
  publicRepos: number;
  stars: number;
  bio: string;
};

const ProfileOptimizer: React.FC<ProfileOptimizerProps> = ({ followers, following, publicRepos, stars, bio }) => {
  return (
    <div className="space-y-4">
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
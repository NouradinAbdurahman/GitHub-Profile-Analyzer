# GitHub Profile Analyzer

## Overview
The GitHub Profile Analyzer is a web application that provides AI-driven insights into GitHub user profiles. It fetches user data from the GitHub API and displays various analytics, including profile summaries, optimization suggestions, and repository recommendations.

## Features
- **AI Insights**: Leverages AI components to analyze and provide insights on GitHub profiles.
- **Dynamic Components**: Utilizes dynamic imports for efficient loading of components.
- **Tab Navigation**: Offers a user-friendly interface with tabbed navigation for different insights.
- **MongoDB Integration**: Stores fetched user data in a MongoDB database for persistence and further analysis.

## Project Structure
```
github-profile-analyzer
├── components
│   ├── profile-ai-tools.tsx       # Main component for displaying AI insights
│   ├── ui
│   │   └── tabs.tsx                # UI components for tab navigation
│   └── ai
│       ├── AISummary.tsx           # Component for displaying profile summary
│       ├── ProfileOptimizer.tsx     # Component for optimizing user profiles
│       └── Recommendations.tsx      # Component for suggesting repositories
├── lib
│   ├── db
│   │   ├── connect.ts               # Database connection logic
│   │   └── models
│   │       ├── User.ts              # User model for MongoDB
│   │       └── GithubProfile.ts     # GitHub profile model for MongoDB
│   └── github
│       └── api.ts                   # Functions for interacting with the GitHub API
├── app
│   ├── api
│   │   └── github
│   │       └── route.ts             # API route for GitHub data
│   ├── profile
│   │   └── [username]
│   │       └── page.tsx             # Profile page component
│   └── page.tsx                     # Main application page
├── types
│   └── index.ts                     # TypeScript types and interfaces
├── next.config.js                   # Next.js configuration
├── package.json                     # npm configuration
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # Project documentation
```

## Getting Started

### Prerequisites
- Node.js
- MongoDB Atlas account (for database)

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd github-profile-analyzer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your environment variables in `.env.local`:
   ```
   MONGODB_URI=<your_mongodb_connection_string>
   GITHUB_TOKEN=<your_github_access_token>
   ```

### Running the Application
To start the development server, run:
```
npm run dev
```
Visit `http://localhost:3000` in your browser to view the application.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
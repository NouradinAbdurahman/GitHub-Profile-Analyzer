# GitHub Profile Analyzer

A modern, AI-powered GitHub profile analytics platform that provides comprehensive insights, visualizations, and personalized recommendations to enhance your GitHub presence.

![GitHub Profile Analyzer](/public/placeholder-logo.png)

## 🌟 Features

- **Real-time Profile Analytics**: 
  - Detailed GitHub statistics with interactive visualizations
  - Repository metrics and language distribution analysis
  - Contribution patterns and activity trends
  - User engagement metrics (followers, stars, forks)

- **AI-Powered Insights**:
  - **Smart Profile Summary**: AI-generated analysis of your GitHub presence and activity patterns
  - **Profile Optimization Engine**: Actionable recommendations to improve profile visibility and impact
  - **Repository Recommendations**: Personalized project suggestions based on your skills and interests

- **Advanced Comparison Tools**:
  - Side-by-side profile comparison with visual metrics
  - Repository benchmarking against similar projects
  - Performance trends and growth analysis
  - Comparative strengths and improvement areas

- **Personalized Dashboard**:
  - Customizable metrics display
  - Language distribution visualization
  - Contribution calendar and activity heatmap
  - Repository quality assessment

- **Smart Tracking System**:
  - Profile watching with automated change detection
  - Notification system for profile updates
  - Track changes in repositories, followers, and activity

- **Analysis Management**:
  - Save, categorize and revisit AI analyses
  - Filter by analysis type and date
  - Full history of profile evaluations
  - One-click deletion of unwanted analyses

- **User Experience**:
  - Responsive, modern UI with smooth animations
  - Dark/light mode support
  - Accessibility-focused design
  - Real-time data updates

## 📊 Screenshots

*Coming soon*

## 🚀 Technologies

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Authentication**: GitHub OAuth
- **Database**: Firebase/Firestore
- **Visualization**: Recharts for data visualization
- **Animation**: Framer Motion for smooth UI transitions
- **APIs**:
  - **GitHub API**: For fetching profile and repository data
  - **DAKAEi API**: Powers AI features for analysis and recommendations
- **AI**: Custom AI integration for profile analysis

## 💻 Installation

### Prerequisites

- Node.js (v18+)
- npm or pnpm
- A GitHub account
- Firebase account (for database features)

### Setup Instructions

1. Clone this repository
```bash
git clone https://github.com/yourusername/github-profile-analyzer.git
cd github-profile-analyzer
```

2. Install dependencies
```bash
npm install
# or
pnpm install
```

3. Create a `.env.local` file based on `.env.example`
```bash
cp .env.example .env.local
```

4. Set up environment variables in `.env.local`:
   - GitHub OAuth credentials
   - Firebase configuration
   - API keys

5. Set up Firebase:
   - Create a Firebase project
   - Set up Firestore database
   - Generate a service account key
   - Save it as `/config/firebase-service-account.json`

6. Get your DAKAEi API Key:
   - Register at [DAKAEi API Console](https://console.dakaei.com/)
   - Add your API key to `.env.local`:
   ```
   DAKAEI_API_KEY=your_dakaei_api_key_here
   ```

7. Run the development server
```bash
npm run dev
# or
pnpm dev
```

8. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Usage

1. **Login**: Authenticate with your GitHub account
2. **Analyze**: Enter a GitHub username to analyze
3. **Dashboard**: View detailed stats and visualizations
4. **AI Tools**: Use AI-powered tools for insights and recommendations
5. **Compare**: Compare multiple profiles side by side
6. **Save Analyses**: Save important AI analyses for future reference
7. **Watch Profiles**: Monitor changes to profiles you're interested in

## 🔒 Security Notes

- This application uses OAuth for secure authentication
- No GitHub passwords are stored
- API keys and secrets are stored in environment variables only
- Firebase service account credentials are kept secure

## 📝 License

[MIT](LICENSE)

## 👥 Creator

**Nouraddin Abdurahman**

- [GitHub](https://github.com/NouradinAbdurahman)
- [LinkedIn](https://www.linkedin.com/in/nouraddin/)
- [Instagram](https://www.instagram.com/nouradiin_/)
- [Email](mailto:n.aden1208@gmil.com)

## 🙏 Acknowledgements

- [GitHub API](https://docs.github.com/en/rest)
- [DAKAEi API](https://console.dakaei.com/)
- [Next.js](https://nextjs.org/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/)
- [Framer Motion](https://www.framer.com/motion/)
# GitHub Profile Analyzer - Deployment Guide

This guide will walk you through deploying the GitHub Profile Analyzer application to Vercel.

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- A [GitHub account](https://github.com/signup)
- The GitHub Profile Analyzer project repository on GitHub

## Step 1: Environment Setup

All environment variables are prepared in the `scripts/vercel-env-vars.txt` file. 
You'll need to update the following variables with your actual values:

- `APP_URL`: Your deployed application URL (typically `https://your-project-name.vercel.app`)
- `NEXTAUTH_URL`: Same as APP_URL
- `GITHUB_REDIRECT_URI`: `https://your-project-name.vercel.app/api/auth/callback/github`
- `SESSION_SECRET`: Use the generated value from `scripts/generate-session-secret.js`

## Step 2: Deploying to Vercel

1. Log in to [Vercel](https://vercel.com) and click "New Project"
2. Import your GitHub repository
3. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: (leave as default)
   - Build Command: (leave as default)
   - Output Directory: (leave as default)
   - Install Command: `pnpm install`
4. Add Environment Variables:
   - Copy all variables from `scripts/vercel-env-vars.txt` to Vercel's Environment Variables section
   - Update placeholder values as needed
5. Click "Deploy"

## Step 3: Update GitHub OAuth Settings

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Select your OAuth App
3. Update the Authorization callback URL to:
   `https://your-project-name.vercel.app/api/auth/callback/github`
4. Click "Update application"

## Step 4: Verify Deployment

1. Once deployed, visit your Vercel URL
2. Try logging in with GitHub
3. Test the profile search and analysis features
4. Verify that favorites and other features work correctly

## Troubleshooting

If you encounter any issues:

1. Check Vercel logs for errors
2. Verify all environment variables are set correctly
3. Make sure Firebase configurations match
4. Confirm GitHub OAuth settings are updated

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)

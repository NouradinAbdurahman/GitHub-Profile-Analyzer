/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ["framer-motion", "firebase"],
  serverExternalPackages: ["firebase-admin"],
  // Fix caching issue in development
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    
    // Polyfill for 'net' module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false
    };
    
    return config;
  },
  env: {
    DAKAEI_API_KEY: process.env.DAKAEI_API_KEY,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  },
}

export default nextConfig

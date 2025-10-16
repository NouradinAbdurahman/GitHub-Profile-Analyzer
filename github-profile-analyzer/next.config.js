module.exports = {
  reactStrictMode: true,
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  },
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
};
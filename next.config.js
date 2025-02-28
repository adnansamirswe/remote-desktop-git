/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled for WebRTC connections
  images: {
    domains: [], // Add any external image domains if needed
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled for WebRTC connections
  images: {
    domains: [], // Add any external image domains if needed
  },
  // Add async rewrites to avoid CORS issues with the backend
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'https://remote-desktop-backend.onrender.com/socket.io/:path*',
      },
    ]
  },
};

module.exports = nextConfig;

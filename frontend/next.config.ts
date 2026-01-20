import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use static export for production builds
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,

  // Disable image optimization for static export
  images: {
    unoptimized: process.env.NODE_ENV === 'production' ? true : false,
  },

  // In development, proxy API requests to backend server
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3000/api/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use static export for Railway deployment
  output: process.env.RAILWAY_ENVIRONMENT ? 'export' : undefined,

  // Disable image optimization for static export
  images: {
    unoptimized: process.env.RAILWAY_ENVIRONMENT ? true : false,
  },
};

export default nextConfig;

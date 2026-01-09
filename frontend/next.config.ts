import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use static export for production builds
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,

  // Disable image optimization for static export
  images: {
    unoptimized: process.env.NODE_ENV === 'production' ? true : false,
  },
};

export default nextConfig;

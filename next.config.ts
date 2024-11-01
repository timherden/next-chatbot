import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // This helps with Amplify's build process
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
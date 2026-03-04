import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enable static HTML export for single-container deployment
  distDir: 'out', // Export to 'out' directory
  // Disable features not compatible with static export
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Xserver deployment (self-contained server.js)
  output: "standalone",

  // Image optimization
  images: {
    // Allow images served from the Xserver domain and localhost
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.xserver.jp",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
    // Sharp is installed as a dependency; use it for optimized image processing
    formats: ["image/avif", "image/webp"],
  },

  // Expose public runtime environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },

  // Silence TypeScript errors during production builds (tsc runs in CI separately)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

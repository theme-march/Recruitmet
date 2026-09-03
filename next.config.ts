import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  agentRules: false,
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react", "@tanstack/react-query"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;

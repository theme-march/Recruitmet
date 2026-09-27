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
  async redirects() {
    return [
      {
        source: "/super-admin/candidate-options",
        destination: "/candidate-options",
        permanent: false,
      },
      {
        source: "/super-admin/control",
        destination: "/permissions",
        permanent: false,
      },
      {
        source: "/super-admin/:path*",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/super-admin",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

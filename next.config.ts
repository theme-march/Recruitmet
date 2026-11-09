import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const lanHosts = Object.values(networkInterfaces())
  .flatMap((addresses) => addresses ?? [])
  .filter((address) => address.family === "IPv4" && !address.internal)
  .map((address) => address.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
  typedRoutes: false,
  agentRules: false,
  output: "standalone",
  serverExternalPackages: ["tesseract.js"],
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
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/candidate-options",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/super-admin/control",
        destination: "/permissions",
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

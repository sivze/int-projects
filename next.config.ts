import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rnqudbbewfkaojqpieze.supabase.co"
      }
    ]
  }
};

export default nextConfig;

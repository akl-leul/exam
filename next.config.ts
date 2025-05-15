import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   typescript: {
    // WARNING: This allows production builds with type errors - use with caution!
    ignoreBuildErrors: true,
  }  
};

export default nextConfig;

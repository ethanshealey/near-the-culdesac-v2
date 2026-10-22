import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Member photos are served from Firebase Storage.
    remotePatterns: [{ protocol: "https", hostname: "firebasestorage.googleapis.com" }],
  },
};

export default nextConfig;

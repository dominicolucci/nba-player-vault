import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Official NBA/WNBA headshot CDNs — used by player profiles and avatars.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.nba.com" },
      { protocol: "https", hostname: "cdn.wnba.com" },
    ],
  },
};

export default nextConfig;

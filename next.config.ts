import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker/Node runtime on Hetzner (was Lambda-via-OpenNext + CloudFront before).
  output: "standalone",
  experimental: {
    serverActions: {
      // Cloudflare tunnel forwards requests from paperloft.regiq.in — allow
      // Server Actions submitted from that origin. Add other domains here
      // if you front the app with additional hostnames.
      allowedOrigins: ["paperloft.regiq.in"],
    },
  },
};

export default nextConfig;
